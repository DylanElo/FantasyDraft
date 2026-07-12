# First Creation temporal and targeting correctness

## Scope

This change is limited to authoritative First Creation timing, targeting, status semantics, Phaser rule parity, and regression coverage. It does not change the mobile layout, add characters, add visual effects, or add progression.

## Temporal contract

- Statuses use typed `source_turn`, `target_turn`, `round`, or explicitly requested `global_turn` clocks.
- All 78 First Creation skills declare a non-global clock and typed status families for every applied status.
- Newly applied setup statuses do not lose duration during their creation action.
- The 78-skill execution matrix advances through caster action, opponent cleanup, and caster next-turn cleanup and verifies clock-specific survival and expiry.

## Targeting and context

- Effect execution receives caster, recipient, original selected target, primary target, secondary selected target, all resolved targets, and frozen pre-effect status snapshots.
- Watchers are bound to one selected enemy character slot.
- Todo serializes and validates a distinct alternate redirect destination.
- Venom Bloom preserves ordered primary/secondary targets and uses the weak team branch only when no enemy is poisoned.

## Status semantics

- Runtime statuses use typed `AFFLICTION`, `SOUL`, `STUN`, `CONTROL`, `MARK`, `BUFF`, and `DEBUFF` families.
- RCT-style cleanse removes only `AFFLICTION` or `SOUL` statuses.
- Stack-unlocked replacements are revoked immediately below their threshold.
- Kamo's drain is seeded, random across available core colors, and consumed after exactly one target-turn trigger.

## Phaser/server parity

- The client computes adjusted costs from active status payloads.
- Harmful and class stuns share the server's disabled semantics and expose a concrete disabled reason.
- Replacement skills retain original queue slot identity.
- Primary, secondary, and alternate redirect fields survive client action construction and server serialization.

## Verification

- `python -m pytest -q`: 221 passed, 1 opt-in browser visual test skipped.
- Python compilation passed.
- Modified Phaser modules passed `node --check`.
- `git diff --check` passed.
