# Incident Cut interaction prototype

Design reference, 2026-08-12. **Not shipping code. Not a port target.**

`prototype.html` is a self-contained, playable prototype of the full mobile
flow — boot, home, First Creation, Character Study, mission map, matchup,
combat, queue review, results, records. Open it directly in a browser; it has
no build step and no dependencies.

## ⚠ Its character art uses the REJECTED illustration grammar

This prototype was built **before** the illustration correction landed. Its
procedural character rendering uses hard ink contours and flat cel-shadow
masses — precisely the grammar the user rejected on 2026-08-02.

**Do not treat `drawBust()` or `render-evidence/character-busts.png` as an art
target.** The corrected direction (cinematic, painterly, mood-graded, no ink
hatching) is in `docs/season3_visual_system.md`, and the same warning is on
`web/static/assets/*/PROVENANCE.md`.

The *interface chrome* — bone panels, thick ink borders, clipped corners,
sparse hatching — is a different question. It follows the UI contract, which
the correction deliberately did not change.

## What it is actually useful for

The value here is **interaction and layout**, not pixels:

- **Queue Review with player-assigned Wild costs.** The strongest part. Queuing
  reserves only the *specific* energy and leaves each `X` unassigned; the
  review deck offers a picker of remaining core energies, with order controls
  and a live remaining-energy readout. Confirm stays disabled and reads
  "Assign Wild" until every slot is paid. The shipped client should be checked
  against this.
- **Measured composition.** Stage 62.5% of frame, HUD + command 33.7%, against
  the contract's "at least 55%" and "approximately 35%". Four tall technique
  cuts at 156px.
- **Motion inventory.** Nine keyframe animations, HP lag rails, cut-ins on
  heavy commitments, and three persisted motion modes reading/writing
  `jjk_arena.presentation_settings.v1`.
- **Tap-target audit.** Every control ≥44px at 360x800, 390x844, and 430x932.

## What it deliberately does NOT do

- It is **vanilla canvas + DOM, not Phaser scenes.** Porting is a redraw.
- It **resolves damage, legality, and victory locally.** The real client must
  never do this — Battle v2 on the server is authoritative. That logic must be
  deleted, not ported.
- Kits are illustrative, **not** authoritative `SkillSpec` data. No
  replacements, cooldowns, hidden/reveal state, draw, or no-contest.
- No PvP: no sealed opponents, waiting, cancel, reconnect, or timers.

`handoff-notes.md` has the full contract-conformance table and gap list.

## Render evidence

Canvas exports, since the prototype's art is generated at runtime:

- `render-evidence/character-busts.png` — five busts at browse scale.
- `render-evidence/fighter-cards.png` — busts at true combat-card size, ally
  and enemy treatments.
- `render-evidence/world-plate.png` — the daylight environment plate.

These are procedural stand-ins for the illustration contract's real
requirements (3:4 roster card, square face crop, wide combat crop, registered
focal points), not a substitute for them.
