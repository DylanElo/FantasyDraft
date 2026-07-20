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
count, non-threading Socket.IO mode, missing/distinctness failure for the ops
token, enabled production debug mode, missing CORS allowlist, or unavailable
SQLite schema. Literal `.env.example` secret/token/origin placeholders are
also rejected; the checked-in template is not a deployable configuration.

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

Back up the database with the repository's SQLite-aware bundle tool. It uses
`sqlite3.Connection.backup()`, verifies `PRAGMA integrity_check`, accepts the
supported source schemas 4, 5, and 6, records privacy-safe aggregate row counts
and SHA-256 hashes, and separately preserves the settlement sidecar with
restrictive permissions:

```bash
# First stop/quiesce the only authoritative worker. Source must already exist;
# output must not exist.
python -m tools.runtime_backup backup \
  --database /durable/jjk_arena.sqlite3 \
  --output /backups/release-YYYYMMDD \
  --quiesced

python -m tools.runtime_backup verify \
  --backup /backups/release-YYYYMMDD

# Restore only into a new, separate candidate path. Existing destinations are
# deliberately refused.
python -m tools.runtime_backup restore \
  --backup /backups/release-YYYYMMDD \
  --database /candidate-data/jjk_arena.sqlite3
```

The SQLite backup API does **not** include the settlement sidecar. The tool
therefore requires the single worker to be quiesced and bundles any
`*.mission-settlement-fallback.jsonl` file separately. Restore the database
and sidecar together into an isolated environment before every public release.
Restore publishes `<database>-restore-complete.json` last, after the database
and optional sidecar have been installed and verified. A candidate must not
start from a restored path unless that completion marker is present; never
hand-create or copy a marker independently of its restored bundle. A schema-4
or schema-5 restore is migrated additively to schema 6 by the candidate, and
`/readyz` must report schema 6 before acceptance begins.

On POSIX, keep the bundle directory operator-only (`0700`) and its database,
manifest, sidecar, and completion marker private (`0600`). On Windows, `chmod`
does not establish a restrictive DACL: the backup and restore parent
directories must have an operator-only ACL/DACL before running the tool. The
sidecar contains player identifiers and mission progress, so apply the same
access, retention, and incident controls as the profile database. Never use the
ignored developer `data/jjk_arena.sqlite3` as rehearsal input.

## Health And Operations

- `GET /healthz`: process liveness, no room/player data.
- `GET /readyz`: secret/topology/storage readiness.
- `GET /ops/runtime`: aggregate counters only; hidden as 404 unless the exact
  bearer token from `JJK_OPS_TOKEN` is supplied.
- `POST /ops/drain` with JSON `{"draining": true}` or
  `{"draining": false}`: protected by the same bearer token and hidden as 404
  from missing or incorrect credentials.

For drain decisions, `active_rooms` remains the backward-compatible total of
all retained room objects, while `live_rooms` excludes terminal rooms and
`finished_rooms` counts retained terminal rooms. `scheduler_tasks` is the
number of rooms with an armed authoritative wakeup.
`terminal_persistence_pending_rooms` counts retained terminal rooms whose
analytics, First Creation mission snapshot, or opted-in replay has not reached
its durable handoff marker. It remains nonzero before, during, and after a
failed terminal callback, including the post-command replay-finalization
window.
`battle_command_handlers_inflight` remains nonzero through authoritative
command execution and result emission. `scheduler_callbacks_inflight` remains
nonzero after a deadline leaves the schedule while its expire, result, and
re-arm callbacks are still running. `scheduler_callback_errors_total` is a
process-lifetime incident signal; investigate any increase before release.
`mission_settlement_fallback_pending` counts durable sidecar records not yet
restored into the SQLite settlement outbox; malformed retained lines also count.

Enabling drain atomically sets `accepting_new_matches=false`, rejects new CPU
starts and PvP joins, rejects rematches that would create a new room, and
cancels and notifies every waiting lobby. Active-match commands and authenticated
resume/reconnect remain available so existing matches can finish. The drain
request also makes one bounded attempt to reconstruct missing terminal mission
snapshots, flush mission settlements, and flush the analytics outbox. Repeat
the protected `{"draining": true}` request after repairing a transient storage
failure if another bounded pass is needed. `GET /readyz` continues to describe
configuration and storage readiness while drained; use
`accepting_new_matches` from `/ops/runtime` as the drain authority.

A safe planned stop requires one post-drain `/ops/runtime` response with all of
the following conditions:

- `accepting_new_matches=false`;
- `live_rooms=0`, `waiting_lobbies=0`, `scheduler_tasks=0`,
  `scheduler_callbacks_inflight=0`, and
  `battle_command_handlers_inflight=0`;
- `terminal_persistence_pending_rooms=0`;
- `mission_snapshot_retry_rooms=0`;
- `mission_settlement_fallback_pending=0`;
- `analytics_outbox_size=0`;
- mission settlement counts `pending=0`, `processing=0`, and
  `failed_retryable=0`.

The clean-candidate acceptance rehearsal additionally requires the cumulative
`scheduler_callback_errors_total=0`. A nonzero historical value in a running
deployment is an incident to investigate, not unfinished drain work by itself.

Finished rooms may remain in memory until the process stops. A durable
`dead_letter` settlement is not in-memory drain work, but it still requires an
operator incident decision before release; do not silently treat it as a
successful player credit.

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

Terminate TLS before the app and forward WebSocket upgrades. The load balancer
must set HSTS because this application does not blindly trust forwarded-proto
headers. Never expose the debug reset/state routes: they remain 404 in
production even if `JJK_DEBUG=1`, and that misconfiguration makes readiness
fail. Inject `JJK_OPS_TOKEN` through the deployment platform's protected secret
environment and never place its value in command arguments, shell history,
logs, acceptance artifacts, or an unprotected curl configuration. If an
operator uses a curl config for `/ops/drain`, keep that file outside the
repository with operator-only permissions or ACL/DACL.

## Deploy And Rollback

Battle rooms, resume-token hashes, timers, and command receipts are process
memory. A worker restart cannot preserve an active match. One worker means one
global authority, not one worker in each overlapping old/candidate instance.
Do not use Gunicorn HUP/graceful worker reload or a rolling deploy for this
topology.

1. Build from a clean, recorded commit/tree and record the immutable candidate
   image digest. Also record the exact previously deployed image digest needed
   for rollback.
2. Restore the latest production backup into an **isolated** candidate volume;
   never point the candidate and live authority at the same database/sidecar.
   Require the restore-completion marker and the platform-specific private
   permissions described under **Persistence**.
3. Start one candidate instance and require `/healthz` and `/readyz` HTTP 200.
   Confirm `mode=production`, `topology=single-authority-worker`, an empty
   `issues` list, healthy storage, and schema 6.
4. Run the production-shaped contract against that instance. Inject
   `JJK_OPS_TOKEN` into the acceptance process from the protected environment;
   the tool deliberately has no token command-line option. Pass exactly one
   Origin, not the comma-separated `JJK_CORS_ORIGINS` allowlist:

   ```bash
   python -m tools.network_acceptance \
     --base-url http://127.0.0.1:5000 \
     --socket-origin "https://candidate.example.com" \
     --planning-seconds 60 \
     --queue-review-seconds 60 \
     --load-requests 1000 \
     --load-concurrency 32
   ```

   External mode validates the production/schema/topology/readiness contract,
   drives CPU and two-client PvP server flows, checks token rotation/replay
   rejection and Planning/Queue Review expiry, verifies protected/debug
   surfaces, enables drain, and fails unless every safe-stop counter is exactly
   zero. The optional 1,000-request health/readiness ramp is endpoint
   correctness evidence, not a capacity certification.

   With the loopback `http://` base URL shown above, Socket.IO uses direct
   `ws://` through Gunicorn and merely injects the supplied HTTPS Origin. That
   does **not** test TLS termination, `wss://`, load-balancer upgrades,
   Secure-cookie handoff, or browser Origin behavior. Repeat the contract
   separately against the actual `https://` candidate ingress with its exact
   HTTPS Origin, and retain real-browser QA as a separate launch gate.
5. Enable drain on the live authority with authenticated
   `POST /ops/drain` and `{"draining": true}`. Use the deployment platform's
   secret-aware HTTP client or a protected curl config containing the
   Authorization header; do not expand the bearer token onto the command line:

   ```bash
   curl --fail --silent --show-error \
     --config /run/secrets/jjk-ops-curl.conf \
     --header 'Content-Type: application/json' \
     --request POST \
     --data '{"draining":true}' \
     https://live.example.com/ops/drain
   ```

   Verify the response reports `accepting_new_matches=false` and successful
   bounded maintenance. Existing matches may continue and reconnect while new
   CPU starts, PvP joins, and newly created rematches are rejected. Poll
   `/ops/runtime` until every condition under **Health And Operations** is
   satisfied. Do not cut over with a live room, waiting lobby, retry room,
   timer, transient settlement, or analytics outbox entry.
6. Stop the old worker gracefully. Gunicorn's `graceful_timeout` is 30 seconds,
   so the container/orchestrator termination grace must be **longer than 30
   seconds** before any forced kill. Record the elapsed drain/stop time and
   clean exit result. Create and verify the database-plus-sidecar backup only
   after the sole authority has stopped.
7. Keep public routing closed, then start the exact candidate digest against
   the live durable volume. There must never be two authorities accepting match
   traffic. Because the in-memory drain flag starts in accepting mode in a new
   process, enable drain on the new candidate before exposing it, require
   readiness and the exact zero snapshot again, then send protected
   `{"draining": false}` and atomically reopen traffic.
8. Watch command errors, phase timeouts, rate limits, settlement state, outbox
   size, mission snapshot retries, and live-room counts.

A drained restart must preserve profiles, opted-in replays, analytics, and
settlement rows. An unexpected process/container crash preserves committed
SQLite/sidecar data but abandons active matches and invalidates their resume
tokens; treat that as a match interruption and incident until room authority is
externalized.

Rollback requires the exact previously deployed image digest recorded before
cutover. Before release, run that immutable image against a separately restored
copy of the candidate-migrated database and measure recovery time. A source
rebuild from a commit or floating dependency ranges is only compatibility
evidence, not a completed rollback rehearsal.

For an actual rollback, drain the candidate to the same exact zero gates, stop
it, and create a verified candidate-era database-plus-sidecar backup before
changing storage. Prefer starting the prior digest against the proven
schema-compatible candidate-era database so post-cutover writes are retained.
If compatibility forces restoration of the pre-deploy bundle, that operation
discards durable writes made after cutover: quantify the loss window, obtain
explicit RPO/data-loss approval, restore the database and sidecar to a **new**
path or volume, require its completion marker, and switch storage atomically.
Retain the candidate-era volume and backup for reconciliation; never overwrite
or delete them as part of rollback. Record both achieved RTO and RPO rather
than treating image startup alone as rollback closure.

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
