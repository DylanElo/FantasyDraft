"""Deterministic headless Battle v2 simulation and aggregate diagnostics."""

from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
import json
import os
from typing import Any, Iterable, Iterator

from .damage_accounting import enemy_hp_damage_attribution
from .energy import CORE_ENERGY
from .manager import BattleV2Manager
from .replay import RULES_VERSION, authoritative_state_hash
from .timers import BattleTimerPolicy


SIMULATION_SCHEMA_VERSION = 3
MAX_SIMULATION_WORKERS = 4


def _core_energy_snapshot(value: Any, *, sparse: bool = False) -> dict[str, int]:
    """Return a deterministic, privacy-safe copy of one core-energy mapping."""

    raw = value if isinstance(value, dict) else {}
    snapshot: dict[str, int] = {}
    for energy in CORE_ENERGY:
        amount = int(raw.get(energy.value, 0) or 0)
        if not sparse or amount:
            snapshot[energy.value] = amount
    return snapshot


def _energy_conversion_diagnostic(event: Any) -> dict[str, Any]:
    """Copy the public diagnostic fields from one authoritative conversion event."""

    payload = event.payload
    return {
        "turn_number": int(event.turn_number),
        "sources": _core_energy_snapshot(payload.get("sources"), sparse=True),
        "cost": int(payload.get("cost", 0) or 0),
        "target": str(payload.get("target", "")),
        "pool_before": _core_energy_snapshot(payload.get("pool_before")),
        "pool_after": _core_energy_snapshot(payload.get("pool_after")),
    }


def resolve_simulation_workers(workers: int | None, jobs: int) -> int:
    """Resolve an explicit/automatic worker request without oversubscribing hosts."""

    if jobs <= 0:
        return 1
    if workers is None:
        workers = 1
    if workers < 0:
        raise ValueError("workers must be zero (automatic) or positive")
    if workers == 0:
        available = os.cpu_count() or 1
        workers = max(1, available - 1)
    return min(jobs, MAX_SIMULATION_WORKERS, workers)


def _run_match_task(
    task: tuple[list[str], list[str], int, int],
) -> dict[str, Any]:
    team_a, team_b, seed, max_turns = task
    return run_headless_match(team_a, team_b, seed=seed, max_turns=max_turns)


def iter_match_schedule(
    tasks: list[tuple[list[str], list[str], int, int]],
    *,
    workers: int | None = 1,
) -> Iterator[dict[str, Any]]:
    """Yield deterministic match tasks in input order, optionally across processes."""

    resolved_workers = resolve_simulation_workers(workers, len(tasks))
    if resolved_workers == 1:
        for task in tasks:
            yield _run_match_task(task)
        return
    chunk_size = max(1, len(tasks) // (resolved_workers * 4))
    with ProcessPoolExecutor(max_workers=resolved_workers) as executor:
        yield from executor.map(_run_match_task, tasks, chunksize=chunk_size)


def run_match_schedule(
    tasks: list[tuple[list[str], list[str], int, int]],
    *,
    workers: int | None = 1,
) -> list[dict[str, Any]]:
    """Return deterministic match tasks in input order for API compatibility."""

    return list(iter_match_schedule(tasks, workers=workers))


def _conversion_summary_accumulator() -> dict[str, Any]:
    return {
        "games": 0,
        "events": 0,
        "diagnostic_events": 0,
        "games_with_conversion": 0,
        "side_games_with_conversion": 0,
        "target_counts": Counter(),
        "source_pips": Counter(),
        "mixed_source_events": 0,
        "turn_total": 0,
    }


def _record_conversion_summary(
    accumulator: dict[str, Any], match: dict[str, Any]
) -> None:
    accumulator["games"] += 1
    converted_in_game = False
    for side in ("team_a", "team_b"):
        team = match.get("teams", {}).get(side, {})
        count = max(0, int(team.get("energy_conversions", 0) or 0))
        accumulator["events"] += count
        if count:
            converted_in_game = True
            accumulator["side_games_with_conversion"] += 1
        for event in team.get("energy_conversion_events", []):
            accumulator["diagnostic_events"] += 1
            target = str(event.get("target", ""))
            if target:
                accumulator["target_counts"][target] += 1
            sources = {
                str(color): max(0, int(amount or 0))
                for color, amount in event.get("sources", {}).items()
                if int(amount or 0) > 0
            }
            accumulator["source_pips"].update(sources)
            if len(sources) > 1:
                accumulator["mixed_source_events"] += 1
            accumulator["turn_total"] += max(
                0, int(event.get("turn_number", 0) or 0)
            )
    if converted_in_game:
        accumulator["games_with_conversion"] += 1


def _finalize_conversion_summary(accumulator: dict[str, Any]) -> dict[str, Any]:
    games = accumulator["games"]
    diagnostic_events = accumulator["diagnostic_events"]
    side_games = games * 2
    return {
        "events": accumulator["events"],
        "events_per_game": accumulator["events"] / games if games else 0.0,
        "games_with_conversion": accumulator["games_with_conversion"],
        "game_usage_rate": (
            accumulator["games_with_conversion"] / games if games else 0.0
        ),
        "side_games_with_conversion": accumulator["side_games_with_conversion"],
        "side_usage_rate": (
            accumulator["side_games_with_conversion"] / side_games
            if side_games else 0.0
        ),
        "diagnostic_events": diagnostic_events,
        "target_counts": dict(sorted(accumulator["target_counts"].items())),
        "source_pips": dict(sorted(accumulator["source_pips"].items())),
        "mixed_source_events": accumulator["mixed_source_events"],
        "average_turn_number": (
            accumulator["turn_total"] / diagnostic_events
            if diagnostic_events else 0.0
        ),
    }


def summarize_energy_conversions(
    matches: Iterable[dict[str, Any]],
) -> dict[str, Any]:
    """Aggregate privacy-safe conversion diagnostics for compact batch output."""

    accumulator = _conversion_summary_accumulator()
    for match in matches:
        _record_conversion_summary(accumulator, match)
    return _finalize_conversion_summary(accumulator)


def run_headless_match(
    team_a: list[str],
    team_b: list[str],
    *,
    seed: int,
    max_turns: int = 200,
) -> dict[str, Any]:
    if len(team_a) != 3 or len(team_b) != 3:
        raise ValueError("headless simulation requires two three-character teams")
    if max_turns <= 0:
        raise ValueError("max_turns must be positive")
    manager = BattleV2Manager(
        rng_seed=seed,
        timer_policy=BattleTimerPolicy(planning_seconds=10**9, queue_review_seconds=10**9),
        clock=lambda: 0.0,
    )
    room_id = f"simulation-{seed}"
    manager.start_first_creation_match(
        room_id,
        [
            {"id": "team_a", "name": "Team A", "team": list(team_a)},
            {"id": "team_b", "name": "Team B", "team": list(team_b)},
        ],
    )
    actions = Counter()
    event_cursor = 0
    turns_executed = 0
    while manager.get_state(room_id).result_type is None and turns_executed < max_turns:
        state = manager.get_state(room_id)
        acting_player = state.turn_player_id
        manager.take_cpu_turn(room_id, acting_player)
        turns_executed += 1
        for event in state.event_log[event_cursor:]:
            if event.type == "skill_resolved":
                actions[str(event.payload.get("player_id"))] += 1
        event_cursor = len(state.event_log)

    state = manager.get_state(room_id)
    if state.result_type is None:
        manager._finish_match(state, "TURN_CAP", None, "simulation_turn_cap")
    damage_received = Counter()
    healing_received = Counter()
    energy_conversion_events: dict[str, list[dict[str, Any]]] = {
        player_id: [] for player_id in state.players
    }
    for event in state.event_log:
        target = event.payload.get("target_player_id")
        amount = int(event.payload.get("amount", 0) or 0)
        attribution = enemy_hp_damage_attribution(event, state.players.keys())
        if attribution is not None:
            _source, damaged_player_id, actual_hp_damage = attribution
            damage_received[damaged_player_id] += actual_hp_damage
        if target in state.players and event.type == "heal":
            healing_received[str(target)] += max(0, amount)
        conversion_player = event.payload.get("player_id")
        if event.type == "energy_converted" and conversion_player in state.players:
            energy_conversion_events[str(conversion_player)].append(
                _energy_conversion_diagnostic(event)
            )

    def team_result(player_id: str) -> dict[str, Any]:
        player = state.players[player_id]
        return {
            "characters": [character.character_id for character in player.team],
            "living": sum(1 for character in player.team if character.alive),
            "hp_remaining": sum(character.hp for character in player.team),
            "actions_resolved": actions[player_id],
            "damage_received": damage_received[player_id],
            "healing_received": healing_received[player_id],
            "energy_conversions": len(energy_conversion_events[player_id]),
            "energy_conversion_events": energy_conversion_events[player_id],
        }

    return {
        "schema_version": SIMULATION_SCHEMA_VERSION,
        "rules_version": RULES_VERSION,
        "seed": seed,
        "turns_executed": turns_executed,
        "outcome": state.winner_id if state.result_type == "WIN" else state.result_type,
        "result_type": state.result_type,
        "winner_side": state.winner_id,
        "turn_cap_reached": state.result_type == "TURN_CAP",
        "teams": {"team_a": team_result("team_a"), "team_b": team_result("team_b")},
        "final_state_hash": authoritative_state_hash(state),
    }


def run_simulation_batch(
    team_a: list[str],
    team_b: list[str],
    *,
    games: int,
    seed_start: int = 1,
    max_turns: int = 200,
    workers: int | None = 1,
    compact: bool = False,
) -> dict[str, Any]:
    if games <= 0:
        raise ValueError("games must be positive")
    tasks = [
        (list(team_a), list(team_b), seed_start + index, max_turns)
        for index in range(games)
    ]
    resolved_workers = resolve_simulation_workers(workers, games)
    matches = [] if not compact else None
    outcomes = Counter()
    turn_total = 0
    min_turns: int | None = None
    max_turns_executed = 0
    conversion_accumulator = _conversion_summary_accumulator()
    for match in iter_match_schedule(tasks, workers=resolved_workers):
        outcomes[match["outcome"]] += 1
        turns = int(match["turns_executed"])
        turn_total += turns
        min_turns = turns if min_turns is None else min(min_turns, turns)
        max_turns_executed = max(max_turns_executed, turns)
        _record_conversion_summary(conversion_accumulator, match)
        if matches is not None:
            matches.append(match)
    result = {
        "schema_version": SIMULATION_SCHEMA_VERSION,
        "rules_version": RULES_VERSION,
        "games": games,
        "seed_start": seed_start,
        "max_turns": max_turns,
        "team_a": list(team_a),
        "team_b": list(team_b),
        "outcomes": dict(sorted(outcomes.items())),
        "average_turns": turn_total / games,
        "min_turns": min_turns,
        "max_turns_executed": max_turns_executed,
        "workers": resolved_workers,
        "compact": bool(compact),
        "energy_conversion": _finalize_conversion_summary(conversion_accumulator),
    }
    if matches is not None:
        result["matches"] = matches
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run seeded headless First Creation matches")
    parser.add_argument("--team-a", required=True, help="comma-separated First Creation character ids")
    parser.add_argument("--team-b", required=True, help="comma-separated First Creation character ids")
    parser.add_argument("--games", type=int, default=1)
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--max-turns", type=int, default=200)
    parser.add_argument(
        "--workers", type=int, default=0,
        help="process workers; 0 selects up to four workers automatically",
    )
    parser.add_argument(
        "--compact", action="store_true",
        help="emit aggregate diagnostics without per-match payloads",
    )
    args = parser.parse_args(argv)
    result = run_simulation_batch(
        args.team_a.split(","),
        args.team_b.split(","),
        games=args.games,
        seed_start=args.seed,
        max_turns=args.max_turns,
        workers=args.workers,
        compact=args.compact,
    )
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
