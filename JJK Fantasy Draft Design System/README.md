# JJK Fantasy Draft — Design System

A design system for **JJK Fantasy Draft**, a Jujutsu Kaisen–themed multiplayer card‑drafting game by Dylan Elo. Players take turns drawing random JJK character cards (Gojo, Sukuna, Yuji, Megumi…) to build a 5‑character team; the team with the highest combined energy score wins. The product ships as **(a)** a Telegram bot and **(b)** a mobile‑first web UI styled like Clash‑Royale‑esque collectible cards with a dark, mystical, "cursed" aesthetic.

> **Brand pitch:** _Build your cursed team._ The interface should feel like cracking open a sealed talisman scroll in a dark shrine — purple cursed‑energy glow, gold for victory, faction crests, and a single 呪 ("curse") kanji as the throughline.

---

## Sources used

- **Codebase (GitHub):** `DylanElo/FantasyDraft` @ branch `jjk-telegram-bot-17267499172432318782`
  - `docs/` — the polished static Web UI (Cinzel + Inter, custom dark theme). Treat as canonical visual source.
  - `web/` — older Flask web prototype (kept for ref, lighter polish).
  - `jjk_bot/` — Telegram bot logic + characters dataset.
- **No Figma / no external brand guide was provided.** Tokens and conventions in this system were reverse‑engineered from `docs/style.css`, `docs/index.html`, `docs/app.js`, and `docs/characters.json`.
- **Character art** is hot‑linked from the Jujutsu Kaisen Fandom wiki (`static.wikia.nocookie.net`). Not a brand asset we own.

---

## Index

| File / folder | What's in it |
|---|---|
| `README.md` | This document. Start here. |
| `SKILL.md` | Agent‑Skills entry point — load this if you're using the system to design new artifacts. |
| `colors_and_type.css` | All design tokens (color, type, spacing, radius, shadow) as CSS custom properties + semantic helper classes. |
| `fonts/` | Font notes. Cinzel + Inter are loaded from Google Fonts; no self‑hosted TTFs. |
| `assets/` | Logo lockups, kanji marks, faction badges, energy orb SVGs, background textures, sample character art. |
| `ui_kits/web-app/` | High‑fidelity React recreation of the mobile web UI (Setup → Draft → Results → Browse) as a clickable prototype. |
| `preview/` | Atomic design‑system cards (colors, type, components, brand) rendered for the Design System tab. |
| `heuristic-eval.md` | UX audit + gap analysis (mental‑model deviations, missing standard interactions, friction points). |
| `docs/`, `web/`, `jjk_bot/` | Imported source code from the repo, kept for reference. |

---

## CONTENT FUNDAMENTALS

**Voice:** Confident, terse, slightly theatrical — the bot is a cursed game master, not a corporate product. Mixes anime‑lore vocabulary (_cursed energy, sorcerer, domain, technique_) with arcade‑game directness (_Draw, Keep, Pass, Tap to draw_).

**Person:** **Second‑person imperative** on action surfaces ("Build your cursed team", "Tap to draw", "Keep or pass once?"). **Third‑person announcements** in toasts and logs ("Yuji passed! Redrawn: Megumi (kept).").

**Casing:**
- Display headings (logo, winner name, character name, screen title) — **Title Case in Cinzel**, sometimes with letter‑spacing for sub‑labels.
- Section sub‑labels (form labels, legend titles) — **ALL CAPS, tracked +1.5–5px**, small (10–11px), muted color. e.g. `PLAYERS`, `ENERGY TYPES`.
- Body / descriptions — sentence case.
- Buttons — Title Case ("Begin Draft", "Browse Characters", "Play Again", "Draw", "Keep", "Pass").

**Numbers & glyphs:**
- Round badge: `R1 / 5` (compact, no spaces around the slash beyond what the font gives).
- Score badge: `45 pts`.
- Pass status: `⚡ Pass used` / `✓ Pass available` (these two glyphs ARE part of the vocabulary — they're not generic emoji).
- Medals on the standings list: `🥇 🥈 🥉 4️⃣` (used as rank prefixes; one of the few sanctioned emoji uses).

**Emoji policy:** Sparingly, only when functional. The Telegram bot uses `⚔️` once in its welcome message. The web UI uses `🏆`, medal emojis, `⚡`, `✓`. Do not pile up emoji in copy.

**Kanji & Japanese accents:** The single character **呪** (kanji for "curse" — first character of _Jujutsu_ 呪術) is the brand logo and recurs as a watermark on the face‑down card and in the app header. Don't introduce other kanji ad‑hoc; treat 呪 as a logomark, not a decorative element.

**Sample copy (verbatim from the product):**
- Tagline — _"Build your cursed team"_
- Setup CTA — _"Begin Draft"_
- Face‑down card label — _"TAP TO DRAW"_
- Decision prompt — _"Keep or pass once?"_ → after pass used: _"Keep or redraw (pass used)?"_
- Toast (auto‑keep) — _"Megumi drew Sukuna (auto‑kept — pass used)."_
- Results header — _"Wins the Draft!"_ (subhead under the winner's name)
- Empty roster slot — _"+ Slot 3"_
- Player input placeholder — _"Enter name…"_ (note the ellipsis character, not three dots)

---

## VISUAL FOUNDATIONS

### Mood
Midnight, cursed, slightly occult. Think: dim shrine at night, candlelight, ink‑on‑paper, talismans. Energy is rendered as **glowing orbs** (red/blue/green/white/black). The base UI is almost monochrome — deep blue‑black surfaces — and color comes in as **glow halos** around the primary purple and the gold victory accents.

### Color
- **Base background:** `#07071a` (near‑black blue). Surfaces step up to `#0e0e26` then `#161630`. No pure black, no pure white anywhere.
- **Primary "Cursed Energy" purple:** `#7c3aed` with hi `#a855f7` and a soft purple glow `rgba(124,58,237,0.35)`. Used for the brand mark, primary CTA, active selection, turn avatar.
- **Victory gold:** `#f59e0b` / hi `#fcd34d`. Used **only** on the results screen, the active player's name, and rare reward moments. Never on chrome.
- **Semantics:** green `#22c55e` (Keep / success), red `#dc2626` / `#ef4444` (Pass / destructive / curse faction).
- **Faction palette (saturated, gem‑like):** Tokyo blue `#3b82f6`, Kyoto cyan `#06b6d4`, Sorcerer purple `#8b5cf6`, Villain red `#ef4444`, Curse crimson `#dc2626`, Culling amber `#f59e0b`. Each used as a **15–20% tinted background + matching brighter text** for badges, and as a **50%‑opacity border** on the corresponding character card.
- **Energy orbs** (5 types, each with a built‑in glow shadow): green `#22c55e` (Physical), red `#ef4444` (Bloodline), blue `#3b82f6` (Curse Energy), white `#e2e8f0` (Strategic), black `#374151` (General — neutral filler, the only one without a glow).

### Type
- **Display / brand:** [`Cinzel`](https://fonts.google.com/specimen/Cinzel) at weights **700 & 900**. Used for the JJK logo, character names, screen titles, winner name, and any "ceremonial" text. Roman‑inscription voice, evokes engraved talismans.
- **UI / body:** [`Inter`](https://fonts.google.com/specimen/Inter) at weights **400/500/600/700/800**. Everything else.
- **Sizes are small and tight** — this is a phone‑first UI: body 12–14px, button text 13–16px, display headings 26–54px. Letter‑spacing is pushed up to **+1.5–5px** on tiny ALL‑CAPS labels for the "engraved" feel.
- The hero JJK wordmark uses a **white‑to‑purple gradient text fill** (`linear-gradient(135deg, #fff 20%, #a855f7)`). The winner name uses **white‑to‑gold** with the same construction.

### Backgrounds
- Solid `#07071a` per screen. **No imagery, no full‑bleed photos, no patterns** at the page level.
- Decorative depth comes from three **ambient blurred glow blobs** absolutely positioned per screen (`.bg-glow` with 90px blur, ~7–10% opacity, 280–400px radius). Purple on setup, gold on results, red on draft.
- Face‑down card carries a **45° repeating diagonal hairline pattern** at 3.5% opacity — a stylized talisman‑paper weave, the only repeating texture in the system.

### Animation
- **Curve of choice:** the iOS panel spring `cubic-bezier(0.32, 0.72, 0, 1)` for sheet/panel transitions; the playful overshoot `cubic-bezier(0.34, 1.56, 0.64, 1)` for card entrance and trophy reveal.
- **Durations:** 150ms for interactive feedback (button states), 200–250ms for cross‑fades, 300–380ms for sheets and overshoots.
- **Signature loop:** the face‑down card kanji **floats vertically ±10px on a 3.2s ease‑in‑out loop** (`@keyframes floatY`) — keep this on any "waiting for input" hero element.
- **Entrance:** characters cards spring in with `translateY(28px) scale(0.95) → none`. The trophy explodes in from `scale(0) rotate(-20deg)`.
- **No** parallax, no scroll‑linked motion, no Lottie.

### Hover & press
- Buttons darken/lighten via **opacity & background fades over 150ms**, never via shadow expansion.
- The dominant press state is **`transform: scale(0.96–0.98)`** — every tappable surface confirms with a tiny scale‑down. Combined with a slight shadow reduction on the primary purple button.
- Active selection (pill/segmented control) shows: tinted background (12% primary), brightened text (`--purple-hi`), 1px halo border, and a 14px outer glow at 22% opacity.

### Borders
- Default border: `1.5px solid rgba(255,255,255,0.08)` (a hair more visible than typical hairline borders — needed to read on the very dark BG).
- Hi‑contrast border: `rgba(255,255,255,0.15)`.
- Faction borders on character cards: **50%‑opacity faction color** at 1.5px — the card's identity comes from this colored edge, not from a colored background.

### Shadows
- **Outer drop shadows** are used twice: for the primary purple CTA (`0 8px 32px rgba(124,58,237,0.35)`) and for the logo block (`0 0 50px <purple glow>, 0 8px 30px rgba(0,0,0,0.5)`). They function as **colored auras**, not depth shadows.
- **Glow shadows** on orbs and avatars (`0 0 5–18px <color at 30–55%>`) — these read as light emission, not lift.
- **Inset shadows** are rare: `inset 0 1px 0 rgba(255,255,255,0.04)` on the face‑down card to add a faint top‑edge highlight.
- **No** soft neutral shadows (no `0 4px 12px rgba(0,0,0,0.1)`‑style web shadows). Everything that lifts, glows.

### Corner radii
A short, intentional scale:
- `4px` — tiny meta chips (skill class tag)
- `10px` — secondary cards, small buttons (`--r-sm`)
- `12px` — inputs, count buttons, faction thumbs
- `14px` — primary CTA, surface cards (`--r`)
- `18–20px` — character cards, large sheets
- `20px 20px 0 0` — bottom sheets / slide‑up panels
- `100px` (pill) — toasts, badges, faction pills, round badge

### Cards
- Surface: `var(--surf)` `#0e0e26` with a **1.5px solid border** colored either neutral (`rgba(255,255,255,0.08)`) or by **faction**.
- Character cards: 3:4 aspect art at top, a fade‑to‑surface gradient overlay at the bottom 55% of the art (so the name reads), then a name‑bar row (Cinzel name + faction pill), then a description + skill list.
- Skill rows inside cards: smaller surface (`--surf2`) at radius 10px with a **3px colored left border** denoting the skill type (physical/bloodline/energy/strategic). _This colored‑left‑border pattern IS intentional here — it's a deliberate skill‑type indicator, not generic chrome. Don't generalize it to other cards._
- No card has a header image bar separate from the art; the art IS the top of the card.

### Transparency & blur
- Both the top header and bottom action bar use **`backdrop-filter: blur(16px)`** over the page background at 96–97% opacity. This is the system's only place where the chrome floats over content; modals and sheets sit on solid `--surf`.
- Scrim under modals/sheets: `rgba(0,0,0,0.5–0.65)`, fades 300ms.

### Layout rules
- **Mobile‑first.** Content max‑width is 420px (setup) / 440px (results) / 360–400px (draft card), centered on larger screens. The browse grid breaks to 3/4/5 columns at 480/700/960px.
- Header is **fixed 56px**, action bar is **fixed 72px + safe‑area‑inset‑bottom**. Both are translucent + blurred. Content scrolls between them.
- Padding rhythm: 14px horizontal page gutter, 12–24px vertical gaps between sections, **36px between major blocks** on the setup screen.
- Honors `env(safe-area-inset-bottom)` everywhere — designed for notched / home‑bar iPhones.

### Imagery
- All "imagery" in the product is **character portraits**: 3:4, top‑aligned, source from the JJK Fandom wiki, painted/illustrated style (anime keyart). Warm‑neutral color cast, never b&w, no filter applied.
- A **vertical fade‑to‑surface gradient** is applied over the bottom 55–65% of every portrait so the name + faction pill read against it. This gradient is the system's signature treatment — always use it on character portraits.
- We do **not** ship our own illustration; we **do not** generate SVG character art.

---

## ICONOGRAPHY

The product ships a **handful of inline SVGs**, drawn ad‑hoc in `docs/index.html`, all in the **Feather / Lucide visual family**: 2–2.5px stroke, round line‑caps, round joins, no fills, 24×24 viewBox.

Specifically used:
- **arrow‑right** — Begin Draft CTA
- **arrow‑left** — Browse back button
- **grid (2×2 squares)** — Teams panel toggle
- **rotate‑ccw** — Draw action
- **check** — Keep action
- **x** — Pass action / Close
- **🏆 (emoji, not SVG)** — Trophy on Results

This means the **canonical icon set for this system is [Lucide](https://lucide.dev/)** — when you need an icon that doesn't already exist in the product, pull it from Lucide at 2px stroke, round caps/joins, currentColor. _Substitution flagged: there's no first‑party icon set; Lucide is the closest match to the existing inline drawings and should be considered authoritative going forward._

**Special glyphs that act as icons:**
- **呪** (kanji) — the brand mark; also used as a watermark on the face‑down card. Render at the size + color it would have if drawn (purple at 48% opacity on dark, full purple `--purple-hi` in the header).
- **`⚡`** — pass‑used indicator (only)
- **`✓`** — pass‑available indicator (only)
- **🥇 🥈 🥉 4️⃣** — standings ranks

**No icon font.** **No PNG icons.** **No `<i class="fa-...">`.** Inline SVG with `currentColor` only.

---

## Heuristic eval + gap analysis

See `heuristic-eval.md` for the full UX audit. Short version: setup screen lacks a player‑name auto‑focus and "Press Enter to continue" affordance, the draft view has no visible deck count or pick history, there's no undo/back from a Pass, the Browse view has no search, the Teams panel doesn't show energy‑score totals while picking, and there's no end‑of‑game share/export. Each gap is documented with a recommendation.

---

## How to use this system

If you're an agent designing _for_ JJK Fantasy Draft, start with `SKILL.md` for the contract, then pull tokens from `colors_and_type.css` and components from `ui_kits/web-app/`. Bring in real character images from `docs/characters.json` (`image_url` field) instead of inventing artwork.
