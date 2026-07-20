# Release Readiness Checklist

## Automated

- [ ] Full pytest suite passes.
- [ ] Python compilation passes.
- [ ] Changed JavaScript syntax checks pass.
- [ ] `git diff --check` passes.
- [ ] Gunicorn config accepts one worker and rejects two.
- [ ] `/healthz` and `/readyz` return 200 in the candidate environment.
- [ ] SQLite backup and restore rehearsal succeeds.
- [ ] `docker build` succeeds against the pinned base-image digest and
  `constraints.txt`; the container `HEALTHCHECK` reaches `/readyz` when only
  `JJK_PORT` (not `PORT`) is set.

## Runtime Smoke

- [ ] CPU match completes through Results.
- [ ] Private PvP joins from two independent browser sessions.
- [ ] Reconnect token rotates and old token is rejected.
- [ ] A premature resume attempt (original socket still connected) is
  rejected without burning the resume token; the same token still resumes
  successfully after a real disconnect.
- [ ] Planning and Queue Review timeouts advance authoritatively.
- [ ] Exit/surrender does not reopen an abandoned match.
- [ ] Ops endpoint rejects missing/wrong tokens.
- [ ] Debug endpoints return 404.
- [ ] `/ops/safe_stop` returns HTTP 200 (`safe_to_stop: true`, no `blockers`)
  before the outgoing instance is stopped; see `docs/production_runbook.md`
  ("Safe-Stop Drain Gate"). A nonzero `analytics_outbox_dropped_total` or any
  in-flight command/scheduler callback must block; a `mission_settlements`
  `dead_letter` count is a `warnings` entry only and does not block by itself.

## Human And External

- [ ] 390x844, 430x932, and physical 360x800-equivalent device QA passes.
- [ ] Screen-reader, contrast, reduced-motion, and motor-access review passes.
- [ ] Broader mirrored simulations and structured human balance sessions pass.
- [ ] Privacy and replay-retention policy is approved.
- [ ] Legal/IP/commercial approval is recorded.
- [ ] Licensed art/audio provenance is recorded.
- [ ] Load, soak, restart, backup, restore, and rollback exercises pass.
- [ ] Incident, moderation, support, and live-operations owners are assigned.
