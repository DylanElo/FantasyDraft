# First Creation mission victory requirement

Status: Approved, 2026-07-13.

**Every First Creation mission — starter tier and every `mission_unlock`
route — requires the evaluated player to have won the match.** A mission is
never marked complete purely from in-match mechanical objectives (marks
applied, statuses triggered, replacement skills used) while the player lost
or drew.

## Why

Before this decision, 5 of 7 missions already required a win
(`welcome_to_jujutsu_high`, `outsider_poison_path`, `kyoto_pressure_gauntlet`,
`defensive_artillery_drill`, `student_reserves_trial`), but two did not:
`hidden_inventory_echoes` and `cursed_child_bond`. Their descriptions used
softer language ("Clear a match", "Use JJK0 Yuta's Rika state... to unlock")
that never actually said "win," and their objectives only checked mechanical
triggers. A player could force a loss immediately after triggering the
mechanical objectives and still unlock `gojo_adult`/`geto_jjk0`/
`jjk0_geto_route` — real character-unlock routes, not just cosmetic badges.
That inconsistency with the other 5 missions was unintentional, not a
deliberate "some unlocks don't need a win" design.

## Rule

- Every mission's objective list includes an explicit **"Win the match"**
  objective, evaluated the same way as every other mission: `winner_id ==`
  the player being evaluated.
- This applies uniformly regardless of whether the mission's unlock is a
  cosmetic badge or an actual character/route unlock — no mission is exempt.
- `hidden_inventory_echoes`'s description was reworded from "Clear a match"
  to "Win a match" and `cursed_child_bond`'s from "Use JJK0 Yuta's Rika
  state... to unlock" to "Win with JJK0 Yuta's Rika state... to unlock" to
  match this rule instead of contradicting it.

## Where this is implemented

- Static objective text: `jjk_arena/battle_v2/first_creation_missions.py`
  (`FIRST_CREATION_MISSIONS`).
- Runtime evaluation: `jjk_arena/battle_v2/first_creation_progression.py`
  (`evaluate_first_creation_progress`) — every mission block includes a
  `_objective("Win the match", ... and winner_is_player, ...)` entry.
- Regression coverage: `tests/test_first_creation_progression.py`
  (`test_cursed_child_bond_does_not_complete_on_a_loss`,
  `test_hidden_inventory_echoes_requires_a_win`, plus the pre-existing
  loss-path tests for the other 5 missions).

## Future missions

Any new First Creation mission must include a "Win the match" objective
(or an equivalent player-specific win check) unless a future decision
explicitly carves out an exception and records the reasoning here — do not
add a win-less mission silently.
