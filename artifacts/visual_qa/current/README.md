# Current interaction-state visual QA

This directory contains fresh post-hardening evidence captured on 2026-07-17
from source commit `cb38012b5c5c07854781d04028120a5ed2da6163` with
Phaser cache version 22.

The pack contains four interaction states at 360x800, 390x844, and 430x932:

- First Creation character detail
- Queue Review
- Skill Detail
- Result

File names use `{state}-{width}x{height}.png`, for 12 screenshots total. First
Creation roster evidence lives in `../../ui-redesign/current/` so the 30-file
combined matrix has no duplicate state.

`qa-state.js` is the reproducible browser-local fixture used for the capture.
After the local v22 page and debug store are ready:

1. Evaluate `qa-state.js` in the page main world through the documented CDP
   developer interface.
2. Freeze incoming battle updates in memory for the capture session.
3. Set the viewport to 360x800, 390x844, or 430x932.
4. Invoke `window.applyJjkVisualQaState(name)` with
   `first-creation-roster`, `first-creation-detail`, `queue-review`,
   `skill-detail`, or `result`.
5. Wait for the expected scene and canvas, force a compositor paint, and
   capture the complete viewport.

Queue Review intentionally shows an unassigned Wild payment, its adjacent
validation message, and disabled Confirm Queue button. The fixture mutates
only the in-memory Phaser store. It sends no socket command and writes no
server or browser storage data.

Verification completed for this pack:

- all 12 files have a real PNG signature and exact declared dimensions;
- every registered control is at least 44x44 CSS pixels and remains inside the
  viewport;
- no non-modal registered hit rectangles overlap; full-screen sheet/review
  catchers intentionally sit beneath their modal controls;
- the browser console reported no warnings or errors;
- all four states were visually inspected at all three sizes.

The browser compositor used device-pixel scaling for 360x800 and 430x932, so
those source frames were normalized to their exact CSS viewport dimensions.
The native 390x844 capture API returned 390x843; one `#050711` background row
was added below the safe content. No game content was cropped, stretched, or
invented.

The previous historical set remains under `../pre-remediation/` and is not
current evidence.
