"""Concurrency-safe durable storage for production profile and replay data."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Callable


SCHEMA_VERSION = 6

# Retention policy for analytics_events: rows older than this are pruned by
# prune_old_analytics_events(), called from web/app.py's existing periodic
# maintenance pass (prune_stale_runtime). Raw event rows aren't kept forever;
# aggregate counts are cheap to recompute from a bounded window, so this
# keeps analytics_summary()'s SQL scans cheap indefinitely instead of
# growing unboundedly for the life of the deployment. Override via
# JJK_ANALYTICS_RETENTION_DAYS for a different policy.
DEFAULT_ANALYTICS_RETENTION_DAYS = 90
DEFAULT_SETTLEMENT_RETENTION_DAYS = 30
SETTLEMENT_CLAIM_LEASE_SECONDS = 60.0
SETTLEMENT_MAX_RETRY_DELAY_SECONDS = 300.0
_fallback_lock = threading.Lock()


class MalformedMissionSettlementError(ValueError):
    """A durable snapshot is structurally invalid and requires operator repair."""


def _fsync_parent_directory(path: Path) -> None:
    """Persist a create/replace/unlink directory entry where the OS supports it."""

    if os.name == "nt":
        return
    try:
        descriptor = os.open(path.parent, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def runtime_database_path() -> Path:
    return Path(os.getenv("JJK_DATABASE_PATH", "data/jjk_arena.sqlite3"))


def analytics_retention_days() -> int:
    try:
        return max(1, int(os.getenv("JJK_ANALYTICS_RETENTION_DAYS", str(DEFAULT_ANALYTICS_RETENTION_DAYS))))
    except (TypeError, ValueError):
        return DEFAULT_ANALYTICS_RETENTION_DAYS


class SQLiteRuntimeStore:
    """Small SQLite boundary suitable for one or several web processes.

    Active Battle v2 rooms intentionally remain in one authoritative process;
    this store covers data that is safe to share durably across processes.
    """

    # Cap on the in-memory retry outbox so a sustained outage can't grow it
    # without bound; the oldest queued event is dropped (and counted) rather
    # than silently accepting unlimited memory growth.
    MAX_OUTBOX_SIZE = 500

    def __init__(self, path: str | Path | None = None, *, clock=time.time):
        self.path = Path(path) if path is not None else runtime_database_path()
        self.clock = clock
        self._outbox: list[dict[str, Any]] = []
        self.outbox_dropped_total = 0
        self.mission_settlement_dead_lettered_total = 0
        self.mission_settlement_claimed_total = 0
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=5.0)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout = 5000")
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS runtime_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS first_creation_profiles (
                    player_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    updated_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS battle_replays (
                    match_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    expires_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_battle_replays_expires_at
                    ON battle_replays(expires_at);
                CREATE TABLE IF NOT EXISTS analytics_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    match_id TEXT,
                    player_id TEXT,
                    payload_json TEXT NOT NULL,
                    created_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
                    ON analytics_events(event_type, created_at);
                CREATE TABLE IF NOT EXISTS mission_settlement_outbox (
                    match_id TEXT NOT NULL,
                    player_id TEXT NOT NULL,
                    progress_json TEXT NOT NULL,
                    finished_at REAL NOT NULL,
                    status TEXT NOT NULL,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    next_attempt_at REAL NOT NULL,
                    last_error TEXT,
                    claim_token TEXT,
                    claim_expires_at REAL,
                    updated_at REAL NOT NULL,
                    PRIMARY KEY(match_id, player_id)
                );
                CREATE INDEX IF NOT EXISTS idx_mission_settlement_due
                    ON mission_settlement_outbox(status, next_attempt_at);
                """
            )
            existing_columns = {
                row["name"] for row in connection.execute("PRAGMA table_info(analytics_events)")
            }
            if "event_key" not in existing_columns:
                connection.execute("ALTER TABLE analytics_events ADD COLUMN event_key TEXT")
            connection.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_event_key ON analytics_events(event_key)"
            )
            settlement_columns = {
                row["name"] for row in connection.execute("PRAGMA table_info(mission_settlement_outbox)")
            }
            if "claim_token" not in settlement_columns:
                connection.execute("ALTER TABLE mission_settlement_outbox ADD COLUMN claim_token TEXT")
            if "claim_expires_at" not in settlement_columns:
                connection.execute("ALTER TABLE mission_settlement_outbox ADD COLUMN claim_expires_at REAL")
            if "finished_at" not in settlement_columns:
                connection.execute("ALTER TABLE mission_settlement_outbox ADD COLUMN finished_at REAL")
                connection.execute(
                    "UPDATE mission_settlement_outbox SET finished_at = updated_at WHERE finished_at IS NULL"
                )
            # Typed dimension columns so /ops/runtime aggregates with SQL GROUP BY
            # instead of decoding every row's payload_json in Python. payload_json
            # stays as the full detail record; these columns are query-only mirrors
            # of a few fields already inside it.
            for column in ("result_type", "finish_reason", "cpu_difficulty", "outcome", "mission_id"):
                if column not in existing_columns:
                    connection.execute(f"ALTER TABLE analytics_events ADD COLUMN {column} TEXT")
            if "vs_cpu" not in existing_columns:
                connection.execute("ALTER TABLE analytics_events ADD COLUMN vs_cpu INTEGER")
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_analytics_events_type_result ON analytics_events(event_type, result_type)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_analytics_events_type_outcome ON analytics_events(event_type, outcome)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_analytics_events_type_mission ON analytics_events(event_type, mission_id)"
            )
            connection.execute(
                "INSERT OR REPLACE INTO runtime_meta(key, value) VALUES('schema_version', ?)",
                (str(SCHEMA_VERSION),),
            )

    def load_profile(self, player_id: str) -> dict[str, Any]:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM first_creation_profiles WHERE player_id = ?",
                (str(player_id),),
            ).fetchone()
        if row is None:
            return {}
        try:
            payload = json.loads(row["payload_json"])
        except (json.JSONDecodeError, TypeError):
            return {}
        return payload if isinstance(payload, dict) else {}

    def save_profile(self, player_id: str, profile: dict[str, Any]) -> None:
        payload = json.dumps(profile, sort_keys=True, separators=(",", ":"))
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO first_creation_profiles(player_id, payload_json, updated_at)
                VALUES(?, ?, ?)
                ON CONFLICT(player_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (str(player_id), payload, float(self.clock())),
            )

    def update_profile(
        self,
        player_id: str,
        updater: Callable[[dict[str, Any]], dict[str, Any]],
    ) -> dict[str, Any]:
        """Atomically read, update, and persist one profile."""

        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                "SELECT payload_json FROM first_creation_profiles WHERE player_id = ?",
                (str(player_id),),
            ).fetchone()
            current: dict[str, Any] = {}
            if row is not None:
                try:
                    decoded = json.loads(row["payload_json"])
                    if isinstance(decoded, dict):
                        current = decoded
                except (json.JSONDecodeError, TypeError):
                    current = {}
            updated = updater(current)
            payload = json.dumps(updated, sort_keys=True, separators=(",", ":"))
            connection.execute(
                """
                INSERT INTO first_creation_profiles(player_id, payload_json, updated_at)
                VALUES(?, ?, ?)
                ON CONFLICT(player_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (str(player_id), payload, float(self.clock())),
            )
        return updated

    def enqueue_mission_settlement(
        self,
        match_id: str,
        player_id: str,
        progress: dict[str, Any],
        *,
        finished_at: float | None = None,
    ) -> None:
        """Durably snapshot one player's terminal mission progress."""

        now = float(self.clock())
        terminal_at = now if finished_at is None else float(finished_at)
        payload = json.dumps(progress, sort_keys=True, separators=(",", ":"))
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO mission_settlement_outbox(
                    match_id, player_id, progress_json, finished_at, status,
                    retry_count, next_attempt_at, last_error, updated_at
                ) VALUES(?, ?, ?, ?, 'pending', 0, ?, NULL, ?)
                ON CONFLICT(match_id, player_id) DO UPDATE SET
                    progress_json = excluded.progress_json,
                    finished_at = COALESCE(mission_settlement_outbox.finished_at, excluded.finished_at),
                    status = CASE
                        WHEN mission_settlement_outbox.status IN ('settled', 'processing', 'dead_letter')
                        THEN mission_settlement_outbox.status
                        ELSE 'pending'
                    END,
                    next_attempt_at = CASE
                        WHEN mission_settlement_outbox.status IN ('settled', 'processing', 'dead_letter')
                        THEN mission_settlement_outbox.next_attempt_at
                        ELSE excluded.next_attempt_at
                    END,
                    last_error = CASE
                        WHEN mission_settlement_outbox.status IN ('settled', 'processing', 'dead_letter')
                        THEN mission_settlement_outbox.last_error
                        ELSE NULL
                    END,
                    updated_at = excluded.updated_at
                """,
                (str(match_id), str(player_id), payload, terminal_at, now, now),
            )

    @property
    def mission_settlement_fallback_path(self) -> Path:
        return self.path.with_name(f"{self.path.name}.mission-settlement-fallback.jsonl")

    def enqueue_mission_settlement_durable(
        self,
        match_id: str,
        player_id: str,
        progress: dict[str, Any],
        *,
        finished_at: float | None = None,
    ) -> str:
        """Persist a terminal snapshot in SQLite or a durable sidecar fallback."""

        terminal_at = float(self.clock()) if finished_at is None else float(finished_at)
        try:
            self.enqueue_mission_settlement(
                match_id,
                player_id,
                progress,
                finished_at=terminal_at,
            )
            return "database"
        except Exception:
            self._require_single_worker_sidecar()
            record = json.dumps(
                {
                    "match_id": str(match_id),
                    "player_id": str(player_id),
                    "progress": progress,
                    "finished_at": terminal_at,
                },
                sort_keys=True,
                separators=(",", ":"),
            )
            fallback = self.mission_settlement_fallback_path
            fallback.parent.mkdir(parents=True, exist_ok=True)
            with _fallback_lock:
                descriptor = os.open(
                    fallback,
                    os.O_WRONLY | os.O_CREAT | os.O_APPEND,
                    0o600,
                )
                with os.fdopen(descriptor, "a", encoding="utf-8") as handle:
                    handle.write(record + "\n")
                    handle.flush()
                    os.fsync(handle.fileno())
                _fsync_parent_directory(fallback)
            return "fallback"

    @staticmethod
    def _require_single_worker_sidecar() -> None:
        """The JSONL fallback uses an in-process lock and requires one web worker."""

        try:
            workers = int(os.getenv("JJK_WEB_WORKERS", "1"))
        except (TypeError, ValueError):
            workers = 1
        if workers != 1:
            raise RuntimeError("mission settlement sidecar requires JJK_WEB_WORKERS=1")

    def restore_mission_settlement_fallback(self) -> int:
        """Re-enqueue valid sidecar snapshots, retaining anything not restored."""

        fallback = self.mission_settlement_fallback_path
        if not fallback.exists():
            return 0
        self._require_single_worker_sidecar()
        restored = 0
        with _fallback_lock:
            lines = fallback.read_text(encoding="utf-8").splitlines()
            remaining: list[str] = []
            for line in lines:
                try:
                    record = json.loads(line)
                    self.enqueue_mission_settlement(
                        record["match_id"],
                        record["player_id"],
                        record["progress"],
                        finished_at=record.get("finished_at"),
                    )
                    restored += 1
                except Exception:
                    remaining.append(line)
            # A continuing database outage leaves every line untouched. Do not
            # replace the already-fsync'd source file with an equivalent but
            # less-durable copy on every retry pass.
            if restored == 0:
                return 0
            if remaining:
                temporary = fallback.with_name(f"{fallback.name}.tmp")
                descriptor = os.open(
                    temporary,
                    os.O_WRONLY | os.O_CREAT | os.O_TRUNC,
                    0o600,
                )
                with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                    handle.write("\n".join(remaining) + "\n")
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(temporary, fallback)
                _fsync_parent_directory(fallback)
            else:
                fallback.unlink(missing_ok=True)
                _fsync_parent_directory(fallback)
        return restored

    def process_mission_settlements(
        self,
        handler: Callable[[str, str, dict[str, Any]], None] | None = None,
        *,
        limit: int = 100,
        player_id: str | None = None,
        force_due: bool = False,
        profile_updater: Callable[
            [dict[str, Any], dict[str, Any], float],
            tuple[dict[str, Any], list[str]],
        ] | None = None,
    ) -> list[tuple[str, str]]:
        """Retry settlement rows and return only token-guarded commits.

        Claims provide bounded ownership, not exactly-once handler execution: a
        worker that exceeds its lease can overlap a replacement worker. Generic
        handlers must therefore be idempotent. The ``profile_updater`` path is
        stronger: it verifies the live claim and atomically commits the profile,
        mission analytics, and outbox status in one SQLite transaction.
        """

        if (handler is None) == (profile_updater is None):
            raise ValueError("provide exactly one mission settlement handler")

        settled: list[tuple[str, str]] = []
        for index in range(max(1, int(limit))):
            row = self._claim_next_mission_settlement(
                player_id=player_id,
                # A relevant profile read may bypass backoff once. Subsequent
                # rows in the same drain respect their schedules so one failing
                # record cannot spin through the entire batch immediately.
                force_due=force_due and index == 0,
            )
            if row is None:
                break
            match_id = row["match_id"]
            claimed_player_id = row["player_id"]
            claim_token = row["claim_token"]
            try:
                try:
                    progress = json.loads(row["progress_json"])
                except (json.JSONDecodeError, TypeError) as exc:
                    raise MalformedMissionSettlementError(
                        "mission settlement progress is not valid JSON"
                    ) from exc
                if not isinstance(progress, dict):
                    raise MalformedMissionSettlementError(
                        "mission settlement progress must be an object"
                    )
                if profile_updater is not None:
                    committed = self._commit_profile_mission_settlement(
                        match_id,
                        claimed_player_id,
                        claim_token,
                        progress,
                        float(row["finished_at"]),
                        profile_updater,
                    )
                else:
                    assert handler is not None
                    handler(match_id, claimed_player_id, progress)
                    committed = self._mark_mission_settlement_settled(
                        match_id,
                        claimed_player_id,
                        claim_token,
                    )
            except MalformedMissionSettlementError as exc:
                self._fail_mission_settlement_claim(row, exc, permanent=True)
                continue
            except Exception as exc:
                # Handler/storage failures remain retryable indefinitely. The
                # snapshot is internal authoritative data; only a malformed
                # durable payload is terminal without operator repair.
                self._fail_mission_settlement_claim(row, exc, permanent=False)
                continue
            if committed:
                settled.append((match_id, claimed_player_id))
        return settled

    def _claim_next_mission_settlement(
        self,
        *,
        player_id: str | None,
        force_due: bool,
    ) -> dict[str, Any] | None:
        """Claim one row immediately before handling so queued leases do not age."""

        now = float(self.clock())
        claim_token = uuid.uuid4().hex
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                """
                UPDATE mission_settlement_outbox
                SET status = 'failed_retryable', claim_token = NULL,
                    claim_expires_at = NULL, next_attempt_at = ?,
                    last_error = 'claim lease expired', updated_at = ?
                WHERE status = 'processing' AND claim_expires_at <= ?
                """,
                (now, now, now),
            )
            clauses = ["status IN ('pending', 'failed_retryable')"]
            parameters: list[Any] = []
            if player_id is not None:
                clauses.append("player_id = ?")
                parameters.append(str(player_id))
            if not force_due:
                clauses.append("next_attempt_at <= ?")
                parameters.append(now)
            row = connection.execute(
                f"""
                SELECT match_id, player_id, progress_json, finished_at, retry_count
                FROM mission_settlement_outbox
                WHERE {' AND '.join(clauses)}
                ORDER BY next_attempt_at, finished_at, match_id, player_id
                LIMIT 1
                """,
                parameters,
            ).fetchone()
            if row is None:
                return None
            cursor = connection.execute(
                """
                UPDATE mission_settlement_outbox
                SET status = 'processing', claim_token = ?,
                    claim_expires_at = ?, updated_at = ?
                WHERE match_id = ? AND player_id = ?
                  AND status IN ('pending', 'failed_retryable')
                """,
                (
                    claim_token,
                    now + SETTLEMENT_CLAIM_LEASE_SECONDS,
                    now,
                    row["match_id"],
                    row["player_id"],
                ),
            )
            if cursor.rowcount != 1:
                return None
        self.mission_settlement_claimed_total += 1
        claimed = dict(row)
        claimed["match_id"] = str(row["match_id"])
        claimed["player_id"] = str(row["player_id"])
        claimed["claim_token"] = claim_token
        return claimed

    def _mark_mission_settlement_settled(
        self,
        match_id: str,
        player_id: str,
        claim_token: str,
    ) -> bool:
        now = float(self.clock())
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE mission_settlement_outbox
                SET status = 'settled', next_attempt_at = ?, last_error = NULL,
                    updated_at = ?, claim_token = NULL, claim_expires_at = NULL
                WHERE match_id = ? AND player_id = ?
                  AND status = 'processing' AND claim_token = ?
                """,
                (now, now, match_id, player_id, claim_token),
            )
        return cursor.rowcount == 1

    def _fail_mission_settlement_claim(
        self,
        row: dict[str, Any],
        error: Exception,
        *,
        permanent: bool,
    ) -> bool:
        now = float(self.clock())
        retry_count = int(row["retry_count"]) + 1
        delay = min(
            SETTLEMENT_MAX_RETRY_DELAY_SECONDS,
            float(2 ** min(retry_count - 1, 8)),
        )
        status = "dead_letter" if permanent else "failed_retryable"
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE mission_settlement_outbox
                SET status = ?, retry_count = ?, next_attempt_at = ?,
                    last_error = ?, updated_at = ?, claim_token = NULL,
                    claim_expires_at = NULL
                WHERE match_id = ? AND player_id = ?
                  AND status = 'processing' AND claim_token = ?
                """,
                (
                    status,
                    retry_count,
                    now + delay,
                    str(error)[:500],
                    now,
                    row["match_id"],
                    row["player_id"],
                    row["claim_token"],
                ),
            )
        changed = cursor.rowcount == 1
        if permanent and changed:
            self.mission_settlement_dead_lettered_total += 1
        return changed

    def _commit_profile_mission_settlement(
        self,
        match_id: str,
        player_id: str,
        claim_token: str,
        progress: dict[str, Any],
        finished_at: float,
        profile_updater: Callable[
            [dict[str, Any], dict[str, Any], float],
            tuple[dict[str, Any], list[str]],
        ],
    ) -> bool:
        """Atomically merge profile, analytics intents, and settlement state."""

        now = float(self.clock())
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            claim = connection.execute(
                """
                SELECT 1 FROM mission_settlement_outbox
                WHERE match_id = ? AND player_id = ?
                  AND status = 'processing' AND claim_token = ?
                """,
                (match_id, player_id, claim_token),
            ).fetchone()
            if claim is None:
                return False
            profile_row = connection.execute(
                "SELECT payload_json FROM first_creation_profiles WHERE player_id = ?",
                (player_id,),
            ).fetchone()
            current: dict[str, Any] = {}
            if profile_row is not None:
                try:
                    decoded = json.loads(profile_row["payload_json"])
                    if isinstance(decoded, dict):
                        current = decoded
                except (json.JSONDecodeError, TypeError):
                    current = {}
            updated, newly_completed = profile_updater(current, progress, finished_at)
            if not isinstance(updated, dict) or not isinstance(newly_completed, list):
                raise MalformedMissionSettlementError(
                    "mission settlement profile updater returned an invalid result"
                )
            payload = json.dumps(updated, sort_keys=True, separators=(",", ":"))
            connection.execute(
                """
                INSERT INTO first_creation_profiles(player_id, payload_json, updated_at)
                VALUES(?, ?, ?)
                ON CONFLICT(player_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (player_id, payload, now),
            )
            for mission_id in sorted({str(item) for item in newly_completed if str(item)}):
                analytics_payload = json.dumps(
                    {"mission_id": mission_id},
                    sort_keys=True,
                    separators=(",", ":"),
                )
                connection.execute(
                    """
                    INSERT OR IGNORE INTO analytics_events(
                        event_type, match_id, player_id, payload_json, created_at,
                        event_key, result_type, finish_reason, cpu_difficulty,
                        vs_cpu, outcome, mission_id
                    ) VALUES(
                        'mission_completed', ?, ?, ?, ?, ?,
                        NULL, NULL, NULL, NULL, NULL, ?
                    )
                    """,
                    (
                        match_id,
                        player_id,
                        analytics_payload,
                        now,
                        f"mission_completed:{match_id}:{player_id}:{mission_id}",
                        mission_id,
                    ),
                )
            cursor = connection.execute(
                """
                UPDATE mission_settlement_outbox
                SET status = 'settled', next_attempt_at = ?, last_error = NULL,
                    updated_at = ?, claim_token = NULL, claim_expires_at = NULL
                WHERE match_id = ? AND player_id = ?
                  AND status = 'processing' AND claim_token = ?
                """,
                (now, now, match_id, player_id, claim_token),
            )
            if cursor.rowcount != 1:
                raise RuntimeError("mission settlement claim was lost before commit")
        return True

    def redrive_mission_settlement(self, match_id: str, player_id: str) -> bool:
        """Return a failed/dead-letter row to pending after operator repair."""

        now = float(self.clock())
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE mission_settlement_outbox
                SET status = 'pending', retry_count = 0, next_attempt_at = ?,
                    last_error = NULL, updated_at = ?, claim_token = NULL,
                    claim_expires_at = NULL
                WHERE match_id = ? AND player_id = ?
                  AND status IN ('failed_retryable', 'dead_letter')
                """,
                (now, now, str(match_id), str(player_id)),
            )
        return cursor.rowcount == 1

    def mission_settlement_rows(self) -> list[dict[str, Any]]:
        """Return settlement metadata for tests and operational diagnostics."""

        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT match_id, player_id, status, retry_count, finished_at,
                       next_attempt_at, last_error, claim_token,
                       claim_expires_at, updated_at
                FROM mission_settlement_outbox ORDER BY match_id, player_id
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def prune_settled_mission_settlements(self, *, retention_days: int = DEFAULT_SETTLEMENT_RETENTION_DAYS) -> int:
        cutoff = float(self.clock()) - max(1, int(retention_days)) * 86400
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM mission_settlement_outbox WHERE status = 'settled' AND updated_at < ?",
                (cutoff,),
            )
        return int(cursor.rowcount)

    def mission_settlement_counts(self) -> dict[str, int]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT status, COUNT(*) AS total FROM mission_settlement_outbox GROUP BY status"
            ).fetchall()
        return {str(row["status"]): int(row["total"]) for row in rows}

    def save_replay(self, replay: dict[str, Any], *, retention_days: int) -> None:
        match_id = str(replay.get("match_id") or "").strip()
        if not match_id:
            raise ValueError("replay match_id is required")
        now = float(self.clock())
        expires_at = now + max(1, int(retention_days)) * 86400
        payload = json.dumps(replay, sort_keys=True, separators=(",", ":"))
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO battle_replays(match_id, payload_json, created_at, expires_at)
                VALUES(?, ?, ?, ?)
                ON CONFLICT(match_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    expires_at = excluded.expires_at
                """,
                (match_id, payload, now, expires_at),
            )

    def load_replay(self, match_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM battle_replays WHERE match_id = ? AND expires_at > ?",
                (str(match_id), float(self.clock())),
            ).fetchone()
        if row is None:
            return None
        return json.loads(row["payload_json"])

    def prune_old_analytics_events(self, *, retention_days: int | None = None) -> int:
        """Delete analytics_events rows older than the retention window.

        Aggregate counters (`analytics_summary`) are computed by scanning
        the table, so an unbounded table would make every /ops/runtime call
        progressively more expensive over the life of a deployment. This
        is a hard retention window, not a rollup -- if per-day historical
        aggregates are ever needed beyond the window, roll them up into a
        separate daily-summary table before this prunes the source rows
        (no such table exists yet; this method only implements retention).
        """

        days = retention_days if retention_days is not None else analytics_retention_days()
        cutoff = float(self.clock()) - max(1, int(days)) * 86400
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM analytics_events WHERE created_at < ?",
                (cutoff,),
            )
        return int(cursor.rowcount)

    def prune_expired_replays(self) -> int:
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM battle_replays WHERE expires_at <= ?",
                (float(self.clock()),),
            )
        return int(cursor.rowcount)

    def _insert_analytics_row(
        self,
        event_type: str,
        payload: dict[str, Any],
        *,
        match_id: str | None,
        player_id: str | None,
        event_key: str | None,
    ) -> bool:
        """Perform the actual write. Raises on failure; callers handle retry."""

        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        vs_cpu = payload.get("vs_cpu")
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO analytics_events(
                    event_type, match_id, player_id, payload_json, created_at, event_key,
                    result_type, finish_reason, cpu_difficulty, vs_cpu, outcome, mission_id
                )
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(event_type),
                    match_id,
                    player_id,
                    encoded,
                    float(self.clock()),
                    event_key,
                    payload.get("result_type"),
                    payload.get("finish_reason"),
                    payload.get("cpu_difficulty"),
                    None if vs_cpu is None else int(bool(vs_cpu)),
                    payload.get("outcome"),
                    payload.get("mission_id"),
                ),
            )
        return cursor.rowcount > 0

    def record_analytics_event(
        self,
        event_type: str,
        payload: dict[str, Any],
        *,
        match_id: str | None = None,
        player_id: str | None = None,
        event_key: str | None = None,
    ) -> bool:
        """Append a durable analytics event row (match-finished / mission-completed).

        `event_key` must be stable and unique per logical business event
        (e.g. ``match_finished:{match_id}``); a UNIQUE index on the column
        guarantees at most one row per key even under concurrent emits,
        reconnect retries, or process restarts. Returns True if a new row
        was inserted, False if an existing row with the same key already
        won the race (or the write failed and was queued for retry --
        callers that only care about "was this written eventually" should
        use `flush_outbox()`'s return value or check `outbox_size()`).

        A handful of well-known payload keys (``result_type``,
        ``finish_reason``, ``cpu_difficulty``, ``vs_cpu``, ``outcome``,
        ``mission_id``) are additionally mirrored into typed columns, so
        `analytics_summary` can aggregate with SQL `GROUP BY` instead of
        decoding every row's JSON payload in Python. `payload_json` remains
        the full detail record.

        If the write itself fails (locked/corrupt database, disk full,
        transient I/O error -- not a duplicate, which INSERT OR IGNORE
        already handles), the event is queued in an in-memory outbox rather
        than silently dropped. `flush_outbox()` retries queued events; call
        it periodically (e.g. from existing periodic maintenance) so a
        transient outage self-heals instead of losing events forever.
        """

        try:
            return self._insert_analytics_row(
                event_type, payload, match_id=match_id, player_id=player_id, event_key=event_key
            )
        except Exception:
            self._enqueue_outbox(event_type, payload, match_id=match_id, player_id=player_id, event_key=event_key)
            return False

    def _enqueue_outbox(
        self,
        event_type: str,
        payload: dict[str, Any],
        *,
        match_id: str | None,
        player_id: str | None,
        event_key: str | None,
    ) -> None:
        if len(self._outbox) >= self.MAX_OUTBOX_SIZE:
            self._outbox.pop(0)
            self.outbox_dropped_total += 1
        self._outbox.append({
            "event_type": event_type,
            "payload": payload,
            "match_id": match_id,
            "player_id": player_id,
            "event_key": event_key,
        })

    def outbox_size(self) -> int:
        return len(self._outbox)

    def flush_outbox(self) -> int:
        """Retry every queued event once; return how many were written.

        Events that fail again stay queued (in original order) for the next
        flush. Safe to call frequently -- an empty outbox is a no-op.
        """

        if not self._outbox:
            return 0
        pending = self._outbox
        self._outbox = []
        flushed = 0
        for entry in pending:
            try:
                self._insert_analytics_row(
                    entry["event_type"], entry["payload"],
                    match_id=entry["match_id"], player_id=entry["player_id"], event_key=entry["event_key"],
                )
                flushed += 1
            except Exception:
                self._enqueue_outbox(
                    entry["event_type"], entry["payload"],
                    match_id=entry["match_id"], player_id=entry["player_id"], event_key=entry["event_key"],
                )
        return flushed

    def analytics_summary(self, *, since: float | None = None) -> dict[str, Any]:
        """Return small aggregate counters suitable for /ops surfacing.

        Aggregates entirely in SQL via typed columns (`result_type`,
        `cpu_difficulty`, `outcome`, `mission_id`) rather than loading every
        row's `payload_json` into Python — this stays cheap regardless of
        how many events the table accumulates.
        """

        time_clause = "AND created_at >= ?" if since is not None else ""
        params: tuple = (float(since),) if since is not None else ()

        with self._connect() as connection:
            total = connection.execute(
                f"SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'match_finished' {time_clause}",
                params,
            ).fetchone()["n"]
            vs_cpu_total = connection.execute(
                f"SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'match_finished' AND vs_cpu = 1 {time_clause}",
                params,
            ).fetchone()["n"]
            by_result_type = {
                str(row["result_type"] or "unknown"): row["n"]
                for row in connection.execute(
                    f"""
                    SELECT COALESCE(result_type, 'unknown') AS result_type, COUNT(*) AS n
                    FROM analytics_events WHERE event_type = 'match_finished' {time_clause}
                    GROUP BY result_type
                    """,
                    params,
                )
            }
            by_difficulty = {
                str(row["cpu_difficulty"] or "normal"): row["n"]
                for row in connection.execute(
                    f"""
                    SELECT COALESCE(cpu_difficulty, 'normal') AS cpu_difficulty, COUNT(*) AS n
                    FROM analytics_events WHERE event_type = 'match_finished' AND vs_cpu = 1 {time_clause}
                    GROUP BY cpu_difficulty
                    """,
                    params,
                )
            }
            outcome_rows = connection.execute(
                f"""
                SELECT outcome, COUNT(*) AS n FROM analytics_events
                WHERE event_type = 'match_player_result' {time_clause}
                GROUP BY outcome
                """,
                params,
            ).fetchall()
            missions_completed = {
                str(row["mission_id"]): row["n"]
                for row in connection.execute(
                    f"""
                    SELECT mission_id, COUNT(*) AS n FROM analytics_events
                    WHERE event_type = 'mission_completed' AND mission_id IS NOT NULL {time_clause}
                    GROUP BY mission_id
                    """,
                    params,
                )
                if row["mission_id"]
            }

        player_results = {"wins": 0, "losses": 0, "draws": 0, "no_contests": 0}
        outcome_key = {"win": "wins", "loss": "losses", "draw": "draws", "no_contest": "no_contests"}
        for row in outcome_rows:
            key = outcome_key.get(row["outcome"])
            if key:
                player_results[key] = row["n"]

        match_finished = {
            "total": total,
            "vs_cpu": vs_cpu_total,
            "by_difficulty": by_difficulty,
            "by_result_type": by_result_type,
            **player_results,
        }
        return {"match_finished": match_finished, "missions_completed": missions_completed}

    def healthcheck(self) -> dict[str, Any]:
        with self._connect() as connection:
            version = connection.execute(
                "SELECT value FROM runtime_meta WHERE key = 'schema_version'"
            ).fetchone()
            connection.execute("SELECT 1").fetchone()
        return {"ok": version is not None, "schema_version": int(version["value"]) if version else None}
