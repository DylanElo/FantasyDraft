"""
Flask + SocketIO multiplayer bridge for the JJK Fantasy Draft game.

This file adapts the original game.py (which uses integer IDs from Telegram)
to work with string-based browser session UUIDs. The game engine itself
is NOT modified — this layer converts between the two ID systems.
"""
from flask import Flask, render_template, session
from flask_socketio import SocketIO, emit, join_room
import os
import uuid
import sys
import zlib

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jjk_bot.game import GameManager, GameState
from jjk_bot.characters import Character, Skill

app = Flask(__name__)
# Fixed secret key so session cookies survive server restarts.
# Change this string if you want to invalidate all existing sessions.
app.secret_key = 'jjk-cursed-clash-secret-key-2024'
socketio = SocketIO(app, cors_allowed_origins="*")

game_manager = GameManager()

# ── ID CONVERSION ──────────────────────────────────────────────────────────────
# game.py uses int IDs. Browser sessions use string UUIDs.
# We use a deterministic hash so the same session string always maps
# to the same int, which game.py can use as a player_id.
def str_to_int_id(s: str) -> int:
    return zlib.adler32(s.encode()) & 0x7FFFFFFF

# ── SERIALIZATION ──────────────────────────────────────────────────────────────
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
    }

def char_to_dict(char: Character) -> dict:
    if not char:
        return None
    return {
        'name': char.name,
        'description': char.description,
        'image_url': char.image_url,
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
            char_data.append({
                'name': char.name,
                'image_url': char.image_url,
                'skills': skills_out,
            })

        players_battle.append({
            'id': sid,
            'name': game.player_names[pid],
            'char_states': char_states,  # all 5 states
            'char_data': char_data,      # all 5 char data
            'energy': energy,
        })

    current_pid = b.current_player_id
    return {
        'turn_number': b.turn_number,
        'current_player_id': int_to_str.get(current_pid, str(current_pid)),
        'current_player_name': game.player_names[current_pid],
        'players': players_battle,
        'action_log': list(b.action_log[-10:]),
        'winner_id': int_to_str.get(b.winner_id, None) if b.winner_id else None,
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
        'last_drawn_character': char_to_dict(game.last_drawn_character),
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
    import json
    from flask import jsonify
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
    room_id = str(data.get('room_id', 'lobby')).strip()[:32]
    player_session = session.get('player_id')
    if not player_session:
        player_session = str(uuid.uuid4())
        session['player_id'] = player_session
    raw_name = str(data.get('player_name', '')).strip()[:24]
    player_name = raw_name or f"Player_{player_session[:4]}"

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

@socketio.on('start_game')
def on_start_game():
    room_id = session.get('room_id')
    int_room = str_to_int_id(room_id)
    game = game_manager.get_game(int_room)
    smap = get_session_map(room_id)
    success, msg = game.start_game()
    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('draw_card')
def on_draw_card():
    room_id = session.get('room_id')
    player_session = session.get('player_id')
    smap = get_session_map(room_id)
    int_id = smap.get(player_session, str_to_int_id(player_session))
    int_room = str_to_int_id(room_id)

    game = game_manager.get_game(int_room)
    success, msg, char = game.draw(int_id)
    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('keep_card')
def on_keep_card():
    room_id = session.get('room_id')
    player_session = session.get('player_id')
    smap = get_session_map(room_id)
    int_id = smap.get(player_session, str_to_int_id(player_session))
    int_room = str_to_int_id(room_id)

    game = game_manager.get_game(int_room)
    success, msg = game.keep(int_id)
    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('pass_card')
def on_pass_card():
    room_id = session.get('room_id')
    player_session = session.get('player_id')
    smap = get_session_map(room_id)
    int_id = smap.get(player_session, str_to_int_id(player_session))
    int_room = str_to_int_id(room_id)

    game = game_manager.get_game(int_room)
    success, msg, char = game.pass_card(int_id)
    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('submit_team')
def on_submit_team(data):
    room_id = session.get('room_id')
    player_session = session.get('player_id')
    smap = get_session_map(room_id)
    int_id = smap.get(player_session, str_to_int_id(player_session))
    int_room = str_to_int_id(room_id)
    selected_names = data.get('selected_names', [])

    game = game_manager.get_game(int_room)
    success, msg = game.submit_team(int_id, selected_names)
    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('battle_action')
def on_battle_action(data):
    room_id = session.get('room_id')
    player_session = session.get('player_id')
    smap = get_session_map(room_id)
    int_id = smap.get(player_session, str_to_int_id(player_session))
    int_room = str_to_int_id(room_id)

    char_slot = int(data.get('char_slot', 0))
    skill_name = str(data.get('skill_name', ''))
    target_session = str(data.get('target_player_id', ''))
    target_int_id = smap.get(target_session, str_to_int_id(target_session)) if target_session else int_id
    target_slot = int(data.get('target_slot', 0))

    game = game_manager.get_game(int_room)
    success, msgs = game.battle_action(int_id, char_slot, skill_name, target_int_id, target_slot)

    if not success and msgs:
        emit('message', {'text': msgs[0]})
        return

    for msg in msgs:
        emit('message', {'text': msg}, room=room_id)

    emit('game_update', get_game_state_dict(game, smap), room=room_id)

@socketio.on('swap_in')
def on_swap_in(data):
    room_id = session.get('room_id')
    player_session = session.get('player_id')
    smap = get_session_map(room_id)
    int_id = smap.get(player_session, str_to_int_id(player_session))
    int_room = str_to_int_id(room_id)

    active_slot = int(data.get('active_slot', 0))
    bench_slot = int(data.get('bench_slot', 0))

    game = game_manager.get_game(int_room)
    if game.state != GameState.BATTLE or game.battle is None:
        emit('message', {'text': 'Not currently in battle.'})
        return

    success, msgs = game.battle.swap_in(int_id, active_slot, bench_slot)

    if not success and msgs:
        emit('message', {'text': msgs[0]})
        return

    # Check for battle over after swap
    if game.battle.is_battle_over():
        game.state = GameState.FINISHED

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
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
