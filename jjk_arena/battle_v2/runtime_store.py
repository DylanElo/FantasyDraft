"""Concurrency-safe durable storage for production profile and replay data."""

from __future__ import annotations

import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Callable


SCHEMA_VERSION = 4

# Retention policy for analytics_events: rows older than this are pruned by
# prune_old_analytics_events(), called from web/app.py's existing periodic
# maintenance pass (prune_stale_runtime). Raw event rows aren't kept forever;
# aggregate counts are cheap to recompute from a bounded window, so this
# keeps analytics_summary()'s SQL scans cheap indefinitely instead of
# growing unboundedly for the life of the deployment. Override via
# JJK_ANALYTICS_RETENTION_DAYS for a different policy.
DEFAULT_ANALYTICS_RETENTION_DAYS = 90


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
