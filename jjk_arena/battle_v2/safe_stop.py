"""Pure decision logic for the single-authoritative-worker safe-stop drain gate.

Battle v2 rooms, phase timers, resume credentials, and command receipts all
live in one authoritative Gunicorn worker (see `docs/production_runbook.md`).
Before that worker is stopped or replaced (deploy, restart, rollback), an
operator needs an explicit go/no-go: is it actually safe to drain, or would
stopping now silently lose something?

This module only computes the decision from already-gathered counters; it
does not read the database or the manager/scheduler itself, so it can be
unit-tested without any runtime wiring and reused identically by an HTTP
endpoint, a CLI gate, or `tools/network_acceptance.py`.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SafeStopDecision:
    """Result of evaluating the safe-stop drain gate."""

    ready: bool
    blockers: tuple[str, ...] = ()
    warnings: tuple[str, ...] = ()

    def as_dict(self) -> dict:
        return {
            "safe_to_stop": self.ready,
            "blockers": list(self.blockers),
            "warnings": list(self.warnings),
        }


def evaluate_safe_stop(
    *,
    analytics_outbox_dropped_total: int,
    mission_settlement_counts: dict[str, int],
    in_flight_commands: int,
    in_flight_scheduler_callbacks: int,
) -> SafeStopDecision:
    """Decide whether the single authoritative worker may be safely stopped.

    Policy, deliberately asymmetric between the two failure classes this
    gate was built to catch:

    - `analytics_outbox_dropped_total > 0` is a hard blocker. The outbox is
      in-memory only (see `SQLiteRuntimeStore.MAX_OUTBOX_SIZE`); a nonzero
      count means events were already silently discarded, and stopping the
      process now would make that loss permanent with no chance of self-heal.

    - `mission_settlement_counts["dead_letter"] > 0` is never a blocker by
      itself. Dead-lettered rows are durable (they persist in SQLite and are
      explicitly operator-redrivable per the runbook), so stopping the
      process does not lose them. But a dead letter must never be silently
      passed over either -- it is always surfaced as an explicit warning so
      an operator cannot miss it and forgets to redrive/repair it.

    - Any in-flight command handler or scheduler callback -- aggregated
      across every room -- must be exactly zero. Stopping mid-command would
      abandon a partially applied transaction rather than letting it finish
      and commit cleanly.
    """

    blockers: list[str] = []
    warnings: list[str] = []

    dropped = int(analytics_outbox_dropped_total)
    if dropped > 0:
        blockers.append(
            f"analytics_outbox_dropped_total is {dropped}, not zero: analytics "
            "events were already silently dropped and stopping now would make "
            "that loss permanent"
        )

    dead_letters = int(mission_settlement_counts.get("dead_letter", 0))
    if dead_letters > 0:
        warnings.append(
            f"mission_settlements.dead_letter is {dead_letters}: rows are durable "
            "and explicitly redrivable via SQLiteRuntimeStore.redrive_mission_settlement, "
            "so this does not block stopping, but it requires operator "
            "acknowledgement and redrive"
        )

    in_flight_total = int(in_flight_commands) + int(in_flight_scheduler_callbacks)
    if in_flight_total > 0:
        blockers.append(
            f"{in_flight_total} command handler(s)/scheduler callback(s) are still "
            "in flight across active rooms; stopping now could abandon a partially "
            "applied command"
        )

    return SafeStopDecision(ready=not blockers, blockers=tuple(blockers), warnings=tuple(warnings))
