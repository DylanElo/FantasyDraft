# Season 3 First Creation and battle presentation QA

Captured 2026-07-18 from the corrected structural implementation on
`codex/culling-current-ui`. This evidence supersedes the First Creation and
battle captures from earlier panel-reskin passes.

## Capture contract

- Live Flask/Phaser page at `http://127.0.0.1:5018/`.
- Maintained Phaser cache chain `v28` from the HTML shell through every ES
  module import.
- Exact viewport and canvas pairs: 360x800, 390x844, and 430x932.
- Four states at every size: art-led First Creation roster, full Character
  Study, selected-fighter Combat, and valid three-action Queue Review.
- The browser-local fixture in `artifacts/visual_qa/current/qa-state.js`
  changes only in-memory presentation state. It does not emit a gameplay
  command or change server data.
- Queue Review is entered after selected planning so the captures also verify
  that planning-only target and selected-fighter VFX handles are cleared.

## Runtime results

Across all 12 captures:

- active scene, viewport, and Phaser canvas matched the requested state and
  dimensions;
- the per-skill action atlas was loaded and presentation services were active;
- all registered non-modal controls were at least 44x44, stayed inside the
  viewport, and had no pairwise overlap;
- motion tweens were active with reduced-motion support available;
- the WebAudio service reported supported and remained gesture-gated;
- Queue Review contained three left-to-right actions, a concrete Wild payment,
  no stale planning selection ring, and an enabled `CONFIRM QUEUE` path; and
- the browser console contained no warning or error entries from the final run.

The full-screen `Queue Review Battlefield Lock` input catcher is intentionally
excluded from overlap comparisons because it prevents retained battlefield
controls from receiving input while the later queue controls remain active.

## Files

- `first-creation-roster-{360x800,390x844,430x932}.png`
- `first-creation-detail-{360x800,390x844,430x932}.png`
- `combat-{360x800,390x844,430x932}.png`
- `queue-review-{360x800,390x844,430x932}.png`

These captures are implementation evidence, not a commercial-release rights
determination for the generated or franchise-directed visual assets.
