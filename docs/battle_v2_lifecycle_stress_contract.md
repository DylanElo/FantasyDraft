# Battle v2 lifecycle stress contract

The lifecycle stress harness drives the real `web.app` Socket.IO handlers
(join, resume, rematch, disconnect, surrender) through Flask-SocketIO test
clients, the same harness the unit tests use, across randomized match
scenarios. It exercises the simulated-network path the Phase 4 roadmap gate
names explicitly, not the headless engine-only simulator in
`docs/battle_v2_simulation_contract.md`.

## Scenarios

Each simulated match randomly selects one of:

- `clean_finish` — join, surrender, done.
- `disconnect_reconnect` — one player disconnects, resumes via a fresh
  session, then finishes the match.
- `disconnect_forfeit` — one player's disconnect budget is pre-exhausted so
  the live background scheduler auto-forfeits the match within its grace
  window, without any further client action.
- `rematch_spam` — the same rematch nonce/revision is submitted repeatedly;
  exactly one new match id must result.
- `code_reuse_race` — after a match finishes, its private code is
  immediately reused by a new pair of players without an explicit ack.

## Invariants checked (a "softlock")

After every simulated match the harness asserts:

- the second joiner always receives a `battle_v2_update` with a real match id;
- a disconnect always pauses the match, and reconnect/resume always restores
  it and reconciles `active_match_by_player`;
- a disconnect-budget exhaustion always produces a `FORFEIT` with the correct
  winner within the harness's polling window;
- rematch spam never creates more than one new match per `old_match_id`;
- a finished match's private code is reusable immediately, and never reuses
  the finished match's own id;
- no player id is ever mapped to two different *live* (non-finished) matches
  at once.

Any violation is recorded as a softlock with the match index, scenario, and a
detail payload, rather than failing fast — a full batch always runs to
completion so the report shows every failure, not just the first.

## CLI

```bash
python -m jjk_arena.battle_v2.lifecycle_stress --matches 1000 --seed 1
```

Prints a JSON summary (`schema_version`, `matches`, `seed`, `elapsed_seconds`,
`scenario_counts`, `softlocks`, `softlock_count`) and exits non-zero if any
softlock was recorded. `tests/test_battle_v2_lifecycle_stress.py` runs a
100-match batch as a permanent regression guard; the full 1,000-match runs
used to close the Phase 4 exit gate are recorded in `docs/session_history.md`
rather than committed as CI-run artifacts, since they take tens of seconds
each and are not needed on every commit.

## Limitations

This harness exercises lifecycle/session/socket bookkeeping, not combat
correctness, balance, or AI quality — those are covered by
`docs/battle_v2_simulation_contract.md` and the resolution-order/adversarial
test suites. It does not run against a real network transport or multiple
server processes, so it cannot detect cross-process or cross-worker races;
per `docs/production_runbook.md`, the deployment remains single-worker until
an external coordinator exists for exactly that reason.
