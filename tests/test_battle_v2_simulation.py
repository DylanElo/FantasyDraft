import json
import subprocess
import sys

from jjk_arena.battle_v2.simulation import run_headless_match, run_simulation_batch


TEAM_A = ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]
TEAM_B = ["maki_zenin", "panda", "mai_zenin"]


def test_headless_match_is_deterministic_and_privacy_safe():
    first = run_headless_match(TEAM_A, TEAM_B, seed=11, max_turns=80)
    second = run_headless_match(TEAM_A, TEAM_B, seed=11, max_turns=80)

    assert first == second
    assert first["schema_version"] == 1
    assert set(first["teams"]) == {"team_a", "team_b"}
    assert "event_log" not in first
    assert "player_id" not in json.dumps(first)


def test_headless_match_reports_explicit_turn_cap():
    result = run_headless_match(TEAM_A, TEAM_B, seed=3, max_turns=1)

    assert result["turn_cap_reached"] is True
    assert result["outcome"] == "turn_cap"
    assert result["turns_executed"] == 1


def test_batch_outcomes_account_for_every_game():
    result = run_simulation_batch(TEAM_A, TEAM_B, games=4, seed_start=20, max_turns=80)

    assert sum(result["outcomes"].values()) == 4
    assert len(result["matches"]) == 4
    assert result["average_turns"] > 0


def test_simulation_cli_emits_json():
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "jjk_arena.battle_v2.simulation",
            "--team-a", ",".join(TEAM_A),
            "--team-b", ",".join(TEAM_B),
            "--games", "2",
            "--seed", "30",
            "--max-turns", "80",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert completed.returncode == 0, completed.stderr
    assert json.loads(completed.stdout)["games"] == 2
