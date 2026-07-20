# Battle v2 headless simulation contract

The headless simulator runs seeded First Creation matches through the normal
authoritative manager, legal-target validation, CPU action generator, energy
economy, resolver, status clocks, and winner detection.

## Match summary schema

The current simulation schema version is `3`.

Every summary includes:

- schema and rules versions;
- RNG seed and executed turn count;
- explicit `result_type` (`WIN`, `DRAW`, `NO_CONTEST`, or `TURN_CAP`) and a
  nullable winner side (`team_a`, `team_b`, or `null`);
- ordered character ids for both anonymous sides;
- living count and aggregate remaining HP;
- resolved action count;
- aggregate damage and healing received;
- authoritative energy-transmutation usage for each side: an event count and
  an event-order diagnostic list containing turn number, chosen source
  allocation, target core color, and complete core pools before and after the
  exchange;
- final authoritative state hash.

`damage_received` is the sum of authoritative `actual_hp_damage` from enemy
`damage`, `status_damage`, `retaliation`, and `health_steal` events. It does not
fall back to an event's nominal `amount`, so shield absorption, damage
reduction, invulnerability, overkill, self/friendly damage, and malformed
legacy events cannot inflate the metric. Recurring field/Domain damage uses
the same `status_damage` contract. Reflected HP loss is attributed to the
reflector.

Energy-transmutation diagnostics come only from authoritative
`energy_converted` events. They retain the stable internal core keys (`green`,
`red`, `blue`, and `white`) and deliberately omit player ids, event messages,
and unrelated payload fields. The per-side `energy_conversions` count must
equal the length of `energy_conversion_events`. A diagnostic entry contains
only `turn_number`, `sources`, `cost`, `target`, `pool_before`, and
`pool_after`, in authoritative event order.

Output deliberately excludes player/session identifiers, resume credentials,
raw event logs, invisible payloads, pending private queues, and player profiles.
It is diagnostic evidence, not live telemetry storage.

## CLI

```bash
python -m jjk_arena.battle_v2.simulation \
  --team-a yuji_itadori,megumi_fushiguro,nobara_kugisaki \
  --team-b maki_zenin,panda,mai_zenin \
  --games 100 --seed 1 --max-turns 200 --workers 0 --compact
```

The same teams, seed range, rules version, and turn cap must produce identical
JSON results. `--workers 0` automatically uses at most four processes, while
an explicit positive value fixes the worker count. Process completion order
never changes seed/result order. `--compact` omits per-match payloads and emits
only aggregate outcome, turn-range, and energy-transmutation diagnostics and
reduces completed matches as a stream instead of retaining per-match summaries;
the default remains the complete per-match evidence payload for compatibility.

Compact conversion diagnostics include event and usage rates, target-color and
source-pip counts, mixed-source exchanges, and average conversion turn. They
are derived only from the same privacy-safe authoritative conversion event
projection used by complete summaries.

The simulation loop terminates on `result_type`, not
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
