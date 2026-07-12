"""Stale-safe background wakeups for authoritative Battle v2 phase timers."""

from __future__ import annotations

from collections.abc import Callable
from threading import Lock


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
        sleep: Callable[[float], None],
    ) -> None:
        self.get_deadline = get_deadline
        self.expire = expire
        self.on_expired = on_expired
        self.clock = clock
        self.start_task = start_task
        self.sleep = sleep
        self._lock = Lock()
        self._tokens: dict[str, int] = {}
        self._deadlines: dict[str, float] = {}

    def arm(self, room_id: str) -> None:
        deadline = self.get_deadline(room_id)
        with self._lock:
            if deadline is None:
                self._tokens[room_id] = self._tokens.get(room_id, 0) + 1
                self._deadlines.pop(room_id, None)
                return
            if self._deadlines.get(room_id) == deadline:
                return
            token = self._tokens.get(room_id, 0) + 1
            self._tokens[room_id] = token
            self._deadlines[room_id] = deadline
        self.start_task(self._wait_for_deadline, room_id, deadline, token)

    def cancel(self, room_id: str) -> None:
        with self._lock:
            self._tokens[room_id] = self._tokens.get(room_id, 0) + 1
            self._deadlines.pop(room_id, None)

    def _wait_for_deadline(self, room_id: str, deadline: float, token: int) -> None:
        while True:
            remaining = deadline - self.clock()
            if remaining <= 0:
                break
            self.sleep(remaining)
        with self._lock:
            if self._tokens.get(room_id) != token or self._deadlines.get(room_id) != deadline:
                return
            self._deadlines.pop(room_id, None)
        if self.expire(room_id):
            self.on_expired(room_id)
        self.arm(room_id)
