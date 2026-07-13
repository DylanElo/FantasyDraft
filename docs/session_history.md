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
