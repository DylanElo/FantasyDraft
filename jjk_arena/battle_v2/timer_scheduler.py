"""Single-worker, cancellable background wakeups for authoritative Battle v2 phase timers.

Earlier versions of this scheduler spawned one background task per armed
deadline: every re-plan (a new phase deadline, a new disconnect deadline)
started another sleeping task, and `cancel()` only invalidated a token that a
still-sleeping task would notice *after* it eventually woke up on its own —
never before. Under real traffic (replanning, reconnects, forfeits) this
accumulated one live sleeping thread per deadline change for the lifetime of
a room, and none of them woke early on cancel.

This version runs exactly one long-lived worker (started lazily on first
`arm()`), backed by a small priority queue keyed on deadline and a
`Condition`. `arm()`/`cancel()` mutate shared state and notify the worker,
so a cancellation (or an earlier re-arm) wakes the worker immediately
instead of waiting out a stale sleep. No new task is ever spawned per
deadline; `active_task_count()` reports the number of rooms with a live
scheduled deadline, and `shutdown()` deterministically stops the one worker
so tests/process shutdown never leave it sleeping.
"""

from __future__ import annotations

import heapq
import itertools
from collections.abc import Callable
from threading import Condition, Event


class PhaseTimerScheduler:
    """Schedule at most one effective timeout wakeup for each battle room."""

    def __init__(
        self,
        *,
        get_deadline: Callable[[str], float | None],
        expire: Callable[[str], bool],
        on_expired: Callable[[str], None],
        clock: Callable[[], float],
        start_task: Callable[..., object],
        sleep: Callable[[float], None] | None = None,
    ) -> None:
        self.get_deadline = get_deadline
        self.expire = expire
        self.on_expired = on_expired
        self.clock = clock
        self.start_task = start_task
        # `sleep` is accepted (and ignored) only for backward-compatible
        # construction; the worker uses Condition.wait() instead of a raw
        # sleep so cancellation can interrupt it immediately.
        self._condition = Condition()
        self._deadlines: dict[str, float] = {}
        self._entry_seq = itertools.count()
        self._heap: list[tuple[float, int, str]] = []
        self._stopped = False
        self._worker_started = False
        self._worker_stopped_evt = Event()
        self._worker_stopped_evt.set()

    def arm(self, room_id: str) -> None:
        deadline = self.get_deadline(room_id)
        with self._condition:
            if self._stopped:
                return
            if deadline is None:
                self._deadlines.pop(room_id, None)
                self._condition.notify_all()
                return
            if self._deadlines.get(room_id) == deadline:
                return
            self._deadlines[room_id] = deadline
            heapq.heappush(self._heap, (deadline, next(self._entry_seq), room_id))
            self._condition.notify_all()
        self._ensure_worker()

    def cancel(self, room_id: str) -> None:
        with self._condition:
            self._deadlines.pop(room_id, None)
            self._condition.notify_all()

    def active_task_count(self) -> int:
        """Number of rooms with a live scheduled deadline right now."""

        with self._condition:
            return len(self._deadlines)

    def shutdown(self, *, timeout: float | None = 5.0) -> None:
        """Stop the single worker deterministically and wait for it to exit.

        Safe to call when the worker was never started (e.g. no room was
        ever armed) or has already stopped.
        """

        with self._condition:
            self._stopped = True
            self._deadlines.clear()
            self._heap.clear()
            already_stopped = not self._worker_started or self._worker_stopped_evt.is_set()
            self._condition.notify_all()
        if not already_stopped:
            self._worker_stopped_evt.wait(timeout)

    def _ensure_worker(self) -> None:
        with self._condition:
            if self._worker_started:
                return
            self._worker_started = True
            self._worker_stopped_evt.clear()
        self.start_task(self._run)

    def _run(self) -> None:
        try:
            while True:
                fired_room_id: str | None = None
                with self._condition:
                    if self._stopped:
                        return
                    while self._heap and (
                        self._heap[0][2] not in self._deadlines
                        or self._heap[0][0] != self._deadlines[self._heap[0][2]]
                    ):
                        heapq.heappop(self._heap)
                    if not self._heap:
                        self._condition.wait()
                        continue
                    deadline, _, room_id = self._heap[0]
                    remaining = deadline - self.clock()
                    if remaining > 0:
                        self._condition.wait(timeout=remaining)
                        continue
                    heapq.heappop(self._heap)
                    self._deadlines.pop(room_id, None)
                    fired_room_id = room_id
                # Run callbacks outside the lock: expire()/on_expired() touch
                # manager/socket state and may themselves call arm()/cancel(),
                # which would otherwise re-enter this same condition's lock.
                if fired_room_id is not None:
                    try:
                        if self.expire(fired_room_id):
                            self.on_expired(fired_room_id)
                    except Exception:
                        # A single bad callback must not permanently kill the
                        # one shared worker for every other room; surface it
                        # (no logging framework in this codebase) and keep going.
                        import traceback
                        traceback.print_exc()
                    self.arm(fired_room_id)
        finally:
            with self._condition:
                self._worker_started = False
            self._worker_stopped_evt.set()
