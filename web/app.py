from flask import Flask, render_template, request, session, jsonify
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

def character_to_dict(char: Character):
    if not char:
        return None
    return {
        'name': char.name,
        'tier': char.tier,
        'score': char.score,
        'hp': char.hp,
        'attack': char.attack,
        'defense': char.defense,
        'skill': char.skill,
        'image_url': char.image_url
    }

def get_game_state_dict(game):
    current_player_name = game.get_current_player_name()
    current_player_id = game.get_current_player_id()

    players_data = []
    for pid in game.players:
        team = [character_to_dict(c) for c in game.teams[pid]]

        total_hp = sum(c.hp for c in game.teams[pid])
        total_attack = sum(c.attack for c in game.teams[pid])
        total_defense = sum(c.defense for c in game.teams[pid])
        combined_score = total_hp + total_attack + total_defense

        players_data.append({
            'id': pid,
            'name': game.player_names[pid],
            'team': team,
            'passes_used': game.passes_used[pid],
            'stats': {
                'hp': total_hp,
                'attack': total_attack,
                'defense': total_defense,
                'total_power': combined_score
            }
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

    chat_id = hash(room_id) % 1000000000
    session['chat_id'] = chat_id

    # Send string ID directly, use same for JS and Python
    # Python's built-in hash() is seeded randomly per process, so JS and Python won't match.
    # We will use a consistent numeric hash based on the uuid string.
    import zlib
    int_player_id = zlib.adler32(player_id.encode('utf-8'))
    session['int_player_id'] = int_player_id

    print(f"Join Room: str_id={player_id}, int_id={int_player_id}", flush=True)

    game = game_manager.get_game(chat_id)

    if game.state == GameState.WAITING_FOR_PLAYERS:
        success, msg = game.add_player(int_player_id, player_name)

    emit('game_update', get_game_state_dict(game), room=room_id)
    emit('message', {'text': f"{player_name} joined room {room_id}"}, room=room_id)

@socketio.on('start_game')
def on_start_game():
    chat_id = session.get('chat_id')
    room_id = session.get('room_id')

    game = game_manager.get_game(chat_id)
    success, msg = game.start_game()

    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game), room=room_id)

@socketio.on('draw_card')
def on_draw_card():
    chat_id = session.get('chat_id')
    room_id = session.get('room_id')
    int_player_id = session.get('int_player_id')

    game = game_manager.get_game(chat_id)
    success, msg, char = game.draw(int_player_id)

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
    success, msg = game.keep(int_player_id)

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
    success, msg, char = game.pass_card(int_player_id)

    emit('message', {'text': msg}, room=room_id)
    emit('game_update', get_game_state_dict(game), room=room_id)

    if game.state == GameState.FINISHED:
        _, results_msg = game.get_results()
        emit('game_over', {'text': results_msg}, room=room_id)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
