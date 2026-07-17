# JJK Arena — Codex Project Instructions

These instructions are persistent project memory. Codex must read and follow them before changing the repository.

## Start every task this way

1. Read `docs/CODEX_PROJECT_MEMORY.md`.
2. Read the canonical documents relevant to the task:
   - Battle rules: `docs/battle_system_v2_design.md`
   - Kit grammar: `docs/jjk_kit_grammar.md`
   - Starter roster: `docs/first_character_creation.md`
   - Shipping starter contract: `docs/first_creation_gameplay_contract.md`
   - Timing/targeting contract: `docs/first_creation_temporal_targeting_correctness.md`
   - Mobile product direction: `docs/mobile_phaser_ui_ux_brief.md`
3. State in the implementation plan which locked decisions and invariants the task touches.
4. If the user request, docs, tests, and code disagree, stop and report the conflict. Do not silently reinterpret the design.

## Source-of-truth order

Use this precedence when resolving ambiguity:

1. The user’s current explicit request.
2. The nearest applicable `AGENTS.md` or `AGENTS.override.md`.
3. Locked decisions in `docs/CODEX_PROJECT_MEMORY.md`.
4. Canonical design documents listed above.
5. Executable tests and socket contracts.
6. Existing implementation details.

Existing code is not automatically correct merely because it exists. Conversely, do not change a locked design decision merely to simplify implementation.

## Product identity

JJK Arena is a portrait-first mobile 3v3 tactical battler inspired by Naruto Arena’s readability, queue tension, energy economy, counters, reflects, hidden traps, and replacement skills.

- Phaser is the maintained game client.
- Flask-SocketIO is the delivery and networking layer.
- Python Battle v2 is the authoritative rules engine.
- The browser submits intent and renders viewer-specific state. It never decides legality, damage, hidden information, cooldowns, or victory.
- Battle v2 is the only maintained gameplay engine. Do not reintroduce the removed v1 or Telegram-bot architecture.

## Non-negotiable combat loop

- Teams have three active characters, normally 100 HP each.
- Each living character may queue at most one skill per turn.
- Phases are `PLANNING -> QUEUE_REVIEW -> RESOLVING -> TURN_END -> FINISHED`.
- Players choose skills and legal targets, review the queue, assign Wild costs, order actions left-to-right, then confirm.
- Specific energy is paid first. `X` is a Wild/random cost paid by one of the four generated core energies during queue review.
- `X` is not a fifth generated resource.
- Resolution is server-authoritative and left-to-right.
- The first player receives one random core energy. Later gains are random core energy equal to living active characters unless an explicit tested rule overrides this.

## Core energy labels

- `B` / Body: physical combat, weapons, cursed tools, reinforcement.
- `T` / Technique: cursed techniques, shikigami, cursed speech, puppet output.
- `F` / Focus: tactics, barriers, counters, reads, support.
- `C` / Curse: volatile cursed energy, poison, blood, cursed-spirit effects, risky output.
- `X` / Wild: cost placeholder only.

## Core damage and defense rules

- Normal damage is reduced by damage reduction and then absorbed by destructible defense.
- Piercing damage ignores normal damage reduction but still hits destructible defense.
- Soul/Affliction damage ignores normal damage reduction and destructible defense.
- Health steal ignores normal damage reduction, still hits destructible defense, and heals only actual HP stolen.
- Sure-hit is Domain-specific. Active anti-domain universally converts it to
  normal damage and removes its invulnerability bypass; exceptions require a
  new explicit decision record and tests.
- Helpful ally skills may target an ally who is invulnerable to harmful skills unless a status explicitly blocks helpful skills or all skills.
- Targeting legality is determined before effects are applied.

Fixed damage reduction is a turn-aggregate budget per player turn, never a
fresh flat discount per hit. This and the universal anti-domain conversion are
locked by `docs/decisions/battle_v2_damage_reduction.md` and
`docs/decisions/battle_v2_anti_domain.md`.

## Hidden information and interaction rules

- Counter negates the complete incoming counterable skill. “First skill” skips uncounterable skills.
- Reflect redirects the complete harmful payload, not only the first effect.
- Invisible effects are visible to their source/owner and hidden from opponents until their documented reveal condition.
- Public event logs and serialization must not leak invisible skill use, target, queue details, or private statuses.
- Replacement skills occupy the original skill slot. Copy/replacement semantics must preserve slot identity.
- Duration clocks must be explicit: `source_turn`, `target_turn`, `round`, or deliberately documented `global_turn`.
- Setup statuses must survive until their intended payoff window.
- Cleanse is typed. It removes only the documented status families, not arbitrary hostile statuses.

## Kit construction and balance

- Kits are data-driven `SkillSpec` / `EffectSpec` / condition / transformation contracts.
- Do not parse player-facing prose to create shipping effects.
- Do not scatter display-name checks through the resolver.
- Every shipping skill description must exactly match authoritative behavior and Phaser affordances.
- Every first-pass character normally has four primary skills, zero to two replacements, one major named state, one payoff pattern, and one clear weakness.
- Avoid full-canon simulation and unreadable piles of hidden flags.
- No full-HP one-shot without at least one prior setup turn and meaningful counterplay.
- Lore determines tactical identity, not permission to ignore action economy.
- Large AoE, team stun, kill effects, and cinematic finishers require proportional setup, specific energy pressure, delay, cooldown, sacrifice, or replacement windows.
- Jogo’s Maximum Meteor is not a normal base skill. If introduced later, it must be a visible, delayed, expensive setup/replacement payoff with major opportunity cost and counterplay.

## First Creation is locked

The account-creation roster is exactly these 19 entries unless the user explicitly changes it:

1. Yuji Itadori
2. Megumi Fushiguro
3. Nobara Kugisaki
4. Maki Zenin
5. Toge Inumaki
6. Panda
7. Aoi Todo
8. Noritoshi Kamo
9. Momo Nishimiya
10. Mai Zenin
11. Kasumi Miwa
12. Kokichi Muta / Mechamaru
13. Junpei Yoshino
14. Satoru Gojo (Young)
15. Suguru Geto (Young)
16. Shoko Ieiri (Young)
17. Utahime Iori (Young)
18. Mei Mei (Young)
19. Yuta Okkotsu (JJK 0)

Important consequences:

- Junpei is included.
- Young Gojo, Young Geto, Young Shoko, Young Utahime, and Young Mei Mei are included.
- JJK0 Yuta is the only starter Yuta.
- Sendai Yuta, Shinjuku/EOS Yuta, Yuta in Gojo’s body, adult/endgame Gojo, Sukuna variants, disaster curses, awakened forms, and other advanced variants are mission unlocks.
- Later unlocks should be more complex, not strictly stronger. Starter characters must remain ladder-viable.
- Multiple iterations of one identity are allowed only when the combat identity, era, technique access, role, or state machine is materially different. A portrait or stat bump is not a new character.

## Mobile UI/UX constitution

The current prototype layout is not sacred. A UI task may replace layouts from scratch while preserving rules and network contracts.

- This is a total mobile game, not a desktop web app squeezed into a phone.
- A redesign means rethinking hierarchy, navigation, interaction, buttons, skill presentation, targeting, queue review, feedback, and onboarding—not recoloring existing panels.
- Primary target: 390x844 portrait. Also validate 360x800 and 430x932.
- Respect safe areas and browser viewport resizing.
- Keep primary actions thumb-reachable and use roughly 44–48 px minimum tap targets.
- Never use three narrow roster columns that truncate names/roles on a 390 px screen.
- Never use letter-only navigation, debug-looking panels, overlapping fixed CTAs, tiny walls of text, or unexplained icons.
- Skill information uses progressive disclosure: compact combat card plus full detail bottom sheet/glossary.
- The UI must expose all server decisions: adjusted cost, disabled reason, replacement skill, class/harmful stun, legal target, primary/secondary/alternate target, queued action, Wild payment, and hidden/reveal state.
- The server remains authoritative; the UI previews and explains, never invents rule outcomes.

Frontend-specific instructions are in `web/static/phaser/AGENTS.md`.
Battle-engine-specific instructions are in `jjk_arena/battle_v2/AGENTS.md`.

## Scope and delivery discipline

- Keep correctness, roster expansion, progression, and visual redesign in separate focused PRs.
- Do not add new characters while correcting starter contracts.
- Do not add gameplay features during a UI-only redesign.
- Do not rewrite UI during a timing/targeting correctness PR.
- Do not add Node, npm, webpack, or a JS build pipeline without explicit approval.
- Do not add production dependencies without explaining the need.
- Do not claim checks passed unless they were run.

## Required verification

For Python/gameplay changes:

```bash
python -m pytest -q
python -m compileall -q jjk_arena web/app.py
```

For Phaser changes, run syntax checks for every changed JavaScript file and perform live mobile browser QA when feasible. Capture at least 390x844 and 430x932 for major screen changes.

Also run:

```bash
git diff --check
```

After a meaningful pass, update `docs/session_history.md` with changes, verification, remaining cautions, and commit/PR state.

## Repository hygiene

Never commit or package:

- `.venv/`
- `__pycache__/`
- `.pytest_cache*`
- logs
- temporary screenshots unless intentionally placed under a documented QA path
- nested `.git` data in release archives

Deliver feature branches or PR-quality diffs, not entire dirty working directories.
