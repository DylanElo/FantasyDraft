# FantasyDraft Session History

This file records recovered project passes and the current session state so future work can continue from the real repo history instead of scattered chat memory.

After every meaningful pass, add a short dated entry with:

- What changed
- What was verified
- What remains or needs caution
- Relevant commits or pushed state

## 2026-07-09 - Line-ending policy and local verification

Source: local repo check after external zip inspection summary.

What changed:

- Added `.gitattributes` to set a repository line-ending policy.
- Kept normal text files normalized to LF in Git.
- Kept Windows script files (`*.bat`, `*.ps1`) as CRLF on checkout.
- Marked common image formats as binary.

Verification:

- Current working tree started clean on `main`.
- `git diff --stat` and `git diff --ignore-space-at-eol --stat` were empty before the policy change.
- `git ls-files --eol` showed mixed working-tree line endings, confirming the need for an explicit policy.
- `git add --renormalize .` did not produce a mass content rewrite.
- `python -m pytest -q` -> `110 passed, 1 skipped`.
- `node --check web/static/phaser-shell.js`.

Caution / next work:

- This prevents future line-ending churn, but it does not redesign remaining mobile surfaces.
- Next UI work should continue with lobby/draft mobile redesign, stronger battlefield art, attack animation language, and clearer target/queue motion.

Commit:

- `Add repository line ending policy`

Pushed state:

- `main` was pushed to `origin/main` after the pass.

## 2026-07-08 - Mobile combat HUD rebuild

Source: live browser/code pass.

What changed:

- Rebuilt the Phaser combat scene from dense stacked cards into a mobile-first battle HUD.
- Added a compact top domain/turn/energy bar.
- Reworked fighters into large circular touch tokens with portraits, HP bars, status pips, ready/target/queue rings, and larger hit areas.
- Added a central battlefield lane for prompts, replay snippets, and queue chips.
- Rebuilt the bottom command deck with selected-fighter portrait, technique buttons, cost pips, confirm/cancel/end controls, and clearer disabled-state copy.
- Removed generic decorative background circles from the Phaser shell background.
- Fixed a live queue-badge bug where a queued ally action could show `Q1` on the enemy token with the same slot number.
- Updated public-surface tests to assert the new Phaser HUD markers instead of old prototype copy.

Verification:

- `node --check web/static/phaser-shell.js`.
- `python -m pytest -q` -> `110 passed, 1 skipped`.
- `git diff --check`.
- Live browser mobile viewport smoke at `390x844` loaded lobby, draft, combat, and queued-action states with no browser console errors.

Caution / next work:

- Combat now has a real mobile game HUD baseline, but it still needs deeper art direction, stronger attack animation language, better draft/lobby mobile treatment, and richer target/queue motion.
- The current central battlefield intentionally leaves space for future animation and event playback; it should not stay visually empty in the final game pass.

Commit:

- `Rebuild Phaser combat as mobile HUD`

Pushed state:

- `main` was pushed to `origin/main` after the pass.

## 2026-07-08 - V2-only cleanup and compact Phaser UI pass

Source: current repo state and live work session.

What changed:

- Replaced the stale `CLAUDE.md` with current Battle v2 project context.
- Removed legacy bot/v1 runtime surfaces and old static Pages/demo output.
- Moved the maintained Battle v2 package to `jjk_arena/battle_v2`.
- Rebuilt `web/app.py` as a v2-only Flask-SocketIO bridge.
- Updated docs and tests to match the v2-only package layout.
- Tightened compact Phaser layout for short screens: smaller draft pages, adjusted navigation, denser combat skill cards, and less crowded effect text.

Verification:

- `python -m pytest -q` -> `110 passed, 1 skipped`.
- `node --check web/static/phaser-shell.js`.
- Local Flask smoke: `GET /` returned HTTP 200.
- Live SocketIO smoke covered CPU practice startup/update and PvP wait/cancel flow.
- Browser smoke confirmed the Phaser lobby, draft, and combat screens loaded.

Caution / next work:

- Phaser UI is functional and less crowded, but the combat screen still needs a dedicated UX refinement pass for responsive spacing, target affordances, queue review clarity, and animation/readability polish.

Commits:

- `d86633d` - `Remove legacy bot code and keep Battle v2 only`
- `6213da3` - `Tighten compact Phaser battle layout`

Pushed state:

- `main` was pushed to `origin/main` and was clean after the pass.

## 2026-07-07 - Push current implementation and keep only main

Source: recovered Codex memory summary.

What changed:

- Committed the staged Phaser mobile arena / first-creation implementation on `main`.
- Pushed `main` to GitHub.
- Removed non-`main` branches locally and remotely as requested.

Verification:

- Final remote branch verification used `git ls-remote --heads origin`.
- Final local branch verification used `git branch --format='%(refname:short)'`.
- End state was only `main` locally and only `refs/heads/main` remotely.

Caution / next work:

- `gh-pages` reappeared once after pruning, likely from deployment automation. For future branch cleanup, delete it again if needed and verify remote heads directly instead of trusting prune output alone.

Commit:

- `ee31454` - `Rewrite v2 client as Phaser mobile arena`

## 2026-07-02 / 2026-07-03 - Repo identity cleanup and first Phaser battle renderer

Source: recovered Codex memory summary.

What changed:

- Removed the old Telegram bot identity at the file/module/runtime level.
- Renamed `jjk_bot` to `jjk_arena`.
- Renamed `main.py` to `run_server.py`.
- Updated imports across `web/`, tests, scripts, and docs.
- Updated `Procfile`, `Dockerfile`, `start_server.bat`, and README to launch `run_server.py`.
- Added `.pytest_cache/` to `.gitignore` after Windows/OneDrive access-denied cleanup issues.
- Added a vendored Phaser presentation layer for the battle screen.
- Mounted the Phaser canvas in the Flask template and pushed battle state into Phaser from the existing DOM/SocketIO client.
- Added battle layout CSS for full-width arena mode versus command-sheet mode.

Verification:

- `python -m pytest -q` -> `44 passed`.
- `node --check web/static/app.js`.
- `node --check web/static/phaser-battle.js`.
- Browser smoke confirmed battle screen load, Phaser canvas mount, skill sheet open, target mode toggle, and arena width restoration after cancel.

Caution / next work:

- This pass was intentionally partial: Phaser was introduced as a presentation layer while DOM/SocketIO still owned interaction and Python stayed authoritative.
- Layout issues appeared around the command sheet overlapping the arena; the working direction was CSS grid/stretch fixes and large-screen spacing, not Phaser state rewrites.
- Browser validation was more reliable through layout rects/screenshots than canvas pixel probing.

Superseded by later work:

- The July 8 pass removed remaining legacy/v1 surfaces and made Battle v2 the only maintained path.

## 2026-07-12 - Persistent Codex project memory

What changed:

- Added root `AGENTS.md` with cross-project product, gameplay, roster, UI/UX, scope, and verification rules.
- Added `jjk_arena/battle_v2/AGENTS.md` with authoritative engine invariants and high-risk starter regressions.
- Added `web/static/phaser/AGENTS.md` with the mobile redesign constitution and client/server parity rules.
- Added `docs/CODEX_PROJECT_MEMORY.md` as the canonical durable record of decisions agreed across design sessions.

Purpose:

- Ensure Codex reloads the project’s agreed constraints on every task instead of relying on chat history.
- Reduce design drift, repeated rediscovery, and accidental scope expansion.

Verification:

- Instruction file byte sizes were checked against Codex’s default combined project-instruction limit.
- The repository instruction chain can be verified with `codex --ask-for-approval never "Summarize the current instructions."` from the repository root and from the relevant nested directory.

Caution:

- `AGENTS.md` is the enforceable concise layer; `docs/CODEX_PROJECT_MEMORY.md` is the detailed canonical memory.
- Open decisions in the memory document still require explicit user approval rather than autonomous resolution.

## 2026-07-12 - Battle v2 authoritative validation hardening

What changed:

- Bound every live caster to declared base skill slots and resolved active replacements only from those slots.
- Rejected foreign/replacement-only skill IDs, empty or duplicate action IDs, incomplete/duplicate queue order, and duplicate or misordered primary/secondary targets.
- Preserved secondary and alternate redirect fields through the real SocketIO cleaner.
- Added explicit `Melee` and `Ranged` tags; melee counters no longer treat all Physical skills as melee.
- Deferred explicitly marked one-shot damage-buff consumption until the complete skill finishes, preserved persistent damage bonuses, corrected helpful/hostile status families, and emitted configured invisible-expiry reveals.
- Added an isolated server-authoritative Planning/Queue Review timer policy module and manager timeout transitions.

Verification:

- Full pytest, Python compilation, and `git diff --check` passed in the clean PR worktree.
- Socket integration coverage traverses Phaser-style payloads through the cleaner, manager, and resolver for Todo and Junpei.

Caution / next work:

- Timer deadlines are authoritative and serialized; production scheduling may poll `expire_phase_if_needed` or invoke it through normal manager/socket entry points.
- No Phaser layout, roster, progression, damage-family aggregation, or anti-domain behavior changed.

## 2026-07-12 - Battle v2 command versioning and idempotency

What changed:

- Added serialized authoritative `state_revision` values for Battle v2 state.
- Required a non-negative revision and non-empty per-player `client_action_nonce` on every post-start mutating SocketIO command.
- Added a bounded manager nonce ledger so identical retries do not execute twice and conflicting nonce reuse is rejected.
- Added stale-intent rejection and transactional rollback of battle state, progression state, RNG state, queues, energy, cooldowns, and logs on command failure.
- Updated Phaser command payloads without changing scenes, layout, interaction flow, or gameplay semantics.
- Made timeout and CPU continuations advance the authoritative revision.

Verification:

- Manager regressions cover successful revision advance, identical retry, stale revision, nonce conflict, and atomic invalid-command rollback.
- Socket integration covers missing metadata, retry idempotency, and stale-command rejection.
- Full pytest, Python compilation, Phaser JavaScript syntax, and `git diff --check` passed in the focused branch.

Caution / next work:

- Nonce receipts are intentionally bounded and in-memory with the room; durable reconnect/resume and multi-process persistence remain separate networking work.
- The client emits unique nonces but does not yet implement an automatic retransmission policy.
- No timer scheduler, reconnect flow, roster, progression, balance, or visual layout changed.

## 2026-07-12 - Scheduled authoritative Battle v2 phase timers

What changed:

- Switched internal Planning and Queue Review deadlines from wall time to a monotonic server clock.
- Added an isolated stale-safe scheduler that actively wakes idle rooms, ignores superseded deadlines, and supports cancellation on room cleanup.
- Serialized whole `phase_seconds_remaining` values for display while keeping expiration decisions server-authoritative.
- Added per-room reentrant locking between player commands and background timeout transitions.
- Broadcast viewer-specific SocketIO state after background expiration and continued CPU rooms automatically before returning control to the player.
- Cleared finished-match deadlines and advanced command revisions for every timeout/CPU continuation.

Verification:

- Deterministic scheduler tests cover duplicate arming, cancellation, and stale wakeups.
- Manager tests cover Planning timeout and valid Queue Review resolution exactly once.
- Real SocketIO integration proves an idle Planning timeout broadcasts and completes the CPU response without a client command.
- Full pytest, Python compilation, and `git diff --check` passed in the focused branch.

Caution / next work:

- Timer state remains process-local with its room; durable multi-process room ownership belongs with reconnect/session persistence.
- Timeout durations and timeout policy were not changed.
- No reconnect flow, roster, progression, balance, Phaser layout, or visual behavior changed.

## 2026-07-12 - Secure Battle v2 reconnect and resume

What changed:

- Added opaque room/player-scoped resume credentials stored server-side only as SHA-256 hashes.
- Issued credentials through each player's private socket room and rotated them after every successful resume.
- Added authenticated `battle_v2_resume` reattachment for a new browser session, including private room membership and a fresh viewer-specific state snapshot.
- Restored authoritative phase, revision, pending Queue Review actions, and remaining timer state without leaking opponent invisible statuses or queues.
- Persisted resume credentials in Phaser local storage without changing any scene or layout.
- Revoked all room credentials during authoritative room cleanup.

Verification:

- Registry tests cover hashing, room/player scope, rotation, replay rejection, and room revocation.
- Real SocketIO integration covers disconnect, new-session resume, Queue Review restoration, deadline restoration, hidden-state privacy, and rotated-token rejection.
- Full pytest, Python compilation, Phaser JavaScript syntax, and `git diff --check` passed in the focused branch.

Caution / next work:

- Resume state is process-local; shared persistence and room affinity are required before horizontal scaling.
- No grace-period expiry, automatic surrender, ranked penalty, or disconnect winner policy was chosen because that remains a product decision gate.
- No combat rules, roster, progression, balance, Phaser layout, or visual behavior changed.

## 2026-07-12 - Deterministic Battle v2 golden replays

What changed:

- Added a versioned JSON replay schema containing rules version, roster mode, seed, initial teams, ordered commands, nonces, revisions, and expected hashes.
- Added canonical SHA-256 hashing of complete authoritative public/private battle state, excluding only the process-local monotonic deadline.
- Added replay recording and verification helpers that execute through the normal manager command path with a frozen clock.
- Added a CLI verifier and a checked-in First Creation two-turn golden replay.

Verification:

- Tests prove identical hashes across independent runs, per-command tamper detection, checked-in fixture stability, and CLI verification.
- Full pytest, Python compilation, replay CLI verification, and `git diff --check` passed in the focused branch.

Caution / next work:

- Live production matches are not automatically persisted; capture, retention, privacy, and storage belong to telemetry/production work.
- The rules version is intentionally explicit and must change when an incompatible authoritative rule migration occurs.
- No resolver behavior, RNG behavior, combat rules, networking, roster, progression, balance, Phaser layout, or visual behavior changed.

## 2026-07-12 - Headless Battle v2 simulation diagnostics

What changed:

- Added deterministic First Creation CPU-vs-CPU matches using the normal authoritative manager, legal-action generator, resolver, energy, status, and winner paths.
- Added seeded batch execution and privacy-safe JSON summaries for outcomes, turns, team composition, living fighters, HP, actions, damage/healing received, and final state hash.
- Added an explicit turn-cap outcome rather than inventing a draw or winner policy.
- Added a CLI suitable for reproducible local balance/softlock diagnostics.

Verification:

- Tests cover independent determinism, privacy-safe schema, explicit turn caps, batch accounting, and CLI JSON output.
- Full pytest, Python compilation, sample simulation CLI, and `git diff --check` passed in the focused branch.

Caution / next work:

- Results describe the current heuristic AI and are not sufficient evidence for balance changes without human playtesting.
- No result persistence/upload, live player telemetry, dashboard, AI tuning, balance change, combat rule, roster, progression, Phaser layout, or visual behavior was added.

## 2026-07-12 - Orientation-balanced offline matchup reports

What changed:

- Added mirrored team-order matchup batches over deterministic headless simulations.
- Added matchup wins, average turns, turn-cap rate, and first-seat win rate.
- Added per-character appearances, wins, descriptive rates, and Wilson 95% intervals.
- Added deterministic JSON and matchup CSV export suitable for later notebook/dashboard work.

Verification:

- Tests cover mirrored accounting, deterministic reruns, Wilson bounds, CSV rows, and CLI JSON output.
- Full pytest, Python compilation, sample multi-preset report CLI, and `git diff --check` passed in the focused branch.

Caution / next work:

- Character rates remain confounded by preset teammates, opponents, heuristic AI, and sample size; they are not automatic balance recommendations.
- No in-game dashboard, persistence/upload, live telemetry, AI tuning, balance change, combat rule, roster, progression, Phaser layout, or visual behavior was added.

## 2026-07-12 - Chunk 1 engine and networking closure

What changed:

- Locked canonical resolver ordering across commitment, counter, reflect, frozen context, ordered effects, one-shot consumption, cleanup, and victory.
- Added a deterministic 100-case hostile-command corpus with authoritative state-hash atomicity checks and controlled error normalization.
- Added seeded CPU legal-action stress covering every one of the 19 First Creation characters.
- Added opt-in, disabled-by-default in-memory replay capture for successful player and authoritative CPU commands; rejected commands are excluded.
- Added cleanup of captured replay state with the rest of room-owned runtime data.

Verification:

- Cross-mechanic tests prove counter prevents all effects after commitment and reflect is decided before ordered effects while self-effects remain correctly scoped.
- Adversarial tests prove rejected malformed/foreign/duplicate/out-of-range commands preserve state and revision.
- Captured player/CPU transcripts verify through the deterministic replay runner.
- Full pytest, Python compilation, Phaser syntax, replay verification, and `git diff --check` passed in the focused branch.

Caution / remaining Chunk 1 policy gates:

- Fixed damage reduction, universal anti-domain behavior, disconnect outcome, draw/stalemate, and final ranked timeout values still require explicit product decisions.
- Timeout transitions are not yet represented as replay commands; durable replay retention and consent remain production work.
- Existing stacked PRs still require review and ordered merging.

## 2026-07-12 - Chunk 2 player experience and validation

What changed:

- Reworked First Creation detail presentation into an exclusive reading state and removed primary starter-name truncation from roster, trio, combat, and queue surfaces.
- Added in-combat Skill Detail with adjusted cost, target family, classes, authoritative description, and explicit availability/disabled reason; disabled cards remain inspectable.
- Added explicit primary, secondary, and alternate target labels plus local energy/Wild validation to Queue Review.
- Added explicit active-match Exit behavior that surrenders and ignores late updates from the abandoned room.
- Anchored responsive layout to canvas CSS dimensions and serialized playback cut-ins to prevent interaction-time scaling and overlapping technique banners.
- Added mobile wireframes, executable 360/390/430 layout checks, Phaser parity regressions, and screenshot evidence for seven major states at both required primary/large viewports.

Verification:

- Live Flask-SocketIO flow covered Lobby, First Creation, Character Detail, Combat, disabled/enabled Skill Detail, Queue Review, authoritative CPU turns, surrender/exit, and Results.
- Final browser console inspection returned no warnings or errors.
- Two mirrored 20-game seeded simulation batches completed; the tutorial trio won 32/40 combined, exposing a matchup/seat concern for human validation rather than an automatic balance change.
- Full pytest, Python compilation, changed-JavaScript syntax checks, and `git diff --check` are required before final commit.

Caution / remaining Chunk 2 validation:

- The in-app capture backend omitted the last safe-area row from most PNG files although the browser reported exact 390x844 and 430x932 CSS viewports.
- The all-preset balance matrix exceeded the local two-minute ceiling; bounded mirrored matchup batches completed after orphaned timeout workers were stopped.
- Human playtesting, assistive-technology review, physical iOS/Android browser passes, and broader matchup sampling remain external validation work.
- No battle number, roster, progression, mission, or server-authority rule changed in this pass.

## 2026-07-13 - Chunk 3 production and live readiness

What changed:

- Replaced default whole-file profile persistence with WAL-backed SQLite and atomic per-player update transactions while preserving the JSON path override for compatibility/tests.
- Added opt-in durable replay archival with explicit retention expiry; capture remains disabled by default pending privacy/consent approval.
- Added liveness, fail-closed readiness, protected aggregate runtime counters, production cookie/security headers, and request-size limits.
- Added bounded cleanup for finished/inactive rooms, waiting lobbies, stale rate-limit keys, and expired replay rows.
- Replaced development production commands with guarded single-authority Gunicorn gthread deployment; startup rejects unsafe worker counts.
- Added an environment template, deploy/rollback runbook, and automated/human/external release checklist.

Verification:

- Focused tests cover SQLite durability/concurrency/expiry, health/readiness/security, ops authentication, lifecycle pruning, replay archive idempotence, and worker-topology rejection.
- Full pytest passed with 289 tests and 1 opt-in visual skip; Python compilation and `git diff --check` passed.
- Declared production dependencies installed; the guarded config loaded as one gthread worker/eight threads and rejected two workers.
- The local threaded server returned HTTP 200 from `/healthz` and `/readyz` against a temporary SQLite database.
- Native Gunicorn launch was not executed on Windows because Gunicorn requires Unix `fcntl`; Docker Desktop's Linux daemon was unavailable, so the real Linux container start remains a deployment-environment check.

Caution / external launch gates:

- Active rooms remain process-local. Horizontal multi-worker scaling requires one external coordinator for room state, timers, sessions, and command receipts; a SocketIO message queue alone is insufficient.
- Replay capture requires approved consent/privacy and retention policy before enabling.
- Legal/IP/commercial approval, licensed art/audio provenance, physical-device/accessibility QA, human balance, load/soak/failure exercises, and staffed live operations remain external sign-offs.
- No roster, progression content, combat rule, balance number, Phaser layout, or visual effect changed.
## 2026-07-12 - Environment-integrated combat UI redesign

What changed:

- Rebuilt the real modular Phaser combat scene around an authored rain-darkened municipal underpass and old school courtyard rather than a near-black dashboard field.
- Replaced floating circular combatants with world-anchored rectangular dossier plates and compact HP, selected, queued, status, and legal-target treatments.
- Rebuilt the location/turn/energy HUD, tactical directive, selected-combatant command dock, technique cards, unavailable-skill dossier, target feedback, action queue rail, and Queue Review resolution sheet.
- Added an original deterministic environment generator and PNG asset, taller portrait-card texture loading, CDN typography stacks, CSP support for Google Fonts and Phaser SVG blob textures, and a live Playwright combat-state capture tool.
- Added before/after, responsive, state-suite, and machine-readable visual QA artifacts plus a detailed implementation handoff.

Verification:

- Live Phaser browser QA covered 360x800, 390x844, and 430x932 plus default, selected combatant, unavailable skill, legal targets, illegal target, queued action, and Queue Review states.
- The live QA report found zero registered controls below 44x44 and zero controls outside the tested viewports; the final console contained no warnings or errors.
- `tests/test_production_readiness.py` -> `8 passed` in an isolated process.
- Remaining test suite -> `281 passed, 1 skipped` in an isolated process.
- A monolithic run produced `288 passed, 1 skipped, 1 failed`; the same order-dependent stale-runtime failure reproduces in the untouched source archive and the affected test passes alone, so it is documented as a pre-existing test-isolation issue rather than a UI regression.
- Changed JavaScript syntax checks, Python compilation, and `git diff --check` passed.

Caution / next work:

- The environment and current portrait SVGs are production-intent placeholders, not final licensed commercial illustration.
- Google font binaries are not bundled; the runtime continues to use Google Fonts with declared fallbacks.
- Physical-device, assistive-technology, localization, reduced-motion, and final art-provenance reviews remain external validation.
- No Battle v2 rule, server contract, roster, progression, damage, targeting, cooldown, queue, or energy behavior changed.

Commit / pushed state:

- Delivered as a source archive for review; no remote push was performed in this pass.

# 2026-07-13 - Lifecycle and matchmaking integration commit

- Promoted the approved disconnect/reconnect, timeout-strike, no-progress, hard-cap, terminal-immutability, and replay-v2 policy onto the clean lifecycle base.
- Added server-generated match ids, collision rejection, one waiting/active context per player, transactional PvP pairing, idempotent rematches, lobby-code release, authorization-before-room-join, and post-reconnect resume-token rotation.
- Removed public HTTP/Socket.IO room reset surfaces and removed replay RNG seeds from public battle serialization while keeping a private integer seed in replay documents.
- Added lifecycle and adversarial regressions. Normal-order verification at this commit: 313 passed, 1 opt-in visual test skipped.
- No roster, kit, balance, mission, progression, or visual feature changed.

## 2026-07-13 - Phase 4 PvP lifecycle gap closure

Source: roadmap review named 7 open Phase 4 ("PvP fiable") lifecycle bugs. The
authoritative lobby/rematch/resume machinery from the prior entry existed only
on an unmerged local branch (`codex/lifecycle-ui-integration`, commit
`49808fc`); it was cherry-picked onto this branch (its unrelated sibling
commit, a Phaser environment/art redesign, was intentionally left out — out of
Phase 4 scope). Of the 7 named bugs, rematch idempotency, resume-token
rotate-only-on-success, and invalid-second-joiner protection were already
correct on inspection. Real gaps found and fixed:

- Disconnect-forfeit (`expire_disconnects`) was fully implemented and
  unit-tested at the manager layer but never invoked by the running server —
  the live `PhaseTimerScheduler` only watched `state.phase_deadline`, which is
  cleared while a room is paused for disconnect. Extended `_timer_deadline`/
  `_expire_timer_room` in `web/app.py` to also watch and expire
  `state.disconnect_deadlines`, so a disconnected player who never reconnects
  is now auto-forfeited by the same live background scheduler within their
  90s grace / 180s cumulative budget instead of sitting paused until the
  2-hour TTL sweep.
- `on_battle_v2_resume` reconnected the player and rotated the token but never
  updated `active_match_by_player`, so the one-live-match identity map could
  desync from a legitimately resumed session. Resume now reconciles that map
  under `lifecycle_lock` after a successful rotate.
- The "already in an active match" / "lobby code in use" / "waiting player is
  already active elsewhere" guards in `battle_v2_start_classic` and
  `battle_v2_join_pvp` treated any still-tracked match id as blocking, even
  after it reached `FINISHED`, so a private code and a player's slot were only
  actually reusable after an explicit `battle_v2_leave_pvp`/
  `battle_v2_ack_result` or the 15-minute TTL. Added an `_is_live_match`
  liveness check (room exists and phase is not finished) and used it at all
  three call sites, so reuse is now immediate on match completion.
- `remove_battle_v2_room` never purged `rematch_by_old_match`/
  `rematch_receipts`, leaking unbounded state across a long-running process;
  it now purges both on room removal.
- Deleted `jjk_arena/battle_v2/lobby_registry.py` and its isolated unit test —
  dead code never wired into `web/app.py`; the real lobby concurrency
  guarantee is `lifecycle_lock` in `web/app.py`, which was already correct.
- Added 5 new regression tests in `tests/test_battle_v2_socket.py` covering:
  rematch spam producing exactly one new match, disconnect-grace expiry
  firing through the real live scheduler (not a direct manager call),
  resume reconciling the active-match identity map, a finished match's
  private code/slot being reusable without an explicit ack, and an
  incompatible second joiner leaving the first player's lobby entry intact.

Verification: `python -m pytest -q` — 317 passed, 1 opt-in visual test
skipped (up from the 312-test baseline after removing the dead
`LobbyRegistry` test and adding 5 new ones); `python -m compileall -q
jjk_arena web/app.py`; `git diff --check`; the new socket tests were also run
3x in isolation to rule out timing flakiness in the live-scheduler test.
No roster, kit, balance, mission, progression, or visual feature changed.
This is server-authoritative lifecycle/socket logic with no new UI surface,
so no browser/manual pass was performed — the socket-layer tests are the
meaningful verification here.

## 2026-07-13 - Phase 4 exit gate: lifecycle stress test

Added `jjk_arena/battle_v2/lifecycle_stress.py`, a simulated-network stress
harness (see `docs/battle_v2_lifecycle_stress_contract.md`) that drives the
real Socket.IO handlers through randomized `clean_finish` /
`disconnect_reconnect` / `disconnect_forfeit` / `rematch_spam` /
`code_reuse_race` scenarios and checks the Phase 4 lifecycle invariants after
every match. This is the roadmap's own named exit gate for Phase 4: "1,000
simulated network matches produce 0 softlocks."

Ran two independent 1,000-match batches (`--seed 1` and `--seed 2`):
`softlock_count: 0` on both, ~40s wall time each. Added
`tests/test_battle_v2_lifecycle_stress.py` (100-match batch, ~4s) as a
permanent regression guard so this doesn't silently regress; it clears all
lobby/session/rematch global state before and after itself to avoid leaking
into other test files.

Verification: `python -m pytest -q` — 318 passed, 1 skipped;
`python -m compileall -q jjk_arena web/app.py`. Per the roadmap's own Phase 4
exit-gate checklist, this closes the last outstanding item — all 7 named
lifecycle bugs are fixed and the 1,000-match soak requirement is met. Phase 4
("PvP fiable") is now considered done at the engine/lifecycle level; balance,
AI quality, and mobile UX polish remain separate, later milestones (see
Milestone B/C in the project roadmap).

## 2026-07-13 - Locked damage reduction and anti-domain decisions

Presented options for the two `docs/CODEX_PROJECT_MEMORY.md` "open decisions"
blocking Milestone B (final DR model, final anti-domain rule); the user chose:

- Damage reduction: switch from per-hit to a Naruto-style turn-aggregate
  budget. Implemented via `CharacterState.turn_damage_reduction_used`
  (`models.py`), consumed in `apply_damage` (`effects.py`), reset every turn
  in `finish_turn` (`resolver.py`). Only `DamageType.NORMAL` is affected;
  piercing/soul/health-steal/sure-hit behavior is unchanged. No existing DR
  grant amounts (10/15/20 across ~9 sites, ~8/19 First Creation characters)
  were retuned — that is a separate balance question.
- Anti-domain: ratify the existing universal automatic conversion rule as
  intentional (no code change — it was already built and tested, just never
  marked as decided). Zero First Creation characters currently grant a real
  Domain, so this locks the rule before any character receives one rather
  than reconciling live content.

Decisions recorded in `docs/decisions/battle_v2_damage_reduction.md` and
`docs/decisions/battle_v2_anti_domain.md`; `AGENTS.md` and
`docs/CODEX_PROJECT_MEMORY.md` updated to point at them and removed from the
open-decisions list. The golden replay fixture's hashes were regenerated
(`tests/fixtures/replays/first_creation_two_turns.json`) since the new
`turn_damage_reduction_used` field changes the authoritative state hash;
`RULES_VERSION` was left unchanged, consistent with how prior engine changes
in this same window were handled.

Verification: `python -m pytest -q` — 320 passed, 1 skipped (added a
turn-aggregate budget-depletion unit test and a turn-boundary reset test);
`python -m compileall -q jjk_arena web/app.py`.

## 2026-07-13 - Milestone B: automated 78-skill audit

Added `jjk_arena/battle_v2/skill_audit.py` (see
`docs/battle_v2_first_creation_skill_audit_contract.md`) as the "automated
audit pass" the user chose over a manual per-skill review, since the existing
`test_every_first_creation_skill_executes_its_explicit_contract` blanket
parametrized test already thoroughly covers cost/cooldown/positive-effect/
condition-branching/duration for all 78 skills. The audit tool instead checks
structural completeness, special-mechanic (counter/reflect/replacement/
non-trivial-targeting) test coverage, and kit-grammar vocabulary drift.

Findings:
- Structural completeness: 0 flagged across all 78 skills.
- Special-mechanic coverage: counter (Miwa) and both skill-replacement
  mechanics (Geto Young, Yuta JJK0) already have dedicated test coverage. 11
  skills using `ally`/`ally_team`/`enemy_team` targeting do not have a
  dedicated test beyond the blanket one — reported as an open finding, not
  auto-fixed.
- **The documented `ConditionSpec`/`SkillSpec.conditions` mechanism in
  `docs/jjk_kit_grammar.md` is used by zero of the 78 shipped skills.** All
  real conditional behavior uses an undocumented parallel payload-key
  convention on `EffectSpec` instead. This is a documentation gap, not an
  engine bug — flagged for a future doc-grammar correction pass.
- `cost_modifier`/`damage_modifier` don't exist anywhere in the engine.
  `domain`/`health_steal`/`reflect`/`cooldown_increase` exist but are unused
  by First Creation content (consistent with the anti-domain decision — no
  First Creation character has a real Domain).

Added `tests/test_first_creation_skill_audit.py` as a permanent regression
guard (pins structural completeness at 0, guards counter/reflect/replacement
coverage) without silently asserting away the open targeting-coverage finding.

Verification: `python -m pytest -q` — 322 passed, 1 skipped.

## 2026-07-13 - Milestone B: closed the 11 targeting-coverage gaps, found a real bug

Wrote `tests/test_first_creation_targeting_contracts.py`, one dedicated test
per skill flagged by the audit tool (ally/ally_team/enemy_team targeting with
no test beyond the blanket parametrized one), verifying each skill's effect
actually lands on the correct slot(s) rather than just "something meaningful
happened."

Writing these caught a real, previously-unnoticed bug: Utahime Iori Young's
`fc_utahime_iori_young_curtain_step` granted its `ritual_guard`
destructible-defense status to Utahime herself (`target="self"`) instead of
the chosen ally — contradicting its own flavor text ("Ritual Rhythm gives an
ally 10 destructible defense") and the pattern every sibling skill (Rainbow
Dragon Guard, Curse Screen, Useful Retreat, Emergency Step) correctly follows.
Fixed in `jjk_arena/battle_v2/starter_roster.py` by removing the erroneous
`target="self"` kwarg so it defaults to the selected ally.

Two other test-setup lessons worth recording: `enemy_team(required_status=...)`
(used by Hairpin/Nail and Shikigami Veil/Poison) enforces that **every**
selected target already carries the required status — you cannot mix marked
and unmarked targets in one cast, only choose among the marked ones (1-3 of
them). And `EffectSpec(type="extend_status", ...)` respects each status's own
`duration_clock` — a synthetic test status built without an explicit
`duration_clock` defaults to `GLOBAL_TURN`, which can tick down within the
same resolution the extension applies in, making an extension look like it
silently no-opped. Real First Creation statuses avoid this because
`status_effect()` infers `SOURCE_TURN`/`TARGET_TURN` from the `target` kwarg.

Also fixed `docs/jjk_kit_grammar.md` to document the payload-key condition
convention that's actually used (full key list: `condition_status`,
`condition_statuses`, `condition_missing_status`, `condition_user_status`,
`condition_user_stacks`, `condition_target_hp_below`,
`condition_original_has_status`/`condition_original_missing_status`,
`condition_recipient_has_status`/`condition_recipient_missing_status`,
`condition_ally_damaged_target_this_turn`, `condition_scope`, the `bonus_*`
payoff variants, and `conditional_targeting`), and the effect-vocabulary
naming/implementation drift (payload-key vs `EffectSpec.type`,
`invulnerable`/`skill_replacements` vs the documented
`invulnerability`/`skill_replacement`, and which documented mechanics
genuinely don't exist anywhere in the engine vs. are just unused by First
Creation). Strengthened `tests/test_first_creation_skill_audit.py` to assert
0 special-mechanic coverage gaps now that the count is actually 0, instead of
leaving it as an open, unenforced finding.

Verification: `python -m pytest -q` — 334 passed, 1 skipped;
`python -m compileall -q jjk_arena web/app.py`;
`python -m jjk_arena.battle_v2.skill_audit` reconfirms 0 structural and 0
special-mechanic-coverage findings.

## 2026-07-13 - Milestone B: round-robin balance simulation, and a scope reality check

The user asked for "10,000 to 50,000 simulations" for balance signal. Measured
actual per-game cost first: `run_headless_match` averages ~1.2-1.8s/game for a
first-creation matchup (34-47 turns typical), not the sub-100ms rate the
10k-50k target implicitly assumes. At that rate 10,000 games is ~4 hours and
50,000 is ~19+ hours of wall time — not something to run unattended inside
this session. An initial attempt to run an 840-game batch
(`--games-per-orientation 15` across all 8 presets round-robin) in the
background ran into an unrelated problem: this sandboxed shell's `date`
output was not advancing consistently with the scheduled-wakeup wait times,
so waiting on it reliably wasn't possible; the process was killed mid-run.

Ran a smaller, honest, fully round-robin batch instead: all 8 First Creation
presets × both seat orders × 5 games/orientation = **280 total games**
(`python -m jjk_arena.battle_v2.balance_report --presets story_tutorial,
tokyo_second_years,kyoto_pressure,defensive_artillery,poison_outsider,
hidden_inventory,young_sorcerer_support,jjk0_beginner_special
--games-per-orientation 5 --seed 1 --max-turns 200`, ran synchronously,
completed in under 5 minutes). Results:

- `turn_cap_rate: 0.0` — every game reached a decisive result, no stalemates.
- `first_seat_win_rate: 0.479` — close to 50%, no strong first-mover bias.
- Per-character descriptive win rate (Wilson 95% interval), notable outliers:
  - High: Megumi Fushiguro 78.6% [71.1%, 84.6%], Nobara Kugisaki 78.6% [71.1%,
    84.6%], Yuji Itadori 77.1% [66.0%, 85.4%] — the entire `story_tutorial`
    trio.
  - Low: Panda 12.9% [6.9%, 22.7%], Maki Zenin 24.3% [17.9%, 32.0%], Toge
    Inumaki 24.3% [17.9%, 32.0%] — the entire `tokyo_second_years` trio.
- This echoes the matchup note already recorded from PR #51 ("the tutorial
  trio won 32/40 combined against the JJK0 beginner trio") with a wider,
  independent sample — the same signal shows up again at 8x the preset
  coverage.

Per `docs/battle_v2_balance_report_contract.md`'s own interpretation limits,
**this is evidence for matchup inspection, not a mandate to nerf/buff
anything** — win rates here are confounded by preset teammates, the heuristic
CPU AI (not human play), and a 5-games-per-orientation sample. No balance
numbers were changed. If a genuine 10k-50k-game run is wanted later, it needs
either an engine performance pass (per-game cost reduction) or dedicated
CI/background infrastructure that can run for hours unattended — not a
same-session agentic task.

Verification: the 280-game batch completed with exit code 0 and produced
well-formed JSON; no test changes in this entry (diagnostic-only run).

## 2026-07-13 - Milestone C: reconnect/disconnect UX

First Milestone C deliverable (of AI difficulty / progression / combat UX /
reconnect UX / audio-haptics / instrumentation, per the roadmap). Research
found the server already does all the hard authoritative reconnect work
(resume-token protocol, 90s/180s grace, auto-forfeit) but the Phaser client
had **zero UI feedback for it** — no "Reconnecting…" state, no disconnect
indicator, no grace countdown, and the connected opponent wasn't even told
their opponent had disconnected until an unrelated update happened to arrive.

Server changes:
- `jjk_arena/battle_v2/manager.py`: added `_disconnect_grace_seconds_remaining`
  and included it in `_serialize_for_player`'s payload as
  `disconnect_grace_seconds_remaining`.
- `web/app.py`'s `on_disconnect` now calls `emit_battle_v2_update(room_id)`
  immediately after `disconnect_player`, so the connected opponent learns
  about the disconnect the instant it happens, not on the next unrelated
  state change.

Client changes (`web/static/phaser/store/game-store.js`,
`web/static/phaser/scenes/combat-scene.js`):
- `GameStore` now tracks `connectionState` ('connected'/'disconnected') via a
  real `disconnect` socket.io handler (there wasn't one before).
- `battle_v2_finished` toasts are now reason-aware (`finishedMessage`):
  distinct messages for "opponent disconnected, you win by forfeit", "you
  forfeited by staying disconnected too long", and "both disconnected, no
  contest", instead of a generic "Battle finished: <id>".
- The existing turn-status badge in `CombatScene.renderTopHud` (which already
  showed READY/PLANNING/LOCKED/etc.) now shows `OFFLINE` (own connection
  lost) or `PAUSED <n>S` (opponent disconnected, counting down to forfeit) in
  red, taking priority over the normal queue-status label.

Initial implementation added a separate banner row below the top HUD, but
visual testing in the browser showed it overlapping the enemy-portrait row in
the real (cramped) mobile layout — the gap between the HUD box and the
character row is only ~16px. Rebuilt it to reuse the existing status-badge
slot instead of claiming new screen space, which fit cleanly.

Verified live in the browser preview (not just unit tests): started a CPU
match, force-disconnected the socket via `store.socketClient.socket.
disconnect()`, confirmed the badge changed to `OFFLINE` in red with no layout
collision, reconnected and confirmed it cleared back to `READY`. True
two-player opponent-disconnect couldn't be exercised through two browser tabs
(same browser session shares one player_id server-side), so that path was
verified by injecting a `{paused: true, disconnect_grace_seconds_remaining:
47}` state directly into the store and confirming `PAUSED 47S` rendered
correctly. No console errors in any state.

Added `test_disconnect_grace_seconds_remaining_is_serialized_and_counts_down`
(`tests/test_battle_v2_lifecycle.py`) and
`test_opponent_is_immediately_notified_when_a_player_disconnects`
(`tests/test_battle_v2_socket.py`).

Verification: `python -m pytest -q` — 336 passed, 1 skipped;
`python -m compileall -q jjk_arena web/app.py`; `node --check` on all three
changed Phaser modules; live browser verification as described above.

## 2026-07-13 - P0 lifecycle identity fixes + test-order isolation

Source: a third-party audit of this branch (`FantasyDraft(4)` zip, tip
`f0b1b6e`) found a real P0 bug and a test-isolation gap. Cross-checked every
claim against the code on this branch before acting; all of them held up.

The P0 bug: a player could end up bound to two live matches simultaneously.
Repro: P1/P2 finish a PvP match -> P2 starts a CPU practice match -> P1
requests a rematch of the old PvP match -> the server created the rematch
with P2 even though P2 was already live in the CPU match. Three compounding
causes in `web/app.py`:

1. `active_v2_context` re-forced a session's remembered `active_match_id`
   whenever that id was merely present in `battle_v2_manager.rooms`, not
   checked against `_is_live_match` (a helper that already existed and is
   used correctly elsewhere). Fixed to gate on `_is_live_match`.
2. `on_battle_v2_start_classic` / `on_battle_v2_join_pvp` unconditionally
   wrote `room_aliases[requested_code] = room_id`. Because finished matches
   stay in `battle_v2_manager.rooms` until pruned, a stale finished match id
   surfacing as `requested_code` (via bug #1, or just a session that still
   remembers it) got permanently aliased to point at a new CPU match,
   corrupting the old match's identity. Fixed by refusing to alias a code
   that is already a real (live or finished) authoritative match id.
3. `on_battle_v2_rematch` overwrote `active_match_by_player` for both
   original participants with no check that either was already live
   elsewhere. Fixed by checking `_is_live_match` for every non-CPU original
   participant before creating the new match, raising `BattleV2Error` if one
   is already live somewhere else.

Also fixed the stress harness's invariant, which the audit correctly flagged
as structurally unable to catch this class of bug: it only inspected
`active_match_by_player` (a dict with one value per player, so it can never
reveal a double-membership). `jjk_arena/battle_v2/lifecycle_stress.py` now
scans real room membership (`_live_match_memberships`) and also disconnects
every test client per scenario and reports `peak_rooms`,
`peak_scheduler_tasks`, `final_rooms`, and best-effort `process_rss_bytes`
(via stdlib `resource` on POSIX, falling back to `psutil` if present, else
`None` — this repo's dev machine is Windows, where neither is available, so
that field reads `None` here).

Test-order dependency: `tests/conftest.py` previously only isolated
First Creation profile storage. Any test that left a room/lobby behind
(most socket tests didn't clean up) leaked into later tests that scan those
globals wholesale, e.g. `test_stale_runtime_prunes_finished_rooms_lobbies_and_rate_limits`
failed when run after other suites because it found rooms/lobbies from
earlier tests, not just its own. Added an autouse
`reset_battle_v2_runtime_state` fixture that clears every lifecycle global
(rooms, aliases, RNGs, locks, receipts, sessions, lobbies, all index maps,
rate limits, activity maps, archives) before and after each test, cancelling
scheduler tasks first. It defensively uses `getattr`/`isinstance` checks so
it doesn't choke on tests that temporarily monkeypatch `battle_v2_manager`
to a bare `SimpleNamespace`.

Other fixes from the same audit:
- Bumped `RULES_VERSION` in `jjk_arena/battle_v2/replay.py` from
  `battle-v2-2026-07` to `battle-v2-2026-07-aggregate-dr` (and updated the
  checked-in golden replay fixture's `rules_version` field to match) — the
  aggregate damage-reduction rule change had kept the old version string, so
  a pre-change replay and a post-change replay were indistinguishable by
  version and would only surface as a confusing hash mismatch instead of a
  clean unsupported-version rejection.
- `web/static/phaser/store/game-store.js`: `controlsLocked()` now also
  checks `connectionState !== 'connected'` and `state.paused` /
  `state.result_type`, so the client disables input immediately instead of
  letting the player click and only then showing a server-rejection toast.
- Reconnect countdown (`PAUSED <n>S`) now decrements locally: the store
  computes a `disconnectDeadline` (`Date.now() + remaining*1000`) on each
  server update and a 250ms ticker re-renders while it's set, instead of
  freezing on whatever value the last server push happened to contain.
- Added a regression test,
  `test_rematch_is_rejected_when_a_participant_started_another_match`
  (`tests/test_battle_v2_socket.py`), reproducing the exact P0 repro above.
  Verified it fails without the `web/app.py` fixes (temporarily stashed the
  file and reran) and passes with them.

Verification:
- `python -m pytest -q` — 337 passed, 1 skipped.
- `python -m pytest -q $(find tests -name 'test_*.py' | sort -r)` (reverse
  file order, per the audit's exact reproduction) — 337 passed, 1 skipped,
  same result as normal order.
- `python -m jjk_arena.battle_v2.lifecycle_stress --matches 200 --seed 3` —
  0 softlocks, `final_rooms: 0`, `peak_rooms: 149` (bounded, not growing
  unboundedly).
- `python -m compileall -q jjk_arena web run_server.py`.
- `node --check` on every non-vendor file under `web/static`.
- Confirmed the new regression test both fails on the pre-fix code and
  passes on the fixed code (not a vacuously-passing test).
- Did not attempt a live browser check of the reconnect countdown ticker in
  this pass (no running dev server was started); the JS changes are only
  syntax-checked and covered by the existing server-side disconnect tests,
  not exercised end-to-end in a browser.

Caution / next work:

- Human-vs-human rematch is still unilateral (whoever requests it starts it
  for both players once eligible); the audit suggested a
  request/accept/decline flow instead. Left as-is per scope — this pass only
  closes the double-membership bug, not the UX-model question.
- `process_rss_bytes` is `None` on this Windows dev machine; if a memory
  ceiling gate is wanted in CI, it needs a Linux runner (where stdlib
  `resource` works) or a `psutil` dependency.
- Did not attempt the full 1,000-match stress run from the audit's exit
  gate in this pass; 200 matches completed cleanly in ~12s.

## 2026-07-13 - Milestone C: AI difficulty, mission coverage, analytics

Three of the four remaining agent-doable Milestone C deliverables (per the
roadmap: AI difficulty, First Creation mission coverage, durable
instrumentation; audio/haptics needs real assets and stays out of scope).
Planned via EnterPlanMode first — researched the actual CPU heuristic,
mission/progression, and runtime-store code before writing anything, since
this touched three separate subsystems in one pass.

**AI difficulty (Easy/Normal/Hard).** `jjk_arena/battle_v2/manager.py`:
added `room_cpu_difficulty` (per-room dict, same pattern as
`room_roster_modes`), threaded an optional `difficulty` kwarg through
`start_classic_match`/`start_first_creation_match` (default `"normal"`,
normalized to one of the three valid values). `_cpu_action_score` now
splits its bonuses into `score` (raw damage/heal, untouched) and
`smart_bonus` (kill-securing, status-control, heal-urgency bonuses): Hard
raises the lethal bonus (500→650) and halves the cost penalty; Easy halves
`smart_bonus`. At `difficulty="normal"` the arithmetic is unchanged from
before (same totals, different code shape), so all 3 existing CPU-behavior
tests and the chunk1 CPU-legal-action stress test needed zero changes.
`web/app.py`: added `battle_v2_cpu_difficulty(data)`, threaded through
`on_battle_v2_start_classic` only (the only CPU entry point — PvP/rematch
paths don't pass it, default is harmless there). Client
(`game-store.js`/`draft-scene.js`): added an Easy/Normal/Hard button row on
the draft screen next to the existing CPU-preset buttons, sent as
`difficulty` in the `battle_v2_start_classic` payload. Updated
`docs/battle_v2_socket_contract.md`. Verified live in the browser: selected
Hard, confirmed `store.difficulty === 'hard'` client-side and
`battle_v2_manager.room_cpu_difficulty[room_id] == "hard"` server-side via
`/ops/runtime`.

**First Creation mission coverage (10/19 characters → 19/19).** Added 3
missions to `jjk_arena/battle_v2/first_creation_missions.py` —
`kyoto_pressure_gauntlet` (Todo/Kamo/Mai), `defensive_artillery_drill`
(Miwa/Momo/Mechamaru), `student_reserves_trial` (Panda/Utahime/Mei Mei,
the one trio with no existing named preset since their natural teammates
were already claimed by other missions) — covering the remaining 9
characters. Every skill/status id referenced in the objectives (`blood_mark`,
`revolver_shot`, `quick_draw_stun`, `aerial_scout`, `gorilla_core`,
`crow_mark`) was verified against `starter_roster.py` before writing the
mission data, not guessed. Added matching objective-check blocks in
`first_creation_progression.py` (same single-condition-per-objective style
as the 4 existing missions) and 3 new cosmetic badge unlocks in
`first_creation_unlocks.py` (no new character-variant unlocks — building
gojo_adult/geto_jjk0 kits is roster expansion, explicitly out of scope
until Phase 13). Fixed one incidental fragile test
(`tests/test_first_creation_roster.py` asserted `payload["missions"][-1]`,
which broke once there were more than 4 missions — switched to lookup by
mission id).

**Durable analytics.** `jjk_arena/battle_v2/runtime_store.py`: added an
`analytics_events` table (bumped `SCHEMA_VERSION` to 2, additive-only
migration) plus `record_analytics_event`/`analytics_summary` methods,
following the exact style of the existing `save_replay`/`load_replay`
methods. Hooked entirely inside `web/app.py`'s `emit_battle_v2_update` —
deliberately did *not* touch `manager.py`'s constructor or `_finish_match`
(6 call sites, no `room_id` on `BattleState`) for this: match-finished
recording reuses the exact `archived_replays`-set-guard pattern (a new
`analytics_recorded_matches` set) right next to the existing
`archive_finished_replay` call; mission-completed recording snapshots a
player's `completed_missions` before `merge_first_creation_progress` and
diffs after, reusing that function's own dedup rather than adding a new
one. Both wrapped in try/except + an `analytics_write_errors` counter, same
defensive pattern as replay archiving — analytics can never break a battle.
Extended `/ops/runtime` (same bearer-token auth, no new auth surface) with
an `analytics` key: match-finished counts by outcome/vs_cpu/cpu_difficulty,
mission-completion counts per mission id.

**Test isolation follow-up.** Discovered mid-pass that `web_app.runtime_store`
is a module-level singleton constructed once at import — a per-test
`monkeypatch` of its `.path` has no effect on background scheduler threads
that can still be mid-write after that test's teardown reverts the patch.
Fixed by redirecting `.path` once, session-scoped, in `tests/conftest.py`.
Traced every `sqlite3.connect` call across a full suite run to confirm:
exactly one hit on the real `data/jjk_arena.sqlite3` (the pre-existing
one-time schema-init write at module import, unrelated to this pass), zero
per-test leakage after the fix.

**Known issue introduced and only partially cleaned up:** before the
session-scoped isolation fix above was in place, one earlier full `pytest`
run in this pass *did* write real rows into `data/jjk_arena.sqlite3`'s new
`analytics_events` table (confirmed 242 contaminated rows). Attempted to
clear just that table's rows (not the whole file, which also holds real
profile/replay data) but the destructive-action classifier correctly
blocked an unpredicated `DELETE FROM analytics_events` with no explicit
user direction. **Left unresolved for the user to clear** (either
`DELETE FROM analytics_events;` in that file, or just note that
`/ops/runtime`'s analytics numbers are inflated until then — it's additive
only, so nothing is corrupted, just noisy).

Verification:
- `python -m pytest -q` — 356 passed, 1 skipped, both normal and reverse
  file order.
- `python -m compileall -q jjk_arena web run_server.py`; `node --check` on
  every non-vendor file under `web/static`.
- Ran the First Creation skill audit (`python -m jjk_arena.battle_v2.skill_audit`)
  — 0 structural/coverage issues, same pre-existing doc-gap findings as
  before (not a regression).
- Live browser verification: started a CPU match, selected Hard difficulty,
  confirmed it threaded through client → server; hit `/ops/runtime` and
  confirmed the `analytics` key populates.
- Did not live-browser-verify the mission-coverage or Easy-difficulty paths
  specifically (covered by the new unit/socket tests instead) — only Hard
  was clicked through manually.

Remaining for Milestone C: AI difficulty scaffolding is done, but this was
scoring-level tuning, not a new search/lookahead algorithm — if Hard/Easy
don't feel distinct enough after human playtesting, the constants
(`lethal_bonus_amount`, the `smart_bonus` halving) are the tuning knobs.
Progression and instrumentation deliverables are functionally complete.
Audio/haptics remains the one deliverable that needs real assets and
can't be done by an agent.

## 2026-07-13 - Milestone C corrective pass: difficulty distinctness, mission semantics, analytics integrity

Source: an external audit of the previous uncommitted pass (same session,
same worktree) found the scaffolding above was real but semantically
incomplete in ways that would have produced convincing-but-wrong dashboards
and unearned mission completions. This pass addresses every P1 finding.

**CPU difficulty.**
- `web/app.py`'s `on_battle_v2_rematch` now threads
  `battle_v2_manager.room_cpu_difficulty.get(old_match_id, "normal")` into
  `start_battle_v2_match_for_mode` instead of always defaulting to
  `"normal"` — a CPU rematch keeps the difficulty the player picked.
- `manager.py`'s `_cpu_action_score`: the audit found Hard and Normal picked
  identically in 400/400 sampled non-lethal states because the only
  difference was a lethal bonus that rarely triggers. Hard now also scales
  the tactical `smart_bonus` (stuns, counters, damage modifiers, condition
  bonuses) by 1.35x and reacts to ally heal-urgency 15 HP earlier (55 vs 40)
  than Normal; Easy still halves `smart_bonus`. Added
  `test_cpu_action_score_hard_differs_from_normal_without_a_lethal_opportunity`
  and a heal-urgency test to cover this without a full 400-state corpus.

**First Creation missions.**
- Kyoto Pressure Gauntlet / Defensive Artillery Drill / Student Reserves
  Trial descriptions all said "Win with..." but their objectives never
  checked `winner_is_player` — a forced loss still completed them and
  unlocked the badge. Added an explicit "Win the match" objective (and
  static objective-text entry) to all three.
- `status_applied` events (`effects.py`, both emit sites in `resolver.py`)
  now carry `source_player_id`/`source_slot`/`source_skill_id`.
  `_status_applications()` in `first_creation_progression.py` takes an
  optional `source_player_id` filter, and every status-based mission
  objective (Blood Mark, Quick Draw Stun, Gorilla Core, Crow Mark, poison)
  now filters by the evaluated player — a mirror-matched opponent applying
  the same status can no longer satisfy your objective.
- "Reveal an enemy with Aerial Scout" previously checked only that the
  skill was used/queued (`skill_id.endswith("aerial_scout")`), so a
  countered Aerial Scout still satisfied it. It now checks that the
  `revealed` status actually applied, filtered by source player.
- Added regression tests for all of the above (loss-path, mirror-opponent,
  countered-reveal) in `tests/test_first_creation_progression.py`.

**Analytics integrity.**
- `_match_outcome` in `web/app.py` only ever checked
  `winner_id == CPU_V2_PLAYER_ID` for "loss", so every decisive PvP match
  (no CPU player present) recorded as a "win" with no paired loss — this
  matched the audit's finding of 238/238 PvP matches logged as "win" in the
  shipped dev database. Replaced it with a per-player `_player_outcome`
  and split analytics into two event types: `match_finished` (match-level:
  `roster_mode`, `vs_cpu`, `cpu_difficulty`, `result_type`, `finish_reason`
  — reusing `BattleState.result_type`/`finish_reason`, which already
  existed) and one `match_player_result` event per non-CPU player
  (`outcome`: win/loss/draw/no_contest). A decisive PvP match now always
  produces exactly one win and one loss.
- `runtime_store.py`: bumped `SCHEMA_VERSION` to 3, added a nullable
  `event_key TEXT` column (additive `ALTER TABLE`, safe on an existing v2
  database) with a `UNIQUE` index, and switched `record_analytics_event`
  to `INSERT OR IGNORE` keyed on it (returns whether a row was actually
  inserted). Event keys: `match_finished:{match_id}`,
  `match_player_result:{match_id}:{player_id}`,
  `mission_completed:{match_id}:{player_id}:{mission_id}`. This makes
  dedup a database guarantee instead of the in-memory
  `analytics_recorded_matches` set the prior pass relied on alone (that
  set stays as a fast-path, not the only guard) — covers concurrent
  duplicate emits, reconnect-triggered re-broadcasts, and process
  restarts. Added thread-race and restart-survival tests in
  `tests/test_battle_v2_runtime_store.py`.
- `analytics_summary()` updated to aggregate `by_result_type` and
  `by_difficulty` from `match_finished` rows and `wins`/`losses`/`draws`/
  `no_contests` from `match_player_result` rows.
- Did not touch: analytics writes still happen inside
  `emit_battle_v2_update` (the broadcast path) rather than at the
  authoritative state transition in `manager.py`, and `/ops/runtime`'s
  `analytics_summary()` still loads every row into Python instead of
  using SQL `GROUP BY`. Both are P2s in the audit and lower-risk than the
  P1 correctness bugs above; moving match-finish recording into
  `manager._finish_match` touches 6 call sites and `BattleState` has no
  `room_id` today, so that's a deliberately separate follow-up rather than
  something to fold into this pass.
- Left unresolved, flagged for the user rather than acted on: the prior
  pass's 242 contaminated test rows are still in
  `data/jjk_arena.sqlite3`'s `analytics_events` table (confirmed same
  242-row count and ~75s timestamp window the audit found). Not deleted
  here — it's a real local data file with other tables (3 real
  `first_creation_profiles` rows) alongside it, and clearing rows from a
  live SQLite file is a destructive action outside what this pass was
  asked to do.

Verification:
- `python -m pytest -q` — 368 passed, 1 skipped, both normal and reverse
  file order (added 1 CPU-rematch-difficulty test, 2 CPU-score
  differentiation tests, 1 PvP win/loss-split test, 6 mission
  regression tests, 4 analytics idempotency/model tests — net +11 vs. the
  356 from the prior pass, after also fixing the one pre-existing test
  that asserted the old single-event-type analytics shape).
- `python -m compileall -q jjk_arena web run_server.py`; `node --check
  web/static/phaser-shell.js`.
- Re-ran `python -m jjk_arena.battle_v2.skill_audit` — identical
  pre-existing findings, no new regressions.
- Did not live-browser-verify this pass; covered entirely by the new/
  updated unit and socket-level tests above.

Remaining for Milestone C: the two P2 analytics items noted above
(authoritative recording location, SQL-aggregated `/ops/runtime`) are still
open. Mission "19/19 mastery coverage" (as opposed to team-presence
coverage) is unchanged from the prior pass — Todo, Mechamaru, Utahime,
Maki/Toge, and Nobara/Megumi still have no dedicated per-character
objective; out of scope for this corrective pass, which targeted semantics
bugs, not new content.

## 2026-07-13 - Milestone C: the two remaining P2 analytics items

Source: same session, after PR #55 (the P1 corrective pass) was opened.
Tackled both deferred P2s: analytics recorded from the broadcast path
instead of the authoritative state transition, and `/ops/runtime` decoding
every row's JSON payload in Python instead of aggregating in SQL.

**Authoritative recording location.**
- `models.py`: added `BattleState.room_id: str | None = None`; set once in
  `manager.py`'s `start_classic_match` at construction (inherited by
  `start_first_creation_match`, which delegates to it) — no other
  `BattleState(...)` construction site exists.
- `manager.py`: added `BattleV2Manager.on_match_finished: Callable[[str],
  None] | None`, invoked (wrapped in try/except so a hook failure can never
  break a battle) at the end of `_finish_match` — the single choke point
  all 6 finish call sites (`_finish_by_tiebreak`, `expire_disconnects` x2,
  `_complete_player_turn`, `surrender`) already funnel through, and which
  is already idempotency-guarded (`if phase == FINISHED and result_type is
  not None: return` at the top). This was the actual authoritative
  terminal transition Codex's original pass avoided touching because it
  "touches 6 call sites" — turns out only one of those (`_finish_match`
  itself) needed a change, not all 6.
- `web/app.py`: registered `battle_v2_manager.on_match_finished =
  record_match_finished_analytics` once at module load (right after the
  function is defined), and removed the call to it from
  `emit_battle_v2_update`. A repeated/delayed broadcast can no longer be
  the thing that creates or skips the event.
- `replay.py`: adding `room_id` to `BattleState` changed
  `authoritative_state_hash()`'s output (it hashes every dataclass field),
  breaking the checked-in golden replay fixture. Added `"room_id"` to the
  existing `HASH_EXCLUDED_FIELDS` set alongside `"phase_deadline"` — it's
  routing metadata, not battle-authoritative content, so excluding it (not
  re-baselining the golden hash) is the correct fix.
- Mission-completed analytics moved the same way: `first_creation_profile.py`'s
  `merge_first_creation_progress` now computes `newly_completed` itself
  (inside the same closure that mutates `completed_missions`) and records
  the analytics event right after the durable profile merge succeeds,
  instead of `web/app.py` diffing before/after profile snapshots around
  the broadcast. Added an `analytics_store` parameter so callers with their
  own long-lived `SQLiteRuntimeStore` (like `web/app.py`'s singleton, whose
  `.path` tests redirect) can pass it in — a naive `SQLiteRuntimeStore()`
  constructed fresh inside `first_creation_profile.py` would have silently
  written to the real default database path during tests instead of the
  test-isolated one (caught this via a failing test, not by inspection).
- Added `test_match_finished_analytics_are_recorded_without_any_broadcast`
  (calls `battle_v2_manager.surrender()` directly, zero socket/broadcast
  calls, confirms the event still lands) in `tests/test_battle_v2_socket.py`.

**SQL-aggregated `/ops/runtime`.**
- `runtime_store.py`: bumped `SCHEMA_VERSION` to 4. Added typed columns
  (`result_type`, `finish_reason`, `cpu_difficulty`, `vs_cpu`, `outcome`,
  `mission_id`) to `analytics_events`, populated automatically from
  whichever of those keys happen to be present in the event's `payload`
  dict at write time (no call-site changes needed) — `payload_json` still
  stores the full record for detail/debugging, but is no longer read by
  the summary path. Added indexes on `(event_type, result_type)`,
  `(event_type, outcome)`, `(event_type, mission_id)`.
- `analytics_summary()` rewritten as five small `SELECT ... GROUP BY`
  queries instead of `SELECT * ... ` + a Python loop decoding every row's
  JSON. Same public return shape as before (no caller changes needed).
- Added `test_analytics_summary_uses_sql_aggregation_not_python_payload_decoding`,
  which corrupts a row's `payload_json` directly via a raw `sqlite3`
  connection (bypassing the store's own write path) while leaving the
  typed columns intact, and confirms the summary is still correct —
  proving the aggregation genuinely reads the typed columns, not the JSON.

Verification:
- `python -m pytest -q` — 370 passed, 1 skipped, both normal and reverse
  file order (added 3 tests net: the no-broadcast regression, the
  SQL-aggregation regression, and the schema-version bump to 4 fixed one
  existing assertion).
- `python -m compileall -q jjk_arena web run_server.py`; `node --check
  web/static/phaser-shell.js`.
- Re-ran `python -m jjk_arena.battle_v2.skill_audit` — identical
  pre-existing findings, no new regressions.
- Did not live-browser-verify; covered by the new/updated tests above.

Remaining for Milestone C: mission "19/19 mastery coverage" (per-character
objectives, not just team presence) is still open — same 5 characters as
before (Todo, Mechamaru, Utahime, Maki/Toge, Nobara/Megumi). Both original
P2 analytics items are now closed. Audio/haptics remains the one Milestone C
deliverable that isn't agent-doable.

## 2026-07-13 - Milestone C: mission mastery coverage (the last of the 5 gap characters)

Source: same session, after the two P2 analytics items closed. Closed the
remaining "19/19 team presence but not 19/19 mastery" gap: Todo, Mechamaru,
Utahime, Maki, Toge, Nobara, and Megumi (7 characters across 5 missions —
"Maki/Toge" and "Nobara/Megumi" were each 2 separate gaps, not 1) had no
mission objective naming their own skill; they only showed up in a
recommended team whose objectives were all some other teammate's.

Verified each addition against `starter_roster.py` before writing (not
guessed), same discipline as the original mission-coverage pass:
- **Todo** (`kyoto_pressure_gauntlet`): "Set up a redirect with Todo's
  Boogie Woogie" — status `boogie_woogie_redirect` (`fc_aoi_todo_boogie_woogie`).
- **Mechamaru** (`defensive_artillery_drill`): "Lock down an enemy with
  Mechamaru's Remote Puppet Net" — status `remote_puppet_net`.
- **Utahime** (`student_reserves_trial`): "Activate Utahime's Solo Solo
  Kinku" — status `solo_solo_kinku`. (Deliberately not her `ritual_rhythm`
  skill: that one emits a `team_status_applied` event via `apply_team_status`,
  a different event type the mission-objective checker doesn't read.)
- **Maki** (`cursed_child_bond`): "Buff up with Maki's Weapon Specialist" —
  status `weapon_specialist`. **Toge** (same mission): "Stun an enemy with
  Toge's Stop." — status `stopped`. Both objectives on this mission had
  previously been Yuta's alone, despite Maki/Toge being on the recommended
  team.
- **Nobara** (`outsider_poison_path`): "Apply Nail with Nobara's Nail
  Barrage" — status `nail`. **Megumi** (same mission): "Apply Scent with
  Megumi's Divine Dogs" — status `scent`. Both objectives on this mission
  had previously been Junpei's alone.

All new objectives reuse the existing `_status_applications(events, status,
source_player_id)` helper (source-filtered, from the P1 corrective pass),
so a mirror-matched opponent can't satisfy these either. Mission
descriptions and static objective text in `first_creation_missions.py`
updated to match. Updated the 3 existing tests that asserted the old
lower objective counts (`test_kyoto_pressure_gauntlet_completes_...`,
`test_defensive_artillery_drill_completes_...`,
`test_student_reserves_trial_completes_...`, and
`test_yuta_route_tracks_rika_state_and_replacement_skill`) to also satisfy
the new objective, and added one "is_incomplete_without_X's_objective"
regression test per newly-covered character (7 new tests total, including
a fresh `outsider_poison_path` test file section since that mission had no
dedicated tests before this pass at all) in
`tests/test_first_creation_progression.py`.

Tried a blanket "every character's name appears somewhere in a mission
objective" heuristic test first — dropped it. It false-flagged Yuji, Yuta,
Gojo, Geto, and Shoko as "uncovered" because their existing objectives
(e.g. "Activate Rika's Curse") are genuinely character-specific in
substance but don't literally contain the character's name string. The
per-mission regression tests are the actual proof; a generic name-matching
heuristic added noise, not signal.

Verification:
- Manually cross-checked all 19 First Creation characters against a
  curated per-mission objective-index mapping (each character → which
  mission and which objective is theirs) — 19/19 covered, 0 missing.
- `python -m pytest -q` — 377 passed, 1 skipped, both normal and reverse
  file order (net +7 tests).
- `python -m compileall -q jjk_arena web run_server.py`; `node --check
  web/static/phaser-shell.js`.
- Re-ran `python -m jjk_arena.battle_v2.skill_audit` — identical
  pre-existing findings, no new regressions.
- Did not live-browser-verify; covered by the new/updated tests above.

Milestone C status: CPU difficulty, mission coverage (team-level and now
mastery-level), and analytics (P1 correctness + both P2 architecture items)
are all done. Audio/haptics remains the only Milestone C deliverable left,
and it isn't agent-doable.

## 2026-07-16 - PR #54 render investigation (false alarm), worktree cleanup, merged timer-scheduler-and-missions

Reviewed the parked [PR #54](https://github.com/DylanElo/FantasyDraft/pull/54)
("Cursed Arena" visual redesign) live by checking it out into a scratch
worktree and running its server. Initial finding was that the Phaser
canvas rendered solid black on every scene — reported this as a blocking
regression.

That finding was wrong, and the correction matters for future browser
verification in this repo: the automated preview-browser tab used for
testing reports `document.visibilityState === "hidden"` permanently, which
halts Phaser's `requestAnimationFrame`-driven render loop entirely
(confirmed via a monkey-patched `renderer.render()` call counter that
stayed at 0 across 2 real seconds while `game.loop.frame` was frozen).
Proved this was a tooling artifact, not a PR #54 regression, two ways:
already-shipped `main` (byte-identical `legacy-shell.js` boot code)
exhibits the exact same black screen in the same test tool; and forcing
`document.visibilityState` to `"visible"` via a runtime-only patch in a
real Chrome tab immediately unfroze the render loop and the app rendered
correctly. Confirmed the Lobby, Team Builder (CPU Easy/Normal/Hard
selector visible), and live Combat screens all render as intended in the
new visual language. No code changes were needed or made to PR #54 itself
— the earlier "black screen" report is retracted. PR #54 remains open,
unmerged, awaiting the human visual sign-off it was already parked for.

Takeaway for future sessions: this project's Browser-pane preview tool
cannot be trusted to visually verify Phaser/canvas rendering — its tabs
report `document.hidden = true`, which silently starves any
rAF-driven render loop with no console error. Use the real Chrome
(`claude-in-chrome`) tools for any Phaser visual verification instead.

Separately, cleaned up worktree sprawl: removed `pr54-review` (the scratch
worktree from the above investigation) and `audit-findings-review-081b70`
(fully merged into `main`, no unique commits; its now-empty local branch
was also deleted). Left `FantasyDraft-temporal-pr`
(`wip/temporal-pr-combat-ui-2026-07-13`) parked as-is — its base is 23
merged PRs behind current `main` and a dry-run merge shows real conflicts
in `tests/test_battle_v2_lifecycle.py` and the combat-scene files; it
needs a rebase/conflict-resolution pass before it can land, and it's a
single "preserve uncommitted WIP" commit rather than finished work.

Merged `worktree-timer-scheduler-and-missions` into `main` (commit
`2bf82fd`, fast-forward — its branch base was exactly `main`'s prior tip,
so no merge commit was needed). Six commits: replaced the one-thread-per-
deadline timer scheduler with a single cancellable worker, gave Hard CPU
three real decision signals beyond score multipliers, settled First
Creation missions at the terminal state instead of the broadcast path,
completed mission attribution (exact skills, split payoffs, new mastery
objectives), started routing every terminal match outcome through
`ResultScene` with `first_creation_account` stored live, and added
analytics outbox retry/event retention while keeping `/ops/runtime`
aggregate-only. 399 tests passed (up from 377) before merging. Pushed to
`origin/main`. The `timer-scheduler-and-missions` worktree itself is
locked and was left in place, but its work is now on `main`.

## 2026-07-16 - Compared PR #54 against temporal-pr, user chose temporal-pr, rebased it onto main

Built a side-by-side comparison of the two unmerged combat-UI redesigns:
PR #54 "Cursed Arena" (broad, all scenes, violet/gold blade-plate system,
mergeable as-is) versus the local `wip/temporal-pr-combat-ui-2026-07-13`
branch "Underpass Courtyard" (narrow, Combat + Queue Review only, an
authored rain-darkened environment with dossier-style combatant plates,
real checked-in before/after screenshots and a visual-QA report, but 23
merged PRs stale with real conflicts). User's call: temporal-pr is the
preferred direction.

Rebased `wip/temporal-pr-combat-ui-2026-07-13` onto current `main`
(`git rebase main`), resolving three real conflicts:
- `docs/session_history.md` — both sides appended; kept both entries.
- `tests/test_battle_v2_lifecycle.py` (add/add) — main's version has 4
  newer lifecycle tests this branch didn't have; temporal-pr's version
  added one test (`test_simultaneous_lobby_joins_create_exactly_one_match`)
  against `jjk_arena/battle_v2/lobby_registry.py`. Confirmed via grep that
  `lobby_registry.py` is still dead code — nothing in `web/app.py` or
  `jjk_arena/` imports it, same as when it was deliberately deleted during
  the Phase 4 cleanup. Took main's version wholesale and dropped the
  resurrected `lobby_registry.py` file entirely rather than reintroducing
  dead code under a different branch.
- `web/static/phaser/scenes/combat-scene.js` (`renderTopHud`) — main added
  connection-aware status (`OFFLINE` / `PAUSED <n>s`, shipped as part of
  Milestone C's reconnect/disconnect UX) to the pre-redesign HUD;
  temporal-pr rewrote the same function for its new visual language from
  an older base that predates that feature, so its version had no
  connection-awareness at all. Merged both: kept temporal-pr's rendering
  and copy (`YOUR MOVE` / `ORDERS OPEN` / `QUEUE REVIEW` / `ENEMY CONTROL`)
  but layered main's `connectionWarning` logic on top so a real disconnect
  still overrides the label and now tints it red in the new HUD too
  (verified live — forcing `store.connectionState = 'disconnected'` and
  re-rendering shows `OFFLINE` in red).

Verification:
- `python -m pytest -q` — 399 passed, 1 skipped, same count as `main`.
- `node --check` on the resolved JS file; `ast.parse` on the resolved test
  file.
- Live in a real Chrome tab (not the sandboxed preview browser, which
  cannot render Phaser at all — see the entry above): drove Quick Play →
  Draft → Ignite Battle → Combat on the rebased branch running on its
  default port. The redesigned Combat scene rendered exactly as intended
  — authored underpass environment, location/weather header, dossier
  plates, tactical-directive skill cards — matching the branch's own
  checked-in reference screenshots.
- Did not run the branch's own `tools/capture_combat_redesign.py` —
  it depends on Playwright, which isn't a tracked project dependency
  (not in `requirements*.txt`); installing it just for one verification
  pass would add ~300MB of undeclared browser binaries. Used the
  already-available live-Chrome verification path instead.
- Along the way, hit and diagnosed a `"Not an accepted origin"` 400 on
  the Socket.IO handshake when running the app on a non-default port
  (5001/5002/5003). Confirmed this reproduces identically on unmodified
  `main` run the same way — a pre-existing dev-environment CORS quirk tied
  to `JJK_CORS_ORIGINS`'s port-derived default, unrelated to this branch
  or the rebase. Works cleanly on the default port 5000.

Force-pushed the rebased branch to `origin/wip/temporal-pr-combat-ui-2026-07-13`
(history rewrite, done with explicit user confirmation) and opened
[PR #56](https://github.com/DylanElo/FantasyDraft/pull/56) against `main`.
PR #54 remains open and unmerged; per the user's call this session,
temporal-pr is the intended direction, not #54 — what to do with #54
(close it, leave it parked, or mine specific ideas from it) still needs a
decision.

## 2026-07-16 - PR #56 merged; verified and fixed 5 issues from an external audit, discovered and fixed a 6th

PR #56 was merged into `main` (`d15777b`) by the user directly on GitHub.
Fast-forwarded the root `FantasyDraft` checkout (which the user had also
switched from a stale branch to `main` this session) to pick it up, then
re-ran the full verification chain: 399 passed/1 skipped, `compileall`,
and `node --check` across all 27 Phaser modules — all clean.

The user then shared two rounds of an external LLM-generated audit report
(in French) making detailed correctness claims. Verifying them surfaced a
process lesson worth recording: my first verification pass wrongly
dismissed two of the audit's Hard-CPU claims as fabricated, because I
grepped `_cpu_action_score` too narrowly and missed its Hard-only branch
entirely. A later, more careful full read of the function proved both
claims correct. Separately, a claim about mission-settlement retry safety
referencing `missions_settled_matches` was *also* wrongly dismissed as
fabricated — that identifier turned out to be real, but I'd grepped it in
`.claude/worktrees/hungry-kapitsa-3a5188`, a stale session worktree that
never received the earlier `timer-scheduler-and-missions` merge (which is
where that code originated), instead of the root checkout that actually
had it. Same root cause both times: checking the wrong copy of the code
rather than the actual claim being unverifiable. Take-away: when a
concrete, checkable claim is dismissed as fabricated, that dismissal
itself needs verifying against the *right* checkout before it's trusted.

Five issues confirmed and fixed, each with a regression test that fails
without the fix and passes with it:

1. **Hard CPU read hidden traps.** `_cpu_action_score`'s counter/reflect
   risk penalty (`jjk_arena/battle_v2/manager.py`) read `target.statuses`
   directly with no `invisible`/`revealed` filter, so Hard reacted
   identically to a revealed trap and one no human opponent could see.
   Fixed to skip statuses hidden from the CPU's own viewpoint, using the
   same visibility rule `serialize_status` already uses for the wire
   format. Tests: `test_cpu_action_score_hard_ignores_invisible_unrevealed_counter_status`,
   `test_cpu_action_score_hard_reacts_to_a_revealed_counter_status`.
2. **Hard ignored Uncounterable/Unreflectable.** The same risk penalty
   applied even when the skill being scored couldn't actually be
   countered or reflected. Fixed to check `SkillClass.UNCOUNTERABLE` /
   `UNREFLECTABLE` against the skill's own classes. Test:
   `test_cpu_action_score_hard_ignores_counter_risk_for_uncounterable_skill`.
3. **Lethal bonus used the raw declared amount.** The condition-aware
   `amount` computed for a conditional damage effect (zeroed when its
   `condition_status`/`condition_missing_status` isn't actually true of
   the live target) was used for scoring, but the lethal-bonus check two
   lines later still read `effect.amount` directly, so an unmet
   conditional "finisher" could still register as a kill. Fixed to reuse
   the corrected `amount`. Test:
   `test_cpu_action_score_hard_lethal_bonus_requires_condition_to_actually_hold`.
4. **`rememberResult` skipped DRAW/NO_CONTEST.** (`web/static/phaser/store/game-store.js`)
   Gated on `state.winner_id`, which is null for a draw/no-contest even
   though `state.result_type` is set — so `ResultScene` fell back to
   whatever match last had a decisive winner. Fixed to gate on
   `result_type` instead, with `Draw`/`No Contest` result labels. Test:
   `test_remember_result_records_draws_and_no_contests_not_just_decisive_outcomes`.
5. **`resetToLobby` surrendered finished draws/no-contests.** Same
   `!winner_id` conflation — leaving the result screen after an
   already-finished draw sent a needless `battle_v2_surrender`. Fixed to
   gate on `!result_type` (still-live) instead. Test:
   `test_reset_to_lobby_does_not_surrender_an_already_finished_draw_or_no_contest`.

Writing the retry-safety test for the mission-settlement claim (rather
than guessing) surfaced a sixth, previously-unconfirmed real bug in
`web/app.py`'s `settle_first_creation_missions`: it tracked settlement at
room granularity (`missions_settled_matches: set[str]`), and marked the
whole room settled unconditionally after the loop even if a player's
`merge_first_creation_progress` call raised (caught, counted in
`operational_counters["mission_settlement_errors"]`, then silently
dropped). A single transient write failure therefore permanently blocked
any retry for that room — proved this first with
`test_settle_first_creation_missions_retries_after_a_transient_write_failure`
against the unfixed code (failed as expected), then fixed it: tracking
switched to `missions_settled_players: dict[str, set[str]]` (per room, per
player), so a call only skips players who already succeeded, and a later
retry (any future call to `on_match_finished`, from wherever) can still
recover a player whose earlier write failed. Added the matching
`missions_settled_players.pop(room_id, None)` to room cleanup, mirroring
the existing `analytics_recorded_matches.discard(room_id)` there.

Verification: `python -m pytest -q` — 406 passed (was 399, +7 new tests),
1 skipped. `python -m compileall -q jjk_arena web run_server.py` and
`node --check` on the modified JS both clean. Each of the 6 fixes was
confirmed to actually change behavior by running its new test against a
`git stash`-reverted copy of the fixed file first (fails), then restoring
the fix (passes) — not just trusting the test's own logic.

Committed (`4d39188`) and pushed directly to `main`.

## 2026-07-16 - Ran and closed the real "1,000 matches, bounded memory" soak gate

Ran `python -m jjk_arena.battle_v2.lifecycle_stress --matches 1000 --seed 1`
for real, in a fresh subprocess, to settle the soak-test question the
external audit raised and I'd deferred rather than guess on. `psutil`
wasn't installed (neither is the stdlib `resource`, which doesn't exist
on Windows) and wasn't a declared dependency anywhere, so the harness's
own RSS check had been silently no-op-ing this whole time on this
machine. Installed `psutil` (small, cross-platform, already the
harness's own documented fallback — not a heavyweight add like
Playwright) and re-ran.

Real result, first run: **887 MB RSS against a documented 400 MB
ceiling — genuinely over**, but the audit's other claim (">5 minutes,
never terminates") was wrong: it completed in 75.5s. Softlocks: 0 across
all 1,000 randomized matches (clean_finish, disconnect_reconnect,
disconnect_forfeit, rematch_spam, code_reuse_race) — the actual PvP
lifecycle invariants (no double-match-membership, no orphaned rooms,
idempotent rematch, clean resume) all held. So the correctness half of
this exit gate was already solid; only the memory half genuinely failed.

Root-caused rather than assumed: instrumented `socketio.server.environ`
and `SocketIOTestClient.clients` directly around a 200-match batch with
every client explicitly `.disconnect()`ed. Both retained 530 entries
after — `gc.collect()` didn't touch them. Read the actual
`flask-socketio`/`python-socketio` source to find why:
`SocketIOTestClient.disconnect()` (`flask_socketio/test_client.py`) only
replays a Socket.IO-level DISCONNECT packet through
`_handle_eio_message`; it never reaches `python-socketio`'s
`Server._handle_eio_disconnect`, which is the *only* place
`self.environ.pop(eio_sid, None)` happens (`socketio/server.py:681`) —
that handler is wired to the real Engine.IO transport's own `disconnect`
event (`base_server.py:37`), which only a genuine transport close fires.
The class-level `SocketIOTestClient.clients` registry (added at connect,
line `test_client.py:82`) has the identical gap and is the bigger
contributor of the two, since it retains whole client objects (queues,
`socketio`/`app` references), not just small WSGI environ dicts.

Confirmed this is a **test-harness-only artifact, not a production
leak**: a real WebSocket disconnect goes through the actual transport
close and does fire the handler that cleans `environ` up correctly. It
only affects `lifecycle_stress.py`'s own use of `SocketIOTestClient` to
simulate 1,000 matches' worth of connections.

Fixed with a `_fully_disconnect_client()` helper in
`jjk_arena/battle_v2/lifecycle_stress.py` that disconnects a client and
then explicitly pops it from both leaked structures, used at the one
call site that previously just called `client.disconnect()`. Added
`test_lifecycle_stress_batch_does_not_leak_socketio_test_client_state`
(`tests/test_battle_v2_lifecycle_stress.py`) asserting both structures
don't grow across a 200-match batch — confirmed it fails against the
pre-fix file via `git stash` (grew by 502) before restoring the fix.
Declared `psutil` in `requirements-dev.txt` with a comment explaining
why, so this gate can't silently no-op again for the next person running
it, on Windows or in a `resource`-less CI image.

Re-ran the full 1,000-match batch with the fix: **83.5 MB RSS** — over a
10x reduction, comfortably under the 400 MB ceiling, still 0 softlocks,
scheduler thread still cleanly stopped. The "1,000 matches, 0 softlocks,
bounded memory" exit gate is now genuinely, verifiably closed, not just
declared closed.

Verification: `python -m pytest -q` — 407 passed (was 406, +1), 1
skipped. `python -m compileall -q jjk_arena web run_server.py` clean.

Committed (`a441c05`) and pushed directly to `main`.

## 2026-07-16 - UI unification: brought Lobby, Draft, First Creation, Mission Map, Records, and Result onto Combat's visual language

Since PR #56 merged, the app had looked like two products: Combat/Queue
Review on the new "Underpass Courtyard" angular dossier-plate language,
everything else still on the old rounded-panel `cardPanel`/circular-
`portrait`/`topBar` language. Used plan mode to scope this properly before
touching code, given the size (7 files) and a real architecture question:
whether to reuse anything from the closed PR #54 ("Cursed Arena"). Two
Explore agents confirmed PR #54 is a dead end — its token file uses
entirely different key names (`ink950`, `curse600`...) than what main's
`runtime-config.js` `COLORS` pipeline actually reads (`voidBlack`,
`selectionGold`, `domainViolet`...), so swapping it in would silently
break every `COLORS.*` lookup Combat's shipped code depends on; and its
`components/plate.js` blade-cut geometry is a different shape/press-state
system than the inline polygons Combat draws itself. Chose instead to
extract Combat's own private rendering primitives into the shared
`base-scene.js` and rebuild the other 6 scenes on those.

Added 10 new primitives to `web/static/phaser/scenes/base-scene.js`,
generalized from patterns Combat draws privately inline (`cutRectPoints`,
`platePanel`, `worldBackdrop`, `renderAmbientParticles`, `dossierHeader`,
`platePortrait`, `dossierTag`, `dossierSheet`, `railLabel`,
`progressRail`) — all additive; the old rounded primitives
(`drawAppBg`/`cardPanel`/`topBar`/`portrait`/`talismanLabel`) stay because
`boot-scene.js` still calls `drawAppBg` directly and was kept out of scope.
`combat-scene.js`/`combat-queue-review-scene.js` were never modified
(confirmed via `git diff` afterward: byte-identical except the shared
version-bump import lines) — they're the reference implementation these
primitives were generalized *from*, read-only throughout.

Rebuilt in the plan's staged order, verifying each live in real Chrome
before starting the next (the sandboxed Browser-pane preview still can't
render Phaser here — same `document.hidden` issue as the PR #54
investigation — so used `claude-in-chrome` with the same one-line
visibility-unfreeze patch each time):

1. **Lobby** (pilot) — proved the primitives read correctly on a real
   non-combat screen before investing further.
2. **`draft-roster-scene.js` (shared mixin) + `draft-scene.js` together**
   — the mixin isn't independently routable, so it shipped with its first
   real consumer. `renderCharacterDetailSheet` rebuilt on the new
   `dossierSheet` primitive — verified live (tapped a starter roster card,
   confirmed the full dossier sheet renders and its close button/Add-to-
   Trio button both work).
3. **First Creation** — trio slots, preset tiles, mission-progress rail.
4. **Mission Map** — mission cards, locked-routes placeholder (freely
   restyled since it's hardcoded content with no store data).
5. **Records** — W/L hero, stat tiles, record rows.
6. **Result** — the one requiring the most care: preserved the
   win/loss/draw/no_contest outcome-derivation branching fixed earlier
   this session byte-for-byte (confirmed via `git diff` — only drawing
   calls changed, zero logic lines touched) and verified all four outcome
   states live by injecting synthetic `store.state` in the console
   (had to disconnect the socket client first each time — a live CPU
   match's async `battle_v2_update` broadcast kept overwriting the
   synthetic state mid-test, unrelated to this change, just leftover
   traffic from earlier verification passes in the same browser tab).

Version bumped once for the whole pass (not per file, per the plan's own
warning about `?v=NN` skew): `SHELL_VERSION` in `phaser-shell.js` and
every `?v=17` → `?v=18` across all Phaser JS files plus the two
`<script>` tags in `index.html`. This tripped two tests in
`tests/test_app.py` that hardcode the literal `?v=17` string — fixed by
bumping those same literals, not a real regression (confirmed by reading
the failure: a plain string-literal mismatch, nothing behavioral).

Verification: `python -m pytest -q` — 407 passed (up from 406 pre-bump;
briefly 405 with 2 failures until the version-literal tests were fixed),
1 skipped. `python -m compileall -q jjk_arena web run_server.py` and
`node --check` across every touched JS file both clean. Every scene
click-tested live (buttons, pagers, roster card taps, the character
detail sheet) with zero new console errors at each step.

Committed (`93d8217`) and pushed directly to `main`. Remaining, deliberately
out of scope for this pass per the plan's non-goals: `boot-scene.js`'s
splash screen (still needs the old primitives), new environment art for
the 6 rebuilt scenes (all use `worldBackdrop`'s gradient-fallback path,
same as Combat falls back to), and the dual condition-grammar / soak-test
production-scaling items noted in earlier entries.

## 2026-07-16 - UI unification: boot splash gets the dossier treatment

Closed the one deliberate gap left by the prior pass. Rewrote
`renderBootSplash()` in `web/static/phaser/scenes/boot-scene.js` to use the
same shared primitives added to `base-scene.js` for the 6-scene
unification, instead of the old `drawAppBg`: background now goes through
`worldBackdrop(frame, { textureKey: null, ambient: 'motes' })`; the
"CURSED CLASH" seal is now an angular cut-corner plate via
`cutRectPoints`/`fillPoints`/`strokePoints` with a `fillTriangle` red
corner accent (replacing the old rounded seal shape); the loading meter
now uses `progressRail` instead of a hand-drawn bar. Left `preload()`,
`create()`, `enterLobby()`, the concentric-circle/radiating-spoke motif,
and the auto-transition timing completely untouched — this was a drawing-
layer swap only, same pattern as Result's rebuild in the prior entry.

Version bumped once more for this pass, `?v=18` → `?v=19` across every
Phaser JS file, `SHELL_VERSION`, and the two `index.html` `<script>` tags
(same lockstep convention), since the app had been open in a real browser
long enough during the prior pass's verification that a stale `?v=18`
cache was a real risk. This tripped the same class of test-literal
mismatch as last time — 8 hardcoded `?v=18` assertions in
`tests/test_app.py` — fixed by bumping those literals to `?v=19`, again a
plain string-match fix, not a behavioral regression.

Verified live in real Chrome (`claude-in-chrome`, since the sandboxed
Browser-pane still can't render Phaser — same `document.hidden` freeze as
every prior pass). The splash auto-transitions to Lobby ~1s after boot, so
a plain navigate+screenshot missed it on the first attempt; second attempt
used `game.scene.stop('LobbyScene')` + `game.scene.start('BootScene')` +
a monkey-patched no-op `enterLobby` to hold the splash still for a clean
screenshot. Confirmed the new angular seal plate, red triangular corner
accent, and flat `progressRail` progress bar all render correctly with
zero console errors. Separately re-verified the *untouched* normal flow
end-to-end: a fresh page load with no console overrides landed on
`LobbyScene` after a 2s wait, confirming the real auto-transition timing
still fires normally now that the drawing code changed.

Verification: `python -m pytest -q` — 407 passed, 1 skipped (test count
unchanged from the prior entry; only the `?v=19` literals moved).
`python -m compileall -q jjk_arena web run_server.py` and `node --check`
on `boot-scene.js` both clean.

## 2026-07-16 - Legibility, layout-overflow, and portrait-art pass

User feedback: "the ui is impractical unreadable and too dark, borderline
doesn't look like a game." Diagnosed live (real Chrome) and in code before
touching anything, per plan mode — not a Phaser limitation, three
independent root causes in this codebase's own token/scene choices:

1. A genuine layout-overflow bug in `draft-scene.js`, not just an
   aesthetic complaint: at real short viewport heights, the "Prev/Next"
   pager and "Ignite Battle" CTA visually overlapped the roster cards. It
   stacked fixed pixel `y +=` offsets regardless of `frame.height`, unlike
   `combat-scene.js`, which budgets against `frame.height` via
   `layout-service.js`. No scroll/mask primitive exists anywhere in the
   codebase.
2. Pervasive tiny text: 94 of 155 literal `fontSize:` values across every
   scene (including `combat-scene.js` itself) were ≤9px, several as small
   as 6px (`dossierHeader`'s eyebrow, `dossierTag`/`costPips`/`railLabel`
   defaults). `COLORS.dim` (`#6F675A`) measured ~3.75:1 contrast against
   the near-black backgrounds it sat on — below WCAG AA's 4.5:1 minimum.
3. 12 of the 19 First Creation starters had no portrait art at all and
   silently fell back to a plain initials-in-a-box tile. The 7 existing
   portraits turned out to be simple procedural SVGs (radial gradient +
   silhouette + glowing monogram + name label), not licensed art, so
   generating 12 more in the same style was achievable this pass — unlike
   environment art, which stays out of scope for lack of real assets.

Mid-investigation, an Explore agent (run without an explicit path
override) reported the OLD pre-unification shape of `base-scene.js` —
it had defaulted to this session's own stale worktree
(`.claude/worktrees/hungry-kapitsa-3a5188`, still on branch
`claude/where-are-we-a5ac4a` at the pre-merge commit), not the root
checkout on `main`. Caught by cross-checking `git log`/`git branch`
directly in both locations before trusting the report — the same class of
mistake flagged earlier this session, now doubly confirmed as a recurring
trap. All further work targeted the root checkout explicitly.

**Fixes, same visual identity throughout (gold/teal/violet dossier
palette, angular cut corners) — not a redesign:**

- `web/static/phaser-design-tokens.js`: brightened `textDim` from
  `#6F675A` (3.75:1) to `#8C8371` (~5.5:1, computed via the WCAG relative-
  luminance formula, not eyeballed); nudged `voidBlack`/`inkBlack`/
  `surfaceDeep` up slightly for gradient depth. Cascades automatically
  through `runtime-config.js`'s `COLORS` derivation.
- `base-scene.js`: removed `dossierHeader`'s 6px eyebrow branch (floored
  at 10px); raised `dossierTag`/`costPips`/`railLabel` defaults from 7px
  to 9-10px; widened `dossierTag`'s chip-width formula to match.
- Swept literal 6-9px `fontSize` values up to a 9-10px floor across every
  scene file. Combat's own HUD (68px header, tiny energy-meter/queue-slot
  circles) got a more conservative bump (6→7/8px, 7→9px) to avoid
  introducing new collisions in its already-tight, already-shipped
  layout — verified live afterward with zero new overlaps.
- Rebuilt `draft-scene.js`'s `render()` to budget against `frame.height`
  bottom-up (footer/nav reserved first, roster-grid row count derived
  from whatever space is actually left) instead of fixed summed offsets —
  this is what actually fixes the overlap. Found and fixed a second,
  related bug while doing this: `renderRosterCard`'s own internal content
  (in `draft-roster-scene.js`) uses fixed offsets up to ~86px regardless
  of the `h` it's given, so an earlier version of this fix that shrank
  card height to fit tight spaces caused the card's own skill-preview
  text to spill out past its drawn edge. Fixed by never shrinking card
  height below its safe minimum (90px) and instead adding an
  `ultraCompact` tier (`frame.height < 700`) that drops the mission-
  preview panel first to free real space — verified clean at both a
  638px and a 932px (frame-patched) height, CPU and PvP mode both.
- Auditing the other scenes at short viewport height caught a real,
  pre-existing overlap in `mission-map-scene.js`: fixed 142px mission
  cards put the "RECOMMENDED TEAM" label only 1px below the second
  objective line. Fixed by growing card height to 190px (row spacing to
  204px) — arithmetic checked against both compact (1 card/page) and
  spacious (2 cards/page) heights before landing on the number.
- Generated 12 new procedural portrait SVGs (`web/static/assets/
  portraits/`) matching the existing style, for `junpei_yoshino`,
  `kasumi_miwa`, `kokichi_muta_mechamaru`, `mai_zenin`, `mei_mei_young`,
  `momo_nishimiya`, `noritoshi_kamo`, `panda`, `shoko_ieiri_young`,
  `suguru_geto_young`, `toge_inumaki`, `utahime_iori_young`, each with a
  distinct thematic color. Registered them in `runtime-config.js`'s
  `LOCAL_PORTRAIT_FILES` set (their filenames already match
  `portraitFileFor()`'s default fallback pattern, so `roster.js` needed
  no changes). This surfaced a genuine, previously-invisible engine
  limit: Phaser's Loader silently stalled at exactly 32/39 queued assets
  (`scene.load.totalComplete`/`totalToLoad`, 0 reported failures) once
  the portrait count crossed Phaser's default `maxParallelDownloads: 32`
  — the 7-portrait roster never exercised this before. Fixed by setting
  `loader: { maxParallelDownloads: 64 }` in the `Phaser.Game` config
  (`web/static/phaser/legacy-shell.js`). Confirmed all 39/39 assets now
  load and all 19 First Creation characters render real portrait art
  instead of initials fallbacks.

Version bumped `?v=19` → `?v=20` in the usual lockstep (every Phaser file,
`SHELL_VERSION`, both `index.html` script tags); fixed the resulting stale
`?v=19` literals in `tests/test_app.py` (same recurring class of fix as
the two prior version bumps this session).

Verification: `python -m pytest -q` — 407 passed, 1 skipped (unchanged
count; no server-side logic touched). `python -m compileall -q jjk_arena
web run_server.py` and `node --check` on every touched JS file clean.
Live-verified in real Chrome across Lobby, Draft (CPU and PvP mode),
Combat, Queue Review, Skill Detail sheet, Mission Map, Records, and
Result at this environment's real ~638-695px window plus a frame-patched
932px simulation — zero overlaps, zero console errors throughout the
whole pass (checked via `read_console_messages` after the final reload).

## 2026-07-16/17 - Full visual rethink: type scale, color discipline, decluttering

User feedback after the prior pass, seen at true 1:1 scale (not the zoomed
screenshots shown before, which made text look ~25% bigger than it
actually renders): still "barely readable" and "ugly." A fair miss — the
prior pass's 9-10px floor is still below real mobile UI minimums (13-16px
for body text), and it never addressed density/hierarchy, only size.
Asked the user how far to go; chose "full visual rethink" over
incremental cleanup.

Read `combat-scene.js` in full for the first time this session (previously
only seen in font-size-line snippets). Key finding that shaped the plan:
Combat's density is functionally justified — a live tactical HUD showing
turn state, legal targets, queued actions, cooldowns — and its color
usage (`selection`=active-turn, `enemy`=hostile, `ally`=player,
`queued`=already-queued, `target`=legal-target) is already state-driven,
not arbitrary. The "arbitrary color per box" problem was much more true
of the 6 management screens, which tinted nav buttons/panels with
different accent colors for no reason tied to state. Also confirmed
`jjk-tokens.css`/`jjk-theme.css`/`arena-redesign.css` (flagged by an
earlier stale-worktree agent report as a "richer DOM token system") **are
not even linked in `index.html`** — dead files, irrelevant; the Phaser
canvas token system is the only one that matters.

Planned via EnterPlanMode: touch the 6 management screens for real
(structural declutter, not just bigger numbers) while treating Combat/
Queue Review conservatively (font-size push + trim one decorative field,
no structural change) — the one screen CLAUDE.md protects from casual
changes and whose density is earned by representing real game state.

**New design-system foundation** (`web/static/phaser/core/
runtime-config.js`, `base-scene.js`): added a `TYPE_SCALE` export
(`micro:10, label:12, body:14, subtitle:16, title:20, display:28`) —
`micro` is the only tier below 12px, reserved for single-glyph badges in
small fixed chips. Wired it into `base-scene.js`'s primitive defaults
(`text()`, `mono()`, `button()`, `railLabel`, `dossierTag`,
`dossierHeader`'s eyebrow, `dossierSheet`'s eyebrow, `costPips`) so every
scene inherits the floor automatically. Also established a font-family
rule: real readable copy (descriptions, list rows) now uses the sans
`text()` body font instead of monospace `mono()` — mono stays reserved
for short all-caps tags/labels/numeric readouts, addressing a real
contributor to the "spec-sheet, not a game" read (almost everything had
been monospace).

**Pilot: `lobby-scene.js`**, rebuilt with the new type scale + a color
discipline (Quick Play is the only gold/primary-CTA element on the
screen; every other button defaults to a neutral `COLORS.line` outline
instead of a different bright accent each). Screenshotted at true 1:1
scale and shown to the user for explicit confirmation before touching any
other scene — the built-in checkpoint this plan added specifically
because two prior guesses on this exact complaint had already missed.
User confirmed to continue.

**Remaining 5 management scenes** (`draft-scene.js` +
`draft-roster-scene.js` mixin, `first-creation-scene.js`,
`mission-map-scene.js`, `records-scene.js`, `result-scene.js`) rebuilt
with the same discipline, one at a time, verified live. Found and fixed
three more real bugs along the way (not just resizing text):
- `draft-roster-scene.js`'s `renderRosterCard`/`renderStarterRosterCard`
  needed taller cards for the bigger fonts (90→100px, 80→100-104px) —
  propagated into both `draft-scene.js`'s and `first-creation-scene.js`'s
  roster-grid math, which both already used the bottom-up frame-budget
  pattern from the prior pass.
- `first-creation-scene.js`'s `renderPresetTile` put a wide "USE
  PRESET"/"ACTIVE TRIO" chip beside 3 portraits in a tile too narrow to
  fit both without overlap — restacked the chip onto its own row below
  the portraits instead of cramming them side by side, and added the
  same `ultraCompact` (`frame.height < 700`) tier as Draft (drops the
  presets section first) since First Creation stacks even more content
  than Draft above its roster grid.
- `mission-map-scene.js`'s mission-card tone simplified from
  `talismanDim` to neutral `COLORS.line` for non-featured cards, matching
  the "reserve bright color for the one meaningful thing" rule.
`result-scene.js`'s outcome-derivation logic (win/loss/draw/no_contest)
confirmed byte-identical via `git diff` — only drawing calls below it
changed; also swapped which button gets the gold treatment (Rematch, the
real primary action on a result screen, instead of Lobby).

**Combat/Queue Review conservative pass**: pushed already-bumped 7-9px
sizes up one more step (8-11px depending on context, tiny geometry-
constrained badges like energy-pip letters and queue-chip glyphs get the
smallest bump), and deleted the purely decorative `'22:47 / HEAVY RAIN'`
clock/weather line from the top HUD to reclaim space. While verifying
this live, found and fixed a genuine pre-existing layout bug unrelated to
font sizes: `combatLayout()`'s `allyY` (`dockY - cardH - 28`) could land
above `fieldTop`'s tactical-directive panel bottom at short viewports
where `dockH` clamps to its minimum, so the "TACTICAL DIRECTIVE / Choose
technique" panel visibly overlapped the ally fighter row. Fixed with a
one-line floor: `allyY = Math.max(fieldTop + 46, dockY - cardH - 28)` —
verified it doesn't change `allyY` at all at taller heights (the original
value already wins there) and closes the overlap at short ones.

Version bumped `?v=20` → `?v=21` in the usual lockstep; fixed the
resulting stale `?v=20` literals in `tests/test_app.py` (same recurring
fix as every prior version bump this session).

Verification: `python -m pytest -q` — 407 passed, 1 skipped (unchanged;
no server-side logic touched — `result-scene.js`'s outcome derivation
confirmed untouched via diff). `python -m compileall -q jjk_arena web
run_server.py` and `node --check` on every touched file clean. Live-
verified every rebuilt scene in real Chrome, including real interactive
flows (queueing 3 actions through actual button clicks, opening Queue
Review, injecting a synthetic Victory result) rather than only static
screenshots — zero overlaps, zero console errors on final reload.

## 2026-07-17 — Effective Hard outcomes, durable mission settlement, canonical contracts, and current mobile QA

**What changed.** Hard CPU lethal evaluation now dry-runs each legal harmful
candidate through the authoritative resolver on a deep clone. The clone removes
opponent-owned unrevealed invisible statuses before resolution, preserving the
same information boundary as a human viewer. Scoring uses actual HP damage,
destructible-defense consumption, deaths, and statuses applied after aggregate
DR, invulnerability, anti-domain conversion, every effect, and the shipping
condition grammar. Soul/piercing heuristic premiums no longer become fake HP
damage for lethal checks.

Mission progress now enters a SQLite `mission_settlement_outbox` keyed by
`match_id + player_id` before merge. Rows persist the terminal progression
snapshot and transition through `pending`, `failed_retryable`, and `settled`
with retry count, next attempt, and last error. Immediate settlement, startup
recovery, and periodic runtime maintenance all drain due rows without requiring
the source room; profile merge and mission analytics remain idempotent.
Runtime schema is version 5.

The root/battle instructions, `CODEX_PROJECT_MEMORY.md`, damage-reduction and
anti-domain decision records, socket contract, kit grammar, and skill-audit
contract now agree: fixed DR is a player-turn aggregate budget and anti-domain
uses universal sure-hit conversion. `tests/test_canonical_decisions.py` rejects
the stale open-decision markers. First Creation formally adopts the typed
`EffectSpec.payload` condition/payoff DSL in `effect_payload.py`; all 18 used
keys are registered and every one of the 78 skills is schema-validated.

Meaningful Phaser text literals below 10 px were raised to a 10 px floor without
changing scene architecture. Eighteen live PNGs were captured under
`artifacts/ui-redesign/current/`: Lobby, Draft, First Creation, Mission Map,
Combat, and Records at 360x800, 390x844, and 430x932. The browser console had
zero warnings/errors. A later attempt to add a fresh Queue Review capture hit a
browser screenshot timeout twice; the six-screen/three-viewport set is intact,
but Queue Review and Result were not recaptured in this pass.

**Verification actually run.** Final full suite: `411 passed, 1 skipped` in
normal order and `411 passed, 1 skipped` with test files in reverse order.
`python -m compileall -q jjk_arena web/app.py`, `node --check` for every Phaser
JavaScript module, `git diff --check`, and the First Creation audit all passed;
the audit reports 19 characters, 78 skills, 0 structural findings, 0 uncovered
special mechanics, 18 registered conditional keys, and 0 unregistered keys.
The adversarial CPU corpus covers 25 normal into a 50 shield, aggregate 10 DR,
combined two-hit lethal, non-lethal piercing, invulnerability, anti-domain
conversion, and condition-gated status application. The durable-outbox test
fails a merge, recreates `SQLiteRuntimeStore`, advances to the due time, and
then settles the preserved snapshot successfully.

`python -m jjk_arena.battle_v2.lifecycle_stress --matches 1000 --seed 1`
completed 1,000 matches in 98.04 seconds with 0 softlocks, 0 final rooms,
83,480,576-byte RSS under the 419,430,400-byte ceiling, one scheduler worker
during the run, and 0 scheduler worker threads after shutdown.

**Remaining cautions / delivery state.** No balance numbers, characters,
progression tiers, screens, art, audio, or layouts changed. Queue Review and
Result still need current-revision screenshots if a complete ten-screen visual
release pack is required. Changes and QA artifacts were committed locally on
`codex/close-alpha-contracts`; the branch was not pushed and no PR was opened.

## 2026-07-17 — Partial-queue CPU planning, atomic settlement claims, terminal simulation, and three-state mobile QA

**What changed.** Hard CPU planning now resolves a viewer-safe clone of the
partial queue before evaluating each later candidate. It predicts prior HP and
defense damage, deaths, status/control application, ally and caster damage,
healing, defense gains, and energy opportunity cost. Dead predicted targets
are excluded, and the final queue's at most six left-to-right permutations are
scored after selection. Easy and Normal no longer award offensive or lethal
value to `target=self` damage. Regressions cover Yuji killing a 10-HP target
before Nobara and Megumi retarget living enemies, and 5-HP Toge selecting
Throat Medicine instead of a non-lethal suicidal Blast Away.

Mission settlement schema 6 adds transactional `processing` claims with claim
tokens, retry leases, terminal `dead_letter`, settled-row retention, status
counts, and claimed/dead-letter operational counters. Initial SQLite enqueue
failure writes an fsync'd JSONL sidecar which startup/maintenance restores.
Terminal room cleanup reconstructs every missing human-player snapshot first
and refuses cleanup if neither durable path succeeds. Concurrent-store and
fallback/restart regressions prove a handler is invoked once and a failed
initial enqueue remains recoverable.

Headless simulation now loops on `result_type`, records explicit `WIN`, `DRAW`,
`NO_CONTEST`, and `TURN_CAP`, and has deterministic winnerless DRAW and
NO_CONTEST exit regressions. The First Creation roster dossier bounds its role
line and preserves full skill names over two lines without changing the scene
architecture.

**Visual QA.** Queue Review, Skill Detail, and Result were captured under
`artifacts/visual_qa/current/` at exact 360x800, 390x844, and 430x932. The
in-app browser's Engine.IO proxy repeatedly produced unknown-SID POSTs against
the local Werkzeug server, although a direct Socket.IO client connected
successfully. The documented browser developer interface therefore injected
temporary in-memory store state for these captures; no server data or source
file was changed by the injection. The capture backend returned 843/931 rows
for the taller viewports, so those six files were mechanically padded with one
background row at the bottom; rendered game content is unchanged. The browser
skill directly influenced this pass by enforcing exact viewport checks and
live inspection of the dossier overflow correction.

**Verification actually run.** Final full pytest passed in normal order and
reverse file order: **420 passed, 1 skipped** in both. Targeted settlement,
CPU, simulation, socket/production tests passed. Both independent lifecycle
soaks completed 1,000 matches with zero softlocks and zero final rooms: seed 1
in 130.44 s at 84,357,120-byte RSS, seed 2 in 131.89 s at 85,692,416-byte RSS;
both remained below the 419,430,400-byte ceiling and left zero scheduler worker
threads after shutdown. `python -m compileall -q jjk_arena web/app.py`,
`node --check web/static/phaser/scenes/draft-roster-scene.js`, the 19-character
/ 78-skill audit, and `git diff --check` passed. The final visual files were
dimension-checked programmatically.

**Remaining cautions / delivery state.** No character, balance number,
progression tier, art, audio, or screen was added. Browser captures use
temporary QA state rather than a live Socket.IO match for the documented proxy
reason above. The worktree remains on local `main`, based on `832b0be`; changes
and the nine intentional QA PNGs are not committed or pushed in this pass.

## 2026-07-17 - Pre-publish hardening, replay integrity, prompt settlement recovery, and safe-area mobile contracts

**What changed.** The pre-publish adversarial review closed the remaining
cross-layer correctness gaps without changing the locked combat rules, First
Creation roster, character balance, or progression tiers. Hard CPU planning
now resolves viewer-safe partial queues without running turn cleanup between
actions, preserves aggregate damage-reduction and status clocks, retargets
after predicted deaths, and scores final left-to-right orderings through the
authoritative resolver. Simulation and balance output use distinct `WIN`,
`DRAW`, `NO_CONTEST`, and `TURN_CAP` results. Replay captures now persist the
normalized Easy/Normal/Hard CPU policy and reconstruction restores it before a
`cpu_turn`; missing format-v2 difficulty remains Normal-compatible and invalid
values fail closed.

Mission settlement schema 6 now supports direct deployed schema-4 and
intermediate schema-5 upgrades. One-row expiring leases provide documented
at-least-once ownership; operational failures retry indefinitely with capped
backoff, malformed snapshots dead-letter for explicit redrive, and stale
workers cannot report unguarded commits. Production profile, immutable mission
analytics, and outbox settlement commit in one SQLite transaction. The fsync'd
0600 JSONL fallback remains single-worker only. Stable finish timestamps keep
newer starter-team choices while correcting chronological first-completion
time. A separate in-memory durable-snapshot guard promptly reconstructs total
or partial DB-plus-sidecar write failures from finished updates, relevant
profile reads, and bounded maintenance, without duplicate fallback appends or
mission credit; cleanup refuses to delete a room until every human snapshot is
durable.

The kit grammar now states the exact locked 19-character / 78-skill First
Creation roster. Phaser cache references are consistently version 22. Shared
headers, HUD, sheets, roster grids, queue review, and footer actions consume
safe top/bottom insets; scoped controls expose at least 44x44 hit targets; full
roles and skill names wrap instead of being pre-truncated. Geometry checks
cover normal and 47px-top/34px-bottom safe frames at 360x800, 390x844, and
430x932, including the required 2/2/4 First Creation entries per page. The nine
Queue Review / Skill Detail / Result images were normalized to real PNGs and
moved under `artifacts/visual_qa/pre-remediation/`. The earlier 18-screen
six-scene set was moved to `artifacts/ui-redesign/pre-hardening-d250917/`.
Both `current/` directories contain no screenshot and make no post-fix visual
claim.

**Verification actually run.** Full pytest passed in normal order and reverse
test-file order: **451 passed, 1 skipped** in both runs. The successful runs
used isolated workspace databases and base-temp directories; the temporary
directory was removed afterward. `python -m compileall -q jjk_arena web/app.py`,
`node --check` for all 21 changed production JavaScript files plus the QA-state
fixture, and `git diff --check` passed. The First Creation audit reports 19
characters, 78 skills, 0 structural findings, 0 special-mechanic coverage
gaps, 18 registered conditional keys, and 0 unregistered keys. All nine
27 historical QA files have valid PNG signatures and exact declared
dimensions; the current-evidence directories have zero screenshots. A
1,000-match lifecycle
stress run (seed 3) finished in 152.22 seconds with 0 softlocks, 0 final rooms,
one scheduler worker during the run, and none after shutdown; RSS was
unavailable for that run and is not claimed.

**Remaining cautions / delivery state.** Fresh post-remediation browser
captures remain pending because the in-app browser security policy rejected
the required localhost reload after the cache bump and explicitly prohibited
retry or alternate browser-control workarounds; no workaround was attempted.
This supersedes preceding entries' claims that either former `current/`
capture set is current evidence. The implementation and verification pass was
committed as `b7bf729` on `codex/close-alpha-hardening`, pushed to `origin`,
and opened as draft PR
`https://github.com/DylanElo/FantasyDraft/pull/57`. This documentation-only
delivery-state correction follows on the same branch and PR.

## 2026-07-17 - Fresh mobile evidence and screenshot-driven compact-layout fixes

**Locked decisions and invariants touched.** This pass stayed UI-only. It did
not change combat rules, authoritative server fields, the 19-character First
Creation roster, balance, progression, or hidden-information behavior. It
enforced the mobile constitution's full primary-name, 44px touch-target,
non-overlap, safe-viewport, and progressive-disclosure requirements. Synthetic
battle states remained browser-local and emitted no socket command.

**What changed.** Live 360x800 and 390x844 review exposed issues that geometry
tests had not made visually obvious. Draft team summaries still used three
narrow portrait columns and pre-truncated long names, so they now use two
full-width, three-row ally/CPU summaries that preserve every selected name.
Combat fighter plates no longer call `shortText` for primary names; names wrap
over two lines while HP moves into its own lower band. The compact fighter
hitbox's unused top expansion was reduced by six pixels, removing a four-pixel
overlap between the third enemy target and Transmute at 360x800. Regression
assertions lock all three corrections. The QA fixture now seeds Young Gojo,
Young Geto, and Young Shoko so long-name behavior remains reproducible.

Fresh screenshots now cover Lobby, Draft, First Creation roster, First
Creation detail, Mission Map, Combat planning, Queue Review, Skill Detail,
Result, and Records at 360x800, 390x844, and 430x932. The 30 unique PNGs live
under `artifacts/ui-redesign/current/` (18) and
`artifacts/visual_qa/current/` (12). Their source revision is
`cb38012b5c5c07854781d04028120a5ed2da6163`. Historical captures remain in the
two labeled pre-hardening directories.

**Visual QA.** Every capture used one authenticated in-app-browser localhost
tab, Phaser cache v22, deterministic in-memory state, exact viewport/canvas
checks, and a compositor-settled frame. All registered controls were at least
44x44 CSS pixels, stayed inside the viewport, and had no non-modal overlap.
The intentional full-screen modal catcher rectangles were excluded from the
pairwise overlap failure. Browser warnings/errors were empty. Contact-sheet
and original-size review confirmed all ten states at all three viewports.
360x800 and 430x932 compositor frames were normalized from device pixels to
CSS pixels. The native 390x844 API returned 390x843, so the final PNG adds one
background row below safe content; no game content was cropped or stretched.

**Verification actually run.** Full pytest passed: **451 passed, 1 skipped**
in 109.97 seconds. Focused mobile-layout tests passed: **3 passed**. `python -m
compileall -q jjk_arena web/app.py`, `node --check` for the two changed Phaser
scenes and QA fixture, and `git diff --check` passed. All 30 current screenshots
have real PNG signatures and exact declared dimensions. The final capture
inventory is six core plus four interaction states at each of the three target
viewports.

**Remaining cautions / delivery state.** The screenshot fixture is
presentation-only and does not prove a live Socket.IO match flow; gameplay and
socket behavior remain covered by the full automated suite. The source fixes
were committed as `cb38012`; the evidence pack was committed as `7cdb75d`.
Both were pushed on `codex/close-alpha-hardening`. PR #57 was open, mergeable,
and changed from draft to ready for review on the pushed evidence SHA. Its
description now lists the 30 current screenshots and compact-layout fixes. At
the readiness check it had no configured/reported checks, comments, reviews,
or unresolved review threads. This delivery-state sentence is a docs-only
follow-up on the same branch and PR.

## 2026-07-17 - Culling Current bright UI concept exploration

**User direction and scope.** The user rejected the current UI's darkness,
assets, structure, and color scheme and asked for a more artistic direction
inspired by Jujutsu Kaisen Season 3, with Clash Royale and Subway Surfers City
as the available mobile-game references. This pass is concept-only: it changes
no Phaser code, server field, combat rule, balance number, progression rule,
roster entry, or shipping asset.

**Concept output.** A 70/30 direction was explored: bright, character-led,
kinetic urban anime presentation supported by tactile mobile-game hierarchy.
The resulting `Culling Current` set lives under
`artifacts/ui-redesign/concepts/culling-current/`: a 1672x941 visual-direction
board plus 853x1844 Home and Combat concepts whose aspect ratio closely matches
390x844. The Home concept uses a large active-trio hero, light city scenery,
one dominant battle CTA, secondary mode cards, and labeled navigation. Combat
preserves three enemies, three allies, four visible skills, four core-energy
types, targeting feedback, and Queue Review while opening most of the screen to
a bright rooftop battlefield. Exact built-in generation prompts are recorded
beside the images in `PROMPTS.md`.

**Locked decisions and verification.** Portrait-first layout, 3v3 readability,
four core energies, server authority, thumb-reachable controls, and the lower
command dock remain concept invariants. The three PNGs were visually inspected
and validated with Pillow as real RGB PNGs at their recorded dimensions. No
automated gameplay or JavaScript checks were run because no production code
changed.

**Canonical conflict and delivery state.** The user's new direction conflicts
with the dark Ink + Talisman visual language still prescribed by
`docs/CODEX_PROJECT_MEMORY.md`, `docs/mobile_phaser_ui_ux_brief.md`, and the
Phaser `AGENTS.md`. The concepts therefore do not silently replace canonical
design. Production implementation must wait for explicit concept approval,
then update those visual-direction sections in a focused UI-design pass while
preserving their usability and server-parity rules. Character imagery is
concept art, not licensed shipping art. The assets and this history entry are
uncommitted; no PR was opened.

## 2026-07-17 - Culling Current Home and Combat production vertical slice

**Locked decisions and scope.** The user approved the bright Culling Current
direction, superseding the preceding concept entry's pending-approval state.
This remained a focused UI-only pass: Battle v2 rules, the exact 19-character
First Creation roster, balance, progression, hidden information, replacement
slot identity, target semantics, socket authority, B/T/F/C energy meanings,
and X-as-Wild payment did not change. Runtime teams, rooms, phases, timers,
costs, disabled reasons, targets, replacements, and queue state continue to
come from the authoritative store/server contract. No concept currencies or
fictional combat labels entered the client.

**What changed.** Canonical visual-direction documents now define the scoped
70/30 Culling Current system: luminous ivory/concrete/sky worlds, cobalt
structure, restrained vermilion/gold/cyan accents, charcoal text, and darkness
reserved for Domain or finisher moments. Phaser cache references moved
consistently to v23. Reusable light primitives and responsive Home regions now
support a bright city-led active-trio Home, dominant Quick Match CTA, real
identity/room controls, secondary modes, and labeled bottom navigation. The
Combat slice now uses a daylight rooftop, compact authoritative phase/timer and
energy HUD, readable fighter plates, an open target lane, tactile 2x2 command
dock, inspectable disabled skills, full Skill Detail, and a light Queue Review
sheet with action order, primary/secondary/alternate targets, adjusted costs,
available-to-remaining energy, Wild assignment, and exact action-local errors.
The ordinary playback layer was rethemed while cinematic darkness remains.
`queueReviewFit()` gained only display metadata (`actionId` and `remaining`);
submission and legality semantics were preserved.

Two character-free generated environment plates were added with exact prompts,
result identifiers, hashes, dimensions, crop notes, and limitations in
`web/static/assets/environments/PROVENANCE.md`. Final review also closed a stale
PvP mode on the Home Roster route, long identity overflow, portrait-overlay
depth, the 360px HUD squeeze, misleading non-Wild row errors, and normal/safe
Combat and Queue Review center-stage collisions.

**Visual QA.** Twenty current PNGs under
`artifacts/ui-redesign/culling-current/qa/` cover Home, selected Combat, Skill
Detail, invalid Queue Review, and valid Queue Review at 360x800, 390x844, and
430x932, plus a long-profile stress state and safe-inset evidence. Safe captures
use 47px top and 34px bottom insets at 360x800, with Queue Review also checked at
safe 390x844. Every runtime texture was loaded before capture. All registered
non-modal controls were at least 44x44 CSS pixels, inside the canvas, and free
of pairwise overlap. The browser-local fixture uses the real character/skill
catalog, changes in-memory presentation state only, and emits no gameplay
socket command. A direct browser interaction also verified that Roster changes
stale PvP mode back to CPU before entering `FirstCreationScene`.

The local Windows Flask-SocketIO server returned HTTP 400 for WebSocket upgrade
and subsequent polling-session requests. There were no page exceptions,
non-Socket.IO resource failures, or missing textures. The captures therefore
validate rendering/geometry; the automated suite remains the networking and
gameplay authority.

**Verification actually run.** `python -m pytest -q` passed with **453 passed,
1 skipped** in 112.21 seconds. The focused app/mobile/parity set passed with
**20 passed**. `node --check` passed for all 24 changed or added JavaScript
files. `python -m compileall -q jjk_arena web/app.py`, `git diff --check`, the
v23 cache-consistency audit, the concept-only-label audit, and Pillow validation
of all 20 QA PNGs plus both 773x1672 WebP runtime assets passed.

**Remaining cautions / delivery state.** The existing abstract character-card
portraits remain intentional placeholders pending a coherent original or
licensed 19-character art pass. Concept character images are not runtime
assets. Untouched legacy scenes retain scoped dark tokens until migrated in
separate UI work. The implementation is uncommitted on
`codex/culling-current-ui`, based on
`f8567d13075adebcfccded09c9b5ac43ebedb802`; it has not been pushed and no PR
was opened.

## 2026-07-18 - Season 3 structural Home, Combat, and Queue Review rewrite

**User correction and supersession.** The user rejected the preceding
production vertical slice because it began with a promising combat direction
but ultimately reskinned the old UI hierarchy. The two supplied portrait
references now define the required screen composition, not merely a palette or
decorative style. This structural rewrite supersedes the preceding Home and
Combat layout implementation; the rejected layout and its screenshots must not
be presented as current design evidence.

**Locked decisions and invariants touched.** This remains UI-only. Python
Battle v2 and the socket/store contract remain authoritative. The exact 19
First Creation entries, 3v3 teams, one queued skill per living fighter, phase
flow, left-to-right resolution, B/T/F/C meanings, X-as-Wild payment, replacement
slot identity, adjusted costs, disabled reasons, targeting fields, hidden and
revealed state, and progression rules are unchanged. The new layouts must still
fit 360x800, 390x844, and 430x932 with safe-area-aware, roughly 44px minimum
controls and progressive skill disclosure.

**What changed.** Home was rebuilt around a full-screen illustrated trio, a
compact profile/currency strip, oversized editorial title, one giant battle
CTA, exactly three feature cards, and a three-item labeled bottom navigation.
Combat was rebuilt around a slim turn HUD, three large enemy fighter cards, an
open directional battlefield lane, three large ally cards, a selected-fighter
identity strip, four tall illustrated skill cards, and a dominant Review rail.
Queue Review now preserves the battlefield and replaces the lower command
region with an illustrated one-to-three-action deck plus touch-sized ordering,
Wild-payment, Back, Clear, and Confirm controls. Phaser cache references for
the completed structural pass are designated `v27`.

The runtime visual set gained a character-led 853x1844 Home composition, a
bright blue-sky 853x1844 rooftop, and four 418x941 Body/Technique/Focus/Curse
skill textures. Exact revised prompts, result IDs, source and shipping hashes,
input-reference disclosures, processing notes, and release limitations are
recorded in `web/static/assets/environments/PROVENANCE.md` and
`web/static/assets/skills/PROVENANCE.md`. The character-led Home image depicts
named franchise characters and both generation sets used user-supplied
franchise imagery as visual reference; neither provenance nor generation is a
substitute for legal or commercial-release clearance.

**Verification and delivery state.** The full suite passed with **492 passed,
1 skipped** in 134.05 seconds, and the final focused UI set passed with **37
passed**. `node --check` passed for all 27 changed or added JavaScript files.
`python -m compileall -q jjk_arena web/app.py`, `git diff --check`, and the v27
cache-consistency audit passed. Nine fresh implementation captures cover Home,
Combat, and Queue Review at exact 360x800, 390x844, and 430x932 dimensions.
Across all nine states, active scenes and canvas sizes matched, controls met the
44x44 minimum, no non-modal control crossed the viewport or overlapped another,
and the browser console was clean. The final capture traffic had no 400, 404,
or 500 responses; two stale pre-restart tab-session requests returned 400
before the v27 run began. Evidence and capture details live under
`artifacts/ui-redesign/s3-structure-v2/qa/`. The verified delivery targets
`codex/culling-current-ui`; the structural implementation was committed as
`e49f0ff` and delivered through updated draft PR #58.

## 2026-07-18 - First Creation, per-skill art, motion, and audio correction

**User correction and locked scope.** The user clarified that the Season 3
asset direction was successful; the failure was preserving deprecated layout
hierarchies beneath it. This pass therefore replaces the First Creation and
combat presentation structures without changing Battle v2 rules, socket
authority, balance, progression, the exact 19-character starter roster,
B/T/F/C semantics, X-as-Wild payment, hidden-information rules, target
legality, or replacement-slot identity.

**What changed.** First Creation is now a single-featured-character art browser
with three visible active slots, All/Tokyo/Kyoto/Special routes, canonical
locked ordering independent of sorted JSON keys, and a full-screen Character
Study. Character Study exposes art, identity, era, difficulty, role, state,
tags, all 78 authoritative skill pages, exact target-rule details, classes,
cost, cooldown, and descriptions. The two replacement pages retain their
original slot rather than presenting as techniques five. Profile entry and
skill paging receive short, reduced-motion-aware transitions.

Combat now follows the approved spatial composition: slim HUD, three large
enemy cards, open targeting lane, three large ally cards, selected-fighter art,
four tall illustrated skills, and a dominant Review rail. Compact skill cards
use progressive disclosure instead of six-pixel class/effect walls. Queue
Review retains the battlefield and presents a left-to-right three-action deck;
planning-only target and selection VFX handles are cleared on entry.

A 1254x1254 character-free action atlas and data-driven presentation registry
cover all 78 shipping skill IDs with stable crops, sigils, palettes, motion
profiles, and replacement metadata. Reusable motion/VFX hooks cover ambient
worlds, scene/profile entry, selection, legal targets, queue commitment,
impacts, healing, status, and reveal. Gesture-gated synthesized WebAudio covers
press, select, target, queue, confirm, error, reveal, and impact with persistent
mute and no-audio fallback. Phaser cache references moved in lockstep to v28.

**Visual QA.** Twelve current captures under
`artifacts/ui-redesign/s3-structure-v3/qa/` cover First Creation, Character
Study, selected Combat, and valid Queue Review at exact 360x800, 390x844, and
430x932 viewport/canvas pairs. All registered non-modal controls were at least
44x44, inside the canvas, and non-overlapping. The 78-skill atlas and
presentation services were active; Queue Review had a concrete Wild payment,
enabled confirmation, and no stale selection ring. The final browser run had
no warning or error console entries. Browser automation cannot constitute a
trusted audible-user-gesture assertion, so sound synthesis/unlock behavior is
covered by service tests while the live run verifies WebAudio support and the
gesture gate.

**Verification and delivery state.** Full pytest passed with **507 passed, 1
skipped** in 74.15 seconds. `python -m compileall -q jjk_arena web/app.py`,
`node --check` for all 30 changed or added JavaScript files, `git diff --check`,
the v28 cache audit, and Pillow validation of all 12 QA PNGs plus the action
atlas passed. The main implementation is commit `0e07e88` on
`codex/culling-current-ui`. Draft PR #58 is the delivery target and had not yet
been refreshed with this commit at the time of this entry. Generated assets
and franchise-directed references still require commercial-release rights
review; provenance is not licensing clearance.
