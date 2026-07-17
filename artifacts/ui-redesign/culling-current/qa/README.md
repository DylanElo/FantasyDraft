# Culling Current mobile QA evidence

Captured 2026-07-17 from the uncommitted working-tree implementation on
`codex/culling-current-ui`, based on `f8567d13075adebcfccded09c9b5ac43ebedb802`.
The client used Phaser cache version 23 and the live local Flask page at
`http://127.0.0.1:5001/`.

## Capture contract

- Exact viewport and canvas pairs: 360x800, 390x844, and 430x932.
- Current states: Home, selected-fighter Combat, Skill Detail, invalid Queue
  Review, and valid Queue Review at all three sizes.
- Safe-area stress: 47px top plus 34px bottom for Home, Combat, and invalid
  Queue Review at 360x800; invalid Queue Review also at safe 390x844.
- Long identity stress: `home-long-profile-360x800.png` verifies that full
  stored values remain editable while the Home display truncates cleanly.
- Every registered non-modal control measured at least 44x44 CSS pixels,
  remained inside the canvas, and had no pairwise overlap. Full-screen modal
  catcher rectangles were intentionally excluded from overlap comparisons.
- All runtime environment textures reported loaded before the final captures.

The browser-local fixture is
`artifacts/visual_qa/current/qa-state.js`. It uses the current store's real
character and skill catalog, mutates only in-memory presentation state, and
emits no gameplay socket command. For deterministic visual evidence, the local
fixture pins its connection indicator to connected; this does not alter source
code or server state.

## Known local transport warning

The Windows development server returned HTTP 400 for local Socket.IO WebSocket
upgrade and subsequent polling-session requests during capture. There were no
page exceptions, failed non-Socket.IO resources, or missing runtime textures.
This evidence therefore validates rendering and interaction geometry, while
the automated socket/gameplay suite remains the authority for networking.

## Art limitation

The bright environment plates are runtime assets with recorded provenance.
The 19 character cards are still the existing abstract portrait placeholders;
the concept character art is not shipped. A coherent original or licensed
roster-art pass remains separate work.
