# Asset Inventory

These assets support the Phaser Battle v2 shell.

| File | What it is |
|---|---|
| `logo-mark.svg` | Square JJK Fantasy Draft mark. |
| `logo-lockup.svg` | Horizontal JJK Fantasy Draft wordmark. |
| `orb-{blue,red,green,white,black}.svg` | Energy orb icons used by the battle UI. |
| `icons/{draw,keep,pass,teams,arrow-left,arrow-right}.svg` | Small line icons kept for current UI affordances. |
| `portraits/culling-current/*.webp` | Exact 19-file, 600x800 Season 3 starter portrait set used by the maintained Phaser client. |
| `environments/culling-current-home-hero-v2.webp` | 853x1844 full-bleed, character-led Home composition for the structurally rebuilt lobby. |
| `environments/culling-current-rooftop-v2.webp` | 853x1844 bright rooftop battlefield used by Combat, Queue Review, and Result. |
| `environments/culling-current-{home,campus,map}.webp` | Original 773x1672 character-free plates retained for Boot, Draft/First Creation/Records, and Mission Map. |
| `environments/culling-current-rooftop.webp` | Superseded 773x1672 rooftop retained as historical source material; it is not loaded by the maintained client. |
| `skills/culling-current/{body,technique,focus,curse}.webp` | Four 418x941 semantic skill-art crops used by the Combat command cards and Queue Review deck. |
| `portraits/*.svg` | Legacy abstract portrait placeholders; they are not the maintained runtime portrait registry. |

The runtime portrait source of truth is
`web/static/phaser/core/portrait-registry.js`, not the legacy
`portraits/manifest.json`. Generation mode, prompts, result IDs, dimensions,
hashes, and release limitations are recorded in the `PROVENANCE.md` files under
`portraits/`, `environments/`, and `skills/`.

Use Lucide-compatible icon styling for any new line icon: `stroke-width="2"`, round caps, round joins, no fill, and `stroke="currentColor"`.
