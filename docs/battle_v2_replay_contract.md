# Battle v2 deterministic replay contract

Battle v2 replay documents are versioned JSON transcripts used for regression,
diagnostics, simulation reproducibility, and future dispute investigation.

## Required match fields

- `format_version`: replay schema version; currently `1`.
- `rules_version`: exact supported rules identifier.
- `match_id`: stable replay identifier.
- `roster_mode`: `classic` or `first_creation`.
- `rng_seed`: required integer seed.
- `players`: original player ids, names, and ordered teams.
- `commands`: authoritative command transcript in execution order.

Every command records `player_id`, command name, submitted `state_revision`,
`client_action_nonce`, sanitized payload, and expected post-command state hash.
The document also records initial and final hashes.

## Canonical hash

The SHA-256 hash covers the complete authoritative `BattleState`, including
private statuses/events, queues, energy, cooldowns, replacements, RNG seed,
turn, phase, winner, and state revision. Dataclasses, enums, mappings, sets, and
sequences are normalized deterministically. The internal monotonic
`phase_deadline` is the only excluded field because its absolute value is
process-local; gameplay phase and revision remain covered.

## Verification

```bash
python -m jjk_arena.battle_v2.replay tests/fixtures/replays/first_creation_two_turns.json
```

Verification reconstructs the match with a frozen clock, executes commands
through the same authoritative manager path, and fails at the first mismatched
initial, command, or final hash. Unsupported replay or rules versions fail
closed.

The manager supports opt-in in-memory capture for successful player and CPU
commands. Rejected commands are not recorded. Capture is disabled by default;
storage, timeout-command capture, retention, consent, and production privacy
policy belong to later production work.
