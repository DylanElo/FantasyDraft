# JJK Fantasy Draft — Heuristic Evaluation & Gap Analysis

_Audit framed against Nielsen's 10 heuristics plus a mental‑models / "missing standard interactions" pass. Severity is on a 0–4 scale: **0 cosmetic**, **1 minor**, **2 major**, **3 catastrophic**, **4 unusable**. Recommendations are concrete, scoped to the existing visual system._

---

## 1. Onboarding & Setup

| # | Issue | Severity | Heuristic | Recommendation |
|---|---|---|---|---|
| 1.1 | **No autofocus on Player 1 input.** Tapping into the first field is an extra tap on mobile. | 1 | _Efficiency of use_ | Autofocus `#name-inputs > .name-field:first-child` on load and after changing player count. |
| 1.2 | **Enter key does not advance.** Pressing Enter inside a name field does nothing — broken mental model for forms. | 2 | _Match between system and the real world_ | Enter in field _n_ focuses field _n+1_; Enter on the last field triggers Begin Draft. |
| 1.3 | **No validation feedback.** Empty names silently become "Player 1/2/3". User gets no signal until results. | 1 | _Error prevention_ | Show a small inline placeholder transformation (or a chip "Will be saved as Player 2") so the fallback is visible. |
| 1.4 | **No "remember last players" affordance.** Repeat play forces re‑entry. | 1 | _Recognition over recall_ | Persist the last roster in `localStorage`; offer a one‑tap "Use last lineup" chip. |
| 1.5 | **Energy‑type legend uses color only.** Color‑blind users can't tell red from green orbs. | 2 | _Accessibility (WCAG 1.4.1)_ | Add a single‑letter glyph inside each orb (P/B/C/S/G) or pair the color with a letter chip. |
| 1.6 | **"Begin Draft" is enabled with zero players.** With 2 players default it's fine, but the count buttons (2/3/4) imply choice without validation; spamming Begin with empty fields still works. | 0 | _Error prevention_ | Disable until at least one field has focus or content (very mild). |

---

## 2. The Draft Screen

| # | Issue | Severity | Heuristic | Recommendation |
|---|---|---|---|---|
| 2.1 | **No deck‑remaining counter.** Players have no idea how many cards are left or whether duplicates are possible. The code _does_ fall back to `randChar()` once the deck is empty (so duplicates appear silently!) — this is a **broken mental model** for a "draft". | **3** | _Visibility of system status_ | Show `Deck: 42 / 60` near the round badge; when the deck empties, switch to `Pool (duplicates ON)` in red or stop drawing. |
| 2.2 | **No pick history / log.** Toast disappears in 2.8s; if you missed it you can't review what was drafted. | 2 | _Visibility of system status_ | A persistent "Last 5 picks" strip above the action bar OR an accessible Log icon in the header. |
| 2.3 | **Pass is irreversible AND silent about its cost.** The first time you see "pass used" is _after_ tapping. Users expect a confirm step for one‑shot abilities. | 2 | _Error prevention_ | Long‑press the Pass button to confirm, or show an inline tooltip "You'll auto‑keep the next card" before the first use. |
| 2.4 | **Pips show position but not identity.** A row of dots tells you slots filled, not _who_ filled them. Teams panel exists but isn't glanceable. | 1 | _Recognition over recall_ | Replace pip rows with tiny 16×16 portrait dots from each player's drafted cards. |
| 2.5 | **No "back to setup".** Once mid‑draft, exiting the game requires a reload. | 2 | _User control and freedom_ | Add a quit/restart icon to the header (with a confirm dialog). |
| 2.6 | **Face‑down card is the primary draw affordance — but also a button.** The bottom "Draw" button does the same thing. Two equally‑weighted CTAs for one action. | 1 | _Consistency and standards_ | Either remove the face‑down tap target (make it decorative) or remove the bottom Draw button while in waiting state. Pick one. |
| 2.7 | **Round badge format `R1 / 5`.** Reads ambiguously — round 1 of 5, or 1 out of 5 cards per team. | 0 | _Match between system and the real world_ | `Round 1 of 5` is one extra word and removes ambiguity at this scale. |

---

## 3. Card Decision State

| # | Issue | Severity | Heuristic | Recommendation |
|---|---|---|---|---|
| 3.1 | **No card flip animation.** The face‑down card disappears and the real card pops in — kills the dopamine of the reveal. | 2 | _Aesthetic & feel (product polish)_ | Add a 3D flip on the kanji card → portrait card (350ms, rotateY). Massive perceived‑quality win. |
| 3.2 | **Skill text is dense, no hierarchy.** All four skills look the same weight; can't scan the "ultimate" vs the basic. | 1 | _Aesthetic & minimalist design_ | Promote the 4th skill (highest cooldown) with a subtle gold tick or "ULT" tag. |
| 3.3 | **No comparison with existing team.** Player must remember what they already drafted to evaluate the new card. | 2 | _Recognition over recall_ | A collapsible strip at the bottom of the decide state: 4 mini cards already in the team. |
| 3.4 | **Image fallback is just initials in a faint gray serif.** Looks broken, not stylized. | 1 | _Aesthetic & minimalist design_ | Replace fallback with a 呪 kanji + faction‑tinted background — branded, not "missing". |

---

## 4. Teams Panel

| # | Issue | Severity | Heuristic | Recommendation |
|---|---|---|---|---|
| 4.1 | **No total score / energy preview while drafting.** The only place you see scoring is after `/result`. Players can't strategize. | **3** | _Visibility of system status_ | Show a running "Energy: 12" on each panel tab — same formula as the scoring function. |
| 4.2 | **Slots are empty placeholders without faction guides.** A player can't see "I have 0 Tokyo, 3 Curse" mid‑draft. | 2 | _Recognition over recall_ | Add a faction tally row above the mini grid. |
| 4.3 | **Mini card click opens char modal — but the modal lacks the "this is your card" framing.** Same modal used for Browse. | 1 | _Consistency_ | Add a "Owned by [Player]" chip when launched from the teams panel. |

---

## 5. Browse Screen

| # | Issue | Severity | Heuristic | Recommendation |
|---|---|---|---|---|
| 5.1 | **No search.** ~60+ characters across 6 factions — scrolling to find Hanami is painful. | **3** | _Efficiency of use_ | Search input in the header (`Search characters…`). |
| 5.2 | **Faction tabs scroll horizontally with no scroll indicator.** Users on iPhone may not notice "Culling" exists past the right edge. | 2 | _Visibility_ | Add a subtle fade‑mask on the right edge of `.faction-bar`, or render as wrapping pills if there's room. |
| 5.3 | **Faction tabs don't show counts.** "Tokyo (9)" would help. | 1 | _Recognition over recall_ | Append count chips. |
| 5.4 | **No sort.** Alphabetical by data order is non‑obvious; players want "by faction", "by total energy". | 1 | _User control_ | A small sort menu next to faction tabs. |
| 5.5 | **Tapping a card opens a modal with the SAME content as the card.** Just bigger. There's no extra value (no lore page, no related characters, no skill calculator). | 1 | _Aesthetic & minimalist design_ | Either remove the modal step and inline‑expand the thumb, or add real depth to the modal (related skills, energy histogram, faction crest). |

---

## 6. Results Screen

| # | Issue | Severity | Heuristic | Recommendation |
|---|---|---|---|---|
| 6.1 | **No score breakdown.** "45 pts" — derived how? Players can't learn or argue. | 2 | _Help users recognize, diagnose, recover_ | Tap a row to expand: "45 = 12 Energy + 18 Bloodline + …". |
| 6.2 | **No share / export.** Modern multiplayer expects "Share result" → image / link. | 2 | _Efficiency_ | Generate a 1080×1920 PNG of the standings; native share on mobile. |
| 6.3 | **No replay / rematch w/ same lineup.** "Play Again" wipes the roster. | 1 | _Efficiency_ | "Same lineup" CTA preserves names. |
| 6.4 | **Tie‑breaker is `Math.random()` (in `scoreTeams`).** Player can't tell their tie was randomly resolved. | 2 | _Visibility_ | Show a "Tie broken by coin flip" badge when the top scores are equal. |

---

## 7. Cross‑cutting issues

| # | Issue | Severity | Recommendation |
|---|---|---|---|
| 7.1 | **No undo, no back‑gesture support.** Browser back will reload, losing game state. | 3 | Use `history.pushState` per screen so back navigation works as expected; warn before unload mid‑draft. |
| 7.2 | **No offline / PWA.** Game is fully client‑side but not installable. | 2 | Add a manifest + service worker; gigantic perceived‑value win for ~30 min of work. |
| 7.3 | **No sound / haptics.** A card game without a "draw" SFX or vibration on Keep is missing 30% of the feel. | 2 | Web Audio + `navigator.vibrate(10)` on keep/pass/reveal. |
| 7.4 | **No spectator view / sync across devices.** The Telegram bot is multiplayer; the web UI is single‑device hotseat only. | 2 | The `web/` Flask version has Socket.IO scaffolding — port that to `docs/` for real multiplayer rooms. |
| 7.5 | **No "How to play" anywhere in the web UI.** The Telegram bot opens with rules; the web UI assumes you know. | 1 | A `?` icon in the setup screen header → short bottom sheet w/ rules. |
| 7.6 | **Toast is the ONLY transient feedback channel.** It's overloaded (status, errors, success). | 1 | Reserve toasts for success/info; use inline error states for failures (none today, but will be needed once multiplayer lands). |
| 7.7 | **No reduced‑motion respect.** The floating kanji and card spring run regardless. | 1 | Wrap all keyframes in `@media (prefers-reduced-motion: no-preference)`. |
| 7.8 | **No keyboard support.** Even on desktop layouts, Tab/Enter/Esc don't drive the game. | 1 | Esc closes modals/sheets; Enter advances forms; arrow keys cycle teams in the panel. |

---

## 8. Theme elevation — "make it feel like JJK"

You mentioned wanting to elevate this so all JJK fans look forward to playing. The visual foundations are already solid (dark palette, Cinzel, 呪 watermark) — but it under‑delivers on the **theatrical, ritual** side of the source material. Concrete additions:

- **Domain Expansion reveal** for the 4th (ultimate) skill: when the card flips, briefly flash a deep red/black radial expansion behind it, with the skill name written in vertical kanji‑style typography on the right edge. 800ms, ease‑out.
- **Faction sigils.** Right now factions are just colored borders + text pills. Give each faction a SVG sigil (Tokyo Jujutsu High shield, Cursed Spirit eye, Culling Game star, etc.) and overlay it at 6% opacity on the back of every character card.
- **Cursed Energy meter on the turn bar.** A horizontal gauge that fills as the current player accumulates energy across drafted cards — visible, glanceable, and gives them a sense of "power level".
- **The Six Eyes effect on selection.** When you tap an active state (count button, faction tab), bloom a brief teal‑white twin‑ring around it. 250ms. Distinctive to this product.
- **Talisman background paper.** A subtle (3% opacity) rice‑paper grain on the body of the setup and results screens — pushes the "scroll / sealed talisman" metaphor.
- **Pre‑draft "Cursed Lottery" intro.** A 1.5s screen where five face‑down cards shuffle and align before the first turn. Sells the ritual.
- **Player avatar = a kanji**, not a letter. Use 一二三四 for player 1–4, or let the player pick one from a small set of JJK‑relevant kanji (呪 力 術 魂 鬼). Already half‑done — you have the kanji aesthetic on the face‑down card.
- **Sukuna‑finger easter egg.** Once per session, a 1% chance the face‑down card draw plays a long ominous flip. Pure flavor.

These are the moves that turn a functional draft tool into _the_ JJK fan game.

---

## Severity summary

- **Catastrophic (3):** 2.1 silent deck‑empty fallback (changes the game's rules without telling the player), 4.1 no running score, 5.1 no Browse search, 7.1 broken back navigation.
- **Major (2):** 12 issues — flip animation, undo/back, score breakdown, share, sound, accessibility, etc.
- **Minor (1):** 16 issues — polish + delight.

**Recommended ship order:** 2.1 → 5.1 → 4.1 → 7.1 → 6.1 → 3.1 → 8 theming pass.
