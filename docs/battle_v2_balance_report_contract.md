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

Schema 2 JSON retains the complete aggregate structure. CSV emits one row per
matchup with separate `draws`, `no_contests`, and `turn_caps` columns for
spreadsheet/notebook use.

```bash
python -m jjk_arena.battle_v2.balance_report \
  --presets story_tutorial,tokyo_second_years,kyoto_pressure \
  --games-per-orientation 10 --seed 1 --max-turns 200
```

## Interpretation limits

Character rates are confounded by preset teammates, opponents, the heuristic
AI, and sample size. Wilson intervals express sampling uncertainty only; they
do not correct those confounders. No balance change should be made from this
report without matchup inspection, larger samples, and human playtesting.
