# JJK Arena Mobile Screen Inventory

This inventory converts the mobile Phaser UI/UX brief into implementation-ready screens, components, and acceptance notes. It is the working checklist for the Phaser client and the matching Figma file.

## Figma Pages

| Page | Purpose | Must include |
| --- | --- | --- |
| `00 Cover + Moodboard` | Product tone and reference board | Title, tagline, mood words, void/smoke/talisman/domain/dossier studies |
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
| Home / Lobby | `LobbyScene` | Fast mode selection: Quick Play, Private PvP, First Creation, Records | Lower-half actions, player name and room code remain reachable |
| First Creation / Starter Select | `DraftScene` currently doubles as draft/setup | Trio slots, preset chips, 19-character starter roster, character detail sheet | Split into `FirstCreationScene` during component refactor |
| Mission Map | Data exists in First Creation progression | Student Era, Goodwill, JJK0, and locked later routes | Add route cards before expanding mission rules |
| Matchup Screen | Not dedicated yet | My trio bottom, enemy trio top, objective, Enter Domain CTA | Can be a transient scene between starter select and combat |
| Combat Screen | `CombatScene` | Top HUD, enemy row, domain field, ally row, bottom command dock | Keep all critical taps in lower 55%; 44px minimum touch zones |
| Queue Review Screen | Inline confirm/cancel today | Modal sheet with three actions, wild selectors, reorder controls, confirm/cancel | Should become dedicated scene or overlay component |
| Resolution Playback | `CombatScene.playEvents` text tween | Action banner, caster pulse, target lock-on, damage numbers, HP lag, reveal chips | Use animation to clarify state change, not cover HP/targets |
| Results Screen | `ResultScene` | Victory/Defeat, winning trio, turn count, damage, mission progress, rewards | Preserve local records save |
| Records Screen | `RecordsScene` | Win/loss, recent matches, favorite trio, fastest win, biggest hit | Extend local record model later if needed |

## Component Inventory

| Component | Required variants | Phaser status |
| --- | --- | --- |
| App Shell | Phone frame, safe zones, HUD/stage/dock slots | Partially in `LayoutService.frame()` |
| Top HUD | My turn, enemy turn, queue review, resolving, finished | Partially in `CombatScene.renderTopHud()` |
| Fighter Token | Ally ready/selected/queued/dead; enemy normal/targetable/protected/dead | Partially in `renderCombatantToken()` |
| Skill Card | Available, selected, cooldown, not enough energy, stunned, replacement, domain, invisible | Partially in `renderSkillButton()` |
| Queue Tray | Three queued actions, reorder, wild selector, confirm/cancel | Queue chips exist; review sheet not yet split |
| Character Detail Sheet | Portrait, role, tags, skills, replacements, statuses, synergies | Not yet implemented |
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
- The visible palette follows the Ink + Talisman system: ink surfaces by default, paper/gold for selection, teal for legal targets, green for queued actions, red for enemy/damage, and violet only for domain/cinematic moments.
- Desktop and tablet viewports center a phone-shaped canvas rather than stretching battle UI.
- Combat screen always exposes turn, living fighters, selected fighter, selected skill, legal targets, energy, queue, and latest resolution feedback.
- Server authority remains unchanged: legality, damage, cooldowns, hidden info, winner, and mission progress stay server-owned.
