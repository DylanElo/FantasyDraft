# Battle v2 match lifecycle decision

Status: Approved, 2026-07-13.

This record locks the reconnect, disconnect, timeout, no-progress, and hard-cap
policy. The full normative wording is in `docs/CODEX_PROJECT_MEMORY.md`.

- Independent reconnect grace: 90 seconds per disconnect and 180 cumulative seconds per player per match.
- Pause the interactive match after any in-flight resolution completes; resume the saved phase with at least 15 seconds.
- Connected opponent versus expired player: forfeit. Both expired: `NO_CONTEST`. Expired sessions cannot recover.
- Planning and Queue Review timeout discard all unconfirmed actions and auto-pass. Three consecutive or five total timeout-struck player turns forfeit. Manual confirmation/pass resets consecutive strikes.
- Warn after eight no-progress player turns; tiebreak after twelve; hard cap after 72 player turns.
- Tiebreak order: living characters, current HP, actual enemy HP damage, fewer timeout strikes, then `DRAW`.
- Actual enemy HP damage is sourced only from attributed authoritative damage
  events and their `actual_hp_damage` field. Recurring status damage,
  retaliation, health steal, and reflected damage count for the responsible
  opponent; shield-only hits, overkill beyond HP removed, self/friendly damage,
  and nominal amounts do not reset no-progress or increase the tiebreak ledger.
- Lifecycle replay is based on authoritative logical event order, never wall-clock reconstruction.
