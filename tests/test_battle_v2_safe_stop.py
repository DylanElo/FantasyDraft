"""Safe-stop drain gate: pure decision logic plus per-room in-flight accounting.

See docs/production_runbook.md ("Safe-Stop Drain Gate") for the operational
policy these tests pin: a nonzero dropped-analytics count always blocks a
stop, a nonzero mission-settlement dead-letter count is always surfaced but
never blocks by itself, and any in-flight command handler or scheduler
callback must reach exact zero -- tracked per room so unrelated active
matches can never block cleanup of an idle/finished one.
"""

import threading
import time

from jjk_arena.battle_v2.manager import BattleV2Manager
from jjk_arena.battle_v2.safe_stop import evaluate_safe_stop
from jjk_arena.battle_v2.timer_scheduler import PhaseTimerScheduler


def players():
    return [
        {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
        {"id": "p2", "name": "Player Two", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
    ]


# ---------------------------------------------------------------------------
# Pure gate decision
# ---------------------------------------------------------------------------


def test_clean_counters_are_ready_with_no_blockers_or_warnings():
    decision = evaluate_safe_stop(
        analytics_outbox_dropped_total=0,
        mission_settlement_counts={"settled": 4},
        in_flight_commands=0,
        in_flight_scheduler_callbacks=0,
    )

    assert decision.ready is True
    assert decision.blockers == ()
    assert decision.warnings == ()
    assert decision.as_dict() == {"safe_to_stop": True, "blockers": [], "warnings": []}


def test_dropped_analytics_events_always_block_the_stop():
    decision = evaluate_safe_stop(
        analytics_outbox_dropped_total=3,
        mission_settlement_counts={},
        in_flight_commands=0,
        in_flight_scheduler_callbacks=0,
    )

    assert decision.ready is False
    assert len(decision.blockers) == 1
    assert "analytics_outbox_dropped_total" in decision.blockers[0]


def test_dead_lettered_settlements_warn_but_do_not_block_by_themselves():
    decision = evaluate_safe_stop(
        analytics_outbox_dropped_total=0,
        mission_settlement_counts={"dead_letter": 2, "settled": 10},
        in_flight_commands=0,
        in_flight_scheduler_callbacks=0,
    )

    assert decision.ready is True
    assert decision.blockers == ()
    assert len(decision.warnings) == 1
    assert "dead_letter" in decision.warnings[0]


def test_in_flight_work_blocks_the_stop():
    decision = evaluate_safe_stop(
        analytics_outbox_dropped_total=0,
        mission_settlement_counts={},
        in_flight_commands=1,
        in_flight_scheduler_callbacks=0,
    )

    assert decision.ready is False
    assert len(decision.blockers) == 1
    assert "in flight" in decision.blockers[0]


def test_multiple_conditions_combine_independently():
    decision = evaluate_safe_stop(
        analytics_outbox_dropped_total=1,
        mission_settlement_counts={"dead_letter": 1},
        in_flight_commands=0,
        in_flight_scheduler_callbacks=2,
    )

    assert decision.ready is False
    assert len(decision.blockers) == 2
    assert len(decision.warnings) == 1


# ---------------------------------------------------------------------------
# Manager: per-room in-flight command accounting
# ---------------------------------------------------------------------------


def test_in_flight_command_accounting_is_scoped_per_room():
    manager = BattleV2Manager(rng_seed=1, clock=lambda: 0.0)
    manager.start_classic_match("room-a", players())
    manager.start_classic_match("room-b", players())

    observed = {}
    original_end_turn = manager.end_turn

    def instrumented_end_turn(room_id, player_id):
        observed["room_a_during"] = manager.in_flight_commands_for_room("room-a")
        observed["room_b_during"] = manager.in_flight_commands_for_room("room-b")
        observed["total_during"] = manager.in_flight_command_total()
        return original_end_turn(room_id, player_id)

    manager.end_turn = instrumented_end_turn
    state = manager.get_state("room-a")
    manager.execute_player_command(
        "room-a", state.turn_player_id, "end_turn", state.state_revision, "in-flight-1", {}
    )

    # While room-a's command was executing, only room-a's counter was
    # nonzero -- an unrelated active room-b must never appear busy.
    assert observed["room_a_during"] == 1
    assert observed["room_b_during"] == 0
    assert observed["total_during"] == 1

    # And after the command commits, every counter returns to exact zero.
    assert manager.in_flight_commands_for_room("room-a") == 0
    assert manager.in_flight_commands_for_room("room-b") == 0
    assert manager.in_flight_command_total() == 0


def test_in_flight_command_counter_clears_even_when_the_command_raises():
    manager = BattleV2Manager(rng_seed=1, clock=lambda: 0.0)
    manager.start_classic_match("room-a", players())
    state = manager.get_state("room-a")

    # A stale revision is rejected before any mutation, but still passes
    # through the in-flight enter/exit wrapper -- confirm it still clears.
    try:
        manager.execute_player_command(
            "room-a", state.turn_player_id, "end_turn", state.state_revision + 5, "bad-revision", {}
        )
    except Exception:
        pass

    assert manager.in_flight_commands_for_room("room-a") == 0
    assert manager.in_flight_command_total() == 0


# ---------------------------------------------------------------------------
# Scheduler: per-room in-flight callback accounting
# ---------------------------------------------------------------------------


def _wait_until(predicate, *, timeout=2.0, interval=0.01):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(interval)
    return predicate()


def test_scheduler_tracks_in_flight_callback_per_room():
    entered = threading.Event()
    release = threading.Event()
    deadlines = {"room-a": time.monotonic() + 0.02, "room-b": None}

    def expire(room_id):
        entered.set()
        release.wait(timeout=2.0)
        deadlines[room_id] = None
        return True

    scheduler = PhaseTimerScheduler(
        get_deadline=deadlines.get,
        expire=expire,
        on_expired=lambda room_id: None,
        clock=time.monotonic,
        start_task=lambda fn: threading.Thread(target=fn, daemon=True).start(),
    )
    scheduler.arm("room-a")

    assert entered.wait(timeout=2.0)
    assert scheduler.in_flight_count_for_room("room-a") == 1
    assert scheduler.in_flight_count_for_room("room-b") == 0
    assert scheduler.in_flight_total() == 1

    release.set()
    assert _wait_until(lambda: scheduler.in_flight_total() == 0)
    assert scheduler.in_flight_count_for_room("room-a") == 0
    scheduler.shutdown()
