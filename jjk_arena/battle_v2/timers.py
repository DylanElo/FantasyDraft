"""Server-authoritative phase deadlines for Battle v2.

This module owns timing policy only. The manager remains responsible for the
authoritative transition taken when a deadline expires.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
import time
from collections.abc import Callable

from .models import BattlePhase, BattleState


@dataclass(frozen=True, slots=True)
class BattleTimerPolicy:
    planning_seconds: float = 60.0
    queue_review_seconds: float = 30.0

    def seconds_for(self, phase: BattlePhase) -> float | None:
        if phase == BattlePhase.PLANNING:
            return self.planning_seconds
        if phase == BattlePhase.QUEUE_REVIEW:
            return self.queue_review_seconds
        return None


def system_clock() -> float:
    return time.monotonic()


def arm_phase_timer(
    state: BattleState,
    policy: BattleTimerPolicy,
    clock: Callable[[], float] = system_clock,
) -> None:
    seconds = policy.seconds_for(state.phase)
    state.phase_deadline = None if seconds is None else clock() + seconds


def phase_timer_expired(
    state: BattleState,
    clock: Callable[[], float] = system_clock,
) -> bool:
    return state.phase_deadline is not None and clock() >= state.phase_deadline


def phase_seconds_remaining(
    state: BattleState,
    clock: Callable[[], float] = system_clock,
) -> int | None:
    if state.phase_deadline is None:
        return None
    return max(0, math.ceil(state.phase_deadline - clock()))
