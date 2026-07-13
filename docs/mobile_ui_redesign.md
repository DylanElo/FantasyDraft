# Mobile UI/UX Reset Pass

## What Changed

- Replaced the dark Phaser token direction with a light-first Bright Anime Tactics palette and compatibility aliases for older scene code.
- Added a manifest-driven asset layer with original fallback backplates for lobby, battlefield, victory, and defeat screens. These are replaceable slots, not scraped wiki/canon assets.
- Rebuilt the shared Phaser UI layer around bright mobile-game components: `SceneBackdrop`, `HeroActionButton`, `CharacterShowcaseCard`, `TeamTray`, `SkillActionCard`, `QueueActionCard`, status ribbons, sheets, and poster-style result surfaces.
- Reworked Lobby, First Creation/Roster, Combat, Queue Review, and Result so the primary presentation is bright, framed, and character/loadout-forward instead of nested dark panels.
- Preserved Battle v2 server-authoritative store/socket flows: start classic, submit plan, update queue, confirm queue, cancel queue, convert energy, end turn, and server state updates.
- Bumped Phaser shell/static cache versions to `v28`.
- Added a second reference-driven styling pass after reviewing concrete UI cues:
  - Jujutsu Kaisen: Phantom Parade: command RPG plates, formation cards, ticket-like panels, and mobile anime RPG hierarchy.
  - Marvel Snap: tactile card framing and beveled collectible-card treatment.
  - Persona 5 Royal: angular confidence and graphic punch, without copying its red/black identity.
- Added a v24 production pass after live inspection showed the v23 lobby still felt skeletal:
  - Local portrait SVGs now render in Phaser character slots instead of being ignored.
  - Portraits are rasterized as tall art (`420x560`) instead of square thumbnails.
  - Lobby now has a lead-character poster composition in the upper viewport.
  - Combat skill actions are stacked full-width command plates, closer to mobile command RPG UI, instead of cramped two-column web cards.
  - Missing portrait assets still fall back to an original aura/silhouette plate.
- Added a v25 one-pass production sweep:
  - Combat fighter tokens now use slanted lane pieces, stronger HP/readiness framing, and larger local portrait art.
  - The battlefield now has selected-fighter cut-in composition, lane washes, and clearer targeting treatment.
  - The command dock now reads as a command console with full-width technique strips.
  - Lobby poster positioning was corrected after live screenshot review.
  - Queue Review was verified as a distinct tactical timeline with visible invalid-state messaging.
  - Result now includes a poster-style winner/MVP art focal point.
- Added a v26 art-direction pass:
  - Replaced the old abstract medallion portrait SVGs with richer original unit-poster SVGs for the local portrait set.
  - Added portrait cache-busting to Phaser loading so updated art is not hidden by browser cache.
  - Added Toge's local portrait file to the Phaser portrait allowlist.
  - Fixed Result title/MVP overlap found during v26 screenshot QA.
- Added a v27 combat-readability pass:
  - Expanded the combat command dock and technique cards so the lower hand can show more than a tiny label row.
  - Technique cards now expose target, current/base cooldown, cost symbols, full energy names, effect summary, and disabled reason as separate pieces of information.
  - Disabled cards no longer hide the effect text; energy shortage/cooldown/locked-state reasons sit in the card metadata line.
  - Battlefield now includes an enemy-plan ribbon that shows visible pending enemy actions by caster, skill, and target, plus visible enemy active status effects.
  - Combat layout was tightened around the larger command deck without changing Battle v2 server rules or store/socket action names.
- Added a v28 focused-combat replacement after live review showed the v27 command list was still bloated:
  - Removed the four stacked technique-description rows from the primary combat surface.
  - Added compact technique tabs plus one large focused technique panel with cost, target, cooldown, effect, blocked/ready state, Info, and Use.
  - Split the focused panel into a left rules/effect column and a right action column so text no longer collides with controls.
  - Removed the selected-character cut-in and queue chips from the battlefield stage to reduce visual noise.
  - Preserved the enemy-plan ribbon and all existing Battle v2 submit/queue/confirm/cancel/end-turn behavior.

## Verified

- JavaScript syntax checks passed for the changed Phaser modules and shell entry.
- `python -m pytest -q` passed: `112 passed, 1 skipped`.
- Local server was restarted and confirmed at `http://127.0.0.1:5000/` with HTTP 200.
- Live browser at `390x844` previously loaded the v22 reset:
  - `phaser-design-tokens.js?v=22`
  - `phaser-shell.js?v=22`
  - full-size Phaser canvas.
- Live browser screenshots verified:
  - Lobby: bright first screen, visible team tray, large Classic Arena CTA, secondary Create/Roster/PvP actions.
  - First Creation: mission banner, selected trio cards, starter banners, locked-route cards, character showcase cards, Enter Arena action.
  - Combat: bright top HUD, readable energy rail, battlefield stage, ally/enemy tall fighter cards, bottom command hand, skill cards.
  - Queue Review: opened from a real queued self-skill; timeline, energy chips, reorder controls, validity line, and Confirm Queue rendered.
  - Result: rendered by temporarily forcing a finished client state for visual QA, then reloading the page to clear that temporary browser-only state.
  - `430x932` viewport: Lobby and First Creation rendered with the corrected card/backdrop depth.
- For the v25 pass, static checks and the full Python suite passed. The local server served v25 shell assets over HTTP. The in-app browser automation bridge still timed out, so visual QA used headless Chrome through the DevTools protocol instead.
- v25 screenshot evidence:
  - Lobby: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v25-lobby-fixed.png`
  - Combat: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v25-combat-fixed.png`
  - Queue Review: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v25-queue-fixed.png`
  - Result: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v25-cdp\04-result.png`
- v26 screenshot evidence:
  - Lobby: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v26-final\01-lobby.png`
  - Combat: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v26-final\02-combat.png`
  - Result: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v26-final\03-result.png`
- v27 combat-readability screenshot evidence:
  - `390x844`: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v27-combat-readability-final2\390x844-combat-enemy-action.png`
  - `430x932`: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v27-combat-readability-final2\430x932-combat-enemy-action.png`
  - The enemy action in those screenshots was injected in browser-only QA state to verify the visible opponent-action ribbon without changing server battle rules.
- v28 focused-combat screenshot evidence:
  - `390x844`: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v28-focused-combat-final\390x844-combat-focused.png`
  - `430x932`: `C:\Users\dylan\AppData\Local\Temp\fantasydraft-v28-focused-combat-final\430x932-combat-focused.png`
  - The enemy action in those screenshots was injected in browser-only QA state to verify the visible opponent-action ribbon without changing server battle rules.

## Remaining Notes

- Licensed/canon character and background assets are still placeholders by design. The implementation now has explicit manifest/backplate slots and local original portrait fallbacks, but no wiki/Fandom images were scraped or bundled.
- Some deep roster pages can still become dense on small screens because many characters are available; the current pass keeps them playable and framed, but future licensed full-body art could make those cards feel richer.
- This pass intentionally changed UI/UX and asset presentation only; it did not add new gameplay mechanics.
