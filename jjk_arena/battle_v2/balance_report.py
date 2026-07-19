"""Orientation-balanced offline reports over deterministic Battle v2 simulations."""

from __future__ import annotations

import argparse
from collections import Counter
import csv
import io
import json
import math
from typing import Any

from .replay import RULES_VERSION
from .simulation import run_headless_match
from .starter_roster import FIRST_CREATION_PRESETS


REPORT_SCHEMA_VERSION = 3
_SIMULATION_SIDES = ("team_a", "team_b")


def wilson_interval(wins: int, total: int, z: float = 1.96) -> list[float]:
    if total <= 0:
        return [0.0, 0.0]
    rate = wins / total
    denominator = 1 + z * z / total
    center = (rate + z * z / (2 * total)) / denominator
    margin = z * math.sqrt((rate * (1 - rate) + z * z / (4 * total)) / total) / denominator
    return [max(0.0, center - margin), min(1.0, center + margin)]


def _energy_conversion_count(result: dict[str, Any], side: str) -> int:
    team = result.get("teams", {}).get(side, {})
    raw_count = team.get("energy_conversions")
    if raw_count is None:
        raw_count = len(team.get("energy_conversion_events", []))
    return max(0, int(raw_count or 0))


def _record_energy_conversion_metrics(
    accumulator: Counter[str],
    result: dict[str, Any],
) -> None:
    counts = {
        side: _energy_conversion_count(result, side)
        for side in _SIMULATION_SIDES
    }
    accumulator["events"] += sum(counts.values())
    if any(counts.values()):
        accumulator["games_with_conversion"] += 1
    accumulator["side_games_with_conversion"] += sum(
        1 for count in counts.values() if count > 0
    )

    winner_side = result.get("winner_side")
    if result.get("result_type") != "WIN" or winner_side not in _SIMULATION_SIDES:
        return
    accumulator["decided_games"] += 1
    losing_side = "team_b" if winner_side == "team_a" else "team_a"
    accumulator["winning_side_events"] += counts[winner_side]
    accumulator["losing_side_events"] += counts[losing_side]
    for side, count in counts.items():
        if count > 0:
            accumulator["decided_side_games_with_conversion"] += 1
            if side == winner_side:
                accumulator["wins_by_sides_with_conversion"] += 1
        else:
            accumulator["decided_side_games_without_conversion"] += 1
            if side == winner_side:
                accumulator["wins_by_sides_without_conversion"] += 1


def _finalize_energy_conversion_metrics(
    accumulator: Counter[str],
    total_games: int,
) -> dict[str, Any]:
    side_games = total_games * len(_SIMULATION_SIDES)
    used_decided = accumulator["decided_side_games_with_conversion"]
    unused_decided = accumulator["decided_side_games_without_conversion"]
    return {
        "events": accumulator["events"],
        "games_with_conversion": accumulator["games_with_conversion"],
        "game_usage_rate": (
            accumulator["games_with_conversion"] / total_games if total_games else 0.0
        ),
        "side_games_with_conversion": accumulator["side_games_with_conversion"],
        "side_usage_rate": (
            accumulator["side_games_with_conversion"] / side_games if side_games else 0.0
        ),
        "win_correlation": {
            "decided_games": accumulator["decided_games"],
            "winning_side_events": accumulator["winning_side_events"],
            "losing_side_events": accumulator["losing_side_events"],
            "decided_side_games_with_conversion": used_decided,
            "wins_by_sides_with_conversion": accumulator["wins_by_sides_with_conversion"],
            "descriptive_win_rate_when_used": (
                accumulator["wins_by_sides_with_conversion"] / used_decided
                if used_decided else 0.0
            ),
            "decided_side_games_without_conversion": unused_decided,
            "wins_by_sides_without_conversion": accumulator["wins_by_sides_without_conversion"],
            "descriptive_win_rate_when_not_used": (
                accumulator["wins_by_sides_without_conversion"] / unused_decided
                if unused_decided else 0.0
            ),
        },
    }


def build_balance_report(
    teams: dict[str, list[str] | tuple[str, str, str]],
    *,
    games_per_orientation: int,
    seed_start: int = 1,
    max_turns: int = 200,
) -> dict[str, Any]:
    if games_per_orientation <= 0:
        raise ValueError("games_per_orientation must be positive")
    names = sorted(teams)
    matchups = []
    character_appearances = Counter()
    character_wins = Counter()
    first_seat_wins = 0
    decided_games = 0
    turn_caps = 0
    draws = 0
    no_contests = 0
    energy_conversion = Counter()
    seed = seed_start
    for left_index, left_name in enumerate(names):
        for right_name in names[left_index + 1:]:
            wins = Counter()
            turns = []
            matchup_energy_conversion = Counter()
            for orientation in range(2):
                first_name, second_name = (left_name, right_name) if orientation == 0 else (right_name, left_name)
                first_team = list(teams[first_name])
                second_team = list(teams[second_name])
                for _ in range(games_per_orientation):
                    result = run_headless_match(first_team, second_team, seed=seed, max_turns=max_turns)
                    seed += 1
                    turns.append(result["turns_executed"])
                    _record_energy_conversion_metrics(energy_conversion, result)
                    _record_energy_conversion_metrics(matchup_energy_conversion, result)
                    for character in first_team + second_team:
                        character_appearances[character] += 1
                    result_type = result.get("result_type")
                    winner_side = result.get("winner_side")
                    if result_type == "TURN_CAP":
                        turn_caps += 1
                        wins["turn_cap"] += 1
                        continue
                    if result_type == "DRAW":
                        draws += 1
                        wins["draw"] += 1
                        continue
                    if result_type == "NO_CONTEST":
                        no_contests += 1
                        wins["no_contest"] += 1
                        continue
                    if result_type != "WIN" or winner_side not in {"team_a", "team_b"}:
                        raise ValueError(f"unsupported simulation result: {result_type!r}")
                    decided_games += 1
                    winner_name = first_name if winner_side == "team_a" else second_name
                    wins[winner_name] += 1
                    if winner_side == "team_a":
                        first_seat_wins += 1
                    for character in teams[winner_name]:
                        character_wins[character] += 1
            total = games_per_orientation * 2
            matchups.append({
                "team_a_name": left_name,
                "team_b_name": right_name,
                "games": total,
                "wins": dict(sorted(wins.items())),
                "average_turns": sum(turns) / total,
                "turn_cap_rate": wins["turn_cap"] / total,
                "draw_rate": wins["draw"] / total,
                "no_contest_rate": wins["no_contest"] / total,
                "energy_conversion": _finalize_energy_conversion_metrics(
                    matchup_energy_conversion, total
                ),
            })
    characters = {
        character: {
            "appearances": appearances,
            "wins": character_wins[character],
            "descriptive_win_rate": character_wins[character] / appearances,
            "wilson_95": wilson_interval(character_wins[character], appearances),
        }
        for character, appearances in sorted(character_appearances.items())
    }
    total_games = sum(matchup["games"] for matchup in matchups)
    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "rules_version": RULES_VERSION,
        "games_per_orientation": games_per_orientation,
        "seed_start": seed_start,
        "max_turns": max_turns,
        "total_games": total_games,
        "turn_caps": turn_caps,
        "turn_cap_rate": turn_caps / total_games if total_games else 0.0,
        "draws": draws,
        "draw_rate": draws / total_games if total_games else 0.0,
        "no_contests": no_contests,
        "no_contest_rate": no_contests / total_games if total_games else 0.0,
        "first_seat_win_rate": first_seat_wins / decided_games if decided_games else 0.0,
        "energy_conversion": _finalize_energy_conversion_metrics(
            energy_conversion, total_games
        ),
        "matchups": matchups,
        "characters": characters,
    }


def report_csv(report: dict[str, Any]) -> str:
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "team_a_name", "team_b_name", "games", "team_a_wins", "team_b_wins",
        "draws", "no_contests", "turn_caps", "average_turns",
        "energy_conversion_events", "games_with_energy_conversion",
        "side_games_with_energy_conversion", "side_energy_conversion_rate",
        "conversion_side_wins", "conversion_side_decided_games",
        "conversion_side_win_rate", "non_conversion_side_wins",
        "non_conversion_side_decided_games", "non_conversion_side_win_rate",
    ])
    writer.writeheader()
    for matchup in report["matchups"]:
        wins = matchup["wins"]
        conversion = matchup["energy_conversion"]
        correlation = conversion["win_correlation"]
        writer.writerow({
            "team_a_name": matchup["team_a_name"],
            "team_b_name": matchup["team_b_name"],
            "games": matchup["games"],
            "team_a_wins": wins.get(matchup["team_a_name"], 0),
            "team_b_wins": wins.get(matchup["team_b_name"], 0),
            "draws": wins.get("draw", 0),
            "no_contests": wins.get("no_contest", 0),
            "turn_caps": wins.get("turn_cap", 0),
            "average_turns": matchup["average_turns"],
            "energy_conversion_events": conversion["events"],
            "games_with_energy_conversion": conversion["games_with_conversion"],
            "side_games_with_energy_conversion": conversion["side_games_with_conversion"],
            "side_energy_conversion_rate": conversion["side_usage_rate"],
            "conversion_side_wins": correlation["wins_by_sides_with_conversion"],
            "conversion_side_decided_games": correlation["decided_side_games_with_conversion"],
            "conversion_side_win_rate": correlation["descriptive_win_rate_when_used"],
            "non_conversion_side_wins": correlation["wins_by_sides_without_conversion"],
            "non_conversion_side_decided_games": correlation["decided_side_games_without_conversion"],
            "non_conversion_side_win_rate": correlation["descriptive_win_rate_when_not_used"],
        })
    return output.getvalue()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build an offline First Creation balance report")
    parser.add_argument("--presets", default=",".join(FIRST_CREATION_PRESETS), help="comma-separated preset ids")
    parser.add_argument("--games-per-orientation", type=int, default=1)
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--max-turns", type=int, default=200)
    parser.add_argument("--format", choices=("json", "csv"), default="json")
    args = parser.parse_args(argv)
    requested = [name for name in args.presets.split(",") if name]
    unknown = [name for name in requested if name not in FIRST_CREATION_PRESETS]
    if unknown:
        parser.error(f"unknown preset(s): {', '.join(unknown)}")
    report = build_balance_report(
        {name: FIRST_CREATION_PRESETS[name] for name in requested},
        games_per_orientation=args.games_per_orientation,
        seed_start=args.seed,
        max_turns=args.max_turns,
    )
    print(json.dumps(report, sort_keys=True) if args.format == "json" else report_csv(report), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
