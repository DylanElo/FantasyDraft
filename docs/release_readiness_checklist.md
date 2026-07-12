# Release Readiness Checklist

## Automated

- [ ] Full pytest suite passes.
- [ ] Python compilation passes.
- [ ] Changed JavaScript syntax checks pass.
- [ ] `git diff --check` passes.
- [ ] Gunicorn config accepts one worker and rejects two.
- [ ] `/healthz` and `/readyz` return 200 in the candidate environment.
- [ ] SQLite backup and restore rehearsal succeeds.

## Runtime Smoke

- [ ] CPU match completes through Results.
- [ ] Private PvP joins from two independent browser sessions.
- [ ] Reconnect token rotates and old token is rejected.
- [ ] Planning and Queue Review timeouts advance authoritatively.
- [ ] Exit/surrender does not reopen an abandoned match.
- [ ] Ops endpoint rejects missing/wrong tokens.
- [ ] Debug endpoints return 404.

## Human And External

- [ ] 390x844, 430x932, and physical 360x800-equivalent device QA passes.
- [ ] Screen-reader, contrast, reduced-motion, and motor-access review passes.
- [ ] Broader mirrored simulations and structured human balance sessions pass.
- [ ] Privacy and replay-retention policy is approved.
- [ ] Legal/IP/commercial approval is recorded.
- [ ] Licensed art/audio provenance is recorded.
- [ ] Load, soak, restart, backup, restore, and rollback exercises pass.
- [ ] Incident, moderation, support, and live-operations owners are assigned.
