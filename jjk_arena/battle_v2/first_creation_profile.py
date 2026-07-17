"""File-backed profile persistence for first-character-creation mission progress."""

from __future__ import annotations

import json
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .first_creation_unlocks import first_creation_unlocks_payload, unknown_first_creation_unlocks
from .runtime_store import MalformedMissionSettlementError, SQLiteRuntimeStore

DEFAULT_PROFILE: dict[str, Any] = {
    "completed_missions": [],
    "unlocked": [],
    "mission_first_completed_at": {},
    "selected_starter_team": [],
    "_selected_starter_team_at": 0.0,
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
        "_selected_starter_team_at": 0.0,
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
    try:
        selected_at = float(raw.get("_selected_starter_team_at", 0.0))
    except (TypeError, ValueError):
        selected_at = 0.0
    profile["_selected_starter_team_at"] = selected_at if math.isfinite(selected_at) else 0.0
    return profile


def _terminal_timestamp(progress: dict[str, Any], finished_at: float | None = None) -> float:
    candidate = progress.get("_match_finished_at") if finished_at is None else finished_at
    if candidate is None:
        return time.time()
    try:
        parsed = float(candidate)
    except (TypeError, ValueError) as exc:
        raise MalformedMissionSettlementError("match finish timestamp must be numeric") from exc
    if not math.isfinite(parsed) or parsed < 0:
        raise MalformedMissionSettlementError("match finish timestamp must be finite and non-negative")
    try:
        datetime.fromtimestamp(parsed, timezone.utc)
    except (OverflowError, OSError, ValueError) as exc:
        raise MalformedMissionSettlementError(
            "match finish timestamp is outside the supported datetime range"
        ) from exc
    return parsed


def _validated_string_list(progress: dict[str, Any], key: str) -> list[str]:
    value = progress.get(key, [])
    if value is None:
        return []
    if not isinstance(value, list):
        raise MalformedMissionSettlementError(f"mission settlement {key} must be a list")
    return [str(item) for item in value if str(item)]


def merge_first_creation_profile_snapshot(
    current: dict[str, Any],
    progress: dict[str, Any],
    finished_at: float | None = None,
) -> tuple[dict[str, Any], list[str]]:
    """Pure, validated profile merge used by both legacy and atomic storage paths."""

    if not isinstance(progress, dict):
        raise MalformedMissionSettlementError("mission settlement progress must be an object")
    profile = normalize_profile(current)
    terminal_at = _terminal_timestamp(progress, finished_at)
    terminal_iso = datetime.fromtimestamp(terminal_at, timezone.utc).isoformat()
    completed_ids = _validated_string_list(progress, "completed_ids")
    unlock_ids = _validated_string_list(progress, "unlocked")
    team = _validated_string_list(progress, "team")[:3]

    newly_completed: list[str] = []
    completed = set(profile["completed_missions"])
    first_completed_at = dict(profile["mission_first_completed_at"])
    for mission_id in completed_ids:
        if mission_id not in completed:
            completed.add(mission_id)
            newly_completed.append(mission_id)
        prior_timestamp = first_completed_at.get(mission_id)
        try:
            prior_instant = datetime.fromisoformat(str(prior_timestamp)).timestamp()
        except (TypeError, ValueError):
            prior_instant = math.inf
        if terminal_at < prior_instant:
            first_completed_at[mission_id] = terminal_iso

    unlocked = set(profile["unlocked"])
    unlocked.update(unlock_ids)
    profile["completed_missions"] = sorted(completed)
    profile["unlocked"] = sorted(unlocked)
    profile["mission_first_completed_at"] = first_completed_at
    if team and terminal_at >= float(profile.get("_selected_starter_team_at", 0.0)):
        profile["selected_starter_team"] = team
        profile["_selected_starter_team_at"] = terminal_at
    return normalize_profile(profile), newly_completed


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


def merge_first_creation_progress(
    player_id: str,
    progress: dict[str, Any] | None,
    *,
    match_id: str | None = None,
    analytics_store: "SQLiteRuntimeStore | None" = None,
    profile_store: "SQLiteRuntimeStore | None" = None,
) -> dict[str, Any]:
    """Merge a completed room progress payload into durable player progress.

    Mission-completed analytics are recorded here, at the point the
    completion is actually persisted, rather than by a caller diffing
    before/after profile snapshots around a broadcast — a repeated
    broadcast or reconnect-triggered refresh calls this again with the
    same `progress`, but `newly_completed` is only ever non-empty the one
    time a mission first crosses into `completed_missions`.

    `analytics_store` lets a caller pass its own long-lived
    `SQLiteRuntimeStore` (e.g. `web/app.py`'s process-wide singleton, whose
    `.path` tests redirect) instead of constructing a fresh one bound to
    the default database path.
    """

    if not progress:
        return load_first_creation_profile(player_id)

    newly_completed: list[str] = []

    def merge(profile: dict[str, Any]) -> dict[str, Any]:
        updated, newly = merge_first_creation_profile_snapshot(profile, progress)
        newly_completed.extend(newly)
        return updated

    if profile_store is not None and not os.getenv("JJK_FIRST_CREATION_PROFILE_STORE"):
        updated = normalize_profile(profile_store.update_profile(
            str(player_id),
            lambda current: normalize_profile(merge(normalize_profile(current))),
        ))
    else:
        updated = update_first_creation_profile(player_id, merge)
    if newly_completed and match_id:
        store = analytics_store if analytics_store is not None else SQLiteRuntimeStore()
        for mission_id in newly_completed:
            try:
                store.record_analytics_event(
                    "mission_completed",
                    {"mission_id": mission_id},
                    match_id=match_id,
                    player_id=player_id,
                    event_key=f"mission_completed:{match_id}:{player_id}:{mission_id}",
                )
            except Exception:
                pass
    return updated


def first_creation_profile_payload(profile: dict[str, Any]) -> dict[str, Any]:
    """Return profile plus reward metadata for UI mission-board rendering."""

    normalized = normalize_profile(profile)
    normalized.pop("_selected_starter_team_at", None)
    normalized["unlock_details"] = first_creation_unlocks_payload(normalized["unlocked"])
    normalized["unknown_unlocks"] = unknown_first_creation_unlocks(set(normalized["unlocked"]))
    return normalized
