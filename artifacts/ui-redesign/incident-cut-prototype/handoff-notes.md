# Incident Cut prototype — integration handoff

Status: **design prototype built to the locked contract.** No decision record is
needed — this does not contradict `docs/season3_visual_system.md`, it implements it.

## What changed versus the Night Parade attempt

Night Parade required superseding the locked palette. This does not. It uses the
Incident Cut palette verbatim, the daylight world the grammar calls for, and the
**structural** contract in "Locked screen composition" — which explicitly says
recolouring a panel stack does not satisfy the direction.

## Contract conformance

| Locked requirement | Status |
|---|---|
| Bone/ivory routine surfaces, ink charcoal text | Yes — `#F7F0E1` panels, `#17191E` contours |
| Thick ink borders, clipped corners, sparse hatching | Yes — `.panel` clip-path + `.hatch` overlay |
| Bright saturated blue sky, cold bone-gray concrete | Yes — world canvas |
| Storm ochre as weather accent, not a cast | Yes — 30% alpha wash only |
| Restrained barrier-red cuts | Yes — one horizon cut, threat states only |
| Ordinary navigation is not a near-black dashboard | Yes |
| Cinematic darkness brief and reversible | Yes — `curtain` decays, fires only on Black Flash |
| Home: top strip, oversized editorial title, one giant CTA, exactly three feature cards, fixed three-item bottom nav | Yes |
| Combat: stage ≥55%, HUD+command ≈35% | Yes — measured 62.5% / 33.7% |
| Combat: three enemy cards above an open lane, three ally cards below | Yes |
| Four tall illustrated technique cuts | Yes — 156px, generated per-skill art |
| Dominant Review rail, Clear and Pass subordinate | Yes |
| First Creation: slots above one large featured composition, filters, paging | Yes — carousel, not a list or grid |
| Character Study: full screen, pageable skills, slot identity, Add/Remove CTA | Yes |
| Queue Review: battlefield stays visible, 1–3 card deck, order controls, exact cost, **Wild assignment**, remaining energy, validation | Yes |
| Confirm disabled until the queue contract is satisfied | Yes — blocked while any `X` is unassigned |
| Mission nodes directly on the painted route map | Yes |
| ≥44px controls at 360x800, 390x844, 430x932 | Yes — audited, minimum 44 on every screen |
| Locked 19-character First Creation roster | Yes — verified name by name |
| Energy semantics unchanged | Yes — `JJK_MOBILE_TOKENS` hexes reused |

## The Wild-cost fix

The earlier prototype auto-assigned `X` from leftover energy. That is wrong: the
contract requires the player to assign Wild during queue review, and the UI must
show it. This build reserves only the **specific** costs when an action is
queued, leaves each `X` slot null, and offers a picker of the remaining core
energies in review. Confirm stays disabled and reads "Assign Wild" until every
slot is paid; remaining energy updates live.

Verified: queueing Black Flash (`T` + `X`) with pool `T J S B` reserved the `T`,
offered `J S B` for the Wild, unlocked Confirm on assignment, and consumed
exactly `T` and the chosen `B` on resolution.

## Still not integrable as code

Unchanged from the previous handoff, and none of it is a palette problem:

- The maintained client is Phaser scenes; this is one HTML file with a canvas
  loop and DOM overlays. Porting is a redraw, not a copy.
- The prototype resolves damage, legality and victory locally. Battle v2 on the
  server is authoritative; that logic must be deleted, not ported.
- Mission progression is `localStorage` here; it must be profile/server-backed.
  Only the bounded 12-entry record archive is legitimately device-local.
- Kits are illustrative. Real `SkillSpec` data, replacements, cooldowns, hidden
  and reveal states, and Domain handling are absent.
- Character art is procedural cel-shaded stand-in geometry. The illustration
  contract needs real plates: 3:4 roster card, square face crop, wide combat
  crop, registered focal points, and the five v3 skill atlases.

## Remaining gaps against the contract

1. No replacement skills, so the "replacement never becomes a fifth slot" rule
   is unexercised.
2. No cooldowns, hidden/invisible state, or reveal conditions.
3. No draw or no-contest terminal states.
4. No PvP: no sealed silhouettes, waiting, cancel, reconnect, or timers.
5. Motion preference is read once from `prefers-reduced-motion`; the contract
   wants three persisted modes (`system` / `reduced` / `full`).
6. No haptics, no presentation settings sheet beyond a sound toggle.
7. Matchup is a vertical stack, not the diagonal confrontation the contract
   describes.

## Suggested sequencing

1. Land the token values alone; verify no scene reads a removed key.
2. Re-skin `ResultScene` end to end, capture QA at 390x844 and 430x932.
3. `FirstCreationScene` + Character Study next — the carousel structure is the
   biggest departure from the deprecated layout.
4. `CombatScene` last, with Queue Review and its Wild assignment in its own PR.

Keep roster, progression, and engine work in separate PRs per `AGENTS.md`.
