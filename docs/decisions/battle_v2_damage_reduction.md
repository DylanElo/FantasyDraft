# Battle v2 damage reduction decision

Status: Approved, 2026-07-13.

Fixed damage reduction against `DamageType.NORMAL` damage is a **turn-aggregate
budget**, not a flat per-hit discount (Naruto Arena-style, not per-hit).

- Each character tracks a `turn_damage_reduction_used` counter, reset to 0 for
  every character at the end of every turn (`finish_turn` in `resolver.py`).
- Each normal-damage hit consumes from the character's current total active
  `damage_reduction` (summed across stacked statuses) minus what has already
  been used this turn: `absorbed = min(incoming, reduction - used)`.
- Once the budget for the turn is exhausted, further normal-damage hits in
  that same turn land in full; the budget refreshes at the next turn boundary.
- This applies only to `DamageType.NORMAL`. Piercing, soul/affliction, health
  steal, and sure-hit damage are unaffected by this change — their existing
  interaction with damage reduction (ignore it entirely) is unchanged.

Implemented in `jjk_arena/battle_v2/models.py` (`CharacterState.turn_damage_reduction_used`),
`jjk_arena/battle_v2/effects.py` (`apply_damage`), and
`jjk_arena/battle_v2/resolver.py` (`finish_turn` reset).

This does not retune any of the ~9 existing damage-reduction grant amounts
across the First Creation roster; their flat values (10/15/20) carry the same
meaning as before, just consumed as a turn budget instead of a per-hit
discount. Retuning those amounts under the new model is a balance-tuning
question, not part of this decision.
