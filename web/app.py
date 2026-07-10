"""Flask + SocketIO bridge for the Battle v2 JJK Fantasy Draft app."""

from __future__ import annotations

import os
import re
import secrets
import sys
import time
import uuid
from collections import defaultdict, deque
from threading import RLock

from flask import Flask, abort, jsonify, redirect, render_template, request, session
from flask_socketio import SocketIO, emit, join_room, leave_room

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jjk_arena.battle_v2.first_creation_profile import (
    first_creation_profile_payload,
    load_first_creation_profile,
    merge_first_creation_progress,
    save_first_creation_profile,
    update_first_creation_profile,
)
from jjk_arena.battle_v2.manager import BattleV2Error, BattleV2Manager, battle_v2_enabled, skill_catalog
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_PRESETS, first_creation_payload
from jjk_arena.battle_v2.sessions import BattleSessionRegistry
from jjk_arena.battle_v2.timer_scheduler import PhaseTimerScheduler
from jjk_arena.battle_v2.runtime_store import SQLiteRuntimeStore


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


DEBUG_MODE = env_flag("JJK_DEBUG", False)
PRODUCTION_MODE = env_flag("JJK_PRODUCTION", False)
HOST = os.getenv("JJK_HOST", "127.0.0.1")
PORT = int(os.getenv("JJK_PORT", os.getenv("PORT", "5000")))
WEB_WORKERS = max(1, int(os.getenv("JJK_WEB_WORKERS", "1")))
CAPTURE_REPLAYS = env_flag("JJK_CAPTURE_REPLAYS", False)
REPLAY_RETENTION_DAYS = max(1, int(os.getenv("JJK_REPLAY_RETENTION_DAYS", "30")))
FINISHED_ROOM_TTL_SECONDS = max(60, int(os.getenv("JJK_FINISHED_ROOM_TTL_SECONDS", "900")))
ACTIVE_ROOM_TTL_SECONDS = max(300, int(os.getenv("JJK_ACTIVE_ROOM_TTL_SECONDS", "7200")))
LOBBY_TTL_SECONDS = max(60, int(os.getenv("JJK_LOBBY_TTL_SECONDS", "900")))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "JJK_CORS_ORIGINS",
        f"http://127.0.0.1:{PORT},http://localhost:{PORT}",
    ).split(",")
    if origin.strip()
]

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
    async_mode=os.getenv("JJK_SOCKETIO_ASYNC_MODE", "threading"),
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
operational_counters = defaultdict(int)
last_runtime_prune_at = 0.0
CPU_V2_PLAYER_ID = "__cpu_v2__"


def player_room(player_id: str) -> str:
    return f"player:{player_id}"


def match_room(match_id: str) -> str:
    return f"match:{match_id}"


def lobby_room(lobby_code: str) -> str:
    return f"lobby:{lobby_code}"


def new_match_id() -> str:
    return f"m_{uuid.uuid4().hex[:30]}"


def prune_context_indexes() -> None:
    """Discard index entries whose authoritative lobby/match no longer exists."""

    for player_id, match_id in list(active_match_by_player.items()):
        if match_id not in battle_v2_manager.rooms:
            active_match_by_player.pop(player_id, None)
    for code, match_id in list(active_by_code.items()):
        if match_id not in battle_v2_manager.rooms:
            active_by_code.pop(code, None)
    for player_id, code in list(waiting_code_by_player.items()):
        if not any(entry["id"] == player_id for entry in v2_pvp_lobbies.get(code, [])):
            waiting_code_by_player.pop(player_id, None)
    for alias, match_id in list(battle_v2_manager.room_aliases.items()):
        if match_id not in battle_v2_manager.rooms:
            battle_v2_manager.room_aliases.pop(alias, None)


def _is_live_match(match_id: str | None) -> bool:
    if not match_id:
        return False
    state = battle_v2_manager.rooms.get(match_id)
    return state is not None and state.phase.value != "finished"


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
    if state is None:
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

ROOM_RE = re.compile(r"[^a-zA-Z0-9_-]+")
CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]+")
RESUME_TOKEN_RE = re.compile(r"[^a-zA-Z0-9_-]+")


def production_readiness_issues() -> list[str]:
    issues = []
    if PRODUCTION_MODE and (not configured_secret or len(configured_secret) < 32):
        issues.append("FLASK_SECRET_KEY must contain at least 32 characters in production")
    if WEB_WORKERS != 1:
        issues.append("JJK_WEB_WORKERS must remain 1 until authoritative rooms use an external coordinator")
    if PRODUCTION_MODE and not configured_cors_origins:
        issues.append("JJK_CORS_ORIGINS must be explicitly configured in production")
    if PRODUCTION_MODE and ("*" in CORS_ORIGINS or any(not origin.startswith("https://") for origin in CORS_ORIGINS)):
        issues.append("JJK_CORS_ORIGINS must contain only explicit HTTPS origins in production")
    if PRODUCTION_MODE and not os.getenv("JJK_DATABASE_PATH"):
        issues.append("JJK_DATABASE_PATH must point to a durable production volume")
    try:
        storage = runtime_store.healthcheck()
        if not storage.get("ok"):
            issues.append("runtime database schema is unavailable")
    except Exception:
        issues.append("runtime database is unavailable")
    return issues


@app.after_request
def apply_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; connect-src 'self' ws: wss:; font-src 'self' data:; "
        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    )
    if PRODUCTION_MODE and request.is_secure:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app.route("/healthz")
def healthz():
    operational_counters["health_checks"] += 1
    return jsonify({"status": "ok", "service": "jjk-arena"})


@app.route("/readyz")
def readyz():
    operational_counters["readiness_checks"] += 1
    issues = production_readiness_issues()
    payload = {
        "status": "ready" if not issues else "not_ready",
        "issues": issues,
        "storage": runtime_store.healthcheck() if not any("database" in issue for issue in issues) else {"ok": False},
        "topology": "single-authority-worker",
    }
    return jsonify(payload), 200 if not issues else 503


@app.route("/ops/runtime")
def runtime_status():
    token = os.getenv("JJK_OPS_TOKEN", "")
    supplied = request.headers.get("Authorization", "")
    if not token or not secrets.compare_digest(supplied, f"Bearer {token}"):
        abort(404)
    return jsonify(
        {
            "active_rooms": len(battle_v2_manager.rooms),
            "waiting_lobbies": len(v2_pvp_lobbies),
            "rate_limit_keys": len(rate_limits),
            "counters": dict(operational_counters),
            "analytics": runtime_store.analytics_summary(),
        }
    )


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


def battle_v2_cpu_difficulty(data: dict) -> str:
    difficulty = CONTROL_RE.sub("", str(data.get("difficulty", "normal")).strip().lower())[:16]
    return difficulty if difficulty in {"easy", "normal", "hard"} else "normal"


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
    def remember(profile):
        profile["selected_starter_team"] = list(team[:3])
        return profile

    update_first_creation_profile(player_id, remember)


def start_battle_v2_match_for_mode(room_id: str, players: list[dict], mode: str, difficulty: str = "normal") -> dict:
    try:
        if mode == "first_creation":
            payload = battle_v2_manager.start_first_creation_match(room_id, players, difficulty=difficulty)
        else:
            payload = battle_v2_manager.start_classic_match(room_id, players, difficulty=difficulty)
    except Exception:
        if room_id in battle_v2_manager.rooms:
            remove_battle_v2_room(room_id)
        raise
    room_last_activity[room_id] = time.monotonic()
    operational_counters["matches_started"] += 1
    battle_v2_timer_scheduler.arm(room_id)
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
            runtime_store.record_analytics_event(
                "match_player_result",
                {"outcome": _player_outcome(state, player_id)},
                match_id=room_id,
                player_id=player_id,
                event_key=f"match_player_result:{room_id}:{player_id}",
            )
    except Exception:
        operational_counters["analytics_write_errors"] += 1
        return
    analytics_recorded_matches.add(room_id)


# Recorded at the authoritative terminal state transition (manager._finish_match),
# not from the emit_battle_v2_update broadcast path — a repeated broadcast/reconnect
# refresh must not be the thing deciding whether a match-finished event exists.
battle_v2_manager.on_match_finished = record_match_finished_analytics


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
    room_last_activity[room_id] = time.monotonic()
    operational_counters["commands_replayed" if replayed else "commands_applied"] += 1
    battle_v2_timer_scheduler.arm(room_id)
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
    room_id = active_by_code.get(requested_room_id, requested_room_id) if requested_room_id else None
    room_id = room_id or session.get("match_id") or session.get("room_id") or "classic-v2"
    active_match_id = active_match_by_player.get(player_session)
    if active_match_id and room_id != active_match_id and _is_live_match(active_match_id):
        room_id = active_match_id
    if require_membership:
        state = battle_v2_manager.rooms.get(room_id)
        if state is None or player_session not in state.players:
            emit("battle_v2_error", {"message": "Player is not a member of this match."})
            return None
        session["room_id"] = room_id
        session["match_id"] = room_id
        join_room(match_room(room_id))
        join_room(player_room(player_session))
    return room_id, player_session


def authorize_match_context(room_id: str, player_id: str) -> None:
    state = battle_v2_manager.rooms.get(room_id)
    if state is None or player_id not in state.players:
        raise BattleV2Error("Player is not a member of this match.")
    session["room_id"] = room_id
    session["match_id"] = room_id
    join_room(match_room(room_id))
    join_room(player_room(player_id))


def emit_battle_v2_update(room_id: str, viewer_id: str | None = None):
    state = battle_v2_manager.get_state(room_id)
    room_last_activity[room_id] = time.monotonic()
    if state.phase.value == "finished":
        # Match-finished analytics are recorded by battle_v2_manager.on_match_finished
        # at the authoritative _finish_match transition, not here.
        archive_finished_replay(room_id)
    viewer_ids = [player_id for player_id in state.players if player_id != CPU_V2_PLAYER_ID]
    if viewer_id and viewer_id not in viewer_ids and viewer_id in state.players:
        viewer_ids.append(viewer_id)
    if not viewer_ids and viewer_id:
        viewer_ids = [viewer_id]
    for target_viewer_id in viewer_ids:
        payload = battle_v2_manager.serialize_for_player(room_id, target_viewer_id)
        if payload.get("roster_mode") == "first_creation":
            if payload.get("winner_id"):
                profile = merge_first_creation_progress(
                    target_viewer_id,
                    payload.get("first_creation_progress"),
                    match_id=room_id,
                    analytics_store=runtime_store,
                )
            else:
                profile = load_first_creation_profile(target_viewer_id)
            payload["first_creation_account"] = first_creation_profile_payload(profile)
        payload["match_id"] = room_id
        payload["lobby_code"] = lobby_code_by_match.get(room_id)
        socketio.emit("battle_v2_update", payload, room=player_room(target_viewer_id))
        if payload.get("phase") == "finished":
            socketio.emit("battle_v2_finished", {"winner_id": payload.get("winner_id")}, room=player_room(target_viewer_id))


def emit_battle_v2_error(exc: Exception):
    operational_counters["command_errors"] += 1
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
            room=player_room(player_id),
        )


def run_battle_v2_cpu_turns(room_id: str):
    for _ in range(6):
        state = battle_v2_manager.get_state(room_id)
        if state.winner_id or state.turn_player_id != CPU_V2_PLAYER_ID:
            return
        battle_v2_manager.execute_player_command(
            room_id,
            CPU_V2_PLAYER_ID,
            "cpu_turn",
            state.state_revision,
            f"server-cpu-{state.state_revision}",
            {},
        )
        battle_v2_timer_scheduler.arm(room_id)


def handle_battle_v2_timeout(room_id: str) -> None:
    """Continue automatic CPU play and broadcast a background timeout result."""

    if room_id not in battle_v2_manager.rooms:
        return
    operational_counters["phase_timeouts"] += 1
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
        for player_id, active_match_id in list(active_match_by_player.items()):
            if active_match_id == room_id:
                active_match_by_player.pop(player_id, None)
        code = lobby_code_by_match.pop(room_id, None)
        if code and active_by_code.get(code) == room_id:
            active_by_code.pop(code, None)
        match_players.pop(room_id, None)
        match_roster_mode.pop(room_id, None)
        battle_v2_manager.rooms.pop(room_id, None)
        for alias, target in list(battle_v2_manager.room_aliases.items()):
            if target == room_id:
                battle_v2_manager.room_aliases.pop(alias, None)
        battle_v2_manager.rngs.pop(room_id, None)
        battle_v2_manager.command_receipts.pop(room_id, None)
        battle_v2_manager.room_rosters.pop(room_id, None)
        battle_v2_manager.room_skill_maps.pop(room_id, None)
        battle_v2_manager.room_catalogs.pop(room_id, None)
        battle_v2_manager.room_roster_modes.pop(room_id, None)
        battle_v2_manager.room_cpu_difficulty.pop(room_id, None)
        battle_v2_manager.room_first_creation_progress.pop(room_id, None)
        battle_v2_manager.room_replays.pop(room_id, None)
        battle_v2_sessions.remove_room(room_id)
        room_last_activity.pop(room_id, None)
        archived_replays.discard(room_id)
        analytics_recorded_matches.discard(room_id)
        rematch_receipts.pop(room_id, None)
        rematch_by_old_match.pop(room_id, None)
        for old_match_id, new_match in list(rematch_by_old_match.items()):
            if new_match == room_id:
                rematch_by_old_match.pop(old_match_id, None)

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
        lobby_last_activity.pop(room_id, None)
    if waiting_code_by_player.get(player_session) == room_id:
        waiting_code_by_player.pop(player_session, None)
    return kept


def acknowledge_finished_match(match_id: str, player_id: str) -> None:
    """Release live identity/code bindings without deleting archived match state."""

    state = battle_v2_manager.rooms.get(match_id)
    if state is None or state.phase.value != "finished" or player_id not in state.players:
        return
    if active_match_by_player.get(player_id) == match_id:
        active_match_by_player.pop(player_id, None)
    code = lobby_code_by_match.get(match_id)
    if code and active_by_code.get(code) == match_id:
        active_by_code.pop(code, None)


def prune_stale_runtime(now: float | None = None) -> dict[str, int]:
    current = time.monotonic() if now is None else float(now)
    removed_rooms = 0
    for room_id, last_activity in list(room_last_activity.items()):
        state = battle_v2_manager.rooms.get(room_id)
        phase = getattr(getattr(state, "phase", None), "value", None)
        terminal = state is not None and (phase == "finished" or bool(getattr(state, "winner_id", None)))
        ttl = FINISHED_ROOM_TTL_SECONDS if terminal else ACTIVE_ROOM_TTL_SECONDS
        if current - last_activity >= ttl:
            remove_battle_v2_room(room_id)
            removed_rooms += 1
    removed_lobbies = 0
    for room_id, last_activity in list(lobby_last_activity.items()):
        if current - last_activity >= LOBBY_TTL_SECONDS:
            expired = v2_pvp_lobbies.pop(room_id, None) or []
            for entry in expired:
                if waiting_code_by_player.get(entry["id"]) == room_id:
                    waiting_code_by_player.pop(entry["id"], None)
            lobby_last_activity.pop(room_id, None)
            removed_lobbies += 1
    removed_limits = 0
    for key, hits in list(rate_limits.items()):
        while hits and current - hits[0] > 60:
            hits.popleft()
        if not hits:
            rate_limits.pop(key, None)
            removed_limits += 1
    try:
        expired_replays = runtime_store.prune_expired_replays()
    except Exception:
        expired_replays = 0
        operational_counters["storage_maintenance_errors"] += 1
    operational_counters["rooms_pruned"] += removed_rooms
    operational_counters["lobbies_pruned"] += removed_lobbies
    operational_counters["replays_pruned"] += expired_replays
    return {
        "rooms": removed_rooms,
        "lobbies": removed_lobbies,
        "rate_limits": removed_limits,
        "replays": expired_replays,
    }


def maybe_prune_runtime(now: float | None = None) -> None:
    global last_runtime_prune_at
    current = time.monotonic() if now is None else float(now)
    if current - last_runtime_prune_at < 60:
        return
    last_runtime_prune_at = current
    prune_stale_runtime(current)


def allow_event(event_name: str, limit: int = 30, window_seconds: int = 5) -> bool:
    player_session = session.get("player_id", "anonymous")
    now = time.monotonic()
    maybe_prune_runtime(now)
    key = (player_session, event_name)
    hits = rate_limits[key]
    while hits and now - hits[0] > window_seconds:
        hits.popleft()
    if len(hits) >= limit:
        operational_counters["rate_limited_events"] += 1
        emit("message", {"text": "Too many actions. Slow down for a moment."})
        return False
    hits.append(now)
    operational_counters["socket_events"] += 1
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
    context = active_v2_context(data, require_membership=False)
    if not context:
        return
    requested_code, player_session = context
    room_id = new_match_id()
    player_name = clean_player_name(data.get("player_name", ""), f"Player_{player_session[:4]}")
    roster_mode = battle_v2_roster_mode(data)
    difficulty = battle_v2_cpu_difficulty(data)
    player_team = clean_v2_team(data.get("player_team") or data.get("team"), battle_v2_default_team(roster_mode))
    enemy_team = clean_v2_team(data.get("enemy_team"), battle_v2_default_enemy_team(roster_mode))
    try:
        with lifecycle_lock:
            bound_match = active_by_code.get(requested_code)
            if _is_live_match(requested_code) or (bound_match and _is_live_match(bound_match)):
                raise BattleV2Error("Lobby code is already bound to an active match.")
            if bound_match and not _is_live_match(bound_match):
                active_by_code.pop(requested_code, None)
            current = active_match_by_player.get(player_session)
            if current and _is_live_match(current):
                raise BattleV2Error("Player is already in an active match.")
            previous_code = waiting_code_by_player.get(player_session)
            if previous_code:
                remove_v2_pvp_lobby_player(previous_code, player_session)
            players = [
                {"id": player_session, "name": player_name, "team": player_team},
                {"id": CPU_V2_PLAYER_ID, "name": "CPU V2", "team": enemy_team},
            ]
            start_battle_v2_match_for_mode(room_id, players, roster_mode, difficulty=difficulty)
            active_match_by_player[player_session] = room_id
            match_players[room_id] = players
            match_roster_mode[room_id] = roster_mode
            if requested_code != room_id and requested_code not in battle_v2_manager.rooms:
                battle_v2_manager.room_aliases[requested_code] = room_id
        authorize_match_context(room_id, player_session)
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
    context = active_v2_context(data, require_membership=False)
    if not context:
        return
    requested_code = clean_room_id(data.get("room_id"))
    _, player_session = context
    room_id = requested_code
    player_name = clean_player_name(data.get("player_name", ""), f"Player_{player_session[:4]}")
    roster_mode = battle_v2_roster_mode(data)
    player_team = clean_v2_team(data.get("player_team") or data.get("team"), battle_v2_default_team(roster_mode))
    try:
        with lifecycle_lock:
            prune_context_indexes()
            active_match_id = active_match_by_player.get(player_session)
            if active_match_id and _is_live_match(active_match_id):
                if lobby_code_by_match.get(active_match_id) == room_id:
                    emit_battle_v2_update(active_match_id, player_session)
                    return
                raise BattleV2Error("Player is already in an active match.")
            bound_match = active_by_code.get(room_id)
            if bound_match and _is_live_match(bound_match):
                raise BattleV2Error("Lobby code is currently in use by an active match.")
            if bound_match:
                active_by_code.pop(room_id, None)

            previous_code = waiting_code_by_player.get(player_session)
            if previous_code and previous_code != room_id:
                remove_v2_pvp_lobby_player(previous_code, player_session)
                leave_room(lobby_room(previous_code))

            entry = {"id": player_session, "name": player_name, "team": player_team, "roster_mode": roster_mode}
            lobby = [item for item in v2_pvp_lobbies.get(room_id, []) if item["id"] != player_session]
            if not lobby:
                v2_pvp_lobbies[room_id] = [entry]
                waiting_code_by_player[player_session] = room_id
                lobby_last_activity[room_id] = time.monotonic()
                join_room(lobby_room(room_id))
                join_room(player_room(player_session))
                if roster_mode == "first_creation":
                    remember_first_creation_team(player_session, player_team)
                players = v2_pvp_lobbies[room_id]
            else:
                waiting = lobby[0]
                if waiting.get("roster_mode", "classic") != roster_mode:
                    socketio.emit(
                        "battle_v2_lobby",
                        {"room_id": room_id, "status": "join_failed", "message": "An incompatible opponent tried to join; your lobby is still waiting.", "players": [{"id": waiting["id"], "name": waiting["name"]}]},
                        room=player_room(waiting["id"]),
                    )
                    raise BattleV2Error("Both PvP players must use the same roster mode.")
                if _is_live_match(active_match_by_player.get(waiting["id"])):
                    raise BattleV2Error("Waiting player is already active elsewhere.")
                match_id = new_match_id()
                players = [waiting, entry]
                # Match creation is the commit point; the lobby remains intact on failure.
                start_battle_v2_match_for_mode(match_id, players, roster_mode)
                for item in players:
                    active_match_by_player[item["id"]] = match_id
                    waiting_code_by_player.pop(item["id"], None)
                active_by_code[room_id] = match_id
                lobby_code_by_match[match_id] = room_id
                match_players[match_id] = [dict(item) for item in players]
                match_roster_mode[match_id] = roster_mode
                v2_pvp_lobbies.pop(room_id, None)
                lobby_last_activity.pop(room_id, None)
                if room_id != match_id and room_id not in battle_v2_manager.rooms:
                    battle_v2_manager.room_aliases[room_id] = match_id
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
        issue_battle_v2_resume_sessions(match_id)
        authorize_match_context(match_id, player_session)
        emit_battle_v2_update(match_id, player_session)
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
    valid = (
        state is not None
        and player_id in state.players
        and player_id != CPU_V2_PLAYER_ID
        and battle_v2_sessions.verify(room_id, player_id, token)
    )
    if not valid:
        emit("battle_v2_resume_rejected", {"message": "Battle session could not be resumed."})
        return
    try:
        battle_v2_manager.reconnect_player(room_id, player_id)
        battle_v2_manager.serialize_for_player(room_id, player_id)
        join_room(match_room(room_id))
        join_room(player_room(player_id))
    except (BattleV2Error, KeyError, RuntimeError):
        emit("battle_v2_resume_rejected", {"message": "Battle session could not be resumed."})
        return
    grant = battle_v2_sessions.rotate(room_id, player_id, token)
    if grant is None:
        emit("battle_v2_resume_rejected", {"message": "Battle session could not be resumed."})
        return
    with lifecycle_lock:
        active_match_by_player[player_id] = room_id
        waiting_code_by_player.pop(player_id, None)
    session["player_id"] = player_id
    session["room_id"] = room_id
    session["match_id"] = room_id
    emit(
        "battle_v2_session",
        {"room_id": room_id, "player_id": player_id, "resume_token": grant.token},
        room=player_room(player_id),
    )
    battle_v2_timer_scheduler.arm(room_id)
    emit_battle_v2_update(room_id, player_id)


@socketio.on("battle_v2_leave_pvp")
def on_battle_v2_leave_pvp(data=None):
    if not allow_event("battle_v2_leave_pvp", limit=20, window_seconds=10):
        return
    data = data or {}
    context = active_v2_context(data, require_membership=False)
    if not context:
        return
    room_id, player_session = context
    with lifecycle_lock:
        acknowledge_finished_match(room_id, player_session)
    kept = remove_v2_pvp_lobby_player(room_id, player_session)
    emit(
        "battle_v2_lobby",
        {
            "room_id": room_id,
            "status": "cancelled",
            "players": [{"id": entry["id"], "name": entry["name"]} for entry in kept],
        },
        room=player_room(player_session),
    )


@socketio.on("battle_v2_ack_result")
def on_battle_v2_ack_result(data=None):
    if not allow_event("battle_v2_ack_result", limit=20, window_seconds=10):
        return
    data = data or {}
    player_id = session.get("player_id")
    match_id = clean_room_id(data.get("match_id")) or session.get("match_id")
    if not player_id or not match_id:
        return
    with lifecycle_lock:
        acknowledge_finished_match(match_id, player_id)


@socketio.on("battle_v2_rematch")
def on_battle_v2_rematch(data=None):
    if not allow_event("battle_v2_rematch", limit=6, window_seconds=10):
        return
    data = data or {}
    player_id = session.get("player_id")
    old_match_id = clean_room_id(data.get("old_match_id")) or session.get("match_id")
    nonce = CONTROL_RE.sub("", str(data.get("client_action_nonce", "")).strip())[:64]
    try:
        revision = int(data.get("state_revision"))
    except (TypeError, ValueError):
        emit_battle_v2_error(BattleV2Error("state_revision must be a non-negative integer"))
        return
    try:
        with lifecycle_lock:
            old_state = battle_v2_manager.rooms.get(old_match_id)
            if not player_id or old_state is None or player_id not in old_state.players:
                raise BattleV2Error("Unknown completed match.")
            if old_state.phase.value != "finished":
                raise BattleV2Error("Rematch is available only after a terminal result.")
            if revision != old_state.state_revision:
                raise BattleV2Error(f"stale state revision: expected {old_state.state_revision}, got {revision}")
            if not nonce:
                raise BattleV2Error("client_action_nonce is required")
            receipt = rematch_receipts.setdefault(old_match_id, {}).get(nonce)
            if receipt and receipt[0] != revision:
                raise BattleV2Error("client_action_nonce was already used for a different rematch request")
            new_id = rematch_by_old_match.get(old_match_id)
            if new_id is None:
                players = [dict(entry) for entry in match_players.get(old_match_id, [])]
                if len(players) != 2:
                    raise BattleV2Error("Original match configuration is unavailable.")
                for entry in players:
                    if entry["id"] == CPU_V2_PLAYER_ID:
                        continue
                    other_match = active_match_by_player.get(entry["id"])
                    if other_match and other_match != old_match_id and _is_live_match(other_match):
                        raise BattleV2Error(
                            "A rematch participant is already in another active match."
                        )
                new_id = new_match_id()
                mode = match_roster_mode.get(old_match_id, "classic")
                difficulty = battle_v2_manager.room_cpu_difficulty.get(old_match_id, "normal")
                start_battle_v2_match_for_mode(new_id, players, mode, difficulty=difficulty)
                rematch_by_old_match[old_match_id] = new_id
                match_players[new_id] = players
                match_roster_mode[new_id] = mode
                for entry in players:
                    if entry["id"] != CPU_V2_PLAYER_ID:
                        active_match_by_player[entry["id"]] = new_id
                issue_battle_v2_resume_sessions(new_id)
            rematch_receipts.setdefault(old_match_id, {})[nonce] = (revision, new_id)
            session["room_id"] = new_id
            session["match_id"] = new_id
            join_room(match_room(new_id))
            join_room(player_room(player_id))
        emit("battle_v2_rematch", {"old_match_id": old_match_id, "new_match_id": new_id}, room=player_room(player_id))
        emit_battle_v2_update(new_id, player_id)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


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


@socketio.on("disconnect")
def on_disconnect():
    player_session = session.get("player_id")
    if not player_session:
        return
    waiting_code = waiting_code_by_player.get(player_session)
    if waiting_code:
        remove_v2_pvp_lobby_player(waiting_code, player_session)
    room_id = active_match_by_player.get(player_session) or session.get("match_id")
    if room_id and room_id in battle_v2_manager.rooms:
        battle_v2_manager.disconnect_player(room_id, player_session)
        battle_v2_timer_scheduler.arm(room_id)
        emit_battle_v2_update(room_id)


if __name__ == "__main__":
    socketio.run(
        app,
        debug=DEBUG_MODE,
        host=HOST,
        port=PORT,
        allow_unsafe_werkzeug=not PRODUCTION_MODE,
    )
