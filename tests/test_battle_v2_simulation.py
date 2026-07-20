import json
import subprocess
import sys
from types import SimpleNamespace

from jjk_arena.battle_v2 import simulation
from jjk_arena.battle_v2.models import BattleEvent
from jjk_arena.battle_v2.simulation import run_headless_match, run_simulation_batch


TEAM_A = ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]
TEAM_B = ["maki_zenin", "panda", "mai_zenin"]


def test_headless_match_is_deterministic_and_privacy_safe():
    first = run_headless_match(TEAM_A, TEAM_B, seed=11, max_turns=80)
    second = run_headless_match(TEAM_A, TEAM_B, seed=11, max_turns=80)

    assert first == second
    assert first["schema_version"] == 3
    assert set(first["teams"]) == {"team_a", "team_b"}
    assert "event_log" not in first
    assert "player_id" not in json.dumps(first)
    for team in first["teams"].values():
        assert team["energy_conversions"] == len(team["energy_conversion_events"])


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


def test_headless_damage_metrics_use_only_actual_enemy_hp_loss(monkeypatch):
    class DamageMetricManager:
        def __init__(self, **_kwargs):
            character = lambda character_id: SimpleNamespace(character_id=character_id, alive=True, hp=50)
            self.state = SimpleNamespace(
                players={
                    "team_a": SimpleNamespace(team=[character(value) for value in TEAM_A]),
                    "team_b": SimpleNamespace(team=[character(value) for value in TEAM_B]),
                },
                turn_player_id="team_a",
                result_type="DRAW",
                winner_id=None,
                event_log=[
                    BattleEvent("damage", "partially blocked", 1, {"source_player_id": "team_a", "target_player_id": "team_b", "amount": 40, "actual_hp_damage": 6}),
                    BattleEvent("status_damage", "recurring", 1, {"source_player_id": "team_a", "target_player_id": "team_b", "amount": 7, "actual_hp_damage": 7}),
                    BattleEvent("health_steal", "stolen", 1, {"source_player_id": "team_a", "target_player_id": "team_b", "amount": 5, "actual_hp_damage": 5}),
                    BattleEvent("retaliation", "retaliated", 1, {"source_player_id": "team_b", "target_player_id": "team_a", "amount": 3, "actual_hp_damage": 3}),
                    BattleEvent("damage", "self damage", 1, {"source_player_id": "team_a", "target_player_id": "team_a", "amount": 9, "actual_hp_damage": 9}),
                    BattleEvent("damage", "shield absorbed", 1, {"source_player_id": "team_a", "target_player_id": "team_b", "amount": 25, "actual_hp_damage": 0}),
                    BattleEvent("damage", "nominal legacy value", 1, {"source_player_id": "team_a", "target_player_id": "team_b", "amount": 30}),
                    BattleEvent("damage", "reflected", 1, {"source_player_id": "team_a", "target_player_id": "team_a", "amount": 4, "actual_hp_damage": 4, "is_reflected": True, "reflected_by_player_id": "team_b"}),
                ],
            )

        def start_first_creation_match(self, *_args, **_kwargs):
            return {}

        def get_state(self, _room_id):
            return self.state

    monkeypatch.setattr(simulation, "BattleV2Manager", DamageMetricManager)
    monkeypatch.setattr(simulation, "authoritative_state_hash", lambda _state: "damage-metrics")

    result = simulation.run_headless_match(TEAM_A, TEAM_B, seed=9, max_turns=20)

    assert result["teams"]["team_a"]["damage_received"] == 7
    assert result["teams"]["team_b"]["damage_received"] == 18


def test_headless_match_preserves_privacy_safe_energy_conversion_diagnostics(monkeypatch):
    class ConversionMetricManager:
        def __init__(self, **_kwargs):
            character = lambda character_id: SimpleNamespace(
                character_id=character_id, alive=True, hp=100
            )
            self.state = SimpleNamespace(
                players={
                    "team_a": SimpleNamespace(team=[character(value) for value in TEAM_A]),
                    "team_b": SimpleNamespace(team=[character(value) for value in TEAM_B]),
                },
                turn_player_id="team_a",
                result_type="DRAW",
                winner_id=None,
                event_log=[
                    BattleEvent(
                        "energy_converted",
                        "Team A transmuted energy",
                        3,
                        {
                            "player_id": "team_a",
                            "sources": {"red": 5},
                            "cost": 5,
                            "target": "blue",
                            "pool_before": {
                                "green": 0, "red": 5, "blue": 0, "white": 0,
                            },
                            "pool_after": {
                                "green": 0, "red": 0, "blue": 1, "white": 0,
                            },
                        },
                    ),
                    BattleEvent(
                        "energy_converted",
                        "Team B transmuted energy",
                        4,
                        {
                            "player_id": "team_b",
                            "sources": {"green": 3, "white": 2},
                            "cost": 5,
                            "target": "red",
                            "pool_before": {
                                "green": 3, "red": 0, "blue": 1, "white": 2,
                            },
                            "pool_after": {
                                "green": 0, "red": 1, "blue": 1, "white": 0,
                            },
                        },
                    ),
                    BattleEvent(
                        "energy_converted",
                        "Unknown player must not leak",
                        5,
                        {
                            "player_id": "private-player-id",
                            "sources": {"blue": 5},
                            "target": "white",
                        },
                    ),
                ],
            )

        def start_first_creation_match(self, *_args, **_kwargs):
            return {}

        def get_state(self, _room_id):
            return self.state

    monkeypatch.setattr(simulation, "BattleV2Manager", ConversionMetricManager)
    monkeypatch.setattr(simulation, "authoritative_state_hash", lambda _state: "conversion-metrics")

    result = simulation.run_headless_match(TEAM_A, TEAM_B, seed=10, max_turns=20)

    assert result["teams"]["team_a"]["energy_conversions"] == 1
    assert result["teams"]["team_b"]["energy_conversions"] == 1
    assert result["teams"]["team_a"]["energy_conversion_events"] == [{
        "turn_number": 3,
        "sources": {"red": 5},
        "cost": 5,
        "target": "blue",
        "pool_before": {"green": 0, "red": 5, "blue": 0, "white": 0},
        "pool_after": {"green": 0, "red": 0, "blue": 1, "white": 0},
    }]
    assert "private-player-id" not in json.dumps(result)


def test_batch_outcomes_account_for_every_game():
    result = run_simulation_batch(TEAM_A, TEAM_B, games=4, seed_start=20, max_turns=80)

    assert sum(result["outcomes"].values()) == 4
    assert len(result["matches"]) == 4
    assert result["average_turns"] > 0
    assert result["energy_conversion"]["events"] >= 0


def test_parallel_compact_batch_is_deterministic_without_per_match_payloads():
    sequential = run_simulation_batch(
        TEAM_A, TEAM_B, games=2, seed_start=24, max_turns=40,
        workers=1, compact=True,
    )
    parallel = run_simulation_batch(
        TEAM_A, TEAM_B, games=2, seed_start=24, max_turns=40,
        workers=2, compact=True,
    )

    assert "matches" not in sequential
    assert "matches" not in parallel
    assert sequential["compact"] is True
    assert parallel["workers"] == 2
    for key in (
        "outcomes", "average_turns", "min_turns", "max_turns_executed",
        "energy_conversion",
    ):
        assert parallel[key] == sequential[key]


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
            "--workers", "1",
            "--compact",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert completed.returncode == 0, completed.stderr
    payload = json.loads(completed.stdout)
    assert payload["games"] == 2
    assert payload["compact"] is True
    assert "matches" not in payload
