import pytest

from jjk_arena.battle_v2.manager import BattleV2Error, BattleV2Manager
from jjk_arena.battle_v2.models import (
    BattleState,
    CharacterState,
    EffectSpec,
    PendingAction,
    PlayerState,
    SkillClass,
    SkillSpec,
    StatusEffect,
    TargetRule,
)
from jjk_arena.battle_v2.resolver import ResolverError, finish_turn, resolve_queue, validate_queue
from jjk_arena.battle_v2.timers import BattleTimerPolicy
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_SKILLS_BY_ID


def first_creation_manager(team):
    manager = BattleV2Manager(rng_seed=3)
    manager.start_first_creation_match(
        "room",
        [
            {"id": "p1", "name": "P1", "team": team},
            {"id": "p2", "name": "P2", "team": ["maki_zenin", "panda", "mai_zenin"]},
        ],
    )
    for energy in manager.get_state("room").players["p1"].energy:
        manager.get_state("room").players["p1"].energy[energy] = 9
    return manager


@pytest.mark.parametrize(
    ("team", "caster_slot", "skill_id"),
    [
        (["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"], 0, "fc_suguru_geto_young_compressed_uzumaki"),
        (["suguru_geto_young", "megumi_fushiguro", "nobara_kugisaki"], 0, "fc_suguru_geto_young_compressed_uzumaki"),
        (["yuta_okkotsu_jjk0", "megumi_fushiguro", "nobara_kugisaki"], 0, "fc_yuta_okkotsu_jjk0_cursed_speech_megaphone"),
    ],
)
def test_replacement_only_and_foreign_skills_cannot_be_submitted(team, caster_slot, skill_id):
    manager = first_creation_manager(team)
    with pytest.raises(BattleV2Error, match="declared base slot"):
        manager.submit_plan(
            "room",
            "p1",
            [{"id": "a1", "caster_slot": caster_slot, "skill_id": skill_id, "target_player_id": "p2", "target_slot": 0}],
        )


def test_duplicate_action_ids_and_duplicate_queue_entries_are_rejected():
    skill = SkillSpec("hit", "Hit", "", [], 0, TargetRule("enemy"), [SkillClass.MELEE], [EffectSpec("damage", 10)])
    caster = CharacterState("c", "C", base_skill_ids=["hit"])
    state = BattleState(
        {"p1": PlayerState("p1", "P1", team=[caster]), "p2": PlayerState("p2", "P2", team=[CharacterState("e", "E")])},
        "p1",
    )
    state.pending_actions["p1"] = [
        PendingAction("same", "p1", 0, "hit", "p2", 0),
        PendingAction("same", "p1", 0, "hit", "p2", 0),
    ]
    state.queue_order["p1"] = ["same", "same"]
    with pytest.raises(ResolverError, match="action ids must be unique"):
        validate_queue(state, "p1", {"hit": skill})


@pytest.mark.parametrize(
    ("order", "message"),
    [([], "length"), (["a", "a"], "length"), (["other"], "exactly")],
)
def test_queue_order_must_be_an_exact_permutation(order, message):
    skill = SkillSpec("hit", "Hit", "", [], 0, TargetRule("enemy"), [SkillClass.MELEE], [EffectSpec("damage", 10)])
    caster = CharacterState("c", "C", base_skill_ids=["hit"])
    state = BattleState({"p1": PlayerState("p1", "P1", team=[caster]), "p2": PlayerState("p2", "P2", team=[CharacterState("e", "E")])}, "p1")
    state.pending_actions["p1"] = [PendingAction("a", "p1", 0, "hit", "p2", 0)]
    state.queue_order["p1"] = order
    with pytest.raises(ResolverError, match=message):
        validate_queue(state, "p1", {"hit": skill})


def test_duplicate_queue_entries_are_rejected_even_when_length_matches():
    skills = {
        "one": SkillSpec("one", "One", "", [], 0, TargetRule("enemy"), [SkillClass.MELEE], [EffectSpec("damage", 10)]),
        "two": SkillSpec("two", "Two", "", [], 0, TargetRule("enemy"), [SkillClass.MELEE], [EffectSpec("damage", 10)]),
    }
    team = [CharacterState("c1", "C1", base_skill_ids=["one"]), CharacterState("c2", "C2", base_skill_ids=["two"])]
    state = BattleState({"p1": PlayerState("p1", "P1", team=team, active_slots=[0, 1]), "p2": PlayerState("p2", "P2", team=[CharacterState("e", "E")])}, "p1")
    state.pending_actions["p1"] = [PendingAction("a", "p1", 0, "one", "p2", 0), PendingAction("b", "p1", 1, "two", "p2", 0)]
    state.queue_order["p1"] = ["a", "a"]
    with pytest.raises(ResolverError, match="duplicate entries"):
        validate_queue(state, "p1", skills)


def test_duplicate_target_slots_are_rejected():
    skill = SkillSpec("sweep", "Sweep", "", [], 0, TargetRule("enemy_team", 1, 3), [SkillClass.RANGED], [EffectSpec("damage", 10)])
    caster = CharacterState("c", "C", base_skill_ids=["sweep"])
    enemies = [CharacterState(str(i), str(i)) for i in range(3)]
    state = BattleState({"p1": PlayerState("p1", "P1", team=[caster]), "p2": PlayerState("p2", "P2", team=enemies)}, "p1")
    state.pending_actions["p1"] = [PendingAction("a", "p1", 0, "sweep", "p2", target_slot=0, target_slots=[0, 0])]
    state.queue_order["p1"] = ["a"]
    with pytest.raises(ResolverError, match="duplicate target slots"):
        validate_queue(state, "p1", {"sweep": skill})


def test_aoe_one_shot_damage_bonus_applies_to_all_targets_then_consumes():
    skill = SkillSpec("sweep", "Sweep", "", [], 0, TargetRule("enemy_team", 1, 3), [SkillClass.RANGED], [EffectSpec("damage", 20)])
    caster = CharacterState("c", "C", base_skill_ids=["sweep"])
    caster.statuses.append(StatusEffect("boost", "Boost", "p1", 0, "p1", 0, 3, payload={"damage_bonus": 10, "consume_after_damage": True}))
    enemies = [CharacterState(str(i), str(i)) for i in range(3)]
    state = BattleState({"p1": PlayerState("p1", "P1", team=[caster]), "p2": PlayerState("p2", "P2", team=enemies)}, "p1")
    state.pending_actions["p1"] = [PendingAction("a", "p1", 0, "sweep", "p2", target_slot=0, target_slots=[0, 1, 2])]
    state.queue_order["p1"] = ["a"]

    resolve_queue(state, "p1", {"sweep": skill})

    assert [enemy.hp for enemy in enemies] == [70, 70, 70]
    assert not any(status.id == "boost" for status in caster.statuses)


def test_unmarked_persistent_damage_bonus_is_not_consumed_as_one_shot():
    skill = SkillSpec("hit", "Hit", "", [], 0, TargetRule("enemy"), [SkillClass.RANGED], [EffectSpec("damage", 20)])
    caster = CharacterState("c", "C", base_skill_ids=["hit"])
    caster.statuses.append(StatusEffect("aura", "Aura", "p1", 0, "p1", 0, 3, payload={"damage_bonus": 10}))
    enemy = CharacterState("e", "E")
    state = BattleState({"p1": PlayerState("p1", "P1", team=[caster]), "p2": PlayerState("p2", "P2", team=[enemy])}, "p1")
    state.pending_actions["p1"] = [PendingAction("a", "p1", 0, "hit", "p2", 0)]
    state.queue_order["p1"] = ["a"]

    resolve_queue(state, "p1", {"hit": skill})

    assert enemy.hp == 70
    assert any(status.id == "aura" for status in caster.statuses)


def test_ranged_physical_skill_does_not_trigger_melee_counter():
    skill = FIRST_CREATION_SKILLS_BY_ID["fc_mai_zenin_revolver_shot"]
    caster = CharacterState("mai_zenin", "Mai", base_skill_ids=[skill.id])
    defender = CharacterState("miwa", "Miwa")
    defender.statuses.append(StatusEffect("domain", "Simple Domain", "p2", 0, "p2", 0, 2, payload={"counter": "first_harmful_melee"}))
    state = BattleState({"p1": PlayerState("p1", "P1", team=[caster]), "p2": PlayerState("p2", "P2", team=[defender])}, "p1")
    state.players["p1"].energy[next(iter(skill.cost))] = 1
    state.pending_actions["p1"] = [PendingAction("a", "p1", 0, skill.id, "p2", 0)]
    state.queue_order["p1"] = ["a"]
    resolve_queue(state, "p1", {skill.id: skill})
    assert defender.hp == 80
    assert any(status.id == "domain" for status in defender.statuses)


def test_planning_timer_is_server_authoritative_and_advances_turn():
    now = [100.0]
    manager = BattleV2Manager(
        rng_seed=1,
        timer_policy=BattleTimerPolicy(planning_seconds=5, queue_review_seconds=2),
        clock=lambda: now[0],
    )
    manager.start_classic_match(
        "timer",
        [
            {"id": "p1", "name": "P1", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
            {"id": "p2", "name": "P2", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
        ],
    )
    assert manager.get_state("timer").phase_deadline == 105.0
    now[0] = 105.0
    assert manager.expire_phase_if_needed("timer") is True
    assert manager.get_state("timer").turn_player_id == "p2"
    assert manager.get_state("timer").state_revision == 1
    assert any(event.type == "phase_timeout" for event in manager.get_state("timer").event_log)


def test_valid_queue_review_timeout_resolves_once_and_advances_turn():
    now = [200.0]
    manager = BattleV2Manager(
        rng_seed=1,
        timer_policy=BattleTimerPolicy(planning_seconds=5, queue_review_seconds=2),
        clock=lambda: now[0],
    )
    manager.start_classic_match(
        "queue-timer",
        [
            {"id": "p1", "name": "P1", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
            {"id": "p2", "name": "P2", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
        ],
    )
    state = manager.get_state("queue-timer")
    state.players["p1"].energy[next(iter(FIRST_CREATION_SKILLS_BY_ID["fc_yuji_itadori_divergent_fist"].cost))] = 1
    manager.submit_plan("queue-timer", "p1", [{
        "id": "queued-hit",
        "caster_slot": 0,
        "skill_id": "divergent_fist",
        "target_player_id": "p2",
        "target_slot": 0,
    }])
    assert state.phase_deadline == 202.0

    now[0] = 202.0
    assert manager.expire_phase_if_needed("queue-timer") is True

    assert state.players["p2"].team[0].hp == 80
    assert state.turn_player_id == "p2"
    assert [event.type for event in state.event_log].count("skill_resolved") == 1
    assert [event.type for event in state.event_log].count("phase_timeout") == 1


def test_invisible_status_reveals_on_expiry_when_reveal_mode_requires_it():
    hidden = StatusEffect(
        "trap",
        "Hidden Trap",
        "p1",
        0,
        "p2",
        0,
        1,
        invisible=True,
        payload={"reveal_mode": "expiry"},
    )
    target = CharacterState("target", "Target", statuses=[hidden])
    state = BattleState(
        {"p1": PlayerState("p1", "P1", team=[CharacterState("caster", "Caster")]), "p2": PlayerState("p2", "P2", team=[target])},
        "p1",
    )
    events = finish_turn(state, "p1")
    reveal = next(event for event in events if event.type == "status_revealed")
    assert reveal.payload == {"status": "trap", "target_player_id": "p2", "target_slot": 0, "reason": "expiry"}


def test_helpful_ally_statuses_are_buffs_and_hostile_control_is_not():
    rika = FIRST_CREATION_SKILLS_BY_ID["fc_yuta_okkotsu_jjk0_rika_protects"]
    ally_guard = next(effect for effect in rika.effects if effect.status == "rika_ally_guard")
    assert ally_guard.payload["families"] == ["BUFF"]

    jellyfish = FIRST_CREATION_SKILLS_BY_ID["fc_junpei_yoshino_jellyfish_screen"]
    assert jellyfish.effects[0].payload["families"] == ["BUFF"]

    remote = FIRST_CREATION_SKILLS_BY_ID["fc_kokichi_muta_mechamaru_remote_puppet_net"]
    assert set(remote.effects[0].payload["families"]) == {"CONTROL", "DEBUFF"}
