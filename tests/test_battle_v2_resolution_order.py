from jjk_arena.battle_v2.models import (
    BattleState, CharacterState, EffectSpec, PendingAction, PlayerState,
    SkillClass, SkillSpec, StatusEffect, TargetRule,
)
from jjk_arena.battle_v2.resolver import resolve_queue


def state_for(skill_id):
    caster = CharacterState("caster", "Caster", base_skill_ids=[skill_id])
    target = CharacterState("target", "Target")
    return BattleState(
        {"p1": PlayerState("p1", "P1", team=[caster]), "p2": PlayerState("p2", "P2", team=[target])},
        "p1",
    )


def test_counter_occurs_before_any_effect_but_after_skill_commitment():
    skill = SkillSpec(
        "mixed", "Mixed", "", [], 2, TargetRule("enemy"),
        [SkillClass.MELEE],
        [EffectSpec("damage", 20), EffectSpec("apply_status", status="self_buff", duration=2, target="self")],
    )
    state = state_for("mixed")
    caster = state.players["p1"].team[0]
    target = state.players["p2"].team[0]
    target.statuses.append(StatusEffect("counter", "Counter", "p2", 0, "p2", 0, 2, payload={"counter": "first_harmful"}))
    state.pending_actions["p1"] = [PendingAction("a", "p1", 0, "mixed", "p2", 0)]
    state.queue_order["p1"] = ["a"]

    events = resolve_queue(state, "p1", {"mixed": skill})

    types = [event.type for event in events]
    assert types.index("skill_resolved") < types.index("skill_countered")
    assert "damage" not in types and "status_applied" not in types
    assert target.hp == 100
    assert caster.cooldowns["mixed"] > 0
    assert not any(status.id == "counter" for status in target.statuses)


def test_reflect_is_decided_before_ordered_effects_and_self_effect_stays_on_caster():
    skill = SkillSpec(
        "mixed", "Mixed", "", [], 0, TargetRule("enemy"),
        [SkillClass.MELEE],
        [EffectSpec("damage", 20), EffectSpec("apply_status", status="self_buff", duration=2, target="self")],
    )
    state = state_for("mixed")
    caster = state.players["p1"].team[0]
    target = state.players["p2"].team[0]
    target.statuses.append(StatusEffect("reflect", "Reflect", "p2", 0, "p2", 0, 2, payload={"reflect": "user"}))
    state.pending_actions["p1"] = [PendingAction("a", "p1", 0, "mixed", "p2", 0)]
    state.queue_order["p1"] = ["a"]

    events = resolve_queue(state, "p1", {"mixed": skill})

    types = [event.type for event in events]
    assert types.index("skill_reflected") < types.index("damage") < types.index("status_applied")
    assert caster.hp == 80 and target.hp == 100
    assert any(status.id == "self_buff" for status in caster.statuses)
