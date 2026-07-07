import pytest

from jjk_bot.battle_v2.models import EnergyType, SkillClass, StatusEffect
from jjk_bot.battle_v2.manager import BattleV2Manager, BattleV2Error


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
    player.energy[EnergyType.GREEN] = 2
    player.energy[EnergyType.RED] = 0

    serialized = manager.convert_energy("room", "p1", "green", "red")

    assert serialized["players"]["p1"]["energy"]["green"] == 0
    assert serialized["players"]["p1"]["energy"]["red"] == 1
    assert serialized["players"]["p1"]["energy_converted_this_turn"] is True
    assert any(event["type"] == "energy_converted" for event in serialized["event_log"])

    with pytest.raises(BattleV2Error, match="already used"):
        manager.convert_energy("room", "p1", "red", "blue")


def test_convert_energy_resets_after_turn_advances():
    manager, _ = start_manager()
    state = manager.get_state("room")
    state.players["p1"].energy[EnergyType.GREEN] = 2

    manager.convert_energy("room", "p1", "green", "red")
    manager.end_turn("room", "p1")
    state = manager.get_state("room")
    state.players["p2"].energy[EnergyType.BLUE] = 2

    serialized = manager.convert_energy("room", "p2", "blue", "white")

    assert serialized["players"]["p2"]["energy"]["white"] >= 1
    assert serialized["players"]["p2"]["energy_converted_this_turn"] is True
    assert manager.get_state("room").players["p1"].energy_converted_this_turn is False


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
        manager.convert_energy("room", "p1", "green", "red")


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

    assert any(event["type"] == "energy_drained" and event["payload"].get("energy") == "green" for event in serialized["event_log"])


def test_first_creation_todo_redirects_next_harmful_direct_skill():
    manager, state = start_first_creation_manager()

    manager.submit_plan(
        "first",
        "p1",
        [{"id": "todo", "caster_slot": 0, "skill_id": "fc_aoi_todo_boogie_woogie", "target_player_id": "p2", "target_slot": 0}],
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
