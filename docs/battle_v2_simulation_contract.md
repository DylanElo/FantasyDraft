# Battle v2 headless simulation contract

The headless simulator runs seeded First Creation matches through the normal
authoritative manager, legal-target validation, CPU action generator, energy
economy, resolver, status clocks, and winner detection.

## Match summary schema

The current simulation schema version is `2`.

Every summary includes:

- schema and rules versions;
- RNG seed and executed turn count;
- explicit `result_type` (`WIN`, `DRAW`, `NO_CONTEST`, or `TURN_CAP`) and a
  nullable winner side (`team_a`, `team_b`, or `null`);
- ordered character ids for both anonymous sides;
- living count and aggregate remaining HP;
- resolved action count;
- aggregate damage and healing received;
- final authoritative state hash.

Output deliberately excludes player/session identifiers, resume credentials,
raw event logs, invisible payloads, pending private queues, and player profiles.
It is diagnostic evidence, not live telemetry storage.

## CLI

```bash
python -m jjk_arena.battle_v2.simulation \
  --team-a yuji_itadori,megumi_fushiguro,nobara_kugisaki \
  --team-b maki_zenin,panda,mai_zenin \
  --games 100 --seed 1 --max-turns 200
```

The same teams, seed range, rules version, and turn cap must produce identical
JSON results. The simulation loop terminates on `result_type`, not
`winner_id`, so winnerless `DRAW` and `NO_CONTEST` states exit cleanly. A
`TURN_CAP` is reported explicitly rather than silently inventing a draw or
winner policy. Balance-report consumers classify all three winnerless terminal
types separately; only `TURN_CAP` contributes to turn-cap rates.

## Limitations

CPU-vs-CPU results measure the current heuristic AI, not human balance. They
must not justify balance changes without matchup review and human playtesting.
The simulator does not persist or upload results. It follows the locked
turn-aggregate fixed-damage-reduction and match-lifecycle policies implemented
by the authoritative manager and resolver.

Orientation-balanced aggregation and interpretation rules are defined in
`docs/battle_v2_balance_report_contract.md`.
