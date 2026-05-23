# JJK Fantasy Draft — Project Context for Claude

## What This Project Is

A Jujutsu Kaisen-themed tactical card battle game, modeled after **Naruto Arena** (naruto-arena.com). Two players draft teams of 5 characters, pick 3 fighters, then battle in turns using character skills. The game is a web app with Flask-SocketIO backend.

---

## Current Architecture

```
web/
  app.py              # Flask-SocketIO server, all HTTP + WS routes
  templates/
    index.html        # Single-page app, all screens
  static/
    style.css         # Design system CSS
    app.js            # Client-side game logic (rendering + sockets)
    effects.js        # Visual/audio juice (shake, flash, domainExpansion, hitChar, etc.)
    characters_data.js # Static JS: exports window.CHARACTERS_DATA (30 characters)

jjk_bot/
  characters.py       # Character + Skill dataclasses; all 30 character definitions
  effects.py          # Effect + EffectKind enums; convenience constructors
  game.py             # Game + BattleEngine classes; all core logic
```

---

## Game Design Reference: Naruto Arena

**Naruto Arena is the gold standard for this game's design.** These are its canonical mechanics:

### Turn Structure (CRITICAL — we differ from this)
- Turns are **SIMULTANEOUS**: both players pick skills, then press "Press When Ready" at the same time
- **ALL 3 characters act each turn** — each character uses at most 1 skill per turn
- A player queues up to 3 skills (one per char), can reorder them, then confirms
- Both players' 3 actions then resolve simultaneously
- Our current implementation: alternating 1-skill-per-turn (WRONG, but functional — fix this later)

### Energy System (Naruto Arena spec)
- Each turn you gain energy based on **living characters**
- Turn 1 first player: **1 energy only** (not 3!)
- Subsequent turns: 1 **Generic (black)** + 1 random per living character
  - 3 alive chars → 1 black + 2 random = 3 total
  - 2 alive chars → 1 black + 1 random = 2 total
  - 1 alive char → 1 black + 0 random = 1 total
- 5 energy types: Green (Physical/Taijutsu), Red (Bloodline/Cursed Blood), Blue (Curse Energy/Ninjutsu), White (Strategic/Genjutsu), Black (Generic/any)
- Energy carries over between turns (it's a pool, not reset each turn)
- Skills show their exact energy cost as colored pips

### Skill Types
- **Instant** — resolves immediately this turn (most skills)
- **Action** — takes the character's action for the turn; can be stun-interrupted
- Cooldowns: turn after use = 0 remaining, counts down each turn you act

### Damage Tiers
1. **Normal** — reduced by Damage Reduction, then blocked by Destructible Defense (Shield), then HP
2. **Piercing** — ignores Damage Reduction, but blocked by Shield, then HP
3. **Affliction** — ignores ALL defenses; bypasses Invulnerability too

### Status Effects
- **Stun** — character cannot act; debuffs still apply
- **Invulnerable** — immune to non-affliction damage and most effects
- **Damage Reduction** — flat reduction per hit (not per turn)
- **Destructible Defense (Shield)** — absorbs damage, depletes when hit
- **Strengthen/Weaken** — modifies damage output
- **DoT (Burn/Curse)** — affliction damage per turn; ticks at start of that char's turn
- **Trap (Counter)** — triggers when the protected char is harmed

### Draft Phase (Naruto Arena)
- All characters visible simultaneously; players pick directly from the list
- Alternating picks (not draw/pass). No random element — it's a pure draft
- Our current: random draw → keep/pass (different but intentional, keeps surprise element)

---

## Known Issues (Priority Order)

### P0 — Breaks gameplay entirely

1. ~~**No CPU AI**~~ **FIXED** — CPU implemented as `CPU_PLAYER_ID = -1` in game.py

2. **All 3 chars should act each turn** — Currently only 1 char acts per turn. Naruto Arena has ALL 3 act simultaneously. This makes battles 9x longer than intended and reduces strategic depth significantly. Each turn should allow the current player to use 1 skill per living active character.

### P1 — Core gameplay broken/opaque

3. **Energy generation: first turn gives 3 energy** — Naruto Arena spec: first player's first turn = 1 energy only. Our `BattleEngine.__init__` calls `gain_energy_for_living(3)`. Should be `gain_energy_for_living(1)`.

4. **Draft pool imbalance** — 60+ characters in the pool, only 5 drawn per player. Many characters may never appear. Should weight toward a curated pool of ~20 "core" characters.

5. **Turn flow is unclear** — After using a skill, nothing explicitly says "turn passed to X". The turn bar updates but there's no clear transition animation or indicator.

### P2 — Polish and feel

6. **No character HP values shown on team** — Characters are 100HP each. Should be visible as a number prominently.

7. **Skill descriptions don't show numbers** — "Deals damage" instead of "Deals 25 damage. Reduces target's damage by 15 for 2 turns."

8. **Action log is reactive-only** — The log shows what happened but doesn't anticipate. Naruto Arena showed tooltips on hover for "what this skill does to them".

---

## How 3-Skills-Per-Turn Should Work (Design Spec)

When it's a player's turn:
1. They queue up skills for each of their 3 active characters (can skip a char if stunned/no energy)
2. They can use 0–3 skills per turn (one per char, up to 3 total)
3. Energy is spent and effects resolve left-to-right (slot 0 → 1 → 2)
4. After all queued actions resolve, turn advances to opponent

**Implementation path (simplest approach — keep alternating turns):**
- Backend: `apply_action()` already handles one skill. Add a "queued actions" list per player.
- When all 3 chars have either acted or are unable (stun/dead), auto-advance turn.
- Alternative (simpler): client sends 3 actions at once; server processes all 3.

**Current P0 fix approach:**
Add `actions_this_turn` counter to `BattleEngine`. A player's turn only ends (`_advance_turn()`) when they've submitted `min(3, living_count)` actions or clicked "End Turn". Until then, they can keep selecting chars/skills.

---

## CPU AI Design (Implemented)

CPU is `CPU_PLAYER_ID = -1`, managed entirely server-side. After each human action, `battle_action()` loops `cpu_take_turn()` until it's the human's turn again.

Priority scoring: afflict×3 > pierce×2 > damage×1, +DoT turns, +30/stun turn, +heal bonus for low HP, +500 for killing blows.

With 3-skills-per-turn: CPU should submit 3 actions at once (one per char) before returning.

---

## Character Balance Targets

All characters: 100 HP. Energy economy should be consistent:
- Free skills (0 cost): basic attacks, 15-20 dmg
- 1-pip: 20-30 dmg, or meaningful utility
- 2-pip: 35-50 dmg, or strong utility + minor dmg
- 3-pip: 50-70 dmg, or ultimate effect (AoE/CC)
- Affliction: 10-15 less than equivalent normal damage (penalty for bypassing defense)
- AoE: 10-20 less per target than single-target equivalent

---

## File Size Limits

- `characters.py` is large (~700 lines). Do not add more characters without removing others.
- `app.js` is ~1300 lines. Keep it organized by section (draft, battle, UI).
- `game.py` is ~1000 lines. BattleEngine is at the bottom.

---

## Do NOT Do

- Do not add more characters beyond the current 30 without user approval
- Do not change the design system colors/fonts without user approval
- Do not add NPM/webpack/build steps — this is a single-file vanilla JS project
- Do not add a database — session state only (in-memory, per-room)
- Do not refactor the working effect pipeline (effects.py + Skill properties)
- Do not make the draft simultaneous pick (the random draw/keep/pass is intentional flavor)

---

## How to Run

```bash
cd C:\Users\dylan\OneDrive\Documents\Game
python web/app.py
# Opens on http://localhost:5000
```

The server uses Flask-SocketIO with eventlet (ignore the deprecation warning — it still works).
Cache-bust static files: change `?v=N` in `index.html` when updating CSS/JS.
