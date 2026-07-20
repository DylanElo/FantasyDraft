# Release Readiness Checklist

Checked items are scoped exactly to the local 2026-07-20 rehearsal. They are
evidence, not approval for a later source tree, image, or deployment.

## Final Candidate Artifact And Automated Gates

- [x] Runtime commit
  `83de0cfef48574886d1f1ce69e8a1ddef321fab5`, its OCI revision label, and local
  image digest
  `sha256:77319d5b10568d91d30429cf4a4a44ca4dc5be564c66a190cfa700045aa14d36`
  identify the same source. Later evidence-only documentation is excluded from
  the image context.
- [ ] The final image is pushed to and pulled from a registry by immutable
  digest. The local OCI digest does not close this gate.
- [x] Full pytest passes in normal order: 673 passed, 2 skipped.
- [x] All 55 test files pass in reverse filename order: 673 passed, 2 skipped.
- [x] Both required 1,000-match lifecycle soak seeds pass with zero softlocks,
  zero final rooms, RSS below 419,430,400 bytes, and zero scheduler worker
  threads after shutdown.
- [x] Python compilation passes for `jjk_arena`, `web/app.py`, and `tools`.
- [x] Changed-JavaScript syntax is not applicable: this pass changes zero
  JavaScript files.
- [x] `git diff --check` passes.
- [x] Production launch accepts exactly one effective `gthread` worker with at
  least two threads and rejects worker, worker-class, thread, async-mode, and
  production-mode overrides.

[Candidate and automated evidence](release_candidate_rehearsal_2026-07-20.md#automated-verification)

## Network, Drain, And Persistence Gates

- [x] The exact image returns production/schema-6/single-authority readiness
  with empty issues and healthy storage.
- [x] Real Gunicorn/WebSocket probes cover CPU terminal state, private
  two-client PvP, resume-token rotation and replay rejection, and post-finish
  resume rejection.
- [x] Planning and Queue Review expire authoritatively at the observed
  60-second deadlines, including discard of an unconfirmed queue.
- [x] Protected ops routes hide themselves from missing/wrong tokens and
  production debug routes remain 404.
- [x] The 1,000-request, concurrency-32 local correctness ramp completes with
  zero request errors. This is not target-capacity evidence.
- [x] Protected drain rejects new CPU/PvP/rematch admission, cancels waiting
  lobbies, and continues existing command/resume handling.
- [x] The final drain snapshot has exact zero live rooms, lobbies, scheduler
  tasks/callbacks/errors, command handlers, terminal-persistence work, mission
  snapshot retries, settlement fallback rows, analytics outbox work/drops, and
  pending/processing/failed-retryable/dead-letter settlements.
- [x] The sole worker exits 0 with a 40-second orchestrator grace longer than
  Gunicorn's 30-second graceful timeout (0.581 seconds; restored run 0.592
  seconds).
- [x] A quiesced SQLite bundle is backed up, integrity/hash verified, restored
  to a new destination, and published with a restore-completion marker.
- [x] The restored exact image reaches readiness, runs a CPU WebSocket flow,
  rejects finished resume, extends durable match analytics from 4 to 5, and
  drains back to exact zero.
- [ ] Repeat final-candidate backup/restore with populated profiles, opted-in
  replays, pending/processing settlement rows, and a present settlement
  sidecar. The local database had zero rows for those durable families.
- [ ] Verify the database, bundle, marker, and any sidecar use an operator-only
  production ACL/DACL. Local automated mode checks do not establish a Windows
  production DACL.

[Network and recovery evidence](release_candidate_rehearsal_2026-07-20.md#real-network-and-bounded-load-results)

## Failure And Rollback Gates

- [x] Unsafe effective Gunicorn settings fail before serving traffic.
- [x] Placeholder/debug production configuration keeps liveness available but
  returns readiness 503 and keeps debug routes hidden.
- [x] Unexpected crash/restart on the exact image preserves committed SQLite
  data while losing the documented process-local battle, timer, and resume
  state; restart drains cleanly.
- [x] A local `origin/main` source image reads a fresh candidate schema-6
  restore and completes a real CPU flow plus analytics write.
- [ ] The exact immutable previously deployed digest starts against an isolated
  candidate-era restore. The old image exercised here was a local source image.
- [ ] Operational rollback proves a protected drain and every candidate-era
  safe-stop gate on the rollback artifact. `origin/main` at `05a6069` has no
  `/ops/drain` and therefore is schema-compatible but not operationally
  rollback-ready.
- [ ] Measure approved rollback RTO and quantify/approve any RPO while retaining
  candidate-era data for reconciliation.
- [ ] Complete orchestrator-level failure injection rather than local
  process/container injection only.

[Failure and rollback boundary](release_candidate_rehearsal_2026-07-20.md#failure-exercises)

## TLS, Browser, Device, Capacity, And Human Gates

- [ ] Network acceptance passes through real HTTPS ingress, TLS termination,
  `wss://`, load-balancer WebSocket upgrades, and Secure-cookie handoff.
- [ ] A CPU match reaches Phaser Results in a real browser.
- [ ] Private PvP joins and plays from two independent real browser sessions.
- [ ] Browser reconnect, Planning, Orders Open, Queue Review, surrender, and
  result wording remain aligned with authoritative state.
- [ ] 390x844, 430x932, and physical 360x800-equivalent QA passes, including all
  four techniques at 360x800.
- [ ] Screen-reader, contrast, reduced-motion, and motor-access review passes.
- [ ] Target-capacity testing passes against an approved traffic model and SLO.
- [ ] Broader mirrored simulations and structured human balance sessions pass.
- [ ] Privacy and replay-retention policy is approved.
- [ ] Legal/IP/commercial approval is recorded.
- [ ] Licensed art/audio provenance and physical audio/haptics QA are recorded.
- [ ] Incident, moderation, support, and live-operations owners are assigned.

[Open-gate boundary](release_candidate_rehearsal_2026-07-20.md#gates-deliberately-left-open)
