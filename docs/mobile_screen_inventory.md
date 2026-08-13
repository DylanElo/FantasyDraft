# JJK Arena Mobile Screen Inventory

This inventory maps the portrait-first Phaser client to its implemented screens, data ownership, and remaining visual acceptance work. It is an implementation snapshot and Figma handoff checklist; automated layout coverage is not the same as manual browser approval.

## Locked product constraints

- Primary viewport: `390 x 844`; also support `360 x 800` and `430 x 932`, including safe-area variants.
- Desktop and tablet center a phone-shaped game surface instead of stretching it into a dashboard.
- First Creation remains exactly the locked 19-character starter roster.
- The client selects intent and presents serialized state. The server continues to own battle legality, hidden information, results, mission completion, and rewards.
- Every maintained screen uses Incident Cut: world-led compositions, contextual clipped controls, restrained hatching, and semantic gold/cyan/red/green accents.

## Figma pages

| Page | Purpose | Must include |
| --- | --- | --- |
| `00 Cover + Moodboard` | Product tone and reference board | Title, tagline, painted urban worlds, character-led composition, manga-print texture, tactile controls, and Domain contrast studies |
| `01 Design Tokens` | Shared visual constants | Palette, energy colors, typography, shape language, motion timings, and phone frames |
| `02 Components` | Reusable game UI parts | HUD, fighter card, skill card, queue action, character study, mission node, matchup trio, toast, and settings sheet |
| `03 Mobile Screens` | Static portrait screen designs | Every maintained screen listed below at `390 x 844` |
| `04 Battle Flow Prototype` | Tap-through tactical loop | Home -> First Creation/Team Setup -> Matchup -> Combat -> Queue Review -> Results -> Records |
| `05 Motion Notes` | Animation and sound specifications | Press, scene entrance, carousel change, target ring, skill art, impact, reveal, result hero, profile reveal, and reduced-motion behavior |
| `06 Phaser Implementation Notes` | Engineering handoff | Scene mapping, store/server ownership, privacy boundaries, and touch-target rules |
| `07 QA / Edge Cases` | Manual validation matrix | Small viewport, safe areas, long names, hidden information, PvP waiting/cancel, mission progression, all terminal outcomes, and empty records |

## Implemented screen inventory

| Screen | Maintained surface | Implemented experience | Data and navigation contract |
| --- | --- | --- | --- |
| Boot / Splash | `BootScene` | Brief brand/loading composition with the maintained world art and connection/loading feedback | Does not delay real loading artificially; enters the maintained Phaser flow |
| Home / Lobby | `LobbyScene` | Full-screen staging scene with the saved trio layered into the environment, compact identity/connection treatment, edge rail for Team/Missions/Records, and an oversized Deploy cut that reveals CPU or Private PvP | Deploy mode choices open `DraftScene`; identity and room inputs retain the DOM accessibility editor |
| First Creation / Starter Select | `FirstCreationScene` | Active trio slots, `ALL 19`/Tokyo/Kyoto/Special filters, one large featured fighter, carousel paging, and a full-screen Character Study | Uses only the canonical 19 starters; Character Study exposes every authoritative primary/replacement skill, cost, cooldown, targeting, classes, and description; `Review Matchup` opens review without emitting a match from this screen |
| Team Setup | `DraftScene` + `DraftRosterScene` | Art-first reusable team editor with large featured fighter, readable trio slots, filters/carousel, add/remove action, and the same progressive Character Study | CPU mode can edit player and CPU trios and cycle difficulty; Private Room edits only the player's trio and shows the room code; `Review Matchup` performs validation and changes scene but does not start Combat |
| Mission Map | `MissionMapScene` | Painted colony map with a route spine, numbered mission nodes, `OPEN`/`ACTIVE`/`CLEARED` states, completion progress, a selected-mission dossier, recommended-trio portraits, and a sealed-later-incidents endpoint | Mission list, active mission, completed routes, unlock label, and progression are profile/server-backed; `SELECT THIS TRIO` applies the recommendation and opens First Creation; the client does not award completion |
| Matchup | `MatchupScene` | Diagonal illustrated confrontation with layered trios, explicit mode, authoritative waiting state, and a thumb-reachable Enter/Join/Cancel action | CPU shows its selected trio. PvP uses sealed silhouettes until authoritative opponent data permits reveal |
| Combat Planning | `CombatScene` | Environment-first stage with enemies deep, allies near, slim HUD, targeting geometry, selected-fighter readout, four technique cuts, compact three-shot storyboard, and one dominant next action | The stage occupies at least 55% and all command/queue controls approximately 35%; legality, costs, replacements, disabled reasons, status and viewer-safe hidden state remain store-backed |
| Queue Review | `CombatQueueReviewScene` behavior within `CombatScene` | The storyboard expands across the lower 35% while the six-fighter battlefield stays visible; horizontal cuts expose art, order, routes, exact cost, Wild payment, validation, reorder, clear, back, and confirm | Confirmation stays disabled for invalid/underpaid actions and is revalidated by the server |
| Resolution Playback | `CombatScene` + presentation/playback services | Action banner, selected-fighter emphasis, target lock, skill/VFX presentation, damage/heal/status feedback, reveal cues, and HP response | Playback consumes authoritative event-log entries; animation clarifies state changes and does not invent results |
| Results | `ResultScene` | Outcome-specific after-action header, cinematic winning/player trio hero, reveal entrance, mission debrief/progress, reward reveal, biggest current-match impacts, and paired Rematch/Return Home actions | Supports win, loss, draw, and no-contest presentations. Metrics and impacts derive from the authoritative terminal state/event log. Rematch returns to Team Setup; leaving clears the live session. The finished result is also stored in the bounded local record archive |
| Records / Profile | `RecordsScene` | Device profile hero followed by one featured incident and a compact chronological reel; Prev/Next changes the featured authoritative record | Uses at most the 12 locally stored finished-result summaries; no ranking or fabricated analytics |

Combat's player-facing sequence is **Planning** (before the first saved order),
**Orders Open** (one or more saved orders while the four-technique command deck
remains available), then **Queue Review** (the explicit ordering/Wild/confirm
deck). These are interaction labels layered over the unchanged authoritative
Battle v2 phases; reconnect, timer captions, accessibility, HUD, and client
diagnostic snapshots use the same distinction. Transport loss locks commands
and freezes the last confirmed displayed timer until the next authoritative
snapshot; resume-in-flight is labeled as restoring rather than connected.

## Reusable component inventory

| Component | Required variants | Phaser status |
| --- | --- | --- |
| App shell | Phone frame, safe zones, header/stage/dock slots | Implemented through `LayoutService.frame()` and per-scene compositions |
| World surface | Campus, rooftop, mission map, routine wash, cinematic punctuation | Implemented through shared environment helpers and registered art |
| Button / icon action | Primary, bone, smoke/disabled, danger, 44 px icon | Implemented through shared Season 3 button helpers and hit-target registration |
| Trio card | Filled, empty, selected, rival, hidden/sealed | Implemented across First Creation, Team Setup, Matchup, Results, and Records |
| Featured fighter | Selected/unselected, add/remove/full, player/CPU accent | Implemented in `DraftRosterScene` and the First Creation browser |
| Character Study | Hero profile, tags, skill/replacement art, cost, cooldown, target grammar, classes, full description | Implemented as a full-screen progressive view in First Creation and Team Setup |
| Mission route | Open, active, cleared, selected, sealed future route | Implemented in `MissionMapScene`; status is derived from the First Creation profile |
| Fighter card | Ally ready/selected/queued/dead; enemy normal/targetable/protected/dead | Implemented in Combat with full name and HP/state bands |
| Skill card | Available, selected, cooldown, insufficient energy, stunned, replacement, Domain, hidden/revealed | Implemented in Combat plus full Skill Detail disclosure and registered skill visuals |
| Queue action | Valid/invalid, target routes, Wild selector, reorder, confirm/cancel | Implemented in Queue Review |
| Result/profile hero | Outcome accents, three-fighter reveal, most-deployed trio reveal | Implemented in Results and Records with presentation-layer entrances |
| Presentation settings | SFX, reduced motion, close/exit behavior | Implemented as the shared presentation settings sheet where exposed |
| Toast / feedback | Error, success, warning, connection, mission progress | Implemented as shared scene feedback |

## Acceptance checklist

- The browser page remains a thin Phaser canvas/bootstrap host.
- No maintained selection screen falls back to the deprecated dashboard, two-column roster list, or dense preset/roadmap panel stack.
- First Creation and Team Setup show full character names and expose full Character Study details through progressive disclosure.
- Mission Map route state and Results mission rewards remain server/profile-backed.
- Private Room Matchup never renders the stale local CPU roster as the opponent and never exposes unreceived opponent data.
- Fresh CPU and PvP starts pass through Matchup; waiting/cancel, reconnect/resume, rematch, and terminal-result routing preserve authority.
- Records clearly read as device-local history and include draw/no-contest rather than treating every non-win as a loss.
- Primary controls remain at least 44 px and stay above safe-area bottoms at `360 x 800`, `390 x 844`, and `430 x 932`.
- Text wrapping, portrait crops, settings overlays, animation, and sound are manually checked in a real browser at `390 x 844` and `430 x 932`; automated geometry tests alone are not sufficient visual evidence.
- Console errors, private-data leaks, clipped controls, and overlapping CTAs are release blockers.

See `docs/first_creation_visual_qa.md` for the current capture matrix and evidence rules.
