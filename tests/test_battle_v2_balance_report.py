import csv
import io
import json
import subprocess
import sys

from jjk_arena.battle_v2 import balance_report
from jjk_arena.battle_v2.balance_report import build_balance_report, report_csv, wilson_interval


TEAMS = {
    "story": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"],
    "second_years": ["maki_zenin", "toge_inumaki", "panda"],
}


def test_report_mirrors_orientation_and_accounts_for_games():
    report = build_balance_report(TEAMS, games_per_orientation=1, seed_start=4, max_turns=80)

    assert report["total_games"] == 2
    assert len(report["matchups"]) == 1
    assert sum(report["matchups"][0]["wins"].values()) == 2
    assert sum(entry["appearances"] for entry in report["characters"].values()) == 12
    assert 0 <= report["first_seat_win_rate"] <= 1
    matrix = report["trio_matchup_matrix"]
    assert matrix["team_order"] == sorted(TEAMS)
    assert matrix["cells"]["story"]["second_years"]["games"] == 2
    assert matrix["cells"]["story"]["story"] is None


def test_report_is_deterministic_and_wilson_bounds_are_valid():
    first = build_balance_report(TEAMS, games_per_orientation=1, seed_start=8, max_turns=80)
    second = build_balance_report(TEAMS, games_per_orientation=1, seed_start=8, max_turns=80)

    assert first == second
    low, high = wilson_interval(5, 10)
    assert 0 < low < 0.5 < high < 1


def test_parallel_report_matches_sequential_matrix_and_metrics():
    sequential = build_balance_report(
        TEAMS, games_per_orientation=1, seed_start=10, max_turns=30, workers=1
    )
    parallel = build_balance_report(
        TEAMS, games_per_orientation=1, seed_start=10, max_turns=30, workers=2
    )

    assert parallel["workers"] == 2
    for key in (
        "matchups", "trio_matchup_matrix", "characters", "energy_conversion",
        "turn_caps", "draws", "no_contests", "first_seat_win_rate",
    ):
        assert parallel[key] == sequential[key]


def test_report_keeps_draw_no_contest_and_turn_cap_distinct(monkeypatch):
    results = iter([
        {"turns_executed": 4, "result_type": "DRAW", "winner_side": None},
        {"turns_executed": 5, "result_type": "TURN_CAP", "winner_side": None},
        {"turns_executed": 1, "result_type": "NO_CONTEST", "winner_side": None},
        {"turns_executed": 3, "result_type": "WIN", "winner_side": "team_a"},
    ])
    monkeypatch.setattr(balance_report, "run_headless_match", lambda *_args, **_kwargs: next(results))

    report = build_balance_report(TEAMS, games_per_orientation=2, seed_start=1, max_turns=20)
    matchup = report["matchups"][0]

    assert report["schema_version"] == 4
    assert (report["draws"], report["no_contests"], report["turn_caps"]) == (1, 1, 1)
    assert matchup["wins"]["draw"] == 1
    assert matchup["wins"]["no_contest"] == 1
    assert matchup["wins"]["turn_cap"] == 1
    assert sum(matchup["wins"].values()) == 4


def test_csv_export_has_one_row_per_matchup():
    report = build_balance_report(TEAMS, games_per_orientation=1, seed_start=12, max_turns=80)
    rows = list(csv.DictReader(io.StringIO(report_csv(report))))

    assert len(rows) == 1
    assert rows[0]["team_a_name"] in TEAMS
    assert "energy_conversion_events" in rows[0]
    assert "conversion_side_win_rate" in rows[0]
    assert "conversion_target_counts" in rows[0]
    assert "team_a_conversion_usage_rate" in rows[0]


def test_report_aggregates_energy_conversion_usage_and_win_correlation(monkeypatch):
    def result(
        result_type,
        winner_side,
        team_a_conversions,
        team_b_conversions,
        team_a_events=None,
        team_b_events=None,
    ):
        return {
            "turns_executed": 4,
            "result_type": result_type,
            "winner_side": winner_side,
            "teams": {
                "team_a": {
                    "energy_conversions": team_a_conversions,
                    "energy_conversion_events": team_a_events or [],
                },
                "team_b": {
                    "energy_conversions": team_b_conversions,
                    "energy_conversion_events": team_b_events or [],
                },
            },
        }

    results = iter([
        result("WIN", "team_a", 2, 0, [{
            "turn_number": 3,
            "sources": {"red": 5},
            "target": "blue",
        }]),
        result("WIN", "team_b", 1, 0),
        result("DRAW", None, 0, 1),
        result("WIN", "team_a", 0, 0),
    ])
    monkeypatch.setattr(
        balance_report,
        "run_headless_match",
        lambda *_args, **_kwargs: next(results),
    )

    report = build_balance_report(
        TEAMS, games_per_orientation=2, seed_start=1, max_turns=20
    )
    conversion = report["energy_conversion"]
    correlation = conversion["win_correlation"]

    assert conversion == report["matchups"][0]["energy_conversion"]
    assert conversion["events"] == 4
    assert conversion["games_with_conversion"] == 3
    assert conversion["game_usage_rate"] == 0.75
    assert conversion["side_games_with_conversion"] == 3
    assert conversion["side_usage_rate"] == 3 / 8
    assert conversion["diagnostic_events"] == 1
    assert conversion["target_counts"] == {"blue": 1}
    assert conversion["source_pips"] == {"red": 5}
    assert conversion["average_turn_number"] == 3
    assert correlation["decided_games"] == 3
    assert correlation["winning_side_events"] == 2
    assert correlation["losing_side_events"] == 1
    assert correlation["decided_side_games_with_conversion"] == 2
    assert correlation["wins_by_sides_with_conversion"] == 1
    assert correlation["descriptive_win_rate_when_used"] == 0.5
    assert correlation["decided_side_games_without_conversion"] == 4
    assert correlation["wins_by_sides_without_conversion"] == 2
    assert correlation["descriptive_win_rate_when_not_used"] == 0.5


def test_balance_report_cli_emits_json():
    completed = subprocess.run(
        [
            sys.executable, "-m", "jjk_arena.battle_v2.balance_report",
            "--presets", "story_tutorial,tokyo_second_years",
            "--games-per-orientation", "1", "--seed", "20", "--max-turns", "80",
            "--workers", "1",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert completed.returncode == 0, completed.stderr
    assert json.loads(completed.stdout)["total_games"] == 2
