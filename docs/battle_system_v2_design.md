# JJK Arena Battle System v2 Design

## Objective

Battle System v2 is a server-authoritative combat engine for a Naruto Arena-style JJK mode. It powers the Battle v2 Arena, including CPU practice and private two-human PvP rooms.

Battle v2 is the only maintained battle engine in this repository.

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

Action intents identify one declared base skill slot. The server resolves any
active replacement from that slot; replacement-only and foreign skill IDs are
never valid client submissions. Action IDs and queue order are exact,
non-empty, unique identities, and selected target slots cannot be duplicated.

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

### Server authoritative

The client submits intent only. The server owns legality, damage, cooldowns, targeting, hidden effects, queue resolution, and winner detection.

Mutating client intents carry an authoritative state revision and a per-player
nonce. Stale intents and conflicting nonce reuse are rejected atomically;
identical retries do not execute twice. Rejected commands do not consume RNG or
change battle state.

## Runtime Flag

The `use_battle_v2()` helper remains as an operational guard for socket handlers. It defaults to enabled and should not be used to route to a legacy engine.

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

`Physical` describes a damage/technique family, not reach. `Melee` and `Ranged`
are explicit independent tags used by counters and punishments.

## Authoritative phase timers

Planning and Queue Review have server-owned deadlines. Timing policy is
isolated in `jjk_arena/battle_v2/timers.py`; the manager owns timeout
transitions. Planning timeout skips the turn. A valid Queue Review timeout
resolves the submitted queue; an invalid queue is discarded before advancing.
Internal deadlines use a monotonic clock. A stale-safe background scheduler
wakes idle rooms, runs the authoritative transition under the room lock, then
broadcasts viewer-specific state. Re-arming or deleting a room invalidates old
wakeups. Clients receive whole `phase_seconds_remaining` values for display but
do not decide when expiration occurs.

## Hidden Information

Invisible statuses must be visible to their owner, hidden from opponents, revealed when triggered, and never leak protected targets through public serialization.

## Session continuity

Each human player receives an opaque, room-scoped resume token over their
private socket room. The server stores only its hash and rotates the token after
successful use. Resume reattaches the socket to the original player identity
and emits a fresh viewer-specific snapshot containing the authoritative phase,
revision, pending queue, and remaining time without exposing opponent-private
state. Tokens live with the process-owned room and are revoked on room cleanup.
Disconnect expiry, automatic surrender, and ranked penalties remain explicit
product-policy decisions and are not inferred by the transport layer.

## Acceptance Criteria

- `jjk_arena.battle_v2.models` imports cleanly.
- Data models cover battle phases, energy, damage, skill classes, skill specs, effects, conditions, transformations, statuses, pending actions, players, events, and battle state.
- CPU practice can start from the browser and run CPU responses.
- Private PvP lobbies wait for a second player, emit viewer-specific state, and clean up on cancel, reset, or disconnect.
- Invisible statuses, private events, and pending queues serialize per viewer.
