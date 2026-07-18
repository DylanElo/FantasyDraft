# Phaser Mobile Client — Codex Instructions

These instructions apply to `web/static/phaser/`.

## Read before editing

Read:

- `../../../docs/CODEX_PROJECT_MEMORY.md`
- `../../../docs/mobile_phaser_ui_ux_brief.md`
- `../../../docs/mobile_screen_inventory.md`
- `../../../docs/first_creation_visual_qa.md`
- `../../../docs/battle_v2_socket_contract.md`

## Design mandate

The target is a veteran-quality portrait mobile tactics game. The current UI is a prototype, not a sacred foundation.

A redesign must rethink the experience from first principles. Do not satisfy a redesign request with a palette swap, extra glow, more gradients, or minor panel reshuffling.

## Required screen architecture

Maintain clear, separate flows for:

1. Boot / Splash
2. Home / Lobby
3. First Creation / Roster Select
4. Mission Map
5. Matchup
6. Combat Planning
7. Queue Review
8. Resolution Playback
9. Results
10. Records / Profile

Do not combine onboarding, locked progression, presets, roster browsing, team confirmation, and mission explanation into one overloaded scrolling scene.

## Mobile layout standards

- Primary viewport: 390x844.
- Also test 360x800 and 430x932.
- Respect top/bottom safe areas and dynamic browser chrome.
- Keep primary actions in the lower thumb-reachable region whenever practical.
- Use minimum tap targets around 44–48 px.
- Never allow the primary CTA to overlap pagination or scrollable content.
- Do not truncate primary character names, skill names, or button labels.
- Do not use letter-only navigation such as `H`, `R`, `X`, `M`, `P`.
- Do not use three cramped roster columns on a 390 px phone. Prefer a readable two-column grid, full-width cards, or an intentional carousel/detail split.
- Avoid tiny text, excessive all-caps, walls of prose, and multiple equal-weight outlined panels.

## Visual hierarchy

- `Culling Current` is the internal codename for the locked Season 3 Culling Game visual system, not a product-era or progression rename. Follow `docs/season3_visual_system.md`.
- Every visible screen, illustration, environment, transition, VFX layer, and routine surface must use the same sharp-ink, raw-hatch, hard cel-shadow, painted-city system.
- Routine surfaces use bone `#F2E8D5`, smoke `#B7B5AD`, storm ochre `#B58B5B`, deep indigo `#101B36`, barrier red `#E32620`, curse cyan `#35DDE8`, aged gold `#D8BF68`, and ink charcoal `#17191E`.
- Routine navigation stays predominantly bone/smoke and world-led. Reserve deep darkness and black/red frames for Domains, finishers, damage, and brief cinematic punctuation.
- Aged gold indicates current selection/commitment.
- Curse cyan indicates legal targets.
- Barrier red indicates danger/damage.
- Green indicates queued actions.
- Violet is reserved for Domain/cinematic states, not routine chrome.
- Ink brush strokes, cross-hatching, barrier diagonals, hard cel-shadow cuts, and concrete/print texture are restrained accents, not substitutes for hierarchy.
- Decoration must support hierarchy. Do not cover weak information architecture with smoke, borders, or particles.
- Portraits and environments must use one coherent original or appropriately licensed production system. Preserve aspect ratio with focal cover crops; never stretch illustration art.
- Do not paste, trace, or regenerate official frames, manga panels, key visuals, logos, poses, or typography. Record prompts, result IDs, dimensions, processing, and hashes for generated runtime art.

## Combat interaction model

The player must always understand:

- current turn and phase
- available core energy
- selected fighter
- selected skill
- adjusted cost
- legal targets
- primary/secondary/alternate target requirements
- queued actions
- remaining Wild payments
- disabled reason
- resolution result

Recommended structure:

- Top HUD: turn, phase, energy, settings.
- Enemy row: three fighter tokens/cards with HP, defense, statuses, target states.
- Center field: prompts, attack playback, damage numbers, reveals, Domain/field state.
- Ally row: three fighter tokens/cards with ready/selected/queued/acted/dead states.
- Bottom command dock: selected fighter, four skill slots, confirm/cancel/end controls.

## Skill presentation

Combat skill cards are compact and scannable. They must show:

- name
- energy cost icons
- cooldown
- target type
- concise effect summary
- relevant class/status tags
- concrete disabled reason

Do not put the full rules paragraph on every combat card. Use progressive disclosure:

- tap/hold opens a full detail bottom sheet
- glossary/tooltips explain Pierce, Soul/Affliction, Counter, Reflect, Invisible, Destructible Defense, Invulnerable, Domain, Wild cost, and status clocks

Replacement skills render in the original slot and keep original queue-slot identity.

## Queue Review

Queue Review must clearly show:

- actions left-to-right
- caster, skill, target(s), cost, and slot
- reorder controls suitable for touch
- Wild payment assignment
- current and remaining energy
- validation errors adjacent to the relevant action
- disabled Confirm until valid
- obvious Back/Cancel path

Do not hide important validation solely in a toast.

## Rule parity

The client previews authoritative rules but never owns them.

- Use serialized adjusted costs, replacements, cooldowns, stuns, hidden/reveal state, and disabled reasons.
- Construct and preserve primary, secondary, and alternate-target fields.
- Do not show a skill as usable if the server will reject it for a known serialized reason.
- Do not infer hidden opponent data.
- Helpful targeting and harmful-only invulnerability must match server semantics.
- Viewer-specific state must remain viewer-specific.

When client and server disagree, fix the parity contract; do not duplicate more resolver logic in JavaScript.

## Reusable component requirement

Prefer reusable components/services over scene-specific drawing blocks. The maintained component vocabulary should include equivalents of:

- `GameButton`
- `IconButton`
- `Panel`
- `BottomSheet`
- `FighterToken`
- `SkillCard`
- `EnergyOrb`
- `StatusChip`
- `QueueActionCard`
- `CharacterRosterCard`
- `CharacterDetailSheet`
- `Toast`
- `DamageNumber`
- `PhaseBanner`

Scenes own flow. Components own rendering and interaction. Store owns client state. Socket layer owns communication. Tokens/theme own visual constants.

## UI-only scope

For a UI/UX PR:

- Do not add characters.
- Do not change damage numbers, costs, conditions, or battle semantics.
- Do not invent new server fields without documenting the contract and coordinating a focused backend change.
- Do not add unrelated progression systems.

## Acceptance criteria for a major redesign

A redesign is not complete until:

- screenshots exist at 390x844 and 430x932 for every changed major screen
- no clipping, overlap, hidden CTA, or truncated primary label exists
- navigation is understandable without a legend
- combat can be operated one-handed
- skill details are understandable without leaving combat
- queue and Wild payment are understandable to a new player
- all important states have distinct visual treatment
- the browser console has no new errors
- JavaScript syntax checks pass
- applicable Python/socket tests pass

Do not describe a scene as redesigned unless its information architecture and interaction model changed materially.
