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
from .simulation import (
    iter_match_schedule,
    resolve_simulation_workers,
    run_headless_match,
)
from .starter_roster import FIRST_CREATION_PRESETS


REPORT_SCHEMA_VERSION = 4
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
    for side in _SIMULATION_SIDES:
        for event in result.get("teams", {}).get(side, {}).get(
            "energy_conversion_events", []
        ):
            accumulator["diagnostic_events"] += 1
            target = str(event.get("target", ""))
            if target:
                accumulator[f"target:{target}"] += 1
            sources = {
                str(color): max(0, int(amount or 0))
                for color, amount in event.get("sources", {}).items()
                if int(amount or 0) > 0
            }
            for color, amount in sources.items():
                accumulator[f"source:{color}"] += amount
            if len(sources) > 1:
                accumulator["mixed_source_events"] += 1
            accumulator["conversion_turn_total"] += max(
                0, int(event.get("turn_number", 0) or 0)
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
    diagnostic_events = accumulator["diagnostic_events"]
    return {
        "events": accumulator["events"],
        "events_per_game": (
            accumulator["events"] / total_games if total_games else 0.0
        ),
        "games_with_conversion": accumulator["games_with_conversion"],
        "game_usage_rate": (
            accumulator["games_with_conversion"] / total_games if total_games else 0.0
        ),
        "side_games_with_conversion": accumulator["side_games_with_conversion"],
        "side_usage_rate": (
            accumulator["side_games_with_conversion"] / side_games if side_games else 0.0
        ),
        "diagnostic_events": diagnostic_events,
        "target_counts": {
            key.removeprefix("target:"): value
            for key, value in sorted(accumulator.items())
            if key.startswith("target:")
        },
        "source_pips": {
            key.removeprefix("source:"): value
            for key, value in sorted(accumulator.items())
            if key.startswith("source:")
        },
        "mixed_source_events": accumulator["mixed_source_events"],
        "average_turn_number": (
            accumulator["conversion_turn_total"] / diagnostic_events
            if diagnostic_events else 0.0
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


def _record_team_energy_metrics(
    accumulator: Counter[str],
    result: dict[str, Any],
    side: str,
    *,
    won: bool,
    decided: bool,
) -> None:
    team = result.get("teams", {}).get(side, {})
    count = _energy_conversion_count(result, side)
    accumulator["games"] += 1
    accumulator["events"] += count
    if count:
        accumulator["games_with_conversion"] += 1
    if decided:
        accumulator["decided_games"] += 1
        if won:
            accumulator["wins"] += 1
        if count:
            accumulator["decided_games_with_conversion"] += 1
            if won:
                accumulator["wins_with_conversion"] += 1
        else:
            accumulator["decided_games_without_conversion"] += 1
            if won:
                accumulator["wins_without_conversion"] += 1
    for event in team.get("energy_conversion_events", []):
        accumulator["diagnostic_events"] += 1
        target = str(event.get("target", ""))
        if target:
            accumulator[f"target:{target}"] += 1
        sources = {
            str(color): max(0, int(amount or 0))
            for color, amount in event.get("sources", {}).items()
            if int(amount or 0) > 0
        }
        for color, amount in sources.items():
            accumulator[f"source:{color}"] += amount
        if len(sources) > 1:
            accumulator["mixed_source_events"] += 1
        accumulator["conversion_turn_total"] += max(
            0, int(event.get("turn_number", 0) or 0)
        )


def _finalize_team_energy_metrics(accumulator: Counter[str]) -> dict[str, Any]:
    games = accumulator["games"]
    used_decided = accumulator["decided_games_with_conversion"]
    unused_decided = accumulator["decided_games_without_conversion"]
    diagnostic_events = accumulator["diagnostic_events"]
    return {
        "events": accumulator["events"],
        "events_per_game": accumulator["events"] / games if games else 0.0,
        "games_with_conversion": accumulator["games_with_conversion"],
        "usage_rate": accumulator["games_with_conversion"] / games if games else 0.0,
        "diagnostic_events": diagnostic_events,
        "target_counts": {
            key.removeprefix("target:"): value
            for key, value in sorted(accumulator.items())
            if key.startswith("target:")
        },
        "source_pips": {
            key.removeprefix("source:"): value
            for key, value in sorted(accumulator.items())
            if key.startswith("source:")
        },
        "mixed_source_events": accumulator["mixed_source_events"],
        "average_turn_number": (
            accumulator["conversion_turn_total"] / diagnostic_events
            if diagnostic_events else 0.0
        ),
        "decided_games": accumulator["decided_games"],
        "wins": accumulator["wins"],
        "descriptive_win_rate": (
            accumulator["wins"] / accumulator["decided_games"]
            if accumulator["decided_games"] else 0.0
        ),
        "descriptive_win_rate_when_used": (
            accumulator["wins_with_conversion"] / used_decided
            if used_decided else 0.0
        ),
        "descriptive_win_rate_when_not_used": (
            accumulator["wins_without_conversion"] / unused_decided
            if unused_decided else 0.0
        ),
    }


def _build_trio_matchup_matrix(
    names: list[str], matchups: list[dict[str, Any]]
) -> dict[str, Any]:
    by_pair = {
        frozenset((matchup["team_a_name"], matchup["team_b_name"])): matchup
        for matchup in matchups
    }
    cells: dict[str, dict[str, Any]] = {}
    for row_name in names:
        row: dict[str, Any] = {}
        for column_name in names:
            if row_name == column_name:
                row[column_name] = None
                continue
            matchup = by_pair[frozenset((row_name, column_name))]
            wins = matchup["wins"]
            row_wins = int(wins.get(row_name, 0))
            row_losses = int(wins.get(column_name, 0))
            decided = row_wins + row_losses
            row[column_name] = {
                "games": matchup["games"],
                "wins": row_wins,
                "losses": row_losses,
                "draws": int(wins.get("draw", 0)),
                "no_contests": int(wins.get("no_contest", 0)),
                "turn_caps": int(wins.get("turn_cap", 0)),
                "decided_win_rate": row_wins / decided if decided else 0.0,
                "wilson_95": wilson_interval(row_wins, decided),
                "average_turns": matchup["average_turns"],
                "energy_conversion": matchup["team_energy_conversion"][row_name],
            }
        cells[row_name] = row
    return {"team_order": names, "cells": cells}


def build_balance_report(
    teams: dict[str, list[str] | tuple[str, str, str]],
    *,
    games_per_orientation: int,
    seed_start: int = 1,
    max_turns: int = 200,
    workers: int | None = 1,
) -> dict[str, Any]:
    if games_per_orientation <= 0:
        raise ValueError("games_per_orientation must be positive")
    names = sorted(teams)
    scheduled: list[dict[str, Any]] = []
    matchup_accumulators: dict[tuple[str, str], dict[str, Any]] = {}
    seed = seed_start
    for left_index, left_name in enumerate(names):
        for right_name in names[left_index + 1:]:
            pair = (left_name, right_name)
            matchup_accumulators[pair] = {
                "wins": Counter(),
                "turns": [],
                "energy_conversion": Counter(),
                "team_energy_conversion": {
                    left_name: Counter(), right_name: Counter(),
                },
            }
            for orientation in range(2):
                first_name, second_name = (
                    (left_name, right_name)
                    if orientation == 0 else (right_name, left_name)
                )
                first_team = list(teams[first_name])
                second_team = list(teams[second_name])
                for _ in range(games_per_orientation):
                    scheduled.append({
                        "pair": pair,
                        "first_name": first_name,
                        "second_name": second_name,
                        "first_team": first_team,
                        "second_team": second_team,
                        "task": (first_team, second_team, seed, max_turns),
                    })
                    seed += 1

    resolved_workers = resolve_simulation_workers(workers, len(scheduled))
    if resolved_workers == 1:
        results = (
            run_headless_match(
                job["first_team"], job["second_team"],
                seed=job["task"][2], max_turns=max_turns,
            )
            for job in scheduled
        )
    else:
        results = iter_match_schedule(
            [job["task"] for job in scheduled], workers=resolved_workers
        )

    character_appearances = Counter()
    character_wins = Counter()
    first_seat_wins = 0
    decided_games = 0
    turn_caps = 0
    draws = 0
    no_contests = 0
    energy_conversion = Counter()
    for job, result in zip(scheduled, results, strict=True):
        accumulator = matchup_accumulators[job["pair"]]
        wins = accumulator["wins"]
        accumulator["turns"].append(result["turns_executed"])
        _record_energy_conversion_metrics(energy_conversion, result)
        _record_energy_conversion_metrics(accumulator["energy_conversion"], result)
        for character in job["first_team"] + job["second_team"]:
            character_appearances[character] += 1

        result_type = result.get("result_type")
        winner_side = result.get("winner_side")
        winner_name: str | None = None
        if result_type == "TURN_CAP":
            turn_caps += 1
            wins["turn_cap"] += 1
        elif result_type == "DRAW":
            draws += 1
            wins["draw"] += 1
        elif result_type == "NO_CONTEST":
            no_contests += 1
            wins["no_contest"] += 1
        elif result_type == "WIN" and winner_side in _SIMULATION_SIDES:
            decided_games += 1
            winner_name = (
                job["first_name"] if winner_side == "team_a"
                else job["second_name"]
            )
            wins[winner_name] += 1
            if winner_side == "team_a":
                first_seat_wins += 1
            for character in teams[winner_name]:
                character_wins[character] += 1
        else:
            raise ValueError(f"unsupported simulation result: {result_type!r}")

        decided = winner_name is not None
        _record_team_energy_metrics(
            accumulator["team_energy_conversion"][job["first_name"]],
            result, "team_a", won=winner_name == job["first_name"],
            decided=decided,
        )
        _record_team_energy_metrics(
            accumulator["team_energy_conversion"][job["second_name"]],
            result, "team_b", won=winner_name == job["second_name"],
            decided=decided,
        )

    matchups = []
    for (left_name, right_name), accumulator in matchup_accumulators.items():
        wins = accumulator["wins"]
        turns = accumulator["turns"]
        total = len(turns)
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
                accumulator["energy_conversion"], total
            ),
            "team_energy_conversion": {
                team_name: _finalize_team_energy_metrics(team_accumulator)
                for team_name, team_accumulator
                in accumulator["team_energy_conversion"].items()
            },
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
    report = {
        "schema_version": REPORT_SCHEMA_VERSION,
        "rules_version": RULES_VERSION,
        "games_per_orientation": games_per_orientation,
        "seed_start": seed_start,
        "seed_end_exclusive": seed,
        "max_turns": max_turns,
        "workers": resolved_workers,
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
    report["trio_matchup_matrix"] = _build_trio_matchup_matrix(names, matchups)
    return report


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
        "mixed_source_conversion_events", "conversion_target_counts",
        "conversion_source_pips", "average_conversion_turn",
        "team_a_conversion_events", "team_a_conversion_usage_rate",
        "team_b_conversion_events", "team_b_conversion_usage_rate",
    ])
    writer.writeheader()
    for matchup in report["matchups"]:
        wins = matchup["wins"]
        conversion = matchup["energy_conversion"]
        correlation = conversion["win_correlation"]
        team_conversion = matchup["team_energy_conversion"]
        team_a_conversion = team_conversion[matchup["team_a_name"]]
        team_b_conversion = team_conversion[matchup["team_b_name"]]
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
            "mixed_source_conversion_events": conversion["mixed_source_events"],
            "conversion_target_counts": json.dumps(
                conversion["target_counts"], sort_keys=True, separators=(",", ":")
            ),
            "conversion_source_pips": json.dumps(
                conversion["source_pips"], sort_keys=True, separators=(",", ":")
            ),
            "average_conversion_turn": conversion["average_turn_number"],
            "team_a_conversion_events": team_a_conversion["events"],
            "team_a_conversion_usage_rate": team_a_conversion["usage_rate"],
            "team_b_conversion_events": team_b_conversion["events"],
            "team_b_conversion_usage_rate": team_b_conversion["usage_rate"],
        })
    return output.getvalue()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build an offline First Creation balance report")
    parser.add_argument("--presets", default=",".join(FIRST_CREATION_PRESETS), help="comma-separated preset ids")
    parser.add_argument("--games-per-orientation", type=int, default=1)
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--max-turns", type=int, default=200)
    parser.add_argument(
        "--workers", type=int, default=0,
        help="process workers; 0 selects up to four workers automatically",
    )
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
        workers=args.workers,
    )
    print(json.dumps(report, sort_keys=True) if args.format == "json" else report_csv(report), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
