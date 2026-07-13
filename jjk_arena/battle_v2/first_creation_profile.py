"""File-backed profile persistence for first-character-creation mission progress."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .first_creation_unlocks import first_creation_unlocks_payload, unknown_first_creation_unlocks
from .runtime_store import SQLiteRuntimeStore

DEFAULT_PROFILE: dict[str, Any] = {
    "completed_missions": [],
    "unlocked": [],
    "mission_first_completed_at": {},
    "selected_starter_team": [],
}


def profile_store_path() -> Path:
    """Return the JSON store path, overridable for tests/deployments."""

    return Path(os.getenv("JJK_FIRST_CREATION_PROFILE_STORE", "data/first_creation_profiles.json"))


def _empty_profile() -> dict[str, Any]:
    return {
        "completed_missions": [],
        "unlocked": [],
        "mission_first_completed_at": {},
        "selected_starter_team": [],
    }


def _load_store() -> dict[str, dict[str, Any]]:
    path = profile_store_path()
    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return raw if isinstance(raw, dict) else {}


def _save_store(store: dict[str, dict[str, Any]]) -> None:
    path = profile_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(store, indent=2, sort_keys=True), encoding="utf-8")
    tmp.replace(path)


def normalize_profile(raw: dict[str, Any] | None = None) -> dict[str, Any]:
    """Normalize persisted JSON into the public profile shape."""

    raw = raw or {}
    profile = _empty_profile()
    profile["completed_missions"] = sorted({str(item) for item in raw.get("completed_missions", []) if str(item)})
    profile["unlocked"] = sorted({str(item) for item in raw.get("unlocked", []) if str(item)})
    first_completed = raw.get("mission_first_completed_at", {})
    if isinstance(first_completed, dict):
        profile["mission_first_completed_at"] = {
            str(mission_id): str(value)
            for mission_id, value in first_completed.items()
            if str(mission_id) and str(value)
        }
    team = raw.get("selected_starter_team", [])
    if isinstance(team, list):
        profile["selected_starter_team"] = [str(character_id) for character_id in team[:3] if str(character_id)]
    return profile


def load_first_creation_profile(player_id: str) -> dict[str, Any]:
    """Load one player's first-creation profile."""

    if not os.getenv("JJK_FIRST_CREATION_PROFILE_STORE"):
        return normalize_profile(SQLiteRuntimeStore().load_profile(str(player_id)))
    store = _load_store()
    return normalize_profile(store.get(str(player_id), {}))


def save_first_creation_profile(player_id: str, profile: dict[str, Any]) -> dict[str, Any]:
    """Persist one normalized first-creation profile."""

    normalized = normalize_profile(profile)
    if not os.getenv("JJK_FIRST_CREATION_PROFILE_STORE"):
        SQLiteRuntimeStore().save_profile(str(player_id), normalized)
        return normalized
    store = _load_store()
    store[str(player_id)] = normalized
    _save_store(store)
    return normalized


def update_first_creation_profile(player_id: str, updater) -> dict[str, Any]:
    """Atomically update one profile when the SQLite backend is active."""

    if not os.getenv("JJK_FIRST_CREATION_PROFILE_STORE"):
        updated = SQLiteRuntimeStore().update_profile(
            str(player_id),
            lambda current: normalize_profile(updater(normalize_profile(current))),
        )
        return normalize_profile(updated)
    return save_first_creation_profile(player_id, updater(load_first_creation_profile(player_id)))


def merge_first_creation_progress(player_id: str, progress: dict[str, Any] | None) -> dict[str, Any]:
    """Merge a completed room progress payload into durable player progress."""

    if not progress:
        return load_first_creation_profile(player_id)

    def merge(profile: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        completed = set(profile["completed_missions"])
        first_completed_at = dict(profile["mission_first_completed_at"])
        for mission_id in progress.get("completed_ids", []):
            mission_id = str(mission_id)
            if mission_id and mission_id not in completed:
                completed.add(mission_id)
                first_completed_at[mission_id] = now
        unlocked = set(profile["unlocked"])
        unlocked.update(str(unlock_id) for unlock_id in progress.get("unlocked", []) if str(unlock_id))
        profile["completed_missions"] = sorted(completed)
        profile["unlocked"] = sorted(unlocked)
        profile["mission_first_completed_at"] = first_completed_at
        if progress.get("team"):
            profile["selected_starter_team"] = [str(character_id) for character_id in progress.get("team", [])[:3]]
        return profile

    return update_first_creation_profile(player_id, merge)


def first_creation_profile_payload(profile: dict[str, Any]) -> dict[str, Any]:
    """Return profile plus reward metadata for UI mission-board rendering."""

    normalized = normalize_profile(profile)
    normalized["unlock_details"] = first_creation_unlocks_payload(normalized["unlocked"])
    normalized["unknown_unlocks"] = unknown_first_creation_unlocks(set(normalized["unlocked"]))
    return normalized
