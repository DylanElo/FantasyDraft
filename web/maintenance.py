"""Mission-settlement and runtime-maintenance cluster for web/app.py.

Extracted as part of that file's split (see docs/audit_ledger.md, Slice 3).
Same rule as web/health_routes.py and web/ops_routes.py: every reference to
app.py-owned state (the manager, runtime store, operational counters,
mutable module-level dicts/sets it still owns, etc.) goes through
`app_module.NAME`, never a bare `from web.app import NAME` -- app.py's
socket handlers and `remove_battle_v2_room` read/mutate several of the
dicts/sets defined here directly, so this module owns them and app.py gets
them back via the same plain re-export `from web.maintenance import (...)`
already used for the earlier slices.
"""

from __future__ import annotations

import time
from collections import defaultdict

import web.app as app_module


missions_settled_players: dict[str, set[str]] = defaultdict(set)
missions_snapshotted_players: dict[str, set[str]] = defaultdict(set)
mission_snapshot_retry_rooms: set[str] = set()


def terminal_persistence_pending(room_id: str, *, state=None) -> bool:
    """Return whether a terminal room still needs durable handoff work."""

    state = state if state is not None else app_module.battle_v2_manager.rooms.get(room_id)
    if state is None or getattr(getattr(state, "phase", None), "value", None) != "finished":
        return False
    if room_id not in app_module.analytics_recorded_matches:
        return True
    roster_mode = app_module.battle_v2_manager.room_roster_modes.get(room_id)
    if roster_mode not in {"classic", "first_creation"}:
        return True
    if roster_mode == "first_creation":
        players = getattr(state, "players", None)
        if not isinstance(players, dict):
            return True
        human_players = {
            player_id for player_id in players if player_id != app_module.CPU_V2_PLAYER_ID
        }
        if not human_players.issubset(missions_snapshotted_players.get(room_id, set())):
            return True
    if app_module.CAPTURE_REPLAYS and room_id not in app_module.archived_replays:
        return True
    return False


def flush_mission_settlements(
    *,
    player_id: str | None = None,
    force_due: bool = False,
) -> list[tuple[str, str]]:
    """Retry durable mission merges without requiring the source room."""

    # ponytail: nothing writes a new sidecar file anymore, but this still
    # drains one left over from before that removal (or restored from a
    # pre-migration backup) into SQLite instead of leaving it stranded.
    restored = app_module.runtime_store.restore_mission_settlement_fallback()
    app_module.operational_counters["mission_settlement_fallback_restored"] += restored

    settled = app_module.runtime_store.process_mission_settlements(
        player_id=player_id,
        force_due=force_due,
        profile_updater=app_module.merge_first_creation_profile_snapshot,
    )
    for match_id, player_id in settled:
        missions_snapshotted_players[match_id].add(player_id)
        missions_settled_players[match_id].add(player_id)
    return settled


def load_first_creation_profile_with_recovery(player_id: str) -> dict:
    """Drain this player's durable credit before serving a profile read."""

    try:
        reconstruct_terminal_mission_snapshots(player_id=str(player_id), limit=8)
        flush_mission_settlements(player_id=str(player_id), force_due=True)
    except Exception:
        app_module.operational_counters["mission_settlement_profile_read_errors"] += 1
    return app_module.normalize_profile(app_module.runtime_store.load_profile(str(player_id)))


def terminal_mission_progress_snapshot(room_id: str, player_id: str) -> tuple[dict, float]:
    """Return a terminal snapshot with a stable per-match finish timestamp."""

    finished_at = app_module.mission_match_finished_at.setdefault(room_id, time.time())
    progress = app_module.battle_v2_manager.mission_progress_for_player(room_id, player_id)
    snapshot = dict(progress or {})
    snapshot["_match_finished_at"] = finished_at
    return snapshot, finished_at


def settle_first_creation_missions(room_id: str) -> None:
    """Merge every human player's mission progress into their durable profile.

    Runs once at the authoritative terminal state transition rather than
    inside emit_battle_v2_update's broadcast loop: settlement must not
    depend on a viewer broadcast actually happening (or happening after the
    winner is decided) to ever occur at all.

    Tracked per player, not per room: a transient write failure for one
    player must not stop the room from ever being retried -- only a player
    whose merge actually succeeded is skipped on a later call, so a repeat
    on_match_finished fire (or any other future retry trigger) can still
    recover mission credit and unlocks a prior failure would otherwise have
    lost permanently.
    """

    state = app_module.battle_v2_manager.rooms.get(room_id)
    if state is None or state.phase.value != "finished":
        return
    if app_module.battle_v2_manager.room_roster_modes.get(room_id) != "first_creation":
        return
    snapshotted = missions_snapshotted_players[room_id]
    for player_id in state.players:
        if player_id == app_module.CPU_V2_PLAYER_ID or player_id in snapshotted:
            continue
        try:
            progress, finished_at = terminal_mission_progress_snapshot(room_id, player_id)
            app_module.runtime_store.enqueue_mission_settlement(
                room_id,
                player_id,
                progress,
                finished_at=finished_at,
            )
            snapshotted.add(player_id)
        except Exception:
            mission_snapshot_retry_rooms.add(room_id)
            app_module.operational_counters["mission_settlement_errors"] += 1
    human_players = {player_id for player_id in state.players if player_id != app_module.CPU_V2_PLAYER_ID}
    if human_players.issubset(snapshotted):
        mission_snapshot_retry_rooms.discard(room_id)
    try:
        # An explicit repeat of the authoritative terminal hook is itself a
        # prompt retry signal. Bypass backoff for at most the first claimed
        # row; the store still schedules every subsequent failure normally.
        flush_mission_settlements(force_due=True)
    except Exception:
        app_module.operational_counters["mission_settlement_errors"] += 1


def on_battle_v2_match_finished(room_id: str) -> None:
    """Single authoritative hook fired once when a match reaches FINISHED."""

    app_module.record_match_finished_analytics(room_id)
    settle_first_creation_missions(room_id)


def ensure_terminal_mission_snapshots(room_id: str) -> bool:
    """Reconstruct missing terminal rows before authoritative room cleanup."""

    state = app_module.battle_v2_manager.rooms.get(room_id)
    if state is None or app_module.battle_v2_manager.room_roster_modes.get(room_id) != "first_creation":
        return True
    phase = getattr(getattr(state, "phase", None), "value", None)
    if phase != "finished" and not getattr(state, "result_type", None):
        return True
    snapshotted = missions_snapshotted_players[room_id]
    for player_id in state.players:
        if player_id == app_module.CPU_V2_PLAYER_ID or player_id in snapshotted:
            continue
        try:
            progress, finished_at = terminal_mission_progress_snapshot(room_id, player_id)
            app_module.runtime_store.enqueue_mission_settlement(
                room_id,
                player_id,
                progress,
                finished_at=finished_at,
            )
            snapshotted.add(player_id)
        except Exception:
            mission_snapshot_retry_rooms.add(room_id)
            app_module.operational_counters["mission_settlement_snapshot_failures"] += 1
            return False
    mission_snapshot_retry_rooms.discard(room_id)
    return True


def ensure_terminal_persistence(room_id: str) -> bool:
    """Retry every room-bound durable handoff before cleanup or planned stop."""

    state = app_module.battle_v2_manager.rooms.get(room_id)
    if state is None or getattr(getattr(state, "phase", None), "value", None) != "finished":
        return True
    lock = app_module.battle_v2_manager.room_locks.get(room_id)
    if lock is None:
        return False
    with lock:
        state = app_module.battle_v2_manager.rooms.get(room_id)
        if state is None or getattr(getattr(state, "phase", None), "value", None) != "finished":
            return True
        try:
            app_module.record_match_finished_analytics(room_id)
        except Exception:
            app_module.operational_counters["analytics_write_errors"] += 1
        try:
            ensure_terminal_mission_snapshots(room_id)
        except Exception:
            mission_snapshot_retry_rooms.add(room_id)
            app_module.operational_counters["mission_settlement_snapshot_failures"] += 1
        try:
            app_module.archive_finished_replay(room_id)
        except Exception:
            app_module.operational_counters["replay_archive_errors"] += 1
        return not terminal_persistence_pending(room_id, state=state)


def reconstruct_terminal_mission_snapshots(
    *,
    room_id: str | None = None,
    player_id: str | None = None,
    limit: int = 50,
) -> int:
    """Promptly retry missing durable snapshots while terminal rooms still live."""

    reconstructed = 0
    checked = 0
    for candidate_room_id, state in list(app_module.battle_v2_manager.rooms.items()):
        if checked >= max(1, int(limit)):
            break
        if room_id is not None and candidate_room_id != room_id:
            continue
        if player_id is not None and player_id not in state.players:
            continue
        if app_module.battle_v2_manager.room_roster_modes.get(candidate_room_id) != "first_creation":
            continue
        if candidate_room_id not in mission_snapshot_retry_rooms:
            continue
        phase = getattr(getattr(state, "phase", None), "value", None)
        if phase != "finished" and not getattr(state, "result_type", None):
            continue
        checked += 1
        before = len(missions_snapshotted_players[candidate_room_id])
        ensure_terminal_mission_snapshots(candidate_room_id)
        reconstructed += len(missions_snapshotted_players[candidate_room_id]) - before
    app_module.operational_counters["mission_settlement_snapshots_reconstructed"] += reconstructed
    return reconstructed


def prune_stale_runtime(now: float | None = None) -> dict[str, int]:
    current = time.monotonic() if now is None else float(now)
    try:
        reconstruct_terminal_mission_snapshots(limit=50)
    except Exception:
        app_module.operational_counters["storage_maintenance_errors"] += 1
    removed_rooms = 0
    for room_id, last_activity in list(app_module.room_last_activity.items()):
        state = app_module.battle_v2_manager.rooms.get(room_id)
        phase = getattr(getattr(state, "phase", None), "value", None)
        terminal = state is not None and (phase == "finished" or bool(getattr(state, "winner_id", None)))
        ttl = app_module.FINISHED_ROOM_TTL_SECONDS if terminal else app_module.ACTIVE_ROOM_TTL_SECONDS
        if current - last_activity >= ttl:
            if app_module.remove_battle_v2_room(room_id):
                removed_rooms += 1
    removed_lobbies = 0
    for room_id, last_activity in list(app_module.lobby_last_activity.items()):
        if current - last_activity >= app_module.LOBBY_TTL_SECONDS:
            expired = app_module.v2_pvp_lobbies.pop(room_id, None) or []
            for entry in expired:
                if app_module.waiting_code_by_player.get(entry["id"]) == room_id:
                    app_module.waiting_code_by_player.pop(entry["id"], None)
            app_module.lobby_last_activity.pop(room_id, None)
            removed_lobbies += 1
    removed_limits = 0
    for key, hits in list(app_module.rate_limits.items()):
        while hits and current - hits[0] > 60:
            hits.popleft()
        if not hits:
            app_module.rate_limits.pop(key, None)
            removed_limits += 1
    try:
        expired_replays = app_module.runtime_store.prune_expired_replays()
    except Exception:
        expired_replays = 0
        app_module.operational_counters["storage_maintenance_errors"] += 1
    try:
        flushed_analytics = app_module.runtime_store.flush_outbox()
    except Exception:
        flushed_analytics = 0
        app_module.operational_counters["storage_maintenance_errors"] += 1
    try:
        settled_missions = len(flush_mission_settlements())
    except Exception:
        settled_missions = 0
        app_module.operational_counters["storage_maintenance_errors"] += 1
    try:
        pruned_settlements = app_module.runtime_store.prune_settled_mission_settlements()
    except Exception:
        pruned_settlements = 0
        app_module.operational_counters["storage_maintenance_errors"] += 1
    try:
        expired_analytics = app_module.runtime_store.prune_old_analytics_events()
    except Exception:
        expired_analytics = 0
        app_module.operational_counters["storage_maintenance_errors"] += 1
    app_module.operational_counters["rooms_pruned"] += removed_rooms
    app_module.operational_counters["lobbies_pruned"] += removed_lobbies
    app_module.operational_counters["replays_pruned"] += expired_replays
    app_module.operational_counters["analytics_outbox_flushed"] += flushed_analytics
    app_module.operational_counters["mission_settlements_flushed"] += settled_missions
    app_module.operational_counters["mission_settlements_pruned"] += pruned_settlements
    app_module.operational_counters["analytics_events_pruned"] += expired_analytics
    return {
        "rooms": removed_rooms,
        "lobbies": removed_lobbies,
        "rate_limits": removed_limits,
        "replays": expired_replays,
        "analytics_flushed": flushed_analytics,
        "mission_settlements_flushed": settled_missions,
        "mission_settlements_pruned": pruned_settlements,
        "analytics_pruned": expired_analytics,
    }


def maybe_prune_runtime(now: float | None = None) -> None:
    current = time.monotonic() if now is None else float(now)
    if current - app_module.last_runtime_prune_at < 60:
        return
    app_module.last_runtime_prune_at = current
    prune_stale_runtime(current)
