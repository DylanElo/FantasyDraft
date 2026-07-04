import random

import pytest

from jjk_bot.battle_v2.effects import apply_damage
from jjk_bot.battle_v2.energy import EnergyValidationError, gain_energy_for_living, spend_skill_energy
from jjk_bot.battle_v2.models import (
    BattlePhase,
    BattleState,
    CharacterState,
    ConditionSpec,
    DamageType,
    EffectSpec,
    EnergyType,
    PendingAction,
    PlayerState,
    SkillClass,
    SkillSpec,
    StatusEffect,
    TargetRule,
)
from jjk_bot.battle_v2.resolver import ResolverError, confirm_queue, resolve_queue, validate_queue


def make_player(player_id, names):
    return PlayerState(
        id=player_id,
        name=player_id,
        team=[CharacterState(character_id=name.lower(), name=name) for name in names],
    )


def make_state():
    p1 = make_player("p1", ["Yuji", "Nobara", "Megumi"])
    p2 = make_player("p2", ["Gojo", "Sukuna", "Mahito"])
    return BattleState(players={"p1": p1, "p2": p2}, turn_player_id="p1")


def skill(skill_id="strike", cost=None, effects=None, conditions=None, target_rule=None, cooldown=0):
    return SkillSpec(
        id=skill_id,
        name=skill_id.title(),
        text="test skill",
        cost=cost or [],
        cooldown=cooldown,
        target_rule=target_rule or TargetRule(kind="enemy"),
        classes=[SkillClass.PHYSICAL, SkillClass.INSTANT],
        effects=effects or [EffectSpec(type="damage", amount=20, damage_type=DamageType.NORMAL)],
        conditions=conditions or [],
    )


def test_gain_energy_for_living_is_deterministic():
    player = make_player("p1", ["Yuji", "Nobara", "Megumi"])

    gain_energy_for_living(player, 3, random.Random(1))

    assert sum(player.energy.values()) == 3
    assert player.energy == {
        EnergyType.GREEN: 1,
        EnergyType.RED: 1,
        EnergyType.BLUE: 1,
        EnergyType.WHITE: 0,
        EnergyType.BLACK: 0,
    }


def test_wildcard_payments_are_required_and_spent_on_confirm():
    state = make_state()
    state.players["p1"].energy[EnergyType.GREEN] = 2
    paid_skill = skill(cost=[EnergyType.GREEN, EnergyType.BLACK])
    action = PendingAction(
        id="a1",
        player_id="p1",
        caster_slot=0,
        skill_id="strike",
        target_player_id="p2",
        target_slot=0,
        wildcard_pays=[EnergyType.GREEN],
    )
    state.pending_actions["p1"] = [action]
    state.queue_order["p1"] = ["a1"]

    confirm_queue(state, "p1", {"strike": paid_skill})

    assert state.players["p1"].energy[EnergyType.GREEN] == 0
    assert state.players["p1"].queue_confirmed is True
    assert state.phase == BattlePhase.RESOLVING


def test_missing_wildcard_payment_rejected_before_energy_mutates():
    player = make_player("p1", ["Yuji"])
    player.energy[EnergyType.GREEN] = 1
    paid_skill = skill(cost=[EnergyType.GREEN, EnergyType.BLACK])

    with pytest.raises(EnergyValidationError):
        spend_skill_energy(player, paid_skill, [])

    assert player.energy[EnergyType.GREEN] == 1


def test_damage_families_match_v2_rules():
    target = CharacterState(character_id="target", name="Target")
    target.statuses.append(
        StatusEffect(
            id="guard",
            name="Guard",
            source_player_id="p1",
            source_slot=0,
            target_player_id="p2",
            target_slot=0,
            duration=1,
            payload={"damage_reduction": 10, "destructible_defense": 15},
        )
    )

    assert apply_damage(target, 30, DamageType.NORMAL) == 5
    assert target.hp == 95
    assert apply_damage(target, 30, DamageType.PIERCING) == 30
    assert target.hp == 65

    target.statuses[0].payload["damage_reduction"] = 20
    target.statuses[0].payload["destructible_defense"] = 20
    assert apply_damage(target, 25, DamageType.SOUL) == 25
    assert target.hp == 40


def test_health_steal_only_heals_actual_hp_damage():
    state = make_state()
    caster = state.players["p1"].team[0]
    caster.hp = 50
    target = state.players["p2"].team[0]
    target.hp = 10
    steal = skill(
        "steal",
        effects=[EffectSpec(type="health_steal", amount=30, damage_type=DamageType.HEALTH_STEAL)],
    )
    action = PendingAction("a1", "p1", 0, "steal", "p2", 0)
    state.pending_actions["p1"] = [action]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"steal": steal})

    assert caster.hp == 60
    assert target.hp == 0
    assert target.alive is False


def test_queue_validation_rejects_two_skills_from_same_caster_without_mutating():
    state = make_state()
    state.pending_actions["p1"] = [
        PendingAction("a1", "p1", 0, "strike", "p2", 0),
        PendingAction("a2", "p1", 0, "strike", "p2", 1),
    ]
    state.queue_order["p1"] = ["a1", "a2"]

    with pytest.raises(ResolverError):
        validate_queue(state, "p1", {"strike": skill()})

    assert state.players["p1"].team[0].acted_this_turn is False
    assert state.players["p2"].team[0].hp == 100


def test_target_status_condition_and_queue_order_resolution():
    state = make_state()
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect("marked", "Marked", "p1", 1, "p2", 0, duration=2)
    )
    mark_payoff = skill(
        "payoff",
        effects=[EffectSpec(type="damage", amount=30, damage_type=DamageType.SOUL)],
        conditions=[ConditionSpec(type="target_has", status="marked")],
    )
    setup_hit = skill("setup", effects=[EffectSpec(type="damage", amount=10, damage_type=DamageType.NORMAL)])
    state.pending_actions["p1"] = [
        PendingAction("a1", "p1", 0, "setup", "p2", 0, queue_index=0),
        PendingAction("a2", "p1", 1, "payoff", "p2", 0, queue_index=1),
    ]
    state.queue_order["p1"] = ["a2", "a1"]

    events = resolve_queue(state, "p1", {"setup": setup_hit, "payoff": mark_payoff})

    damage_events = [event for event in events if event.type == "damage"]
    assert [event.payload["amount"] for event in damage_events] == [30, 10]
    assert target.hp == 60
    assert state.turn_player_id == "p2"


def test_queue_validation_checks_aggregate_energy_without_mutating():
    state = make_state()
    state.players["p1"].energy[EnergyType.GREEN] = 1
    one_green = skill(cost=[EnergyType.GREEN])
    state.pending_actions["p1"] = [
        PendingAction("a1", "p1", 0, "strike", "p2", 0),
        PendingAction("a2", "p1", 1, "strike", "p2", 1),
    ]
    state.queue_order["p1"] = ["a1", "a2"]

    with pytest.raises(ResolverError):
        confirm_queue(state, "p1", {"strike": one_green})

    assert state.players["p1"].energy[EnergyType.GREEN] == 1
    assert state.players["p2"].team[0].hp == 100
