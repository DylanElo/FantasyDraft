# Release Readiness Checklist

Checked items are scoped exactly to the pass that most recently verified them
and the commit noted alongside. They are evidence, not blanket approval for a
later source tree, image, or deployment -- a tree change invalidates any
commit-specific claim below until it is re-verified.

`docs/release_candidate_rehearsal_2026-07-20.md` documents an earlier
candidate rehearsal (`83de0cfef48574886d1f1ce69e8a1ddef321fab5`). That commit
predates the reconciliation that replaced its global in-flight
counters/`/ops/drain` inflight fields with the per-room accounting in
`BattleV2Manager`/`PhaseTimerScheduler` and fixed a cross-room race in the
deferred terminal-match callback (see `docs/session_history.md`). Its
specific numbers, commit hash, and image digest describe that superseded
tree, not the current one -- treat it as historical evidence of the
methodology, not a current-tree pass. A fresh rehearsal against the
reconciled tree is required before reusing its "final candidate" claims.

## Automated

- [ ] Full pytest suite passes, normal and reverse file order.
- [ ] Python compilation passes for `jjk_arena`, `web/app.py`, and `tools`.
- [ ] Changed JavaScript syntax checks pass.
- [ ] `git diff --check` passes.
- [ ] Gunicorn config accepts one effective `gthread` worker with at least two
  threads and rejects worker, worker-class, thread, async-mode, and
  production-mode overrides.
- [ ] `/healthz` and `/readyz` return 200 in the candidate environment.
- [ ] `docker build` succeeds against the pinned base-image digest and
  `constraints.txt`; the container `HEALTHCHECK` reaches `/readyz` when only
  `JJK_PORT` (not `PORT`) is set.
- [ ] Both required 1,000-match lifecycle soak seeds pass with zero
  softlocks, zero final rooms, RSS below 419,430,400 bytes, and zero
  scheduler worker threads after shutdown.

## Runtime Smoke

- [ ] CPU match completes through Results.
- [ ] Private PvP joins from two independent browser sessions.
- [ ] Reconnect token rotates and old token is rejected.
- [ ] A premature resume attempt (original socket still connected) is
  rejected without burning the resume token; the same token still resumes
  successfully after a real disconnect.
- [ ] Planning and Queue Review timeouts advance authoritatively, including
  discard of an unconfirmed queue.
- [ ] Exit/surrender does not reopen an abandoned match.
- [ ] Protected ops routes reject missing/wrong tokens; debug endpoints
  return 404 (production keeps them 404 even with `JJK_DEBUG=1`).

## Network, Drain, And Persistence Gates

- [ ] `/ops/safe_stop` returns HTTP 200 (`safe_to_stop: true`, no `blockers`)
  before the outgoing instance is stopped; see `docs/production_runbook.md`
  ("Safe-Stop Drain Gate"). A nonzero `analytics_outbox_dropped_total` or any
  in-flight command/scheduler callback must block; a `mission_settlements`
  `dead_letter` count is a `warnings` entry only and does not block by
  itself.
- [ ] Protected `POST /ops/drain` rejects new CPU/PvP/rematch admission,
  cancels waiting lobbies, and continues existing command/resume handling.
- [ ] The final drain snapshot (`/ops/runtime`) has exact zero live rooms,
  lobbies, scheduler tasks/callbacks/errors, in-flight command handlers,
  terminal-persistence work, mission snapshot retries, settlement fallback
  rows, analytics outbox work/drops, and pending/processing/failed-retryable
  settlements. A durable `dead_letter` settlement is not in-memory drain
  work, but still requires an operator incident decision.
- [ ] SQLite backup and restore rehearsal succeeds: a quiesced bundle is
  backed up, integrity/hash verified, restored to a new destination, and
  published with a restore-completion marker.
- [ ] The restored candidate reaches readiness, runs a CPU WebSocket flow,
  rejects finished resume, and extends durable match analytics correctly.
- [ ] Backup/restore is repeated with populated profiles, opted-in replays,
  pending/processing settlement rows, and a present settlement sidecar (not
  just an empty database).
- [ ] The database, bundle, marker, and any sidecar use an operator-only
  production ACL/DACL.

## Failure And Rollback Gates

- [ ] Unsafe effective Gunicorn settings fail before serving traffic.
- [ ] Placeholder/debug production configuration keeps liveness available but
  returns readiness 503 and keeps debug routes hidden.
- [ ] Unexpected crash/restart on the candidate image preserves committed
  SQLite data while losing process-local battle/timer/resume state; restart
  drains cleanly.
- [ ] The exact immutable previously deployed image digest starts against an
  isolated candidate-era restore and completes a real CPU flow.
- [ ] Operational rollback proves a protected drain and every candidate-era
  safe-stop gate on the rollback artifact specifically (not just schema
  compatibility).
- [ ] Approved rollback RTO is measured and any RPO is quantified/approved
  while retaining candidate-era data for reconciliation.
- [ ] Orchestrator-level failure injection is completed, not just local
  process/container injection.

## TLS, Browser, Device, Capacity, And Human Gates

- [ ] Network acceptance passes through real HTTPS ingress, TLS termination,
  `wss://`, load-balancer WebSocket upgrades, and Secure-cookie handoff (a
  loopback `http://` run with an injected HTTPS Origin does not test this).
- [ ] A CPU match reaches Phaser Results in a real browser.
- [ ] Private PvP joins and plays from two independent real browser sessions.
- [ ] Browser reconnect, Planning, Orders Open, Queue Review, surrender, and
  result wording remain aligned with authoritative state.
- [ ] 390x844, 430x932, and physical 360x800-equivalent QA passes, including
  all four techniques at 360x800.
- [ ] Screen-reader, contrast, reduced-motion, and motor-access review
  passes.
- [ ] Target-capacity testing passes against an approved traffic model and
  SLO (a bounded local correctness ramp is not capacity evidence).
- [ ] Broader mirrored simulations and structured human balance sessions
  pass.
- [ ] Privacy and replay-retention policy is approved.
- [ ] Legal/IP/commercial approval is recorded.
- [ ] Licensed art/audio provenance and physical audio/haptics QA are
  recorded.
- [ ] Incident, moderation, support, and live-operations owners are
  assigned.
