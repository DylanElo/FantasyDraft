from jjk_arena.battle_v2.first_creation_progression import evaluate_first_creation_progress
from jjk_arena.battle_v2.manager import BattleV2Manager
from jjk_arena.battle_v2.models import BattleEvent


def _players():
    return [
        {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        {"id": "p2", "name": "Player Two", "team": ["maki_zenin", "toge_inumaki", "panda"]},
    ]


def test_first_creation_match_serializes_initial_mission_progress():
    manager = BattleV2Manager(rng_seed=1)
    payload = manager.start_first_creation_match("room", _players())

    assert payload["roster_mode"] == "first_creation"
    progress = payload["first_creation_progress"]
    story = next(mission for mission in progress["missions"] if mission["id"] == "welcome_to_jujutsu_high")
    assert story["status"] == "active"
    assert story["objectives"][0]["label"] == "Win one first-creation match"


def test_story_tutorial_mission_completes_from_cumulative_events():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", _players())
    state = manager.get_state("room")
    for index, skill_id in enumerate([
        "fc_yuji_itadori_divergent_fist",
        "fc_megumi_fushiguro_divine_dogs",
        "fc_nobara_kugisaki_nail_barrage",
    ]):
        state.event_log.append(BattleEvent(
            type="skill_resolved",
            message=f"skill {index}",
            turn_number=1,
            payload={"player_id": "p1", "skill_id": skill_id},
        ))
    state.winner_id = "p1"

    payload = manager.serialize_for_player("room", "p1")

    assert "welcome_to_jujutsu_high" in payload["first_creation_progress"]["completed_ids"]
    assert payload["first_creation_progress"]["last_completed"] == ["welcome_to_jujutsu_high"]
    assert "mission_board" in payload["first_creation_progress"]["unlocked"]


def test_yuta_route_tracks_rika_state_and_replacement_skill():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["yuta_okkotsu_jjk0", "maki_zenin", "toge_inumaki"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Rika", turn_number=1, payload={"status": "rikas_curse", "source_player_id": "p1"}),
        BattleEvent(
            type="skill_resolved",
            message="Megaphone",
            turn_number=2,
            payload={"player_id": "p1", "skill_id": "fc_yuta_okkotsu_jjk0_cursed_speech_megaphone"},
        ),
        BattleEvent(type="status_applied", message="Weapon Specialist", turn_number=1, payload={"status": "weapon_specialist", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Stop", turn_number=1, payload={"status": "stopped", "source_player_id": "p1"}),
    ])

    progress = evaluate_first_creation_progress(state, "p1")

    assert "cursed_child_bond" in progress["completed_ids"]
    assert "jjk0_geto_route" in progress["unlocked"]


def test_cursed_child_bond_is_incomplete_without_makis_or_toges_objective():
    """Regression: this mission's original two objectives were both Yuta's,
    so Maki and Toge (also on the recommended team) had no mastery objective
    of their own — mission mastery coverage was team-presence only."""

    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["yuta_okkotsu_jjk0", "maki_zenin", "toge_inumaki"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Rika", turn_number=1, payload={"status": "rikas_curse", "source_player_id": "p1"}),
        BattleEvent(
            type="skill_resolved",
            message="Megaphone",
            turn_number=2,
            payload={"player_id": "p1", "skill_id": "fc_yuta_okkotsu_jjk0_cursed_speech_megaphone"},
        ),
    ])

    progress = evaluate_first_creation_progress(state, "p1")

    assert "cursed_child_bond" not in progress["completed_ids"]
    mission = next(m for m in progress["missions"] if m["id"] == "cursed_child_bond")
    incomplete_labels = {o["label"] for o in mission["objectives"] if not o["complete"]}
    assert "Buff up with Maki's Weapon Specialist" in incomplete_labels
    assert "Stun an enemy with Toge's Stop." in incomplete_labels


def test_kyoto_pressure_gauntlet_completes_from_blood_mark_and_revolver_shot_and_a_win():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["aoi_todo", "noritoshi_kamo", "mai_zenin"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Blood Mark", turn_number=1, payload={"status": "blood_mark", "source_player_id": "p1"}),
        BattleEvent(
            type="skill_resolved",
            message="Revolver Shot",
            turn_number=1,
            payload={"player_id": "p1", "skill_id": "fc_mai_zenin_revolver_shot"},
        ),
        BattleEvent(type="status_applied", message="Boogie Woogie", turn_number=1, payload={"status": "boogie_woogie_redirect", "source_player_id": "p1"}),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "kyoto_pressure_gauntlet" in progress["completed_ids"]
    assert "kyoto_pressure_badge" in progress["unlocked"]


def test_kyoto_pressure_gauntlet_is_incomplete_without_todos_objective():
    """Regression: Blood Mark and Revolver Shot cover Kamo and Mai, but the
    third teammate (Todo) had no objective of his own."""

    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["aoi_todo", "noritoshi_kamo", "mai_zenin"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Blood Mark", turn_number=1, payload={"status": "blood_mark", "source_player_id": "p1"}),
        BattleEvent(
            type="skill_resolved",
            message="Revolver Shot",
            turn_number=1,
            payload={"player_id": "p1", "skill_id": "fc_mai_zenin_revolver_shot"},
        ),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "kyoto_pressure_gauntlet" not in progress["completed_ids"]
    mission = next(m for m in progress["missions"] if m["id"] == "kyoto_pressure_gauntlet")
    assert any(o["label"] == "Set up a redirect with Todo's Boogie Woogie" and not o["complete"] for o in mission["objectives"])


def test_kyoto_pressure_gauntlet_is_ineligible_for_a_different_team():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", _players())
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Blood Mark", turn_number=1, payload={"status": "blood_mark", "source_player_id": "p1"}),
        BattleEvent(
            type="skill_resolved",
            message="Revolver Shot",
            turn_number=1,
            payload={"player_id": "p1", "skill_id": "fc_mai_zenin_revolver_shot"},
        ),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "kyoto_pressure_gauntlet" not in progress["completed_ids"]


def test_kyoto_pressure_gauntlet_does_not_complete_on_a_loss():
    """Regression: the mission description says 'Win with...' but the
    objectives previously did not require winner_is_player at all, so a
    forced defeat still completed the mission and unlocked the badge."""

    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["aoi_todo", "noritoshi_kamo", "mai_zenin"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Blood Mark", turn_number=1, payload={"status": "blood_mark", "source_player_id": "p1"}),
        BattleEvent(
            type="skill_resolved",
            message="Revolver Shot",
            turn_number=1,
            payload={"player_id": "p1", "skill_id": "fc_mai_zenin_revolver_shot"},
        ),
    ])
    state.winner_id = "p2"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "kyoto_pressure_gauntlet" not in progress["completed_ids"]


def test_kyoto_pressure_gauntlet_ignores_blood_mark_applied_by_the_opponent():
    """Regression: status_applied events did not carry source attribution,
    so an opposing mirror-matched Kamo applying Blood Mark satisfied the
    player's own mission objective."""

    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["aoi_todo", "noritoshi_kamo", "mai_zenin"]},
        {"id": "p2", "name": "Player Two", "team": ["aoi_todo", "noritoshi_kamo", "mai_zenin"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Blood Mark", turn_number=1, payload={"status": "blood_mark", "source_player_id": "p2"}),
        BattleEvent(
            type="skill_resolved",
            message="Revolver Shot",
            turn_number=1,
            payload={"player_id": "p1", "skill_id": "fc_mai_zenin_revolver_shot"},
        ),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "kyoto_pressure_gauntlet" not in progress["completed_ids"]


def test_defensive_artillery_drill_completes_from_quick_draw_stun_and_aerial_scout_and_a_win():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["kasumi_miwa", "momo_nishimiya", "kokichi_muta_mechamaru"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Quick Draw Stun", turn_number=1, payload={"status": "quick_draw_stun", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Revealed", turn_number=1, payload={"status": "revealed", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Remote Puppet Net", turn_number=1, payload={"status": "remote_puppet_net", "source_player_id": "p1"}),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "defensive_artillery_drill" in progress["completed_ids"]
    assert "defensive_artillery_badge" in progress["unlocked"]


def test_defensive_artillery_drill_is_incomplete_without_mechamarus_objective():
    """Regression: Quick Draw Stun and Aerial Scout cover Miwa and Momo, but
    the third teammate (Mechamaru) had no objective of his own."""

    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["kasumi_miwa", "momo_nishimiya", "kokichi_muta_mechamaru"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Quick Draw Stun", turn_number=1, payload={"status": "quick_draw_stun", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Revealed", turn_number=1, payload={"status": "revealed", "source_player_id": "p1"}),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "defensive_artillery_drill" not in progress["completed_ids"]
    mission = next(m for m in progress["missions"] if m["id"] == "defensive_artillery_drill")
    assert any(o["label"] == "Lock down an enemy with Mechamaru's Remote Puppet Net" and not o["complete"] for o in mission["objectives"])


def test_defensive_artillery_drill_reveal_objective_requires_the_status_to_actually_apply():
    """Regression: the reveal objective previously only checked that the
    Aerial Scout skill was used/queued, so a countered Aerial Scout (no
    'revealed' status ever landing) still satisfied the objective."""

    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["kasumi_miwa", "momo_nishimiya", "kokichi_muta_mechamaru"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Quick Draw Stun", turn_number=1, payload={"status": "quick_draw_stun", "source_player_id": "p1"}),
        BattleEvent(
            type="skill_resolved",
            message="Aerial Scout (countered)",
            turn_number=1,
            payload={"player_id": "p1", "skill_id": "fc_momo_nishimiya_aerial_scout"},
        ),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "defensive_artillery_drill" not in progress["completed_ids"]


def test_student_reserves_trial_completes_from_gorilla_core_and_crow_mark_and_a_win():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["panda", "utahime_iori_young", "mei_mei_young"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Gorilla Core", turn_number=1, payload={"status": "gorilla_core", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Crow Mark", turn_number=1, payload={"status": "crow_mark", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Solo Solo Kinku", turn_number=1, payload={"status": "solo_solo_kinku", "source_player_id": "p1"}),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "student_reserves_trial" in progress["completed_ids"]
    assert "student_reserves_badge" in progress["unlocked"]


def test_student_reserves_trial_is_incomplete_without_utahimes_objective():
    """Regression: Gorilla Core and Crow Mark cover Panda and Mei Mei, but
    the third teammate (Utahime) had no objective of her own."""

    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["panda", "utahime_iori_young", "mei_mei_young"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Gorilla Core", turn_number=1, payload={"status": "gorilla_core", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Crow Mark", turn_number=1, payload={"status": "crow_mark", "source_player_id": "p1"}),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "student_reserves_trial" not in progress["completed_ids"]
    mission = next(m for m in progress["missions"] if m["id"] == "student_reserves_trial")
    assert any(o["label"] == "Activate Utahime's Solo Solo Kinku" and not o["complete"] for o in mission["objectives"])


def test_student_reserves_trial_does_not_complete_on_a_loss():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["panda", "utahime_iori_young", "mei_mei_young"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Gorilla Core", turn_number=1, payload={"status": "gorilla_core", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Crow Mark", turn_number=1, payload={"status": "crow_mark", "source_player_id": "p1"}),
    ])
    state.winner_id = "p2"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "student_reserves_trial" not in progress["completed_ids"]


def test_outsider_poison_path_completes_from_poison_junpei_alive_nail_and_scent():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["junpei_yoshino", "nobara_kugisaki", "megumi_fushiguro"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "maki_zenin", "toge_inumaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Poison", turn_number=1, payload={"status": "poison", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Poison", turn_number=2, payload={"status": "poison", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Nail", turn_number=1, payload={"status": "nail", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Scent", turn_number=1, payload={"status": "scent", "source_player_id": "p1"}),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "outsider_poison_path" in progress["completed_ids"]
    assert "mahito_intro_mission" in progress["unlocked"]


def test_outsider_poison_path_is_incomplete_without_nobaras_or_megumis_objective():
    """Regression: 'Apply poison twice' and 'Win with Junpei alive' are both
    Junpei's objectives, so Nobara and Megumi (also on the recommended team)
    had no mastery objective of their own."""

    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["junpei_yoshino", "nobara_kugisaki", "megumi_fushiguro"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "maki_zenin", "toge_inumaki"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Poison", turn_number=1, payload={"status": "poison", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Poison", turn_number=2, payload={"status": "poison", "source_player_id": "p1"}),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "outsider_poison_path" not in progress["completed_ids"]
    mission = next(m for m in progress["missions"] if m["id"] == "outsider_poison_path")
    incomplete_labels = {o["label"] for o in mission["objectives"] if not o["complete"]}
    assert "Apply Nail with Nobara's Nail Barrage" in incomplete_labels
    assert "Apply Scent with Megumi's Divine Dogs" in incomplete_labels


def test_outsider_poison_path_ignores_nail_and_scent_applied_by_the_opponent():
    manager = BattleV2Manager(rng_seed=1)
    manager.start_first_creation_match("room", [
        {"id": "p1", "name": "Player One", "team": ["junpei_yoshino", "nobara_kugisaki", "megumi_fushiguro"]},
        {"id": "p2", "name": "Player Two", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
    ])
    state = manager.get_state("room")
    state.event_log.extend([
        BattleEvent(type="status_applied", message="Poison", turn_number=1, payload={"status": "poison", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Poison", turn_number=2, payload={"status": "poison", "source_player_id": "p1"}),
        BattleEvent(type="status_applied", message="Nail", turn_number=1, payload={"status": "nail", "source_player_id": "p2"}),
        BattleEvent(type="status_applied", message="Scent", turn_number=1, payload={"status": "scent", "source_player_id": "p2"}),
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "outsider_poison_path" not in progress["completed_ids"]


def test_every_first_creation_character_appears_in_at_least_one_mission_team():
    from jjk_arena.battle_v2.first_creation_missions import first_creation_missions_payload
    from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_ROSTER

    covered = set()
    for mission in first_creation_missions_payload():
        covered.update(mission["recommended_team"])

    assert covered == set(FIRST_CREATION_ROSTER)
