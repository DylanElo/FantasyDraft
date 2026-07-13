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
