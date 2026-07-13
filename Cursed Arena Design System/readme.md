# Cursed Arena Design System

A modern-mobile-game design system for **Cursed Arena** (working title; the source codebase calls itself *JJK Fantasy Draft / JJK Arena*) — a portrait-first 3v3 tactical battler in the Naruto-Arena lineage, themed around cursed-energy sorcerer combat. This system is a **from-scratch reimagining** of the game's UI/UX at the register of elite 2026 mobile games (Clash Royale, Brawl Stars, Marvel Snap): chunky beveled plates, sticker keylines, rarity-framed collectible cards, bouncy tactile motion — replacing the previous "web-responsive" dark-panel look.

## Sources

- **Codebase**: locally mounted folder `FantasyDraft/` — Flask-SocketIO server + Phaser 3 browser client.
  Key reads: `docs/mobile_phaser_ui_ux_brief.md` (mobile UI/UX brief, old Ink+Talisman tokens), `docs/mobile_screen_inventory.md` (screen/component inventory), `docs/first_character_creation.md` (starter roster + combat rules), `web/static/jjk-tokens.css` + `style.css` (legacy token systems), `web/static/assets/` (original replaceable SVG art).
- No Figma files were provided. No official anime/manga art was used or referenced; all copied art is the codebase's own original placeholder SVGs.

⚠️ **IP note**: the game uses Jujutsu Kaisen character names (fan project). This system deliberately avoids reproducing any official JJK/anime branding, logos, or artwork. Portrait art is the codebase's original abstract "unit poster" SVGs, flagged as replaceable.

## Product context

- One product: the **mobile game client** (browser-delivered Phaser canvas, portrait-first, 390×844 primary frame; 360×800 small, 430×932 large; desktop centers a phone-shaped canvas).
- Core loop (server-authoritative, unchanged by this redesign): pick a trio → each living fighter queues 1 skill per turn → queue review with wildcard energy payment → left-to-right resolution → results/progression.
- Energy types: **B** Body (green), **T** Technique (blue), **F** Focus (gold), **C** Curse (red), **X** Wild (paid from any at review).
- Combat-state color rules are strict: **gold = selected**, **teal = legal target**, **red = enemy threat/damage only**, **violet = domain/cinematic moments only** (never routine chrome).

## CONTENT FUNDAMENTALS

- **Voice**: confident, playful, terse — mobile-game copy, not lore prose. Imperatives and short nouns: "Battle", "Claim", "Enter Arena", "Review Queue".
- **Second person**, present tense: "Your Turn", "Choose a target". The game addresses the player directly; never "the user".
- **Casing**: Title Case for buttons/screen titles ("Team Builder"); ALL-CAPS reserved for eyebrows/labels and disabled reasons ("NEED ENERGY", "CD 2"). Body copy sentence case.
- **Numbers are mono and tabular**: `100/100`, `-24`, `0:24`, `CD 2`. Damage families are named precisely (normal, piercing, soul, sure-hit, affliction) — tactical copy must stay rules-accurate, per the Naruto Arena readability principle.
- **Emoji**: acceptable as icon stand-ins in prototypes only; production uses line icons. No emoji in body copy.
- **Flavor**: world flavor lives in proper nouns (Hidden Inventory, Student Era, "Welcome to Jujutsu High") and stays out of system copy. Onboarding tone is "welcome to school", not "endgame apocalypse".
- Examples from source: *"The first roster should feel like 'Welcome to Jujutsu High', not endgame apocalypse."* / skill effect lines like *"Delayed second hit, +12 dmg"*.

## VISUAL FOUNDATIONS

- **Palette**: ink-plum neutrals (`--ink-950…50`) as the floor; **Curse Violet** (`--curse-500 #8B3FF0`) is the brand voltage (primary CTA, selection); **Talisman Gold** for currency/rarity/victory; **Cursed Teal** for legal targets; **Blood Red** strictly for threat/damage. Screens are color-blocked with a radial violet-to-ink app gradient (`--surface-app-grad`), not flat black.
- **Type**: Lilita One (display — titles, big numerals, uppercase), Inter (UI), JetBrains Mono (stats). Yuji Mai only for the wordmark kanji glyph.
- **Shape**: chunky radii 8–34px (`--r-xs…--r-2xl`), pills for tags/bars. Nothing sharp.
- **Elevation = physicality, not depth**: every raised element is a "sticker plate" — 2–3px near-black keyline (`--border-keyline`), inner bevel (`--bevel-plate`: light top edge + dark bottom edge), and a hard `0 4px 0` color ledge under buttons (pressed state translates down onto the ledge). Wells (energy racks, battlefield) use `--shadow-inset-well`. Colored auras (`--aura-curse/gold/teal/red`) for glow moments; no neutral soft drop-shadows as decoration.
- **Backgrounds**: gradient-washed ink (radial violet cast at top), poster imagery under a bottom protection gradient (`linear-gradient(transparent, rgba(14,11,22,0.92))`). No repeating textures yet; full-bleed character posters carry the lobby.
- **Motion**: bouncy and tactile. Press = 80ms translate-down onto the ledge; rewards/cards enter with `--ease-out-back` overshoot; sheets settle with `--ease-snap`; screen transitions use `--ease-impact`. Damage uses a lagging orange ghost bar. Respect `prefers-reduced-motion`.
- **Hover/press**: mobile-first, so press states dominate: translateY(2–4px) + slight scale-down. Hover (desktop) may lift cards -4px.
- **Transparency/blur**: overlay scrim `--surface-overlay` (72% ink); blur is not part of the language (Phaser can't cheaply do it) — use scrims and plates instead.
- **Cards**: paper-warm or ink faces, 3px rarity-colored border (gray/blue/violet/gold, mythic = rainbow gradient border), portrait top, name plate bottom, gold aura on legendary, violet ring + lift when selected.
- **Imagery**: original "unit poster" SVGs (tall 3:4, saturated gradient fields, monogram + name plate). These are legacy-style placeholders — slated for re-illustration in the new brighter direction.
- **Layout**: fixed 100vw/100vh stage, no root scrollbar; all critical taps in the lower 55%; 44px minimum touch targets; safe-area insets respected; content scrolls inside wells only.

## ICONOGRAPHY

- **System**: Lucide-register line icons — `stroke-width: 2–2.5`, round caps/joins, no fill, `stroke="currentColor"` (stated policy in the codebase's `assets/README.md`). The codebase's own six icons are copied to `assets/icons/` (draw, keep, pass, teams, arrow-left/right).
- For new glyphs, use **Lucide from CDN** (same stroke register). Do not hand-draw new SVG icons.
- **Energy** is never an icon — always a colored orb/pip (see `EnergyPip`).
- Emoji appear only as placeholder glyphs in prototypes. No icon font.
- Logo: the existing kanji-tile mark (`assets/logo-mark.svg`) + lockup (`assets/logo-lockup.svg`) are carried over from the codebase. **No new logo was invented.**

## Components

All primitives live under `components/` (`.jsx` + `.d.ts` + `.prompt.md` per component):

- **core/** — `Button` (primary/gold/secondary/ghost/danger; sm/md/lg), `IconButton`
- **cards/** — `Card` (rarity-framed character card), `SkillCard` (combat technique card with cost pips + blocked states)
- **feedback/** — `Badge`, `ProgressBar` (HP/XP with damage-lag ghost), `Toast`
- **game-hud/** — `EnergyPip` (B/T/F/C/X beads), `CurrencyPill` (gold/gem HUD)
- **navigation/** — `TabBar` (bottom tabs with elevated Battle hero slot)
- **overlay/** — `Sheet` (bottom sheet for queue review / character detail)

Intentional additions (no component library existed in the source — the Phaser client draws its UI in canvas, so this inventory was authored from the brief's component list): all of the above map 1:1 to the brief's `components/` plan (Panel→plates, FighterToken/QueueTray live in the UI kit, Toast, EnergyOrb→EnergyPip, SkillCard, Button).

## UI kits

- `ui_kits/mobile-app/` — V1 interactive click-through of the redesigned game at 390×844.
- `ui_kits/mobile-app-v2/` — **V2 "Domain Break" edge pass**: blade-cut angular geometry (`--clip-blade*`), shine sweeps + breathing CTA, ember field + kanji watermark, perspective-grid battlefield, versus HP header, focused-technique command console (tabs + one large panel), burst-ray victory with staggered reward pop-ins. Prefer V2 as the reference direction.

## Index

- `styles.css` — global entry (imports everything below)
- `tokens/` — `colors.css`, `typography.css`, `spacing.css` (spacing/radius/elevation/motion/layout), `fonts.css` (Google Fonts import), `base.css`
- `components/` — 11 React primitives (list above)
- `ui_kits/` — `mobile-app/` (V1) and `mobile-app-v2/` (Domain Break edge pass — preferred)
- `exports/phaser-design-tokens.js` — drop-in Phaser token module (same shape as the repo's `phaser-design-tokens.js`; exposes `window.JJK_MOBILE_TOKENS` / `CURSED_ARENA_TOKENS` with hex + Phaser 0x colors, combat-state colors, plate spec, motion, frames)
- `guidelines/` — specimen cards: colors (violet, ink, energy, rarity/states), type (display/ui/mono), spacing (scale, radius+plates), brand (logo, portraits, motion, iconography)
- `assets/` — logo mark + lockup, 18 unit-poster portraits, 5 energy orbs, 6 line icons, 4 backdrop plates
- `SKILL.md` — agent-skill entry point

## Caveats

- **Fonts** load via Google Fonts `@import` (Lilita One / Inter / JetBrains Mono); no font binaries are bundled.
- **Portrait art is placeholder**: original abstract SVG posters in the *old* dark style. The new direction needs bright, cel-shaded character illustrations — flagged for replacement.
- No slide templates were provided, so none were created.
