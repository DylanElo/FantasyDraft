"""Battle v2 Socket.IO handlers and their private helpers for web/app.py.

Extracted as part of that file's split (see docs/audit_ledger.md, Slice 4 --
the last and riskiest slice, since this cluster touches nearly every global
`web/app.py` still owns). Same rule as the earlier slices: every reference to
app.py-owned state goes through `app_module.NAME`, never a bare
`from web.app import NAME`.

This module goes one step further than health_routes/ops_routes/maintenance:
even calls from one function *in this same file* to another function *in
this same file* go through `app_module.NAME` rather than a bare local call,
because two of them (`allow_event`, `battle_v2_has_cpu`) are proven to be
individually monkeypatched via `monkeypatch.setattr(web_app, ...)` in tests
that then trigger a handler through the Socket.IO test client -- a bare
local call from the handler to `allow_event` would resolve this module's own
(unpatched) global, silently ignoring the patch. Routing every such call
through the shared `web.app` attribute is what makes the patch visible
regardless of which function the call originates from, so that behavior
doesn't depend on which of these two names happens to be patched today.
"""

from __future__ import annotations

import time
import uuid

from flask import session
from flask_socketio import emit, join_room, leave_room

from jjk_arena.battle_v2.first_creation_profile import (
    first_creation_profile_payload,
    update_first_creation_profile,
)
from jjk_arena.battle_v2.manager import BattleV2Error, battle_v2_enabled
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_PRESETS
from web.validation import (
    CONTROL_RE,
    clean_player_name,
    clean_resume_token,
    clean_room_id,
    clean_v2_actions,
    clean_v2_command_metadata,
    clean_v2_energy_color,
    clean_v2_energy_colors,
    clean_v2_queue_order,
    clean_v2_team,
    clean_v2_wildcard_pays,
    lobby_room,
    match_room,
    new_match_id,
    player_room,
)

import web.app as app_module


NEW_MATCHES_DRAINED_MESSAGE = "New matches are temporarily unavailable during maintenance."


def prune_context_indexes() -> None:
    """Discard index entries whose authoritative lobby/match no longer exists."""

    for player_id, match_id in list(app_module.active_match_by_player.items()):
        if match_id not in app_module.battle_v2_manager.rooms:
            app_module.active_match_by_player.pop(player_id, None)
    for code, match_id in list(app_module.active_by_code.items()):
        if match_id not in app_module.battle_v2_manager.rooms:
            app_module.active_by_code.pop(code, None)
    for player_id, code in list(app_module.waiting_code_by_player.items()):
        if not any(entry["id"] == player_id for entry in app_module.v2_pvp_lobbies.get(code, [])):
            app_module.waiting_code_by_player.pop(player_id, None)
    for alias, match_id in list(app_module.battle_v2_manager.room_aliases.items()):
        if match_id not in app_module.battle_v2_manager.rooms:
            app_module.battle_v2_manager.room_aliases.pop(alias, None)


def _is_live_match(match_id: str | None) -> bool:
    if not match_id:
        return False
    state = app_module.battle_v2_manager.rooms.get(match_id)
    return state is not None and state.phase.value != "finished"


def battle_v2_roster_mode(data: dict) -> str:
    mode = CONTROL_RE.sub("", str(data.get("roster_mode", "classic")).strip().lower())[:32]
    return "first_creation" if mode == "first_creation" else "classic"


def battle_v2_cpu_difficulty(data: dict) -> str:
    difficulty = CONTROL_RE.sub("", str(data.get("difficulty", "normal")).strip().lower())[:16]
    return difficulty if difficulty in {"easy", "normal", "hard"} else "normal"


def battle_v2_default_team(mode: str, preset: str = "story_tutorial") -> list[str]:
    team = FIRST_CREATION_PRESETS.get(preset) or FIRST_CREATION_PRESETS["story_tutorial"]
    return list(team)


def battle_v2_default_enemy_team(mode: str) -> list[str]:
    return list(FIRST_CREATION_PRESETS["jjk0_beginner_special"])


def remember_first_creation_team(player_id: str, team: list[str]) -> None:
    def remember(profile):
        profile["selected_starter_team"] = list(team[:3])
        profile["_selected_starter_team_at"] = time.time()
        return profile

    update_first_creation_profile(player_id, remember)


def start_battle_v2_match_for_mode(room_id: str, players: list[dict], mode: str, difficulty: str = "normal") -> dict:
    try:
        if mode == "first_creation":
            payload = app_module.battle_v2_manager.start_first_creation_match(room_id, players, difficulty=difficulty)
        else:
            payload = app_module.battle_v2_manager.start_classic_match(room_id, players, difficulty=difficulty)
    except Exception:
        if room_id in app_module.battle_v2_manager.rooms:
            app_module.remove_battle_v2_room(room_id)
        raise
    app_module.room_last_activity[room_id] = time.monotonic()
    app_module.operational_counters["matches_started"] += 1
    app_module.battle_v2_timer_scheduler.arm(room_id)
    return payload


def execute_v2_player_command(
    room_id: str,
    player_id: str,
    command: str,
    data: dict,
    payload: dict | None = None,
) -> bool:
    state_revision, nonce = clean_v2_command_metadata(data)
    replayed = app_module.battle_v2_manager.execute_player_command(
        room_id,
        player_id,
        command,
        state_revision,
        nonce,
        payload or {},
    )
    app_module.room_last_activity[room_id] = time.monotonic()
    app_module.operational_counters["commands_replayed" if replayed else "commands_applied"] += 1
    app_module.battle_v2_timer_scheduler.arm(room_id)
    return replayed


def active_v2_context(data=None, *, require_membership: bool = True):
    if not battle_v2_enabled():
        emit("battle_v2_error", {"message": "Battle v2 is disabled. Set JJK_BATTLE_SYSTEM=v2."})
        return None
    data = data or {}
    player_session = session.get("player_id")
    if not player_session:
        player_session = str(uuid.uuid4())
        session["player_id"] = player_session
    requested_room_id = clean_room_id(data["room_id"]) if data.get("room_id") else None
    room_id = app_module.active_by_code.get(requested_room_id, requested_room_id) if requested_room_id else None
    room_id = room_id or session.get("match_id") or session.get("room_id") or "classic-v2"
    active_match_id = app_module.active_match_by_player.get(player_session)
    if active_match_id and room_id != active_match_id and app_module._is_live_match(active_match_id):
        room_id = active_match_id
    if require_membership:
        state = app_module.battle_v2_manager.rooms.get(room_id)
        if state is None or player_session not in state.players:
            emit("battle_v2_error", {"message": "Player is not a member of this match."})
            return None
        session["room_id"] = room_id
        session["match_id"] = room_id
        join_room(match_room(room_id))
        join_room(player_room(player_session))
    return room_id, player_session


def authorize_match_context(room_id: str, player_id: str) -> None:
    state = app_module.battle_v2_manager.rooms.get(room_id)
    if state is None or player_id not in state.players:
        raise BattleV2Error("Player is not a member of this match.")
    session["room_id"] = room_id
    session["match_id"] = room_id
    join_room(match_room(room_id))
    join_room(player_room(player_id))


def emit_battle_v2_update(room_id: str, viewer_id: str | None = None):
    state = app_module.battle_v2_manager.get_state(room_id)
    app_module.room_last_activity[room_id] = time.monotonic()
    if state.phase.value == "finished":
        # Analytics and initial mission handoff belong to the authoritative
        # terminal callback, not to a viewer broadcast. This path only retries
        # an already-marked snapshot gap and archives the postcommit replay.
        app_module.reconstruct_terminal_mission_snapshots(room_id=room_id, limit=1)
        try:
            app_module.flush_mission_settlements()
        except Exception:
            app_module.operational_counters["mission_settlement_errors"] += 1
        app_module.archive_finished_replay(room_id)
    viewer_ids = [player_id for player_id in state.players if player_id != app_module.CPU_V2_PLAYER_ID]
    if viewer_id and viewer_id not in viewer_ids and viewer_id in state.players:
        viewer_ids.append(viewer_id)
    if not viewer_ids and viewer_id:
        viewer_ids = [viewer_id]
    for target_viewer_id in viewer_ids:
        payload = app_module.battle_v2_manager.serialize_for_player(room_id, target_viewer_id)
        if payload.get("roster_mode") == "first_creation":
            profile = app_module.load_first_creation_profile_with_recovery(target_viewer_id)
            payload["first_creation_account"] = first_creation_profile_payload(profile)
        payload["match_id"] = room_id
        payload["lobby_code"] = app_module.lobby_code_by_match.get(room_id)
        app_module.socketio.emit("battle_v2_update", payload, room=player_room(target_viewer_id))
        if payload.get("phase") == "finished":
            app_module.socketio.emit(
                "battle_v2_finished",
                {"winner_id": payload.get("winner_id")},
                room=player_room(target_viewer_id),
            )


def emit_battle_v2_error(exc: Exception):
    app_module.operational_counters["command_errors"] += 1
    emit("battle_v2_error", {"message": str(exc)})


def emit_battle_v2_command_error(exc: Exception, room_id: str, viewer_id: str) -> None:
    """Reject the intent, then return the viewer's current authoritative snapshot."""
    app_module.emit_battle_v2_error(exc)
    app_module.emit_battle_v2_update(room_id, viewer_id)


def issue_battle_v2_resume_sessions(room_id: str) -> None:
    state = app_module.battle_v2_manager.get_state(room_id)
    for player_id in state.players:
        if player_id == app_module.CPU_V2_PLAYER_ID:
            continue
        grant = app_module.battle_v2_sessions.issue(room_id, player_id)
        app_module.socketio.emit(
            "battle_v2_session",
            {"room_id": room_id, "player_id": player_id, "resume_token": grant.token},
            room=player_room(player_id),
        )


def run_battle_v2_cpu_turns(room_id: str):
    for _ in range(6):
        state = app_module.battle_v2_manager.get_state(room_id)
        if state.winner_id or state.turn_player_id != app_module.CPU_V2_PLAYER_ID:
            return
        app_module.battle_v2_manager.execute_player_command(
            room_id,
            app_module.CPU_V2_PLAYER_ID,
            "cpu_turn",
            state.state_revision,
            f"server-cpu-{state.state_revision}",
            {},
        )
        app_module.battle_v2_timer_scheduler.arm(room_id)


def handle_battle_v2_timeout(room_id: str) -> None:
    """Continue automatic CPU play and broadcast a background timeout result."""

    if room_id not in app_module.battle_v2_manager.rooms:
        return
    app_module.operational_counters["phase_timeouts"] += 1
    if app_module.battle_v2_has_cpu(room_id):
        app_module.run_battle_v2_cpu_turns(room_id)
    app_module.emit_battle_v2_update(room_id)


def battle_v2_has_cpu(room_id: str) -> bool:
    try:
        state = app_module.battle_v2_manager.get_state(room_id)
    except BattleV2Error:
        return False
    return app_module.CPU_V2_PLAYER_ID in state.players


def remove_v2_pvp_lobby_player(room_id: str, player_session: str) -> list[dict]:
    lobby = app_module.v2_pvp_lobbies.get(room_id, [])
    kept = [entry for entry in lobby if entry["id"] != player_session]
    if kept:
        app_module.v2_pvp_lobbies[room_id] = kept
    else:
        app_module.v2_pvp_lobbies.pop(room_id, None)
        app_module.lobby_last_activity.pop(room_id, None)
    if app_module.waiting_code_by_player.get(player_session) == room_id:
        app_module.waiting_code_by_player.pop(player_session, None)
    return kept


def acknowledge_finished_match(match_id: str, player_id: str) -> None:
    """Release live identity/code bindings without deleting archived match state."""

    state = app_module.battle_v2_manager.rooms.get(match_id)
    if state is None or state.phase.value != "finished" or player_id not in state.players:
        return
    if app_module.active_match_by_player.get(player_id) == match_id:
        app_module.active_match_by_player.pop(player_id, None)
    code = app_module.lobby_code_by_match.get(match_id)
    if code and app_module.active_by_code.get(code) == match_id:
        app_module.active_by_code.pop(code, None)


def allow_event(event_name: str, limit: int = 30, window_seconds: int = 5) -> bool:
    player_session = session.get("player_id", "anonymous")
    now = time.monotonic()
    app_module.maybe_prune_runtime(now)
    key = (player_session, event_name)
    hits = app_module.rate_limits[key]
    while hits and now - hits[0] > window_seconds:
        hits.popleft()
    if len(hits) >= limit:
        app_module.operational_counters["rate_limited_events"] += 1
        emit("message", {"text": "Too many actions. Slow down for a moment."})
        return False
    hits.append(now)
    app_module.operational_counters["socket_events"] += 1
    return True


@app_module.socketio.on("battle_v2_start_classic")
def on_battle_v2_start_classic(data=None):
    if not app_module.allow_event("battle_v2_start_classic", limit=10, window_seconds=10):
        return
    data = data or {}
    context = app_module.active_v2_context(data, require_membership=False)
    if not context:
        return
    requested_code, player_session = context
    room_id = new_match_id()
    player_name = clean_player_name(data.get("player_name", ""), f"Player_{player_session[:4]}")
    roster_mode = app_module.battle_v2_roster_mode(data)
    difficulty = app_module.battle_v2_cpu_difficulty(data)
    player_team = clean_v2_team(data.get("player_team") or data.get("team"), app_module.battle_v2_default_team(roster_mode))
    enemy_team = clean_v2_team(data.get("enemy_team"), app_module.battle_v2_default_enemy_team(roster_mode))
    try:
        with app_module.lifecycle_lock:
            if not app_module.accepting_new_matches:
                raise BattleV2Error(app_module.NEW_MATCHES_DRAINED_MESSAGE)
            bound_match = app_module.active_by_code.get(requested_code)
            if app_module._is_live_match(requested_code) or (bound_match and app_module._is_live_match(bound_match)):
                raise BattleV2Error("Lobby code is already bound to an active match.")
            if bound_match and not app_module._is_live_match(bound_match):
                app_module.active_by_code.pop(requested_code, None)
            current = app_module.active_match_by_player.get(player_session)
            if current and app_module._is_live_match(current):
                raise BattleV2Error("Player is already in an active match.")
            previous_code = app_module.waiting_code_by_player.get(player_session)
            if previous_code:
                app_module.remove_v2_pvp_lobby_player(previous_code, player_session)
            players = [
                {"id": player_session, "name": player_name, "team": player_team},
                {"id": app_module.CPU_V2_PLAYER_ID, "name": "CPU V2", "team": enemy_team},
            ]
            app_module.start_battle_v2_match_for_mode(room_id, players, roster_mode, difficulty=difficulty)
            app_module.active_match_by_player[player_session] = room_id
            app_module.match_players[room_id] = players
            app_module.match_roster_mode[room_id] = roster_mode
            if requested_code != room_id and requested_code not in app_module.battle_v2_manager.rooms:
                app_module.battle_v2_manager.room_aliases[requested_code] = room_id
        app_module.authorize_match_context(room_id, player_session)
        app_module.issue_battle_v2_resume_sessions(room_id)
        if roster_mode == "first_creation":
            app_module.remember_first_creation_team(player_session, player_team)
        app_module.emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_error(exc)


@app_module.socketio.on("battle_v2_join_pvp")
def on_battle_v2_join_pvp(data=None):
    if not app_module.allow_event("battle_v2_join_pvp", limit=10, window_seconds=10):
        return
    data = data or {}
    context = app_module.active_v2_context(data, require_membership=False)
    if not context:
        return
    requested_code = clean_room_id(data.get("room_id"))
    _, player_session = context
    room_id = requested_code
    player_name = clean_player_name(data.get("player_name", ""), f"Player_{player_session[:4]}")
    roster_mode = app_module.battle_v2_roster_mode(data)
    player_team = clean_v2_team(data.get("player_team") or data.get("team"), app_module.battle_v2_default_team(roster_mode))
    try:
        with app_module.lifecycle_lock:
            if not app_module.accepting_new_matches:
                raise BattleV2Error(app_module.NEW_MATCHES_DRAINED_MESSAGE)
            app_module.prune_context_indexes()
            active_match_id = app_module.active_match_by_player.get(player_session)
            if active_match_id and app_module._is_live_match(active_match_id):
                if app_module.lobby_code_by_match.get(active_match_id) == room_id:
                    app_module.emit_battle_v2_update(active_match_id, player_session)
                    return
                raise BattleV2Error("Player is already in an active match.")
            bound_match = app_module.active_by_code.get(room_id)
            if bound_match and app_module._is_live_match(bound_match):
                raise BattleV2Error("Lobby code is currently in use by an active match.")
            if bound_match:
                app_module.active_by_code.pop(room_id, None)

            previous_code = app_module.waiting_code_by_player.get(player_session)
            if previous_code and previous_code != room_id:
                app_module.remove_v2_pvp_lobby_player(previous_code, player_session)
                leave_room(lobby_room(previous_code))

            entry = {"id": player_session, "name": player_name, "team": player_team, "roster_mode": roster_mode}
            lobby = [item for item in app_module.v2_pvp_lobbies.get(room_id, []) if item["id"] != player_session]
            if not lobby:
                app_module.v2_pvp_lobbies[room_id] = [entry]
                app_module.waiting_code_by_player[player_session] = room_id
                app_module.lobby_last_activity[room_id] = time.monotonic()
                join_room(lobby_room(room_id))
                join_room(player_room(player_session))
                if roster_mode == "first_creation":
                    app_module.remember_first_creation_team(player_session, player_team)
                players = app_module.v2_pvp_lobbies[room_id]
            else:
                waiting = lobby[0]
                if waiting.get("roster_mode", "classic") != roster_mode:
                    app_module.socketio.emit(
                        "battle_v2_lobby",
                        {
                            "room_id": room_id,
                            "status": "join_failed",
                            "message": "An incompatible opponent tried to join; your lobby is still waiting.",
                            "players": [{"id": waiting["id"], "name": waiting["name"]}],
                        },
                        room=player_room(waiting["id"]),
                    )
                    raise BattleV2Error("Both PvP players must use the same roster mode.")
                if app_module._is_live_match(app_module.active_match_by_player.get(waiting["id"])):
                    raise BattleV2Error("Waiting player is already active elsewhere.")
                match_id = new_match_id()
                players = [waiting, entry]
                # Match creation is the commit point; the lobby remains intact on failure.
                app_module.start_battle_v2_match_for_mode(match_id, players, roster_mode)
                for item in players:
                    app_module.active_match_by_player[item["id"]] = match_id
                    app_module.waiting_code_by_player.pop(item["id"], None)
                app_module.active_by_code[room_id] = match_id
                app_module.lobby_code_by_match[match_id] = room_id
                app_module.match_players[match_id] = [dict(item) for item in players]
                app_module.match_roster_mode[match_id] = roster_mode
                app_module.v2_pvp_lobbies.pop(room_id, None)
                app_module.lobby_last_activity.pop(room_id, None)
                if room_id != match_id and room_id not in app_module.battle_v2_manager.rooms:
                    app_module.battle_v2_manager.room_aliases[room_id] = match_id
                session["room_id"] = match_id
                session["match_id"] = match_id

        if len(players) < 2:
            emit(
                "battle_v2_lobby",
                {
                    "room_id": room_id,
                    "status": "waiting",
                    "players": [{"id": item["id"], "name": item["name"]} for item in players],
                },
                room=player_room(player_session),
            )
            return
        app_module.authorize_match_context(match_id, player_session)
        # The second joiner's socket is not in its private player room until
        # authorization completes. Issue resume grants only after that join,
        # otherwise the second player receives battle state but silently
        # misses the credential required for reconnect.
        app_module.issue_battle_v2_resume_sessions(match_id)
        app_module.emit_battle_v2_update(match_id, player_session)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_error(exc)


@app_module.socketio.on("battle_v2_resume")
def on_battle_v2_resume(data=None):
    if not app_module.allow_event("battle_v2_resume", limit=10, window_seconds=10):
        return
    data = data or {}
    room_id = clean_room_id(data.get("room_id"))
    player_id = CONTROL_RE.sub("", str(data.get("player_id", "")).strip())[:64]
    token = clean_resume_token(data.get("resume_token"))
    state = app_module.battle_v2_manager.rooms.get(room_id)
    if state is None or player_id not in state.players or player_id == app_module.CPU_V2_PLAYER_ID:
        emit("battle_v2_resume_rejected", {"message": "Battle session could not be resumed."})
        return
    # Reserve the credential before attempting the authoritative reconnect,
    # but do not rotate it yet. Reserving blocks a second concurrent replay
    # from also passing verification (atomic protection against concurrent
    # resume), while leaving the token itself untouched until the reconnect
    # is proven to succeed. A premature resume -- the original socket is
    # still connected, so `reconnect_player` rejects it -- or any other
    # failure aborts the reservation instead of rotating, so the current
    # token remains valid for a later, real resume.
    if not app_module.battle_v2_sessions.reserve(room_id, player_id, token):
        emit("battle_v2_resume_rejected", {"message": "Battle session could not be resumed."})
        return
    try:
        app_module.battle_v2_manager.reconnect_player(room_id, player_id)
        app_module.battle_v2_manager.serialize_for_player(room_id, player_id)
    except BattleV2Error:
        app_module.battle_v2_sessions.abort(room_id, player_id)
        emit("battle_v2_resume_rejected", {"message": "Battle session could not be resumed."})
        return
    except (KeyError, RuntimeError):
        # ponytail: these two used to be swallowed alongside BattleV2Error, making a
        # real internal bug indistinguishable from an ordinary bad-token rejection.
        app_module.operational_counters["resume_unexpected_errors"] += 1
        app_module.battle_v2_sessions.abort(room_id, player_id)
        emit("battle_v2_resume_rejected", {"message": "Battle session could not be resumed."})
        return
    # Only commit (rotate) the credential once reconnect and serialization
    # are both proven to succeed, then admit this socket to the private
    # rooms as the sole holder of the new token.
    grant = app_module.battle_v2_sessions.commit(room_id, player_id, token)
    if grant is None:
        emit("battle_v2_resume_rejected", {"message": "Battle session could not be resumed."})
        return
    join_room(match_room(room_id))
    join_room(player_room(player_id))
    with app_module.lifecycle_lock:
        app_module.active_match_by_player[player_id] = room_id
        app_module.waiting_code_by_player.pop(player_id, None)
    session["player_id"] = player_id
    session["room_id"] = room_id
    session["match_id"] = room_id
    emit(
        "battle_v2_session",
        {"room_id": room_id, "player_id": player_id, "resume_token": grant.token},
        room=player_room(player_id),
    )
    app_module.battle_v2_timer_scheduler.arm(room_id)
    app_module.emit_battle_v2_update(room_id, player_id)


@app_module.socketio.on("battle_v2_leave_pvp")
def on_battle_v2_leave_pvp(data=None):
    if not app_module.allow_event("battle_v2_leave_pvp", limit=20, window_seconds=10):
        return
    data = data or {}
    context = app_module.active_v2_context(data, require_membership=False)
    if not context:
        return
    room_id, player_session = context
    with app_module.lifecycle_lock:
        app_module.acknowledge_finished_match(room_id, player_session)
        kept = app_module.remove_v2_pvp_lobby_player(room_id, player_session)
    emit(
        "battle_v2_lobby",
        {
            "room_id": room_id,
            "status": "cancelled",
            "players": [{"id": entry["id"], "name": entry["name"]} for entry in kept],
        },
        room=player_room(player_session),
    )


@app_module.socketio.on("battle_v2_ack_result")
def on_battle_v2_ack_result(data=None):
    if not app_module.allow_event("battle_v2_ack_result", limit=20, window_seconds=10):
        return
    data = data or {}
    player_id = session.get("player_id")
    match_id = clean_room_id(data.get("match_id")) or session.get("match_id")
    if not player_id or not match_id:
        return
    with app_module.lifecycle_lock:
        app_module.acknowledge_finished_match(match_id, player_id)


@app_module.socketio.on("battle_v2_rematch")
def on_battle_v2_rematch(data=None):
    if not app_module.allow_event("battle_v2_rematch", limit=6, window_seconds=10):
        return
    data = data or {}
    player_id = session.get("player_id")
    old_match_id = clean_room_id(data.get("old_match_id")) or session.get("match_id")
    nonce = CONTROL_RE.sub("", str(data.get("client_action_nonce", "")).strip())[:64]
    try:
        revision = int(data.get("state_revision"))
    except (TypeError, ValueError):
        app_module.emit_battle_v2_error(BattleV2Error("state_revision must be a non-negative integer"))
        return
    try:
        with app_module.lifecycle_lock:
            old_state = app_module.battle_v2_manager.rooms.get(old_match_id)
            if not player_id or old_state is None or player_id not in old_state.players:
                raise BattleV2Error("Unknown completed match.")
            if old_state.phase.value != "finished":
                raise BattleV2Error("Rematch is available only after a terminal result.")
            if revision != old_state.state_revision:
                raise BattleV2Error(f"stale state revision: expected {old_state.state_revision}, got {revision}")
            if not nonce:
                raise BattleV2Error("client_action_nonce is required")
            receipt = app_module.rematch_receipts.setdefault(old_match_id, {}).get(nonce)
            if receipt and receipt[0] != revision:
                raise BattleV2Error("client_action_nonce was already used for a different rematch request")
            new_id = app_module.rematch_by_old_match.get(old_match_id)
            if new_id is None:
                if not app_module.accepting_new_matches:
                    raise BattleV2Error(app_module.NEW_MATCHES_DRAINED_MESSAGE)
                players = [dict(entry) for entry in app_module.match_players.get(old_match_id, [])]
                if len(players) != 2:
                    raise BattleV2Error("Original match configuration is unavailable.")
                for entry in players:
                    if entry["id"] == app_module.CPU_V2_PLAYER_ID:
                        continue
                    other_match = app_module.active_match_by_player.get(entry["id"])
                    if other_match and other_match != old_match_id and app_module._is_live_match(other_match):
                        raise BattleV2Error(
                            "A rematch participant is already in another active match."
                        )
                new_id = new_match_id()
                mode = app_module.match_roster_mode.get(old_match_id, "classic")
                difficulty = app_module.battle_v2_manager.room_cpu_difficulty.get(old_match_id, "normal")
                app_module.start_battle_v2_match_for_mode(new_id, players, mode, difficulty=difficulty)
                app_module.rematch_by_old_match[old_match_id] = new_id
                app_module.match_players[new_id] = players
                app_module.match_roster_mode[new_id] = mode
                for entry in players:
                    if entry["id"] != app_module.CPU_V2_PLAYER_ID:
                        app_module.active_match_by_player[entry["id"]] = new_id
                app_module.issue_battle_v2_resume_sessions(new_id)
            app_module.rematch_receipts.setdefault(old_match_id, {})[nonce] = (revision, new_id)
            session["room_id"] = new_id
            session["match_id"] = new_id
            join_room(match_room(new_id))
            join_room(player_room(player_id))
        emit("battle_v2_rematch", {"old_match_id": old_match_id, "new_match_id": new_id}, room=player_room(player_id))
        app_module.emit_battle_v2_update(new_id, player_id)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_error(exc)


@app_module.socketio.on("battle_v2_submit_plan")
def on_battle_v2_submit_plan(data=None):
    if not app_module.allow_event("battle_v2_submit_plan", limit=45, window_seconds=5):
        return
    data = data or {}
    context = app_module.active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        app_module.execute_v2_player_command(
            room_id,
            player_session,
            "submit_plan",
            data,
            {"actions": clean_v2_actions(data.get("actions", []))},
        )
        app_module.emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_command_error(exc, room_id, player_session)


@app_module.socketio.on("battle_v2_update_queue")
def on_battle_v2_update_queue(data=None):
    if not app_module.allow_event("battle_v2_update_queue", limit=45, window_seconds=5):
        return
    data = data or {}
    context = app_module.active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        app_module.execute_v2_player_command(
            room_id,
            player_session,
            "update_queue",
            data,
            {
                "queue_order": clean_v2_queue_order(data.get("queue_order", [])),
                "wildcard_pays": clean_v2_wildcard_pays(data.get("wildcard_pays", {})),
            },
        )
        app_module.emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_command_error(exc, room_id, player_session)


@app_module.socketio.on("battle_v2_confirm_queue")
def on_battle_v2_confirm_queue(data=None):
    if not app_module.allow_event("battle_v2_confirm_queue", limit=45, window_seconds=5):
        return
    data = data or {}
    context = app_module.active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        replayed = app_module.execute_v2_player_command(room_id, player_session, "confirm_queue", data)
        if not replayed and app_module.battle_v2_has_cpu(room_id):
            app_module.run_battle_v2_cpu_turns(room_id)
        app_module.emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_command_error(exc, room_id, player_session)


@app_module.socketio.on("battle_v2_cancel_queue")
def on_battle_v2_cancel_queue(data=None):
    if not app_module.allow_event("battle_v2_cancel_queue", limit=45, window_seconds=5):
        return
    data = data or {}
    context = app_module.active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        app_module.execute_v2_player_command(room_id, player_session, "cancel_queue", data)
        app_module.emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_command_error(exc, room_id, player_session)


@app_module.socketio.on("battle_v2_convert_energy")
def on_battle_v2_convert_energy(data=None):
    if not app_module.allow_event("battle_v2_convert_energy", limit=20, window_seconds=5):
        return
    data = data or {}
    context = app_module.active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        app_module.execute_v2_player_command(
            room_id,
            player_session,
            "convert_energy",
            data,
            {
                "sources": clean_v2_energy_colors(data.get("sources")),
                "target": clean_v2_energy_color(data.get("target")),
            },
        )
        app_module.emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_command_error(exc, room_id, player_session)


@app_module.socketio.on("battle_v2_end_turn")
def on_battle_v2_end_turn(data=None):
    if not app_module.allow_event("battle_v2_end_turn", limit=45, window_seconds=5):
        return
    data = data or {}
    context = app_module.active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        replayed = app_module.execute_v2_player_command(room_id, player_session, "end_turn", data)
        if not replayed and app_module.battle_v2_has_cpu(room_id):
            app_module.run_battle_v2_cpu_turns(room_id)
        app_module.emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_command_error(exc, room_id, player_session)


@app_module.socketio.on("battle_v2_surrender")
def on_battle_v2_surrender(data=None):
    if not app_module.allow_event("battle_v2_surrender"):
        return
    data = data or {}
    context = app_module.active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        app_module.execute_v2_player_command(room_id, player_session, "surrender", data)
        app_module.emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        app_module.emit_battle_v2_command_error(exc, room_id, player_session)


@app_module.socketio.on("disconnect")
def on_disconnect():
    player_session = session.get("player_id")
    if not player_session:
        return
    with app_module.lifecycle_lock:
        waiting_code = app_module.waiting_code_by_player.get(player_session)
        if waiting_code:
            app_module.remove_v2_pvp_lobby_player(waiting_code, player_session)
    room_id = app_module.active_match_by_player.get(player_session) or session.get("match_id")
    if room_id and room_id in app_module.battle_v2_manager.rooms:
        app_module.battle_v2_manager.disconnect_player(room_id, player_session)
        app_module.battle_v2_timer_scheduler.arm(room_id)
        app_module.emit_battle_v2_update(room_id)
