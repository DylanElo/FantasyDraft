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


def test_report_is_deterministic_and_wilson_bounds_are_valid():
    first = build_balance_report(TEAMS, games_per_orientation=1, seed_start=8, max_turns=80)
    second = build_balance_report(TEAMS, games_per_orientation=1, seed_start=8, max_turns=80)

    assert first == second
    low, high = wilson_interval(5, 10)
    assert 0 < low < 0.5 < high < 1


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

    assert report["schema_version"] == 2
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


def test_balance_report_cli_emits_json():
    completed = subprocess.run(
        [
            sys.executable, "-m", "jjk_arena.battle_v2.balance_report",
            "--presets", "story_tutorial,tokyo_second_years",
            "--games-per-orientation", "1", "--seed", "20", "--max-turns", "80",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert completed.returncode == 0, completed.stderr
    assert json.loads(completed.stdout)["total_games"] == 2
