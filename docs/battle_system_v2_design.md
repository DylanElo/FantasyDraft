# JJK Arena Battle System v2 Design

## Objective

Battle System v2 is a server-authoritative combat engine for a Naruto Arena-style JJK mode. It is isolated from the current v1 battle flow and powers the feature-flagged Battle v2 Arena, including CPU practice and private two-human PvP rooms.

The production default remains v1. Integration code should only use v2 when `JJK_BATTLE_SYSTEM=v2`.

## Core Loop

1. Each player fields three active characters.
2. During planning, each living active character may choose at most one skill.
3. The player selects legal targets for each chosen skill.
4. The player enters queue review.
5. Wildcard (`black`) costs are assigned from available core energy.
6. The player orders queued skills left-to-right.
7. The server validates, spends energy on confirm, and resolves the queue.
8. Cooldowns, statuses, deaths, domains, and energy update at turn end.
9. The next player acts unless a winner has been decided.

## Design Pillars

### Tactical clarity first

Every skill should be understandable from its structured data:

- cost
- target rule
- classes
- cooldown
- duration
- effect
- condition
- counterplay

Resolver-only character exceptions should be avoided. If a mechanic cannot be described with the kit grammar, the grammar should be extended intentionally.

### Data-driven character kits

Character kits should be declared as `SkillSpec` data with `EffectSpec`, `ConditionSpec`, and `TransformationSpec` entries. Character-specific behavior should not be scattered through Python conditionals that check display names.

### Preserve v1

The existing game states and v1 battle behavior remain intact. V2 lives under `jjk_bot/battle_v2/` and is wired into the web app only when `JJK_BATTLE_SYSTEM=v2`.

### Server authoritative

The client submits intent only. The server owns legality, damage, cooldowns, targeting, hidden effects, queue resolution, and winner detection.

## Feature Flag

Use the helper exported by `jjk_bot.battle_v2.models`:

```python
use_battle_v2()
```

It returns `True` only when `JJK_BATTLE_SYSTEM` is set to `v2`. The default is `v1`.

## Model Boundaries

- `energy.py` for deterministic energy gain and wildcard payment validation.
- `conditions.py` for kit condition evaluation.
- `targeting.py` for legal target checks.
- `effects.py` for pure effect application helpers.
- `resolver.py` for queue resolution.
- `starter_roster.py` for initial JJK kits.
- `serialization.py` for public/private state views.
- `manager.py` for room/match orchestration and CPU turn selection.
- `web/app.py` for SocketIO-facing room, CPU, and private PvP flows.

## Turn Phases

- `PLANNING`: player selects skills and targets.
- `QUEUE_REVIEW`: player orders actions and assigns wildcard payments.
- `RESOLVING`: server resolves queued actions left-to-right.
- `TURN_END`: statuses, cooldowns, action/control ticks, and energy update.
- `FINISHED`: winner decided.

## Damage Families

The resolver implements these rule families:

- Normal damage is reduced by damage reduction and absorbed by destructible defense.
- Piercing damage ignores damage reduction but still hits destructible defense first.
- Soul damage ignores damage reduction and destructible defense.
- Sure-hit damage is for Domain effects and ignores normal target protection unless anti-domain effects apply.
- Health steal heals the user only for actual HP damage dealt.

## Hidden Information

Invisible statuses must be visible to their owner, hidden from opponents, revealed when triggered, and never leak protected targets through public serialization.

## Acceptance Criteria

- V1 behavior is unchanged.
- `jjk_bot.battle_v2.models` imports cleanly.
- Data models cover battle phases, energy, damage, skill classes, skill specs, effects, conditions, transformations, statuses, pending actions, players, events, and battle state.
- CPU practice can start from the browser and run CPU responses.
- Private PvP lobbies wait for a second player, emit viewer-specific state, and clean up on cancel, reset, or disconnect.
- Invisible statuses, private events, and pending queues serialize per viewer.
