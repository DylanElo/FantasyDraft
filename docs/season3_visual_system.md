# Season 3 visual system

Status: locked product direction, 2026-07-18.

This document defines the visual source of truth for the maintained Phaser
client. `Culling Current` remains the internal implementation codename. The
player-facing game is not renamed, the starter era is not changed, and the
visual direction does not unlock Culling Game characters or alter progression.

## Direction

Every visible screen, character illustration, environment, transition, VFX
layer, and routine UI surface must belong to one coherent Season 3 Culling Game
art system. The reference traits were distilled from current official material,
including the [official Season 3 site](https://jujutsukaisen.jp/shimetsukaiyu/)
and official [Culling Game key-visual announcement](https://jujutsukaisen.jp/news/20260109_04.php).
Those links are design-context citations only; they do not imply affiliation,
endorsement, licensing, or that official images were supplied as generator
inputs.

The game uses fresh generated or appropriately licensed compositions. Do not
paste, trace, or regenerate official frames, key visuals, manga panels, logos,
poses, or typography. “Season 3” describes the visual grammar, not permission
to ship unlicensed source art.

## Visual grammar

- Sharp hand-inked contours with occasional raw pencil, brush, and
  cross-hatched stress marks.
- Large, flat, high-contrast cel-shadow masses instead of soft glossy airbrush.
- Painted urban depth with a photographic sense of architecture, weather, and
  perspective.
- Bright saturated blue sky and cold bone-gray concrete lead routine Home and
  Combat worlds; storm ochre is a weather accent rather than a default color
  cast. Deep indigo structure, barrier-red geometry, and selective curse-cyan
  emission provide contrast.
- Asymmetric editorial composition, aggressive diagonals, cropped scale shifts,
  and occasional tilted/inverted fragments where readability permits.
- Stark black/red danger frames are brief punctuation for damage, Domains, and
  finishers; ordinary navigation is not a near-black dashboard.
- Paper/concrete grain, ink hatching, clipped corners, and red barrier cuts
  connect UI chrome to the illustrated world.

## Locked palette

| Role | Value | Use |
|---|---|---|
| Bone / ivory | `#F2E8D5` | Routine panels and readable surface wash |
| Smoke gray | `#B7B5AD` | Secondary surfaces, disabled states, concrete |
| Storm ochre | `#B58B5B` | Sky/world atmosphere |
| Deep indigo | `#101B36` | Structural ink, primary dark buttons, selected support |
| Barrier red | `#E32620` | Enemy threat, damage, dangerous cuts and boundary geometry |
| Curse cyan | `#35DDE8` | Legal targets, cursed energy, actionable highlights |
| Aged gold | `#D8BF68` | Selection and commitment |
| Ink charcoal | `#17191E` | Text, outlines, hatching |
| Queue green | `#4FB06D` | Queued/committed action state |
| Domain violet | `#7C3AED` | Domain and cinematic states only |

B/T/F/C energy colors and labels remain gameplay semantics and may not be
reinterpreted to fit the art palette. X remains a Wild cost placeholder, not a
fifth generated resource.

## Illustration contract

- One coherent production treatment applies to all 19 locked starter
  portraits. Exact era/form distinctions remain visible.
- Master sources must support the full 3:4 roster card, centered square face
  crop, and wide upper-torso combat crop. Runtime cover crops preserve aspect
  ratio and use registered focal points; art must never be stretched.
- Faces remain bright and legible. Red barrier geometry and background detail
  stay away from the face safe zone.
- Character-free environments preserve practical negative space for mobile
  controls and do not contain baked text, logos, characters, or interface. A
  designated character-led hero composition may include generated character
  art, but still contains no baked UI, title, labels, icons, or controls and
  requires its own provenance and release-rights review.

## UI contract

- Art leads; routine UI is primarily bone, smoke, and translucent off-white.
- Panels use thick ink borders, clipped corners, sparse hatching, and restrained
  red/cyan cuts. Avoid generic rounded glossy gacha cards.
- Primary controls remain at least 44px, thumb-reachable, safe-area aware, and
  readable at 360x800, 390x844, and 430x932.
- Character names, skill names, adjusted cost, disabled reasons, replacement
  state, legal targets, queue order, Wild assignments, hidden/reveal state, and
  server outcomes remain explicit.
- Progressive disclosure remains mandatory: compact battle cards plus full
  technique/detail sheets.
- Cinematic darkness must be reversible and brief. It may never hide normal
  planning or queue-review information.

## Locked screen composition

The user's approved portrait references define structure as well as surface
style. This structural contract supersedes the earlier Home and Combat vertical
slice; preserving its panel hierarchy and recoloring it is not an acceptable
implementation of this direction.

### Home

- A full-screen, character-led city illustration owns the frame. It is not a
  background behind a stack of dashboard panels.
- A compact top strip carries profile, level, currencies, inbox, and menu.
- The title is an oversized editorial mark within the world composition.
- One giant, high-contrast battle CTA is the unmistakable primary action.
- Exactly three secondary feature cards follow the CTA.
- A fixed three-item bottom navigation closes the screen with full labels.

### Combat Planning

- A slim top HUD exposes turn, phase/action state, timer, and the four core
  energies without turning the battlefield into a dashboard.
- Three large enemy fighter cards sit above an open directional battlefield
  lane; three equally readable ally cards sit below it.
- The selected fighter identity anchors a lower command region containing four
  tall illustrated skill cards.
- A dominant `Review` rail completes the planning flow. Clear and Pass remain
  available as subordinate actions.
- Legal targets, adjusted costs, cooldowns, replacements, disabled reasons,
  hidden/revealed state, queued state, and primary/secondary/alternate targeting
  remain explicit even when their presentation is progressive.

### First Creation and Character Study

- First Creation is an art-led roster browser, not a mission dashboard, preset
  selector, dense card grid, or recolored version of the deprecated layout.
- The three active slots remain visible above one large featured-character
  composition. `All 19`, Tokyo, Kyoto, and Special filters change the browsing
  route without changing the canonical locked roster order.
- Tapping the featured character opens a full-screen Character Study within
  the same illustrated world. It exposes large character art, name, era,
  difficulty, role, tactical state, canonical tags, and an Add/Remove Trio CTA.
- Every authoritative primary and replacement skill is pageable in Character
  Study. The profile shows original slot identity, generated presentation art,
  exact cost, cooldown, target count, self/downed eligibility, required status,
  classes, and shipping description. Replacement skills never appear as a
  fifth slot merely because they are a fifth profile page.
- Profile entry and skill paging receive short reduced-motion-aware transitions;
  they are not hard cuts or eligibility-changing animations.

### Queue Review

- Queue Review keeps the battlefield visible and replaces the lower command
  region with a one-to-three-card illustrated action deck.
- The deck reads left-to-right and exposes caster, skill, targets, slot, exact
  cost, Wild assignment, order controls, remaining energy, and action-local
  validation.
- Back, Clear, and Confirm are large thumb controls; Confirm remains disabled
  until the authoritative queue contract is satisfied.

## Runtime allocation

| Runtime plate | Screens |
|---|---|
| `culling-current-home.webp` | Boot |
| `culling-current-home-hero-v2.webp` | Home |
| `culling-current-campus.webp` | Draft, First Creation, Records |
| `culling-current-map.webp` | Mission Map |
| `culling-current-rooftop-v2.webp` | Combat, Queue Review, Result |

`web/static/assets/skills/culling-current/skill-action-atlas-v2.png` is the
current runtime action source. A stable presentation registry maps all 78
shipping skill IDs to an authored atlas crop, affinity palette, sigil, motion
profile, original slot, and replacement identity. The earlier four semantic
Body/Technique/Focus/Curse textures remain graceful fallbacks; they are not the
primary skill art system. Server-provided skill identity, adjusted cost,
legality, targeting, replacement, and effect text remain authoritative rather
than any image or presentation metadata.

## Motion, VFX, and audio contract

- Ambient print motes and shallow parallax keep illustrated worlds alive
  without veiling names or rules.
- Scene/profile reveals, skill selection commitment, queued-card sheen, legal
  target rings, queue commitment, impacts, healing, status, and reveal events
  use reusable presentation hooks. These hooks animate authoritative state;
  they never resolve an effect or advance a phase.
- `prefers-reduced-motion` removes continuous and decorative motion while
  retaining immediate state clarity.
- Gesture-gated WebAudio cues cover press, select, target, queue, confirm,
  error, reveal, and impact. Audio is synthesized locally, has persistent mute
  state, creates no context before a user gesture, and fails silently when
  audio is unavailable.
- Compact battle cards prioritize illustration, skill name, target, cost, and
  actionable disabled/queued/replacement ribbons. Classes and effect prose use
  the second-tap technique dossier instead of unreadably small card overlays.

The maintained asset registry is
`web/static/phaser/core/portrait-registry.js`. Full generation prompts,
identifiers, hashes, processing, and limitations are recorded under
`web/static/assets/portraits/PROVENANCE.md`,
`web/static/assets/environments/PROVENANCE.md`,
`web/static/assets/skills/PROVENANCE.md`, and
`artifacts/ui-redesign/s3-style/PROMPTS.md`.

The maintained Phaser cache version for this structural pass is `v28`.

## Gameplay invariants

This is a visual contract only. Python Battle v2 remains authoritative. The
browser submits intent and renders viewer-specific state; it does not decide
legality, damage, costs, hidden information, cooldowns, duration clocks, or
victory. The exact locked 19-character First Creation roster is unchanged.
