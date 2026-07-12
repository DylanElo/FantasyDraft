import pytest

from jjk_arena.battle_v2.conditions import has_status
from jjk_arena.battle_v2.models import BattleState, CharacterState, DurationClock, EnergyType, PendingAction, PlayerState, SkillClass, StatusEffect, StatusFamily
from jjk_arena.battle_v2.resolver import finish_turn, resolve_queue
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_ROSTER, FIRST_CREATION_SKILLS_BY_ID


def sequence_state(p1_ids, p2_ids, seed=11):
    p1 = PlayerState("p1", "P1", team=[CharacterState(cid, cid) for cid in p1_ids])
    p2 = PlayerState("p2", "P2", team=[CharacterState(cid, cid) for cid in p2_ids])
    for player in (p1, p2):
        for energy in player.energy:
            player.energy[energy] = 20
    return BattleState({"p1": p1, "p2": p2}, "p1", rng_seed=seed)


def act(state, player_id, caster_slot, skill_id, target_player_id, target_slot=None, target_slots=None, **extra):
    skill = FIRST_CREATION_SKILLS_BY_ID[skill_id]
    action = PendingAction(
        f"{player_id}:{skill_id}", player_id, caster_slot, skill_id, target_player_id,
        target_slot, target_slots or [], [EnergyType.GREEN for cost in skill.cost if cost == EnergyType.BLACK], 0,
        **extra,
    )
    state.pending_actions[player_id] = [action]
    state.queue_order[player_id] = [action.id]
    return resolve_queue(state, player_id, FIRST_CREATION_SKILLS_BY_ID)


def mark(character, status_id, player_id="p1", slot=0, stacks=1, families=None, clock=DurationClock.TARGET_TURN, **payload):
    character.statuses.append(StatusEffect(status_id, status_id.title(), player_id, slot, "p2", 0, 2, stacks=stacks, payload=payload, duration_clock=clock, families=families or [StatusFamily.MARK]))


def test_all_78_skills_use_typed_non_global_setup_clocks_and_families():
    skills = [skill for character in FIRST_CREATION_ROSTER.values() for skill in character.skills]
    assert len(skills) == 78
    statuses = [effect for skill in skills for effect in skill.effects if effect.type in {"apply_status", "apply_team_status"}]
    assert statuses
    assert all(effect.payload.get("duration_clock") in {"source_turn", "target_turn", "round"} for effect in statuses)
    assert all(effect.payload.get("families") for effect in statuses)


@pytest.mark.parametrize("watcher_skill,watcher_id", [
    ("fc_momo_nishimiya_aerial_scout", "momo_nishimiya"),
    ("fc_mei_mei_young_crow_scout", "mei_mei_young"),
])
def test_watchers_follow_selected_enemy_character_across_full_turn(watcher_skill, watcher_id):
    state = sequence_state([watcher_id, "ally", "ally2"], ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"])
    act(state, "p1", 0, watcher_skill, "p2", 1)
    watcher = state.players["p1"].team[0]
    watch = next(status for status in watcher.statuses if status.payload.get("watch_target_slot") is not None)
    assert watch.payload["watch_target_player_id"] == "p2" and watch.payload["watch_target_slot"] == 1
    before = sum(state.players["p1"].energy.values())

    first = FIRST_CREATION_SKILLS_BY_ID["fc_yuji_itadori_divergent_fist"]
    second = FIRST_CREATION_SKILLS_BY_ID["fc_megumi_fushiguro_divine_dogs"]
    actions = [
        PendingAction("wrong", "p2", 0, first.id, "p1", 1, wildcard_pays=[]),
        PendingAction("watched", "p2", 1, second.id, "p1", 1, wildcard_pays=[]),
    ]
    state.pending_actions["p2"] = actions
    state.queue_order["p2"] = [action.id for action in actions]
    resolve_queue(state, "p2", FIRST_CREATION_SKILLS_BY_ID)

    assert sum(state.players["p1"].energy.values()) == before + 1
    assert not has_status(watcher, watch.id)


def test_six_eyes_converts_watcher_into_separate_future_buff():
    state = sequence_state(["satoru_gojo_young", "ally", "ally2"], ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"])
    act(state, "p1", 0, "fc_satoru_gojo_young_six_eyes_read", "p2", 1)
    act(state, "p2", 1, "fc_megumi_fushiguro_divine_dogs", "p1", 1)
    gojo = state.players["p1"].team[0]
    assert not has_status(gojo, "six_eyes_read")
    assert has_status(gojo, "six_eyes_insight")
    events = act(state, "p1", 0, "fc_satoru_gojo_young_lapse_blue", "p2", 0)
    assert next(event for event in events if event.type == "damage").payload["amount"] == 30
    assert not has_status(gojo, "six_eyes_insight")


def test_geto_replacement_revokes_immediately_below_three_stacks():
    state = sequence_state(["suguru_geto_young", "ally", "ally2"], ["enemy", "enemy2", "enemy3"])
    geto = state.players["p1"].team[0]
    mark(geto, "curse_stock", "p1", stacks=3, families=[StatusFamily.BUFF], max_stacks=3, unlock_replacements_at_stacks=3, skill_replacements={"fc_suguru_geto_young_swarm_curse": "fc_suguru_geto_young_compressed_uzumaki"})
    from jjk_arena.battle_v2.effects import _apply_status_side_effects
    _apply_status_side_effects(geto, geto.statuses[-1])
    assert geto.skill_replacements
    act(state, "p1", 0, "fc_suguru_geto_young_hookworm_curse", "p2", 0)
    assert geto.statuses[0].stacks == 2
    assert geto.skill_replacements == {}


def test_kamo_drain_is_seeded_random_and_exactly_once():
    drained_colors = set()
    for seed in range(12):
        state = sequence_state(["noritoshi_kamo", "ally", "ally2"], ["enemy", "enemy2", "enemy3"], seed)
        target = state.players["p2"].team[0]
        mark(target, "blood_mark")
        events = act(state, "p1", 0, "fc_noritoshi_kamo_crimson_binding", "p2", 0)
        assert not any(event.type == "energy_drained" for event in events)
        events = finish_turn(state, "p2")
        drains = [event for event in events if event.type == "energy_drained"]
        assert len(drains) == 1
        drained_colors.add(drains[0].payload["energy"])
        assert not has_status(target, "blood_mark_drain")
        assert not any(event.type == "energy_drained" for event in finish_turn(state, "p1"))
    assert len(drained_colors) > 1


def test_todo_redirect_uses_selected_alternate_and_no_redirect_payoff_is_exclusive():
    state = sequence_state(["aoi_todo", "ally", "ally2"], ["yuji_itadori", "enemy2", "enemy3"])
    act(state, "p1", 0, "fc_aoi_todo_boogie_woogie", "p2", 0, alternate_target_player_id="p1", alternate_target_slot=2)
    act(state, "p2", 0, "fc_yuji_itadori_divergent_fist", "p1", 1)
    assert state.players["p1"].team[2].hp == 80
    assert state.players["p1"].team[1].hp == 100
    assert not has_status(state.players["p1"].team[0], "boogie_woogie_guard")

    state = sequence_state(["aoi_todo", "ally", "ally2"], ["yuji_itadori", "enemy2", "enemy3"])
    act(state, "p1", 0, "fc_aoi_todo_boogie_woogie", "p2", 0, alternate_target_player_id="p1", alternate_target_slot=2)
    finish_turn(state, "p2")
    assert has_status(state.players["p1"].team[0], "boogie_woogie_guard")


def test_miwa_counter_only_consumes_on_melee():
    state = sequence_state(["kasumi_miwa", "ally", "ally2"], ["megumi_fushiguro", "yuji_itadori", "enemy3"])
    act(state, "p1", 0, "fc_kasumi_miwa_simple_domain_batto_stance", "p1", 0)
    act(state, "p2", 0, "fc_megumi_fushiguro_divine_dogs", "p1", 0)
    assert has_status(state.players["p1"].team[0], "simple_domain")
    state.turn_player_id = "p2"
    state.players["p2"].team[1].acted_this_turn = False
    events = act(state, "p2", 1, "fc_yuji_itadori_divergent_fist", "p1", 0)
    assert any(event.type == "skill_countered" for event in events)
    assert not has_status(state.players["p1"].team[0], "simple_domain")


def test_venom_bloom_primary_secondary_and_no_poison_team_branch():
    state = sequence_state(["junpei_yoshino", "ally", "ally2"], ["enemy", "enemy2", "enemy3"])
    mark(state.players["p2"].team[1], "poison", families=[StatusFamily.AFFLICTION], turn_end_damage=10)
    events = act(state, "p1", 0, "fc_junpei_yoshino_venom_bloom", "p2", 1, [1, 2], secondary_target_slot=2)
    assert next(event for event in events if event.type == "damage").payload["target_slot"] == 1
    assert has_status(state.players["p2"].team[2], "poison")
    assert not has_status(state.players["p2"].team[0], "poison")

    state = sequence_state(["junpei_yoshino", "ally", "ally2"], ["enemy", "enemy2", "enemy3"])
    act(state, "p1", 0, "fc_junpei_yoshino_venom_bloom", "p2", None, [0, 1, 2])
    assert all(has_status(enemy, "poison") for enemy in state.players["p2"].team)


def test_divergent_fist_existing_soul_bruise_triggers_once_and_is_consumed():
    state = sequence_state(["yuji_itadori", "ally", "ally2"], ["enemy", "enemy2", "enemy3"])
    target = state.players["p2"].team[0]
    mark(target, "soul_bruise", families=[StatusFamily.SOUL, StatusFamily.MARK], turn_end_damage=10)
    events = act(state, "p1", 0, "fc_yuji_itadori_divergent_fist", "p2", 0)
    assert sum(event.payload.get("amount", 0) for event in events if event.type == "damage") == 30
    assert not has_status(target, "soul_bruise")
    hp = target.hp
    finish_turn(state, "p2")
    assert target.hp == hp


def test_cleanse_removes_affliction_or_soul_but_preserves_other_hostile_debuffs():
    state = sequence_state(["yuta_okkotsu_jjk0", "ally", "ally2"], ["enemy", "enemy2", "enemy3"])
    ally = state.players["p1"].team[1]
    ally.statuses.extend([
        StatusEffect("poison", "Poison", "p2", 0, "p1", 1, 2, families=[StatusFamily.AFFLICTION]),
        StatusEffect("attack_down", "Attack Down", "p2", 0, "p1", 1, 2, families=[StatusFamily.DEBUFF], payload={"damage_output_delta": -10}),
    ])
    act(state, "p1", 0, "fc_yuta_okkotsu_jjk0_reverse_cursed_technique", "p1", 1)
    assert not has_status(ally, "poison")
    assert has_status(ally, "attack_down")
