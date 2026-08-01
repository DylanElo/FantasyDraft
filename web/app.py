"""Flask + SocketIO bridge for the Battle v2 JJK Fantasy Draft app."""

from __future__ import annotations

import os
import secrets
import sys
import uuid
from collections import defaultdict, deque
from threading import RLock

from flask import Flask, abort, jsonify, redirect, render_template, request, session
from flask_socketio import SocketIO

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jjk_arena.battle_v2.first_creation_profile import (
    first_creation_profile_payload,
    load_first_creation_profile,
    merge_first_creation_profile_snapshot,
    merge_first_creation_progress,
    normalize_profile,
    save_first_creation_profile,
    update_first_creation_profile,
)
from jjk_arena.battle_v2.manager import BattleV2Manager, battle_v2_enabled, skill_catalog
from jjk_arena.battle_v2.starter_roster import first_creation_payload
from jjk_arena.battle_v2.sessions import BattleSessionRegistry
from jjk_arena.battle_v2.timer_scheduler import PhaseTimerScheduler
from jjk_arena.battle_v2.runtime_store import SQLiteRuntimeStore
from web.validation import (
    env_flag,
    resolve_cors_origins,
)


DEBUG_MODE = env_flag("JJK_DEBUG", False)
PRODUCTION_MODE = env_flag("JJK_PRODUCTION", False)
HOST = os.getenv("JJK_HOST", "127.0.0.1")
PORT = int(os.getenv("JJK_PORT", "5000"))
WEB_WORKERS = max(1, int(os.getenv("JJK_WEB_WORKERS", "1")))
CAPTURE_REPLAYS = env_flag("JJK_CAPTURE_REPLAYS", False)
REPLAY_RETENTION_DAYS = max(1, int(os.getenv("JJK_REPLAY_RETENTION_DAYS", "30")))
FINISHED_ROOM_TTL_SECONDS = max(60, int(os.getenv("JJK_FINISHED_ROOM_TTL_SECONDS", "900")))
ACTIVE_ROOM_TTL_SECONDS = max(300, int(os.getenv("JJK_ACTIVE_ROOM_TTL_SECONDS", "7200")))
LOBBY_TTL_SECONDS = max(60, int(os.getenv("JJK_LOBBY_TTL_SECONDS", "900")))
configured_cors_origins = os.getenv("JJK_CORS_ORIGINS")
CORS_ORIGINS = resolve_cors_origins(
    configured_cors_origins,
    HOST,
    PORT,
    production_mode=PRODUCTION_MODE,
)
SOCKETIO_ASYNC_MODE = os.getenv("JJK_SOCKETIO_ASYNC_MODE", "threading").strip().lower() or "threading"
EXAMPLE_SECRET = "replace-with-at-least-32-random-bytes"
EXAMPLE_OPS_TOKEN = "replace-with-a-separate-random-token"
EXAMPLE_CORS_ORIGIN = "https://arena.example.com"

app = Flask(__name__)
configured_secret = os.getenv("FLASK_SECRET_KEY")
app.secret_key = configured_secret or secrets.token_hex(32)
app.config.update(
    MAX_CONTENT_LENGTH=max(4096, int(os.getenv("JJK_MAX_REQUEST_BYTES", "65536"))),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=PRODUCTION_MODE,
)
socketio = SocketIO(
    app,
    cors_allowed_origins=CORS_ORIGINS,
    async_mode=SOCKETIO_ASYNC_MODE,
)

battle_v2_manager = BattleV2Manager(capture_replays=CAPTURE_REPLAYS)
battle_v2_sessions = BattleSessionRegistry()
runtime_store = SQLiteRuntimeStore()
v2_pvp_lobbies: dict[str, list[dict]] = {}
waiting_code_by_player: dict[str, str] = {}
active_match_by_player: dict[str, str] = {}
active_by_code: dict[str, str] = {}
lobby_code_by_match: dict[str, str] = {}
rematch_by_old_match: dict[str, str] = {}
rematch_receipts: dict[str, dict[str, tuple[int, str]]] = {}
match_players: dict[str, list[dict]] = {}
match_roster_mode: dict[str, str] = {}
lifecycle_lock = RLock()
rate_limits = defaultdict(deque)
room_last_activity: dict[str, float] = {}
lobby_last_activity: dict[str, float] = {}
archived_replays: set[str] = set()
analytics_recorded_matches: set[str] = set()
mission_match_finished_at: dict[str, float] = {}
operational_counters = defaultdict(int)
last_runtime_prune_at = 0.0
accepting_new_matches = True
CPU_V2_PLAYER_ID = "__cpu_v2__"

# Registers /healthz, /readyz, apply_security_headers, and re-exports
# production_readiness_issues (among others) onto this module's namespace.
# Must come after every global above -- see web/health_routes.py's docstring.
from web.health_routes import (  # noqa: E402
    _is_exact_https_origin,
    _runtime_storage_health,
    apply_security_headers,
    healthz,
    production_readiness_issues,
    readyz,
)


def live_match_memberships() -> dict[str, set[str]]:
    """Scan every non-finished room's real player list.

    Unlike `active_match_by_player` (one entry per player, so it can never
    reveal a player who ended up bound to two rooms), this reflects the
    authoritative membership state actually held by the manager.
    """

    memberships: dict[str, set[str]] = defaultdict(set)
    for match_id, state in battle_v2_manager.rooms.items():
        if state.phase.value == "finished":
            continue
        for player_id in state.players:
            if player_id != CPU_V2_PLAYER_ID:
                memberships[player_id].add(match_id)
    return memberships


def _timer_deadline(room_id: str) -> float | None:
    state = battle_v2_manager.rooms.get(room_id)
    if state is None or state.phase.value == "finished":
        # A finished match never needs another wakeup. Without this,
        # `expire_disconnects` finishing a match via forfeit leaves
        # `state.disconnect_deadlines` populated with the same already-past
        # deadline forever (it only marks players expired, it never clears
        # their deadline), so the scheduler's post-fire re-arm would see an
        # unchanged overdue deadline and spin firing/re-arming forever.
        return None
    deadlines = [d for d in (state.phase_deadline,) if d is not None]
    deadlines.extend(state.disconnect_deadlines.values())
    return min(deadlines) if deadlines else None


def _expire_timer_room(room_id: str) -> bool:
    if room_id not in battle_v2_manager.rooms:
        return False
    expired_phase = battle_v2_manager.expire_phase_if_needed(room_id)
    expired_disconnect = battle_v2_manager.expire_disconnects(room_id)
    if expired_disconnect:
        operational_counters["disconnect_forfeits"] += 1
    return expired_phase or expired_disconnect


battle_v2_timer_scheduler = PhaseTimerScheduler(
    get_deadline=_timer_deadline,
    expire=_expire_timer_room,
    on_expired=lambda room_id: handle_battle_v2_timeout(room_id),
    clock=lambda: battle_v2_manager.clock(),
    start_task=socketio.start_background_task,
    sleep=socketio.sleep,
)


def first_creation_payload_for_player(player_id: str | None) -> dict:
    payload = first_creation_payload()
    profile = load_first_creation_profile_with_recovery(player_id) if player_id else {}
    payload["profile"] = first_creation_profile_payload(profile)
    return payload


def archive_finished_replay(room_id: str) -> None:
    if not CAPTURE_REPLAYS or room_id in archived_replays:
        return
    state = battle_v2_manager.rooms.get(room_id)
    phase = getattr(getattr(state, "phase", None), "value", None)
    if state is None or (phase != "finished" and not getattr(state, "winner_id", None)):
        return
    document = battle_v2_manager.replay_document(room_id)
    if document is None:
        return
    try:
        runtime_store.save_replay(document, retention_days=REPLAY_RETENTION_DAYS)
    except Exception:
        operational_counters["replay_archive_errors"] += 1
        return
    archived_replays.add(room_id)
    operational_counters["replays_archived"] += 1


def _player_outcome(state, player_id: str) -> str:
    if state.winner_id:
        return "win" if state.winner_id == player_id else "loss"
    if (state.result_type or "").upper() == "DRAW":
        return "draw"
    return "no_contest"


def record_match_finished_analytics(room_id: str) -> None:
    if room_id in analytics_recorded_matches:
        return
    state = battle_v2_manager.rooms.get(room_id)
    if state is None or state.phase.value != "finished":
        return
    vs_cpu = CPU_V2_PLAYER_ID in state.players
    expected_event_keys = [f"match_finished:{room_id}"]
    try:
        runtime_store.record_analytics_event(
            "match_finished",
            {
                "roster_mode": match_roster_mode.get(room_id, "classic"),
                "vs_cpu": vs_cpu,
                "cpu_difficulty": battle_v2_manager.room_cpu_difficulty.get(room_id, "normal") if vs_cpu else None,
                "result_type": state.result_type,
                "finish_reason": state.finish_reason,
            },
            match_id=room_id,
            event_key=f"match_finished:{room_id}",
        )
        for player_id in state.players:
            if player_id == CPU_V2_PLAYER_ID:
                continue
            event_key = f"match_player_result:{room_id}:{player_id}"
            expected_event_keys.append(event_key)
            runtime_store.record_analytics_event(
                "match_player_result",
                {"outcome": _player_outcome(state, player_id)},
                match_id=room_id,
                player_id=player_id,
                event_key=event_key,
            )
        if not runtime_store.analytics_event_keys_exist(expected_event_keys):
            return
    except Exception:
        operational_counters["analytics_write_errors"] += 1
        return
    analytics_recorded_matches.add(room_id)


# Registers the mission-settlement/runtime-maintenance cluster and re-exports
# it onto this module's namespace -- flush_mission_settlements,
# ensure_terminal_persistence, prune_stale_runtime, etc., plus the
# missions_settled_players/missions_snapshotted_players/
# mission_snapshot_retry_rooms dicts/sets that remove_battle_v2_room and the
# socket handlers below still read/mutate directly. Must come after every
# global/function it depends on -- see web/maintenance.py's docstring.
from web.maintenance import (  # noqa: E402
    ensure_terminal_mission_snapshots,
    ensure_terminal_persistence,
    flush_mission_settlements,
    load_first_creation_profile_with_recovery,
    maybe_prune_runtime,
    mission_snapshot_retry_rooms,
    missions_settled_players,
    missions_snapshotted_players,
    on_battle_v2_match_finished,
    prune_stale_runtime,
    reconstruct_terminal_mission_snapshots,
    settle_first_creation_missions,
    terminal_mission_progress_snapshot,
    terminal_persistence_pending,
)

# Wired at the authoritative terminal state transition (manager._finish_match),
# not from the emit_battle_v2_update broadcast path — a repeated broadcast/
# reconnect refresh must not be the thing deciding whether match analytics or
# mission settlement ever happen.
battle_v2_manager.on_match_finished = on_battle_v2_match_finished

# Durable rows contain their own mission-progress snapshot, so recovery does
# not depend on the finished room still existing after a process restart.
try:
    flush_mission_settlements()
except Exception:
    operational_counters["mission_settlement_errors"] += 1


# Registers /ops/drain, /ops/runtime, /ops/safe_stop, and re-exports
# _require_ops_token/_drain_storage_maintenance onto this module's namespace.
# Must come after every function/global it depends on -- see
# web/ops_routes.py's docstring for why (it also *writes*
# accepting_new_matches, not just reads it).
from web.ops_routes import (  # noqa: E402
    _drain_storage_maintenance,
    _require_ops_token,
    runtime_drain,
    runtime_status,
    safe_stop,
)


def remove_battle_v2_room(room_id: str) -> bool:
    """Cancel timer work and atomically remove room-owned runtime state."""

    def remove_state() -> None:
        for player_id, active_match_id in list(active_match_by_player.items()):
            if active_match_id == room_id:
                active_match_by_player.pop(player_id, None)
        code = lobby_code_by_match.pop(room_id, None)
        if code and active_by_code.get(code) == room_id:
            active_by_code.pop(code, None)
        match_players.pop(room_id, None)
        match_roster_mode.pop(room_id, None)
        battle_v2_manager.remove_room(room_id)
        battle_v2_sessions.remove_room(room_id)
        room_last_activity.pop(room_id, None)
        archived_replays.discard(room_id)
        analytics_recorded_matches.discard(room_id)
        missions_settled_players.pop(room_id, None)
        missions_snapshotted_players.pop(room_id, None)
        mission_snapshot_retry_rooms.discard(room_id)
        mission_match_finished_at.pop(room_id, None)
        rematch_receipts.pop(room_id, None)
        rematch_by_old_match.pop(room_id, None)
        for old_match_id, new_match in list(rematch_by_old_match.items()):
            if new_match == room_id:
                rematch_by_old_match.pop(old_match_id, None)

    # Rematch creation holds lifecycle_lock while it snapshots the old match's
    # players, roster mode, and CPU difficulty. Use the same lock order
    # (lifecycle -> room) so cleanup cannot erase part of that configuration
    # midway through the handoff.
    with lifecycle_lock:
        # Per-room, not a global flag: an unrelated room's in-flight command
        # must never defer this room's cleanup. Scoped to command execution
        # itself (see `BattleV2Manager.in_flight_commands_for_room`), not the
        # client-visible broadcast that follows it in the socket handler.
        if battle_v2_manager.in_flight_commands_for_room(room_id):
            return False
        lock = battle_v2_manager.room_locks.get(room_id)
        if lock is None:
            if not ensure_terminal_persistence(room_id):
                return False
            if not battle_v2_timer_scheduler.cancel_if_idle(room_id):
                return False
            remove_state()
        else:
            with lock:
                # The room may have become terminal while cleanup waited for an
                # active command. Recheck the durable handoff under the same lock
                # before deleting any room-owned retry markers or replay state.
                if not ensure_terminal_persistence(room_id):
                    return False
                # This check and deadline cancellation are atomic with respect
                # to the scheduler worker. Its in-flight count spans expiry,
                # result broadcast, and re-arm work.
                if not battle_v2_timer_scheduler.cancel_if_idle(room_id):
                    return False
                remove_state()
            battle_v2_manager.room_locks.pop(room_id, None)
    return True


@app.route("/")
def index():
    if "player_id" not in session:
        session["player_id"] = str(uuid.uuid4())
    enabled = battle_v2_enabled()
    return render_template(
        "index.html",
        player_id=session["player_id"],
        battle_v2_enabled=enabled,
        battle_v2_catalog=skill_catalog() if enabled else {},
        first_creation=first_creation_payload_for_player(session["player_id"]) if enabled else {},
    )


@app.route("/new-session", methods=["POST"])
def new_session():
    session.clear()
    return redirect("/")


@app.route("/debug-state")
def debug_state():
    if not DEBUG_MODE or PRODUCTION_MODE:
        abort(404)
    room_id = session.get("room_id", "lobby")
    player_id = session.get("player_id", "NONE")
    state = None
    if room_id in battle_v2_manager.rooms:
        state = battle_v2_manager.serialize_for_player(room_id, player_id)
    return jsonify({"my_player_id": player_id, "room_id": room_id, "battle_v2_state": state})


# Registers the 14 battle_v2 Socket.IO handlers (start_classic, join_pvp,
# resume, leave_pvp, ack_result, rematch, submit_plan, update_queue,
# confirm_queue, cancel_queue, convert_energy, end_turn, surrender,
# disconnect) plus their private helpers, and re-exports the helpers onto
# this module's namespace -- allow_event, active_v2_context,
# emit_battle_v2_update, etc., plus NEW_MATCHES_DRAINED_MESSAGE (read by
# web/ops_routes.py's drain endpoint). Must come after every function/global
# it depends on -- see web/battle_v2_sockets.py's docstring for why this is
# the one slice where even calls *within* the extracted module go through
# `app_module.NAME` instead of a bare local call.
from web.battle_v2_sockets import (  # noqa: E402
    NEW_MATCHES_DRAINED_MESSAGE,
    _is_live_match,
    acknowledge_finished_match,
    active_v2_context,
    allow_event,
    authorize_match_context,
    battle_v2_cpu_difficulty,
    battle_v2_default_enemy_team,
    battle_v2_default_team,
    battle_v2_has_cpu,
    battle_v2_roster_mode,
    emit_battle_v2_command_error,
    emit_battle_v2_error,
    emit_battle_v2_update,
    execute_v2_player_command,
    handle_battle_v2_timeout,
    issue_battle_v2_resume_sessions,
    prune_context_indexes,
    remember_first_creation_team,
    remove_v2_pvp_lobby_player,
    run_battle_v2_cpu_turns,
    start_battle_v2_match_for_mode,
)


if __name__ == "__main__":
    socketio.run(
        app,
        debug=DEBUG_MODE,
        host=HOST,
        port=PORT,
        allow_unsafe_werkzeug=not PRODUCTION_MODE,
    )
