"""Versioned deterministic replay and authoritative state hashing for Battle v2."""

from __future__ import annotations

import argparse
from dataclasses import fields, is_dataclass
from enum import Enum
import hashlib
import json
from pathlib import Path
from typing import Any

from .manager import BattleV2Manager
from .timers import BattleTimerPolicy


REPLAY_FORMAT_VERSION = 2
RULES_VERSION = "battle-v2-2026-07"
HASH_EXCLUDED_FIELDS = {"phase_deadline"}


class ReplayError(ValueError):
    pass


class ReplayMismatch(ReplayError):
    pass


def _canonical(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value):
        return {
            field.name: _canonical(getattr(value, field.name))
            for field in fields(value)
            if field.name not in HASH_EXCLUDED_FIELDS
        }
    if isinstance(value, dict):
        return {
            str(_canonical(key)): _canonical(item)
            for key, item in sorted(value.items(), key=lambda pair: str(_canonical(pair[0])))
        }
    if isinstance(value, (list, tuple)):
        return [_canonical(item) for item in value]
    if isinstance(value, (set, frozenset)):
        return sorted((_canonical(item) for item in value), key=lambda item: json.dumps(item, sort_keys=True))
    return value


def canonical_state_payload(state: Any) -> dict[str, Any]:
    payload = _canonical(state)
    if not isinstance(payload, dict):
        raise ReplayError("battle state must normalize to an object")
    return payload


def authoritative_state_hash(state: Any) -> str:
    encoded = json.dumps(
        canonical_state_payload(state),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _new_manager(document: dict[str, Any]) -> tuple[BattleV2Manager, str, list[float]]:
    if document.get("format_version") != REPLAY_FORMAT_VERSION:
        raise ReplayError(f"unsupported replay format: {document.get('format_version')}")
    if document.get("rules_version") != RULES_VERSION:
        raise ReplayError(f"unsupported rules version: {document.get('rules_version')}")
    seed = document.get("rng_seed")
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise ReplayError("rng_seed must be an integer")
    room_id = str(document.get("match_id") or "replay")
    logical_clock = [0.0]
    policy = dict(document.get("timer_policy") or {})
    manager = BattleV2Manager(
        rng_seed=seed,
        timer_policy=BattleTimerPolicy(
            planning_seconds=float(policy.get("planning_seconds", 60)),
            queue_review_seconds=float(policy.get("queue_review_seconds", 30)),
        ),
        clock=lambda: logical_clock[0],
    )
    players = list(document.get("players") or [])
    if document.get("roster_mode") == "first_creation":
        manager.start_first_creation_match(room_id, players)
    elif document.get("roster_mode") == "classic":
        manager.start_classic_match(room_id, players)
    else:
        raise ReplayError("roster_mode must be classic or first_creation")
    return manager, room_id, logical_clock


def run_replay(document: dict[str, Any], *, verify_hashes: bool = True) -> dict[str, Any]:
    manager, room_id, logical_clock = _new_manager(document)
    initial_hash = authoritative_state_hash(manager.get_state(room_id))
    expected_initial = document.get("initial_state_hash")
    if verify_hashes and expected_initial and expected_initial != initial_hash:
        raise ReplayMismatch(f"initial state hash mismatch: expected {expected_initial}, got {initial_hash}")

    command_results = []
    timeline = document.get("events") or [dict(command, type="command", logical_time=index) for index, command in enumerate(document.get("commands") or [])]
    for index, command in enumerate(timeline):
        logical_clock[0] = command.get("logical_time", logical_clock[0])
        event_type = command.get("type", "command")
        payload = dict(command.get("payload") or {})
        if event_type == "command":
            manager.execute_player_command(room_id, str(command["player_id"]), str(command["command"]), int(command["state_revision"]), str(command["client_action_nonce"]), payload)
        elif event_type == "disconnect":
            manager.disconnect_player(room_id, str(payload["player_id"]))
        elif event_type == "reconnect":
            manager.reconnect_player(room_id, str(payload["player_id"]))
        elif event_type == "expire_disconnects":
            manager.expire_disconnects(room_id)
        elif event_type == "expire_phase":
            manager.expire_phase_if_needed(room_id)
        else:
            raise ReplayError(f"unknown lifecycle event: {event_type}")
        state_hash = authoritative_state_hash(manager.get_state(room_id))
        expected = command.get("expected_state_hash")
        if verify_hashes and expected and expected != state_hash:
            raise ReplayMismatch(
                f"command {index} state hash mismatch: expected {expected}, got {state_hash}"
            )
        command_results.append({"index": index, "state_hash": state_hash})

    final_hash = authoritative_state_hash(manager.get_state(room_id))
    expected_final = document.get("final_state_hash")
    if verify_hashes and expected_final and expected_final != final_hash:
        raise ReplayMismatch(f"final state hash mismatch: expected {expected_final}, got {final_hash}")
    return {
        "initial_state_hash": initial_hash,
        "commands": command_results,
        "final_state_hash": final_hash,
    }


def record_replay(document: dict[str, Any]) -> dict[str, Any]:
    recorded = json.loads(json.dumps(document))
    results = run_replay(recorded, verify_hashes=False)
    recorded["initial_state_hash"] = results["initial_state_hash"]
    for command, result in zip(recorded.get("commands") or [], results["commands"], strict=True):
        command["expected_state_hash"] = result["state_hash"]
    recorded["final_state_hash"] = results["final_state_hash"]
    return recorded


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify a deterministic Battle v2 replay")
    parser.add_argument("replay", type=Path)
    args = parser.parse_args(argv)
    document = json.loads(args.replay.read_text(encoding="utf-8"))
    result = run_replay(document)
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
