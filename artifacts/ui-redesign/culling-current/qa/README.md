# Culling Current mobile QA evidence

Status: historical v23 vertical-slice evidence. It does not validate the
current Season 3 runtime or its replacement portrait/environment set.

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

## Transport correction

The HTTP 400 responses in this checkpoint were caused by starting the isolated
QA server on port 5001 while the Flask-SocketIO CORS allowlist still contained
only port 5000. They were not a Windows transport limitation. A valid isolated
QA launch must set `JJK_CORS_ORIGINS` to both the chosen `127.0.0.1` and
`localhost` origins before starting the process. This checkpoint therefore
remains visual-only; no current Season 3 browser/networking claim should be
inferred from it.

## Art limitation

This folder records the earlier Home/Combat checkpoint. Its bright environment
plates and abstract portraits were superseded by the full Season 3 environment
and exact-19 portrait pass documented under `artifacts/ui-redesign/s3-style/`
and `web/static/assets/*/PROVENANCE.md`. Current structural Home, Combat, and
Queue Review implementation evidence lives under
`artifacts/ui-redesign/s3-structure-v2/qa/`.
