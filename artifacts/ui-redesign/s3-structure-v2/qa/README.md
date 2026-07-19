# Season 3 structural mobile QA

Captured 2026-07-18 from the structural Home, Combat, and Queue Review rewrite
on `codex/culling-current-ui`. These images supersede the rejected panel-reskin
captures under `artifacts/ui-redesign/s3-style/qa/`.

## Capture contract

- Live Flask/Phaser page at `http://127.0.0.1:5017/`.
- Phaser cache chain: `v27` from the HTML shell through every maintained ES
  module import.
- Exact viewport and canvas pairs: 360x800, 390x844, and 430x932.
- Screens at every size: full-bleed Home, selected-fighter Combat, and the real
  `FINAL ORDER` Queue Review deck with three queued actions.
- Queue Review used a valid Wild assignment and an enabled server-validation
  confirmation path. It retained all six fighter cards and exposed the three
  actions left-to-right.
- The browser-local fixture at `artifacts/visual_qa/current/qa-state.js` changes
  only in-memory presentation state and suppresses battle updates during the
  deterministic capture. It does not emit a gameplay command or modify server
  state.
- The browser produced exact-dimension full-page JPEG captures. They were
  deterministically transcoded to the checked-in PNG files without resizing,
  cropping, padding, or altering game content.

## Geometry and runtime results

For all nine captures, the active Phaser scene matched the requested state,
the viewport and canvas matched, and every registered non-modal control:

- measured at least 44x44 CSS pixels;
- stayed within the viewport; and
- had no pairwise hit-region overlap.

The intentional full-screen `Queue Review Battlefield Lock` was excluded from
the overlap comparison because it prevents interaction with the retained
battlefield while the later-registered queue controls remain active.

The browser console reported no warnings or errors. The isolated QA server was
started with explicit 5017 localhost/127.0.0.1 CORS origins, and Socket.IO
polling requests completed successfully during capture. Two HTTP 400 responses
from pre-restart tab session IDs occurred before the v27 capture run; the final
capture page, assets, and Socket.IO traffic had no 400, 404, or 500 responses.

## Files

- `home-{360x800,390x844,430x932}.png`
- `combat-{360x800,390x844,430x932}.png`
- `queue-review-{360x800,390x844,430x932}.png`

These are implementation evidence, not licensed promotional assets or a
commercial-release rights determination.
