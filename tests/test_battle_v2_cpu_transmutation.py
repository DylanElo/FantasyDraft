import pytest

from jjk_arena.battle_v2.manager import BattleV2Manager, _cpu_feasible_cost_queues
from jjk_arena.battle_v2.models import EnergyType


HUMAN_TEAM = ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]
CPU_TEAM = ["satoru_gojo_young", "suguru_geto_young", "shoko_ieiri_young"]


def wrong_color_cpu_manager(difficulty: str) -> BattleV2Manager:
    manager = BattleV2Manager(rng_seed=17)
    manager.start_first_creation_match(
        "cpu-transmutation",
        [
            {"id": "human", "name": "Human", "team": HUMAN_TEAM},
            {"id": "cpu", "name": "CPU", "team": CPU_TEAM},
        ],
        difficulty=difficulty,
    )
    state = manager.get_state("cpu-transmutation")
    state.turn_player_id = "cpu"
    cpu = state.players["cpu"]
    cpu.energy = {energy: 0 for energy in EnergyType}
    cpu.energy[EnergyType.RED] = 5

    # Keep the corpus intentionally narrow: Young Gojo is the only living
    # caster, so Bloodline cannot pay any legal action while one Jujutsu pip
    # immediately unlocks Lapse Blue.
    for teammate in cpu.team[1:]:
        teammate.hp = 0
        teammate.alive = False
    return manager


@pytest.mark.parametrize("difficulty", ["easy", "normal", "hard"])
def test_cpu_transmutes_wrong_color_pool_only_when_it_unlocks_a_useful_queue(difficulty):
    manager = wrong_color_cpu_manager(difficulty)

    result = manager.take_cpu_turn("cpu-transmutation", "cpu")

    conversion = next(event for event in result["event_log"] if event["type"] == "energy_converted")
    assert conversion["payload"]["sources"] == {"red": 5}
    assert conversion["payload"]["target"] == "blue"
    assert conversion["payload"]["pool_before"] == {
        "green": 0,
        "red": 5,
        "blue": 0,
        "white": 0,
    }
    assert conversion["payload"]["pool_after"] == {
        "green": 0,
        "red": 0,
        "blue": 1,
        "white": 0,
    }
    assert any(
        event["type"] == "skill_resolved" and event["message"].endswith("used Lapse Blue")
        for event in result["event_log"]
    )
    assert result["players"]["human"]["team"][0]["hp"] == 80


@pytest.mark.parametrize("difficulty", ["easy", "normal", "hard"])
def test_cpu_never_spends_five_energy_when_no_conversion_enables_an_action(difficulty):
    manager = wrong_color_cpu_manager(difficulty)
    state = manager.get_state("cpu-transmutation")
    caster = state.players["cpu"].team[0]
    caster.cooldowns = {skill_id: 9 for skill_id in caster.base_skill_ids}

    result = manager.take_cpu_turn("cpu-transmutation", "cpu")

    assert not any(event["type"] == "energy_converted" for event in result["event_log"])
    assert any(event["type"] == "turn_skipped" for event in result["event_log"])


def test_hard_cpu_transmutation_choice_is_seed_deterministic():
    payloads = []
    for _ in range(2):
        manager = wrong_color_cpu_manager("hard")
        result = manager.take_cpu_turn("cpu-transmutation", "cpu")
        payloads.append(next(
            event["payload"]
            for event in result["event_log"]
            if event["type"] == "energy_converted"
        ))

    assert payloads[0] == payloads[1]


def test_cost_filter_keeps_shared_color_multi_caster_queue_unlocks():
    manager = wrong_color_cpu_manager("normal")
    state = manager.get_state("cpu-transmutation")
    player = state.players["human"]
    player.energy = {energy: 0 for energy in EnergyType}
    player.energy.update({
        EnergyType.GREEN: 4,
        EnergyType.RED: 1,
        EnergyType.BLUE: 1,
        EnergyType.WHITE: 1,
    })
    baseline = _cpu_feasible_cost_queues(
        state,
        "human",
        manager._roster_for_room("cpu-transmutation"),
        manager._skills_for_room("cpu-transmutation"),
    )

    player.energy[EnergyType.GREEN] = 0
    player.energy[EnergyType.RED] = 0
    player.energy[EnergyType.BLUE] = 2
    candidate = _cpu_feasible_cost_queues(
        state,
        "human",
        manager._roster_for_room("cpu-transmutation"),
        manager._skills_for_room("cpu-transmutation"),
    )
    shared_jujutsu_queue = (
        None,
        "fc_megumi_fushiguro_divine_dogs",
        "fc_nobara_kugisaki_nail_barrage",
    )

    assert shared_jujutsu_queue not in baseline
    assert shared_jujutsu_queue in candidate
