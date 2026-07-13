import json
import subprocess
import sys
from pathlib import Path

import pytest

from jjk_arena.battle_v2.replay import (
    REPLAY_FORMAT_VERSION,
    RULES_VERSION,
    ReplayMismatch,
    record_replay,
    run_replay,
)
from jjk_arena.battle_v2.manager import BattleV2Manager
from jjk_arena.battle_v2.models import StatusEffect
from jjk_arena.battle_v2.replay import authoritative_state_hash


def replay_document():
    return {
        "format_version": REPLAY_FORMAT_VERSION,
        "rules_version": RULES_VERSION,
        "match_id": "golden-two-turns",
        "roster_mode": "first_creation",
        "rng_seed": 17,
        "players": [
            {"id": "p1", "name": "P1", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
            {"id": "p2", "name": "P2", "team": ["maki_zenin", "panda", "mai_zenin"]},
        ],
        "commands": [
            {"player_id": "p1", "command": "end_turn", "state_revision": 0, "client_action_nonce": "turn-1", "payload": {}},
            {"player_id": "p2", "command": "end_turn", "state_revision": 1, "client_action_nonce": "turn-2", "payload": {}},
        ],
    }


def test_recorded_replay_is_identical_across_independent_runs():
    recorded = record_replay(replay_document())

    first = run_replay(recorded)
    second = run_replay(recorded)

    assert first == second
    assert recorded["initial_state_hash"] != recorded["final_state_hash"]
    assert len({entry["state_hash"] for entry in first["commands"]}) == 2


def test_replay_detects_command_hash_tampering():
    recorded = record_replay(replay_document())
    recorded["commands"][0]["expected_state_hash"] = "0" * 64

    with pytest.raises(ReplayMismatch, match="command 0"):
        run_replay(recorded)


def test_replay_cli_verifies_golden_document(tmp_path):
    path = tmp_path / "golden.json"
    recorded = record_replay(replay_document())
    path.write_text(json.dumps(recorded), encoding="utf-8")

    completed = subprocess.run(
        [sys.executable, "-m", "jjk_arena.battle_v2.replay", str(path)],
        check=False,
        capture_output=True,
        text=True,
    )

    assert completed.returncode == 0, completed.stderr
    assert json.loads(completed.stdout)["final_state_hash"] == recorded["final_state_hash"]


def test_checked_in_golden_replay_verifies():
    path = Path(__file__).parent / "fixtures" / "replays" / "first_creation_two_turns.json"
    document = json.loads(path.read_text(encoding="utf-8"))

    result = run_replay(document)

    assert result["final_state_hash"] == document["final_state_hash"]


def test_authoritative_hash_includes_private_invisible_state():
    manager = BattleV2Manager(rng_seed=17, clock=lambda: 0.0)
    manager.start_first_creation_match("private-hash", replay_document()["players"])
    state = manager.get_state("private-hash")
    public_shape_hash = authoritative_state_hash(state)
    state.players["p2"].team[0].statuses.append(
        StatusEffect("secret", "Secret", "p1", 0, "p2", 0, 2, invisible=True)
    )

    assert authoritative_state_hash(state) != public_shape_hash
