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

`Dockerfile` pins its base image by digest (not just the mutable `3.11-slim`
tag) and installs `requirements.txt` under `constraints.txt`, which locks
every resolved (including transitive) package version so the image is
reproducible instead of picking up whatever is newest-compatible on build
day. Regenerate `constraints.txt` deliberately in a clean virtualenv (see the
header comment in that file); re-resolve and re-validate the base-image
digest the same way, with `docker buildx imagetools inspect python:3.11-slim`,
rather than letting either drift silently. The container `HEALTHCHECK`
resolves the listening port the same way `gunicorn.conf.py` binds it --
`PORT`, then `JJK_PORT`, then `5000` -- so a deploy that only sets `JJK_PORT`
still gets probed on the port the app actually listens on.

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
- First Creation terminal mission snapshots and settlement state;
- idempotent match/mission analytics events;
- deterministic replay documents only when `JJK_CAPTURE_REPLAYS=1`.

Runtime schema 6 migrates the deployed schema 4 and intermediate schema 5
additively. Schema 4 gains the settlement outbox; existing schema-5 settlement
rows gain the finish timestamp and claim-lease columns without losing their
payload or retry state. Each terminal snapshot carries a stable match-finish
timestamp so a delayed older retry may correct `mission_first_completed_at`
without replacing the starter team chosen by a newer match. Production
settlement commits the profile update, new mission analytics rows, and the
outbox's `settled` transition in one SQLite transaction.

Settlement rows move through `pending`, `processing`, `failed_retryable`,
`settled`, or `dead_letter`. Handler and storage failures remain retryable with
exponential backoff capped at five minutes; only structurally malformed
snapshots dead-letter automatically. After repairing a malformed snapshot, an
operator may explicitly redrive its exact key with
`SQLiteRuntimeStore.redrive_mission_settlement(match_id, player_id)`. Settled
audit rows expire after 30 days; dead letters remain until repaired/redriven.

Claims use expiring leases and are **at least once**, not exactly once. A worker
that exceeds its lease can overlap a replacement worker, so generic handlers
must be idempotent. The production profile path additionally verifies the live
claim inside its atomic SQLite transaction, and only token-guarded row updates
are counted as successful settlement. Startup, periodic maintenance, and a
player's relevant profile read drain pending credit; profile reads force one
targeted retry even if no later socket event arrives.

If the initial SQLite enqueue fails, the single authoritative worker appends an
fsync'd JSONL sidecar beside the database. The sidecar is created with mode
`0600` where supported, uses an in-process lock, and is deliberately rejected
when `JJK_WEB_WORKERS` is not `1`; it is not a multi-process queue. Restore does
not rewrite an unchanged sidecar during a continuing outage. Partial restores
fsync the replacement file before atomic replace and sync the directory where
the platform supports it.

If both the database and sidecar are briefly unavailable at match finish, the
live finished room is marked for prompt snapshot reconstruction. A subsequent
finished-state update, relevant profile read, or bounded maintenance pass
retries the missing per-player rows; cleanup refuses to remove the room until
all human snapshots are durable. Durable `(match_id, player_id)` keys and the
atomic profile merge make repeated reconstruction and broadcasts idempotent.

Replay capture is disabled by default. Enabling it requires an approved player
notice/consent and retention policy because replay documents contain player
identifiers, names, teams, and command history. `JJK_REPLAY_RETENTION_DAYS`
controls automatic expiry.

Back up the database with a SQLite-aware snapshot or the online backup API.
That API does **not** include the settlement sidecar: quiesce/stop the single
worker and separately copy any
`*.mission-settlement-fallback.jsonl` file from the durable volume, preserving
its restrictive permissions. Restore the database and sidecar together into a
separate environment before every public release. The sidecar contains player
identifiers and mission progress, so apply the same access, retention, and
incident controls as the profile database.

## Health And Operations

- `GET /healthz`: process liveness, no room/player data.
- `GET /readyz`: secret/topology/storage readiness.
- `GET /ops/runtime`: aggregate counters only; hidden as 404 unless the exact
  bearer token from `JJK_OPS_TOKEN` is supplied.
- `GET /ops/safe_stop`: the drain-gate go/no-go below; same token gate.

Operational counters include starts, commands, replayed commands, command
errors, rate limits, phase timeouts, archives, and lifecycle pruning. They are
process-lifetime counters, reset on restart.

Settlement operations expose aggregate status counts plus process-lifetime
claimed/dead-letter totals; raw snapshots, claim tokens, and errors are never
returned by `/ops/runtime`. Alert on any `dead_letter` row and on sustained
`failed_retryable` growth. A transient row that later settles disappears from
the retryable count, so operational incident notes should preserve the relevant
process counters/logs across restarts.

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

A write that fails at the database layer itself (locked file, disk full, a
transient I/O error — not a duplicate `event_key`, which `INSERT OR IGNORE`
already handles for free) is queued in `SQLiteRuntimeStore`'s in-memory
outbox instead of being lost. `prune_stale_runtime`'s existing periodic
maintenance pass (piggybacked on ordinary socket traffic via
`maybe_prune_runtime`, at most once a minute) calls `flush_outbox()`, which
retries every queued event and re-queues only the ones that fail again — a
transient outage self-heals within roughly a minute of recovering, with no
separate retry thread. The outbox is capped at `SQLiteRuntimeStore.MAX_OUTBOX_SIZE`
(500) events; a sustained outage past that drops the oldest queued event
and counts it in `outbox_dropped_total`, rather than growing unbounded.
`/ops/runtime` exposes `analytics_outbox_size` and
`analytics_outbox_dropped_total` — aggregate counts only, never the queued
event payloads themselves.

**Retention.** `analytics_events` rows older than `JJK_ANALYTICS_RETENTION_DAYS`
(default 90) are deleted by the same periodic maintenance pass
(`prune_old_analytics_events`), keeping `analytics_summary()`'s SQL scans
cheap indefinitely instead of growing for the life of a deployment. This is
retention (deletion), not a rollup — no daily/weekly aggregate table exists.
If historical aggregates beyond the retention window are ever needed, build
a rollup table and populate it *before* extending or removing this pruning,
not after.

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

Mission analytics represent the match that first **durably introduced** a
completion into the profile. If a chronologically older match settles later,
the profile's first-completion timestamp is corrected to that older finish,
but the existing immutable analytics event is not re-attributed. This keeps
the aggregate mission-completion count exactly one while making the distinction
between chronological completion time and durable event attribution explicit.

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

## Safe-Stop Drain Gate

Because Battle v2 room state, timers, resume sessions, and idempotency
receipts all live in the one authoritative worker, stopping or replacing it
is not always safe the instant traffic is shifted away. `GET /ops/safe_stop`
(`jjk_arena/battle_v2/safe_stop.py:evaluate_safe_stop`) returns an explicit
go/no-go instead of leaving that judgment to "traffic looks quiet":

```json
{"safe_to_stop": true, "blockers": [], "warnings": []}
```

HTTP 200 means `blockers` is empty; HTTP 503 means at least one blocker is
still open. The gate checks three independent conditions:

- **`analytics_outbox_dropped_total` must be exactly zero.** The analytics
  outbox is in-memory only; a nonzero count means events were *already*
  silently discarded, and stopping now would make that loss permanent. This
  always blocks.
- **`mission_settlements.dead_letter` is never a blocker by itself.**
  Dead-lettered rows are durable in SQLite and explicitly
  operator-redrivable (`SQLiteRuntimeStore.redrive_mission_settlement`), so
  stopping the process does not lose them. A nonzero count is still always
  surfaced as an explicit `warnings` entry -- it must never be silently
  passed over -- but it does not, by itself, prevent a stop.
- **In-flight command handlers and scheduler callbacks must sum to exactly
  zero across every room.** `BattleV2Manager.in_flight_command_total()` and
  `PhaseTimerScheduler.in_flight_total()` aggregate per-room counters
  (`in_flight_commands_for_room` / `in_flight_count_for_room`) so that
  normal cleanup of one idle/finished room is never blocked by unrelated
  in-flight work in a different active match; only the whole-process
  stop decision needs the aggregate. A nonzero aggregate blocks, because
  stopping mid-command would abandon a partially applied transaction
  instead of letting it finish and commit.

## Deploy And Rollback

1. Back up the SQLite volume.
2. Build the container and start one candidate instance.
3. Require `/readyz` HTTP 200.
4. Run one CPU match and one two-browser private-room smoke test.
5. Verify reconnect, queue confirmation, authoritative timer expiry, and Result.
6. Shift traffic to the candidate.
7. Watch command errors, phase timeouts, rate limits, and room counts.
8. Before stopping the outgoing instance, require `/ops/safe_stop` HTTP 200
   (`safe_to_stop: true`). Investigate and resolve any `blockers` first;
   acknowledge/redrive any `warnings` (e.g. dead-lettered settlements) as a
   follow-up, since they do not block the stop.

Rollback uses the prior image against a restored or schema-compatible database
snapshot. Runtime schema 6 is additive from deployed schema 4 and intermediate
schema 5, but an older image must still be tested against a restored copy
before rollback; also restore any pending settlement sidecar alongside the
database.

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
