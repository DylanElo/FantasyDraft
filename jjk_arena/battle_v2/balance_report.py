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


REPORT_SCHEMA_VERSION = 2


def wilson_interval(wins: int, total: int, z: float = 1.96) -> list[float]:
    if total <= 0:
        return [0.0, 0.0]
    rate = wins / total
    denominator = 1 + z * z / total
    center = (rate + z * z / (2 * total)) / denominator
    margin = z * math.sqrt((rate * (1 - rate) + z * z / (4 * total)) / total) / denominator
    return [max(0.0, center - margin), min(1.0, center + margin)]


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
    seed = seed_start
    for left_index, left_name in enumerate(names):
        for right_name in names[left_index + 1:]:
            wins = Counter()
            turns = []
            for orientation in range(2):
                first_name, second_name = (left_name, right_name) if orientation == 0 else (right_name, left_name)
                first_team = list(teams[first_name])
                second_team = list(teams[second_name])
                for _ in range(games_per_orientation):
                    result = run_headless_match(first_team, second_team, seed=seed, max_turns=max_turns)
                    seed += 1
                    turns.append(result["turns_executed"])
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
        "matchups": matchups,
        "characters": characters,
    }


def report_csv(report: dict[str, Any]) -> str:
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "team_a_name", "team_b_name", "games", "team_a_wins", "team_b_wins",
        "draws", "no_contests", "turn_caps", "average_turns",
    ])
    writer.writeheader()
    for matchup in report["matchups"]:
        wins = matchup["wins"]
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
