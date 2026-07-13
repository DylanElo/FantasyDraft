import threading
import time

import pytest

from jjk_arena.battle_v2.timer_scheduler import PhaseTimerScheduler


def _real_scheduler(get_deadline, expire, on_expired, clock=time.monotonic):
    """A scheduler wired to real threads/timing, for behavioral tests."""

    return PhaseTimerScheduler(
        get_deadline=get_deadline,
        expire=expire,
        on_expired=on_expired,
        clock=clock,
        start_task=lambda fn: threading.Thread(target=fn, daemon=True).start(),
    )


def _wait_until(predicate, *, timeout=2.0, interval=0.01):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(interval)
    return predicate()


def test_scheduler_fires_expire_once_deadline_elapses():
    deadlines = {"room": time.monotonic() + 0.05}
    expired = []
    broadcasts = []

    def expire(room_id):
        expired.append(room_id)
        deadlines[room_id] = None
        return True

    scheduler = _real_scheduler(deadlines.get, expire, broadcasts.append)
    scheduler.arm("room")

    assert _wait_until(lambda: expired == ["room"])
    assert _wait_until(lambda: broadcasts == ["room"])
    scheduler.shutdown()


def test_rearming_with_a_new_deadline_only_fires_once_for_the_latest_deadline():
    deadlines = {"room": time.monotonic() + 10.0}
    expired = []

    def expire(room_id):
        expired.append(room_id)
        deadlines[room_id] = None  # matches real callbacks: expiry must advance/clear state
        return True

    scheduler = _real_scheduler(deadlines.get, expire, lambda room_id: None)
    scheduler.arm("room")
    # Re-plan to a much sooner deadline -- this must wake the worker
    # immediately rather than waiting out the original 10s sleep.
    deadlines["room"] = time.monotonic() + 0.05
    scheduler.arm("room")

    assert _wait_until(lambda: expired == ["room"], timeout=1.0)
    scheduler.shutdown()


def test_cancel_wakes_a_pending_wait_immediately_instead_of_after_the_stale_deadline():
    """Regression: the old scheduler's cancel() only invalidated a token that
    a still-sleeping thread would notice *after* its full sleep elapsed. A
    cancellation must be observable right away, not merely tolerated later."""

    deadlines = {"room": time.monotonic() + 5.0}
    expired = []

    scheduler = _real_scheduler(deadlines.get, lambda room_id: (expired.append(room_id) or True), lambda room_id: None)
    scheduler.arm("room")
    assert scheduler.active_task_count() == 1

    started = time.monotonic()
    scheduler.cancel("room")

    assert _wait_until(lambda: scheduler.active_task_count() == 0, timeout=0.5)
    # The cancellation itself must be near-instant, not gated on the 5s deadline.
    assert time.monotonic() - started < 0.5
    time.sleep(0.1)
    assert expired == []
    scheduler.shutdown()


def test_scheduler_deduplicates_identical_deadline():
    deadlines = {"room": time.monotonic() + 5.0}
    arm_calls = []
    original_get_deadline = deadlines.get

    def tracked_get_deadline(room_id):
        arm_calls.append(room_id)
        return original_get_deadline(room_id)

    scheduler = _real_scheduler(tracked_get_deadline, lambda room_id: True, lambda room_id: None)
    scheduler.arm("room")
    scheduler.arm("room")
    scheduler.arm("room")

    # Only one live entry regardless of how many times the same deadline is re-armed.
    assert scheduler.active_task_count() == 1
    scheduler.shutdown()


def test_only_one_worker_thread_exists_no_matter_how_many_rooms_are_armed():
    """Regression: the old scheduler spawned a new background task per
    deadline change. Arming many different rooms (and re-arming each one
    several times) must still start exactly one worker."""

    deadlines = {f"room-{i}": time.monotonic() + 5.0 for i in range(25)}
    started_tasks = []

    scheduler = PhaseTimerScheduler(
        get_deadline=deadlines.get,
        expire=lambda room_id: True,
        on_expired=lambda room_id: None,
        clock=time.monotonic,
        start_task=lambda fn: started_tasks.append(fn) or threading.Thread(target=fn, daemon=True).start(),
    )
    for room_id in deadlines:
        scheduler.arm(room_id)
        scheduler.arm(room_id)  # re-arm with the same deadline: must not start another task

    assert len(started_tasks) == 1
    assert scheduler.active_task_count() == len(deadlines)
    scheduler.shutdown()


def test_shutdown_stops_the_worker_thread_and_is_idempotent():
    deadlines = {"room": time.monotonic() + 5.0}
    scheduler = _real_scheduler(deadlines.get, lambda room_id: True, lambda room_id: None)
    scheduler.arm("room")
    assert _wait_until(lambda: scheduler._worker_started, timeout=1.0)

    scheduler.shutdown()
    assert scheduler._worker_stopped_evt.is_set()
    assert scheduler.active_task_count() == 0

    # Shutting down a scheduler whose worker never started, or twice in a
    # row, must not hang or raise.
    scheduler.shutdown()

    never_started = _real_scheduler(lambda room_id: None, lambda room_id: True, lambda room_id: None)
    never_started.shutdown()


def test_shutdown_prevents_further_arming():
    deadlines = {"room": time.monotonic() + 5.0}
    scheduler = _real_scheduler(deadlines.get, lambda room_id: True, lambda room_id: None)
    scheduler.shutdown()

    scheduler.arm("room")

    assert scheduler.active_task_count() == 0
