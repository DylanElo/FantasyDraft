# JJK Arena - Total Mobile Phaser UI/UX Brief

## Product Direction

Build JJK Arena as a portrait-first mobile tactical game. The browser remains the delivery shell, but the player experience should feel like a native mobile battler: one canvas, one-handed controls, bold tactile feedback, readable combat, and cinematic cursed-energy presentation.

The current app already contains a Phaser shell with these scene concepts:

- `LobbyScene`
- `DraftScene`
- `CombatScene`
- `ResultScene`
- `RecordsScene`

The next UI/UX step is to turn that shell from a functional developer interface into a production mobile game interface.

## Core References

- Naruto Arena combat flow: 3v3 teams, one skill per living character, queue review, wildcard/random energy payment, and left-to-right resolution.
- First Creation identity: Student Era + Hidden Inventory + JJK0. The first roster should feel like "Welcome to Jujutsu High," not endgame apocalypse.
- JJK visual direction: dark cursed-energy UI, talisman paper shapes, domain rings, hand-seal glyphs, school-issued dossier cards, and sharp purple/gold/blue/red combat accents.

## Design Pillars

### Mobile-first, not desktop-shrunk

Target portrait devices first:

- Primary frame: 390 x 844
- Small frame: 360 x 800
- Large frame: 430 x 932
- Tablet/desktop: centered phone-shaped canvas, not stretched board UI

Keep all important taps in the lower 55% of the screen whenever possible.

### Readability beats spectacle

The player must instantly know:

- Whose turn it is
- Which fighters are alive
- Which fighter is selected
- Which skill is selected
- Which targets are legal
- What energy is available
- What actions are queued
- What changed after resolution

Animations should reinforce rules, not hide them.

### Naruto Arena rules, mobile game UX

Preserve the tactical loop:

1. Select a living fighter.
2. Select one skill.
3. Select a legal target.
4. Repeat for up to three fighters.
5. Review queue.
6. Assign wildcard energy.
7. Confirm.
8. Watch resolution.

Present it through modern mobile patterns: bottom command dock, swipeable character details, hold-to-inspect, glowing targets, and cinematic turn playback.

## Figma File Structure

Create these pages:

1. `00 Cover + Moodboard`
2. `01 Design Tokens`
3. `02 Components`
4. `03 Mobile Screens`
5. `04 Battle Flow Prototype`
6. `05 Motion Notes`
7. `06 Phaser Implementation Notes`
8. `07 QA / Edge Cases`

## Design Tokens

### Colors

| Token | Value |
| --- | --- |
| Void Black | `#050711` |
| Panel Deep | `#0B1020` |
| Panel Raised | `#111827` |
| Cursed Purple | `#A855F7` |
| Cursed Purple Glow | `rgba(168,85,247,0.34)` |
| Domain Gold | `#F59E0B` |
| Cursed Blue | `#3B82F6` |
| Blood Red | `#EF4444` |
| Body Green | `#22C55E` |
| Focus White | `#F8FAFC` |
| Text Main | `#F8FAFC` |
| Text Muted | `#94A3B8` |
| Text Dim | `#64748B` |

### Energy Colors

| Energy | Color |
| --- | --- |
| B / Body | Green `#22C55E` |
| T / Technique | Blue `#3B82F6` |
| F / Focus | White `#F8FAFC` |
| C / Curse | Red `#EF4444` |
| X / Wild | Black `#111827` with light rim |

### Type

- Display: Cinzel Bold/Black
- UI: Inter SemiBold/Bold
- Numeric/system: JetBrains Mono

### Shape Language

- Main panels: 18-24 radius
- Skill cards: 14-16 radius
- Energy orbs: circular
- Queue pills: rounded 999
- Domain overlays: rings, diagonal talisman cuts, radial smoke

## Required Mobile Screens

Design all screens at 390 x 844:

1. Boot / Splash
2. Home / Lobby
3. First Creation / Starter Select
4. Mission Map
5. Matchup Screen
6. Combat Screen
7. Queue Review Screen
8. Resolution Playback
9. Results Screen
10. Records Screen

## Battle Flow Prototype

Prototype this flow:

1. Lobby -> First Creation
2. Select Yuji, Megumi, Nobara
3. Matchup -> Combat
4. Select Yuji
5. Select Divergent Fist
6. Target enemy
7. Select Nobara
8. Select Nail Barrage
9. Target enemy
10. Open Queue Review
11. Confirm Queue
12. Resolution playback
13. Results

## Phaser Implementation Notes

Split the current monolithic shell into modules over time:

```text
web/static/phaser/
  boot.js
  store.js
  socket-client.js
  layout.js
  theme.js
  assets.js
  scenes/
    BootScene.js
    LobbyScene.js
    FirstCreationScene.js
    DraftScene.js
    CombatScene.js
    QueueReviewScene.js
    ResultScene.js
    RecordsScene.js
  components/
    Panel.js
    Button.js
    FighterToken.js
    SkillCard.js
    EnergyOrb.js
    QueueTray.js
    StatusChip.js
    CharacterSheet.js
    Toast.js
    DamageNumber.js
  fx/
    CursedSmoke.js
    TargetRing.js
    SkillPlayback.js
    DomainPulse.js
```

Keep the Flask template as a pure canvas host:

```html
<div id="v2-phaser-shell"></div>
<script src="/static/vendor/phaser.min.js"></script>
<script src="/static/phaser/index.js"></script>
```

The store owns player identity, room id, selected team, current battle state, selected caster, selected skill, queued actions, playback events, and records.

The server owns legality, damage, cooldowns, hidden status serialization, winner detection, and mission progress.

## Manual QA / Edge Cases

Test these before calling a mobile UI pass done:

- Small iPhone height: no important button hidden under safe area.
- Android Chrome address bar resize.
- Player has no energy.
- Player has exactly enough specific energy but no Wild payment.
- Fighter is dead.
- Fighter is stunned.
- Skill replacement active.
- Invisible trap applied.
- Counter reveals.
- Reflect reveals.
- Helpful skill on untargetable ally is blocked unless the skill bypasses invulnerability.
- Opponent private info does not leak.
- PvP waiting room.
- CPU turn resolves without UI lock.
- Result saves records.

## Build Sequence

1. Figma-first visual spec + design tokens.
2. Component refactor.
3. First Creation UX.
4. Combat UX pass.
5. Queue review UX.
6. Resolution playback.
7. Results/progression polish.

## Final Target Feel

A mobile-native JJK tactics game where every tap is readable, every queued action has tension, and every reveal feels like a cursed-technique mind game.
