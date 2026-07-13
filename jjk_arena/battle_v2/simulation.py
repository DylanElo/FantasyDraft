"""Deterministic headless Battle v2 simulation and aggregate diagnostics."""

from __future__ import annotations

import argparse
from collections import Counter
import json
from typing import Any

from .manager import BattleV2Manager
from .replay import RULES_VERSION, authoritative_state_hash
from .timers import BattleTimerPolicy


SIMULATION_SCHEMA_VERSION = 1


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
    while manager.get_state(room_id).winner_id is None and turns_executed < max_turns:
        state = manager.get_state(room_id)
        acting_player = state.turn_player_id
        manager.take_cpu_turn(room_id, acting_player)
        turns_executed += 1
        for event in state.event_log[event_cursor:]:
            if event.type == "skill_resolved":
                actions[str(event.payload.get("player_id"))] += 1
        event_cursor = len(state.event_log)

    state = manager.get_state(room_id)
    damage_received = Counter()
    healing_received = Counter()
    for event in state.event_log:
        target = event.payload.get("target_player_id")
        amount = int(event.payload.get("amount", 0) or 0)
        if target in state.players and event.type in {"damage", "turn_end_damage", "retaliation"}:
            damage_received[str(target)] += max(0, amount)
        if target in state.players and event.type == "heal":
            healing_received[str(target)] += max(0, amount)

    def team_result(player_id: str) -> dict[str, Any]:
        player = state.players[player_id]
        return {
            "characters": [character.character_id for character in player.team],
            "living": sum(1 for character in player.team if character.alive),
            "hp_remaining": sum(character.hp for character in player.team),
            "actions_resolved": actions[player_id],
            "damage_received": damage_received[player_id],
            "healing_received": healing_received[player_id],
        }

    return {
        "schema_version": SIMULATION_SCHEMA_VERSION,
        "rules_version": RULES_VERSION,
        "seed": seed,
        "turns_executed": turns_executed,
        "outcome": state.winner_id or "turn_cap",
        "winner_side": state.winner_id,
        "turn_cap_reached": state.winner_id is None,
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
) -> dict[str, Any]:
    if games <= 0:
        raise ValueError("games must be positive")
    matches = [
        run_headless_match(team_a, team_b, seed=seed_start + index, max_turns=max_turns)
        for index in range(games)
    ]
    outcomes = Counter(match["outcome"] for match in matches)
    return {
        "schema_version": SIMULATION_SCHEMA_VERSION,
        "rules_version": RULES_VERSION,
        "games": games,
        "seed_start": seed_start,
        "max_turns": max_turns,
        "team_a": list(team_a),
        "team_b": list(team_b),
        "outcomes": dict(sorted(outcomes.items())),
        "average_turns": sum(match["turns_executed"] for match in matches) / games,
        "matches": matches,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run seeded headless First Creation matches")
    parser.add_argument("--team-a", required=True, help="comma-separated First Creation character ids")
    parser.add_argument("--team-b", required=True, help="comma-separated First Creation character ids")
    parser.add_argument("--games", type=int, default=1)
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--max-turns", type=int, default=200)
    args = parser.parse_args(argv)
    result = run_simulation_batch(
        args.team_a.split(","),
        args.team_b.split(","),
        games=args.games,
        seed_start=args.seed,
        max_turns=args.max_turns,
    )
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
