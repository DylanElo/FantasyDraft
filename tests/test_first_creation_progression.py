from jjk_bot.battle_v2.first_creation_progression import evaluate_first_creation_progress
from jjk_bot.battle_v2.manager import BattleV2Manager
from jjk_bot.battle_v2.models import BattleEvent


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
