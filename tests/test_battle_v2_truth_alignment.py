import pytest
from pathlib import Path

from jjk_arena.battle_v2.conditions import has_status
from jjk_arena.battle_v2.effects import apply_effect, apply_status
from jjk_arena.battle_v2.models import (
    BattleState, CharacterState, DamageType, EffectSpec, EnergyType, PendingAction,
    PlayerState, SkillClass, SkillSpec, StatusEffect, StatusFamily, TargetRule,
)
from jjk_arena.battle_v2.resolver import ResolverError, _append_energy_gain, resolve_queue, validate_action
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_SKILLS_BY_ID


def state_and_action(skill_id="test", target_slot=0):
    p1 = PlayerState("p1", "P1", team=[CharacterState("caster", "Caster"), CharacterState("ally", "Ally")])
    p2 = PlayerState("p2", "P2", team=[CharacterState("target", "Target")])
    state = BattleState({"p1": p1, "p2": p2}, "p1", rng_seed=7)
    return state, PendingAction("a1", "p1", 0, skill_id, "p2", target_slot)


def status(status_id, source="p2", target_player="p2", target_slot=0, **payload):
    return StatusEffect(status_id, status_id.title(), source, 0, target_player, target_slot, 3, payload=payload)


def test_destroy_defense_first_then_deals_full_hp_damage():
    state, action = state_and_action("combo")
    target = state.players["p2"].team[0]
    target.statuses.append(status("guard", destructible_defense=15))
    event = apply_effect(state, action, EffectSpec("damage", 20, DamageType.NORMAL, payload={"destroy_defense_first": 15}), "p2", 0)
    assert target.hp == 80
    assert event.payload["destroyed_defense"] == 15


def test_target_or_and_caster_side_damage_conditions():
    state, action = state_and_action()
    target = state.players["p2"].team[0]
    caster = state.players["p1"].team[0]
    conditional = EffectSpec("damage", 10, DamageType.PIERCING, payload={"condition_statuses": ["stunned", "exposed"]})
    assert apply_effect(state, action, conditional, "p2", 0).type == "damage_skipped"
    target.statuses.append(status("exposed"))
    assert apply_effect(state, action, conditional, "p2", 0).payload["amount"] == 10
    user_conditional = EffectSpec("damage", 10, payload={"condition_user_status": "gorilla_core"})
    assert apply_effect(state, action, user_conditional, "p2", 0).type == "damage_skipped"
    caster.statuses.append(status("gorilla_core", source="p1", target_player="p1"))
    assert apply_effect(state, action, user_conditional, "p2", 0).type == "damage"


def test_single_target_amount_and_incoming_damage_delta():
    state, action = state_and_action()
    target = state.players["p2"].team[0]
    target.statuses.append(status("revealed", damage_taken_delta=5))
    event = apply_effect(state, action, EffectSpec("damage", 15, DamageType.PIERCING, payload={"single_target_amount": 25}), "p2", 0)
    assert event.payload["attempted_amount"] == 25
    assert event.payload["amount"] == 30


def test_low_hp_defense_and_defense_gain_blocks():
    state, action = state_and_action()
    ally = state.players["p1"].team[1]
    ally.hp = 40
    apply_status(state, action, "p1", 1, EffectSpec("apply_status", status="retreat", payload={"low_hp_destructible_defense": 10}))
    assert ally.statuses[-1].payload["destructible_defense"] == 10
    ally.statuses.append(status("snared", target_player="p1", target_slot=1, block_damage_reduction=True, block_destructible_defense=True))
    blocked = apply_status(state, action, "p1", 1, EffectSpec("apply_status", status="guard", payload={"damage_reduction": 20, "destructible_defense": 20}))
    assert "damage_reduction" not in blocked.payload
    assert "destructible_defense" not in blocked.payload


def test_cannot_target_allies_and_self_cleanse():
    state, action = state_and_action("help")
    caster = state.players["p1"].team[0]
    caster.statuses.append(status("locked", cannot_target_allies=True))
    helpful = SkillSpec("help", "Help", "", [], 0, TargetRule("ally", allow_self=True), [SkillClass.STRATEGIC], [EffectSpec("heal", 10)])
    with pytest.raises(ResolverError, match="cannot use skills that target allies"):
        validate_action(state, PendingAction("a1", "p1", 0, "help", "p1", 1), {"help": helpful})
    poison = status("poison", turn_end_damage=10)
    poison.families = [StatusFamily.AFFLICTION]
    caster.statuses = [poison]
    apply_status(state, action, "p1", 0, EffectSpec("apply_status", status="medicine", payload={"cleanse_self_damage_or_affliction": True}))
    assert not has_status(caster, "poison")
    assert has_status(caster, "medicine")


def test_gorilla_guard_grants_ally_defense_and_melee_guard_punishes_attacker():
    state, action = state_and_action("guard")
    caster = state.players["p1"].team[0]
    caster.statuses.append(status("gorilla_core", source="p1", target_player="p1"))
    apply_effect(state, action, EffectSpec("apply_status", status="guard", target="self", payload={"ally_destructible_defense": 10}), "p1", 0)
    assert state.players["p1"].team[1].statuses[-1].payload["destructible_defense"] == 10

    defender = state.players["p2"].team[0]
    defender.statuses.append(status("hammer_guard", invulnerable=True, punish_melee_status="nail"))
    strike = SkillSpec("strike", "Strike", "", [], 0, TargetRule("enemy"), [SkillClass.PHYSICAL, SkillClass.MELEE, SkillClass.BYPASSING], [EffectSpec("damage", 10)])
    state.pending_actions["p1"] = [PendingAction("a2", "p1", 0, "strike", "p2", 0)]
    state.queue_order["p1"] = ["a2"]
    resolve_queue(state, "p1", {"strike": strike})
    assert has_status(caster, "nail")


def test_known_first_creation_skill_truth_cases():
    panda = FIRST_CREATION_SKILLS_BY_ID["fc_panda_drumming_beat"]
    yuji = FIRST_CREATION_SKILLS_BY_ID["fc_yuji_itadori_black_flash_attempt"]
    assert panda.effects[0].payload.get("condition_status") is None
    assert yuji.effects[1].payload["condition_statuses"] == ["stunned", "exposed", "soul_bruise"]
    assert yuji.effects[2].payload["condition_statuses"] == ["stunned", "exposed", "soul_bruise"]


def test_watcher_energy_uses_seeded_rng_across_all_core_colors():
    colors = set()
    for seed in range(40):
        state, _ = state_and_action()
        state.rng_seed = seed
        events = []
        _append_energy_gain(state, events, "p1", 1, "Scout")
        colors.add(events[0].payload["energy"])
    assert colors == {energy.value for energy in (EnergyType.GREEN, EnergyType.RED, EnergyType.BLUE, EnergyType.WHITE)}


def test_phaser_effective_skill_slots_keep_original_queue_identity():
    store = Path("web/static/phaser/store/game-store.js").read_text(encoding="utf-8")
    assert "character.skill_replacements[skillId]" in store
    assert "effective_skill_id: replacementId" in store
    assert "id: skillId" in store
    assert "skill.effective_skill_id || skill.id" in store
    assert ".filter((skill) => !replacementIds.has(skill.id))" in store
