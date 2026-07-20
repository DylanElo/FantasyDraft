# Battle v2 energy transmutation

## Decision

Energy transmutation is an optional, server-authoritative Planning action:

- Sacrifice exactly five stored core-energy pips.
- The sacrifice may be any player-chosen mixture of the four core types.
- Create exactly one player-chosen core-energy pip.
- Wild (`X`) is never stored and cannot be sacrificed or created.
- Transmutation is available at most once per player turn.
- It must happen before the player queues any fighter action.
- A rejected request changes no energy, revision-independent battle state, RNG,
  or command receipt.

The client must show the complete sacrifice allocation, chosen result, and the
net `5 -> 1` exchange before confirmation. It must never automatically choose
the source or destination for the player.

CPU-controlled players use the same authoritative `convert_energy` path. Their
choice is deterministic and deliberately conservative:

- Easy converts only when its current plan is a pass and the exchange
  immediately unlocks a positively valued legal action.
- Normal compares its current queue with each core-color result and converts
  only for a materially better queue.
- Hard compares viewer-safe authoritative dry-runs for no conversion and each
  core-color result, and requires the improvement to clear an explicit
  opportunity-cost margin.
- The CPU drains abundant non-target colors first, never converts merely
  because five pips exist, and emits the same `energy_converted` event as a
  human command.

This CPU policy does not authorize the browser to choose a human player's
sacrifice or result.

The displayed types are `T` Taijutsu (green), `J` Jujutsu (blue), `S`
Strategic (white), and `B` Bloodline (red). The command payload deliberately
retains the stable internal color strings so existing authoritative state,
socket clients, and replay documents do not require a migration.

## Superseded rule

This replaces the earlier prototype behavior that automatically exchanged two
matching pips for one different pip. That behavior was never an acceptable
player choice surface and is no longer part of the socket or engine contract.

## Replay consequence

The authoritative replay rules version is bumped because identical historical
`convert_energy` commands no longer have the same payload or result.
