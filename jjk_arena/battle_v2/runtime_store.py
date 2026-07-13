"""Concurrency-safe durable storage for production profile and replay data."""

from __future__ import annotations

import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Callable


SCHEMA_VERSION = 3


def runtime_database_path() -> Path:
    return Path(os.getenv("JJK_DATABASE_PATH", "data/jjk_arena.sqlite3"))


class SQLiteRuntimeStore:
    """Small SQLite boundary suitable for one or several web processes.

    Active Battle v2 rooms intentionally remain in one authoritative process;
    this store covers data that is safe to share durably across processes.
    """

    def __init__(self, path: str | Path | None = None, *, clock=time.time):
        self.path = Path(path) if path is not None else runtime_database_path()
        self.clock = clock
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

    def prune_expired_replays(self) -> int:
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM battle_replays WHERE expires_at <= ?",
                (float(self.clock()),),
            )
        return int(cursor.rowcount)

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
        won the race.
        """

        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO analytics_events(event_type, match_id, player_id, payload_json, created_at, event_key)
                VALUES(?, ?, ?, ?, ?, ?)
                """,
                (str(event_type), match_id, player_id, encoded, float(self.clock()), event_key),
            )
        return cursor.rowcount > 0

    def analytics_summary(self, *, since: float | None = None) -> dict[str, Any]:
        """Return small aggregate counters suitable for /ops surfacing."""

        clause = "WHERE created_at >= ?" if since is not None else ""
        params: tuple = (float(since),) if since is not None else ()
        with self._connect() as connection:
            rows = connection.execute(
                f"SELECT event_type, payload_json FROM analytics_events {clause}",
                params,
            ).fetchall()

        match_finished = {
            "total": 0,
            "vs_cpu": 0,
            "by_difficulty": {},
            "by_result_type": {},
        }
        player_results = {"wins": 0, "losses": 0, "draws": 0, "no_contests": 0}
        missions_completed: dict[str, int] = {}
        for row in rows:
            try:
                payload = json.loads(row["payload_json"])
            except (json.JSONDecodeError, TypeError):
                payload = {}
            if row["event_type"] == "match_finished":
                match_finished["total"] += 1
                result_type = str(payload.get("result_type") or "unknown")
                match_finished["by_result_type"][result_type] = (
                    match_finished["by_result_type"].get(result_type, 0) + 1
                )
                if payload.get("vs_cpu"):
                    match_finished["vs_cpu"] += 1
                    difficulty = str(payload.get("cpu_difficulty") or "normal")
                    match_finished["by_difficulty"][difficulty] = (
                        match_finished["by_difficulty"].get(difficulty, 0) + 1
                    )
            elif row["event_type"] == "match_player_result":
                outcome = payload.get("outcome")
                if outcome == "win":
                    player_results["wins"] += 1
                elif outcome == "loss":
                    player_results["losses"] += 1
                elif outcome == "draw":
                    player_results["draws"] += 1
                elif outcome == "no_contest":
                    player_results["no_contests"] += 1
            elif row["event_type"] == "mission_completed":
                mission_id = str(payload.get("mission_id", ""))
                if mission_id:
                    missions_completed[mission_id] = missions_completed.get(mission_id, 0) + 1
        match_finished.update(player_results)
        return {"match_finished": match_finished, "missions_completed": missions_completed}

    def healthcheck(self) -> dict[str, Any]:
        with self._connect() as connection:
            version = connection.execute(
                "SELECT value FROM runtime_meta WHERE key = 'schema_version'"
            ).fetchone()
            connection.execute("SELECT 1").fetchone()
        return {"ok": version is not None, "schema_version": int(version["value"]) if version else None}
