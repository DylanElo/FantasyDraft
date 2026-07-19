import pytest

from jjk_arena.battle_v2.models import EnergyType, SkillClass, StatusEffect
from jjk_arena.battle_v2.manager import BattleV2Manager, BattleV2Error


def player_one():
    return {
        "id": "p1",
        "name": "Player One",
        "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
    }


def player_two():
    return {
        "id": "p2",
        "name": "Player Two",
        "team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
    }


def start_manager():
    manager = BattleV2Manager(rng_seed=1)
    state = manager.start_classic_match("room", [player_one(), player_two()])
    return manager, state


def give_all_energy(manager):
    state = manager.get_state("room")
    for player in state.players.values():
        for energy in player.energy:
            player.energy[energy] = 5


def test_start_classic_match_serializes_initial_private_view():
    manager, serialized = start_manager()

    assert serialized["turn_player_id"] == "p1"
    assert serialized["phase"] == "planning"
    assert list(serialized["players"]) == ["p1", "p2"]
    assert serialized["players"]["p1"]["team"][0]["character_id"] == "yuji_itadori"
    assert serialized["skill_catalog"]["yuji_itadori"]["skills"][0]["id"] == "divergent_fist"
    assert serialized["skill_catalog"]["yuji_itadori"]["skills"][0]["cost"] == ["green"]
    assert serialized["skill_catalog"]["yuji_itadori"]["skills"][0]["target_rule"]["kind"] == "enemy"
    assert serialized["skill_catalog"]["yuji_itadori"]["skills"][0]["effects"][0]["type"] == "damage"
    assert serialized["skill_catalog"]["yuji_itadori"]["skills"][0]["effects"][0]["amount"] == 20
    assert sum(serialized["players"]["p1"]["energy"].values()) == 1
    assert manager.get_state("room").turn_player_id == "p1"


def test_convert_energy_once_per_turn_and_serializes_flag():
    manager, _ = start_manager()
    state = manager.get_state("room")
    player = state.players["p1"]
    player.energy = {energy: 0 for energy in EnergyType}
    player.energy[EnergyType.GREEN] = 3
    player.energy[EnergyType.BLUE] = 1
    player.energy[EnergyType.WHITE] = 1
    player.energy[EnergyType.RED] = 0

    serialized = manager.convert_energy(
        "room", "p1", ["green", "green", "green", "blue", "white"], "red"
    )

    assert serialized["players"]["p1"]["energy"]["green"] == 0
    assert serialized["players"]["p1"]["energy"]["blue"] == 0
    assert serialized["players"]["p1"]["energy"]["white"] == 0
    assert serialized["players"]["p1"]["energy"]["red"] == 1
    assert serialized["players"]["p1"]["energy_converted_this_turn"] is True
    assert any(event["type"] == "energy_converted" for event in serialized["event_log"])
    event = next(event for event in serialized["event_log"] if event["type"] == "energy_converted")
    assert event["payload"]["sources"] == {"green": 3, "blue": 1, "white": 1}
    assert event["payload"]["cost"] == 5
    assert event["payload"]["target"] == "red"
    assert event["message"].endswith("1 Bloodline")

    with pytest.raises(BattleV2Error, match="already used"):
        manager.convert_energy("room", "p1", ["red"] * 5, "blue")


def test_convert_energy_resets_after_turn_advances():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 5

    manager.convert_energy("room", "p1", ["green"] * 5, "red")
    manager.end_turn("room", "p1")
    state = manager.get_state("room")
    state.players["p2"].energy[EnergyType.BLUE] = 5

    serialized = manager.convert_energy("room", "p2", ["blue"] * 5, "white")

    assert serialized["players"]["p2"]["energy"]["white"] >= 1
    assert serialized["players"]["p2"]["energy_converted_this_turn"] is True
    assert manager.get_state("room").players["p1"].energy_converted_this_turn is False


def test_damage_reduction_budget_resets_when_the_turn_advances():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.players["p2"].team[0].turn_damage_reduction_used = 20

    manager.end_turn("room", "p1")

    assert manager.get_state("room").players["p2"].team[0].turn_damage_reduction_used == 0


def test_convert_energy_requires_no_pending_queue():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 3

    manager.submit_plan(
        "room",
        "p1",
        [
            {
                "id": "a1",
                "caster_slot": 0,
                "skill_id": "divergent_fist",
                "target_player_id": "p2",
                "target_slot": 0,
            }
        ],
    )

    with pytest.raises(BattleV2Error, match="cancel the current queue"):
        manager.convert_energy("room", "p1", ["green"] * 5, "red")


def test_convert_energy_is_rejected_after_planning_even_with_an_empty_queue():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 5
    manager.submit_plan("room", "p1", [])

    with pytest.raises(BattleV2Error, match="only available during planning"):
        manager.convert_energy("room", "p1", ["green"] * 5, "red")

    assert manager.get_state("room").players["p1"].energy[EnergyType.GREEN] == 5


def test_convert_energy_requires_exactly_five_available_core_energy():
    manager, _ = start_manager()
    player = manager.get_state("room").players["p1"]
    player.energy = {energy: 0 for energy in EnergyType}
    player.energy[EnergyType.GREEN] = 4

    with pytest.raises(BattleV2Error, match="exactly 5"):
        manager.convert_energy("room", "p1", ["green"] * 4, "red")

    with pytest.raises(BattleV2Error, match="exactly 5"):
        manager.convert_energy("room", "p1", ["green"] * 6, "red")

    with pytest.raises(BattleV2Error, match="not enough Taijutsu"):
        manager.convert_energy("room", "p1", ["green"] * 5, "red")

    with pytest.raises(BattleV2Error, match="only core energy"):
        manager.convert_energy(
            "room", "p1", ["green", "green", "green", "green", "black"], "red"
        )

    with pytest.raises(BattleV2Error, match="only core energy"):
        manager.convert_energy("room", "p1", ["green"] * 5, "black")


def test_invisible_status_hidden_from_opponent_but_visible_to_owner():
    manager, _ = start_manager()
    state = manager.get_state("room")
    megumi = state.players["p1"].team[2]
    megumi.statuses.append(
        StatusEffect(
            "rabbit_escape",
            "Rabbit Escape",
            "p1",
            2,
            "p1",
            2,
            duration=2,
            classes=[SkillClass.INVISIBLE],
            invisible=True,
            payload={"counter": "first_harmful_non_domain"},
        )
    )

    owner_view = manager.serialize_for_player("room", "p1")
    opponent_view = manager.serialize_for_player("room", "p2")

    assert owner_view["players"]["p1"]["team"][2]["statuses"][0]["id"] == "rabbit_escape"
    assert opponent_view["players"]["p1"]["team"][2]["statuses"] == []


def test_visible_ongoing_status_serializes_its_source_skill_for_ui_disclosure():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.players["p1"].energy = {energy: 0 for energy in EnergyType}
    state.players["p1"].energy[EnergyType.WHITE] = 1

    manager.submit_plan(
        "room",
        "p1",
        [{
            "id": "resolve",
            "caster_slot": 0,
            "skill_id": "unbreakable_resolve",
            "target_player_id": "p1",
            "target_slot": 0,
            "wildcard_pays": ["white"],
        }],
    )
    manager.confirm_queue("room", "p1")

    opponent_view = manager.serialize_for_player("room", "p2")
    reinforced = next(
        status
        for status in opponent_view["players"]["p1"]["team"][0]["statuses"]
        if status["id"] == "unbreakable_resolve"
    )
    assert reinforced["payload"]["source_skill_id"] == "unbreakable_resolve"


def test_hostile_invisible_status_hidden_from_target_player():
    manager, _ = start_manager()
    state = manager.get_state("room")
    enemy = state.players["p2"].team[0]
    enemy.statuses.append(
        StatusEffect(
            "hidden_trap",
            "Hidden Trap",
            "p1",
            2,
            "p2",
            0,
            duration=2,
            classes=[SkillClass.INVISIBLE],
            invisible=True,
            payload={"counter": "first_harmful"},
        )
    )

    owner_view = manager.serialize_for_player("room", "p1")
    target_view = manager.serialize_for_player("room", "p2")

    assert owner_view["players"]["p2"]["team"][0]["statuses"][0]["id"] == "hidden_trap"
    assert target_view["players"]["p2"]["team"][0]["statuses"] == []


def test_invisible_skill_and_status_events_are_private_to_source():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.WHITE] = 1

    manager.submit_plan(
        "room",
        "p1",
        [
            {
                "id": "rabbit",
                "caster_slot": 2,
                "skill_id": "rabbit_escape",
                "target_player_id": "p1",
                "target_slot": 2,
            }
        ],
    )
    manager.confirm_queue("room", "p1")

    owner_view = manager.serialize_for_player("room", "p1")
    opponent_view = manager.serialize_for_player("room", "p2")

    assert any("Rabbit Escape" in event["message"] for event in owner_view["event_log"])
    assert not any("Rabbit Escape" in event["message"] for event in opponent_view["event_log"])


def test_submit_update_confirm_queue_resolves_and_advances_turn():
    manager, _ = start_manager()
    give_all_energy(manager)
    p2_energy_before = sum(manager.get_state("room").players["p2"].energy.values())

    manager.submit_plan(
        "room",
        "p1",
        [
            {
                "id": "a1",
                "caster_slot": 0,
                "skill_id": "divergent_fist",
                "target_player_id": "p2",
                "target_slot": 0,
            },
            {
                "id": "a2",
                "caster_slot": 1,
                "skill_id": "resonance",
                "target_player_id": "p2",
                "target_slot": 1,
            },
        ],
    )
    state = manager.get_state("room")
    state.players["p2"].team[1].statuses.append(
        StatusEffect("nail_mark", "Nail Mark", "p1", 1, "p2", 1, duration=2)
    )
    manager.update_queue("room", "p1", ["a2", "a1"], {"a2": ["red"]})
    serialized = manager.confirm_queue("room", "p1")

    assert serialized["turn_player_id"] == "p2"
    assert serialized["phase"] == "planning"
    assert serialized["players"]["p2"]["team"][0]["hp"] == 80
    assert serialized["players"]["p2"]["team"][1]["hp"] == 70
    assert serialized["pending_actions"]["p1"] == []
    assert sum(serialized["players"]["p2"]["energy"].values()) == p2_energy_before + 3


def test_invalid_queue_update_does_not_mutate_saved_actions():
    manager, _ = start_manager()
    give_all_energy(manager)
    manager.submit_plan(
        "room",
        "p1",
        [
            {
                "id": "a1",
                "caster_slot": 0,
                "skill_id": "black_flash",
                "target_player_id": "p2",
                "target_slot": 0,
            }
        ],
    )
    before = manager.serialize_for_player("room", "p1")["pending_actions"]["p1"][0]

    with pytest.raises(BattleV2Error):
        manager.update_queue("room", "p1", ["a1"], {"a1": ["black"]})

    after = manager.serialize_for_player("room", "p1")["pending_actions"]["p1"][0]
    assert after == before


def test_cancel_queue_returns_to_planning():
    manager, _ = start_manager()
    give_all_energy(manager)
    manager.submit_plan(
        "room",
        "p1",
        [
            {
                "id": "a1",
                "caster_slot": 0,
                "skill_id": "divergent_fist",
                "target_player_id": "p2",
                "target_slot": 0,
            }
        ],
    )

    serialized = manager.cancel_queue("room", "p1")

    assert serialized["phase"] == "planning"
    assert serialized["pending_actions"]["p1"] == []
    assert serialized["queue_order"]["p1"] == []


def test_end_turn_clears_pending_actions_and_advances():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.pending_actions["p1"] = []
    state.queue_order["p1"] = []
    p2_energy_before = sum(state.players["p2"].energy.values())

    serialized = manager.end_turn("room", "p1")

    assert serialized["turn_player_id"] == "p2"
    assert serialized["phase"] == "planning"
    assert serialized["pending_actions"]["p1"] == []
    assert serialized["queue_order"]["p1"] == []
    assert sum(serialized["players"]["p2"]["energy"].values()) == p2_energy_before + 3
    assert serialized["event_log"][-1]["message"] == "Player One ended their turn"


def test_session_can_finish_match_from_full_three_action_queue():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.players["p1"].energy = {energy: 0 for energy in EnergyType}
    state.players["p1"].energy[EnergyType.GREEN] = 3
    for target in state.players["p2"].team[:3]:
        target.hp = 20

    manager.submit_plan(
        "room",
        "p1",
        [
            {
                "id": "a1",
                "caster_slot": 0,
                "skill_id": "divergent_fist",
                "target_player_id": "p2",
                "target_slot": 0,
            },
            {
                "id": "a2",
                "caster_slot": 1,
                "skill_id": "hammer_strike",
                "target_player_id": "p2",
                "target_slot": 1,
            },
            {
                "id": "a3",
                "caster_slot": 2,
                "skill_id": "divine_dog",
                "target_player_id": "p2",
                "target_slot": 2,
            },
        ],
    )
    serialized = manager.confirm_queue("room", "p1")

    assert serialized["winner_id"] == "p1"
    assert serialized["phase"] == "finished"
    assert all(not character["alive"] for character in serialized["players"]["p2"]["team"][:3])


def test_cpu_turn_submits_first_legal_queue_and_advances_back():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.turn_player_id = "p2"
    state.players["p2"].energy = {energy: 0 for energy in EnergyType}
    state.players["p2"].energy[EnergyType.BLUE] = 1

    serialized = manager.take_cpu_turn("room", "p2")

    assert serialized["turn_player_id"] == "p1"
    assert serialized["phase"] == "planning"
    assert serialized["players"]["p1"]["team"][0]["hp"] == 75
    assert serialized["pending_actions"]["p2"] == []
    assert any(event["message"] == "Satoru Gojo used Blue" for event in serialized["event_log"])


def test_cpu_turn_prefers_killing_payoff_over_basic_attack():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_classic_match(
        "room",
        [
            {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
            {"id": "p2", "name": "CPU", "team": ["yuta_okkotsu", "aoi_todo", "maki_zenin"]},
        ],
    )
    state = manager.get_state("room")
    state.turn_player_id = "p2"
    state.players["p2"].energy = {energy: 0 for energy in EnergyType}
    state.players["p2"].energy[EnergyType.GREEN] = 1
    state.players["p2"].energy[EnergyType.BLUE] = 3
    state.players["p2"].team[0].statuses.append(
        StatusEffect("rika_manifested", "Rika Manifested", "p2", 0, "p2", 0, duration=2)
    )
    state.players["p1"].team[0].hp = 45

    serialized = manager.take_cpu_turn("room", "p2")

    assert serialized["players"]["p1"]["team"][0]["alive"] is False
    assert any(event["message"] == "Yuta Okkotsu used Pure Love Beam" for event in serialized["event_log"])


def test_cpu_turn_can_choose_ally_heal_for_wounded_teammate():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_classic_match(
        "room",
        [
            {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
            {"id": "p2", "name": "CPU", "team": ["yuta_okkotsu", "aoi_todo", "maki_zenin"]},
        ],
    )
    state = manager.get_state("room")
    state.turn_player_id = "p2"
    state.players["p2"].energy = {energy: 0 for energy in EnergyType}
    state.players["p2"].energy[EnergyType.WHITE] = 2
    state.players["p2"].team[1].hp = 35

    serialized = manager.take_cpu_turn("room", "p2")

    assert serialized["players"]["p2"]["team"][1]["hp"] == 65
    assert any(event["message"] == "Yuta Okkotsu used Reverse Cursed Technique" for event in serialized["event_log"])


def test_start_classic_match_defaults_to_normal_difficulty():
    manager, _ = start_manager()

    assert manager.room_cpu_difficulty["room"] == "normal"


def test_start_classic_match_rejects_unknown_difficulty_string():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_classic_match("room", [player_one(), player_two()], difficulty="lunatic")

    assert manager.room_cpu_difficulty["room"] == "normal"


def test_hard_difficulty_still_prefers_lethal_payoff_over_basic_attack():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_classic_match(
        "room",
        [
            {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
            {"id": "p2", "name": "CPU", "team": ["yuta_okkotsu", "aoi_todo", "maki_zenin"]},
        ],
        difficulty="hard",
    )
    state = manager.get_state("room")
    state.turn_player_id = "p2"
    state.players["p2"].energy = {energy: 0 for energy in EnergyType}
    state.players["p2"].energy[EnergyType.GREEN] = 1
    state.players["p2"].energy[EnergyType.BLUE] = 3
    state.players["p2"].team[0].statuses.append(
        StatusEffect("rika_manifested", "Rika Manifested", "p2", 0, "p2", 0, duration=2)
    )
    state.players["p1"].team[0].hp = 45

    serialized = manager.take_cpu_turn("room", "p2")

    assert serialized["players"]["p1"]["team"][0]["alive"] is False
    assert any(event["message"] == "Yuta Okkotsu used Pure Love Beam" for event in serialized["event_log"])


def test_easy_difficulty_cpu_still_only_selects_legal_actions():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_classic_match(
        "room",
        [
            {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
            {"id": "p2", "name": "CPU", "team": ["yuta_okkotsu", "aoi_todo", "maki_zenin"]},
        ],
        difficulty="easy",
    )
    state = manager.get_state("room")
    state.turn_player_id = "p2"
    state.players["p2"].energy = {energy: 0 for energy in EnergyType}
    state.players["p2"].energy[EnergyType.WHITE] = 2
    state.players["p2"].team[1].hp = 35

    serialized = manager.take_cpu_turn("room", "p2")

    assert serialized["turn_player_id"] == "p1"
    assert serialized["pending_actions"]["p2"] == []


def test_cpu_action_score_hard_and_easy_scale_the_lethal_bonus_in_opposite_directions():
    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        TargetRule,
    )

    caster = CharacterState(character_id="attacker", name="Attacker")
    target = CharacterState(character_id="target", name="Target", hp=10, max_hp=100)
    state = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[caster]),
            "p2": PlayerState(id="p2", name="P2", team=[target]),
        },
        turn_player_id="p1",
    )
    skill = SkillSpec(
        id="lethal_strike",
        name="Lethal Strike",
        text="",
        cost=[EnergyType.GREEN, EnergyType.GREEN, EnergyType.GREEN],
        cooldown=0,
        target_rule=TargetRule(kind="enemy"),
        classes=[],
        effects=[EffectSpec(type="damage", amount=20)],
    )
    action = PendingAction(
        id="p1:test", player_id="p1", caster_slot=0, skill_id=skill.id, target_player_id="p2", target_slot=0
    )

    hard_score = _cpu_action_score(state, "p1", action, skill, difficulty="hard")
    normal_score = _cpu_action_score(state, "p1", action, skill, difficulty="normal")
    easy_score = _cpu_action_score(state, "p1", action, skill, difficulty="easy")
    unknown_score = _cpu_action_score(state, "p1", action, skill, difficulty="lunatic")

    assert hard_score > normal_score > easy_score
    assert unknown_score == normal_score


def test_cpu_action_score_hard_differs_from_normal_without_a_lethal_opportunity():
    """Hard must diverge from Normal even when no kill is on the table.

    The Milestone C audit found Hard and Normal picked identically in
    400/400 non-lethal tactical states because the only difference between
    them was the (never-triggered) lethal bonus. Hard now also weighs
    tactical setup (stuns/control) and heal urgency more heavily.
    """

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        TargetRule,
    )

    caster = CharacterState(character_id="attacker", name="Attacker")
    target = CharacterState(character_id="target", name="Target", hp=90, max_hp=100)
    state = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[caster]),
            "p2": PlayerState(id="p2", name="P2", team=[target]),
        },
        turn_player_id="p1",
    )
    skill = SkillSpec(
        id="control_strike",
        name="Control Strike",
        text="",
        cost=[EnergyType.GREEN],
        cooldown=0,
        target_rule=TargetRule(kind="enemy"),
        classes=[],
        effects=[
            EffectSpec(type="damage", amount=5),
            EffectSpec(type="apply_status", status="stunned", payload={"stun_classes": ["all"]}),
        ],
    )
    action = PendingAction(
        id="p1:test", player_id="p1", caster_slot=0, skill_id=skill.id, target_player_id="p2", target_slot=0
    )

    hard_score = _cpu_action_score(state, "p1", action, skill, difficulty="hard")
    normal_score = _cpu_action_score(state, "p1", action, skill, difficulty="normal")
    easy_score = _cpu_action_score(state, "p1", action, skill, difficulty="easy")

    assert hard_score > normal_score > easy_score


def test_cpu_action_score_hard_ignores_invisible_unrevealed_counter_status():
    """Hard must not react to a trap the opponent hasn't revealed -- seeing an
    unrevealed invisible status is information no human opponent would have."""

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        StatusEffect,
        TargetRule,
    )

    caster = CharacterState(character_id="attacker", name="Attacker")
    target = CharacterState(character_id="target", name="Target", hp=90, max_hp=100)
    target.statuses = [
        StatusEffect(
            id="hidden_counter",
            name="Hidden Counter",
            source_player_id="p2",
            source_slot=0,
            target_player_id="p2",
            target_slot=0,
            duration=2,
            invisible=True,
            revealed=False,
            payload={"counter": "first_harmful"},
        )
    ]
    state = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[caster]),
            "p2": PlayerState(id="p2", name="P2", team=[target]),
        },
        turn_player_id="p1",
    )
    skill = SkillSpec(
        id="basic_strike",
        name="Basic Strike",
        text="",
        cost=[EnergyType.GREEN],
        cooldown=0,
        target_rule=TargetRule(kind="enemy"),
        classes=[],
        effects=[EffectSpec(type="damage", amount=15)],
    )
    action = PendingAction(
        id="p1:test", player_id="p1", caster_slot=0, skill_id=skill.id, target_player_id="p2", target_slot=0
    )

    hidden_counter_score = _cpu_action_score(state, "p1", action, skill, difficulty="hard")
    target.statuses = []
    no_counter_score = _cpu_action_score(state, "p1", action, skill, difficulty="hard")

    assert hidden_counter_score == no_counter_score


def test_cpu_action_score_hard_reacts_to_a_revealed_counter_status():
    """A revealed trap is real information the CPU is allowed to use."""

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        StatusEffect,
        TargetRule,
    )

    caster = CharacterState(character_id="attacker", name="Attacker")
    target = CharacterState(character_id="target", name="Target", hp=90, max_hp=100)
    target.statuses = [
        StatusEffect(
            id="revealed_counter",
            name="Revealed Counter",
            source_player_id="p2",
            source_slot=0,
            target_player_id="p2",
            target_slot=0,
            duration=2,
            invisible=True,
            revealed=True,
            payload={"counter": "first_harmful"},
        )
    ]
    state = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[caster]),
            "p2": PlayerState(id="p2", name="P2", team=[target]),
        },
        turn_player_id="p1",
    )
    skill = SkillSpec(
        id="basic_strike",
        name="Basic Strike",
        text="",
        cost=[EnergyType.GREEN],
        cooldown=0,
        target_rule=TargetRule(kind="enemy"),
        classes=[],
        effects=[EffectSpec(type="damage", amount=15)],
    )
    action = PendingAction(
        id="p1:test", player_id="p1", caster_slot=0, skill_id=skill.id, target_player_id="p2", target_slot=0
    )

    revealed_counter_score = _cpu_action_score(state, "p1", action, skill, difficulty="hard")
    target.statuses = []
    no_counter_score = _cpu_action_score(state, "p1", action, skill, difficulty="hard")

    assert revealed_counter_score < no_counter_score


def test_cpu_action_score_hard_ignores_counter_risk_for_uncounterable_skill():
    """An Uncounterable skill can't trigger the counter, so Hard shouldn't fear it."""

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        StatusEffect,
        TargetRule,
    )

    caster = CharacterState(character_id="attacker", name="Attacker")
    target = CharacterState(character_id="target", name="Target", hp=90, max_hp=100)
    target.statuses = [
        StatusEffect(
            id="visible_counter",
            name="Visible Counter",
            source_player_id="p2",
            source_slot=0,
            target_player_id="p2",
            target_slot=0,
            duration=2,
            invisible=False,
            payload={"counter": "first_harmful"},
        )
    ]
    state = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[caster]),
            "p2": PlayerState(id="p2", name="P2", team=[target]),
        },
        turn_player_id="p1",
    )
    uncounterable_skill = SkillSpec(
        id="uncounterable_strike",
        name="Uncounterable Strike",
        text="",
        cost=[EnergyType.GREEN],
        cooldown=0,
        target_rule=TargetRule(kind="enemy"),
        classes=[SkillClass.UNCOUNTERABLE],
        effects=[EffectSpec(type="damage", amount=15)],
    )
    action = PendingAction(
        id="p1:test",
        player_id="p1",
        caster_slot=0,
        skill_id=uncounterable_skill.id,
        target_player_id="p2",
        target_slot=0,
    )

    uncounterable_score = _cpu_action_score(state, "p1", action, uncounterable_skill, difficulty="hard")
    target.statuses = []
    no_counter_score = _cpu_action_score(state, "p1", action, uncounterable_skill, difficulty="hard")

    assert uncounterable_score == no_counter_score


def test_cpu_action_score_hard_lethal_bonus_requires_condition_to_actually_hold():
    """A conditional 'finisher' whose condition isn't met can't actually kill,
    so it must not get the lethal bonus just because its listed amount would."""

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        TargetRule,
    )

    caster = CharacterState(character_id="attacker", name="Attacker")
    target = CharacterState(character_id="target", name="Target", hp=20, max_hp=100)
    state = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[caster]),
            "p2": PlayerState(id="p2", name="P2", team=[target]),
        },
        turn_player_id="p1",
    )
    conditional_finisher = SkillSpec(
        id="conditional_finisher",
        name="Conditional Finisher",
        text="",
        cost=[EnergyType.GREEN],
        cooldown=0,
        target_rule=TargetRule(kind="enemy"),
        classes=[],
        effects=[
            EffectSpec(type="damage", amount=25, payload={"condition_status": "marked"}),
        ],
    )
    real_finisher = SkillSpec(
        id="real_finisher",
        name="Real Finisher",
        text="",
        cost=[EnergyType.GREEN],
        cooldown=0,
        target_rule=TargetRule(kind="enemy"),
        classes=[],
        effects=[EffectSpec(type="damage", amount=18)],
    )
    conditional_action = PendingAction(
        id="p1:cond",
        player_id="p1",
        caster_slot=0,
        skill_id=conditional_finisher.id,
        target_player_id="p2",
        target_slot=0,
    )
    real_action = PendingAction(
        id="p1:real", player_id="p1", caster_slot=0, skill_id=real_finisher.id, target_player_id="p2", target_slot=0
    )

    conditional_score = _cpu_action_score(state, "p1", conditional_action, conditional_finisher, difficulty="hard")
    real_score = _cpu_action_score(state, "p1", real_action, real_finisher, difficulty="hard")

    assert conditional_score < real_score


def test_hard_cpu_effective_outcome_handles_shield_aggregate_dr_and_multi_hit():
    from jjk_arena.battle_v2.manager import _cpu_effective_outcome
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        DamageType,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        StatusEffect,
        TargetRule,
    )

    def outcome(effects, statuses=None, hp=20):
        caster = CharacterState(character_id="attacker", name="Attacker")
        target = CharacterState(character_id="target", name="Target", hp=hp, max_hp=100)
        target.statuses = list(statuses or [])
        state = BattleState(
            players={
                "p1": PlayerState(id="p1", name="P1", team=[caster]),
                "p2": PlayerState(id="p2", name="P2", team=[target]),
            },
            turn_player_id="p1",
        )
        skill = SkillSpec(
            id="test_strike", name="Test Strike", text="", cost=[], cooldown=0,
            target_rule=TargetRule(kind="enemy"), classes=[], effects=effects,
        )
        action = PendingAction(
            id="p1:test", player_id="p1", caster_slot=0, skill_id=skill.id,
            target_player_id="p2", target_slot=0,
        )
        result = _cpu_effective_outcome(state, "p1", action, skill)
        return {
            key: result[key]
            for key in ("hp_damage", "defense_damage", "kills", "statuses_applied", "control_statuses")
        }

    shield = StatusEffect(
        "shield", "Shield", "p2", 0, "p2", 0, 2,
        payload={"destructible_defense": 50},
    )
    reduction = StatusEffect(
        "reduction", "Reduction", "p2", 0, "p2", 0, 2,
        payload={"damage_reduction": 10},
    )
    invulnerable = StatusEffect(
        "invulnerable", "Invulnerable", "p2", 0, "p2", 0, 2,
        payload={"invulnerable": True},
    )
    anti_domain = StatusEffect(
        "anti_domain", "Anti-Domain", "p2", 0, "p2", 0, 2,
        payload={"anti_domain": True, "damage_reduction": 10},
    )

    assert outcome([EffectSpec(type="damage", amount=25)], [shield]) == {
        "hp_damage": 0, "defense_damage": 25, "kills": 0,
        "statuses_applied": 0, "control_statuses": 0,
    }
    assert outcome([EffectSpec(type="damage", amount=25)], [reduction]) == {
        "hp_damage": 15, "defense_damage": 0, "kills": 0,
        "statuses_applied": 0, "control_statuses": 0,
    }
    assert outcome([
        EffectSpec(type="damage", amount=10),
        EffectSpec(type="damage", amount=10),
    ]) == {"hp_damage": 20, "defense_damage": 0, "kills": 1, "statuses_applied": 0, "control_statuses": 0}
    assert outcome([
        EffectSpec(type="damage", amount=15, damage_type=DamageType.PIERCING),
    ]) == {"hp_damage": 15, "defense_damage": 0, "kills": 0, "statuses_applied": 0, "control_statuses": 0}
    assert outcome([EffectSpec(type="damage", amount=25)], [invulnerable]) == {
        "hp_damage": 0, "defense_damage": 0, "kills": 0,
        "statuses_applied": 0, "control_statuses": 0,
    }
    assert outcome([
        EffectSpec(type="damage", amount=25, damage_type=DamageType.SURE_HIT),
    ], [anti_domain]) == {
        "hp_damage": 15, "defense_damage": 0, "kills": 0,
        "statuses_applied": 0, "control_statuses": 0,
    }
    marked = StatusEffect("marked", "Marked", "p1", 0, "p2", 0, 2)
    conditional_stun = EffectSpec(
        type="apply_status", status="stunned", duration=2,
        payload={"condition_status": "marked", "stun_classes": ["all"]},
    )
    assert outcome([conditional_stun]) == {
        "hp_damage": 0, "defense_damage": 0, "kills": 0,
        "statuses_applied": 0, "control_statuses": 0,
    }
    assert outcome([conditional_stun], [marked]) == {
        "hp_damage": 0, "defense_damage": 0, "kills": 0,
        "statuses_applied": 1, "control_statuses": 1,
    }
    for payload in ({"damage_output_delta": -10}, {"turn_end_damage": 10}):
        assert outcome([
            EffectSpec(type="apply_status", status="enemy_debuff", duration=2, payload=payload),
        ]) == {
            "hp_damage": 0, "defense_damage": 0, "kills": 0,
            "statuses_applied": 1, "control_statuses": 1,
        }


def test_hard_cpu_effective_outcome_uses_one_viewer_safe_baseline():
    from jjk_arena.battle_v2.manager import _cpu_effective_outcome
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        TargetRule,
    )

    def outcome(*, hidden_shield: bool):
        caster = CharacterState("attacker", "Attacker")
        target = CharacterState("target", "Target")
        if hidden_shield:
            target.statuses.append(StatusEffect(
                "secret_shield", "Secret Shield", "p2", 0, "p2", 0, 2,
                payload={"destructible_defense": 50}, invisible=True,
            ))
        state = BattleState(
            players={
                "p1": PlayerState(id="p1", name="P1", team=[caster]),
                "p2": PlayerState(id="p2", name="P2", team=[target]),
            },
            turn_player_id="p1",
        )
        skill = SkillSpec(
            id="strike", name="Strike", text="", cost=[], cooldown=0,
            target_rule=TargetRule(kind="enemy"), classes=[],
            effects=[EffectSpec(type="damage", amount=25)],
        )
        action = PendingAction("strike", "p1", 0, skill.id, "p2", 0)
        return _cpu_effective_outcome(state, "p1", action, skill)

    public = outcome(hidden_shield=False)
    hidden = outcome(hidden_shield=True)

    assert (hidden["hp_damage"], hidden["defense_damage"]) == (25, 0)
    assert hidden == public


def test_hard_cpu_prefix_preserves_turn_and_aggregate_damage_reduction_budget():
    from jjk_arena.battle_v2.manager import _cpu_effective_outcome, _cpu_simulate_queue
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        TargetRule,
    )

    target = CharacterState("target", "Target")
    target.statuses.append(StatusEffect(
        "guard", "Guard", "p2", 0, "p2", 0, 2,
        payload={"damage_reduction": 10},
    ))
    state = BattleState(
        players={
            "p1": PlayerState(
                id="p1", name="P1",
                team=[CharacterState("first", "First"), CharacterState("second", "Second")],
            ),
            "p2": PlayerState(id="p2", name="P2", team=[target]),
        },
        turn_player_id="p1",
    )
    strike = SkillSpec(
        id="strike", name="Strike", text="", cost=[], cooldown=0,
        target_rule=TargetRule(kind="enemy"), classes=[],
        effects=[EffectSpec(type="damage", amount=15)],
    )
    first = PendingAction("first", "p1", 0, strike.id, "p2", 0)
    second = PendingAction("second", "p1", 1, strike.id, "p2", 0)

    prefix = _cpu_simulate_queue(state, "p1", [first], {strike.id: strike})

    assert prefix is not None
    assert prefix.turn_number == state.turn_number == 1
    assert prefix.players["p2"].team[0].hp == 95
    assert prefix.players["p2"].team[0].turn_damage_reduction_used == 10
    assert prefix.players["p2"].team[0].statuses[0].duration == 2
    assert _cpu_effective_outcome(prefix, "p1", second, strike)["hp_damage"] == 15


def test_hard_cpu_preserves_defensive_status_value_and_counts_healing_once():
    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        TargetRule,
    )

    state = BattleState(
        players={
            "p1": PlayerState(
                id="p1", name="P1",
                team=[CharacterState("support", "Support"), CharacterState("ally", "Ally", hp=90)],
            ),
            "p2": PlayerState(id="p2", name="P2", team=[CharacterState("enemy", "Enemy")]),
        },
        turn_player_id="p1",
    )
    guard = SkillSpec(
        id="guard", name="Guard", text="", cost=[], cooldown=0,
        target_rule=TargetRule(kind="self"), classes=[],
        effects=[EffectSpec(
            type="apply_status", status="guarded", duration=2, target="self",
            payload={"counter": True},
        )],
    )
    guard_action = PendingAction("guard", "p1", 0, guard.id, "p1", 0)
    heal = SkillSpec(
        id="heal", name="Heal", text="", cost=[], cooldown=0,
        target_rule=TargetRule(kind="ally"), classes=[],
        effects=[EffectSpec(type="heal", amount=10)],
    )
    heal_action = PendingAction("heal", "p1", 0, heal.id, "p1", 1)

    assert _cpu_action_score(state, "p1", guard_action, guard, difficulty="hard") > _cpu_action_score(
        state, "p1", guard_action, guard, difficulty="normal"
    )
    assert _cpu_action_score(state, "p1", heal_action, heal, difficulty="normal") == 30
    assert _cpu_action_score(state, "p1", heal_action, heal, difficulty="hard") == 32


def test_hard_cpu_partial_queue_avoids_targets_yuji_already_killed():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match(
        "partial-queue",
        [
            {"id": "p1", "name": "Enemy", "team": ["maki_zenin", "panda", "mai_zenin"]},
            {"id": "p2", "name": "CPU", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
        ],
        difficulty="hard",
    )
    state = manager.get_state("partial-queue")
    state.turn_player_id = "p2"
    state.players["p2"].energy = {energy: 0 for energy in EnergyType}
    state.players["p2"].energy[EnergyType.GREEN] = 1
    state.players["p2"].energy[EnergyType.BLUE] = 2
    state.players["p1"].team[0].hp = 10

    manager.take_cpu_turn("partial-queue", "p2")

    damage_events = [event for event in state.event_log if event.type == "damage"]
    assert [(event.payload["source_slot"], event.payload["target_slot"]) for event in damage_events] == [
        (0, 0), (1, 1), (2, 1),
    ]
    assert state.players["p1"].team[0].alive is False


def test_five_hp_hard_toge_chooses_survival_over_nonlethal_blast_away():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match(
        "toge-survival",
        [
            {"id": "p1", "name": "Enemy", "team": ["maki_zenin", "panda", "mai_zenin"]},
            {"id": "p2", "name": "CPU", "team": ["toge_inumaki", "yuji_itadori", "megumi_fushiguro"]},
        ],
        difficulty="hard",
    )
    state = manager.get_state("toge-survival")
    state.turn_player_id = "p2"
    state.players["p2"].energy = {energy: 0 for energy in EnergyType}
    state.players["p2"].energy[EnergyType.BLUE] = 1
    state.players["p2"].energy[EnergyType.RED] = 1
    state.players["p2"].team[0].hp = 5
    for slot in (1, 2):
        state.players["p2"].team[slot].hp = 0
        state.players["p2"].team[slot].alive = False

    manager.take_cpu_turn("toge-survival", "p2")

    resolved = [event.message for event in state.event_log if event.type == "skill_resolved"]
    assert resolved == ["Toge Inumaki used Throat Medicine"]
    assert state.players["p2"].team[0].hp == 5
    assert state.players["p2"].team[0].alive is True


def test_easy_and_normal_never_value_self_damage_as_enemy_lethal_damage():
    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import BattleState, CharacterState, EffectSpec, PendingAction, PlayerState, SkillSpec, TargetRule

    state = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[CharacterState("caster", "Caster")]),
            "p2": PlayerState(id="p2", name="P2", team=[CharacterState("target", "Target", hp=5)]),
        },
        turn_player_id="p1",
    )
    skill = SkillSpec(
        id="self_cost", name="Self Cost", text="", cost=[], cooldown=0,
        target_rule=TargetRule(kind="enemy"), classes=[],
        effects=[EffectSpec(type="damage", amount=10, target="self")],
    )
    action = PendingAction("self-cost", "p1", 0, skill.id, "p2", 0)

    assert _cpu_action_score(state, "p1", action, skill, difficulty="easy") == 0
    assert _cpu_action_score(state, "p1", action, skill, difficulty="normal") == 0


def test_cpu_action_score_hard_reacts_to_heal_urgency_earlier_than_normal():
    """Hard should value topping off a mid-HP ally sooner than Normal does."""

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        TargetRule,
    )

    caster = CharacterState(character_id="healer", name="Healer")
    ally = CharacterState(character_id="ally", name="Ally", hp=50, max_hp=100)
    state = BattleState(
        players={"p1": PlayerState(id="p1", name="P1", team=[caster, ally])},
        turn_player_id="p1",
    )
    skill = SkillSpec(
        id="mend",
        name="Mend",
        text="",
        cost=[EnergyType.GREEN],
        cooldown=0,
        target_rule=TargetRule(kind="ally"),
        classes=[],
        effects=[EffectSpec(type="heal", amount=10)],
    )
    action = PendingAction(
        id="p1:test", player_id="p1", caster_slot=0, skill_id=skill.id, target_player_id="p1", target_slot=1
    )

    hard_score = _cpu_action_score(state, "p1", action, skill, difficulty="hard")
    normal_score = _cpu_action_score(state, "p1", action, skill, difficulty="normal")

    assert hard_score > normal_score


def test_cpu_action_score_hard_avoids_feeding_an_active_counter():
    """Hard alone reads counter/reflect risk on the target and discounts a
    harmful action against it; Normal doesn't look at this at all."""

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        StatusEffect,
        TargetRule,
    )

    caster = CharacterState(character_id="attacker", name="Attacker")
    target = CharacterState(character_id="target", name="Target", hp=80, max_hp=100)
    target.statuses.append(
        StatusEffect("counter_stance", "Counter Stance", "p2", 0, "p2", 0, duration=2, payload={"counter": True})
    )
    state = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[caster]),
            "p2": PlayerState(id="p2", name="P2", team=[target]),
        },
        turn_player_id="p1",
    )
    skill = SkillSpec(
        id="strike", name="Strike", text="", cost=[EnergyType.GREEN], cooldown=0,
        target_rule=TargetRule(kind="enemy"), classes=[], effects=[EffectSpec(type="damage", amount=20)],
    )
    action = PendingAction(
        id="p1:test", player_id="p1", caster_slot=0, skill_id=skill.id, target_player_id="p2", target_slot=0
    )

    hard_score = _cpu_action_score(state, "p1", action, skill, difficulty="hard")
    normal_score = _cpu_action_score(state, "p1", action, skill, difficulty="normal")

    # Same raw damage either way, but Hard's counter-risk penalty must pull
    # its score below what an otherwise-identical safe strike would score.
    target_no_counter = CharacterState(character_id="target2", name="Target2", hp=80, max_hp=100)
    state_safe = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[caster]),
            "p2": PlayerState(id="p2", name="P2", team=[target_no_counter]),
        },
        turn_player_id="p1",
    )
    hard_score_safe = _cpu_action_score(state_safe, "p1", action, skill, difficulty="hard")
    normal_score_safe = _cpu_action_score(state_safe, "p1", action, skill, difficulty="normal")

    assert hard_score < hard_score_safe
    # Normal ignores counter risk entirely: identical score with or without the status.
    assert normal_score == normal_score_safe


def test_cpu_action_score_hard_values_a_ready_payoff_over_blind_setup():
    """Hard reads whether a conditional damage effect's condition_status is
    actually true of the live target; Normal just sums the listed amount."""

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        StatusEffect,
        TargetRule,
    )

    def make_state(marked: bool):
        caster = CharacterState(character_id="attacker", name="Attacker")
        target = CharacterState(character_id="target", name="Target", hp=80, max_hp=100)
        if marked:
            target.statuses.append(StatusEffect("nail", "Nail", "p1", 0, "p2", 0, duration=3))
        return BattleState(
            players={
                "p1": PlayerState(id="p1", name="P1", team=[caster]),
                "p2": PlayerState(id="p2", name="P2", team=[target]),
            },
            turn_player_id="p1",
        )

    skill = SkillSpec(
        id="resonance", name="Resonance", text="", cost=[EnergyType.GREEN], cooldown=0,
        target_rule=TargetRule(kind="enemy"), classes=[],
        effects=[EffectSpec(type="damage", amount=25, payload={"condition_status": "nail"})],
    )
    action = PendingAction(
        id="p1:test", player_id="p1", caster_slot=0, skill_id=skill.id, target_player_id="p2", target_slot=0
    )

    hard_marked = _cpu_action_score(make_state(True), "p1", action, skill, difficulty="hard")
    hard_unmarked = _cpu_action_score(make_state(False), "p1", action, skill, difficulty="hard")
    normal_marked = _cpu_action_score(make_state(True), "p1", action, skill, difficulty="normal")
    normal_unmarked = _cpu_action_score(make_state(False), "p1", action, skill, difficulty="normal")

    # Hard correctly values the payoff only when the mark is actually there.
    assert hard_marked > hard_unmarked
    # Normal blindly counts the listed amount either way -- it doesn't read the board.
    assert normal_marked == normal_unmarked


def test_cpu_action_score_hard_reserves_energy_for_teammates_still_to_act():
    """A non-lethal, non-control action gets discounted further on Hard when
    other living teammates still need to draw from the same energy pool."""

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        TargetRule,
    )

    caster = CharacterState(character_id="attacker", name="Attacker")
    target = CharacterState(character_id="target", name="Target", hp=80, max_hp=100)
    state = BattleState(
        players={
            "p1": PlayerState(id="p1", name="P1", team=[caster]),
            "p2": PlayerState(id="p2", name="P2", team=[target]),
        },
        turn_player_id="p1",
    )
    skill = SkillSpec(
        id="jab", name="Jab", text="", cost=[EnergyType.GREEN, EnergyType.GREEN], cooldown=0,
        target_rule=TargetRule(kind="enemy"), classes=[], effects=[EffectSpec(type="damage", amount=15)],
    )
    action = PendingAction(
        id="p1:test", player_id="p1", caster_slot=0, skill_id=skill.id, target_player_id="p2", target_slot=0
    )

    hard_alone = _cpu_action_score(state, "p1", action, skill, difficulty="hard", remaining_teammates=0)
    hard_with_teammates = _cpu_action_score(state, "p1", action, skill, difficulty="hard", remaining_teammates=2)
    normal_with_teammates = _cpu_action_score(state, "p1", action, skill, difficulty="normal", remaining_teammates=2)

    assert hard_with_teammates < hard_alone
    # Normal doesn't reserve energy at all -- remaining_teammates is a no-op for it.
    normal_alone = _cpu_action_score(state, "p1", action, skill, difficulty="normal", remaining_teammates=0)
    assert normal_with_teammates == normal_alone


def test_cpu_difficulty_fixed_decision_corpus_shows_meaningful_normal_vs_hard_divergence():
    """Fixed decision-separation gate: across a representative corpus of
    tactical states (each with several candidate actions), Hard's chosen
    action (the argmax, not just a raw score delta) must differ from
    Normal's for a meaningful share of scenarios -- not the 0/400 the
    Milestone C audit found when the only difference was an untriggered
    lethal bonus.
    """

    from jjk_arena.battle_v2.manager import _cpu_action_score
    from jjk_arena.battle_v2.models import (
        BattleState,
        CharacterState,
        EffectSpec,
        PendingAction,
        PlayerState,
        SkillSpec,
        StatusEffect,
        TargetRule,
    )

    def base_state(target_hp=80, target_marked=False, target_countering=False, ally_hp=100, extra_teammates=0):
        caster = CharacterState(character_id="attacker", name="Attacker")
        ally_team = [caster] + [
            CharacterState(character_id=f"ally{i}", name=f"Ally {i}", hp=100, max_hp=100)
            for i in range(extra_teammates)
        ]
        target = CharacterState(character_id="target", name="Target", hp=target_hp, max_hp=100)
        if target_marked:
            target.statuses.append(StatusEffect("nail", "Nail", "p1", 0, "p2", 0, duration=3))
        if target_countering:
            target.statuses.append(
                StatusEffect("counter_stance", "Counter Stance", "p2", 0, "p2", 0, duration=2, payload={"counter": True})
            )
        return BattleState(
            players={
                "p1": PlayerState(id="p1", name="P1", team=ally_team),
                "p2": PlayerState(id="p2", name="P2", team=[target]),
            },
            turn_player_id="p1",
        )

    jab = SkillSpec(
        id="jab", name="Jab", text="", cost=[EnergyType.GREEN], cooldown=0,
        target_rule=TargetRule(kind="enemy"), classes=[], effects=[EffectSpec(type="damage", amount=18)],
    )
    payoff = SkillSpec(
        id="payoff", name="Payoff", text="", cost=[EnergyType.GREEN], cooldown=0,
        target_rule=TargetRule(kind="enemy"), classes=[],
        effects=[EffectSpec(type="damage", amount=26, payload={"condition_status": "nail"})],
    )
    setup = SkillSpec(
        id="setup", name="Setup", text="", cost=[EnergyType.GREEN, EnergyType.GREEN], cooldown=0,
        target_rule=TargetRule(kind="enemy"), classes=[],
        effects=[EffectSpec(type="damage", amount=8), EffectSpec(type="apply_status", status="nail")],
    )
    heavy = SkillSpec(
        id="heavy", name="Heavy", text="", cost=[EnergyType.GREEN, EnergyType.GREEN, EnergyType.GREEN], cooldown=0,
        target_rule=TargetRule(kind="enemy"), classes=[], effects=[EffectSpec(type="damage", amount=22)],
    )

    corpus_states = [
        base_state(target_hp=80),
        base_state(target_hp=80, target_marked=True),
        base_state(target_hp=80, target_countering=True),
        base_state(target_hp=80, extra_teammates=2),
        base_state(target_hp=18),
        base_state(target_hp=80, target_marked=True, extra_teammates=2),
        base_state(target_hp=80, target_countering=True, extra_teammates=2),
        base_state(target_hp=80, target_marked=False, extra_teammates=1),
        base_state(target_hp=60, target_marked=True),
        base_state(target_hp=80, target_countering=True, target_marked=True),
    ]
    skills = [jab, payoff, setup, heavy]

    def build_action(skill):
        return PendingAction(
            id=f"p1:{skill.id}", player_id="p1", caster_slot=0, skill_id=skill.id,
            target_player_id="p2", target_slot=0,
        )

    def argmax_choice(state, difficulty, remaining_teammates):
        scored = [
            (
                _cpu_action_score(
                    state, "p1", build_action(skill), skill,
                    difficulty=difficulty, remaining_teammates=remaining_teammates,
                ),
                skill.id,
            )
            for skill in skills
        ]
        return max(scored)[1]

    divergent = 0
    for state in corpus_states:
        remaining_teammates = len(state.players["p1"].team) - 1
        normal_choice = argmax_choice(state, "normal", remaining_teammates)
        hard_choice = argmax_choice(state, "hard", remaining_teammates)
        if normal_choice != hard_choice:
            divergent += 1

    divergence_rate = divergent / len(corpus_states)
    assert divergence_rate >= 0.3, (
        f"Hard only diverged from Normal in {divergent}/{len(corpus_states)} "
        f"fixed corpus scenarios ({divergence_rate:.0%}); minimum gate is 30%."
    )


def test_start_first_creation_match_uses_student_era_catalog_and_rejects_locked_variants():
    manager = BattleV2Manager(rng_seed=1)
    serialized = manager.start_first_creation_match(
        "first-room",
        [
            {
                "id": "p1",
                "name": "Player One",
                "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"],
            },
            {
                "id": "p2",
                "name": "Player Two",
                "team": ["yuta_okkotsu_jjk0", "maki_zenin", "toge_inumaki"],
            },
        ],
    )

    assert "satoru_gojo_young" in serialized["skill_catalog"]
    assert "mahito" not in serialized["skill_catalog"]
    assert serialized["skill_catalog"]["yuji_itadori"]["skills"][0]["id"] == "fc_yuji_itadori_divergent_fist"
    assert manager.get_state("first-room").players["p2"].team[0].character_id == "yuta_okkotsu_jjk0"

    with pytest.raises(BattleV2Error, match="Locked or unknown"):
        manager.start_first_creation_match(
            "bad-first-room",
            [
                {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "megumi_fushiguro", "mahito"]},
                {"id": "p2", "name": "Player Two", "team": ["yuta_okkotsu_jjk0", "maki_zenin", "toge_inumaki"]},
            ],
        )


def first_creation_players():
    return [
        {"id": "p1", "name": "Player One", "team": ["aoi_todo", "noritoshi_kamo", "nobara_kugisaki"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "yuta_okkotsu_jjk0"]},
    ]


def start_first_creation_manager():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("first", first_creation_players())
    state = manager.get_state("first")
    for player in state.players.values():
        for energy in player.energy:
            player.energy[energy] = 5
    return manager, state


def test_first_creation_nobara_resonance_uses_nail_conditional_damage():
    manager, state = start_first_creation_manager()
    state.players["p2"].team[0].statuses.append(StatusEffect("nail", "Nail", "p1", 2, "p2", 0, duration=2))

    manager.submit_plan(
        "first",
        "p1",
        [{"id": "nobara", "caster_slot": 2, "skill_id": "fc_nobara_kugisaki_straw_doll_resonance", "target_player_id": "p2", "target_slot": 0}],
    )
    serialized = manager.confirm_queue("first", "p1")

    assert serialized["players"]["p2"]["team"][0]["hp"] == 75
    assert any(event["type"] == "damage_skipped" for event in serialized["event_log"])


def test_first_creation_kamo_drains_energy_only_from_blood_marked_target():
    manager, state = start_first_creation_manager()
    state.players["p2"].energy = {energy: 0 for energy in EnergyType}
    state.players["p2"].energy[EnergyType.GREEN] = 1
    state.players["p2"].team[0].statuses.append(StatusEffect("blood_mark", "Blood Mark", "p1", 1, "p2", 0, duration=2))

    manager.submit_plan(
        "first",
        "p1",
        [{"id": "kamo", "caster_slot": 1, "skill_id": "fc_noritoshi_kamo_crimson_binding", "target_player_id": "p2", "target_slot": 0, "wildcard_pays": ["green"]}],
    )
    serialized = manager.confirm_queue("first", "p1")
    assert not any(event["type"] == "energy_drained" for event in serialized["event_log"])
    serialized = manager.end_turn("first", "p2")

    drains = [event for event in serialized["event_log"] if event["type"] == "energy_drained" and event["payload"].get("status") == "blood_mark_drain"]
    assert len(drains) == 1
    assert drains[0]["payload"]["energy"] in {"green", "red", "blue", "white"}


def test_first_creation_todo_redirects_next_harmful_direct_skill():
    manager, state = start_first_creation_manager()

    manager.submit_plan(
        "first",
        "p1",
        [{"id": "todo", "caster_slot": 0, "skill_id": "fc_aoi_todo_boogie_woogie", "target_player_id": "p2", "target_slot": 0, "alternate_target_player_id": "p1", "alternate_target_slot": 0}],
    )
    manager.confirm_queue("first", "p1")
    state = manager.get_state("first")
    for energy in state.players["p2"].energy:
        state.players["p2"].energy[energy] = 5

    manager.submit_plan(
        "first",
        "p2",
        [{"id": "yuji", "caster_slot": 0, "skill_id": "fc_yuji_itadori_divergent_fist", "target_player_id": "p1", "target_slot": 1}],
    )
    serialized = manager.confirm_queue("first", "p2")

    assert serialized["players"]["p1"]["team"][0]["hp"] == 80
    assert serialized["players"]["p1"]["team"][1]["hp"] == 100
    assert any(event["type"] == "skill_redirected" for event in serialized["event_log"])


def test_first_creation_yuta_rika_replaces_skill_with_megaphone():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match(
        "rika",
        [
            {"id": "p1", "name": "Player One", "team": ["yuta_okkotsu_jjk0", "maki_zenin", "toge_inumaki"]},
            {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        ],
    )
    state = manager.get_state("rika")
    for player in state.players.values():
        for energy in player.energy:
            player.energy[energy] = 5

    manager.submit_plan(
        "rika",
        "p1",
        [{"id": "rika", "caster_slot": 0, "skill_id": "fc_yuta_okkotsu_jjk0_rikas_curse", "target_player_id": "p1", "target_slot": 0, "wildcard_pays": ["green"]}],
    )
    manager.confirm_queue("rika", "p1")

    yuta = manager.get_state("rika").players["p1"].team[0]
    assert yuta.skill_replacements["fc_yuta_okkotsu_jjk0_rikas_curse"] == "fc_yuta_okkotsu_jjk0_cursed_speech_megaphone"


def test_first_creation_geto_curse_stock_unlocks_compressed_uzumaki():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match(
        "geto-stock",
        [
            {"id": "p1", "name": "Player One", "team": ["suguru_geto_young", "satoru_gojo_young", "shoko_ieiri_young"]},
            {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        ],
    )
    state = manager.get_state("geto-stock")
    geto = state.players["p1"].team[0]
    swarm = "fc_suguru_geto_young_swarm_curse"
    compressed = "fc_suguru_geto_young_compressed_uzumaki"

    # Directly exercise the stack merge path through three actual skill applications.
    for player in state.players.values():
        for energy in player.energy:
            player.energy[energy] = 9
    for turn in range(3):
        state.turn_player_id = "p1"
        manager.submit_plan("geto-stock", "p1", [{"id": f"swarm-{turn}", "caster_slot": 0, "skill_id": swarm, "target_player_id": "p2", "target_slot": 0}])
        manager.confirm_queue("geto-stock", "p1")
        state = manager.get_state("geto-stock")
        geto = state.players["p1"].team[0]
        geto.acted_this_turn = False
        for player in state.players.values():
            player.queue_confirmed = False
            for energy in player.energy:
                player.energy[energy] = 9

    stock = next(status for status in geto.statuses if status.id == "curse_stock")
    assert stock.stacks == 3
    assert geto.skill_replacements[swarm] == compressed


def test_first_creation_utahime_ritual_rhythm_applies_to_team():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match(
        "utahime-team",
        [
            {"id": "p1", "name": "Player One", "team": ["utahime_iori_young", "mei_mei_young", "shoko_ieiri_young"]},
            {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        ],
    )
    state = manager.get_state("utahime-team")
    for player in state.players.values():
        for energy in player.energy:
            player.energy[energy] = 5

    manager.submit_plan(
        "utahime-team",
        "p1",
        [{"id": "ritual", "caster_slot": 0, "skill_id": "fc_utahime_iori_young_ritual_rhythm", "target_player_id": "p1", "target_slots": [0, 1, 2]}],
    )
    serialized = manager.confirm_queue("utahime-team", "p1")

    assert all(
        any(status["id"] == "ritual_rhythm" for status in character["statuses"])
        for character in serialized["players"]["p1"]["team"]
    )
    assert any(event["type"] == "team_status_applied" for event in serialized["event_log"])
