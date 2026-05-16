from flask import Flask, render_template, session
from flask_socketio import SocketIO, emit, join_room
import os
import uuid
import sys
import logging
import zlib
import hashlib

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
        'classes': skill.classes
    }

def character_to_dict(char: Character):
    if not char:
        return None
    return {
        'name': char.name,
        'description': char.description,
        'image_url': char.image_url,
        'skills': [skill_to_dict(s) for s in char.skills]
    }

def get_game_state_dict(game):
    current_player_name = game.get_current_player_name()
    current_player_id = game.get_current_player_id()

    players_data = []
    for pid in game.players:
        team = [character_to_dict(c) for c in game.teams[pid]]

        players_data.append({
            'id': pid,
            'name': game.player_names[pid],
            'team': team,
            'passes_used': game.passes_used[pid]
        })

    return {
        'state': game.state.name,
        'players': players_data,
        'current_player_idx': game.current_player_idx,
        'current_player_id': current_player_id,
        'current_player_name': current_player_name,
        'last_drawn_character': character_to_dict(game.last_drawn_character)
    }

@app.route('/')
def index():
    if 'player_id' not in session:
        session['player_id'] = str(uuid.uuid4())
    print(f"Index route: Session player_id: {session['player_id']}", flush=True)
    return render_template('index.html', player_id=session['player_id'])

@socketio.on('join_room')
def on_join(data):
    room_id = data.get('room_id', 'lobby')
    player_id = session.get('player_id')
    player_name = data.get('player_name', f"Player_{player_id[:4]}")

    join_room(room_id)
    session['room_id'] = room_id
    session['player_name'] = player_name

    chat_id = int(hashlib.sha256(room_id.encode('utf-8')).hexdigest(), 16) % 1000000000
    session['chat_id'] = chat_id

    int_player_id = zlib.adler32(player_id.encode('utf-8'))
    session['int_player_id'] = int_player_id

    print(f"Join Room: str_id={player_id}, int_id={int_player_id}", flush=True)

    game = game_manager.get_game(chat_id)

    if game.state == GameState.WAITING_FOR_PLAYERS:
        _, msg = game.add_player(int_player_id, player_name)

    emit('game_update', get_game_state_dict(game), room=room_id)
    emit('message', {'text': f"{player_name} joined room {room_id}"}, room=room_id)

@socketio.on('start_game')
def on_start_game():
    chat_id = session.get('chat_id')
    room_id = session.get('room_id')

    game = game_manager.get_game(chat_id)
    _, msg = game.start_game()

    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game), room=room_id)

@socketio.on('draw_card')
def on_draw_card():
    chat_id = session.get('chat_id')
    room_id = session.get('room_id')
    int_player_id = session.get('int_player_id')

    game = game_manager.get_game(chat_id)
    _, msg, _ = game.draw(int_player_id)

    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game), room=room_id)

    if game.state == GameState.FINISHED:
        _, results_msg = game.get_results()
        emit('game_over', {'text': results_msg}, room=room_id)

@socketio.on('keep_card')
def on_keep_card():
    chat_id = session.get('chat_id')
    room_id = session.get('room_id')
    int_player_id = session.get('int_player_id')

    game = game_manager.get_game(chat_id)
    _, msg = game.keep(int_player_id)

    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game), room=room_id)

    if game.state == GameState.FINISHED:
        _, results_msg = game.get_results()
        emit('game_over', {'text': results_msg}, room=room_id)

@socketio.on('pass_card')
def on_pass_card():
    chat_id = session.get('chat_id')
    room_id = session.get('room_id')
    int_player_id = session.get('int_player_id')

    game = game_manager.get_game(chat_id)
    _, msg, _ = game.pass_card(int_player_id)

    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game), room=room_id)

    if game.state == GameState.FINISHED:
        _, results_msg = game.get_results()
        emit('game_over', {'text': results_msg}, room=room_id)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
