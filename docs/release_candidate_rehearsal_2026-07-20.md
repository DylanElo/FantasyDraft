# Release Candidate Rehearsal — 2026-07-20

## Outcome and scope

The final release-readiness runtime source at commit
`83de0cfef48574886d1f1ce69e8a1ddef321fab5` passed the full automated gates,
both required 1,000-match lifecycle soaks, an exact-image production rehearsal,
direct network acceptance, planned drain, backup/restore, failure injection,
and crash/restart. A separate `origin/main` image read the candidate-era schema
6 backup, but that older source lacks the new drain contract and therefore
proves schema/source compatibility only—not operational or immutable rollback.

This was a local Docker Desktop rehearsal. It did **not** exercise a registry
pull, real HTTPS ingress, TLS termination, browser Socket.IO, physical devices,
approved target capacity, populated profile/replay/settlement data, a present
settlement sidecar, production ACL/DACL, or a previously deployed immutable
image. Those gates remain open.

No character, kit, combat number, progression tier, JavaScript module, or
mobile presentation changed. Battle v2 remains the only rules authority, the
runtime remains process-local and single-worker, hidden information remains
viewer-private, and First Creation remains the locked 19-character roster.

## Implementation closure

The pass adds production launch validation, protected health/drain operations,
SQLite-aware backup/restore tooling, and a real-network acceptance harness. A
final independent race audit then closed the following stop-safety gaps before
the image was cut:

- terminal analytics, First Creation snapshots, and opted-in replay archival
  have a derived, retryable durable-completion gate;
- terminal callbacks publish only after the authoritative mutation and replay
  bookkeeping commit, with state/replay rollback on command failure;
- scheduler callbacks, command-result handlers, analytics-outbox flushes, and
  fallback-sidecar rows remain visible while in flight;
- cleanup cannot overtake result delivery, rematch metadata capture, or an
  unfinished terminal durable handoff;
- stable analytics keys are verified in SQLite before a room is marked done;
- settlement/outbox aggregate reads preserve publication order, and even a
  corrupt or zero-byte fallback sidecar fails closed.

The protected runtime endpoint exposes aggregate counts only. No player,
resume-token, hidden-status, queue, or sidecar payload is returned.

## Candidate image and topology

The exact runtime commit was built as Linux/amd64 image
`jjk-arena:release-readiness-83de0cf` with Docker client/server 29.6.1.

- OCI revision label:
  `83de0cfef48574886d1f1ce69e8a1ddef321fab5`
- Local image/content digest and image ID:
  `sha256:77319d5b10568d91d30429cf4a4a44ca4dc5be564c66a190cfa700045aa14d36`
- Base image:
  `python:3.11-slim@sha256:db3ff2e1800a8581e2c48a27c3995339d47bdf046da21c7627accd3d51053a93`
- Created: `2026-07-20T07:14:54.12756754Z`

The digest is immutable local OCI evidence, not a registry digest. The
candidate started with generated ephemeral secrets, one Gunicorn `gthread`
worker, eight threads, an isolated SQLite volume, and explicit production
configuration. `/healthz` returned 200. `/readyz` returned 200 with no issues,
storage `ok`, schema 6, mode `production`, and topology
`single-authority-worker`. Protected ops requests with missing or wrong tokens
and production debug routes returned 404.

## Automated verification

The final runtime source passed:

- `python -m pytest -q`: **673 passed, 2 skipped** in 129.20 seconds.
- All 55 `tests/test_*.py` files in descending filename order: **673 passed,
  2 skipped** in 134.35 seconds.
- `python -m compileall -q jjk_arena web/app.py tools`.
- `git diff --check`.
- Changed-JavaScript syntax gate: not applicable; zero JavaScript files changed.

Both required 1,000-match lifecycle soaks ran in separate fresh processes:

| Seed | Elapsed | Softlocks | Final rooms | RSS | Scheduler threads after shutdown |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 85.12 s | 0 | 0 | 83,546,112 bytes | 0 |
| 2 | 70.19 s | 0 | 0 | 82,112,512 bytes | 0 |

Both stayed below the 419,430,400-byte ceiling. The scenarios covered clean
finishes, lobby-code reuse races, disconnect forfeits, reconnects, and rematch
spam.

## Real network and bounded load results

`tools/network_acceptance.py` connected from outside the candidate process to
its loopback-published port. It used direct `http://` and WebSocket transport
while sending the configured HTTPS Origin
`https://candidate.rehearsal.invalid`. This tests Gunicorn and the network
contract, not TLS, WSS, a load balancer, Secure-cookie handoff, or browser
Origin behavior.

Run `accept-9be6c6baee00` proved:

- CPU flow over WebSocket reached queue revision 2 and terminal revision 5;
  resume after finish was rejected.
- Private PvP used two independent WebSocket clients; the resume token rotated,
  the old token was rejected, and the turn advanced.
- Planning timed out authoritatively at the observed 60-second deadline in
  59.994 seconds.
- Queue Review timed out at the observed 60-second deadline in 59.993 seconds;
  the unconfirmed queue was discarded and its action did not resolve.
- CPU and PvP terminal states were reached by surrender. This is protocol and
  lifecycle evidence, not a natural-death browser playthrough.

The bounded correctness ramp issued 1,000 health/readiness requests at
concurrency 32 with zero errors in 3.197 seconds (312.817 requests/second; p50
98.009 ms, p95 143.858 ms, p99 157.835 ms, maximum 176.597 ms). It is local
correctness/race evidence, not approved capacity or an SLO.

## Planned drain and graceful stop

Protected `POST /ops/drain` set `accepting_new_matches=false`. Automated and
network coverage confirms that drain rejects new CPU starts, PvP joins, and
newly created rematches; cancels waiting lobbies; and keeps active commands and
authenticated resume available.

The exact post-drain snapshot reported zero for:

- live rooms and waiting lobbies;
- scheduler tasks and callbacks in flight;
- scheduler callback errors;
- battle command/result handlers in flight;
- terminal persistence and mission snapshot retry rooms;
- settlement fallback sidecar rows;
- analytics outbox work and dropped events;
- pending, processing, failed-retryable, and dead-letter settlements.

Four terminal room records remained intentionally retained in memory; finished
history is not active authority or unfinished persistence. Drain maintenance
reported success. The candidate stopped with `docker stop --time 40` in 0.581
seconds with exit code 0. The restored candidate stopped in 0.592 seconds with
exit code 0. Both grace periods exceeded Gunicorn's 30-second timeout.

The outer PowerShell evidence wrapper surfaced a nonzero status only after the
successful acceptance and clean stop because it promoted normal Gunicorn
stderr returned by `docker logs` to a terminating error. The complete
acceptance JSON parsed successfully, the container state independently showed
exit 0, and the log was recaptured and hashed separately.

## Backup, restore, and restart

The stopped candidate database was captured with SQLite's backup API, verified,
and restored into a new destination. The restore-completion marker was
published last.

- Backup format: 1
- Runtime schema: 6
- Integrity check: `ok`
- Database size: 73,728 bytes
- Database SHA-256:
  `9290c84c154820fa762e76bfa8e1e8fc84cc9351c0f28681868a678427f536c6`
- Rows: 9 analytics events, 0 profiles, 0 opted-in replays, 0 settlement rows
- Restore marker: `jjk_arena.sqlite3-restore-complete.json`

The exact image started from the restored volume, returned production/schema-6
readiness, ran a fresh CPU WebSocket flow, rejected post-finish resume, and
increased durable `match_finished` analytics from 4 to 5. It then reached every
exact drain zero again.

No sidecar, profile, replay, or pending settlement row existed in this local
candidate. Automated tests cover sidecar backup/restore and corrupt/empty
sidecar fail-closed behavior, but they do not close the populated-data or
production Windows ACL/DACL gate.

## Failure exercises

### Fail-closed launch and readiness

The exact image rejected every unsupported launch case before serving traffic:

- `JJK_WEB_WORKERS=2`: exit 1.
- `GUNICORN_CMD_ARGS="--worker-class sync --threads 1"`: exit 1, naming both
  invalid effective settings.
- `GUNICORN_CMD_ARGS="--threads 1"`: exit 1.
- `JJK_PRODUCTION=0`: exit 1.

With production true but the documented placeholder secret, ops token, origin,
and `JJK_DEBUG=1`, liveness remained 200 while readiness returned 503 with
exactly those four unsafe categories. `/debug-state` and both GET/POST
`/debug-reset` returned 404. The sample stopped cleanly with exit 0.

### Unexpected process loss

The exact image started a real-network CPU match. Before the injected crash,
ops reported one active/live room and one scheduler task. `docker kill`
terminated the sole authority with exit 137. Restarting the same container,
image, and SQLite volume returned production/schema-6 readiness with zero
active/live rooms and timers. The pre-crash resume credential was rejected.

The restarted process reached every modern drain gate at exact zero and then
stopped cleanly with exit 0 in 0.553 seconds. This confirms the documented
boundary: committed SQLite/sidecar data survives, while active battles, timers,
and resume grants are process-local and lost on authority crash.

## Rollback compatibility boundary

A fresh candidate backup was restored and mounted into the locally retained
`origin/main` source image at commit
`05a60698b28e1bf78cd745fd61535571840dd31a`:

- Old image/local digest:
  `sha256:90558117e74f3f78a9328528616bfb8554e702225e85e964bb4f1f448d1958ac`
- `/readyz`: 200, healthy storage, schema 6, empty issues, and
  single-authority topology.
- Real CPU WebSocket flow: queue revision 2, terminal revision 5, skill
  resolution, CPU winner, and finished-resume rejection.
- Durable `match_finished` analytics: 4 to 5.
- Restore plus start-to-ready components: 1.101 seconds; clean stop: 0.595
  seconds, exit 0.

This old source has no `/ops/drain` and lacks candidate-era live-room, timer,
handler, fallback, and terminal-persistence gates. A correct token therefore
also receives 404 from `/ops/drain`, and its retained `active_rooms=1` cannot be
interpreted using the new contract. This proves schema/source compatibility
only. It is **not** an immutable previously deployed image and is not
operational rollback-readiness, RTO, or RPO evidence.

## Evidence inventory

Sanitized evidence is retained outside Git under
`%LOCALAPPDATA%\Temp\jjk-release-final-83de0cf-20260720-b`. Raw logs and
temporary databases are not repository content.

| Evidence | SHA-256 |
| --- | --- |
| `network-acceptance.json` | `06211564887e47663562282054f34df488fbd9165bffe86c61dc6c92904093e2` |
| `candidate-metadata.json` | `308827d4cca99e2b240f867637cf32ee8a62a1f685d7b005aea47690f4f60515` |
| `graceful-stop.json` | `dbda78904a2aa7cdfed9380740a7a45eb02fc92e8ce61313c8b326a1c120d03b` |
| `backup.json` / `backup-verify.json` | `2b3e733be37455e070c4b085229fa726c312bfc75aca1cad16d370bd1c2ce916` |
| `restore.json` | `4c06c7c7700b42f9f19f1e2245ff59adf7d127b1dd90e5b1412184ac799ff0d4` |
| `restore-smoke.json` | `aa344e5253e74733e6a8dec800a39ebcabc0afc7e990082428a07d50ec95906f` |
| `restore-stop.json` | `75a60b73580acda33f18ed8c15b092deb3b4550f1cffb0775417758336794cf0` |
| `failure-injection.json` | `7c24908daa34763522865041d0f07aef52df2ffb672610646777eac59436fbcc` |
| `crash_restart_rehearsal.json` | `f69d207929028318dd070a26b475a90cf1764fec93bb85a1f12e9aafeeab53f1` |
| `rollback-source-compat-05a6069-c9.json` | `2fc5e294d31513cb99b91eeb3a546ffbc7e0874388b2cf9963d7c808a4ba0c18` |
| `candidate.log` | `f43b9128d589a7c7a48c5792006fd74cc90285318ee394feaa710870636cce1f` |
| `restore-candidate.log` | `70f00e0e7147003c16618395869bbd210feb60ca6957734c617e34ea9ddc4160` |
| `failure-injection.log` | `64da8905173fa04e4a26cb2449b175d36c1ec8ef90df9ad50769ca0c9500fb03` |
| `crash-restart container.log` | `24cd6dd82b5e8de684102e7e5e01e9dbd2739df05aa67b421067d4afbdda4086` |
| `rollback-source-compat-05a6069-c9.log` | `06bc2555549335e2dfeef9679aea63d4378b34abeaa4c590d0d3fd3060e2126e` |

## Gates deliberately left open

- Push and pull the final image by immutable registry digest.
- Exercise real HTTPS ingress, TLS termination, WSS upgrades, load-balancer
  behavior, Secure-cookie handoff, and real browsers.
- Complete CPU/PvP/reconnect/timeout/result flows on maintained portrait sizes
  and physical devices.
- Rehearse backup/restore with populated profiles, opted-in replays,
  pending/processing settlements, and a present sidecar; verify production-host
  ACL/DACL.
- Rehearse an exact immutable previously deployed image with the modern drain
  contract, quantify rollback RTO, and approve any RPO.
- Run approved capacity/SLO and orchestrator-level failure exercises.
- Complete human accessibility, CPU/balance, audio/haptics, privacy,
  replay-retention, legal/IP, incident, moderation, support, and operations
  sign-off.

The Story Tutorial matchup signal remains a separate balance-analysis item. No
kit number changed during this release-readiness pass.
