from concurrent.futures import ThreadPoolExecutor

import pytest

from jjk_arena.battle_v2.lobby_registry import LobbyRegistry
from jjk_arena.battle_v2.manager import BattleV2Error, BattleV2Manager
from jjk_arena.battle_v2.models import BattleEvent, BattlePhase, StatusFamily
from jjk_arena.battle_v2.replay import authoritative_state_hash, run_replay
from jjk_arena.battle_v2.timers import BattleTimerPolicy


PLAYERS = [
    {"id": "p1", "name": "P1", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    {"id": "p2", "name": "P2", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
]


def manager_with_clock(*, capture_replays=False):
    clock = [0.0]
    manager = BattleV2Manager(
        rng_seed=7,
        timer_policy=BattleTimerPolicy(planning_seconds=10, queue_review_seconds=5),
        clock=lambda: clock[0],
        capture_replays=capture_replays,
    )
    manager.start_classic_match("match", PLAYERS)
    return manager, clock


def test_active_match_cannot_be_overwritten():
    manager, _ = manager_with_clock()
    with pytest.raises(BattleV2Error, match="active match already exists"):
        manager.start_classic_match("match", PLAYERS)


def test_paused_match_rejects_mutating_player_commands():
    manager, _ = manager_with_clock()
    manager.disconnect_player("match", "p2")
    state = manager.get_state("match")
    with pytest.raises(BattleV2Error, match="paused for reconnect"):
        manager.end_turn("match", "p1")
    assert state.turn_player_id == "p1" and state.player_turns_completed == 0


def test_terminal_result_is_immutable_and_clears_timer():
    manager, _ = manager_with_clock()
    state = manager.get_state("match")
    manager._finish_by_tiebreak(state, "no_progress")
    before = (state.result_type, state.winner_id, state.finish_reason)
    with pytest.raises(BattleV2Error, match="already finished"):
        manager.surrender("match", "p1")
    assert (state.result_type, state.winner_id, state.finish_reason) == before
    assert state.phase_deadline is None and not state.paused


def test_submit_cancel_preserves_absolute_player_turn_deadline():
    manager, clock = manager_with_clock()
    state = manager.get_state("match")
    initial = state.phase_deadline
    state.players["p1"].energy[next(iter(state.players["p1"].energy))] = 20
    clock[0] = 9
    manager.submit_plan("match", "p1", [])
    manager.cancel_queue("match", "p1")
    assert state.phase_deadline == initial


def test_simultaneous_lobby_joins_create_exactly_one_match():
    registry = LobbyRegistry()
    ids = iter(["authoritative-match"])
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(
            lambda player: registry.join("private-code", player, lambda: next(ids)),
            PLAYERS,
        ))
    assert sorted(result[0] for result in results) == ["start", "waiting"]
    assert registry.resolve("private-code") == "authoritative-match"
    assert all(registry.resolve(None, player["id"]) == "authoritative-match" for player in PLAYERS)


def test_disconnect_resume_restores_phase_with_minimum_time():
    manager, clock = manager_with_clock()
    state = manager.get_state("match")
    clock[0] = 8
    manager.disconnect_player("match", "p1")
    assert state.paused and state.phase_deadline is None
    clock[0] = 20
    manager.reconnect_player("match", "p1")
    assert not state.paused
    assert state.phase == BattlePhase.PLANNING
    assert state.phase_deadline == 35


def test_single_disconnect_expiry_forfeits_once():
    manager, clock = manager_with_clock()
    manager.disconnect_player("match", "p1")
    clock[0] = 90
    assert manager.expire_disconnects("match")
    state = manager.get_state("match")
    assert (state.winner_id, state.result_type, state.finish_reason) == ("p2", "FORFEIT", "disconnect")
    assert not manager.expire_disconnects("match")
    assert len([event for event in state.event_log if event.type == "forfeit"]) == 1


def test_both_disconnect_expiry_is_no_contest():
    manager, clock = manager_with_clock()
    manager.disconnect_player("match", "p1")
    manager.disconnect_player("match", "p2")
    clock[0] = 90
    manager.expire_disconnects("match")
    state = manager.get_state("match")
    assert state.result_type == "NO_CONTEST"
    assert state.winner_id is None


def test_both_disconnect_one_resumes_then_other_expires():
    manager, clock = manager_with_clock()
    manager.disconnect_player("match", "p1")
    manager.disconnect_player("match", "p2")
    clock[0] = 30
    manager.reconnect_player("match", "p1")
    clock[0] = 90
    manager.expire_disconnects("match")
    assert manager.get_state("match").winner_id == "p1"


def test_cumulative_disconnect_budget_forfeits():
    manager, clock = manager_with_clock()
    for start, end in ((0, 80), (81, 161)):
        clock[0] = start
        manager.disconnect_player("match", "p1")
        clock[0] = end
        manager.reconnect_player("match", "p1")
    clock[0] = 162
    manager.disconnect_player("match", "p1")
    clock[0] = 182
    manager.expire_disconnects("match")
    state = manager.get_state("match")
    assert state.disconnect_seconds_used["p1"] == 180
    assert state.finish_reason == "disconnect_budget"


def expire_current_phase(manager, clock):
    state = manager.get_state("match")
    clock[0] = state.phase_deadline
    assert manager.expire_phase_if_needed("match")


def test_planning_and_queue_timeouts_discard_unconfirmed_actions():
    manager, clock = manager_with_clock()
    expire_current_phase(manager, clock)
    state = manager.get_state("match")
    assert state.timeout_total["p1"] == 1
    assert any(event.type == "auto_pass" for event in state.event_log)
    state.phase = BattlePhase.QUEUE_REVIEW
    state.pending_actions["p2"] = []
    state.queue_order["p2"] = []
    state.phase_deadline = clock[0] + 5
    expire_current_phase(manager, clock)
    assert state.pending_actions["p2"] == [] and state.queue_order["p2"] == []


def test_three_consecutive_and_five_total_timeout_forfeit():
    manager, _ = manager_with_clock()
    state = manager.get_state("match")
    for _ in range(3):
        manager._complete_player_turn(state, "p1", timeout=True)
    assert state.finish_reason == "timeout" and state.winner_id == "p2"

    manager, _ = manager_with_clock()
    state = manager.get_state("match")
    for _ in range(4):
        manager._complete_player_turn(state, "p1", timeout=True)
        state.timeout_consecutive["p1"] = 0
    manager._complete_player_turn(state, "p1", timeout=True)
    assert state.timeout_total["p1"] == 5 and state.winner_id == "p2"


def test_manual_pass_resets_consecutive_and_counts_no_progress():
    manager, _ = manager_with_clock()
    state = manager.get_state("match")
    manager._complete_player_turn(state, "p1", timeout=True)
    manager._complete_player_turn(state, "p1", timeout=False)
    assert state.timeout_consecutive["p1"] == 0
    assert state.no_progress_turns == 2


def test_no_progress_warning_tiebreak_draw_and_hard_cap():
    manager, _ = manager_with_clock()
    state = manager.get_state("match")
    for _ in range(8):
        manager._complete_player_turn(state, state.turn_player_id, timeout=False)
    assert any(event.type == "no_progress_warning" for event in state.event_log)
    for _ in range(4):
        manager._complete_player_turn(state, state.turn_player_id, timeout=False)
    assert state.result_type == "DRAW" and state.finish_reason == "no_progress"

    manager, _ = manager_with_clock()
    state = manager.get_state("match")
    state.player_turns_completed = 71
    manager._complete_player_turn(state, "p1", timeout=False)
    assert state.finish_reason == "hard_cap"


def test_timeout_disconnect_replay_reproduces_final_hash():
    manager, clock = manager_with_clock(capture_replays=True)
    expire_current_phase(manager, clock)
    manager.disconnect_player("match", "p2")
    clock[0] += 90
    manager.expire_disconnects("match")
    document = manager.replay_document("match")
    result = run_replay(document)
    assert result["final_state_hash"] == authoritative_state_hash(manager.get_state("match"))


def test_staggered_disconnect_replay_preserves_independent_deadlines():
    manager, clock = manager_with_clock(capture_replays=True)
    manager.disconnect_player("match", "p1")
    clock[0] = 30
    manager.disconnect_player("match", "p2")
    clock[0] = 90
    manager.expire_disconnects("match")
    assert manager.get_state("match").result_type is None
    clock[0] = 120
    manager.expire_disconnects("match")
    document = manager.replay_document("match")
    assert run_replay(document)["final_state_hash"] == authoritative_state_hash(manager.get_state("match"))


def test_progress_ledger_counts_hostile_status_energy_stack_but_not_duration_tick():
    manager, _ = manager_with_clock()
    state = manager.get_state("match")
    state.event_log.extend([
        BattleEvent("status_applied", "mark", 1, {"families": [StatusFamily.MARK.value]}),
        BattleEvent("energy_drained", "drain", 1, {"target_player_id": "p2", "amount": 1}),
        BattleEvent("status_applied", "stack", 1, {"families": [StatusFamily.BUFF.value], "stacks": 2}),
    ])
    assert manager._capture_turn_ledger(state)
    state.event_log.append(BattleEvent("status_duration_ticked", "shield aged", 1, {"destructible_defense": 10}))
    assert not manager._capture_turn_ledger(state)


def test_damage_ledger_counts_only_enemy_hp_damage():
    manager, _ = manager_with_clock()
    state = manager.get_state("match")
    state.event_log.extend([
        BattleEvent("damage", "enemy", 1, {"source_player_id": "p1", "target_player_id": "p2", "actual_hp_damage": 10}),
        BattleEvent("damage", "self", 1, {"source_player_id": "p1", "target_player_id": "p1", "actual_hp_damage": 20}),
        BattleEvent("status_damage", "dot", 1, {"source_player_id": "p1", "target_player_id": "p2", "actual_hp_damage": 5}),
        BattleEvent("damage", "reflect", 1, {"source_player_id": "p1", "target_player_id": "p1", "actual_hp_damage": 7, "is_reflected": True}),
    ])
    manager._capture_turn_ledger(state)
    assert state.damage_to_hp["p1"] == 15
    assert state.damage_to_hp["p2"] == 7


@pytest.mark.parametrize("result_type", ["DRAW", "NO_CONTEST"])
def test_terminal_draw_and_no_contest_cannot_become_forfeit(result_type):
    manager, _ = manager_with_clock()
    state = manager.get_state("match")
    manager._finish_match(state, result_type, None, "test")
    with pytest.raises(BattleV2Error, match="already finished"):
        manager.surrender("match", "p1")
    assert state.result_type == result_type and state.winner_id is None


def test_every_mutating_command_rejects_while_disconnected_pause_is_active():
    manager, _ = manager_with_clock()
    manager.disconnect_player("match", "p2")
    state = manager.get_state("match")
    commands = [
        ("submit_plan", {"actions": []}),
        ("update_queue", {"queue_order": [], "wildcard_pays": {}}),
        ("confirm_queue", {}),
        ("cancel_queue", {}),
        ("convert_energy", {"source": "green", "target": "red"}),
        ("end_turn", {}),
        ("surrender", {}),
    ]
    for index, (command, payload) in enumerate(commands):
        with pytest.raises(BattleV2Error, match="paused for reconnect"):
            manager.execute_player_command("match", "p1", command, state.state_revision, f"paused-{index}", payload)


def test_production_replay_seed_is_private_integer():
    manager = BattleV2Manager(capture_replays=True)
    manager.start_classic_match("private-seed", PLAYERS)
    document = manager.replay_document("private-seed")
    public = manager.serialize_for_player("private-seed", "p1")
    assert isinstance(document["rng_seed"], int) and not isinstance(document["rng_seed"], bool)
    assert "rng_seed" not in public
