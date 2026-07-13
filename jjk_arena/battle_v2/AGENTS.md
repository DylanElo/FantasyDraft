# Battle v2 — Codex Instructions

These rules apply to work under `jjk_arena/battle_v2/` and override broader instructions only where more specific.

## Read before editing

Read:

- `../../docs/CODEX_PROJECT_MEMORY.md`
- `../../docs/battle_system_v2_design.md`
- `../../docs/jjk_kit_grammar.md`
- `../../docs/first_character_creation.md`
- `../../docs/first_creation_gameplay_contract.md`
- `../../docs/first_creation_temporal_targeting_correctness.md`

## Engine contract

- Python is the authority for legality, energy, targets, effects, queues, cooldowns, hidden information, deaths, and victory.
- Keep models, energy, conditions, targeting, effects, resolution, serialization, and room orchestration separated.
- Prefer reusable structured grammar over character-name branches.
- Shipping First Creation content has 19 characters and 78 explicit skill contracts. Do not reintroduce text inference or empty placeholder effects.
- Every player-facing clause must correspond to explicit engine state and tests.

## Queue and energy invariants

- One queued skill per living active character per turn.
- Validate without mutating state.
- Reserve/pay specific costs first and assign `X` payments during queue review.
- Spend energy only when the final queue is confirmed.
- Resolve confirmed actions left-to-right.
- Use injected/seeded RNG for tests and random energy effects.
- Effects saying “random energy” must not deterministically prefer the first color.

## Effect context

Every effect/condition that needs it must have explicit access to:

- caster
- effect recipient
- original selected target
- primary selected target
- secondary selected target
- alternate redirect target
- all resolved targets
- frozen pre-effect status snapshots where ordering would otherwise mutate the condition

Do not overload “target” to mean different entities in different effects.

## Timing

Use explicit clocks:

- `source_turn`: expires on source-owner turn boundaries.
- `target_turn`: expires on target-owner turn boundaries.
- `round`: expires after both players receive the intended window.
- `global_turn`: only when the design deliberately means every player turn.

Newly applied statuses must not immediately lose a duration tick during their creation action. Test setup across the complete sequence:

```text
caster action -> opponent cleanup/turn -> caster next turn
```

Immediate-resolution tests alone are insufficient for setup/payoff mechanics.

## Damage and defense

- Normal: apply fixed damage reduction, then destructible defense, then HP.
- Piercing: ignore normal damage reduction, still hit destructible defense.
- Soul/Affliction: ignore normal damage reduction and destructible defense.
- Health steal: ignore normal damage reduction, hit destructible defense, heal only HP actually removed.
- Sure-hit: only according to explicit Domain/anti-domain contracts.
- Defense destruction is a distinct effect performed before damage when text says so.
- Helpful effects are not blocked by harmful-only invulnerability.

Do not change per-hit versus turn-aggregate fixed damage reduction until the user resolves that open decision.

## Counter, reflect, invisible, replace

- Counter consumes/negates the entire incoming counterable skill.
- “First counterable skill” skips uncounterable skills.
- Reflect redirects the entire harmful payload once; it must not consume on the first effect and leave later effects on the original target.
- Unrevealed invisible statuses are source-private by default, including hostile traps on enemy targets.
- Private events and pending plans must never leak through viewer serialization.
- Reveal events occur only at documented trigger/expiry points.
- Replacements are slot-based. When a replacement ends, the original slot returns.
- Copied skills preserve original-slot replacement semantics as defined by the project grammar.

## Status semantics

Use typed families where cleanse/removal matters:

- `AFFLICTION`
- `SOUL`
- `STUN`
- `CONTROL`
- `MARK`
- `BUFF`
- `DEBUFF`

A cleanse removes only the documented families. It must not remove an arbitrary hostile status merely because its source is an enemy.

Exact-skill one-shot modifiers must identify the empowered skill and be consumed only after the whole skill resolves. Multi-effect skills must not consume a modifier on their first effect and corrupt later effects.

## Locked high-risk starter mechanics

Preserve these outcomes and regression tests:

- Yuji: Black Flash conditions evaluate the original enemy target; Momentum applies correctly. Divergent Fist delayed damage cannot double-dip an existing Soul Bruise.
- Megumi: Scent survives the intended setup window; shikigami payoff is caster/target correct.
- Maki: Weapon Specialist empowers only the next Cursed Tool Combo; defense destruction happens before damage.
- Panda: Gorilla Core is a caster-side state, never a target requirement.
- Todo: Boogie Woogie uses a chosen watched enemy and chosen alternate destination, not an automatic self-redirect.
- Kamo: Blood Mark drain uses seeded random available core energy and triggers exactly once at the documented target-turn timing.
- Momo, Young Gojo, Young Mei Mei: watchers bind to the selected enemy character slot. A future bonus becomes a separate buff before watcher consumption.
- Mai: Hidden Bullet produces the documented split damage, then consumes the state after the entire skill.
- Miwa: Simple Domain punishment/counter is restricted to the documented melee family.
- Mechamaru: “not damaged last turn” uses tracked authoritative history.
- Junpei: Venom Bloom has a selected primary poisoned target and secondary spread target; weak team poison occurs only when nobody is poisoned.
- Young Geto: stack-unlocked replacement is revoked immediately below its threshold.
- Yuta JJK0 and Young Shoko: RCT/cleanse removes only documented Affliction/Soul families.

## Testing standard

- Every shipping skill needs execution coverage for cost, target legality, cooldown, meaningful state mutation, duration, and conditional branches.
- Test both prepared and unprepared branches.
- Add named regressions for multi-step/high-risk mechanics.
- Add serialization tests for hidden/private information.
- Add manager/socket parity tests when payloads or target fields change.
- A test that only proves “something changed” is not sufficient when exact numbers or branches are part of the contract.

## Scope guardrails

During correctness work:

- Do not add new characters.
- Do not redesign Phaser scenes.
- Do not introduce lore-only exceptions to bypass grammar.
- Do not weaken tests to match a bug.
- Update canonical docs when behavior intentionally changes.
