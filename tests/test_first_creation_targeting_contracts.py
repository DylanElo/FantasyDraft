"""Dedicated targeting-contract tests for the 11 First Creation skills flagged
by jjk_arena/battle_v2/skill_audit.py as having non-trivial (ally/ally_team/
enemy_team) targeting with no test beyond the blanket parametrized one.

Each test verifies the skill actually distributes its effect(s) to the
correct slot(s) -- not just "a meaningful event happened somewhere", which is
all the blanket test checks.
"""

from jjk_arena.battle_v2.models import BattleState, CharacterState, DurationClock, EnergyType, PendingAction, PlayerState, StatusEffect
from jjk_arena.battle_v2.resolver import resolve_queue
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_ROSTER, FIRST_CREATION_SKILLS_BY_ID


def active_status(status_id, player_id, slot=0, stacks=1):
    return StatusEffect(status_id, status_id.replace("_", " ").title(), player_id, slot, player_id, slot, 4, stacks=stacks)


def execution_state(character_id):
    caster = CharacterState(character_id, FIRST_CREATION_ROSTER[character_id].name)
    allies = [CharacterState("ally_one", "Ally One", hp=60), CharacterState("ally_two", "Ally Two", hp=60)]
    enemies = [CharacterState(f"enemy_{index}", f"Enemy {index}", hp=100) for index in range(3)]
    p1 = PlayerState("p1", "P1", team=[caster, *allies])
    p2 = PlayerState("p2", "P2", team=enemies)
    for player in (p1, p2):
        for energy in player.energy:
            player.energy[energy] = 20
    return BattleState({"p1": p1, "p2": p2}, "p1", rng_seed=17)


def act(state, skill_id, target_player_id, target_slot=None, target_slots=None):
    skill = FIRST_CREATION_SKILLS_BY_ID[skill_id]
    action = PendingAction(
        "execute", "p1", 0, skill_id, target_player_id, target_slot,
        target_slots=target_slots or [],
        wildcard_pays=[EnergyType.GREEN for energy in skill.cost if energy == EnergyType.BLACK],
    )
    state.pending_actions["p1"] = [action]
    state.queue_order["p1"] = [action.id]
    return resolve_queue(state, "p1", FIRST_CREATION_SKILLS_BY_ID)


def has_status(character, status_id):
    return any(status.id == status_id and status.duration != 0 for status in character.statuses)


def test_shadow_retreat_targets_the_chosen_ally_not_the_caster():
    state = execution_state("megumi_fushiguro")
    act(state, "fc_megumi_fushiguro_shadow_retreat", "p1", target_slot=1)

    caster, ally = state.players["p1"].team[0], state.players["p1"].team[1]
    assert has_status(ally, "shadow_retreat")
    assert not has_status(caster, "shadow_retreat")


def test_hairpin_hits_every_selected_nail_marked_enemy_and_consumes_nail():
    # enemy_team("nail") enforces that every selected target already carries
    # Nail; selecting all 3 marked enemies means each takes the base 15
    # (single_target_amount=25 only applies when exactly one target is chosen).
    state = execution_state("nobara_kugisaki")
    for slot in (0, 1, 2):
        state.players["p2"].team[slot].statuses.append(active_status("nail", "p2", slot=slot))

    act(state, "fc_nobara_kugisaki_hairpin", "p2", target_slots=[0, 1, 2])

    for character in state.players["p2"].team:
        assert character.hp == 100 - 15
        assert not has_status(character, "nail")


def test_hairpin_single_target_selection_deals_bonus_damage():
    state = execution_state("nobara_kugisaki")
    state.players["p2"].team[1].statuses.append(active_status("nail", "p2", slot=1))

    act(state, "fc_nobara_kugisaki_hairpin", "p2", target_slots=[1])

    assert state.players["p2"].team[1].hp == 100 - 25
    assert not has_status(state.players["p2"].team[1], "nail")


def test_spear_sweep_damages_and_disarms_all_three_enemies():
    state = execution_state("maki_zenin")
    act(state, "fc_maki_zenin_spear_sweep", "p2", target_slots=[0, 1, 2])

    for character in state.players["p2"].team:
        assert character.hp == 100 - 15
        assert has_status(character, "disarmed")


def test_useful_retreat_makes_miwa_untargetable_and_conditionally_buffs_the_ally():
    state = execution_state("kasumi_miwa")
    caster, ally = state.players["p1"].team[0], state.players["p1"].team[1]

    act(state, "fc_kasumi_miwa_useful_retreat", "p1", target_slot=1)
    assert has_status(caster, "useful_retreat")
    assert not has_status(ally, "simple_domain_support")

    state2 = execution_state("kasumi_miwa")
    caster2, ally2 = state2.players["p1"].team[0], state2.players["p1"].team[1]
    caster2.statuses.append(active_status("simple_domain", "p1"))
    act(state2, "fc_kasumi_miwa_useful_retreat", "p1", target_slot=1)
    assert has_status(ally2, "simple_domain_support")
    assert not has_status(caster2, "simple_domain_support")


def test_shikigami_veil_extends_poison_only_on_the_selected_poisoned_enemies():
    # enemy_team("poison") enforces that every selected target already
    # carries Poison, so only the two marked slots (0 and 2) can be selected.
    state = execution_state("junpei_yoshino")
    for slot in (0, 2):
        status = active_status("poison", "p2", slot=slot)
        status.duration = 1
        status.duration_clock = DurationClock.TARGET_TURN
        state.players["p2"].team[slot].statuses.append(status)

    act(state, "fc_junpei_yoshino_shikigami_veil", "p2", target_slots=[0, 2])

    caster = state.players["p1"].team[0]
    assert has_status(caster, "shikigami_veil")
    assert state.players["p2"].team[0].statuses[0].duration == 2
    assert state.players["p2"].team[2].statuses[0].duration == 2
    assert not state.players["p2"].team[1].statuses


def test_rainbow_dragon_guard_shields_the_ally_and_reduction_needs_two_curse_stock():
    state = execution_state("suguru_geto_young")
    ally = state.players["p1"].team[1]

    act(state, "fc_suguru_geto_young_rainbow_dragon_guard", "p1", target_slot=1)
    assert has_status(ally, "rainbow_dragon_guard")
    assert not has_status(ally, "rainbow_dragon_reduction")

    state2 = execution_state("suguru_geto_young")
    ally2 = state2.players["p1"].team[1]
    state2.players["p1"].team[0].statuses.append(active_status("curse_stock", "p1", stacks=2))
    act(state2, "fc_suguru_geto_young_rainbow_dragon_guard", "p1", target_slot=1)
    assert has_status(ally2, "rainbow_dragon_reduction")


def test_curse_screen_hides_geto_and_conditionally_shields_the_ally_and_consumes_a_stock():
    state = execution_state("suguru_geto_young")
    caster, ally = state.players["p1"].team[0], state.players["p1"].team[1]
    caster.statuses.append(active_status("curse_stock", "p1", stacks=2))

    act(state, "fc_suguru_geto_young_curse_screen", "p1", target_slot=1)

    assert has_status(caster, "curse_screen")
    assert has_status(ally, "curse_screen_guard")
    stock = next(status for status in caster.statuses if status.id == "curse_stock")
    assert stock.stacks == 1


def test_reverse_cursed_treatment_heals_the_chosen_ally_not_the_caster():
    state = execution_state("shoko_ieiri_young")
    state.players["p1"].team[0].hp = 50
    state.players["p1"].team[1].hp = 40

    act(state, "fc_shoko_ieiri_young_reverse_cursed_treatment", "p1", target_slot=1)

    assert state.players["p1"].team[0].hp == 50
    assert state.players["p1"].team[1].hp == 65


def test_emergency_step_reduces_damage_only_for_allies_below_35_hp():
    state = execution_state("shoko_ieiri_young")
    caster, low_ally, high_ally = state.players["p1"].team
    caster.hp = 30
    low_ally.hp = 20
    high_ally.hp = 60

    act(state, "fc_shoko_ieiri_young_emergency_step", "p1", target_slots=[0, 1, 2])

    assert has_status(caster, "emergency_step")
    assert has_status(caster, "emergency_reduction")
    assert has_status(low_ally, "emergency_reduction")
    assert not has_status(high_ally, "emergency_reduction")


def test_solo_solo_kinku_buffs_the_chosen_ally_not_the_caster():
    state = execution_state("utahime_iori_young")
    caster, ally = state.players["p1"].team[0], state.players["p1"].team[1]

    act(state, "fc_utahime_iori_young_solo_solo_kinku", "p1", target_slot=1)

    assert has_status(ally, "solo_solo_kinku")
    assert not has_status(caster, "solo_solo_kinku")


def test_curtain_step_gives_the_chosen_ally_destructible_defense_when_ritual_rhythm_is_active():
    state = execution_state("utahime_iori_young")
    caster, ally = state.players["p1"].team[0], state.players["p1"].team[1]
    caster.statuses.append(active_status("ritual_rhythm", "p1"))

    act(state, "fc_utahime_iori_young_curtain_step", "p1", target_slot=1)

    assert has_status(caster, "curtain_step")
    assert has_status(ally, "ritual_guard"), (
        "Curtain Step's flavor text says it 'gives an ally 10 destructible "
        "defense', but the effect must actually target the chosen ally slot, "
        "not the caster."
    )
