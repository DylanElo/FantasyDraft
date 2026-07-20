# Battle v2 offline balance report contract

The balance report consumes deterministic headless simulations and produces
descriptive matchup evidence for later review. It is not an in-game dashboard
and does not alter character data.

## Orientation control

Every team pairing runs in both seat orders. This prevents a single ordering
from being mistaken for matchup strength and exposes the aggregate first-seat
win rate. `DRAW`, `NO_CONTEST`, and `TURN_CAP` are distinct winnerless results;
none is counted as a decided win.

## Reported metrics

- report schema version, total games, seed range, rules version, and turn cap;
- wins and average turns for each team pairing;
- draw, no-contest, and turn-cap counts and rates;
- first-seat win rate among decided games;
- per-character appearances, wins, descriptive win rate, and Wilson 95% interval.
- energy-transmutation event totals, game/side usage rates, and descriptive
  win correlation for decided side-games that did or did not transmute;
- deterministic trio-by-trio matchup matrix cells with wins, losses,
  winnerless outcomes, decided win rate, Wilson interval, average turns, and
  team-specific transmutation usage;
- transmutation target-color counts, source-pip mix, mixed-source event count,
  average event turn, and per-trio usage/win summaries.

Schema 4 JSON retains the complete aggregate structure. Each report and
matchup exposes an `energy_conversion` summary with event and usage counts plus
a nested `win_correlation` block. `trio_matchup_matrix` supplies a symmetric
row-team/column-opponent view without recomputing results. The correlation compares wins among decided
side-games with at least one authoritative conversion against decided
side-games without one; winnerless results contribute to usage but not to the
win-rate denominators. Conversion correlations remain descriptive rather than
causal. CSV emits one row per matchup with separate `draws`,
`no_contests`, and `turn_caps` columns plus flattened conversion usage and
correlation columns, target/source JSON fields, and each trio's event/usage
totals for spreadsheet/notebook use.

```bash
python -m jjk_arena.battle_v2.balance_report \
  --presets story_tutorial,tokyo_second_years,kyoto_pressure \
  --games-per-orientation 10 --seed 1 --max-turns 200 --workers 0
```

`--workers 0` uses up to four processes automatically. Results are reduced in
the original deterministic seed order, so changing the worker count changes
throughput, not report content.

## Interpretation limits

Character rates are confounded by preset teammates, opponents, the heuristic
AI, and sample size. Wilson intervals express sampling uncertainty only; they
do not correct those confounders. No balance change should be made from this
report without matchup inspection, larger samples, and human playtesting.
Energy-transmutation correlation is likewise descriptive rather than causal:
conversion opportunities depend on accumulated pool shape, CPU policy, match
length, team costs, and the current board state.

## Performance budget

The automatic-worker 112-game matrix (all eight presets, every unordered
matchup, both seat orientations, two games per orientation) has a 240-second
local diagnostic budget. This is a profiling gate, not a normal pytest
wall-clock assertion because shared CI runner load is not deterministic.

On the 2026-07-20 Windows reference run at schema 4 / rules version
`battle-v2-2026-07-accounting-cpu-transmute-6`, seeds 2001-2112 and a 200-turn
cap completed all 112 games with four workers in 138.822 seconds, zero turn
caps, and 246 authoritative conversion events. A regression above 240 seconds
should be profiled before scaling batches; the dominant known cost remains
full-state copying during candidate queue validation. The earlier schema-3
single-process 56-game reference was 132.481 seconds, so the parallel path
roughly doubled observed throughput in this workload.
