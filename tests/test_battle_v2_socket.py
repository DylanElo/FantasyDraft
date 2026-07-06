import pytest

from jjk_bot.battle_v2.models import EnergyType, SkillClass, StatusEffect
from jjk_bot.characters import CHARACTERS
from jjk_bot.game import CPU_PLAYER_ID, GameState
from web import app as web_app


@pytest.fixture(autouse=True)
def clear_v2_rooms():
    web_app.battle_v2_manager.rooms.clear()
    web_app.battle_v2_manager.rngs.clear()
    web_app.v2_pvp_lobbies.clear()
    yield
    web_app.battle_v2_manager.rooms.clear()
    web_app.battle_v2_manager.rngs.clear()
    web_app.v2_pvp_lobbies.clear()


def socket_client():
    flask_client = web_app.app.test_client()
    return web_app.socketio.test_client(web_app.app, flask_test_client=flask_client)


def socket_client_with_player(player_id):
    flask_client = web_app.app.test_client()
    with flask_client.session_transaction() as flask_session:
        flask_session["player_id"] = player_id
    return web_app.socketio.test_client(web_app.app, flask_test_client=flask_client)


def received_names(client):
    return [message["name"] for message in client.get_received()]


def received_payload(client, event_name):
    for message in client.get_received():
        if message["name"] == event_name:
            return message["args"][0]
    return None


def character(name):
    return next(char for char in CHARACTERS if char.name == name)


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


def test_battle_v2_socket_convert_energy(monkeypatch):
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
    state = web_app.battle_v2_manager.get_state("socket-v2")
    state.players[player_id].energy[EnergyType.GREEN] = 2
    state.players[player_id].energy[EnergyType.RED] = 0

    client.emit("battle_v2_convert_energy", {"source": "green", "target": "red"})
    converted = received_payload(client, "battle_v2_update")

    assert converted["players"][player_id]["energy"]["green"] == 0
    assert converted["players"][player_id]["energy"]["red"] == 1
    assert converted["players"][player_id]["energy_converted_this_turn"] is True
    assert any(event["type"] == "energy_converted" for event in converted["event_log"])


def test_battle_v2_socket_surrender_finishes_match(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "socket-v2"})
    client.get_received()

    client.emit("battle_v2_surrender", {})

    finished = received_payload(client, "battle_v2_finished")
    assert finished == {"winner_id": "__cpu_v2__"}


def test_battle_v2_socket_start_accepts_expanded_roster_teams(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()

    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "socket-v2",
            "player_team": ["aoi_todo", "maki_zenin", "yuta_okkotsu"],
            "enemy_team": ["hiromi_higuruma", "satoru_gojo", "mahito"],
        },
    )

    state = received_payload(client, "battle_v2_update")
    assert [character["character_id"] for character in state["players"][state["turn_player_id"]]["team"]] == [
        "aoi_todo",
        "maki_zenin",
        "yuta_okkotsu",
    ]
    assert "hiromi_higuruma" in state["skill_catalog"]


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


def test_battle_v2_socket_resolves_ally_target_skill(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "socket-v2",
            "player_name": "Tester",
            "player_team": ["yuta_okkotsu", "yuji_itadori", "nobara_kugisaki"],
            "enemy_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    start_state = received_payload(client, "battle_v2_update")
    player_id = start_state["turn_player_id"]
    state = web_app.battle_v2_manager.get_state("socket-v2")
    state.players[player_id].energy[EnergyType.WHITE] = 1
    state.players[player_id].energy[EnergyType.GREEN] = 1
    state.players[player_id].team[1].hp = 50

    client.emit(
        "battle_v2_submit_plan",
        {
            "actions": [
                {
                    "id": "heal-ally",
                    "caster_slot": 0,
                    "skill_id": "reverse_cursed_technique",
                    "target_player_id": player_id,
                    "target_slot": 1,
                    "wildcard_pays": ["green"],
                }
            ]
        },
    )
    assert "battle_v2_update" in received_names(client)

    client.emit("battle_v2_confirm_queue", {})
    resolved_state = received_payload(client, "battle_v2_update")

    heal_events = [event for event in resolved_state["event_log"] if event["type"] == "heal"]
    assert heal_events
    assert heal_events[0]["payload"]["target_player_id"] == player_id
    assert heal_events[0]["payload"]["target_slot"] == 1
    assert heal_events[0]["payload"]["amount"] == 30


def test_submit_team_launches_battle_v2_from_solo_draft_when_convertible(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    flask_client = web_app.app.test_client()
    with flask_client.session_transaction() as flask_session:
        flask_session["player_id"] = "player-v2-draft"
    client = web_app.socketio.test_client(web_app.app, flask_test_client=flask_client)
    client.emit("join_room", {"room_id": "draft-v2", "player_name": "Tester"})
    client.get_received()

    player_session = "player-v2-draft"
    int_id = web_app.str_to_int_id(player_session)
    game = web_app.game_manager.get_game(web_app.str_to_int_id("draft-v2"))
    game.players = [int_id, CPU_PLAYER_ID]
    game.player_names = {int_id: "Tester", CPU_PLAYER_ID: "CPU"}
    game.cpu_player_id = CPU_PLAYER_ID
    game.state = GameState.TEAM_SELECTION
    game.teams[int_id] = [
        character("Yuji Itadori"),
        character("Nobara Kugisaki"),
        character("Megumi Fushiguro"),
        character("Aoi Todo"),
        character("Maki Zenin"),
    ]
    game.teams[CPU_PLAYER_ID] = [
        character("Satoru Gojo"),
        character("Sukuna (Incarnation)"),
        character("Yuta Okkotsu"),
        character("Hiromi Higuruma"),
        character("Aoi Todo"),
    ]
    game.active_teams[CPU_PLAYER_ID] = [
        character("Satoru Gojo"),
        character("Sukuna (Incarnation)"),
        character("Yuta Okkotsu"),
    ]
    game.bench_teams[CPU_PLAYER_ID] = []

    client.emit(
        "submit_team",
        {"selected_names": ["Yuji Itadori", "Nobara Kugisaki", "Megumi Fushiguro"]},
    )

    update = received_payload(client, "battle_v2_update")
    assert update is not None
    assert [char["character_id"] for char in update["players"][player_session]["team"]] == [
        "yuji_itadori",
        "nobara_kugisaki",
        "megumi_fushiguro",
    ]
    assert [char["character_id"] for char in update["players"]["__cpu_v2__"]["team"]] == [
        "satoru_gojo",
        "ryomen_sukuna",
        "yuta_okkotsu",
    ]

    state = web_app.battle_v2_manager.get_state("draft-v2")
    state.players[player_session].energy[EnergyType.GREEN] = 2
    state.players["__cpu_v2__"].energy[EnergyType.GREEN] = 2
    client.get_received()

    client.emit(
        "battle_v2_submit_plan",
        {
            "actions": [
                {
                    "id": "draft-a1",
                    "caster_slot": 0,
                    "skill_id": "divergent_fist",
                    "target_player_id": "__cpu_v2__",
                    "target_slot": 1,
                }
            ]
        },
    )
    queued = received_payload(client, "battle_v2_update")
    assert queued["phase"] == "queue_review"
    assert len(queued["pending_actions"][player_session]) == 1

    client.emit("battle_v2_confirm_queue", {})
    resolved = received_payload(client, "battle_v2_update")

    assert resolved["turn_player_id"] == player_session
    assert resolved["phase"] == "planning"
    assert resolved["pending_actions"][player_session] == []
    assert any(
        event["type"] == "skill_resolved"
        and event["payload"].get("player_id") == player_session
        for event in resolved["event_log"]
    )
    assert any(
        event["type"] == "damage"
        and event["payload"].get("target_player_id") == "__cpu_v2__"
        and event["payload"].get("target_slot") == 1
        and event["payload"].get("amount") == 20
        for event in resolved["event_log"]
    )
    assert any(
        event["type"] == "skill_resolved"
        and event["payload"].get("player_id") == "__cpu_v2__"
        for event in resolved["event_log"]
    )


def test_vs_cpu_v2_uses_convertible_cpu_and_draw_pool(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    flask_client = web_app.app.test_client()
    with flask_client.session_transaction() as flask_session:
        flask_session["player_id"] = "player-v2-pool"
    client = web_app.socketio.test_client(web_app.app, flask_test_client=flask_client)
    client.emit("join_room", {"room_id": "pool-v2", "player_name": "Tester"})
    client.get_received()

    client.emit("start_vs_cpu", {"difficulty": "normal"})
    client.get_received()

    game = web_app.game_manager.get_game(web_app.str_to_int_id("pool-v2"))
    assert web_app.v2_team_ids_from_characters(game.active_teams[CPU_PLAYER_ID]) == [
        "satoru_gojo",
        "ryomen_sukuna",
        "yuta_okkotsu",
    ]

    client.emit("draw_card")
    update = received_payload(client, "game_update")
    drawn = update["last_drawn_choices"]
    assert len(drawn) == 3
    assert all(web_app.v2_character_id_for_name(char["name"]) for char in drawn)


def test_battle_v2_socket_broadcasts_viewer_specific_private_state(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")
    p1_client.emit("join_room", {"room_id": "human-v2", "player_name": "P1"})
    p2_client.emit("join_room", {"room_id": "human-v2", "player_name": "P2"})
    p1_client.get_received()
    p2_client.get_received()

    web_app.battle_v2_manager.start_classic_match(
        "human-v2",
        [
            {"id": "p1", "name": "P1", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
            {"id": "p2", "name": "P2", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
        ],
    )
    state = web_app.battle_v2_manager.get_state("human-v2")
    state.players["p2"].team[0].statuses.append(
        StatusEffect(
            "hidden_trap",
            "Hidden Trap",
            "p1",
            2,
            "p2",
            0,
            duration=2,
            classes=[SkillClass.INVISIBLE],
            invisible=True,
        )
    )

    p1_client.emit("battle_v2_cancel_queue", {})
    p1_update = received_payload(p1_client, "battle_v2_update")
    p2_update = received_payload(p2_client, "battle_v2_update")

    assert p1_update["players"]["p2"]["team"][0]["statuses"][0]["id"] == "hidden_trap"
    assert p2_update["players"]["p2"]["team"][0]["statuses"] == []


def test_battle_v2_pvp_join_waits_then_starts_two_human_room(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")

    p1_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-start",
            "player_name": "P1",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
        },
    )

    waiting = received_payload(p1_client, "battle_v2_lobby")
    assert waiting["status"] == "waiting"
    assert waiting["room_id"] == "human-start"
    assert "human-start" not in web_app.battle_v2_manager.rooms

    p2_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-start",
            "player_name": "P2",
            "player_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )

    p1_update = received_payload(p1_client, "battle_v2_update")
    p2_update = received_payload(p2_client, "battle_v2_update")

    assert set(p1_update["players"]) == {"p1", "p2"}
    assert set(p2_update["players"]) == {"p1", "p2"}
    assert "__cpu_v2__" not in p1_update["players"]


def test_battle_v2_pvp_waiting_player_can_cancel_lobby(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")

    p1_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-cancel",
            "player_name": "P1",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
        },
    )
    assert received_payload(p1_client, "battle_v2_lobby")["status"] == "waiting"

    p1_client.emit("battle_v2_leave_pvp", {"room_id": "human-cancel"})
    cancelled = received_payload(p1_client, "battle_v2_lobby")

    assert cancelled["status"] == "cancelled"
    assert "human-cancel" not in web_app.v2_pvp_lobbies

    p2_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-cancel",
            "player_name": "P2",
            "player_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    waiting = received_payload(p2_client, "battle_v2_lobby")

    assert waiting["status"] == "waiting"
    assert "human-cancel" not in web_app.battle_v2_manager.rooms


def test_battle_v2_pvp_disconnect_cleans_waiting_lobby(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")

    p1_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-disconnect",
            "player_name": "P1",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
        },
    )
    assert received_payload(p1_client, "battle_v2_lobby")["status"] == "waiting"

    p1_client.disconnect()

    assert "human-disconnect" not in web_app.v2_pvp_lobbies

    p2_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-disconnect",
            "player_name": "P2",
            "player_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    waiting = received_payload(p2_client, "battle_v2_lobby")

    assert waiting["status"] == "waiting"
    assert "human-disconnect" not in web_app.battle_v2_manager.rooms


def test_reset_room_clears_waiting_v2_pvp_lobby(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client_with_player("p1")
    client.emit("join_room", {"room_id": "human-reset", "player_name": "P1"})
    client.get_received()
    client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-reset",
            "player_name": "P1",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
        },
    )
    assert received_payload(client, "battle_v2_lobby")["status"] == "waiting"

    client.emit("reset_room")

    assert "human-reset" not in web_app.v2_pvp_lobbies
    assert "human-reset" not in web_app.battle_v2_manager.rooms


def test_battle_v2_human_confirm_does_not_run_cpu_turn(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")
    for client, player_id, team in [
        (p1_client, "P1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]),
        (p2_client, "P2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
    ]:
        client.emit(
            "battle_v2_join_pvp",
            {
                "room_id": "human-turns",
                "player_name": player_id,
                "player_team": team,
            },
        )
    p1_client.get_received()
    p2_client.get_received()
    state = web_app.battle_v2_manager.get_state("human-turns")
    state.players["p1"].energy[EnergyType.GREEN] = 1

    p1_client.emit(
        "battle_v2_submit_plan",
        {
            "actions": [
                {
                    "id": "a1",
                    "caster_slot": 0,
                    "skill_id": "divergent_fist",
                    "target_player_id": "p2",
                    "target_slot": 0,
                }
            ]
        },
    )
    p1_client.get_received()

    p1_client.emit("battle_v2_confirm_queue", {})
    update = received_payload(p1_client, "battle_v2_update")

    assert update["turn_player_id"] == "p2"
    assert update["players"]["p2"]["team"][0]["hp"] == 80
    assert update["phase"] == "planning"
