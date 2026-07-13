import pytest

from jjk_arena.battle_v2.conditions import has_status
from jjk_arena.battle_v2.models import BattleEvent, BattleState, CharacterState, EffectSpec, EnergyType, PendingAction, PlayerState, SkillClass, SkillSpec, StatusEffect, StatusFamily, TargetRule
from jjk_arena.battle_v2.resolver import ResolverError, finish_turn, resolve_queue, validate_action
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_SKILLS_BY_ID


def make_state(caster_id="caster"):
    p1 = PlayerState("p1", "P1", team=[CharacterState(caster_id, "Caster"), CharacterState("ally", "Ally", hp=50), CharacterState("ally2", "Ally 2")])
    p2 = PlayerState("p2", "P2", team=[CharacterState("enemy", "Enemy"), CharacterState("enemy2", "Enemy 2"), CharacterState("enemy3", "Enemy 3")])
    for player in (p1, p2):
        for energy in player.energy:
            player.energy[energy] = 20
    return BattleState({"p1": p1, "p2": p2}, "p1", rng_seed=3)


def add_status(character, status_id, source="p1", stacks=1, **payload):
    families = [StatusFamily.AFFLICTION] if status_id == "poison" else [StatusFamily.MARK] if status_id in {"blood_mark", "exposed", "soul_bruise"} else []
    character.statuses.append(StatusEffect(status_id, status_id.title(), source, 0, "p1" if character.character_id in {"caster", "ally", "ally2", "maki_zenin", "mai_zenin", "yuji_itadori"} else "p2", 0, 4, stacks=stacks, payload=payload, families=families))


def execute(state, skill_id, target_player="p2", target_slot=0, target_slots=None):
    skill = FIRST_CREATION_SKILLS_BY_ID[skill_id]
    wildcard = [EnergyType.GREEN for cost in skill.cost if cost == EnergyType.BLACK]
    action = PendingAction("action", "p1", 0, skill_id, target_player, target_slot, target_slots or [], wildcard)
    state.pending_actions["p1"] = [action]
    state.queue_order["p1"] = [action.id]
    return resolve_queue(state, "p1", FIRST_CREATION_SKILLS_BY_ID)


def test_harmful_restriction_blocks_hostile_families_but_allows_support():
    state = make_state()
    caster = state.players["p1"].team[0]
    add_status(caster, "stopped", stun_harmful=True)
    hostile = [
        SkillSpec("damage", "Damage", "", [], 0, TargetRule("enemy"), [SkillClass.PHYSICAL], [EffectSpec("damage", 10)]),
        SkillSpec("control", "Control", "", [], 0, TargetRule("enemy"), [SkillClass.CONTROL], [EffectSpec("apply_status", status="lock", duration=2)]),
        SkillSpec("drain", "Drain", "", [], 0, TargetRule("enemy"), [SkillClass.STRATEGIC], [EffectSpec("drain_energy")]),
        SkillSpec("counter", "Counter", "", [], 0, TargetRule("enemy"), [SkillClass.STRATEGIC], [EffectSpec("counter")]),
    ]
    for skill in hostile:
        with pytest.raises(ResolverError, match="stunned"):
            validate_action(state, PendingAction("a", "p1", 0, skill.id, "p2", 0), {skill.id: skill})
    heal = SkillSpec("heal", "Heal", "", [], 0, TargetRule("ally", allow_self=True), [SkillClass.STRATEGIC], [EffectSpec("heal", 10)])
    guard = SkillSpec("guard", "Guard", "", [], 0, TargetRule("self"), [SkillClass.STRATEGIC], [EffectSpec("apply_status", status="guard", duration=2, target="self")])
    validate_action(state, PendingAction("h", "p1", 0, "heal", "p1", 1), {"heal": heal})
    validate_action(state, PendingAction("g", "p1", 0, "guard", "p1", 0), {"guard": guard})


def test_black_flash_self_momentum_uses_original_enemy_condition():
    state = make_state("yuji_itadori")
    add_status(state.players["p2"].team[0], "exposed", source="p1")
    events = execute(state, "fc_yuji_itadori_black_flash_attempt")
    assert sum(event.payload.get("amount", 0) for event in events if event.type == "damage") == 45
    assert has_status(state.players["p1"].team[0], "momentum")


def test_weapon_specialist_is_scoped_to_next_combo_and_consumed():
    state = make_state("maki_zenin")
    caster = state.players["p1"].team[0]
    target = state.players["p2"].team[0]
    add_status(caster, "weapon_specialist", next_skill_modifiers={"fc_maki_zenin_cursed_tool_combo": {"damage": 10, "destroy_defense_first": 10}}, consume_on_skill_id="fc_maki_zenin_cursed_tool_combo")
    add_status(target, "guard", source="p2", destructible_defense=25)
    events = execute(state, "fc_maki_zenin_cursed_tool_combo")
    hit = next(event for event in events if event.type == "damage")
    assert hit.payload["attempted_amount"] == 30
    assert hit.payload["destroyed_defense"] == 25
    assert target.hp == 70
    assert not has_status(caster, "weapon_specialist")


def test_hidden_bullet_keeps_two_damage_families_then_consumes():
    state = make_state("mai_zenin")
    caster = state.players["p1"].team[0]
    add_status(caster, "hidden_bullet", consume_on_skill_id="fc_mai_zenin_revolver_shot")
    events = execute(state, "fc_mai_zenin_revolver_shot")
    hits = [event for event in events if event.type == "damage"]
    assert [(event.payload["attempted_amount"], event.payload["damage_type"]) for event in hits] == [(20, "normal"), (20, "piercing")]
    assert state.players["p2"].team[0].hp == 60
    assert not has_status(caster, "hidden_bullet")


@pytest.mark.parametrize("skill_id,caster_id", [
    ("fc_yuta_okkotsu_jjk0_reverse_cursed_technique", "yuta_okkotsu_jjk0"),
    ("fc_shoko_ieiri_young_cleanse_protocol", "shoko_ieiri_young"),
    ("fc_noritoshi_kamo_blood_veil", "noritoshi_kamo"),
])
def test_promised_cleanse_skills_remove_an_affliction(skill_id, caster_id):
    state = make_state(caster_id)
    target = state.players["p1"].team[0 if "blood_veil" in skill_id else 1]
    add_status(target, "poison", source="p2", turn_end_damage=10)
    execute(state, skill_id, "p1", 0 if "blood_veil" in skill_id else 1)
    assert not has_status(target, "poison")


def test_divergent_delay_nue_fallback_panda_bonus_and_mechamaru_branch():
    state = make_state("yuji_itadori")
    execute(state, "fc_yuji_itadori_divergent_fist")
    target = state.players["p2"].team[0]
    assert target.hp == 80 and has_status(target, "soul_bruise")
    finish_turn(state, "p2")
    assert target.hp == 70

    state = make_state("megumi_fushiguro")
    execute(state, "fc_megumi_fushiguro_nue_dive")
    assert has_status(state.players["p2"].team[0], "nue_fallback")

    state = make_state("panda")
    add_status(state.players["p1"].team[0], "gorilla_core")
    events = execute(state, "fc_panda_panda_jab")
    assert next(event for event in events if event.type == "damage").payload["amount"] == 30

    state = make_state("kokichi_muta_mechamaru")
    events = execute(state, "fc_kokichi_muta_mechamaru_cannon_charge")
    assert next(event for event in events if event.type == "damage").payload["amount"] == 45


def test_momo_selection_and_junpei_retaliation_are_real_state_changes():
    state = make_state("momo_nishimiya")
    execute(state, "fc_momo_nishimiya_wind_scythe", "p2", None, [2, 0, 1])
    assert has_status(state.players["p2"].team[2], "exposed")
    assert not has_status(state.players["p2"].team[0], "exposed")

    state = make_state("attacker")
    guarded = state.players["p2"].team[0]
    add_status(guarded, "jellyfish_screen", source="p2", destructible_defense=15, retaliate_damage=10, retaliate_status="poison")
    strike = SkillSpec("strike", "Strike", "", [], 0, TargetRule("enemy"), [SkillClass.PHYSICAL], [EffectSpec("damage", 20)])
    action = PendingAction("strike", "p1", 0, "strike", "p2", 0)
    state.pending_actions["p1"] = [action]
    state.queue_order["p1"] = [action.id]
    events = resolve_queue(state, "p1", {"strike": strike})
    assert any(event.type == "retaliation" for event in events)
    assert has_status(state.players["p1"].team[0], "poison")
