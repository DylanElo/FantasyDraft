# JJK Fantasy Draft — Web App UI Kit

A high‑fidelity, clickable React recreation of the JJK Fantasy Draft web UI (the `docs/` build in `DylanElo/FantasyDraft`), upgraded with the **"Domain Expansion"** AAA visual direction outlined in the design system's `AAA-DIRECTION.md`.

> The prototype is fully interactive — Lobby → Draft → Results → Browse, with real game logic — and ships a **Tweaks** panel so you can toggle AAA visual features off and compare against the baseline.

## Run it

Open `index.html` in any modern browser. No build step.

Audio is **muted by default** because most browsers block auto‑play. Flip the Audio toggle in Tweaks to hear the synthesised SFX (web‑audio bass thump on draw, metallic shing on keep, ash‑crumble on pass, sub‑bass domain expansion on ultimate flash).

## What's in here

| File | What it is |
|---|---|
| `index.html` | Entry point. Loads React, Babel, then composes the scripts below. |
| `styles.css` | The full visual layer — tokens, lobby, draft, holographic foil, screen‑shake keyframes, ink‑brush winner reveal, domain‑expansion curtain. |
| `effects.js` | Plain JS (no JSX). `window.JJK` namespace: `AudioBus`, `shake()`, `flash()`, `domainExpansion()`, `tilt(el)`, `attachParallax(el)`, `spawnEmbers(el)`. |
| `data.js` | Faction map, faction labels, scoring helper, character loader (fetches `characters.sample.json`). |
| `components.jsx` | Atomic UI: `Icon.*` Lucide SVGs, `Orb`, `FactionBadge`, `SkillRow`, `PrimaryButton`, `useToast`. |
| `CharCard.jsx` | The headline AAA card — 3D tilt, holographic foil, particle smoke entrance, faction border, ULT badge on the highest‑cooldown skill. Plus `CharThumb` for the grid. |
| `Lobby.jsx` | Setup screen w/ parallax shrine background, floating embers, kanji seal logo, count + name inputs (autofocus, Enter advances). |
| `Draft.jsx` | Main draft screen + game engine (Draw → Decide → Keep/Pass loop). |
| `Results.jsx` | Trophy + ink‑brush winner reveal + animated standings rows + Same Lineup / New Game CTAs. Fires `domainExpansion()` on mount. |
| `Browse.jsx` | Roster grid w/ search and faction tabs (fixes heuristic gap 5.1). |
| `app.jsx` | Orchestrator + Tweaks panel (AAA toggle, audio toggle, demo buttons). |
| `characters.sample.json` | 15 marquee characters extracted from `docs/characters.json`. Full roster is at `../../docs/characters.json`. |

## Heuristic‑eval fixes baked in

Audit issues from `../../heuristic-eval.md` that this UI kit addresses:

- **1.1 / 1.2 — Autofocus + Enter advances** — `Lobby.jsx`
- **2.1 — Deck counter** — `deck-badge` in `Draft` header
- **2.4 — Pip rows now use Cursed‑energy purple with glow** — `Draft`
- **3.2 — ULT promotion on highest‑cooldown skill** — `CharCard` / `SkillRow`
- **5.1 — Browse search** — `Browse.jsx`
- **5.3 — Faction tabs show counts** — `Browse.jsx`
- **6.3 — Same Lineup CTA on Results** — `Results.jsx`
- **8 — Domain Expansion theme moments** — `effects.js`

## What's intentionally simple

- **No persistence.** State is purely in memory; refresh = back to lobby.
- **No real multiplayer.** Hotseat, like the original.
- **Synthesised audio.** No `.mp3` files are shipped; tones are built from Web Audio so the prototype stays self‑contained.
- **Character art hot‑linked** from the Fandom wiki, same as the source repo. Don't ship to production this way.

## Editing

If you want to evolve a component, edit the relevant `.jsx` file and reload. The scripts are intentionally small and free of build tooling so direct‑edits in the canvas work.
