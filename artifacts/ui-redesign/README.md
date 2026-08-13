# Combat UI Redesign Evidence

## Approved concept source

`concepts/culling-current/` contains the user-approved, non-shipping visual
north star, exact generation prompts, and provenance/caution notes that led to
the maintained Season 3 system. These files are intentional design history,
not runtime assets or current release QA.

## Before

- `before/390-combat-default.png` — original live combat canvas at 390x844.
- `before/390-page.png` — original page capture.
- `before/console.txt` — original browser console capture.

## After

Responsive default states:

- `after/360x800-combat-default.png`
- `after/390x844-combat-default.png`
- `after/430x932-combat-default.png`
- `after/responsive-contact-sheet.jpg`

Interaction states at 390x844:

- `after/390-01-default-no-fighter.png`
- `after/390-02-character-selected.png`
- `after/390-03-unavailable-skill.png`
- `after/390-04-skill-selected-legal-targets.png`
- `after/390-05-illegal-target-feedback.png`
- `after/390-06-action-queued.png`
- `after/390-07-queue-review.png`
- `after/390-state-suite-contact-sheet.jpg`

Machine-readable QA:

- `after/visual-qa-report.json` — live state, registered buttons, minimum target checks, viewport-bound checks, and console messages.

Comparison:

- `comparison/390-before-after.png`

## Interaction prototype

`incident-cut-prototype/` — a self-contained playable prototype of the full
mobile flow, 2026-08-12. Design reference only: vanilla canvas/DOM rather than
Phaser scenes, and it resolves combat locally, so it is not a port target.

Useful for its Queue Review treatment with player-assigned Wild costs, its
measured stage/command split, and its motion inventory. **Its character art
uses the illustration grammar rejected on 2026-08-02** — see that directory's
README before treating any of its rendering as a target.

## Rejected direction

`night-parade-rejected/` — a nocturnal near-black treatment explored and set
aside on 2026-08-12. Never approved, never shipped. It **contradicts the locked
daylight Incident Cut palette** in `docs/season3_visual_system.md`, and
adopting it would require a decision record explicitly superseding that
document. No such record exists.

Note in particular that `night-parade-rejected/candidate-tokens.js` is shaped
to drop straight into `window.JJK_MOBILE_TOKENS`. Do not swap it in. See that
directory's README.
