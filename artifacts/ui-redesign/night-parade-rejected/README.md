# Night Parade — rejected direction

Explored and set aside 2026-08-12. **Never approved. Never shipped. Do not adopt.**

## ⚠ This contradicts the locked visual direction

Night Parade is a **nocturnal, near-black** treatment: void-navy ground, rain,
neon emission, rim-lit silhouettes. `docs/season3_visual_system.md` locks the
opposite — Incident Cut is **daylight**: bone and ivory panels, cold bone-gray
concrete, bright saturated blue sky, with storm ochre only as a weather accent.

They cannot both be true. Adopting this would require the user to author a
decision record explicitly superseding the Incident Cut palette. **No such
record exists.** Per `AGENTS.md`, an agent that finds this and the locked doc in
conflict must stop and report it, not implement it.

### The most dangerous file here

`candidate-tokens.js` is deliberately shaped to mirror the live
`window.JJK_MOBILE_TOKENS` export in `web/static/phaser-design-tokens.js`, so a
swap would be mechanical. **That is exactly why it must not be swapped.** It
would silently repaint the entire client into a direction nobody approved.

One part of it is safe and worth noting: the T/J/S/B energy colours in it are
copied **unchanged** from the shipping token file, because energy semantics are
gameplay law rather than art direction. That much is correct in any palette.

## Why it is kept

It is a complete, working exploration of a coherent alternative, and the
reasoning that killed it is more useful than the artwork. The short version:

- The visual direction was the blocker, not the code quality.
- Discovering that took reading `docs/season3_visual_system.md` properly. An
  earlier read of the palette table alone was not enough — the "Locked screen
  composition" section also mandates structure (fighter cards over a
  battlefield lane, four tall skill cards, a carousel roster) and explicitly
  says recolouring a panel stack does not satisfy the direction.

If the nocturnal direction is ever revisited deliberately, the groundwork is
here. Until then it is history.

## What replaced it

`../incident-cut-prototype/` — the same flow rebuilt to the locked Incident Cut
contract, with a real Queue Review including player-assigned Wild costs. That
one is a usable design reference. This one is not.

## Contents

- `prototype.html` — playable, self-contained, no build step.
- `candidate-tokens.js` — the token file described above. Reference only.
- `handoff-notes.md` — the original integration notes, which lead with the
  blocker and list the conformance gaps.

## Also true of this prototype

Independent of the palette question, it shares the limitations of any of these
explorations: vanilla canvas/DOM rather than Phaser scenes, and it resolves
damage, legality and victory locally, which the real client must never do since
Battle v2 is authoritative. Its kits are illustrative, not `SkillSpec` data.
