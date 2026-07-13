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
        BattleEvent(type="status_applied", message="Rika", turn_number=1, payload={"status": "rikas_curse"}),
        BattleEvent(
            type="skill_resolved",
            message="Megaphone",
            turn_number=2,
            payload={"player_id": "p1", "skill_id": "fc_yuta_okkotsu_jjk0_cursed_speech_megaphone"},
        ),
    ])

    progress = evaluate_first_creation_progress(state, "p1")

    assert "cursed_child_bond" in progress["completed_ids"]
    assert "jjk0_geto_route" in progress["unlocked"]


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
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "kyoto_pressure_gauntlet" in progress["completed_ids"]
    assert "kyoto_pressure_badge" in progress["unlocked"]


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
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "defensive_artillery_drill" in progress["completed_ids"]
    assert "defensive_artillery_badge" in progress["unlocked"]


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
    ])
    state.winner_id = "p1"

    progress = evaluate_first_creation_progress(state, "p1")

    assert "student_reserves_trial" in progress["completed_ids"]
    assert "student_reserves_badge" in progress["unlocked"]


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


def test_every_first_creation_character_appears_in_at_least_one_mission_team():
    from jjk_arena.battle_v2.first_creation_missions import first_creation_missions_payload
    from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_ROSTER

    covered = set()
    for mission in first_creation_missions_payload():
        covered.update(mission["recommended_team"])

    assert covered == set(FIRST_CREATION_ROSTER)
