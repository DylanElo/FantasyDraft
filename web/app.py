"""Flask + SocketIO bridge for the Battle v2 JJK Fantasy Draft app."""

from __future__ import annotations

import os
import re
import secrets
import sys
import time
import uuid
from collections import defaultdict, deque

from flask import Flask, abort, jsonify, redirect, render_template, session
from flask_socketio import SocketIO, emit, join_room

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jjk_arena.battle_v2.first_creation_profile import (
    first_creation_profile_payload,
    load_first_creation_profile,
    merge_first_creation_progress,
    save_first_creation_profile,
)
from jjk_arena.battle_v2.manager import BattleV2Error, BattleV2Manager, battle_v2_enabled, skill_catalog
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_PRESETS, first_creation_payload
from jjk_arena.battle_v2.sessions import BattleSessionRegistry
from jjk_arena.battle_v2.timer_scheduler import PhaseTimerScheduler


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


DEBUG_MODE = env_flag("JJK_DEBUG", False)
HOST = os.getenv("JJK_HOST", "127.0.0.1")
PORT = int(os.getenv("JJK_PORT", "5000"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("JJK_CORS_ORIGINS", "http://127.0.0.1:5000,http://localhost:5000").split(",")
    if origin.strip()
]

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY") or secrets.token_hex(32)
socketio = SocketIO(app, cors_allowed_origins=CORS_ORIGINS)

battle_v2_manager = BattleV2Manager()
battle_v2_sessions = BattleSessionRegistry()
v2_pvp_lobbies: dict[str, list[dict]] = {}
rate_limits = defaultdict(deque)
CPU_V2_PLAYER_ID = "__cpu_v2__"


def _timer_deadline(room_id: str) -> float | None:
    state = battle_v2_manager.rooms.get(room_id)
    return state.phase_deadline if state is not None else None


def _expire_timer_room(room_id: str) -> bool:
    if room_id not in battle_v2_manager.rooms:
        return False
    return battle_v2_manager.expire_phase_if_needed(room_id)


battle_v2_timer_scheduler = PhaseTimerScheduler(
    get_deadline=_timer_deadline,
    expire=_expire_timer_room,
    on_expired=lambda room_id: handle_battle_v2_timeout(room_id),
    clock=lambda: battle_v2_manager.clock(),
    start_task=socketio.start_background_task,
    sleep=socketio.sleep,
)

ROOM_RE = re.compile(r"[^a-zA-Z0-9_-]+")
CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]+")
RESUME_TOKEN_RE = re.compile(r"[^a-zA-Z0-9_-]+")


def clean_room_id(value) -> str:
    room_id = ROOM_RE.sub("", str(value or "lobby").strip())[:32]
    return room_id or "lobby"


def clean_player_name(value, fallback: str) -> str:
    name = CONTROL_RE.sub("", str(value or "").strip())[:24]
    return name or fallback


def clean_skill_name(value) -> str:
    return CONTROL_RE.sub("", str(value or "").strip())[:80]


def clean_v2_team(value, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return list(fallback)
    team = [CONTROL_RE.sub("", str(name).strip())[:80] for name in value[:3] if str(name).strip()]
    return team if len(team) == 3 else list(fallback)


def battle_v2_roster_mode(data: dict) -> str:
    mode = CONTROL_RE.sub("", str(data.get("roster_mode", "classic")).strip().lower())[:32]
    return "first_creation" if mode == "first_creation" else "classic"


def battle_v2_default_team(mode: str, preset: str = "story_tutorial") -> list[str]:
    if mode == "first_creation":
        team = FIRST_CREATION_PRESETS.get(preset) or FIRST_CREATION_PRESETS["story_tutorial"]
        return list(team)
    return ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]


def battle_v2_default_enemy_team(mode: str) -> list[str]:
    if mode == "first_creation":
        return list(FIRST_CREATION_PRESETS["jjk0_beginner_special"])
    return ["satoru_gojo", "ryomen_sukuna", "mahito"]


def first_creation_payload_for_player(player_id: str | None) -> dict:
    payload = first_creation_payload()
    profile = load_first_creation_profile(player_id) if player_id else {}
    payload["profile"] = first_creation_profile_payload(profile)
    return payload


def remember_first_creation_team(player_id: str, team: list[str]) -> None:
    profile = load_first_creation_profile(player_id)
    profile["selected_starter_team"] = list(team[:3])
    save_first_creation_profile(player_id, profile)


def start_battle_v2_match_for_mode(room_id: str, players: list[dict], mode: str) -> dict:
    if mode == "first_creation":
        payload = battle_v2_manager.start_first_creation_match(room_id, players)
    else:
        payload = battle_v2_manager.start_classic_match(room_id, players)
    battle_v2_timer_scheduler.arm(room_id)
    return payload


def clamp_int(value, minimum: int, maximum: int, default: int = 0) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def clean_v2_actions(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    actions = []
    for raw in value[:3]:
        if not isinstance(raw, dict):
            continue
        action = {
            "id": CONTROL_RE.sub("", str(raw.get("id", "")).strip())[:64],
            "caster_slot": clamp_int(raw.get("caster_slot", 0), 0, 2),
            "skill_id": clean_skill_name(raw.get("skill_id", "")),
            "target_player_id": CONTROL_RE.sub("", str(raw.get("target_player_id", "")).strip())[:64],
            "target_slot": None if raw.get("target_slot") is None else clamp_int(raw.get("target_slot", 0), 0, 2),
            "target_slots": [
                clamp_int(slot, 0, 2)
                for slot in raw.get("target_slots", [])[:3]
            ] if isinstance(raw.get("target_slots", []), list) else [],
            "secondary_target_slot": None if raw.get("secondary_target_slot") is None else clamp_int(raw.get("secondary_target_slot"), 0, 2),
            "alternate_target_player_id": None if raw.get("alternate_target_player_id") is None else CONTROL_RE.sub("", str(raw.get("alternate_target_player_id", "")).strip())[:64],
            "alternate_target_slot": None if raw.get("alternate_target_slot") is None else clamp_int(raw.get("alternate_target_slot"), 0, 2),
            "wildcard_pays": [
                CONTROL_RE.sub("", str(energy).strip().lower())[:8]
                for energy in raw.get("wildcard_pays", [])[:3]
            ] if isinstance(raw.get("wildcard_pays", []), list) else [],
            "queue_index": clamp_int(raw.get("queue_index", len(actions)), 0, 2, default=len(actions)),
        }
        actions.append(action)
    return actions


def clean_v2_queue_order(value) -> list[str]:
    if not isinstance(value, list):
        return []
    return [CONTROL_RE.sub("", str(action_id).strip())[:64] for action_id in value[:3]]


def clean_v2_wildcard_pays(value) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        return {}
    cleaned = {}
    for action_id, pays in value.items():
        clean_id = CONTROL_RE.sub("", str(action_id).strip())[:64]
        if not clean_id or not isinstance(pays, list):
            continue
        cleaned[clean_id] = [
            CONTROL_RE.sub("", str(energy).strip().lower())[:8]
            for energy in pays[:3]
        ]
    return cleaned


def clean_v2_energy_color(value) -> str:
    return CONTROL_RE.sub("", str(value or "").strip().lower())[:8]


def clean_resume_token(value) -> str:
    return RESUME_TOKEN_RE.sub("", str(value or "").strip())[:128]


def clean_v2_command_metadata(data: dict) -> tuple[int, str]:
    if "state_revision" not in data:
        raise BattleV2Error("state_revision is required")
    if isinstance(data["state_revision"], bool):
        raise BattleV2Error("state_revision must be a non-negative integer")
    try:
        state_revision = int(data["state_revision"])
    except (TypeError, ValueError) as exc:
        raise BattleV2Error("state_revision must be a non-negative integer") from exc
    if state_revision < 0:
        raise BattleV2Error("state_revision must be a non-negative integer")
    nonce = CONTROL_RE.sub("", str(data.get("client_action_nonce", "")).strip())[:64]
    if not nonce:
        raise BattleV2Error("client_action_nonce is required")
    return state_revision, nonce


def execute_v2_player_command(
    room_id: str,
    player_id: str,
    command: str,
    data: dict,
    payload: dict | None = None,
) -> bool:
    state_revision, nonce = clean_v2_command_metadata(data)
    replayed = battle_v2_manager.execute_player_command(
        room_id,
        player_id,
        command,
        state_revision,
        nonce,
        payload or {},
    )
    battle_v2_timer_scheduler.arm(room_id)
    return replayed


def active_v2_context(data=None):
    if not battle_v2_enabled():
        emit("battle_v2_error", {"message": "Battle v2 is disabled. Set JJK_BATTLE_SYSTEM=v2."})
        return None
    data = data or {}
    player_session = session.get("player_id")
    if not player_session:
        player_session = str(uuid.uuid4())
        session["player_id"] = player_session
    requested_room_id = clean_room_id(data["room_id"]) if data.get("room_id") else None
    room_id = requested_room_id or session.get("room_id") or "classic-v2"
    session["room_id"] = room_id
    join_room(room_id)
    join_room(player_session)
    return room_id, player_session


def emit_battle_v2_update(room_id: str, viewer_id: str | None = None):
    state = battle_v2_manager.get_state(room_id)
    viewer_ids = [player_id for player_id in state.players if player_id != CPU_V2_PLAYER_ID]
    if viewer_id and viewer_id not in viewer_ids and viewer_id in state.players:
        viewer_ids.append(viewer_id)
    if not viewer_ids and viewer_id:
        viewer_ids = [viewer_id]
    for target_viewer_id in viewer_ids:
        payload = battle_v2_manager.serialize_for_player(room_id, target_viewer_id)
        if payload.get("roster_mode") == "first_creation":
            profile = (
                merge_first_creation_progress(target_viewer_id, payload.get("first_creation_progress"))
                if payload.get("winner_id")
                else load_first_creation_profile(target_viewer_id)
            )
            payload["first_creation_account"] = first_creation_profile_payload(profile)
        socketio.emit("battle_v2_update", payload, room=target_viewer_id)
        if payload.get("winner_id"):
            socketio.emit("battle_v2_finished", {"winner_id": payload["winner_id"]}, room=target_viewer_id)


def emit_battle_v2_error(exc: Exception):
    emit("battle_v2_error", {"message": str(exc)})


def issue_battle_v2_resume_sessions(room_id: str) -> None:
    state = battle_v2_manager.get_state(room_id)
    for player_id in state.players:
        if player_id == CPU_V2_PLAYER_ID:
            continue
        grant = battle_v2_sessions.issue(room_id, player_id)
        socketio.emit(
            "battle_v2_session",
            {"room_id": room_id, "player_id": player_id, "resume_token": grant.token},
            room=player_id,
        )


def run_battle_v2_cpu_turns(room_id: str):
    for _ in range(6):
        state = battle_v2_manager.get_state(room_id)
        if state.winner_id or state.turn_player_id != CPU_V2_PLAYER_ID:
            return
        battle_v2_manager.take_cpu_turn(room_id, CPU_V2_PLAYER_ID)
        battle_v2_manager.advance_state_revision(room_id)
        battle_v2_timer_scheduler.arm(room_id)


def handle_battle_v2_timeout(room_id: str) -> None:
    """Continue automatic CPU play and broadcast a background timeout result."""

    if room_id not in battle_v2_manager.rooms:
        return
    if battle_v2_has_cpu(room_id):
        run_battle_v2_cpu_turns(room_id)
    emit_battle_v2_update(room_id)


def battle_v2_has_cpu(room_id: str) -> bool:
    try:
        state = battle_v2_manager.get_state(room_id)
    except BattleV2Error:
        return False
    return CPU_V2_PLAYER_ID in state.players


def remove_battle_v2_room(room_id: str) -> None:
    """Cancel timer work and remove room-owned authoritative runtime state."""

    battle_v2_timer_scheduler.cancel(room_id)
    lock = battle_v2_manager.room_locks.get(room_id)

    def remove_state() -> None:
        battle_v2_manager.rooms.pop(room_id, None)
        battle_v2_manager.rngs.pop(room_id, None)
        battle_v2_manager.command_receipts.pop(room_id, None)
        battle_v2_manager.room_rosters.pop(room_id, None)
        battle_v2_manager.room_skill_maps.pop(room_id, None)
        battle_v2_manager.room_catalogs.pop(room_id, None)
        battle_v2_manager.room_roster_modes.pop(room_id, None)
        battle_v2_manager.room_first_creation_progress.pop(room_id, None)
        battle_v2_sessions.remove_room(room_id)

    if lock is None:
        remove_state()
    else:
        with lock:
            remove_state()
        battle_v2_manager.room_locks.pop(room_id, None)


def remove_v2_pvp_lobby_player(room_id: str, player_session: str) -> list[dict]:
    lobby = v2_pvp_lobbies.get(room_id, [])
    kept = [entry for entry in lobby if entry["id"] != player_session]
    if kept:
        v2_pvp_lobbies[room_id] = kept
    else:
        v2_pvp_lobbies.pop(room_id, None)
    return kept


def allow_event(event_name: str, limit: int = 30, window_seconds: int = 5) -> bool:
    player_session = session.get("player_id", "anonymous")
    now = time.monotonic()
    key = (player_session, event_name)
    hits = rate_limits[key]
    while hits and now - hits[0] > window_seconds:
        hits.popleft()
    if len(hits) >= limit:
        emit("message", {"text": "Too many actions. Slow down for a moment."})
        return False
    hits.append(now)
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


@app.route("/reset/<room_id>")
def reset_room(room_id):
    if not DEBUG_MODE:
        abort(404)
    room_id = clean_room_id(room_id)
    remove_battle_v2_room(room_id)
    v2_pvp_lobbies.pop(room_id, None)
    return f"Room '{room_id}' purged."


@app.route("/new-session")
def new_session():
    session.clear()
    return redirect("/")


@app.route("/debug-state")
def debug_state():
    if not DEBUG_MODE:
        abort(404)
    room_id = session.get("room_id", "lobby")
    player_id = session.get("player_id", "NONE")
    state = None
    if room_id in battle_v2_manager.rooms:
        state = battle_v2_manager.serialize_for_player(room_id, player_id)
    return jsonify({"my_player_id": player_id, "room_id": room_id, "battle_v2_state": state})


@socketio.on("battle_v2_start_classic")
def on_battle_v2_start_classic(data=None):
    if not allow_event("battle_v2_start_classic", limit=10, window_seconds=10):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    player_name = clean_player_name(data.get("player_name", ""), f"Player_{player_session[:4]}")
    roster_mode = battle_v2_roster_mode(data)
    player_team = clean_v2_team(data.get("player_team") or data.get("team"), battle_v2_default_team(roster_mode))
    enemy_team = clean_v2_team(data.get("enemy_team"), battle_v2_default_enemy_team(roster_mode))
    try:
        start_battle_v2_match_for_mode(
            room_id,
            [
                {"id": player_session, "name": player_name, "team": player_team},
                {"id": CPU_V2_PLAYER_ID, "name": "CPU V2", "team": enemy_team},
            ],
            roster_mode,
        )
        issue_battle_v2_resume_sessions(room_id)
        if roster_mode == "first_creation":
            remember_first_creation_team(player_session, player_team)
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on("battle_v2_join_pvp")
def on_battle_v2_join_pvp(data=None):
    if not allow_event("battle_v2_join_pvp", limit=10, window_seconds=10):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    player_name = clean_player_name(data.get("player_name", ""), f"Player_{player_session[:4]}")
    roster_mode = battle_v2_roster_mode(data)
    player_team = clean_v2_team(data.get("player_team") or data.get("team"), battle_v2_default_team(roster_mode))
    try:
        existing_state = battle_v2_manager.rooms.get(room_id)
        if existing_state:
            if player_session not in existing_state.players:
                raise BattleV2Error("Battle v2 room already started.")
            emit_battle_v2_update(room_id, player_session)
            return

        lobby = v2_pvp_lobbies.setdefault(room_id, [])
        lobby = [entry for entry in lobby if entry["id"] != player_session]
        lobby.append({"id": player_session, "name": player_name, "team": player_team, "roster_mode": roster_mode})
        if roster_mode == "first_creation":
            remember_first_creation_team(player_session, player_team)
        v2_pvp_lobbies[room_id] = lobby[:2]

        if len(v2_pvp_lobbies[room_id]) < 2:
            emit(
                "battle_v2_lobby",
                {
                    "room_id": room_id,
                    "status": "waiting",
                    "players": [{"id": entry["id"], "name": entry["name"]} for entry in v2_pvp_lobbies[room_id]],
                },
                room=player_session,
            )
            return

        players = v2_pvp_lobbies.pop(room_id)
        modes = {entry.get("roster_mode", "classic") for entry in players}
        if len(modes) != 1:
            raise BattleV2Error("Both PvP players must use the same roster mode.")
        start_battle_v2_match_for_mode(room_id, players, modes.pop())
        issue_battle_v2_resume_sessions(room_id)
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on("battle_v2_resume")
def on_battle_v2_resume(data=None):
    if not allow_event("battle_v2_resume", limit=10, window_seconds=10):
        return
    data = data or {}
    room_id = clean_room_id(data.get("room_id"))
    player_id = CONTROL_RE.sub("", str(data.get("player_id", "")).strip())[:64]
    token = clean_resume_token(data.get("resume_token"))
    state = battle_v2_manager.rooms.get(room_id)
    grant = (
        battle_v2_sessions.resume(room_id, player_id, token)
        if state is not None and player_id in state.players and player_id != CPU_V2_PLAYER_ID
        else None
    )
    if grant is None:
        emit("battle_v2_resume_rejected", {"message": "Battle session could not be resumed."})
        return
    session["player_id"] = player_id
    session["room_id"] = room_id
    join_room(room_id)
    join_room(player_id)
    emit(
        "battle_v2_session",
        {"room_id": room_id, "player_id": player_id, "resume_token": grant.token},
        room=player_id,
    )
    battle_v2_timer_scheduler.arm(room_id)
    emit_battle_v2_update(room_id, player_id)


@socketio.on("battle_v2_leave_pvp")
def on_battle_v2_leave_pvp(data=None):
    if not allow_event("battle_v2_leave_pvp", limit=20, window_seconds=10):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    kept = remove_v2_pvp_lobby_player(room_id, player_session)
    emit(
        "battle_v2_lobby",
        {
            "room_id": room_id,
            "status": "cancelled",
            "players": [{"id": entry["id"], "name": entry["name"]} for entry in kept],
        },
        room=player_session,
    )


@socketio.on("battle_v2_submit_plan")
def on_battle_v2_submit_plan(data=None):
    if not allow_event("battle_v2_submit_plan", limit=45, window_seconds=5):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        execute_v2_player_command(
            room_id,
            player_session,
            "submit_plan",
            data,
            {"actions": clean_v2_actions(data.get("actions", []))},
        )
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on("battle_v2_update_queue")
def on_battle_v2_update_queue(data=None):
    if not allow_event("battle_v2_update_queue", limit=45, window_seconds=5):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        execute_v2_player_command(
            room_id,
            player_session,
            "update_queue",
            data,
            {
                "queue_order": clean_v2_queue_order(data.get("queue_order", [])),
                "wildcard_pays": clean_v2_wildcard_pays(data.get("wildcard_pays", {})),
            },
        )
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on("battle_v2_confirm_queue")
def on_battle_v2_confirm_queue(data=None):
    if not allow_event("battle_v2_confirm_queue", limit=45, window_seconds=5):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        replayed = execute_v2_player_command(room_id, player_session, "confirm_queue", data)
        if not replayed and battle_v2_has_cpu(room_id):
            run_battle_v2_cpu_turns(room_id)
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on("battle_v2_cancel_queue")
def on_battle_v2_cancel_queue(data=None):
    if not allow_event("battle_v2_cancel_queue", limit=45, window_seconds=5):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        execute_v2_player_command(room_id, player_session, "cancel_queue", data)
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on("battle_v2_convert_energy")
def on_battle_v2_convert_energy(data=None):
    if not allow_event("battle_v2_convert_energy", limit=20, window_seconds=5):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        execute_v2_player_command(
            room_id,
            player_session,
            "convert_energy",
            data,
            {
                "source": clean_v2_energy_color(data.get("source")),
                "target": clean_v2_energy_color(data.get("target")),
            },
        )
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on("battle_v2_end_turn")
def on_battle_v2_end_turn(data=None):
    if not allow_event("battle_v2_end_turn", limit=45, window_seconds=5):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        replayed = execute_v2_player_command(room_id, player_session, "end_turn", data)
        if not replayed and battle_v2_has_cpu(room_id):
            run_battle_v2_cpu_turns(room_id)
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on("battle_v2_surrender")
def on_battle_v2_surrender(data=None):
    if not allow_event("battle_v2_surrender"):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        execute_v2_player_command(room_id, player_session, "surrender", data)
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on("reset_room")
def on_reset_room():
    room_id = session.get("room_id")
    if not room_id:
        return
    remove_battle_v2_room(room_id)
    v2_pvp_lobbies.pop(room_id, None)
    session.pop("room_id", None)
    emit("room_reset", {}, room=room_id)


@socketio.on("disconnect")
def on_disconnect():
    room_id = session.get("room_id")
    player_session = session.get("player_id")
    if room_id and player_session:
        remove_v2_pvp_lobby_player(room_id, player_session)


if __name__ == "__main__":
    socketio.run(
        app,
        debug=DEBUG_MODE,
        host=HOST,
        port=PORT,
        allow_unsafe_werkzeug=DEBUG_MODE,
    )
