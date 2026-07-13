import random

import pytest

from jjk_arena.battle_v2.effects import apply_damage
from jjk_arena.battle_v2.energy import EnergyValidationError, gain_energy_for_living, spend_skill_energy
from jjk_arena.battle_v2.models import (
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
from jjk_arena.battle_v2.resolver import ResolverError, confirm_queue, finish_turn, resolve_queue, validate_action, validate_queue


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


def skill(skill_id="strike", cost=None, effects=None, conditions=None, target_rule=None, cooldown=0, classes=None):
    return SkillSpec(
        id=skill_id,
        name=skill_id.title(),
        text="test skill",
        cost=cost or [],
        cooldown=cooldown,
        target_rule=target_rule or TargetRule(kind="enemy"),
        classes=classes or [SkillClass.PHYSICAL, SkillClass.INSTANT],
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


def test_health_steal_hits_destructible_defense_before_hp():
    state = make_state()
    caster = state.players["p1"].team[0]
    caster.hp = 50
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "shield",
            "Shield",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"destructible_defense": 20},
        )
    )
    steal = skill(
        "steal",
        effects=[EffectSpec(type="health_steal", amount=30, damage_type=DamageType.HEALTH_STEAL)],
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "steal", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"steal": steal})

    assert caster.hp == 60
    assert target.hp == 90
    assert target.statuses[0].payload["destructible_defense"] == 0


def test_heal_effect_restores_target_and_respects_healing_delta():
    state = make_state()
    ally = state.players["p1"].team[1]
    ally.hp = 40
    ally.statuses.append(
        StatusEffect(
            "warped_soul",
            "Warped Soul",
            "p2",
            0,
            "p1",
            1,
            duration=2,
            payload={"healing_received_delta": -10},
        )
    )
    rct = skill(
        "rct",
        target_rule=TargetRule(kind="ally", allow_self=True),
        effects=[EffectSpec(type="heal", amount=30)],
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "rct", "p1", 1)]
    state.queue_order["p1"] = ["a1"]

    events = resolve_queue(state, "p1", {"rct": rct})

    assert ally.hp == 60
    assert any(event.type == "heal" and event.payload["amount"] == 20 for event in events)


def test_helpful_skill_can_target_invulnerable_ally_without_bypass():
    state = make_state()
    ally = state.players["p1"].team[1]
    ally.hp = 40
    ally.statuses.append(
        StatusEffect(
            "infinity",
            "Infinity",
            "p1",
            0,
            "p1",
            1,
            duration=2,
            payload={"invulnerable": True},
        )
    )
    rct = skill(
        "reverse_cursed_technique",
        target_rule=TargetRule(kind="ally", allow_self=True),
        effects=[EffectSpec(type="heal", amount=30)],
    )

    validate_action(
        state,
        PendingAction("a1", "p1", 0, "reverse_cursed_technique", "p1", 1),
        {"reverse_cursed_technique": rct},
    )


def test_bypassing_helpful_skill_can_target_invulnerable_ally():
    state = make_state()
    ally = state.players["p1"].team[1]
    ally.hp = 40
    ally.statuses.append(
        StatusEffect(
            "infinity",
            "Infinity",
            "p1",
            0,
            "p1",
            1,
            duration=2,
            payload={"invulnerable": True},
        )
    )
    rct = skill(
        "reverse_cursed_technique",
        target_rule=TargetRule(kind="ally", allow_self=True),
        classes=[SkillClass.BYPASSING, SkillClass.INSTANT],
        effects=[EffectSpec(type="heal", amount=30)],
    )
    state.pending_actions["p1"] = [
        PendingAction("a1", "p1", 0, "reverse_cursed_technique", "p1", 1)
    ]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"reverse_cursed_technique": rct})

    assert ally.hp == 70


def test_enemy_skill_cannot_target_invulnerable_character_without_bypass():
    state = make_state()
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "infinity",
            "Infinity",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"invulnerable": True},
        )
    )

    with pytest.raises(ResolverError, match="invulnerable"):
        validate_action(
            state,
            PendingAction("a1", "p1", 0, "strike", "p2", 0),
            {"strike": skill()},
        )


def test_domain_sure_hit_bypasses_invulnerability_unless_anti_domain_converts_it():
    state = make_state()
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "infinity",
            "Infinity",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"invulnerable": True},
        )
    )
    domain_hit = skill(
        "domain_hit",
        classes=[SkillClass.DOMAIN, SkillClass.INSTANT],
        effects=[EffectSpec(type="damage", amount=30, damage_type=DamageType.SURE_HIT)],
    )

    validate_action(
        state,
        PendingAction("a1", "p1", 0, "domain_hit", "p2", 0),
        {"domain_hit": domain_hit},
    )

    target.statuses.append(
        StatusEffect(
            "simple_domain",
            "Simple Domain",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"anti_domain": True},
        )
    )

    with pytest.raises(ResolverError, match="invulnerable"):
        validate_action(
            state,
            PendingAction("a2", "p1", 0, "domain_hit", "p2", 0),
            {"domain_hit": domain_hit},
        )


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


def test_effect_log_uses_skill_display_name_and_target_name():
    state = make_state()
    named_skill = skill(
        "divergent_fist",
        effects=[EffectSpec(type="damage", amount=20, damage_type=DamageType.NORMAL)],
    )
    named_skill.name = "Divergent Fist"
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "divergent_fist", "p2", 1)]
    state.queue_order["p1"] = ["a1"]

    events = resolve_queue(state, "p1", {"divergent_fist": named_skill})

    assert any(
        event.type == "damage" and event.message == "Divergent Fist dealt 20 damage to Sukuna"
        for event in events
    )


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


def test_counter_negates_counterable_harmful_skill_and_is_consumed():
    state = make_state()
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "rabbit_escape",
            "Rabbit Escape",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            invisible=True,
            payload={"counter": "first_harmful_non_domain"},
        )
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "strike", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    events = resolve_queue(state, "p1", {"strike": skill()})

    assert any(event.type == "skill_countered" for event in events)
    assert target.hp == 100
    assert target.statuses == []


def test_uncounterable_skill_bypasses_counter():
    state = make_state()
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "counter",
            "Counter",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"counter": "first_harmful"},
        )
    )
    uncounterable = skill(classes=[SkillClass.PHYSICAL, SkillClass.INSTANT, SkillClass.UNCOUNTERABLE])
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "strike", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"strike": uncounterable})

    assert target.hp == 80
    assert any(status.id == "counter" for status in target.statuses)


def test_reflect_redirects_harmful_effect_to_caster_and_is_consumed():
    state = make_state()
    caster = state.players["p1"].team[0]
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "mirror",
            "Mirror",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"reflect": "user"},
        )
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "strike", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    events = resolve_queue(state, "p1", {"strike": skill()})

    assert any(event.type == "skill_reflected" for event in events)
    assert caster.hp == 80
    assert target.hp == 100
    assert target.statuses == []


def test_reflect_redirects_full_harmful_skill_payload():
    state = make_state()
    caster = state.players["p1"].team[0]
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "mirror",
            "Mirror",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"reflect": "user"},
        )
    )
    stun_hit = skill(
        "stun_hit",
        effects=[
            EffectSpec(type="damage", amount=20),
            EffectSpec(
                type="apply_status",
                status="stunned",
                duration=2,
                payload={"name": "Stunned", "stun_classes": ["all"]},
            ),
        ],
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "stun_hit", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    events = resolve_queue(state, "p1", {"stun_hit": stun_hit})

    assert any(event.type == "skill_reflected" for event in events)
    assert caster.hp == 80
    assert any(status.id == "stunned" for status in caster.statuses)
    assert target.hp == 100
    assert not any(status.id == "stunned" for status in target.statuses)


def test_unreflectable_skill_bypasses_reflect():
    state = make_state()
    caster = state.players["p1"].team[0]
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "mirror",
            "Mirror",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"reflect": "user"},
        )
    )
    unreflectable = skill(classes=[SkillClass.PHYSICAL, SkillClass.INSTANT, SkillClass.UNREFLECTABLE])
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "strike", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"strike": unreflectable})

    assert caster.hp == 100
    assert target.hp == 80
    assert any(status.id == "mirror" for status in target.statuses)


def test_status_controlled_skill_replacement_resolves_and_expires():
    state = make_state()
    caster = state.players["p1"].team[0]
    caster.statuses.append(
        StatusEffect(
            "charged",
            "Charged",
            "p1",
            0,
            "p1",
            0,
            duration=1,
            payload={"skill_replacements": {"strike": "finisher"}},
        )
    )
    caster.skill_replacements["strike"] = "finisher"
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "strike", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(
        state,
        "p1",
        {
            "strike": skill("strike", effects=[EffectSpec(type="damage", amount=10)]),
            "finisher": skill("finisher", effects=[EffectSpec(type="damage", amount=45)]),
        },
    )

    assert state.players["p2"].team[0].hp == 55
    assert caster.skill_replacements == {}


def test_remove_status_cleans_skill_replacement_side_effect():
    state = make_state()
    setup = skill(
        "setup",
        target_rule=TargetRule(kind="self", allow_self=True),
        effects=[
            EffectSpec(
                type="apply_status",
                status="charged",
                duration=3,
                target="self",
                payload={
                    "name": "Charged",
                    "skill_replacements": {"strike": "finisher"},
                },
            )
        ],
    )
    clear = skill(
        "clear",
        target_rule=TargetRule(kind="self", allow_self=True),
        effects=[EffectSpec(type="remove_status", status="charged", target="self")],
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "setup", "self", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"setup": setup})
    caster = state.players["p1"].team[0]
    assert caster.skill_replacements == {"strike": "finisher"}

    state.turn_player_id = "p1"
    state.pending_actions["p1"] = [PendingAction("a2", "p1", 0, "clear", "self", 0)]
    state.queue_order["p1"] = ["a2"]
    resolve_queue(state, "p1", {"clear": clear})

    assert caster.skill_replacements == {}
    assert not any(status.id == "charged" for status in caster.statuses)


def test_turn_end_status_damage_ticks_and_expires():
    state = make_state()
    burn = skill(
        "burn",
        effects=[
            EffectSpec(
                type="apply_status",
                status="burning",
                duration=1,
                payload={"name": "Burning", "turn_end_damage": 15},
            )
        ],
    )
    target = state.players["p2"].team[0]
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "burn", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    events = resolve_queue(state, "p1", {"burn": burn})
    assert not any(event.type == "status_damage" for event in events)
    events = finish_turn(state, "p2")

    assert any(event.type == "status_damage" for event in events)
    assert target.hp == 85
    assert target.statuses == []


def test_sure_hit_turn_end_status_damage_bypasses_invulnerability():
    state = make_state()
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "infinity",
            "Infinity",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"invulnerable": True},
        )
    )
    domain_burn = skill(
        "domain_burn",
        classes=[SkillClass.DOMAIN, SkillClass.INSTANT],
        effects=[
            EffectSpec(
                type="apply_status",
                status="sure_hit_field",
                duration=1,
                payload={
                    "name": "Sure Hit Field",
                    "turn_end_damage": 15,
                    "turn_end_damage_type": DamageType.SURE_HIT.value,
                },
            )
        ],
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "domain_burn", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"domain_burn": domain_burn})
    finish_turn(state, "p2")

    assert target.hp == 85


def test_anti_domain_converts_sure_hit_to_normal_damage():
    target = CharacterState(character_id="target", name="Target")
    target.statuses.extend(
        [
            StatusEffect(
                "simple_domain",
                "Simple Domain",
                "p2",
                0,
                "p2",
                0,
                duration=2,
                payload={"anti_domain": True},
            ),
            StatusEffect(
                "guard",
                "Guard",
                "p2",
                0,
                "p2",
                0,
                duration=2,
                payload={"damage_reduction": 10, "destructible_defense": 15},
            ),
        ]
    )

    assert apply_damage(target, 30, DamageType.SURE_HIT, bypass_invulnerability=True) == 5
    assert target.hp == 95

    target.statuses.append(
        StatusEffect(
            "infinity",
            "Infinity",
            "p2",
            0,
            "p2",
            0,
            duration=2,
            payload={"invulnerable": True},
        )
    )

    assert apply_damage(target, 30, DamageType.SURE_HIT, bypass_invulnerability=True) == 0
    assert target.hp == 95


def test_damage_output_delta_modifies_outgoing_non_self_damage():
    state = make_state()
    caster = state.players["p1"].team[0]
    target = state.players["p2"].team[0]
    caster.statuses.append(
        StatusEffect(
            "weakened",
            "Weakened",
            "p2",
            0,
            "p1",
            0,
            duration=2,
            payload={"damage_output_delta": -10},
        )
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "strike", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"strike": skill()})

    assert target.hp == 90


def test_damage_bonus_status_applies_to_next_offensive_skill_and_is_consumed():
    state = make_state()
    caster = state.players["p1"].team[0]
    target = state.players["p2"].team[0]
    caster.statuses.append(
        StatusEffect(
            "binding_vow",
            "Binding Vow",
            "p1",
            0,
            "p1",
            0,
            duration=3,
            payload={"damage_bonus": 10, "consume_after_damage": True},
        )
    )
    self_damage = skill(
        "drawback",
        target_rule=TargetRule(kind="self", allow_self=True),
        effects=[EffectSpec(type="damage", amount=10, damage_type=DamageType.SOUL, target="self")],
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "drawback", "self", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"drawback": self_damage})

    assert caster.hp == 90
    assert any(status.id == "binding_vow" for status in caster.statuses)

    state.turn_player_id = "p1"
    state.pending_actions["p1"] = [PendingAction("a2", "p1", 0, "strike", "p2", 0)]
    state.queue_order["p1"] = ["a2"]
    resolve_queue(state, "p1", {"strike": skill()})

    assert target.hp == 70
    assert not any(status.id == "binding_vow" for status in caster.statuses)


def test_damage_payload_can_increase_target_cooldowns_when_condition_matches():
    state = make_state()
    target = state.players["p2"].team[0]
    target.cooldowns["red"] = 2
    target.statuses.append(StatusEffect("pulled", "Pulled", "p1", 0, "p2", 0, duration=2))
    blue = skill(
        "blue",
        effects=[EffectSpec(type="damage", amount=25, payload={"bonus_status": "pulled", "cooldown_increase": 1})],
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "blue", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"blue": blue})

    assert target.cooldowns["red"] == 3


def test_cooldowns_only_tick_on_owners_finished_turn():
    state = make_state()
    slow = skill("slow", cooldown=1)
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "slow", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"slow": slow})

    caster = state.players["p1"].team[0]
    assert caster.cooldowns["slow"] == 1

    finish_turn(state, "p2")

    assert caster.cooldowns["slow"] == 1
    state.turn_player_id = "p1"
    with pytest.raises(ResolverError, match="cooldown"):
        validate_action(
            state,
            PendingAction("a2", "p1", 0, "slow", "p2", 0),
            {"slow": slow},
        )

    finish_turn(state, "p1")

    assert "slow" not in caster.cooldowns


def test_black_cost_delta_reduces_wildcard_cost_until_bonus_is_consumed():
    state = make_state()
    player = state.players["p1"]
    caster = player.team[0]
    target = state.players["p2"].team[0]
    player.energy[EnergyType.RED] = 1
    caster.statuses.append(
        StatusEffect(
            "binding_vow",
            "Binding Vow",
            "p1",
            0,
            "p1",
            0,
            duration=3,
            payload={"black_cost_delta": -1, "damage_bonus": 10, "consume_after_damage": True},
        )
    )
    vow_attack = skill("vow_attack", cost=[EnergyType.RED, EnergyType.BLACK])
    state.pending_actions["p1"] = [
        PendingAction("a1", "p1", 0, "vow_attack", "p2", 0, wildcard_pays=[])
    ]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"vow_attack": vow_attack})

    assert player.energy[EnergyType.RED] == 0
    assert target.hp == 70
    assert not any(status.id == "binding_vow" for status in caster.statuses)


def test_ignore_stun_status_allows_stunned_caster_to_act():
    state = make_state()
    caster = state.players["p1"].team[0]
    caster.statuses.append(
        StatusEffect(
            "stunned",
            "Stunned",
            "p2",
            0,
            "p1",
            0,
            duration=2,
            payload={"stun_classes": ["all"]},
        )
    )
    action = PendingAction("a1", "p1", 0, "strike", "p2", 0)

    with pytest.raises(ResolverError, match="stunned"):
        validate_action(state, action, {"strike": skill()})

    caster.statuses.append(
        StatusEffect(
            "unbreakable_resolve",
            "Unbreakable Resolve",
            "p1",
            0,
            "p1",
            0,
            duration=2,
            payload={"ignore_stun": True},
        )
    )

    validate_action(state, action, {"strike": skill()})


def test_punish_non_domain_status_stuns_after_non_domain_skill():
    state = make_state()
    caster = state.players["p1"].team[0]
    caster.statuses.append(
        StatusEffect(
            "unlimited_void",
            "Unlimited Void",
            "p2",
            0,
            "p1",
            0,
            duration=3,
            payload={"punish_non_domain": True},
        )
    )
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "strike", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    events = resolve_queue(state, "p1", {"strike": skill()})

    assert any(event.payload.get("status") == "domain_stun" for event in events)
    assert any(status.id == "domain_stun" for status in caster.statuses)


def test_punish_non_domain_status_does_not_stun_domain_skill():
    state = make_state()
    caster = state.players["p1"].team[0]
    caster.statuses.append(
        StatusEffect(
            "unlimited_void",
            "Unlimited Void",
            "p2",
            0,
            "p1",
            0,
            duration=3,
            payload={"punish_non_domain": True},
        )
    )
    domain_skill = skill("domain", classes=[SkillClass.DOMAIN, SkillClass.INSTANT])
    state.pending_actions["p1"] = [PendingAction("a1", "p1", 0, "domain", "p2", 0)]
    state.queue_order["p1"] = ["a1"]

    resolve_queue(state, "p1", {"domain": domain_skill})

    assert not any(status.id == "domain_stun" for status in caster.statuses)


def test_default_status_duration_ticks_on_every_finished_turn():
    state = make_state()
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "burning",
            "Burning",
            "p1",
            0,
            "p2",
            0,
            duration=2,
            payload={"turn_end_damage": 5},
        )
    )

    finish_turn(state, "p1")

    assert target.hp == 95
    assert target.statuses[0].duration == 1

    finish_turn(state, "p2")

    assert target.hp == 90
    assert target.statuses == []


def test_source_turn_status_duration_only_ticks_on_source_turn():
    state = make_state()
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "ritual",
            "Ritual",
            "p1",
            0,
            "p2",
            0,
            duration=2,
            payload={"duration_clock": "source_turn", "turn_end_damage": 5},
        )
    )

    finish_turn(state, "p1")

    assert target.hp == 95
    assert target.statuses[0].duration == 1

    finish_turn(state, "p2")

    assert target.hp == 95
    assert target.statuses[0].duration == 1


def test_target_turn_status_duration_only_ticks_on_target_turn():
    state = make_state()
    target = state.players["p2"].team[0]
    target.statuses.append(
        StatusEffect(
            "marked",
            "Marked",
            "p1",
            0,
            "p2",
            0,
            duration=2,
            payload={"duration_clock": "target_turn", "turn_end_damage": 5},
        )
    )

    finish_turn(state, "p1")

    assert target.hp == 100
    assert target.statuses[0].duration == 2

    finish_turn(state, "p2")

    assert target.hp == 95
    assert target.statuses[0].duration == 1
