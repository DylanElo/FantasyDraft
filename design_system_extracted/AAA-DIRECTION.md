# JJK Fantasy Draft — "Domain Expansion" AAA Visual Direction

> A second design layer that sits **on top of** the base system in `colors_and_type.css`. The base system describes _what the product looks like today_ (a clean, polished mobile draft). This document describes _where it can go_ — toward a Triple‑A game studio benchmark inspired by Hearthstone, Marvel Snap, and Persona 5.

The UI kit at `ui_kits/web-app/` ships all of this as toggle‑able **AAA Mode** (on by default). Flip it off in the Tweaks panel to see the baseline.

---

## Core principle

> The interface should feel like it is physically reacting to the cursed energy moving through the draft.

Flat HTML doesn't get there. We need:
- **Spatial depth** (3D tilt, perspective parents, holographic foils that react to cursor angle).
- **Reaction physics** (screen shake, hit‑stop pauses, hit‑flash on impact).
- **Theatrical reveals** (ink‑brush winner reveal, 領域展開 domain‑expansion curtain on ultimates, particle smoke when cards materialize).
- **Audio** (synthesised bass thump on draw, metallic shing on keep, ash‑crumble on pass, sub‑bass + screen‑flash on ult).
- **Parallax world‑building** (a dimly lit shrine that drifts as you move your mouse on the Lobby; floating cursed‑dust embers).

---

## The journey

### 1. The Gates (Lobby)
- **Background:** a faint shrine silhouette (torii gate + two flickering candle lanterns) that **parallaxes against the cursor** at 14px per layer. Floating purple **embers** rise from the bottom edge.
- **Logo block:** the 呪 kanji on a purple seal tile with a slow conic glow rotation around it (8s). The wordmark uses a `linear-gradient` from white → `--jjk-purple-hi`.
- **Player rows:** each name input is paired with a small **counter kanji** (一二三四) instead of "Player 1" labels. Autofocus first input; Enter advances; last Enter triggers Begin Draft.
- **CTA:** `Begin Draft` button has a sweeping inner shine on hover (105° gradient travels left→right in 600ms).

### 2. The Ritual (Draft)
- **Face‑down talisman** floats vertically ±12px on a 4s ease‑in‑out loop. Kanji breathes 0.65→1.0 opacity in 3.2s. Inner border has four corner sigil dots.
- **Card draw** — character cards enter with a **particle smoke trail** (two radial purple/violet ellipses blurred to 20px, scaling out + fading away over 1.2s) and an entrance animation (translateY 36px → 0, scale 0.92 → 1, blur 6px → 0 in 650ms with a slight overshoot).
- **Hovering a card** activates the **holographic foil** layer — a diagonal multicolor gradient (white / purple‑hi / cyan) that mixes in `color-dodge` mode. The foil _angle_ tracks the cursor: angle = `atan2(dy, dx)` from card center, in degrees.
- **3D tilt** — the card rotates up to ±12° on X and Y based on cursor position, with a `scale3d(1.02)` push, all in `perspective(1400px)`. Touch‑safe via `touchmove`.

### 3. The Culling (combat moments — future Battle Arena view)
- **Screen shake** on hits — `cubic-bezier(.36,.07,.19,.97)` 400ms, ±4px translation + ±0.5° rotation. Applied to `.app-stage` so the chrome shakes with the content.
- **Hit flash** on big damage — a radial white pop that fades in 320ms. Stacks on top of everything (z 9998).
- **Domain Expansion** for Ultimates — a 900ms cinematic: a red‑tinted radial curtain implodes from center, the kanji **領域展開** appears in vertical writing (`writing-mode: vertical-rl`) at the screen center, scaling 0.5 → 1.4 with `cubic-bezier(0.65, 0, 0.35, 1)`. Combined with sub‑bass audio + 900ms screen shake.

### 4. The Aftermath (Results)
- **Trophy** swings in: `scale(0) rotate(-30deg) → scale(1.15) rotate(8deg) → scale(1) rotate(0)` over 800ms with a slight overshoot.
- **Winner name** uses **Cinzel Decorative** (a more ornate cut of Cinzel) and is revealed by an **ink‑brush mask animation** — a linear‑gradient mask sweeps left→right over 1.4s, like a calligraphy brush painting the name.
- **Standings rows** stagger‑fade in at 150ms intervals starting at 1.7s, so the winner is read before the table.
- **Gold halo** on first place: 36px box‑shadow at 12% gold + a subtle linear‑gradient background tint.

---

## SFX map (synthesised, web‑audio)

The prototype synthesises every sound from Web Audio oscillators + filtered noise — **no asset files**. Production would replace these with real .mp3s but should preserve the character of each cue:

| Event | Cue | Synth recipe |
|---|---|---|
| **Hover** | soft paper rustle | 880 Hz sine, 40ms, low vol |
| **Click / select** | dry tick | 1200 Hz square, 40ms |
| **Draw** | bass thump + sub rumble | 110 Hz saw sliding down −60 Hz, 200ms, layered with 240 Hz bandpass noise |
| **Keep** | metallic shing | 4200 Hz bandpass noise (Q 14) + 2200 Hz triangle sliding up 1200 Hz |
| **Pass** | ash crumble | 800 Hz bandpass noise, 320ms + sub saw sliding down |
| **Ultimate / Domain** | sub‑bass detonation | 80 Hz bandpass noise + 60 Hz sine at full vol, 600ms, then a saw scream sliding 1800→600 Hz |

Audio is **muted by default** because browsers block auto‑play; Tweaks panel exposes the toggle.

---

## Motion budget

| Motion | Duration | Easing |
|---|---|---|
| Button hover shine | 600ms | `ease` |
| Card entrance | 650ms | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` (overshoot) |
| Card smoke trail | 1200ms | `ease-out` |
| Tilt follow | 50ms | `linear` while tilting; 400ms `cubic-bezier(0.2,0.8,0.2,1)` returning to rest |
| Foil reveal | 400ms | `ease` |
| Screen shake | 400ms | `cubic-bezier(.36,.07,.19,.97)` |
| Hit flash | 320ms | `ease-out` |
| Domain curtain | 900ms | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Trophy entrance | 800ms | `cubic-bezier(0.34,1.56,0.64,1)` (overshoot) |
| Ink‑brush winner | 1400ms | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Standings stagger | 500ms each, 150ms offset | `ease-out` |

Everything respects `prefers-reduced-motion: reduce` — durations collapse to 10ms and animations run once.

---

## Production rollout (recommended order)

1. **Tier 1 — banger moments** (high impact, low risk): card entrance + smoke, holographic foil, 3D tilt, screen shake, hit flash. Ship these first; they transform the perceived quality without touching game logic.
2. **Tier 2 — theatrical reveals**: ink‑brush winner, trophy overshoot, standings stagger. Ships with Results; doesn't affect the draft loop.
3. **Tier 3 — sound + parallax**: AudioBus with real .mp3s, parallax shrine on Lobby. Ship behind a "Sound on/off" toggle and a one‑tap audio unlock.
4. **Tier 4 — Domain Expansion**: only meaningful once the Battle Arena exists. For now wire it to the Results entrance for marketing screenshots.

---

## Where this lives in the kit

| Concept | File |
|---|---|
| Screen shake, hit flash, domain curtain CSS | `ui_kits/web-app/styles.css` |
| Tilt, parallax, embers, AudioBus, demo triggers | `ui_kits/web-app/effects.js` |
| Card entrance + foil + faction borders | `.char-card-frame`, `.char-card` in `styles.css`; `CharCard.jsx` |
| Tweaks panel (AAA / Audio / demo buttons) | `ui_kits/web-app/app.jsx` |
| Ink‑brush winner | `.winner-name` in `styles.css`; `Results.jsx` |
