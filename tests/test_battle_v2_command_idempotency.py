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
            {"id": "p2", "name": "P2", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
        ],
    )
    return manager


def test_successful_versioned_command_advances_revision_once_and_retry_is_idempotent():
    manager = manager_with_match()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 2
    payload = {"source": "green", "target": "red"}

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
    state.players["p1"].energy[EnergyType.GREEN] = 2
    before = deepcopy(manager.serialize_for_player("room", "p1"))

    with pytest.raises(BattleV2Error, match="stale state revision"):
        manager.execute_player_command(
            "room", "p1", "convert_energy", 99, "retryable", {"source": "green", "target": "red"}
        )

    assert manager.serialize_for_player("room", "p1") == before
    assert manager.execute_player_command(
        "room", "p1", "convert_energy", 0, "retryable", {"source": "green", "target": "red"}
    ) is False


def test_nonce_reuse_with_different_payload_is_rejected_atomically():
    manager = manager_with_match()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 2
    manager.execute_player_command(
        "room", "p1", "convert_energy", 0, "same-nonce", {"source": "green", "target": "red"}
    )
    before = deepcopy(manager.serialize_for_player("room", "p1"))

    with pytest.raises(BattleV2Error, match="different command"):
        manager.execute_player_command("room", "p1", "end_turn", 1, "same-nonce", {})

    assert manager.serialize_for_player("room", "p1") == before


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
