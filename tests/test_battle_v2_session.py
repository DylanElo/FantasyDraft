import pytest

from jjk_bot.battle_v2.models import SkillClass, StatusEffect
from jjk_bot.battle_v2.session import BattleV2RoomManager, BattleV2SessionError


def player_one():
    return {
        "id": "p1",
        "name": "Player One",
        "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
    }


def player_two():
    return {
        "id": "p2",
        "name": "Player Two",
        "team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
    }


def start_manager():
    manager = BattleV2RoomManager(rng_seed=1)
    state = manager.start_classic_match("room", [player_one(), player_two()])
    return manager, state


def give_all_energy(manager):
    state = manager.get_state("room")
    for player in state.players.values():
        for energy in player.energy:
            player.energy[energy] = 5


def test_start_classic_match_serializes_initial_private_view():
    manager, serialized = start_manager()

    assert serialized["turn_player_id"] == "p1"
    assert serialized["phase"] == "planning"
    assert list(serialized["players"]) == ["p1", "p2"]
    assert serialized["players"]["p1"]["team"][0]["character_id"] == "yuji_itadori"
    assert sum(serialized["players"]["p1"]["energy"].values()) == 1
    assert manager.get_state("room").turn_player_id == "p1"


def test_invisible_status_hidden_from_opponent_but_visible_to_owner():
    manager, _ = start_manager()
    state = manager.get_state("room")
    megumi = state.players["p1"].team[2]
    megumi.statuses.append(
        StatusEffect(
            "rabbit_escape",
            "Rabbit Escape",
            "p1",
            2,
            "p1",
            2,
            duration=2,
            classes=[SkillClass.INVISIBLE],
            invisible=True,
            payload={"counter": "first_harmful_non_domain"},
        )
    )

    owner_view = manager.serialize_for_player("room", "p1")
    opponent_view = manager.serialize_for_player("room", "p2")

    assert owner_view["players"]["p1"]["team"][2]["statuses"][0]["id"] == "rabbit_escape"
    assert opponent_view["players"]["p1"]["team"][2]["statuses"] == []


def test_submit_update_confirm_queue_resolves_and_advances_turn():
    manager, _ = start_manager()
    give_all_energy(manager)

    manager.submit_plan(
        "room",
        "p1",
        [
            {
                "id": "a1",
                "caster_slot": 0,
                "skill_id": "divergent_fist",
                "target_player_id": "p2",
                "target_slot": 0,
            },
            {
                "id": "a2",
                "caster_slot": 1,
                "skill_id": "resonance",
                "target_player_id": "p2",
                "target_slot": 1,
            },
        ],
    )
    state = manager.get_state("room")
    state.players["p2"].team[1].statuses.append(
        StatusEffect("nail_mark", "Nail Mark", "p1", 1, "p2", 1, duration=2)
    )
    manager.update_queue("room", "p1", ["a2", "a1"], {"a2": ["red"]})
    serialized = manager.confirm_queue("room", "p1")

    assert serialized["turn_player_id"] == "p2"
    assert serialized["phase"] == "planning"
    assert serialized["players"]["p2"]["team"][0]["hp"] == 80
    assert serialized["players"]["p2"]["team"][1]["hp"] == 70
    assert serialized["pending_actions"]["p1"] == []


def test_invalid_queue_update_does_not_mutate_saved_actions():
    manager, _ = start_manager()
    give_all_energy(manager)
    manager.submit_plan(
        "room",
        "p1",
        [
            {
                "id": "a1",
                "caster_slot": 0,
                "skill_id": "black_flash",
                "target_player_id": "p2",
                "target_slot": 0,
            }
        ],
    )
    before = manager.serialize_for_player("room", "p1")["pending_actions"]["p1"][0]

    with pytest.raises(BattleV2SessionError):
        manager.update_queue("room", "p1", ["a1"], {"a1": ["black"]})

    after = manager.serialize_for_player("room", "p1")["pending_actions"]["p1"][0]
    assert after == before


def test_cancel_queue_returns_to_planning():
    manager, _ = start_manager()
    give_all_energy(manager)
    manager.submit_plan(
        "room",
        "p1",
        [
            {
                "id": "a1",
                "caster_slot": 0,
                "skill_id": "divergent_fist",
                "target_player_id": "p2",
                "target_slot": 0,
            }
        ],
    )

    serialized = manager.cancel_queue("room", "p1")

    assert serialized["phase"] == "planning"
    assert serialized["pending_actions"]["p1"] == []
    assert serialized["queue_order"]["p1"] == []
