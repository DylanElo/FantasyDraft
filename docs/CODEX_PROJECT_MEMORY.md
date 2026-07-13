# JJK Arena — Canonical Codex Project Memory

## Purpose

This document is the durable product and design memory for Codex. It consolidates decisions made across design discussions so a new Codex task does not rediscover the product from scratch or drift toward a different game.

This is not a task backlog and not a substitute for tests. It records the intended game, its non-negotiable rules, its roster/progression philosophy, its UI/UX bar, and the boundaries between engine, client, and delivery work.

Codex must read this document before planning repository changes.

---

# 1. Product identity

JJK Arena is a **portrait-first mobile 3v3 tactical battler** inspired by the strongest parts of Naruto Arena:

- intentional three-character team construction
- one skill per living character per turn
- visible colored-resource tension
- queue commitment before resolution
- left-to-right action order
- counters, reflects, hidden traps, replacement skills, and conditional payoffs
- compact kits that function as small tactical state machines
- mission-unlocked variants that increase complexity rather than invalidating starters

It is not intended to become:

- a real-time action game
- a traditional turn-based JRPG
- a MOBA
- a generic card battler with JJK art
- a lore simulator where stronger canon characters receive unrestricted numbers
- a desktop web dashboard disguised as a mobile game

The desired synthesis is:

```text
Naruto Arena tactical clarity
+ JJK technique identities and rule-breaking conditions
+ modern mobile-game UX
```

---

# 2. Maintained architecture

## Runtime

- `jjk_arena/battle_v2/` is the maintained gameplay engine.
- `web/app.py` is the Flask-SocketIO HTTP/socket bridge.
- `web/static/phaser/` is the maintained mobile client.
- The Flask template should remain a thin canvas/bootstrap host.
- Python owns battle truth. Phaser owns presentation and input collection.

## Authority boundary

The server owns:

- skill legality
- target legality
- adjusted cost
- energy payment
- queue validation
- damage and healing
- statuses and clocks
- hidden information
- counters and reflects
- replacements
- deaths and winner detection
- CPU choices
- profile/mission progression

The client owns:

- screen flow
- selected UI state
- animation and presentation
- input collection
- readable previews from serialized server state
- temporary local interactions that do not mutate battle truth

The client must never become a second resolver.

## Removed architecture

Do not restore:

- Telegram bot identity/runtime
- old v1 battle engine
- obsolete DOM-first battle UI
- old static Pages demo
- name-based character special cases as the primary rules model

---

# 3. Canonical battle loop

## Match shape

- 3 active characters per team.
- 100 HP per character unless an explicit future mode says otherwise.
- A player wins when the opponent has no living active characters.

## Turn phases

```text
PLANNING
-> QUEUE_REVIEW
-> RESOLVING
-> TURN_END
-> next player PLANNING
-> FINISHED when a winner is decided
```

## Planning

- Each living active character may choose at most one skill.
- A skill selection includes all required target context.
- The player can revise the plan before confirmation.
- Known invalid skills and targets should be disabled/explained in the client, but the server validates again.

## Queue Review

- Queued actions are displayed left-to-right in final resolution order.
- The player assigns payments for every Wild/random cost.
- Specific energy is paid before Wild allocation.
- The player may reorder and cancel before confirmation.
- Confirm is unavailable while any action is invalid or underpaid.

## Resolution

- The server spends energy on final confirmation.
- Actions resolve left-to-right.
- Resolution creates authoritative events for playback.
- Targeting is established before effects are applied unless a documented rule explicitly retargets.

## Turn end

- Status clocks tick according to their explicit clock owner.
- Action/control effects apply according to their persistence rules.
- Cooldowns update.
- Deaths and victory are checked.
- The correct player gains random core energy.
- The next player enters planning.

---

# 4. Energy model

JJK labels are used over Naruto labels, but the resource logic remains a four-color random economy.

- `B` / Body — physical combat, martial arts, cursed tools, physical reinforcement.
- `T` / Technique — cursed techniques, shikigami, cursed speech, puppet output.
- `F` / Focus — tactics, barriers, counters, reads, support, controlled preparation.
- `C` / Curse — volatile cursed energy, blood, poison, cursed-spirit effects, risky output.
- `X` / Wild — a cost placeholder that can be paid by any generated core color in Queue Review.

`X` is not generated, stored, drained, or displayed as a fifth resource pool.

## Generation

- Each generated pip has an equal chance among the four core colors unless an explicit skill changes it.
- The first player receives one random core energy.
- Subsequent normal gains equal the number of living active characters at the intended turn-end timing.
- Random effects use battle RNG/seed injection for deterministic testing.

## Opportunity cost

Expensive skills consume the same shared pool that teammates need. A three-energy finisher can reasonably leave the rest of the team unable to act. Balance must account for that team-level opportunity cost.

---

# 5. Damage, defense, and invulnerability

## Normal damage

- Subject to normal fixed damage reduction, applied as a turn-aggregate
  budget: it absorbs at most the reduction total across every normal hit a
  character takes in one turn, not a flat discount on each individual hit.
  See `docs/decisions/battle_v2_damage_reduction.md`.
- Then absorbed by destructible defense.
- Remaining damage removes HP.

## Piercing damage

- Ignores normal damage reduction.
- Still hits destructible defense.
- Does not automatically demolish defense.

## Soul / Affliction damage

- Ignores normal damage reduction.
- Ignores destructible defense.
- Used for poison, soul attacks, certain delayed curses, and explicitly categorized effects.

## Health steal

- Is not ordinary healing and not ordinary damage for all interactions.
- Ignores normal damage reduction.
- Does not bypass destructible defense.
- Heals only for HP actually removed, never shield damage.

## Sure-hit

- Reserved for Domain/sure-hit contracts.
- It is not a generic “ignore everything” flag.
- Every anti-domain interaction must be explicit, readable, and tested.

## Defense destruction

“Destroy/demolish defense first” is a separate effect. It must execute before subsequent damage. Piercing alone does not imply defense destruction.

## Invulnerability

Default invulnerability means “not a valid target for new harmful enemy skills.”

- It does not block helpful ally skills by default.
- A status may explicitly block helpful skills or all skills.
- Already-active instant effects may continue according to their persistence contract.
- “Ignore” and “bypass” are distinct from invulnerability removal.

## Open damage-reduction decision

Naruto Arena aggregates fixed damage received during a turn before applying fixed reduction. The current project has historically used per-event reduction in places.

This remains an explicit open design decision. Codex must not silently switch models. A change requires:

- explicit user approval
- migration notes
- multi-hit tests
- balance review for all reduction skills

---

# 6. Skill interaction grammar

## Skill data

A skill must expose and implement:

- ID and name
- concise player-facing text
- explicit cost
- cooldown
- target rule
- classes/tags
- effects
- conditions
- duration clock
- transformation/replacement behavior
- counterplay

Player-facing prose is not an engine parser. Shipping behavior is explicit structured data.

## Condition context

Conditions may intentionally reference:

- caster
- effect recipient
- original selected target
- primary target
- secondary target
- alternate redirect destination
- all resolved targets
- source/target status stacks
- frozen state before prior effects mutate the board

The implementation must name the context. Never use an ambiguous `target` variable to mean different things within one skill.

## Counter

- Negates the whole incoming counterable skill.
- A “first skill” counter skips uncounterable skills and waits for the first valid one.
- Existing effects are not retroactively countered.
- Action skills are normally countered only when initially applied unless explicitly stated.

## Reflect

- Redirects the complete harmful skill payload.
- It is evaluated once per skill, not once per effect.
- Damage plus stun must both redirect together.
- The reflected skill remains attributed to the original caster for costs/cooldown unless the explicit rule says otherwise.

## Invisible

- Source/owner sees the effect.
- Opponents do not see the unrevealed effect, protected target, private event, or hidden queue data.
- A hostile invisible status placed on an enemy is not visible merely because that enemy is the recipient.
- Some future skills may reveal the fact of use but hide the target; this must be an explicit reveal mode.
- Reveal/expiry events occur only at documented points.

## Replace and copy

- Replacement is slot-based.
- The replacement occupies the base skill’s original slot.
- When the replacement ends, the original skill returns.
- Copy preserves documented original-slot transformation behavior; copying must not create accidental slot drift.

## Persistence

- `Instant`: applies once; ongoing duration is normally independent of caster contact.
- `Action`: applies again over multiple turns and can fail for a tick if contact/ability is disrupted.
- `Control`: requires continuing contact and ends when the controlling link is broken.

## Duration clocks

Every status must deliberately use one of:

- `source_turn`
- `target_turn`
- `round`
- explicitly justified `global_turn`

A newly created setup must not lose a tick during the action that created it. Tests must model the full intended setup/payoff sequence.

## Status families

Where removal/cleanse matters, use typed families:

- Affliction
- Soul
- Stun
- Control
- Mark
- Buff
- Debuff

“Hostile” is not a cleanse family.

---

# 7. Kit design constitution

## Normal shape

A first-pass character normally has:

1. Basic pressure.
2. Signature technique.
3. Setup, defense, counter, or utility.
4. Payoff, transformation, Domain, Vow, or defining high-impact action.

Allowed additions:

- zero to two replacement skills
- zero to one passive/achievement contract

## Readability limits

- One major named state per starter is preferred.
- One main payoff pattern per starter is preferred.
- Avoid full-canon simulation.
- Avoid requiring players to memorize many private flags.
- Avoid unconditional “does everything” skills.
- Every kit has a meaningful weakness or pressure point.

## Power budget philosophy

Lore establishes fantasy and role, not free numeric superiority.

A powerful canon character may receive:

- higher ceiling
- stronger rule manipulation
- flexible targeting
- unique state machine
- expensive or specific costs
- severe cooldowns
- setup and burnout
- a clear punish window

It may not receive every advantage simultaneously.

Approximate Arena-style expectations, not automatic formulas:

- One-energy direct pressure: usually around 20–25 damage.
- One-energy damage plus meaningful control: usually lower damage.
- Two-energy burst: often around 30–40 depending on type and conditions.
- Cheap AoE: chip, setup, or low numbers.
- High AoE/team control: expensive, delayed, transformed, sacrificial, or heavily cooled down.
- Kill effects: setup states, expensive payoff, and real counterplay.
- Domains: field-rule pressure rather than simple enormous damage buttons.

## Explicit anti-pattern: Maximum Meteor

Jogo’s Maximum Meteor must not appear as a freely available ordinary skill with huge teamwide damage.

If introduced later, it should resemble a high-commitment achievement/replacement:

- prerequisite state or Domain/setup
- visible warning/delay
- high specific/Wild cost
- major team action-economy sacrifice
- interrupt/counter/defense routes
- long cooldown or one-time use

The comparison point is Naruto Arena’s transformed, setup-gated team finishers—not an anime cutscene translated directly into a button.

---

# 8. Character variants policy

Multiple iterations of the same identity are a core roster tool, as in Naruto Arena, but each variant must justify a distinct roster slot.

A variant is justified by material changes in:

- era
- body/vessel
- technique access
- Domain access
- resource engine
- tactical role
- major state machine
- counterplay pattern

A portrait change, costume, or larger damage number is not enough.

## Yuta roadmap

Long-term Yuta variants are mechanically justified as separate characters:

- Yuta Okkotsu (JJK 0): Rika curse, katana, healing, emotional burst/protection.
- Yuta Okkotsu (Sendai): copy rotation and Sendai-era midrange kit.
- Yuta Okkotsu (Shinjuku / EOS): Technique Extinguishment, precognition, barrier refinement, actual Domain use, advanced anti-technique play.
- Yuta in Gojo’s body: late, extremely high-complexity special variant.

Only **Yuta Okkotsu (JJK 0)** belongs in First Creation.

---

# 9. First Creation and progression

## Product intent

First Creation should feel like:

```text
Welcome to Jujutsu High.
```

It should not immediately feel like the end of the manga.

The starter roster teaches fundamentals through students, early sorcerers, young mentors, Junpei, and JJK0 Yuta. Disaster curses, adult/endgame forms, and advanced variants arrive through missions.

## Locked First Creation roster

Exactly 19 account-creation entries:

1. Yuji Itadori
2. Megumi Fushiguro
3. Nobara Kugisaki
4. Maki Zenin
5. Toge Inumaki
6. Panda
7. Aoi Todo
8. Noritoshi Kamo
9. Momo Nishimiya
10. Mai Zenin
11. Kasumi Miwa
12. Kokichi Muta / Mechamaru
13. Junpei Yoshino
14. Satoru Gojo (Young)
15. Suguru Geto (Young)
16. Shoko Ieiri (Young)
17. Utahime Iori (Young)
18. Mei Mei (Young)
19. Yuta Okkotsu (JJK 0)

The user explicitly requires Junpei and all five listed young teachers/sorcerers. Do not remove them to make the pool “cleaner.”

## Excluded from account creation

Examples of mission-locked content:

- adult Gojo and unsealed/Shinjuku Gojo
- Sendai and Shinjuku/EOS Yuta
- Yuta in Gojo’s body
- Sukuna variants
- disaster curses
- adult/endgame Geto/Kenjaku
- Awakened Maki
- Awakened Yuji
- Hakari, Higuruma, Kashimo, Takaba, Angel
- Toji and other advanced/high-complexity units

## Progression philosophy

- Later characters are more complex, not strictly stronger.
- Starter characters stay ladder-viable forever.
- Missions unlock characters, variants, titles, icons, and advanced paths.
- Progression must not become pay-to-win or linear numeric obsolescence.

Suggested narrative tiers remain:

- Enrollment / early story
- Goodwill Event
- Origin of Obedience
- JJK0
- Shibuya Incident
- Culling Game
- Shinjuku Showdown

---

# 10. Locked starter mechanical identities

The detailed numeric contracts live in `docs/first_character_creation.md` and `starter_roster.py`. These identity statements prevent drift when balancing:

- Yuji: readable bruiser/finisher; sequencing, Momentum/Soul Bruise; honest and predictable.
- Megumi: shikigami setup/control; marks and soft control; no starter Mahoraga or completed Domain apocalypse.
- Nobara: Nail mark into Resonance/Hairpin payoff; scary after setup, not instant burst.
- Maki: starter weapon specialist and anti-defense unit; not Awakened Maki and not universal anti-Domain assassin.
- Toge: strong control paid with recoil/self-risk; tempo, not free lockdown.
- Panda: simple reliable stance tank through Gorilla Core.
- Todo: controlled prediction and redirect; not random casino redirection.
- Kamo: disciplined blood mark and fair resource pressure; drain requires setup and correct timing.
- Momo: information, exposure, rescue, and resource smoothing; low damage by design.
- Mai: precision setup through Hidden Bullet; threat should be readable and counterable.
- Miwa: genuinely useful fundamentals/counter unit; no “useless” joke baked into mechanics.
- Mechamaru: protected artillery/backline threat; starter is not named Ultimate Mechamaru.
- Junpei: fragile poison/shikigami control; delayed pressure and protection.
- Young Gojo: expensive high-ceiling control/read; no starter Unlimited Void or Hollow Purple button.
- Young Geto: Curse Stock/summon scaling; earned replacement payoff.
- Young Shoko: healer/cleanse, very low offensive carry potential.
- Young Utahime: modest team amplifier whose value comes from timing and survival.
- Young Mei Mei: scouting, Crow Mark, efficient conditional payoff; no lore one-shot.
- Yuta JJK0: Rika protection, katana, healing, simple cursed-speech replacement; not Domain/copy-master Yuta.

---

# 11. Mobile UI/UX constitution

## Quality bar

The intended UI should feel designed by a veteran mobile game UI/UX team, not a university prototype.

A redesign request means a full interaction and information-architecture redesign. It does not mean:

- recolor the old layout
- add neon borders
- add more gradients
- add more particles
- rename existing buttons
- preserve crowded panels because they already exist

## Device targets

- Primary: 390x844.
- Small: 360x800.
- Large: 430x932.
- Desktop/tablet presents a centered mobile game surface rather than stretching into a dashboard.

## Mobile standards

- Safe-area aware.
- Dynamic browser chrome resilient.
- Primary actions in thumb reach.
- Roughly 44–48 px minimum tap targets.
- No critical text clipped or truncated.
- No primary CTA covering pagination/content.
- No letter-only bottom navigation.
- No three narrow roster columns on a normal phone.
- No debug panels or giant text walls.
- No unexplained icon-only decisions.

## Screen separation

The experience should have distinct flows for:

1. Boot/Splash
2. Lobby/Home
3. First Creation/Roster
4. Mission Map
5. Matchup
6. Combat Planning
7. Queue Review
8. Resolution Playback
9. Results
10. Records/Profile

Do not combine all progression and onboarding concepts into one giant scroll.

## Combat layout

Preferred mobile hierarchy:

- Top HUD: phase, turn, energy, settings.
- Enemy row: three readable fighter tokens/cards.
- Center field: prompts, attack playback, damage/reveal/domain feedback.
- Ally row: three readable fighter tokens/cards.
- Bottom command dock: selected fighter and four skills, then queue/confirm actions.

## Skill presentation

Compact skill card:

- skill name
- core/Wild cost
- cooldown
- target type
- concise effect summary
- key tags
- disabled reason

Full details appear in a bottom sheet/hold interaction with glossary support.

The player should not need to read a dense paragraph every turn. The compact summary and state chips should communicate the actionable rule.

## Queue Review

Must communicate:

- exact left-to-right order
- caster
- skill
- primary/secondary/alternate target
- cost and Wild allocation
- remaining energy
- invalid reason
- touch-friendly reorder
- clear Confirm and Cancel

## State language

Distinct visual states are required for:

- available
- selected caster
- selected skill
- legal target
- primary/secondary target
- queued
- acted
- cooldown
- insufficient energy
- harmful/class stun
- protected/invulnerable
- destructible defense
- countered
- reflected
- invisible reveal
- dead
- Domain/field active

## Visual direction

- Ink-black surfaces.
- Talisman paper/gold for selection and commitment.
- Teal for legal target feedback.
- Blood red for danger/damage.
- Violet only for Domain/cinematic moments.
- Controlled effects and strong spacing rather than constant glow.
- One coherent portrait/art treatment.

## Component architecture

Maintain reusable equivalents of:

- GameButton
- IconButton
- Panel
- BottomSheet
- FighterToken
- SkillCard
- EnergyOrb
- StatusChip
- QueueActionCard
- CharacterRosterCard
- CharacterDetailSheet
- Toast
- DamageNumber
- PhaseBanner

Scenes own flow; components own rendering/interaction; store owns client state; socket layer owns communication; theme/tokens own visual constants.

## Client/server parity

The UI must truthfully expose server contracts:

- replacement in original slot
- authoritative adjusted cost
- known disabled reason
- helpful vs harmful target legality
- class/harmful stuns
- primary/secondary/alternate targets
- queue order
- viewer-specific hidden data

If the client and server disagree, improve the serialized parity contract rather than copying the Python resolver into JavaScript.

---

# 12. Delivery and PR discipline

## Separate concerns

Use separate focused PRs for:

- engine correctness
- starter kit changes
- progression
- socket payloads
- mobile UI redesign
- visual effects
- roster expansion

Do not use a UI redesign PR to change balance. Do not use a timing-correctness PR to rewrite scenes.

## Correctness before breadth

Before adding new characters:

- all 19 starters and 78 skills must have explicit behavior
- text, engine, serialization, and UI must agree
- setup/payoff timing must work across real turn sequences
- high-risk mechanics must have named regressions

## No false completion

Codex must distinguish:

- implemented
- documented
- unit-tested
- integration-tested
- manually browser-verified
- not verified

Do not call a mobile redesign complete because components were renamed. Do not call a skill implemented because it enters cooldown or causes any state mutation.

## Verification baseline

```bash
python -m pytest -q
python -m compileall -q jjk_arena web/app.py
git diff --check
```

For changed JavaScript, run `node --check` on every changed module. For significant UI changes, run the local server and capture mobile screenshots at 390x844 and 430x932, checking console errors and interaction flow.

## Repository cleanliness

Never deliver `.venv`, caches, bytecode, logs, nested Git metadata, or arbitrary dirty-worktree archives as product changes.

---

# 13. Current work ordering

Unless the user explicitly changes priority, use this order:

1. Keep temporal/targeting/status semantics correct and tested.
2. Keep all starter text, server behavior, serialization, and Phaser behavior aligned.
3. Perform the real from-scratch mobile UI/UX redesign as a separate branch/PR.
4. Only then expand advanced missions/variants and cinematic effects.
5. Add more characters only after starter gameplay and mobile UX are trustworthy.

---

# 14. Open decisions — ask, do not assume

These topics are intentionally not locked and require user confirmation before a broad change:

- final monetization/commercial/IP strategy
- final number of launch mission unlocks beyond First Creation
- whether Draft remains a major mode beside Classic Arena after the core mobile release

When a task touches one of these, present options and consequences instead of choosing silently.

Fixed damage reduction (turn-aggregate budget, not per-hit) and the universal
anti-domain conversion rule are now locked; see
`docs/decisions/battle_v2_damage_reduction.md` and
`docs/decisions/battle_v2_anti_domain.md`.

Every First Creation mission (starter tier and every `mission_unlock` route)
requires the evaluated player to have won the match — no unlock, cosmetic or
character, is exempt; see
`docs/decisions/first_creation_mission_victory_requirement.md`.

---

# 15. Anti-drift checklist

Before submitting any plan or PR, Codex should answer internally:

- Does this preserve 3v3 queued tactical combat?
- Does it preserve the four-color economy and Wild cost semantics?
- Is the server still authoritative?
- Does the skill text exactly match behavior?
- Is the mechanic data-driven and reusable?
- Does the setup survive long enough for its payoff?
- Are hidden details protected per viewer?
- Is the power budget respecting action and team energy opportunity cost?
- Is First Creation still the locked 19-character pool?
- Is JJK0 Yuta still the only starter Yuta?
- Are young Gojo/Geto/Shoko/Utahime/Mei Mei and Junpei still present?
- Are advanced variants more complex rather than strictly stronger?
- Is this a real mobile interaction improvement rather than a recolor?
- Are UI and server contracts in parity?
- Did the task stay within its PR scope?
- Were the claimed checks actually run?

If any answer is “no” or uncertain, stop and address it before completion.
