import random

import pytest

from jjk_arena.battle_v2.manager import BattleV2Error, BattleV2Manager
from jjk_arena.battle_v2.models import EnergyType
from jjk_arena.battle_v2.replay import authoritative_state_hash, run_replay
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_ROSTER


PLAYERS = [
    {"id": "p1", "name": "P1", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    {"id": "p2", "name": "P2", "team": ["maki_zenin", "panda", "mai_zenin"]},
]


def manager_with_energy(*, capture_replays=False, add_energy=True):
    manager = BattleV2Manager(rng_seed=31, clock=lambda: 0.0, capture_replays=capture_replays)
    manager.start_first_creation_match("room", PLAYERS)
    if add_energy:
        for energy in manager.get_state("room").players["p1"].energy:
            manager.get_state("room").players["p1"].energy[energy] = 9
    return manager


def test_opt_in_capture_records_only_successful_commands_and_replays_exactly():
    manager = manager_with_energy(capture_replays=True, add_energy=False)
    manager.execute_player_command("room", "p1", "end_turn", 0, "turn-1", {})
    manager.execute_player_command("room", "p2", "cpu_turn", 1, "cpu-1", {})

    document = manager.replay_document("room")
    replayed = run_replay(document)

    assert len(document["commands"]) == 2
    assert document["commands"][1]["command"] == "cpu_turn"
    assert replayed["final_state_hash"] == document["final_state_hash"]


def test_rejected_command_is_atomic_and_absent_from_capture():
    manager = manager_with_energy(capture_replays=True)
    before = authoritative_state_hash(manager.get_state("room"))

    with pytest.raises(BattleV2Error):
        manager.execute_player_command("room", "p1", "end_turn", 99, "bad", {})

    assert authoritative_state_hash(manager.get_state("room")) == before
    assert manager.replay_document("room")["commands"] == []


def test_deterministic_adversarial_command_corpus_never_mutates_or_escapes_as_raw_error():
    manager = manager_with_energy()
    state = manager.get_state("room")
    rng = random.Random(20260712)
    invalid_actions = [
        {"id": "", "caster_slot": 0, "skill_id": "fc_yuji_itadori_divergent_fist", "target_player_id": "p2", "target_slot": 0},
        {"id": "x", "caster_slot": 9, "skill_id": "fc_yuji_itadori_divergent_fist", "target_player_id": "p2", "target_slot": 0},
        {"id": "x", "caster_slot": 0, "skill_id": "fc_suguru_geto_young_swarm_curse", "target_player_id": "p2", "target_slot": 0},
        {"id": "x", "caster_slot": 0, "skill_id": "fc_yuji_itadori_divergent_fist", "target_player_id": "p2", "target_slot": 9},
        {"id": "x", "caster_slot": 0, "skill_id": "fc_yuji_itadori_divergent_fist", "target_player_id": "p2", "target_slot": 0, "target_slots": [0, 0]},
    ]
    for index in range(100):
        before = authoritative_state_hash(state)
        action = dict(rng.choice(invalid_actions))
        action["id"] = action["id"] or ""
        with pytest.raises(BattleV2Error):
            manager.execute_player_command(
                "room", "p1", "submit_plan", 0, f"bad-{index}", {"actions": [action]}
            )
        state = manager.get_state("room")
        assert authoritative_state_hash(state) == before
        assert state.state_revision == 0


def test_cpu_legal_action_stress_covers_all_first_creation_characters():
    roster_ids = list(FIRST_CREATION_ROSTER)
    seen = set()
    for index in range(0, len(roster_ids), 3):
        team_a = (roster_ids[index:index + 3] + roster_ids[:3])[:3]
        team_b = (roster_ids[index + 3:index + 6] + roster_ids[3:6])[:3]
        seen.update(team_a)
        seen.update(team_b)
        manager = BattleV2Manager(rng_seed=index + 1, clock=lambda: 0.0)
        manager.start_first_creation_match(
            f"cpu-{index}",
            [
                {"id": "p1", "name": "P1", "team": team_a},
                {"id": "p2", "name": "P2", "team": team_b},
            ],
        )
        for _ in range(12):
            state = manager.get_state(f"cpu-{index}")
            if state.winner_id:
                break
            manager.take_cpu_turn(f"cpu-{index}", state.turn_player_id)
            assert state.pending_actions.get(state.turn_player_id, []) == []

    assert seen == set(FIRST_CREATION_ROSTER)
