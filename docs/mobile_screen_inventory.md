# JJK Arena Mobile Screen Inventory

This inventory converts the mobile Phaser UI/UX brief into implementation-ready screens, components, and acceptance notes. It is the working checklist for the Phaser client and the matching Figma file.

## Figma Pages

| Page | Purpose | Must include |
| --- | --- | --- |
| `00 Cover + Moodboard` | Product tone and reference board | Title, tagline, luminous urban anime worlds, character-led composition, manga print texture, tactile controls, and Domain contrast studies |
| `01 Design Tokens` | Shared visual constants | Colors, energy colors, type, radii, motion timings, phone frames |
| `02 Components` | Reusable game UI parts | HUD, fighter token, skill card, queue tray, character sheet, toast |
| `03 Mobile Screens` | Static 390 x 844 screen designs | All ten required screens |
| `04 Battle Flow Prototype` | Tap-through tactical loop | Lobby to First Creation to battle to results |
| `05 Motion Notes` | Animation specs | Press, sheet, target ring, damage, HP lag, reveal, domain pulse |
| `06 Phaser Implementation Notes` | Engineering handoff | Scene/component mapping, store/server ownership, touch-target rules |
| `07 QA / Edge Cases` | Manual validation matrix | Small viewport, energy, dead/stunned fighters, hidden info, PvP/CPU locks |

## Screen Inventory

| Screen | Current surface | Target UX state | Primary implementation notes |
| --- | --- | --- | --- |
| Boot / Splash | `BootScene` preload handoff | Brand moment with cursed background, floating sigil, loading/connection state | Keep brief; avoid delaying real load artificially |
| Home / Lobby | `LobbyScene` | Bright world-led hero composition, one dominant Quick Play action, compact secondary modes, and labeled bottom navigation | Lower-half actions, actual active trio, player name, and editable room code remain reachable; do not invent currencies or levels |
| First Creation / Starter Select | `FirstCreationScene` | Trio slots, preset chips, 19-character starter roster, character detail sheet | Preserve full names, authoritative kits, and CPU entry mode |
| Mission Map | `MissionMapScene` | Student Era, Goodwill, JJK0, and locked later routes | Keep route state server-backed before expanding mission rules |
| Matchup Screen | Not dedicated yet | My trio bottom, enemy trio top, objective, Enter Domain CTA | Can be a transient scene between starter select and combat |
| Combat Screen | `CombatScene` | Light rooftop battlefield, compact authoritative HUD, enemy row, open targeting field, ally row, and tactile bottom command dock | Keep all critical taps in lower 55%; expose real HP, statuses, energy, costs, target stages, and queue state; 44px minimum touch zones |
| Queue Review Screen | `CombatQueueReviewScene` overlay behavior in `CombatScene` | Light command sheet with three actions, target fields, adjusted costs, remaining energy, Wild selectors, reorder controls, and confirm/cancel | Keep action-local errors and server-authoritative confirmation |
| Resolution Playback | `CombatScene.playEvents` text tween | Action banner, caster pulse, target lock-on, damage numbers, HP lag, reveal chips | Use animation to clarify state change, not cover HP/targets |
| Results Screen | `ResultScene` | Victory/Defeat, winning trio, turn count, damage, mission progress, rewards | Preserve local records save |
| Records Screen | `RecordsScene` | Win/loss, recent matches, favorite trio, fastest win, biggest hit | Extend local record model later if needed |

## Component Inventory

| Component | Required variants | Phaser status |
| --- | --- | --- |
| App Shell | Phone frame, safe zones, HUD/stage/dock slots | Implemented in `LayoutService.frame()` with per-screen regions |
| Top HUD | My turn, enemy turn, queue review, resolving, finished | Implemented in `CombatScene.renderTopHud()` for authoritative phase/timer/energy state |
| Fighter Token | Ally ready/selected/queued/dead; enemy normal/targetable/protected/dead | Implemented in `renderFighterPlate()` with full name and HP bands |
| Skill Card | Available, selected, cooldown, not enough energy, stunned, replacement, domain, invisible | Implemented in `renderSkillButton()` plus Skill Detail progressive disclosure |
| Queue Tray | Three queued actions, reorder, Wild selector, confirm/cancel | Implemented as battlefield chips plus the light Queue Review command sheet |
| Character Detail Sheet | Portrait, role, tags, skills, replacements, statuses, synergies | Implemented in `FirstCreationScene`; Combat Skill Detail handles battle-time technique reading |
| Toast / Feedback | Error, success, warning, combat log, mission progress | Basic toast exists |
| Damage Number | Damage, heal, status, reveal | Basic playback text exists |

## Mobile Layout Targets

| Frame | Size | Treatment |
| --- | --- | --- |
| Small portrait | 360 x 800 | Compact token and dock spacing; no hidden confirm controls |
| Primary portrait | 390 x 844 | Canonical Figma and Phaser tuning target |
| Large portrait | 430 x 932 | Same layout with more stage/dock breathing room |
| Tablet/desktop | Wider than 620px | Center a phone-shaped canvas; do not stretch the battle board |

## Acceptance Checklist

- The browser page remains a pure Phaser canvas host.
- The Phaser shell uses shared design tokens for colors, type, radii, motion, and mobile frame targets.
- Every maintained Phaser screen follows the locked Season 3 Culling Current system in `docs/season3_visual_system.md`: bone/smoke routine surfaces, storm-ochre painted worlds, deep-indigo structure, aged gold for selection, curse cyan for legal targets, green for queued actions, barrier red for enemy/damage, ink-charcoal text, and violet only for Domain/cinematic moments.
- Desktop and tablet viewports center a phone-shaped canvas rather than stretching battle UI.
- Combat screen always exposes turn, living fighters, selected fighter, selected skill, legal targets, energy, queue, and latest resolution feedback.
- Server authority remains unchanged: legality, damage, cooldowns, hidden info, winner, and mission progress stay server-owned.
