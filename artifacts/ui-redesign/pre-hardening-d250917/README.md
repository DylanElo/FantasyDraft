# Pre-hardening mobile visual QA

Captured from the working tree based on `d250917` after the 10 px meaningful
text-floor pass on 2026-07-17, before the later close-alpha safe-area, shared
header, hit-target, roster-wrap, and cache-version remediation.

These files are retained as historical comparison only. They must not be
cited as post-remediation evidence for `codex/close-alpha-hardening`.
The capture backend originally returned JPEG bitstreams under `.png` names;
this hardening pass decoded and re-saved all 18 as real PNG containers without
changing their rendered pixels beyond lossless container normalization.
The 390x844 and 430x932 captures were also one physical row short; their 12
files were mechanically padded with one sampled background row at the bottom
so every retained file now matches its declared viewport dimensions.

Viewports:

- `360x800`
- `390x844`
- `430x932`

Screens captured at every viewport:

- Lobby
- Draft
- First Creation
- Mission Map
- Combat planning
- Records

The in-app browser console reported no warnings or errors during that pass.
The PNGs are genuine captures of the named `d250917` revision, but they are no
longer the current branch's visual-verification set.
