# Production And Live Readiness Runbook

## Supported Topology

Battle v2 rooms, phase timers, resume credentials, command receipts, and CPU
continuations currently share one authoritative Python process. Production must
therefore run exactly one Gunicorn worker with several threads:

```text
load balancer / TLS
        |
one Gunicorn gthread worker
        |
Flask-SocketIO + Battle v2 authority
        |
durable SQLite volume for profiles and opted-in replays
```

`gunicorn.conf.py` fails startup when `JJK_WEB_WORKERS` is not `1`. Horizontal
scaling is not supported until room authority, timers, sessions, and idempotency
receipts move together into an external coordinator. A SocketIO message queue
alone would not make authoritative battle state multi-process safe.

## Required Production Configuration

Start from `.env.example`. At minimum:

- set `JJK_PRODUCTION=1`;
- set a stable, random `FLASK_SECRET_KEY`;
- set exact HTTPS origins in `JJK_CORS_ORIGINS`;
- mount a durable volume and point `JJK_DATABASE_PATH` at it;
- keep `JJK_WEB_WORKERS=1`;
- keep `JJK_SOCKETIO_ASYNC_MODE=threading`;
- configure a distinct `JJK_OPS_TOKEN` for protected runtime counters.

Readiness returns HTTP 503 for an ephemeral production secret, unsafe worker
count, missing CORS allowlist, or unavailable SQLite schema.

## Persistence

SQLite uses WAL mode, a busy timeout, atomic profile transactions, and replay
expiry indexes. It persists:

- First Creation completion metadata and selected starter trio;
- deterministic replay documents only when `JJK_CAPTURE_REPLAYS=1`.

Replay capture is disabled by default. Enabling it requires an approved player
notice/consent and retention policy because replay documents contain player
identifiers, names, teams, and command history. `JJK_REPLAY_RETENTION_DAYS`
controls automatic expiry.

Back up the database volume with a SQLite-aware snapshot or the online backup
API. Test restoration into a separate environment before every public release.

## Health And Operations

- `GET /healthz`: process liveness, no room/player data.
- `GET /readyz`: secret/topology/storage readiness.
- `GET /ops/runtime`: aggregate counters only; hidden as 404 unless the exact
  bearer token from `JJK_OPS_TOKEN` is supplied.

Operational counters include starts, commands, replayed commands, command
errors, rate limits, phase timeouts, archives, and lifecycle pruning. They are
process-lifetime counters, reset on restart.

`/ops/runtime` also returns an `analytics` object backed by a durable SQLite
table (`analytics_events`, same database as replays/profiles) that survives
restarts: match-level counts by `by_result_type` (`WIN`/`DRAW`/etc, matching
`BattleState.result_type`) and `by_difficulty` for CPU matches, separate
per-player `wins`/`losses`/`draws`/`no_contests` counts (one decisive PvP
match always yields exactly one win and one loss — match-level result and
per-player outcome are recorded as distinct event types so a two-human match
is never double-counted as a win for both sides), and per-mission completion
counts for First Creation. Every row has a stable `event_key`
(`match_finished:{match_id}`, `match_player_result:{match_id}:{player_id}`,
`mission_completed:{match_id}:{player_id}:{mission_id}`) enforced UNIQUE at
the database level, so concurrent emits, reconnect-triggered re-broadcasts,
and process restarts can never create duplicate rows — the in-memory
`analytics_recorded_matches` guard is just a fast-path, not the source of
truth. Writes are best-effort (wrapped in try/except, counted under
`analytics_write_errors` on failure) so a storage hiccup never breaks a
battle in progress.

Match-finished analytics are recorded at the authoritative terminal state
transition (`BattleV2Manager._finish_match`, via an `on_match_finished` hook
the manager invokes exactly once per match), not as a side effect of
broadcasting a viewer update — a repeated or delayed broadcast can no longer
be the thing that creates or skips a business event. Mission-completed
analytics are recorded at the point a mission's completion is durably merged
into the player's profile (`merge_first_creation_progress`), for the same
reason. `analytics_summary()` aggregates entirely in SQL (`GROUP BY` over
typed `result_type`/`cpu_difficulty`/`outcome`/`mission_id` columns mirrored
off each event's payload at write time) instead of loading and JSON-decoding
every row in Python, so it stays cheap as the table grows.

Finished rooms, inactive rooms, waiting lobbies, expired replay rows, and stale
rate-limit keys are pruned on bounded socket activity. The defaults are 15
minutes for finished rooms/lobbies and two hours for inactive active rooms.

## Security Boundary

The web app applies restrictive frame, MIME, referrer, permission, and content
security headers. Production cookies are Secure, HttpOnly, and SameSite=Lax.
HTTP request bodies are capped. Socket payloads retain the existing event rate
limits and server-side sanitization/validation.

Terminate TLS before the app and forward WebSocket upgrades. Never expose the
debug reset/state routes; they remain 404 unless `JJK_DEBUG=1`.

## Deploy And Rollback

1. Back up the SQLite volume.
2. Build the container and start one candidate instance.
3. Require `/readyz` HTTP 200.
4. Run one CPU match and one two-browser private-room smoke test.
5. Verify reconnect, queue confirmation, authoritative timer expiry, and Result.
6. Shift traffic to the candidate.
7. Watch command errors, phase timeouts, rate limits, and room counts.

Rollback uses the prior image against a restored or schema-compatible database
snapshot. Schema version 1 is additive and compatible with an empty database.

## External Launch Gates

This repository cannot close these gates by code alone:

- legal/IP and commercial review;
- privacy notice and replay-consent decision;
- physical iOS and Android device matrix;
- accessibility review with assistive technology;
- human balance sessions across the 19-starter roster;
- capacity/load test and failure-injection exercise;
- support, moderation, incident ownership, and public status communication;
- approved art/audio licensing and final asset production.

Until those gates are signed off, this build is an internal/closed-alpha
candidate, not an unrestricted public launch.
