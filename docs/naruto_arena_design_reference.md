# Naruto Arena — Kit & Balance Design Reference

**Source**: Scraped from na-helper.vercel.app/data/characters.json
**Coverage**: 220+ characters, full skill data (energy costs, classes, cooldowns, descriptions, state machines)
**Purpose**: Design reference for JJK Arena kit grammar, energy economy, damage tuning, and counterplay patterns.

> This document is descriptive of what Naruto Arena does, not prescriptive of what JJK Arena must copy.
> JJK Arena uses T/J/S/B/X energy labels and its own damage type taxonomy. Cross-reference with
> jjk_kit_grammar.md, first_character_creation.md, and battle_system_v2_design.md when applying lessons.

---

## Section 1: Kit Archetypes

Eight primary tactical archetypes appear across the full NA roster.

### 1. Setup-Gated Burster
**Pattern**: Skill A (low-cost or free setup) unlocks or empowers Skill B/C, producing delayed burst (40-65+ damage).
**Role**: High-threat payoff that forces opponents to prepare defense, spend stun windows, or bank invulnerability.

| NA Character | Setup Skill | Payoff Skill | Payoff Damage |
|---|---|---|---|
| Uzumaki Naruto | Shadow Clones | Rasengan | 45 dmg + 1-turn stun |
| Sennin Naruto (S) | Frog Kata Kick (stun hit) | Rasenshuriken | 50 piercing, bypasses invul |
| Rock Lee | First Gate Opening (self-damage) | Primary Lotus | 40-50 piercing |
| Four Tail Kyuubi Naruto (S) | Four Tails Transformation | Four Tailed Beast Bomb | 50 piercing |

**JJK Application**: Young Gojo Blue gating Red follows this archetype. The gate hit must cost turns/energy to land; the payoff must be large enough to justify it.

---

### 2. Invulnerability Stall & Defense Tank
**Pattern**: High DD, DR, or multi-turn immunity paired with modest chip damage.
**Role**: Team anchor. Absorbs opponent burst windows and denies kill priority.

| NA Character | Defense Mechanic | Notes |
|---|---|---|
| Gaara of the Desert | Sand Armor (DR) + Sand Sphere (Invul) + Sand Shield (permanent DD/turn) | Layered scaling |
| Susanoo Sasuke (S) | 50 permanent DD, ignores DD destruction | Penalty: stunned 2 turns if DD broken |
| Senju Hashirama | 30 team DD + Chakra immunity + Physical immunity | Multi-layer team shielding |

**JJK Application**: Panda Gorilla Core. Layering DR + conditional penalty if broken creates risk-reward for opponents.

---

### 3. Energy Drain & Resource Denial
**Pattern**: Removes, steals, or inflates enemy energy costs.
**Role**: Starves energy-hungry teams and disrupts queue planning.

| NA Character | Denial Mechanic | Effect |
|---|---|---|
| Hyuuga Neji / Hinata | Gentle Fist | Steals/removes Tai or Nin energy on hit |
| Tsuchikage Oonoki (S) | Super-Weighted Boulder | +1 Random cost to all enemy skills for 2 turns |
| Samehada Fusion Kisame (S) | Water Prison Shark Dance | +1 Random cost; drains Blood/Nin per turn |

**JJK Application**: Kamo Blood Drain, Toge Recoil/silence. Energy denial must have setup cost or self-risk.

---

### 4. Damage-Over-Time / Affliction Specialist
**Pattern**: Affliction or Soul damage that bypasses normal DR and Destructible Defense.
**Role**: Counter to defense tanks and invulnerability-heavy teams.

| NA Character | DoT Mechanic | Notes |
|---|---|---|
| Aburame Shino | Venom Beetle / Insect Sphere | 5-15 permanent affliction stacks |
| Mangekyou Sasuke (S) | Amaterasu Wave | DoT doubles per turn target does not act |
| Edo Tensei Hanzo (S) | Contaminated Battlefield (Passive) | Global: disables ALL healing and DD; invul triggers 3 permanent affliction |

**JJK Application**: Junpei shikigami poison, Nobara Resonance, Kamo blood effects. Hanzo lesson: a global-rule-changing passive must be attached to a fragile character.

---

### 5. Counter & Reflect Specialist
**Pattern**: Invisible traps or reactive states that negate harmful skills and redirect payloads.
**Role**: High-mindgame defense that deters burst and forces low-value probing.

| NA Character | Trap Mechanic | Notes |
|---|---|---|
| Uchiha Itachi | Crow Genjutsu (counter) + Genjutsu Reversal (reflect) | Reflect redirects to random enemy |
| Hidan (S) | Curse of Jashin | Reflects ALL incoming harmful skills to cursed target for 2 turns |
| Yamanaka Fu (S) | Mind Puppet Switch | Counter forces target into puppet control |

**JJK Application**: Todo Boogie Woogie redirect, Maki counter-weapon strikes, Young Gojo Blue reflect. Invisible counter and visible reflect are two distinct skills. Do not combine them into one free trap.

---

### 6. Ramp & Scaler
**Pattern**: Permanently increases damage output or builds resource stacks as turns progress.
**Role**: Late-game win condition. Weak turns 1-2, overwhelming by turn 6+.

| NA Character | Ramp Mechanic | Peak Power |
|---|---|---|
| Akimichi Chouji (S) | Three Pills / Butterfly Control | Full kit transform at max stacks |
| White Zetsu (S) | +3 clone stacks/turn; 9 stacks = 60 piercing dmg | Reached turn 3 of charging |
| Hachibi Bee (S) | Hachibi charges 1-3; Lariat scales 30-65 piercing | Reached turn 3 |

**JJK Application**: Young Geto Curse Stock accumulation. White Zetsu model: public stack visibility with explicit power thresholds makes the threat legible and gives opponents a race-condition objective.

---

### 7. Support, Healer & Shielder
**Pattern**: Direct ally HP recovery, status cleansing, DD/DR buffs.
**Role**: Keeps core damage dealers alive; purges negative statuses.

| NA Character | Support Mechanic | Output |
|---|---|---|
| Tsunade (S) / Sakura (S) | Enhanced Healing Wave + Strength of 100 Seal | 30-40 HP heal + DoT cleanse |
| Shizune (S) | Full Team Recovery + Katsuyu Interception | 15-20 AoE team heal + ally counter trap |
| Karin (S) | Chakra Transfer | 35 HP heal to ally; costs 5 self-affliction |

**JJK Application**: Young Shoko. Karin model: meaningful self-risk attached to strong healing prevents healers from being passive free-value machines.

---

### 8. Transformation & Multi-State Specialist
**Pattern**: Character undergoes a major state change, completely altering their skill panel.
**Role**: Adaptive mid-game shift.

**JJK Application**: Geto Cursed Spirit replacement payoff, Panda Gorilla Core toggle are partial versions. Full multi-state transformations belong to mission-unlock variants, not starters.

---

## Section 2: Energy Economy Patterns

### Cost Tier Reference

| Cost Tier | Appropriate Skill Types |
|---|---|
| 1 energy | Spammable basic damage (20-25), 1-turn setup, 1-turn invulnerability (Random), weak DoT, basic stun |
| 2 energy | Mid-burst (30-40), AoE chip (15-20), heavy CC (2-turn stun), strong defense (team DD/DR) |
| 3+ energy | Finishers (45-65), AoE sweeps (30-40), transformations, revival skills |

### Specific vs. Wild Energy
- Specific energy enforces team composition constraints. ~60-70% of skills include at least one Random/Wild pip.
- Pure specific-energy skills are reserved for thematic signature moves.
- State activations triggered by HP threshold or prior turn action often cost 0 but require setup investment.

---

## Section 3: Damage Numbers by Cost

| Energy Cost | Damage Type | Target | Standard Range | Notes |
|---|---|---|---|---|
| 1 energy | Normal | Single | 20-25 dmg | Standard spammable hit |
| 1 energy | Piercing | Single | 15-20 dmg | Bypasses DR |
| 1 energy | Affliction | Single | 10-15 dmg | Bypasses DR + DD |
| 1 energy | Normal/Piercing | AoE | 10-15 dmg | Team chip |
| 2 energy | Normal | Single | 30-40 dmg | Heavy hit or stun included |
| 2 energy | Piercing | Single | 25-35 dmg | High-value single strike |
| 2 energy | Affliction | Single | 20-30 dmg | High DoT or unremovable |
| 2 energy | Normal/Piercing | AoE | 20-25 dmg | Solid team sweep |
| 3+ energy | Piercing/Normal | Single | 45-65 dmg | Ultimate finisher (setup/CD required) |
| 3+ energy | Piercing/Affliction | AoE | 30-40 dmg | Team wipe threat |

### Damage Type Trade-off Ratios
- Normal: Highest number. Subject to DR and DD absorption.
- Piercing: ~20-25% lower than Normal. Bypasses DR, still hits DD.
- Affliction/Soul: ~35-50% lower than Normal. Bypasses both DR and DD.
- Health Steal: Deals damage; heals only actual HP removed (never shield/DD damage).

### Conditional Bonus Damage
Skills with state-gated bonuses add +10 dmg for 1-energy base, +15-20 dmg for 2-energy base.
This keeps conditional improved output within the next-cost-tier range rather than exceeding it.

---

## Section 4: Cooldown Patterns

| Cooldown | Power Level | Typical Skill Type |
|---|---|---|
| CD 0 | Low | Spammable basic (15-20 dmg), persistent DoT tick, free setup |
| CD 1 | Standard | Tactical strikes (20-30 dmg), 1-turn stuns, energy mods |
| CD 2-3 | High | Heavy burst (35+ dmg), 2-turn stuns, team DR/DD shields |
| CD 4-5 | Ultimate | Finishers, full transformations, board-wide effects |

### The Universal 4-Turn Invulnerability Standard
- Nearly every NA character has exactly one 1-turn invulnerability skill at 1 Random energy, CD 4.
- This is a deliberate universal defensive floor creating a predictable 4-turn defensive cadence.
- JJK Arena should maintain this standard (Slot 4 invulnerability on every starter).

### Replacement Skill Cooldown Semantics
- When Skill A replaces with Skill B, Skill B executes with no additional cooldown penalty.
- Reverting from Skill B to Skill A restarts Skill A primary cooldown.
- Transformation skills that alter the full panel retain slot identity.

---

## Section 5: Class Tag Distribution

| NA Tag | JJK Arena Equivalent | Mechanical Role |
|---|---|---|
| Physical | Physical | Taijutsu, weapons, tools, reinforcement |
| Chakra | Jujutsu | Cursed technique, shikigami, cursed speech output |
| Mental | Domain / Barrier | Bypasses most standard physical/Jujutsu counters and invulnerabilities |
| Melee | Melee | Close-range; stopped by melee-specific counters |
| Ranged | Ranged | Projectiles, blasts; interacts with ranged counters |
| Instant | Instant | Applies immediately during resolution |
| Action | Action | Multi-turn channel; interrupted if caster is stunned |
| Control | Control | Hard CC (stuns, locks, disables) |
| Affliction | Affliction | DoT/poison/bleed; bypasses DR + DD |
| Unique | Unique | Specialized mechanic; bypasses generic copy/reflect |
| Helpful | Helpful | Buffs, heals, shields on self/allies |
| Harmful | Harmful | Offensive; blocked by invulnerability; triggers counters |
| Passive | Passive | Always-active; no energy cost; cannot be stunned |

### Critical Interaction Rules
1. Domain / Mental privilege: In NA, Mental skills bypass physical/chakra invulnerabilities. In JJK Arena this maps to Domain/sure-hit. See battle_system_v2_design.md anti-domain rules.
2. Helpful vs. invulnerable allies: Helpful skills can target an invulnerable ally unless an explicit status blocks helpful skills.
3. Typed stuns: A Physical stun does not stop a Domain skill.

---

## Section 6: Kit Structure Patterns

### The Standard 4-Skill Template

Slot 1 -- Primary Spammable / Setup
  CD 0-1, Cost 1 energy
  Low-to-mid damage (15-25 dmg) or setup status

Slot 2 -- Utility / Secondary Attack / CC
  CD 1-2, Cost 1-2 energy
  Stun, DoT, resource modification, or secondary strike

Slot 3 -- Payoff / Defensive Shield / Transformation
  CD 2-4, Cost 1-3 energy
  Heavy burst (35-50 dmg), team DD, or state trigger

Slot 4 -- Universal Invulnerability / Dodge
  CD 4, Cost 1 Random energy
  1-turn self-invulnerability (near-universal in NA)

### Kit Completeness Checklist
- What is the spammable turn-1 action?
- What is the state/setup investment?
- What is the gated payoff?
- What is the defensive escape hatch?
- What is the weakness / pressure point opponents exploit?
- Does the kit have at most one hidden/invisible effect?
- Is each skill duration clock explicit and tested?

---

## Section 7: Notable Design Examples (15 Kit Highlights)

### 1. Rock Lee -- Health-as-Resource Ramp
- First Gate Opening (takes self-damage) to Primary Lotus (40+ piercing).
- Lesson: Voluntary HP sacrifice for power creates high-tension risk-reward. The burned health is the opportunity cost, not the cooldown.

### 2. Nara Shikamaru -- Branching CC Resolution
- Shadow Imitation (CC single target) replaces slot with Shadow Dispersion (AoE stun to all un-imitated enemies). Problem Analysis (invisible counter converts incoming damage into DD).
- Lesson: Slot replacement after successful CC creates a branching decision tree (extend single-target lock vs. spread AoE).

### 3. Uchiha Itachi -- Invisible Counter + Visible Reflect as Two Distinct Skills
- Crow Genjutsu (invisible counter) + Genjutsu Reversal (reflects non-unique skills for 2 turns).
- Lesson: Counter and reflect serve different psychological functions. Never bundle both into one free trap.

### 4. Gaara -- Layered DD + Execute Setup
- Sand Coffin (trap) to Sand Burial (heavy execute on trapped target). Sand Armor (DR) + Sand Sphere (1-Random Invul). Kazekage Gaara permanently gains DD each 3 turns.
- Lesson: Layered DD forces opponents to decide between focusing the tank or bypassing them. Execute-on-trapped-target creates an explicit kill-condition window.

### 5. Deidara -- Exponential DoT Nuke Clock
- C4 Karura (planted microscopic DoT bombs that double damage each turn). C0 Final Explosion (self-sacrifice after 5 skill uses: 40 piercing AoE to all enemies).
- Lesson: Exponential DoT clocks create a strict kill-him-first race condition. Self-destruction finishers need a minimum-use gate to prevent turn-1 detonation.

### 6. Hidan (S) -- Damage Redirect Link
- Reaping Scythe (marks target) to Curse of Jashin (2-turn link: ALL harmful skills hitting Hidan are reflected to cursed target) to Impale (Hidan stabs himself, 40 piercing to cursed target).
- Lesson: Turning enemy attacks into friendly assets during a link window creates radical disruption. Self-harm finisher is the thematic payoff of being the weapon.

### 7. Kakuzu (S) -- Sequential Elemental Skill Panel + Execute Heal
- 5 elemental masks with skill chains; each primary replaces with a secondary on use. Heart Steal instantly executes targets at 35 HP or below and heals Kakuzu 35 HP.
- Lesson: Execute + self-heal on low-HP targets models persistent boss durability without absurd HP totals.

### 8. Sasori -- Persistent AoE Aura Tied to Shield Durability
- Red Secret 100 Puppets (50 DD; deals 15 piercing AoE to all enemies every turn until Sasori takes damage).
- Lesson: Aura damage that persists only while DD holds creates an explicit break-the-shield objective.

### 9. Nagato -- High-Cost Revival with Self-Sacrifice
- Samsara of Heavenly Life (Heals team 30 HP; revives dead allies to 30 HP at cost of 50 HP per revived ally to Nagato).
- Lesson: Comeback revival needs proportional self-harm to prevent cost-free resurrection loops.

### 10. Sennin Naruto (S) -- Un-blockable Finisher Gated Behind Blockable Setup
- Frog Kata Kick (25 dmg + 1-turn stun) to slot replacing with Rasenshuriken (50 piercing, bypasses invulnerability, uncounterable, unreflectable).
- Lesson: A finisher that bypasses all defenses is acceptable only if the setup hit enabling it is itself fully blockable. The counterplay lives in the gate, not the payoff.

### 11. Susanoo Sasuke (S) -- Double-Edged Shield with Failure Penalty
- Sasuke Susano-o (50 permanent DD, ignores DD destruction). If DD breaks, Sasuke is stunned 2 turns.
- Amaterasu Wave (12 DoT; duration increases +1 turn per turn target does not act).
- Lesson: Attaching a self-stun penalty to a massive defense shield rewards opponents who crack the shield rather than bypass it. Risk/reward exists on both sides.

### 12. Raikage Ay (S) -- Charge-then-Shatter
- Lightning Release Boost (+20 dmg boost to next attack, stacks +5 per use, grants 10 DR) to Horizontal Chop (destroys all opponent DD + 20 piercing).
- Lesson: Anti-defense tools (DD destruction) are a necessary archetype to counter tank/shield characters. Give at least one access per team composition.

### 13. Edo Tensei Hanzo (S) -- Global Environmental Passive
- Contaminated Battlefield (Passive): Completely disables ALL healing and DD for ALL units until Hanzo dies; any unit going invulnerable takes 3 permanent affliction damage.
- Lesson: A passive that alters global combat rules reshapes the entire match. Must be attached to a fragile or expensive-to-deploy character.

### 14. Kinkaku / Ginkaku (S) -- Shared Milestone Tracker & Predictive Invisible Counter
- Kinkaku accumulates team damage total; at 100 total transforms (+25 HP, 10 DR, 5 HP regen per turn).
- Ginkaku Benihisago: selects an invisible enemy skill; if enemy uses it, they are countered and drawn into the gourd.
- Lesson: Shared milestone counters and predictive invisible traps targeting specific skills are advanced mechanics appropriate for mission-unlock variants, not starters.

### 15. Mifune (S) -- Fluid Stance-Switching
- Three stances each providing a different defensive utility. Every stance resolves into the same Flash (30 piercing + stun) finisher with slightly different energy costs per stance.
- Lesson: Fluid stance systems where every stance provides defense but the payoff execution is unified reduce cognitive overhead while maintaining strategic depth.

---

## Balance Calibration Cross-Reference

| JJK Arena Design Rule | NA Evidence Supporting It |
|---|---|
| 1-energy pressure ~20-25 dmg | 95%+ of NA 1-energy basic attacks hit 15-25 dmg |
| 2-energy burst ~30-40 dmg | 90%+ of NA 2-energy hits are 25-40 dmg |
| Slot 4 invulnerability universal | NA universal: 1-Random, 4-CD invul on every character |
| Conditional bonus damage +10-15 | NA improvements uniformly +10 for 1-energy base, +15-20 for 2-energy base |
| AoE costs proportionally more | NA 2-energy AoE (20-25 dmg) vs single-target (30-40 dmg) confirms ~25% AoE discount |
| Affliction bypasses DR+DD | NA Affliction class always bypasses both -- matches JJK Soul/Affliction types |
| Counter negates whole skill | NA counters always negate complete incoming skill -- no partial negation |
| No-setup finisher is anti-pattern | Every NA 50+ dmg finisher requires at least one prior turn investment or HP gate |
| Replacement preserves slot identity | NA replacement skills always occupy the original skill slot |

---

Last updated: 2026-07-31. Source: na-helper.vercel.app scrape + full character dataset analysis (220+ characters).
