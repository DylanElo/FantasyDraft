from flask import Flask, render_template, session
from flask_socketio import SocketIO, emit, join_room
import os
import uuid
import sys
import logging

logging.basicConfig(level=logging.DEBUG)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jjk_bot.game import GameManager, GameState
from jjk_bot.characters import Character

app = Flask(__name__)
app.secret_key = os.urandom(24)
socketio = SocketIO(app, cors_allowed_origins="*")

game_manager = GameManager()

def skill_to_dict(skill):
    return {
        'name': skill.name,
        'description': skill.description,
        'cooldown': skill.cooldown,
        'energy': skill.energy,
        'classes': skill.classes,
        'target_type': skill.target_type,
        'effects': skill.effects
    }

def character_to_dict(char: Character, hp: int = 100):
    if not char: return None
    return {
        'name': char.name,
        'description': char.description,
        'image_url': char.image_url,
        'hp': hp,
        'max_hp': char.hp,
        'skills': [skill_to_dict(s) for s in char.skills]
    }

def get_game_state_dict(game):
    players_data = []
    for pid in game.players:
        hps = game.hp.get(pid, [100]*5)
        team = [character_to_dict(c, hps[i]) for i, c in enumerate(game.teams[pid])]
        
        players_data.append({
            'id': pid,
            'name': game.player_names[pid],
            'team': team,
            'energy': game.energy.get(pid, {}),
            'passes_used': game.passes_used[pid],
            'has_submitted': (pid in game.queued_actions and len(game.queued_actions[pid]) > 0)
        })

    return {
        'state': game.state.name,
        'players': players_data,
        'current_player_id': game.get_current_player_id(),
        'current_player_name': game.get_current_player_name(),
        'last_drawn_character': character_to_dict(game.last_drawn_character),
        'battle_log': game.battle_log[-10:] if hasattr(game, 'battle_log') else [],
        'turn_count': getattr(game, 'turn_count', 0)
    }

@app.route('/')
def index():
    if 'player_id' not in session:
        session['player_id'] = str(uuid.uuid4())
    return render_template('index.html', player_id=session['player_id'])

@socketio.on('join_room')
def on_join(data):
    room_id = str(data.get('room_id', 'lobby')).strip()[:32]
    player_id = session.get('player_id')
    raw_name = str(data.get('player_name', '')).strip()
    player_name = raw_name[:24] if raw_name else f"Player_{player_id[:4]}"

    join_room(room_id)
    session['room_id'] = room_id
    session['player_name'] = player_name

    game = game_manager.get_game(room_id)
    if game.state == GameState.WAITING_FOR_PLAYERS:
        game.add_player(player_id, player_name)

    emit('game_update', get_game_state_dict(game), room=room_id)
    emit('message', {'text': f"{player_name} joined room {room_id}"}, room=room_id)

@socketio.on('start_game')
def on_start_game():
    room_id = session.get('room_id')
    game = game_manager.get_game(room_id)
    game.start_game()
    emit('game_update', get_game_state_dict(game), room=room_id)

@socketio.on('draw_card')
def on_draw_card():
    room_id, player_id = session.get('room_id'), session.get('player_id')
    game = game_manager.get_game(room_id)
    game.draw(player_id)
    emit('game_update', get_game_state_dict(game), room=room_id)

@socketio.on('keep_card')
def on_keep_card():
    room_id, player_id = session.get('room_id'), session.get('player_id')
    game = game_manager.get_game(room_id)
    game.keep(player_id)
    emit('game_update', get_game_state_dict(game), room=room_id)

@socketio.on('pass_card')
def on_pass_card():
    room_id, player_id = session.get('room_id'), session.get('player_id')
    game = game_manager.get_game(room_id)
    game.pass_card(player_id)
    emit('game_update', get_game_state_dict(game), room=room_id)

@socketio.on('submit_actions')
def on_submit_actions(data):
    room_id, player_id = session.get('room_id'), session.get('player_id')
    game = game_manager.get_game(room_id)
    # data is a list of actions
    game.submit_actions(player_id, data)
    emit('game_update', get_game_state_dict(game), room=room_id)

@app.route('/reset/<room_id>')
def reset_room(room_id):
    game_manager.reset_game(room_id)
    return f"Room {room_id} has been purged of all curses."

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
