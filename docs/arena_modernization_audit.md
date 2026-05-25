# JJK Arena Modernization Audit

## Product Target

JJK Arena should be a mobile-first successor to Naruto Arena and Soul Arena: fast 3v3 tactical combat, iconic character kits, readable skills, tight energy pressure, and premium mobile feedback.

The game should feel less like a fan database and more like a competitive battle board.

## Reference Findings

Sources checked:
- `NARUTO ARENA - Your turn-based, tactical online multiplayer game played in the browser_.pdf`
- `../naruto-arena-app/src/data/characters.json`
- `../naruto-arena-app/src/data/skill_effects.json`
- `../naruto-arena-app/src/data/game_mechanics.md`

Naruto Arena baseline:
- 3 characters versus 3 characters.
- Victory is reducing all opponents to 0 HP.
- Skill details are presented as name, energy cost, description, classes, cooldown.
- Four colored energy types plus black wildcard cost.
- Most characters have 4-5 skills.
- Most skills cost 1 energy; 2-energy skills are common finishers; 3+ energy is rare.
- Many characters have one no-cooldown basic skill.
- Core mechanics include damage, piercing, affliction, stun, invulnerability, damage reduction, destructible defense, healing, conditional effects, and skill classes.

Scraped Naruto Arena data:
- 417 characters.
- 1,971 skills.
- Cost distribution: 1 energy is dominant, 2 energy is secondary, 3+ is rare.
- Cooldowns: no cooldown and 4-turn cooldown are common anchors.
- Descriptions are long in the database, but the UI separates facts from details.

## Current JJK Findings

Roster:
- 43 characters.
- 172 skills.
- 12 portrait URLs returned 404 during audit and now use generated local SVG portraits:
  - Yuta Okkotsu (JJK 0)
  - Yuta Okkotsu (Sendai)
  - Yuta (Gojo's Body)
  - Gojo (Young)
  - Gojo (Unsealed)
  - Sukuna (Full Power)
  - Sukuna (Heian Era)
  - Yuji (Black Flash)
  - Yuji (Awakened)
  - Kenjaku
  - Hiromi Higuruma
  - Uraume

Balance profile:
- Blue, red, and wildcard costs are the most common costs; white is still the lightest color.
- The roster leans toward 2-cost skills, which fits an Arena-style tactical game but makes cheap tempo skills especially important.
- Some supports have low visible value because utility is not communicated strongly in the UI.
- Some powered variants create large fairness swings if mixed freely with base characters.
- The current automated audit no longer flags high-efficiency or spammable-pressure skills after the first tuning pass; the remaining warnings are long text and low visible utility.

Readability:
- Skill rows were too prose-heavy.
- Effects needed to be readable as compact combat facts before lore text.
- Broken art made draft and battle states feel unfinished.

## Design Rules Going Forward

1. Black is not a fifth stored energy type. It is wildcard cost paid with remaining colored energy.
2. Draft flow is draft 5, pick final 3, start 3v3. No bench.
3. Every character needs a role label:
   - Burst
   - Control
   - Tank
   - Support
   - Setup
   - Punisher
   - AoE
   - Stall
4. Every skill should be readable in under one second:
   - Name
   - Cost orbs
   - Effect chips
   - Target
   - Cooldown
   - Short lore description
5. Portraits must be local, reliable, or have a polished fallback.
6. Variants need a policy:
   - separate fantasy cards, or
   - one version per identity per match, or
   - tiered pools.

## Balance Targets

Starting targets for a mobile Arena-style game:
- 1 energy no-cooldown basic: 15-25 damage or modest utility.
- 2 energy skill: 30-40 damage or damage plus one rider.
- 3 energy skill: 45-60 damage, AoE, or major swing effect.
- Stun should be expensive or cooldown-gated.
- AoE should be priced as premium even when per-target damage is lower.
- Invulnerability and strong damage reduction should usually sit at 3-4 cooldown.
- Support skills need visible tempo value, not only hidden prevention.

## First Modernization Pass Completed

- Added fallback portrait rendering for known broken image URLs.
- Removed battle-facing black/generic energy confusion.
- Improved skill effect chips so the important combat facts come before prose.
- Added mobile layout polish for draft, selection, battle, and energy display.
- Added inferred combat roles to server and battle state data.
- Added `scripts/roster_audit.py` and `docs/roster_audit.json` for repeatable roster checks.
- Added `scripts/export_characters_data.py` so static roster data can be regenerated from the server source of truth.
- Tuned early balance outliers: lighter 1-cost stun damage, less oppressive AoE damage-over-time, cooldown gates for repeatable pressure, and reduced Yuji's no-cooldown delayed hit.

## Security And Performance Pass Completed

- Server startup now defaults to `127.0.0.1` instead of public `0.0.0.0`.
- Flask debug mode and unsafe Werkzeug serving are opt-in through `JJK_DEBUG=1`.
- Flask session secret is no longer hardcoded in source; set `FLASK_SECRET_KEY` for stable deployed sessions.
- Socket.IO CORS is restricted by default and can be configured with `JJK_CORS_ORIGINS`.
- Debug/reset routes are hidden unless debug mode is enabled.
- Socket payloads now sanitize room IDs, player names, skill names, team selections, target slots, and difficulty.
- Socket actions have lightweight per-session rate limiting to reduce spam/abuse.

## Mobile Battle UX Pass Completed

- Added a mobile command tray at the bottom of battle.
- The tray shows whose turn it is, which fighters are ready, acted, stunned, or down.
- Ready fighters can be selected from the thumb zone without tapping small board cards.
- Targeting mode now keeps a clear bottom prompt with the selected skill and a cancel action.
- The skill sheet is fixed to the viewport on mobile, so skill selection feels like a command drawer.
- Wildcard target selection now preserves the manually selected wildcard payment through target clicks.

## Local Portrait Pass Completed

- Added generated local SVG portraits for the 12 known broken remote image URLs.
- Added `portrait_url` and `portrait_source` to serialized character data.
- Updated draft, selection, battle, command tray, modals, and static roster data to prefer `portrait_url`.
- Added `scripts/generate_local_portraits.py` for repeatable local portrait generation.
- Added `web/static/assets/portraits/manifest.json` as the local portrait manifest.

## Skill Text And Utility Pass Completed

- Rewrote the long-text skill outliers into combat-first Arena-style descriptions.
- Fixed Nobara's `Supernova` text so it no longer claims self-damage that the engine does not apply.
- Updated the roster audit to value strengthen, weaken, destructible defense, counter-traps, and damage-reduction duration.
- Tuned Takuma Ino's `Kirin: Pain Nullifier` from 25 to 40 damage reduction for 1 turn so the skill has a clear emergency-guard identity.
- Current roster audit has no flagged skill outliers.

## Variant And Lore Pass Completed

- Added a match-lock identity policy for powered variants: only one Gojo, Yuji, Yuta, or Sukuna version can enter the active 3v3 team.
- The team-selection UI now marks conflicting variants as locked and blocks the lock-in button when duplicate identities are selected.
- The server now enforces the same variant policy, so clients cannot bypass it with a crafted socket payload.
- CPU active-team selection now avoids duplicate identities when choosing its best 3 fighters.
- Added serialized `identity` metadata to character data for UI and future roster tooling.
- Fixed early lore drift:
  - Nobara's non-canon `Supernova` became `Straw Doll: Resonance Finale`.
  - Noritoshi Kamo's non-canon shikigami-style ultimate became `Blood Manipulation: Crimson Rain`.
  - Yuki's Kenjaku-framed `Anti-Gravity` ultimate became `Star Rage: Black Hole`.
  - Sukuna's `Summon: Mahoraga` became `Adaptation: Wheel Guard` to frame the effect as the adaptation mechanic.

## In-Game Roster Lab Completed

- Added a Roster Lab entry point from the setup screen.
- Added a browser-native audit view for all 43 characters using the exported server roster data.
- The lab shows role, rarity, identity group, portrait source, burst, AoE count, control count, support count, energy profile, skill effects, cooldowns, target type, and per-skill efficiency.
- Added filters for role, identity, audit state, local portraits, and free-text character/skill search.
- Added compact audit flags for spammable pressure, high efficiency, low visible value, and long skill text.
- The lab is mobile-readable, with compact stats and cards instead of a wide spreadsheet.

## Lore Consistency Pass Completed

- Fixed Naobito Zenin's description from "fastest special grade after Gojo" to "fastest jujutsu sorcerer after Gojo."
- Corrected Awakened Yuji lore so he is no longer described as a Death Painting; the card now frames Blood Manipulation through his connection to Kenjaku and Choso.
- Renamed Awakened Yuji's `Supernova: Blood Form` to `Blood Manipulation: Convergence Burst` so the kit does not overclaim Choso's exact named technique.
- Updated frontend faction data for the actual current variants:
  - Gojo, Yuji, Yuta, and Sukuna variant names now map to the correct broad factions.
  - Removed stale frontend names like `Yuta (JJK 0)`, `Sukuna (Vessel)`, and `Sukuna (Heian Form)`.
- Updated frontend and server synergy checks so Yuta variants such as `Yuta Okkotsu (Sendai)` count correctly for Special Grade Sorcerers.
- Added a regression test for Yuta variant synergy handling.
- Current roster audit still has no flagged skill outliers after these lore and data corrections.

## Next Pass

1. Add role-pressure targets so each team has clearer strengths and weaknesses during draft.
2. Replace generated SVG portraits with curated final art where available.
3. Continue manual lore validation for future characters as they are added.
4. Add a tuning panel/export so balance notes can become repeatable patches.
