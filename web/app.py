"""
Flask + SocketIO multiplayer bridge for the JJK Fantasy Draft game.

This file adapts the original game.py (which uses integer IDs from Telegram)
to work with string-based browser session UUIDs. The game engine itself
is NOT modified — this layer converts between the two ID systems.
"""
from flask import Flask, abort, render_template, session
from flask_socketio import SocketIO, emit, join_room
import os
import re
import secrets
import uuid
import sys
import time
import zlib
from collections import defaultdict, deque

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jjk_bot.game import GameManager, GameState, CPU_PLAYER_ID
from jjk_bot.characters import Character, Skill, character_identity
from jjk_bot.portrait_assets import local_portrait_path

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
rate_limits = defaultdict(deque)

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
        'unique_mechanic': getattr(char, 'unique_mechanic', ''),
        'achievement_name': getattr(char, 'achievement_name', ''),
        'achievement_desc': getattr(char, 'achievement_desc', ''),
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
    return render_template('index.html', player_id=session['player_id'])

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
