import pytest

from jjk_bot.battle_v2.models import EnergyType
from web import app as web_app


@pytest.fixture(autouse=True)
def clear_v2_rooms():
    web_app.battle_v2_manager.rooms.clear()
    web_app.battle_v2_manager.rngs.clear()
    yield
    web_app.battle_v2_manager.rooms.clear()
    web_app.battle_v2_manager.rngs.clear()


def socket_client():
    flask_client = web_app.app.test_client()
    return web_app.socketio.test_client(web_app.app, flask_test_client=flask_client)


def received_names(client):
    return [message["name"] for message in client.get_received()]


def received_payload(client, event_name):
    for message in client.get_received():
        if message["name"] == event_name:
            return message["args"][0]
    return None


def test_battle_v2_socket_events_are_feature_flagged(monkeypatch):
    monkeypatch.delenv("JJK_BATTLE_SYSTEM", raising=False)
    client = socket_client()

    client.emit("battle_v2_start_classic", {"room_id": "socket-v2"})

    payload = received_payload(client, "battle_v2_error")
    assert payload["message"].startswith("Battle v2 is disabled")


def test_battle_v2_socket_start_submit_confirm(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()

    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "socket-v2",
            "player_name": "Tester",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
            "enemy_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    start_state = received_payload(client, "battle_v2_update")
    player_id = start_state["turn_player_id"]
    assert start_state["phase"] == "planning"

    state = web_app.battle_v2_manager.get_state("socket-v2")
    state.players[player_id].energy[EnergyType.GREEN] = 1

    client.emit(
        "battle_v2_submit_plan",
        {
            "actions": [
                {
                    "id": "a1",
                    "caster_slot": 0,
                    "skill_id": "divergent_fist",
                    "target_player_id": "__cpu_v2__",
                    "target_slot": 0,
                }
            ]
        },
    )
    assert "battle_v2_update" in received_names(client)

    client.emit("battle_v2_confirm_queue", {})
    resolved_state = received_payload(client, "battle_v2_update")

    assert resolved_state["turn_player_id"] == player_id
    assert resolved_state["players"]["__cpu_v2__"]["team"][0]["hp"] == 80
    assert any(event["type"] == "skill_resolved" and "used" in event["message"] for event in resolved_state["event_log"])


def test_battle_v2_socket_surrender_finishes_match(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "socket-v2"})
    client.get_received()

    client.emit("battle_v2_surrender", {})

    finished = received_payload(client, "battle_v2_finished")
    assert finished == {"winner_id": "__cpu_v2__"}


def test_battle_v2_socket_end_turn_runs_cpu_response(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "socket-v2", "player_name": "Tester"})
    start_state = received_payload(client, "battle_v2_update")
    player_id = start_state["turn_player_id"]

    client.emit("battle_v2_end_turn", {})

    resolved_state = received_payload(client, "battle_v2_update")
    assert resolved_state["turn_player_id"] == player_id
    assert any(event["message"] == "Tester ended their turn" for event in resolved_state["event_log"])
    assert any(event["type"] == "skill_resolved" for event in resolved_state["event_log"])
