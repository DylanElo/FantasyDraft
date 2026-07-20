# Story Tutorial balance signal investigation

Date: 2026-07-20

## Scope

This is diagnostic evidence about the existing heuristic CPU. It changes no
skill, cost, damage, cooldown, roster, progression, energy, or combat rule.
The audit's 18/20 Story Tutorial result was treated as a signal to reproduce
and widen before any tuning decision.

## Reproduction and expansion

All runs were mirrored across both seat orders, used the authoritative Battle
v2 manager/resolver, capped at 200 player turns, and used four worker
processes. Results were reduced in deterministic seed order.

### Twenty-game probe

Command:

```bash
python -m jjk_arena.battle_v2.balance_report \
  --presets story_tutorial,jjk0_beginner_special \
  --games-per-orientation 10 --seed 1 --max-turns 200 --workers 4
```

- Story Tutorial 16, JJK0 Beginner Special 4.
- First-seat win rate: 60%.
- Average duration: 31.75 player turns.
- Draws, no-contests, and turn caps: zero.
- Runtime: 18.796 seconds.

This seed window did not reproduce the audit's exact 18/20 count, but it did
reproduce the same large directional signal.

### One-hundred-game paired expansion

The same pairing ran for 50 games per orientation over seeds 1001-1100:

- Story Tutorial 86, JJK0 Beginner Special 14.
- Story Tutorial decided win rate: 86%; Wilson 95% interval 77.86%-91.47%.
- First-seat win rate: exactly 50%.
- Average duration: 34.74 player turns.
- Draws, no-contests, and turn caps: zero.
- Runtime: 58.838 seconds.

The even first-seat result makes seat order an unlikely explanation for this
sample. It does not distinguish kit strength from team synergy or heuristic
CPU policy.

### Eight-preset matrix probe

The complete eight-preset matrix ran two games per orientation for every
unordered pairing (112 matches, seeds 2001-2112). It finished in 138.822
seconds with zero draws/caps and a 52.68% first-seat win rate. Story Tutorial's
row was:

| Opponent | Record | Decided win rate |
| --- | ---: | ---: |
| Defensive Artillery | 3-1 | 75% |
| Hidden Inventory | 4-0 | 100% |
| JJK0 Beginner Special | 3-1 | 75% |
| Kyoto Pressure | 4-0 | 100% |
| Poison Outsider | 2-2 | 50% |
| Tokyo Second-Years | 4-0 | 100% |
| Young Sorcerer Support | 3-1 | 75% |

The individual cells are deliberately small, but the 23-5 aggregate suggests
the CPU signal is broader than only the JJK0 pairing. It still cannot identify
an individual character or number as the cause.

## Transmutation observation

In the 100-game paired expansion:

- Story Tutorial made 110 conversions and converted in 72% of games.
- JJK0 Beginner Special made 33 conversions and converted in 30% of games.
- Story Tutorial won 80.56% when it converted and 100% when it did not.
- JJK0 won 16.67% when it converted and 12.86% when it did not.
- The 143 total conversions targeted J 71 times, T 57, S 14, and B once;
  115 used mixed source colors, at an average turn of 25.951.

This is correlation, not cause. Conversion opportunity depends on game length,
pool shape, and CPU planning. Story Tutorial's perfect no-conversion subset in
this sample argues against treating transmutation alone as the source of the
matchup gap.

## Decision

Do not change kit numbers from this evidence. The next balance step should
inspect action/target choices and queue valuation for the three Story Tutorial
fighters and their opponents, then repeat the matrix with larger cells and
structured human play. The current result is a strong heuristic-team signal,
not an isolated, validated balance defect.
