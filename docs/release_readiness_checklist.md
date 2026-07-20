# Release Readiness Checklist

Checked items below are scoped exactly to the linked 2026-07-20 local
rehearsal. They are historical evidence, not sign-off for a later worktree or
image. A final-candidate gate remains unchecked until its evidence identifies
the clean commit/tree and immutable image digest that was actually exercised.

## Completed Local Rehearsal Evidence

- [x] One production-mode Gunicorn `gthread` worker started, while two workers
  and a non-threading Socket.IO mode failed before worker boot.
  [Evidence](release_candidate_rehearsal_2026-07-20.md#failure-exercises)
- [x] The isolated candidate returned healthy `/healthz` and `/readyz` results
  with runtime schema 6.
  [Evidence](release_candidate_rehearsal_2026-07-20.md#candidate-image-and-topology)
- [x] Direct Gunicorn WebSocket probes exercised a CPU terminal server event,
  private PvP with two independent Python clients, resume-token rotation and
  old-token rejection, and surrender cleanup.
  [Evidence](release_candidate_rehearsal_2026-07-20.md#real-network-and-bounded-load-results)
- [x] Planning and Queue Review expired authoritatively at the configured
  60-second deadlines, including discard of an unconfirmed queue.
  [Evidence](release_candidate_rehearsal_2026-07-20.md#real-network-and-bounded-load-results)
- [x] Protected ops routes rejected missing/wrong tokens, and the debug route
  remained hidden.
  [Evidence](release_candidate_rehearsal_2026-07-20.md#real-network-and-bounded-load-results)
- [x] A 1,000-request, 32-concurrency local health/readiness correctness ramp
  completed without request errors; this is not capacity evidence.
  [Evidence](release_candidate_rehearsal_2026-07-20.md#real-network-and-bounded-load-results)
- [x] A quiesced SQLite bundle was backed up, verified, restored to a new path,
  and started successfully. That rehearsal had no sidecar, profiles, replays,
  or pending settlements; sidecar coverage was automated-test evidence only.
  [Evidence](release_candidate_rehearsal_2026-07-20.md#backup-restore-and-restart)
- [x] A local crash exercise confirmed committed SQLite data survived while the
  active in-memory match, timer, and resume token did not.
  [Evidence](release_candidate_rehearsal_2026-07-20.md#failure-exercises)
- [x] A source rebuild of `origin/main` read a restored schema-6 candidate
  database. This is compatibility evidence only, not immutable rollback.
  [Evidence](release_candidate_rehearsal_2026-07-20.md#rollback-compatibility-boundary)

## Final Candidate Artifact And Automated Gates

- [ ] The worktree is clean; the candidate commit/tree, OCI revision label, and
  immutable registry digest identify the same final source.
- [ ] The full pytest suite passes in normal order against the final source.
- [ ] The full pytest suite passes in reverse order against the final source.
- [ ] The first required 1,000-match soak seed passes against the final source.
- [ ] The second required 1,000-match soak seed passes against the final source.
- [ ] Python compilation passes.
- [ ] Syntax checks pass for every changed JavaScript file.
- [ ] `git diff --check` passes.
- [ ] Final production launch checks accept exactly one effective `gthread`
  worker with at least two threads and reject environment/CLI topology
  overrides.
- [ ] External network acceptance passes against the final digest, validates
  production mode/schema 6/single-authority topology/empty readiness issues,
  enables protected drain, and proves every exact safe-stop gate is zero.

## Planned Stop, Persistence, And Recovery Gates

- [ ] Protected `POST /ops/drain` blocks new CPU starts, PvP joins, and newly
  created rematches; cancels/notifies waiting lobbies; and still permits active
  commands and authenticated resume.
- [ ] A planned deployment reaches
  `accepting_new_matches=false`, zero live rooms/lobbies/timers/mission snapshot
  retry rooms/analytics outbox, and zero pending/processing/failed-retryable
  settlements before stopping.
- [ ] The sole worker exits gracefully with an orchestrator grace period longer
  than Gunicorn's 30-second graceful timeout; elapsed drain and stop time are
  recorded.
- [ ] A final-candidate backup/verify/restore rehearsal covers database plus a
  present settlement sidecar, private permissions or ACL/DACL, a restore into a
  new destination, and the restore-completion marker.
- [ ] A drained restart preserves profiles, opted-in replays, analytics, and
  settlement state using the final candidate artifact.
- [ ] An unexpected-crash exercise is repeated against the final artifact and
  records the expected active-match interruption boundary.
- [ ] The exact immutable previously deployed digest starts against an isolated
  restore of the candidate-era database.
- [ ] An immutable-image rollback rehearsal drains and stops the candidate,
  preserves a candidate-era backup, starts the prior digest without overlapping
  authorities, and measures RTO.
- [ ] If pre-deploy storage restoration is required, its post-cutover data-loss
  window is quantified and explicitly approved as the RPO; database and
  sidecar are restored together to a new volume and candidate-era data is
  retained for reconciliation.

The current rehearsal deliberately leaves immutable rollback and RTO/RPO open.
[Evidence boundary](release_candidate_rehearsal_2026-07-20.md#gates-deliberately-left-open)

## TLS, Browser, Device, And Human Gates

- [ ] Network acceptance passes through the real HTTPS ingress, including TLS
  termination, `wss://`, load-balancer WebSocket upgrades, and Secure-cookie
  handoff. Direct loopback `ws://` evidence does not close this gate.
- [ ] A CPU match reaches the Phaser Results scene in a real browser.
- [ ] Private PvP joins and plays from two independent real browser sessions.
- [ ] Browser reconnect, Planning, Orders Open, Queue Review, surrender, and
  result wording remain aligned with authoritative server phases.
- [ ] 390x844, 430x932, and physical 360x800-equivalent device QA passes, with
  all four techniques accessible at 360x800.
- [ ] Screen-reader, contrast, reduced-motion, and motor-access review passes.
- [ ] Target-capacity testing passes against an approved traffic model and SLO.
- [ ] Infrastructure/orchestrator failure injection passes.
- [ ] Broader mirrored simulations and structured human balance sessions pass.
- [ ] Privacy and replay-retention policy is approved.
- [ ] Legal/IP/commercial approval is recorded.
- [ ] Licensed art/audio provenance is recorded.
- [ ] Incident, moderation, support, and live-operations owners are assigned.

These browser, capacity, accessibility, balance, policy, and operational-owner
gates remain open in the current rehearsal.
[Evidence boundary](release_candidate_rehearsal_2026-07-20.md#gates-deliberately-left-open)
