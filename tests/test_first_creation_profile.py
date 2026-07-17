from jjk_arena.battle_v2.first_creation_profile import (
    first_creation_profile_payload,
    load_first_creation_profile,
    merge_first_creation_profile_snapshot,
    merge_first_creation_progress,
    save_first_creation_profile,
)
from jjk_arena.battle_v2.first_creation_unlocks import first_creation_unlocks_payload, unknown_first_creation_unlocks


def test_first_creation_profile_persists_completed_missions_and_unlocks(tmp_path, monkeypatch):
    monkeypatch.setenv("JJK_FIRST_CREATION_PROFILE_STORE", str(tmp_path / "profiles.json"))

    progress = {
        "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"],
        "completed_ids": ["welcome_to_jujutsu_high"],
        "unlocked": ["mission_board"],
    }

    merged = merge_first_creation_progress("player-1", progress)
    loaded = load_first_creation_profile("player-1")

    assert merged == loaded
    assert loaded["completed_missions"] == ["welcome_to_jujutsu_high"]
    assert loaded["unlocked"] == ["mission_board"]
    assert loaded["selected_starter_team"] == ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]
    assert "welcome_to_jujutsu_high" in loaded["mission_first_completed_at"]


def test_first_creation_profile_payload_marks_owned_unlocks(tmp_path, monkeypatch):
    monkeypatch.setenv("JJK_FIRST_CREATION_PROFILE_STORE", str(tmp_path / "profiles.json"))
    save_first_creation_profile("player-1", {"completed_missions": ["welcome_to_jujutsu_high"], "unlocked": ["mission_board"]})

    payload = first_creation_profile_payload(load_first_creation_profile("player-1"))
    mission_board = next(unlock for unlock in payload["unlock_details"] if unlock["id"] == "mission_board")

    assert mission_board["owned"] is True
    assert mission_board["status"] == "owned"
    assert payload["unknown_unlocks"] == []


def test_first_creation_unlock_registry_reports_unknown_ids():
    registry = first_creation_unlocks_payload({"mission_board"})

    assert next(unlock for unlock in registry if unlock["id"] == "mission_board")["owned"] is True
    assert unknown_first_creation_unlocks({"mission_board", "unknown_reward"}) == ["unknown_reward"]


def test_profile_snapshot_merge_uses_finish_order_for_recency_sensitive_fields():
    newer, newly_completed = merge_first_creation_profile_snapshot(
        {},
        {
            "completed_ids": ["welcome"],
            "team": ["new-a", "new-b", "new-c"],
        },
        200.0,
    )
    corrected, older_newly_completed = merge_first_creation_profile_snapshot(
        newer,
        {
            "completed_ids": ["welcome"],
            "team": ["old-a", "old-b", "old-c"],
        },
        100.0,
    )

    assert newly_completed == ["welcome"]
    assert older_newly_completed == []
    assert corrected["selected_starter_team"] == ["new-a", "new-b", "new-c"]
    assert corrected["mission_first_completed_at"]["welcome"] == "1970-01-01T00:01:40+00:00"
    assert "_selected_starter_team_at" not in first_creation_profile_payload(corrected)
