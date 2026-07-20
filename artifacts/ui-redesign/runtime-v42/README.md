# JJK Arena mobile runtime QA — cache v42

This is the final live-browser evidence set for commit
`2ddefb360db7d8d5491628e469a231f5e7996b63` on
`codex/audit-mobile-ui-closure`.

The captures come from the real Phaser client at `http://localhost:5017/`,
connected to the local Flask-SocketIO Battle v2 server. The 15 PNG files are
direct canvas captures at their exact target viewport. The identity editor is
a browser screenshot because it is an intentional native DOM dialog layered
over the Phaser canvas.

## Coverage

| Viewport | Home | First Creation | Character Study | Combat Planning | Queue Review |
| --- | --- | --- | --- | --- | --- |
| 360x800 | `qa/360x800-01-home.png` | `qa/360x800-02-first-creation.png` | `qa/360x800-03-character-study.png` | `qa/360x800-04-combat-planning.png` | `qa/360x800-05-queue-review.png` |
| 390x844 | `qa/390x844-01-home.png` | `qa/390x844-02-first-creation.png` | `qa/390x844-03-character-study.png` | `qa/390x844-04-combat-planning.png` | `qa/390x844-05-queue-review.png` |
| 430x932 | `qa/430x932-01-home.png` | `qa/430x932-02-first-creation.png` | `qa/430x932-03-character-study.png` | `qa/430x932-04-combat-planning.png` | `qa/430x932-05-queue-review.png` |

The native identity editor is captured at
`qa/390x844-06-edit-identity-modal.jpg`.

## What the evidence verifies

- The Season 3 art direction and mobile hierarchy are present across Home,
  First Creation, Character Study, Combat Planning, and Final Order.
- First Creation uses a readable single-feature composition instead of the
  deprecated narrow roster columns, and the featured fighter opens a full
  Character Study page.
- Combat exposes active fighter, queued fighter, legal target, health, status,
  visible enemy skill, energy, timer, adjusted skill availability, and complete
  player-facing disabled reasons.
- `Short on Wild energy.` fits in full at 360px. No player-facing wire keys such
  as `green`, `blue`, `white`, or `red` appear in the captures.
- Every Queue Review capture is a genuine Final Order screen with a queued Q1,
  an explicit `X→T` or `X→S` Wild payment, reorder controls, and Confirm Queue.
- Q/order markers, target/active chips, and enemy active-skill chips use separate
  visual lanes. The 390px capture also shows the purple public-event ticker in
  a separate strip beneath the queue instruction.
- All 15 canvas PNGs match their declared viewport exactly. The native dialog
  uses a 390x844 CSS viewport and encodes as a 390x843 JPEG; its input and both
  buttons are 48px high and remain inside the viewport.

## Live-play proof

The final v42 run entered a CPU match through First Creation → Matchup → Enter
Arena, queued and reviewed a real action with Wild payment, confirmed it through
the server, observed the next authoritative combat state, played to Battle
Results, and returned through the real `RETURN HOME` action. The completed match
was `m_f517d6e5aca74e5396fe0a50aef13e`, terminal revision 33 / turn 33.

Runtime diagnostics reported no browser warning/error logs, no portrait contract
issues or failures, and all six required Home/combat environment and skill-atlas
textures loaded. The independent native-resolution audit found no blocking
clipping, overlap, dimension, or file-format defect.

## Remaining physical-device check

Browser automation can verify sound controls and event wiring, but it cannot
judge real-speaker loudness, timbre, or physical vibration feel. Those subjective
audio/haptic qualities still need one short pass on an actual phone.

Exact hashes, dimensions, runtime diagnostics, and dialog geometry are recorded
in `manifest.json`.
