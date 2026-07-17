import json
import subprocess
import sys
from types import SimpleNamespace

from jjk_arena.battle_v2 import simulation
from jjk_arena.battle_v2.simulation import run_headless_match, run_simulation_batch


TEAM_A = ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]
TEAM_B = ["maki_zenin", "panda", "mai_zenin"]


def test_headless_match_is_deterministic_and_privacy_safe():
    first = run_headless_match(TEAM_A, TEAM_B, seed=11, max_turns=80)
    second = run_headless_match(TEAM_A, TEAM_B, seed=11, max_turns=80)

    assert first == second
    assert first["schema_version"] == 2
    assert set(first["teams"]) == {"team_a", "team_b"}
    assert "event_log" not in first
    assert "player_id" not in json.dumps(first)


def test_headless_match_reports_explicit_turn_cap():
    result = run_headless_match(TEAM_A, TEAM_B, seed=3, max_turns=1)

    assert result["turn_cap_reached"] is True
    assert result["outcome"] == "TURN_CAP"
    assert result["result_type"] == "TURN_CAP"
    assert result["turns_executed"] == 1


def test_headless_simulation_exits_on_deterministic_exact_draw(monkeypatch):
    class ExactDrawManager:
        def __init__(self, **_kwargs):
            character = lambda character_id: SimpleNamespace(character_id=character_id, alive=True, hp=50)
            self.state = SimpleNamespace(
                players={
                    "team_a": SimpleNamespace(team=[character(value) for value in TEAM_A]),
                    "team_b": SimpleNamespace(team=[character(value) for value in TEAM_B]),
                },
                turn_player_id="team_a", result_type=None, winner_id=None, event_log=[],
            )

        def start_first_creation_match(self, *_args, **_kwargs):
            return {}

        def get_state(self, _room_id):
            return self.state

        def take_cpu_turn(self, _room_id, _player_id):
            self.state.result_type = "DRAW"
            return {}

    monkeypatch.setattr(simulation, "BattleV2Manager", ExactDrawManager)
    monkeypatch.setattr(simulation, "authoritative_state_hash", lambda _state: "exact-draw")

    result = simulation.run_headless_match(TEAM_A, TEAM_B, seed=7, max_turns=20)

    assert result["result_type"] == "DRAW"
    assert result["outcome"] == "DRAW"
    assert result["winner_side"] is None
    assert result["turns_executed"] == 1


def test_headless_simulation_exits_on_no_contest_without_a_winner(monkeypatch):
    class NoContestManager:
        def __init__(self, **_kwargs):
            character = lambda character_id: SimpleNamespace(character_id=character_id, alive=True, hp=100)
            self.state = SimpleNamespace(
                players={
                    "team_a": SimpleNamespace(team=[character(value) for value in TEAM_A]),
                    "team_b": SimpleNamespace(team=[character(value) for value in TEAM_B]),
                },
                turn_player_id="team_a", result_type="NO_CONTEST", winner_id=None, event_log=[],
            )

        def start_first_creation_match(self, *_args, **_kwargs):
            return {}

        def get_state(self, _room_id):
            return self.state

    monkeypatch.setattr(simulation, "BattleV2Manager", NoContestManager)
    monkeypatch.setattr(simulation, "authoritative_state_hash", lambda _state: "no-contest")

    result = simulation.run_headless_match(TEAM_A, TEAM_B, seed=8, max_turns=20)

    assert result["result_type"] == "NO_CONTEST"
    assert result["outcome"] == "NO_CONTEST"
    assert result["turns_executed"] == 0


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
