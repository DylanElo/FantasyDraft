from copy import deepcopy

import pytest

from jjk_arena.battle_v2.manager import BattleV2Error, BattleV2Manager
from jjk_arena.battle_v2.models import EnergyType


def manager_with_match() -> BattleV2Manager:
    manager = BattleV2Manager(rng_seed=7)
    manager.start_classic_match(
        "room",
        [
            {"id": "p1", "name": "P1", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
            {"id": "p2", "name": "P2", "team": ["satoru_gojo_young", "maki_zenin", "panda"]},
        ],
    )
    return manager


def test_successful_versioned_command_advances_revision_once_and_retry_is_idempotent():
    manager = manager_with_match()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 5
    payload = {"sources": ["green"] * 5, "target": "red"}

    replayed = manager.execute_player_command("room", "p1", "convert_energy", 0, "nonce-1", payload)
    first_snapshot = deepcopy(manager.serialize_for_player("room", "p1"))
    retried = manager.execute_player_command("room", "p1", "convert_energy", 0, "nonce-1", payload)

    assert replayed is False
    assert retried is True
    assert manager.serialize_for_player("room", "p1") == first_snapshot
    assert first_snapshot["state_revision"] == 1
    assert first_snapshot["players"]["p1"]["energy"]["green"] == 0
    assert first_snapshot["players"]["p1"]["energy"]["red"] == 1


def test_stale_revision_is_rejected_without_mutating_state_or_burning_nonce():
    manager = manager_with_match()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 5
    before = deepcopy(manager.serialize_for_player("room", "p1"))

    with pytest.raises(BattleV2Error, match="stale state revision"):
        manager.execute_player_command(
            "room", "p1", "convert_energy", 99, "retryable", {"sources": ["green"] * 5, "target": "red"}
        )

    assert manager.serialize_for_player("room", "p1") == before
    assert manager.execute_player_command(
        "room", "p1", "convert_energy", 0, "retryable", {"sources": ["green"] * 5, "target": "red"}
    ) is False


def test_nonce_reuse_with_different_payload_is_rejected_atomically():
    manager = manager_with_match()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 5
    manager.execute_player_command(
        "room", "p1", "convert_energy", 0, "same-nonce", {"sources": ["green"] * 5, "target": "red"}
    )
    before = deepcopy(manager.serialize_for_player("room", "p1"))

    with pytest.raises(BattleV2Error, match="different command"):
        manager.execute_player_command("room", "p1", "end_turn", 1, "same-nonce", {})

    assert manager.serialize_for_player("room", "p1") == before


def test_convert_command_rejects_non_list_sources_without_crashing_or_mutating():
    manager = manager_with_match()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 5
    before = deepcopy(manager.serialize_for_player("room", "p1"))

    with pytest.raises(BattleV2Error, match="exactly 5"):
        manager.execute_player_command(
            "room",
            "p1",
            "convert_energy",
            0,
            "malformed-sources",
            {"sources": "green", "target": "red"},
        )

    assert manager.serialize_for_player("room", "p1") == before
    assert "malformed-sources" not in manager.command_receipts["room"].get("p1", {})


def test_rejected_transmutation_is_atomic_and_same_nonce_can_be_retried():
    manager = manager_with_match()
    state = manager.get_state("room")
    state.players["p1"].energy = {energy: 0 for energy in EnergyType}
    state.players["p1"].energy[EnergyType.GREEN] = 4
    payload = {"sources": ["green"] * 5, "target": "red"}
    before = deepcopy(manager.serialize_for_player("room", "p1"))
    rng_before = manager.rngs["room"].getstate()

    with pytest.raises(BattleV2Error, match="not enough Taijutsu"):
        manager.execute_player_command(
            "room", "p1", "convert_energy", 0, "retry-transmute", payload
        )

    assert manager.serialize_for_player("room", "p1") == before
    assert manager.rngs["room"].getstate() == rng_before
    assert "retry-transmute" not in manager.command_receipts["room"].get("p1", {})

    manager.get_state("room").players["p1"].energy[EnergyType.GREEN] = 5
    assert manager.execute_player_command(
        "room", "p1", "convert_energy", 0, "retry-transmute", payload
    ) is False
    retried = manager.serialize_for_player("room", "p1")
    assert retried["state_revision"] == 1
    assert retried["players"]["p1"]["energy"]["green"] == 0
    assert retried["players"]["p1"]["energy"]["red"] == 1


def test_invalid_command_rolls_back_all_authoritative_state():
    manager = manager_with_match()
    before = deepcopy(manager.serialize_for_player("room", "p1"))

    with pytest.raises(BattleV2Error, match="declared base slot"):
        manager.execute_player_command(
            "room",
            "p1",
            "submit_plan",
            0,
            "bad-plan",
            {"actions": [{
                "id": "bad",
                "caster_slot": 0,
                "skill_id": "cleave",
                "target_player_id": "p2",
                "target_slot": 0,
            }]},
        )

    assert manager.serialize_for_player("room", "p1") == before
    assert "bad-plan" not in manager.command_receipts["room"].get("p1", {})


def test_first_creation_divergent_fist_confirm_is_ordered_and_retry_safe():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match(
        "first",
        [
            {"id": "p1", "name": "P1", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
            {"id": "p2", "name": "P2", "team": ["maki_zenin", "panda", "junpei_yoshino"]},
        ],
    )
    state = manager.get_state("first")
    state.players["p1"].energy = {energy: 0 for energy in EnergyType}
    state.players["p1"].energy[EnergyType.GREEN] = 1
    action = {
        "id": "divergent-fist",
        "caster_slot": 0,
        "skill_id": "fc_yuji_itadori_divergent_fist",
        "target_player_id": "p2",
        "target_slot": 0,
    }

    assert manager.execute_player_command("first", "p1", "submit_plan", 0, "plan", {"actions": [action]}) is False
    assert manager.execute_player_command("first", "p1", "confirm_queue", 1, "confirm", {}) is False
    confirmed = deepcopy(manager.serialize_for_player("first", "p1"))
    assert manager.execute_player_command("first", "p1", "confirm_queue", 1, "confirm", {}) is True

    damage_events = [event for event in confirmed["event_log"] if event["type"] == "damage"]
    assert [event["payload"]["amount"] for event in damage_events] == [20, 10]
    assert confirmed["players"]["p2"]["team"][0]["hp"] == 70
    assert manager.serialize_for_player("first", "p1") == confirmed
    later = manager.end_turn("first", "p2")
    assert later["players"]["p2"]["team"][0]["hp"] == 70
    assert not any(event["type"] == "status_damage" for event in later["event_log"])
