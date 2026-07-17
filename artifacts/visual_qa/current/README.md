# Current mobile visual QA

No screenshot in this directory is claimed as post-remediation evidence yet.
The in-app browser loaded the local application before the cache-version bump,
but its URL policy rejected the required reload afterward and explicitly
forbade navigation retries or alternate browser-control workarounds. The prior
captures were therefore moved to `../pre-remediation/` instead of being
misrepresented as verification of the new layout.

`qa-state.js` is the reproducible, browser-local fixture for the next permitted
capture run. On a local page built from the remediated source:

1. Evaluate `qa-state.js` through the browser developer console/CDP.
2. Set the viewport to 360x800, 390x844, or 430x932.
3. Invoke `window.applyJjkVisualQaState(name)` with each of:
   `first-creation-roster`, `first-creation-detail`, `queue-review`,
   `skill-detail`, and `result`.
4. Capture the full viewport as PNG with device scale factor 1.
5. Verify the PNG signature, exact dimensions, console, and
   `window.__phaserShellButtons` hit rectangles.

The fixture mutates only the in-memory Phaser store. It does not send socket
commands, write server data, or modify production source. The remediated client
uses Phaser cache version 22 and is based on repository commit `832b0be` plus
the current UI/docs working-tree patch.
