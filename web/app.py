"""
Flask + SocketIO multiplayer bridge for the JJK Fantasy Draft game.

This file adapts the original game.py (which uses integer IDs from Telegram)
to work with string-based browser session UUIDs. The game engine itself
is NOT modified — this layer converts between the two ID systems.
"""
from flask import Flask, abort, render_template, session
from flask_socketio import SocketIO, emit, join_room
import os
import random
import re
import secrets
import uuid
import sys
import time
import zlib
from collections import defaultdict, deque

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jjk_bot.game import GameManager, GameState, CPU_PLAYER_ID
from jjk_bot.characters import CHARACTERS, Character, Skill, character_identity
from jjk_bot.portrait_assets import local_portrait_path
from jjk_bot.battle_v2.models import BattleEvent, BattlePhase
from jjk_bot.battle_v2.manager import BattleV2Manager, BattleV2Error, battle_v2_enabled, skill_catalog

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

game_manager = GameManager()
battle_v2_manager = BattleV2Manager()
rate_limits = defaultdict(deque)
CPU_V2_PLAYER_ID = "__cpu_v2__"
V2_CPU_DRAFT_NAMES = [
    "Satoru Gojo",
    "Sukuna (Incarnation)",
    "Yuta Okkotsu",
    "Hiromi Higuruma",
    "Aoi Todo",
]

ROOM_RE = re.compile(r"[^a-zA-Z0-9_-]+")
CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]+")


def clean_room_id(value) -> str:
    room_id = ROOM_RE.sub("", str(value or "lobby").strip())[:32]
    return room_id or "lobby"


def clean_player_name(value, fallback: str) -> str:
    name = CONTROL_RE.sub("", str(value or "").strip())[:24]
    return name or fallback


def clean_skill_name(value) -> str:
    return CONTROL_RE.sub("", str(value or "").strip())[:80]


def clean_selected_names(value) -> list[str]:
    if not isinstance(value, list):
        return []
    return [CONTROL_RE.sub("", str(name).strip())[:80] for name in value[:3] if str(name).strip()]


def v2_character_id_for_name(name: str) -> str | None:
    catalog = skill_catalog()
    cleaned = CONTROL_RE.sub("", str(name or "").strip())
    if not cleaned:
        return None
    exact = {
        str(spec["name"]).lower(): character_id
        for character_id, spec in catalog.items()
    }
    if cleaned.lower() in exact:
        return exact[cleaned.lower()]
    aliases = {
        "sukuna": "ryomen_sukuna",
        "sukuna (incarnation)": "ryomen_sukuna",
        "sukuna (full power)": "ryomen_sukuna",
        "sukuna (heian era)": "ryomen_sukuna",
    }
    if cleaned.lower() in aliases:
        return aliases[cleaned.lower()]

    identity = character_identity(cleaned)
    matches = [
        character_id
        for character_id, spec in catalog.items()
        if character_identity(str(spec["name"])) == identity
    ]
    return matches[0] if len(matches) == 1 else None


def v2_team_ids_from_characters(chars: list[Character]) -> list[str] | None:
    ids = [v2_character_id_for_name(char.name) for char in chars[:3]]
    if len(ids) != 3 or any(character_id is None for character_id in ids):
        return None
    unique_ids = [str(character_id) for character_id in ids]
    return unique_ids if len(set(unique_ids)) == 3 else None


def v2_character_by_name(name: str) -> Character:
    return next(char for char in CHARACTERS if char.name == name)


def v2_compatible_draft_pool(exclude: list[str] | None = None) -> list[Character]:
    excluded = set(exclude or [])
    return [
        char
        for char in CHARACTERS
        if char.name not in excluded and v2_character_id_for_name(char.name) is not None
    ]


def choose_v2_draft_choices(exclude: list[str] | None = None, count: int = 3) -> list[Character]:
    pool = v2_compatible_draft_pool(exclude)
    grouped: dict[str, list[Character]] = {}
    for char in pool:
        grouped.setdefault(str(v2_character_id_for_name(char.name)), []).append(char)

    choices: list[Character] = []
    group_ids = list(grouped)
    random.shuffle(group_ids)
    for character_id in group_ids:
        variants = grouped[character_id]
        choices.append(random.choice(variants))
        if len(choices) == count:
            return choices

    remaining = [char for char in pool if char.name not in {choice.name for choice in choices}]
    random.shuffle(remaining)
    return choices + remaining[: max(0, count - len(choices))]


def configure_v2_cpu_draft(game) -> None:
    cpu_id = CPU_PLAYER_ID
    previous_names = {char.name for char in game.teams.get(cpu_id, [])}
    game.drafted_names = [name for name in game.drafted_names if name not in previous_names]

    cpu_team = [v2_character_by_name(name) for name in V2_CPU_DRAFT_NAMES]
    game.teams[cpu_id] = cpu_team
    game.seen_chars[cpu_id] = [char.name for char in cpu_team]
    for char in cpu_team:
        if char.name not in game.drafted_names:
            game.drafted_names.append(char.name)
    game.active_teams[cpu_id] = cpu_team[:3]
    game.bench_teams[cpu_id] = []


def draw_v2_compatible_three(game, player_id: int) -> tuple[bool, str, list[Character]]:
    if player_id != game.get_current_player_id():
        return False, f"It's not your turn! It's {game.get_current_player_name()}'s turn.", []

    if game.state != GameState.IN_PROGRESS:
        if game.state == GameState.DECIDING:
            return False, "You already drew! Choose a character to add to your team.", game.last_drawn_choices.get(player_id, [])
        return False, "The game is not in progress.", []

    base_exclude = list(game.seen_chars.get(player_id, [])) + game.drafted_names
    choices = choose_v2_draft_choices(base_exclude, count=3)
    if len(choices) < 3:
        return False, "Not enough Battle v2-compatible characters remain for this draft.", []

    for char in choices:
        if char.name not in game.seen_chars[player_id]:
            game.seen_chars[player_id].append(char.name)
    game.last_drawn_choices[player_id] = choices
    game.state = GameState.DECIDING
    return True, f"{game.player_names[player_id]} drew 3 Battle v2-ready characters. Pick 1 to add to your team!", choices


def clean_v2_team(value, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return list(fallback)
    team = [CONTROL_RE.sub("", str(name).strip())[:80] for name in value[:3] if str(name).strip()]
    return team if len(team) == 3 else list(fallback)


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
            "wildcard_pays": [
                CONTROL_RE.sub("", str(energy).strip().lower())[:8]
                for energy in raw.get("wildcard_pays", [])[:3]
            ] if isinstance(raw.get("wildcard_pays", []), list) else [],
            "queue_index": clamp_int(raw.get("queue_index", len(actions)), 0, 2, default=len(actions)),
        }
        if not action["id"]:
            action.pop("id")
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


def clamp_int(value, minimum: int, maximum: int, default: int = 0) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def active_session_context():
    room_id = session.get("room_id")
    player_session = session.get("player_id")
    if not room_id or not player_session:
        emit("message", {"text": "Session error. Please refresh."})
        return None
    smap = get_session_map(room_id)
    int_id = smap.get(player_session, str_to_int_id(player_session))
    smap[player_session] = int_id
    return room_id, player_session, smap, int_id, str_to_int_id(room_id)


def active_v2_context(data=None):
    if not battle_v2_enabled():
        emit("battle_v2_error", {"message": "Battle v2 is disabled. Set JJK_BATTLE_SYSTEM=v2."})
        return None
    data = data or {}
    player_session = session.get("player_id")
    if not player_session:
        player_session = str(uuid.uuid4())
        session["player_id"] = player_session
    room_id = session.get("room_id") or clean_room_id(data.get("room_id", "classic-v2"))
    session["room_id"] = room_id
    join_room(room_id)
    return room_id, player_session


def emit_battle_v2_update(room_id: str, viewer_id: str):
    state = battle_v2_manager.serialize_for_player(room_id, viewer_id)
    emit("battle_v2_update", state)
    if state.get("winner_id"):
        emit("battle_v2_finished", {"winner_id": state["winner_id"]})


def emit_battle_v2_error(exc: Exception):
    emit("battle_v2_error", {"message": str(exc)})


def run_battle_v2_cpu_turns(room_id: str):
    for _ in range(6):
        state = battle_v2_manager.get_state(room_id)
        if state.winner_id or state.turn_player_id != CPU_V2_PLAYER_ID:
            return
        battle_v2_manager.take_cpu_turn(room_id, CPU_V2_PLAYER_ID)


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

# ── ID CONVERSION ──────────────────────────────────────────────────────────────
# game.py uses int IDs. Browser sessions use string UUIDs.
# We use a deterministic hash so the same session string always maps
# to the same int, which game.py can use as a player_id.
def str_to_int_id(s: str) -> int:
    return zlib.adler32(s.encode()) & 0x7FFFFFFF

# ── SERIALIZATION ──────────────────────────────────────────────────────────────
def infer_character_role(char: Character) -> str:
    """Infer an Arena-style draft role from the current skill kit."""
    if not char or not char.skills:
        return "Specialist"

    damage_total = 0
    max_burst = 0
    aoe = 0
    control = 0
    support = 0
    defense = 0
    attrition = 0
    setup = 0
    physical_basics = 0

    for skill in char.skills:
        direct_damage = sum(
            e.value for e in skill.effects
            if getattr(e.kind, "name", "") in ("DAMAGE", "PIERCE", "AFFLICT")
        )
        damage = direct_damage + (skill.dot_damage * skill.dot_turns)
        damage_total += damage
        max_burst = max(max_burst, damage)
        text = f"{skill.name} {skill.description}".lower()
        classes = ",".join(skill.classes).lower() if isinstance(skill.classes, list) else str(skill.classes).lower()

        if skill.is_aoe:
            aoe += 1
        if skill.stun_turns:
            control += skill.stun_turns
        if skill.heal or skill.target_type == "ally":
            support += 1
        if skill.invuln_turns or skill.damage_reduction:
            defense += 1
        if skill.dot_damage or skill.is_affliction or "weaken" in text:
            attrition += 1
        if any(word in text for word in ("gains", "boost", "bonus", "replaced", "next skill", "counter")):
            setup += 1
        if "physical" in classes and skill.cooldown_int == 0:
            physical_basics += 1

    if support >= 2:
        return "Support"
    if control >= 2:
        return "Control"
    if aoe >= 2:
        return "AoE"
    if max_burst >= 55 or damage_total >= 125:
        return "Burst"
    if defense >= 2:
        return "Tank"
    if attrition >= 2:
        return "Punisher"
    if setup >= 2:
        return "Setup"
    if physical_basics:
        return "Bruiser"
    return "Specialist"


def skill_to_dict(skill: Skill) -> dict:
    return {
        'name': skill.name,
        'description': skill.description,
        'cooldown': skill.cooldown,
        'cooldown_int': skill.cooldown_int,
        'energy': skill.energy,
        'classes': ', '.join(skill.classes) if isinstance(skill.classes, list) else skill.classes,
        'target_type': skill.target_type,
        'is_aoe': skill.is_aoe,
        'damage': skill.damage,
        'heal': skill.heal,
        'stun_turns': skill.stun_turns,
        'invuln_turns': skill.invuln_turns,
        'dot_damage': skill.dot_damage,
        'dot_turns': skill.dot_turns,
        'damage_reduction': skill.damage_reduction,
        'ignores_dr': skill.ignores_dr,
        'ignores_invuln': skill.ignores_invuln,
        'is_piercing': skill.is_piercing,
        'is_affliction': skill.is_affliction,
    }


def static_portrait_url(path: str | None, fallback: str) -> str:
    return f"/static/{path}" if path else fallback

def char_to_dict(char: Character) -> dict:
    if not char:
        return None
    portrait_path = local_portrait_path(char.name)
    return {
        'name': char.name,
        'identity': character_identity(char.name),
        'description': char.description,
        'image_url': char.image_url,
        'portrait_url': static_portrait_url(portrait_path, char.image_url),
        'portrait_source': 'local' if portrait_path else 'remote',
        'char_type': getattr(char, 'char_type', 'Specialist'),
        'role': getattr(char, 'role', infer_character_role(char)),
        'rarity': getattr(char, 'rarity', 'Rare'),
        'skills': [skill_to_dict(s) for s in char.skills],
    }

def char_battle_state_to_dict(cs) -> dict:
    return {
        'char_name': cs.char_name,
        'current_hp': cs.current_hp,
        'max_hp': cs.max_hp,
        'alive': cs.alive,
        'cooldowns': dict(cs.cooldowns),
        'stun_turns': cs.stun_turns,
        'invuln_turns': cs.invuln_turns,
        'dot_turns': cs.dot_turns,
        'dot_damage': cs.dot_damage,
        'damage_reduction': cs.damage_reduction,
        'dr_turns': cs.dr_turns,
        'destructible_defense': cs.destructible_defense,
        'dd_turns': cs.dd_turns,
        'increase_damage': cs.increase_damage,
        'decrease_damage': cs.decrease_damage,
    }

def get_battle_state_dict(game, session_map: dict) -> dict:
    """Serialize the BattleEngine state for the frontend."""
    b = game.battle
    int_to_str = {v: k for k, v in session_map.items()}

    players_battle = []
    for pid in game.players:
        sid = int_to_str.get(pid, str(pid))
        char_states = [char_battle_state_to_dict(cs) for cs in b.char_states[pid]]
        energy = dict(b.player_states[pid].energy)

        # Which char slots have already acted this turn (for 3-skills-per-turn UI)
        acted = list(b.acted_slots.get(pid, set()))

        # Include character skill data for UI rendering (active + bench = all 5)
        char_data = []
        all_chars = b.all_team_chars.get(pid, [])
        for i, char in enumerate(all_chars):
            cs = b.char_states[pid][i]
            skills_out = []
            for s in char.skills:
                sd = skill_to_dict(s)
                sd['remaining_cd'] = cs.cooldowns.get(s.name, 0)
                skills_out.append(sd)
            portrait_path = local_portrait_path(char.name)
            char_data.append({
                'name': char.name,
                'image_url': char.image_url,
                'portrait_url': static_portrait_url(portrait_path, char.image_url),
                'portrait_source': 'local' if portrait_path else 'remote',
                'char_type': getattr(char, 'char_type', 'Specialist'),
                'role': getattr(char, 'role', infer_character_role(char)),
                'rarity': getattr(char, 'rarity', 'Rare'),
                'skills': skills_out,
            })

        players_battle.append({
            'id': sid,
            'name': game.player_names[pid],
            'char_states': char_states,  # all 5 states
            'char_data': char_data,      # all 5 char data
            'energy': energy,
            'acted_slots': acted,        # slots that have already acted this turn
            'active_synergies': list(b.player_states[pid].active_synergies),
        })

    current_pid = b.current_player_id
    # Slots that can still act for the current player
    can_act = b.active_chars_that_can_act(current_pid)
    can_end_turn = b.can_player_end_turn(current_pid)
    return {
        'turn_number': b.turn_number,
        'current_player_id': int_to_str.get(current_pid, str(current_pid)),
        'current_player_name': game.player_names[current_pid],
        'players': players_battle,
        'action_log': list(b.action_log),
        'winner_id': int_to_str.get(b.winner_id, None) if b.winner_id else None,
        'can_act_slots': can_act,
        'can_end_turn': can_end_turn,
    }

def get_game_state_dict(game, session_map: dict) -> dict:
    """Build a JSON-safe state dict for the client."""
    # Reverse map: int_id -> string session_id
    int_to_str = {v: k for k, v in session_map.items()}

    players_data = []
    for pid in game.players:
        players_data.append({
            'id': int_to_str.get(pid, str(pid)),  # Send string IDs to client
            'name': game.player_names[pid],
            'team': [char_to_dict(c) for c in game.teams[pid]],
            'active_team': [char_to_dict(c) for c in game.active_teams.get(pid, [])],
            'passes_used': game.passes_used[pid],
        })

    current_pid = game.get_current_player_id()
    state_dict = {
        'state': game.state.name,
        'players': players_data,
        'current_player_id': int_to_str.get(current_pid, str(current_pid)),
        'current_player_name': game.get_current_player_name(),
        'last_drawn_choices': [char_to_dict(c) for c in game.last_drawn_choices.get(current_pid, [])],
        'cpu_difficulty': game.cpu_difficulty,
    }

    # Include battle state when in BATTLE or FINISHED (with battle data)
    if game.state in (GameState.BATTLE, GameState.FINISHED) and game.battle is not None:
        state_dict['battle'] = get_battle_state_dict(game, session_map)

    return state_dict

# ── ROOM SESSION MAPS ─────────────────────────────────────────────────────────
# Tracks which string session IDs map to which int IDs, per room.
# { room_id: { string_session_id: int_id } }
room_session_maps: dict = {}

def get_session_map(room_id: str) -> dict:
    if room_id not in room_session_maps:
        room_session_maps[room_id] = {}
    return room_session_maps[room_id]

# ── ROUTES ─────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    if 'player_id' not in session:
        session['player_id'] = str(uuid.uuid4())
    return render_template(
        'index.html',
        player_id=session['player_id'],
        battle_v2_enabled=battle_v2_enabled(),
        battle_v2_catalog=skill_catalog() if battle_v2_enabled() else {},
    )

@app.route('/reset/<room_id>')
def reset_room(room_id):
    if not DEBUG_MODE:
        abort(404)
    room_id = clean_room_id(room_id)
    int_room = str_to_int_id(room_id)
    game_manager.reset_game(int_room)
    if room_id in room_session_maps:
        del room_session_maps[room_id]
    return f"Room '{room_id}' purged."

@app.route('/new-session')
def new_session():
    """Clear the server-side session so the browser starts fresh."""
    session.clear()
    from flask import redirect
    return redirect('/')

@app.route('/debug-state')
def debug_state():
    """Show current game state for debugging."""
    from flask import jsonify
    if not DEBUG_MODE:
        abort(404)
    room_id = session.get('room_id', 'lobby')
    player_id = session.get('player_id', 'NONE')
    int_room = str_to_int_id(room_id)
    smap = get_session_map(room_id)
    game = game_manager.get_game(int_room)
    state = get_game_state_dict(game, smap)
    return jsonify({
        'my_player_id': player_id,
        'room_id': room_id,
        'session_map': smap,
        'game_state': state,
    })

# ── SOCKET EVENTS ──────────────────────────────────────────────────────────────
@socketio.on('join_room')
def on_join(data):
    if not allow_event("join_room", limit=10, window_seconds=10):
        return {'status': 'rate_limited'}
    data = data or {}
    room_id = clean_room_id(data.get('room_id', 'lobby'))
    player_session = session.get('player_id')
    if not player_session:
        player_session = str(uuid.uuid4())
        session['player_id'] = player_session
    player_name = clean_player_name(data.get('player_name', ''), f"Player_{player_session[:4]}")

    join_room(room_id)
    session['room_id'] = room_id

    # Map string session -> int id
    smap = get_session_map(room_id)
    int_id = str_to_int_id(player_session)
    smap[player_session] = int_id

    int_room = str_to_int_id(room_id)
    game = game_manager.get_game(int_room)

    if game.state == GameState.WAITING_FOR_PLAYERS:
        game.add_player(int_id, player_name)
    elif int_id in game.players:
        # Existing player reconnecting — just send them the current state
        pass
    else:
        # Unknown player joining an in-progress game — send them current state as observer
        # Do NOT auto-reset; that would destroy the ongoing game for the real player
        pass

    emit('game_update', get_game_state_dict(game, smap), room=room_id)
    emit('message', {'text': f"{player_name} joined the arena."}, room=room_id)
    return {'status': 'ok'}

@socketio.on('start_game')
def on_start_game():
    if not allow_event("start_game"):
        return
    context = active_session_context()
    if not context:
        return
    room_id, _, smap, _, int_room = context
    game = game_manager.get_game(int_room)
    success, msg = game.start_game()
    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('start_vs_cpu')
def on_start_vs_cpu(data=None):
    """Start a solo game against the CPU from the waiting room."""
    if not allow_event("start_vs_cpu"):
        return
    data = data or {}
    difficulty = str(data.get('difficulty', 'normal')).lower()
    if difficulty not in {"easy", "normal", "hard"}:
        difficulty = "normal"
    room_id = session.get('room_id')
    player_session = session.get('player_id')
    if not room_id or not player_session:
        emit('message', {'text': 'Session error. Please refresh.'})
        return

    smap = get_session_map(room_id)
    int_id = smap.get(player_session, str_to_int_id(player_session))
    smap[player_session] = int_id
    # Register CPU player in the session map too (maps to CPU_PLAYER_ID)
    smap['__cpu__'] = CPU_PLAYER_ID

    int_room = str_to_int_id(room_id)
    game = game_manager.get_game(int_room)

    player_name = game.player_names.get(int_id, f"Player_{player_session[:4]}")
    success, msg = game.start_game_vs_cpu(int_id, player_name, difficulty=difficulty)
    if success and battle_v2_enabled():
        configure_v2_cpu_draft(game)
        msg = f"{msg} Battle v2 draft pool enabled."

    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('draw_card')
def on_draw_card():
    if not allow_event("draw_card"):
        return
    context = active_session_context()
    if not context:
        return
    room_id, _, smap, int_id, int_room = context

    game = game_manager.get_game(int_room)
    if battle_v2_enabled() and game.cpu_player_id is not None:
        success, msg, choices = draw_v2_compatible_three(game, int_id)
    else:
        success, msg, choices = game.draw_three(int_id)
    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('choose_card')
def on_choose_card(data):
    if not allow_event("choose_card"):
        return
    context = active_session_context()
    if not context:
        return
    room_id, _, smap, int_id, int_room = context
    choice_index = clamp_int((data or {}).get('choice_index', 0), 0, 2)

    game = game_manager.get_game(int_room)
    success, msg = game.choose_card(int_id, choice_index)
    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('submit_team')
def on_submit_team(data):
    if not allow_event("submit_team"):
        return
    context = active_session_context()
    if not context:
        return
    room_id, _, smap, int_id, int_room = context
    selected_names = clean_selected_names((data or {}).get('selected_names', []))

    game = game_manager.get_game(int_room)
    success, msg = game.submit_team(int_id, selected_names)
    emit('message', {'text': msg}, room=room_id)
    if success and battle_v2_enabled() and game.state == GameState.BATTLE and game.cpu_player_id is not None:
        player_team = v2_team_ids_from_characters(game.active_teams.get(int_id, []))
        enemy_team = v2_team_ids_from_characters(game.active_teams.get(CPU_PLAYER_ID, []))
        if player_team and enemy_team:
            player_name = game.player_names.get(int_id, f"Player_{session.get('player_id', '')[:4]}")
            try:
                battle_v2_manager.start_classic_match(
                    room_id,
                    [
                        {"id": session.get("player_id"), "name": player_name, "team": player_team},
                        {"id": CPU_V2_PLAYER_ID, "name": "CPU V2", "team": enemy_team},
                    ],
                )
                emit('message', {'text': 'Battle v2 launched from your drafted 3v3 team.'})
                emit_battle_v2_update(room_id, session.get("player_id"))
                return
            except BattleV2Error as exc:
                emit_battle_v2_error(exc)
                return
        emit('message', {'text': 'Draft team includes characters not converted to Battle v2 yet; using v1 battle.'}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('battle_action')
def on_battle_action(data):
    if not allow_event("battle_action", limit=45, window_seconds=5):
        return
    data = data or {}
    context = active_session_context()
    if not context:
        return
    room_id, _, smap, int_id, int_room = context

    char_slot = clamp_int(data.get('char_slot', 0), 0, 4)
    skill_name = clean_skill_name(data.get('skill_name', ''))
    target_session = str(data.get('target_player_id', ''))[:64]
    target_slot = clamp_int(data.get('target_slot', 0), 0, 4)

    game = game_manager.get_game(int_room)
    # Ensure CPU is always resolvable in smap
    if game.cpu_player_id is not None and '__cpu__' not in smap:
        smap['__cpu__'] = CPU_PLAYER_ID
    target_int_id = smap.get(target_session, str_to_int_id(target_session)) if target_session else int_id
    wildcard_pays = data.get('wildcard_pays', None)

    success, msgs = game.battle_action(int_id, char_slot, skill_name, target_int_id, target_slot, wildcard_pays)

    if not success and msgs:
        emit('message', {'text': msgs[0]})
        return

    for msg in msgs:
        emit('message', {'text': msg}, room=room_id)

    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('battle_end_turn')
def on_battle_end_turn():
    """Player voluntarily ends their turn early (skips remaining characters)."""
    if not allow_event("battle_end_turn"):
        return
    context = active_session_context()
    if not context:
        return
    room_id, _, smap, int_id, int_room = context

    game = game_manager.get_game(int_room)
    if game.state != GameState.BATTLE or game.battle is None:
        emit('message', {'text': 'Not currently in battle.'})
        return

    success, msgs = game.battle_end_turn(int_id)
    if not success and msgs:
        emit('message', {'text': msgs[0]})
        return

    for msg in msgs:
        emit('message', {'text': msg}, room=room_id)

    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('swap_in')
def on_swap_in(data):
    if not allow_event("swap_in"):
        return
    data = data or {}
    context = active_session_context()
    if not context:
        return
    room_id, _, smap, int_id, int_room = context

    active_slot = clamp_int(data.get('active_slot', 0), 0, 4)
    bench_slot = clamp_int(data.get('bench_slot', 0), 0, 4)

    game = game_manager.get_game(int_room)
    if game.state != GameState.BATTLE or game.battle is None:
        emit('message', {'text': 'Not currently in battle.'})
        return

    success, msgs = game.battle_swap_in(int_id, active_slot, bench_slot)

    if not success and msgs:
        emit('message', {'text': msgs[0]})
        return

    for msg in msgs:
        emit('message', {'text': msg}, room=room_id)

    emit('game_update', get_game_state_dict(game, smap), room=room_id)


@socketio.on('battle_v2_start_classic')
def on_battle_v2_start_classic(data=None):
    if not allow_event("battle_v2_start_classic", limit=10, window_seconds=10):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    player_name = clean_player_name(data.get("player_name", ""), f"Player_{player_session[:4]}")
    player_team = clean_v2_team(
        data.get("player_team") or data.get("team"),
        ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
    )
    enemy_team = clean_v2_team(
        data.get("enemy_team"),
        ["satoru_gojo", "ryomen_sukuna", "mahito"],
    )
    try:
        battle_v2_manager.start_classic_match(
            room_id,
            [
                {"id": player_session, "name": player_name, "team": player_team},
                {"id": CPU_V2_PLAYER_ID, "name": "CPU V2", "team": enemy_team},
            ],
        )
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on('battle_v2_submit_plan')
def on_battle_v2_submit_plan(data=None):
    if not allow_event("battle_v2_submit_plan", limit=45, window_seconds=5):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        battle_v2_manager.submit_plan(room_id, player_session, clean_v2_actions(data.get("actions", [])))
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on('battle_v2_update_queue')
def on_battle_v2_update_queue(data=None):
    if not allow_event("battle_v2_update_queue", limit=45, window_seconds=5):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        battle_v2_manager.update_queue(
            room_id,
            player_session,
            clean_v2_queue_order(data.get("queue_order", [])),
            clean_v2_wildcard_pays(data.get("wildcard_pays", {})),
        )
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on('battle_v2_confirm_queue')
def on_battle_v2_confirm_queue(data=None):
    if not allow_event("battle_v2_confirm_queue", limit=45, window_seconds=5):
        return
    context = active_v2_context(data or {})
    if not context:
        return
    room_id, player_session = context
    try:
        battle_v2_manager.confirm_queue(room_id, player_session)
        run_battle_v2_cpu_turns(room_id)
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on('battle_v2_cancel_queue')
def on_battle_v2_cancel_queue(data=None):
    if not allow_event("battle_v2_cancel_queue", limit=45, window_seconds=5):
        return
    context = active_v2_context(data or {})
    if not context:
        return
    room_id, player_session = context
    try:
        battle_v2_manager.cancel_queue(room_id, player_session)
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on('battle_v2_convert_energy')
def on_battle_v2_convert_energy(data=None):
    if not allow_event("battle_v2_convert_energy", limit=20, window_seconds=5):
        return
    data = data or {}
    context = active_v2_context(data)
    if not context:
        return
    room_id, player_session = context
    try:
        battle_v2_manager.convert_energy(
            room_id,
            player_session,
            clean_v2_energy_color(data.get("source")),
            clean_v2_energy_color(data.get("target")),
        )
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on('battle_v2_end_turn')
def on_battle_v2_end_turn(data=None):
    if not allow_event("battle_v2_end_turn", limit=45, window_seconds=5):
        return
    context = active_v2_context(data or {})
    if not context:
        return
    room_id, player_session = context
    try:
        battle_v2_manager.end_turn(room_id, player_session)
        run_battle_v2_cpu_turns(room_id)
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)


@socketio.on('battle_v2_surrender')
def on_battle_v2_surrender(data=None):
    if not allow_event("battle_v2_surrender"):
        return
    context = active_v2_context(data or {})
    if not context:
        return
    room_id, player_session = context
    try:
        state = battle_v2_manager.get_state(room_id)
        if player_session not in state.players:
            raise BattleV2Error(f"unknown player: {player_session}")
        winners = [pid for pid in state.players if pid != player_session]
        if not winners:
            raise BattleV2Error("no opponent to award surrender")
        state.winner_id = winners[0]
        state.phase = BattlePhase.FINISHED
        state.event_log.append(
            BattleEvent(
                type="battle_finished",
                message=f"{state.winner_id} wins by surrender",
                turn_number=state.turn_number,
                payload={"winner_id": state.winner_id, "surrendered_id": player_session},
            )
        )
        emit_battle_v2_update(room_id, player_session)
    except BattleV2Error as exc:
        emit_battle_v2_error(exc)

@socketio.on('reset_room')
def on_reset_room():
    room_id = session.get('room_id')
    if not room_id:
        return
    int_room = str_to_int_id(room_id)
    game_manager.reset_game(int_room)
    if room_id in room_session_maps:
        del room_session_maps[room_id]
    session.pop('room_id', None)
    emit('room_reset', {}, room=room_id)

if __name__ == '__main__':
    socketio.run(
        app,
        debug=DEBUG_MODE,
        host=HOST,
        port=PORT,
        allow_unsafe_werkzeug=DEBUG_MODE,
    )
