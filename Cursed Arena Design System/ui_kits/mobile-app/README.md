# Cursed Arena — Mobile Game UI Kit

Interactive click-through of the redesigned mobile game (390×844 portrait canvas, scaled to fit).

Flow: **Lobby → Team Builder (pick 3) → Combat (select fighter → technique → target) → Queue Review sheet → Results.**
Roster tab shows the collection grid with rarity frames and a character-detail bottom sheet.

This is a from-scratch reimagining of the FantasyDraft Phaser client as a modern 2026 mobile game
(Clash Royale-register chrome: chunky beveled plates, sticker keylines, bouncy motion), while keeping the
server-authoritative Naruto-Arena-style tactical loop intact: 3v3, one skill per living fighter, energy
pips (B/T/F/C + Wild), queue review with wildcard payment, left-to-right resolution.

Files:
- `index.html` — entry, phone-canvas scaler, mounts the app
- `App.jsx` — shell, screen router, tab bar
- `Screens.jsx` — Lobby, Roster, Team Builder, Combat, Results
- `mock-data.js` — starter-roster slice + sample kits

All chrome composes the design-system primitives (`Button`, `Card`, `SkillCard`, `EnergyPip`, `ProgressBar`, `Sheet`, `TabBar`, …); nothing is re-implemented locally except screen-specific layout.
