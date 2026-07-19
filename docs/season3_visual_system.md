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

T/J/S/B energy colors and labels remain gameplay semantics and may not be
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
- Composition is art-first rather than panel-first: large illustrations establish
  the screen hierarchy, while controls occupy deliberate negative space and
  compact editorial cuts. Reapplying this palette to a deprecated dashboard,
  grid, or stacked-panel structure does not satisfy the visual contract.

## Locked screen composition

The user's approved portrait references define structure as well as surface
style. This structural contract supersedes the earlier Home and Combat vertical
slice; preserving its panel hierarchy and recoloring it is not an acceptable
implementation of this direction.

### Home

- A full-screen, character-led city illustration owns the frame. It is not a
  background behind a stack of dashboard panels.
- Home is explicitly promotional key art: the fixed Yuji/Megumi/Nobara hero
  composition does not claim to depict the player's active trio. The actual
  selected team is communicated by the profile strip and roster flows.
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

### Team Setup and Matchup

- Team Setup uses one large featured-character composition with a readable trio
  rail and roster paging. It is not a three-column roster grid or a wall of kit
  prose.
- Character Study is shared with Team Setup so selecting a fighter can expand
  into the same full art, identity, primary-skill, and replacement-skill study
  used by First Creation.
- The dedicated Matchup screen is a visual handoff between team selection and
  Combat. It presents the two trios as an illustrated confrontation and keeps
  PvP-hidden opponent information private until the authoritative state reveals
  it.
- Starting, waiting, cancellation, resume, and routing remain store/socket
  operations. The matchup composition does not predict legality or battle
  results.

### Queue Review

- Queue Review keeps the battlefield visible and replaces the lower command
  region with a one-to-three-card illustrated action deck.
- The deck reads left-to-right and exposes caster, skill, targets, slot, exact
  cost, Wild assignment, order controls, remaining energy, and action-local
  validation.
- Back, Clear, and Confirm are large thumb controls; Confirm remains disabled
  until the authoritative queue contract is satisfied.

### Results

- Results open with an art-led winner/outcome composition and readable trio,
  followed by mission debrief, reward status, and the current match’s biggest
  impacts. It is not a generic statistics dashboard.
- Rematch and Return Home remain the dominant bottom actions. Result art and
  motion summarize state already supplied by Battle v2; they do not calculate
  records, mission progress, rewards, or the winner.

## Runtime allocation

| Runtime plate | Screens |
|---|---|
| `culling-current-home.webp` | Boot |
| `culling-current-home-hero-v2.webp` | Home |
| `culling-current-campus.webp` | Draft, First Creation, Records |
| `culling-current-map.webp` | Mission Map |
| `culling-current-rooftop-v2.webp` | Combat, Queue Review, Result |

The shipping skill-art source is five character-free v3 WebP atlases. Each is
`1248x1248`, arranged as a strict `4x4` grid of exact `312x312` cells:

| Registry family | Texture key | Shipping file | Used cells |
|---|---|---|---:|
| Taijutsu (legacy `body` key) | `s3-skill-atlas-body-v3` | `skill-atlas-body-v3.webp` | 14 |
| Jujutsu (legacy `technique` key) | `s3-skill-atlas-technique-v3` | `skill-atlas-technique-v3.webp` | 16 |
| Bloodline (legacy `curse` key) | `s3-skill-atlas-curse-v3` | `skill-atlas-curse-v3.webp` | 16 |
| Strategic guard/support (legacy `focus` key) | `s3-skill-atlas-focus-guard-v3` | `skill-atlas-focus-guard-v3.webp` | 16 |
| Strategic control/tactics (legacy `focus` key) | `s3-skill-atlas-focus-control-v3` | `skill-atlas-focus-control-v3.webp` | 16 |

`SKILL_ACTION_ATLASES` is the canonical runtime collection.
`SKILL_ACTION_ATLAS` remains a legacy `body`-atlas compatibility alias, not the complete
source. The stable presentation registry assigns one unique raster cell to each
of the 78 shipping primary/replacement skill IDs and also records its affinity
palette, sigil, motion profile, original slot, and replacement identity. The
older `skill-action-atlas-v2.png` is retained only as documented lineage; it is
not the shipping card source. The earlier internal `body`, `technique`, `focus`,
and `curse` textures—displayed as Taijutsu, Jujutsu, Strategic, and Bloodline—
remain graceful fallbacks and are not primary skill art.

Atlas family, crop, icon, and motion metadata are presentation only.
Server-provided skill identity, adjusted cost, legality, targeting,
replacement, effect text, and outcome remain authoritative. A replacement’s
unique art never creates a fifth action slot.

## Motion, VFX, and audio contract

- Ambient print motes and shallow parallax keep illustrated worlds alive
  without veiling names or rules.
- Scene/profile reveals, skill selection commitment, queued-card sheen, legal
  target rings, queue commitment, impacts, healing, status, and reveal events
  use reusable presentation hooks. These hooks animate authoritative state;
  they never resolve an effect or advance a phase.
- Combat fighter cards own the authoritative selected/`LEGAL` borders and
  labels. The presentation layer owns one central animated targeting sigil;
  duplicate portrait rings and duplicate center arrows are prohibited.
- Queue Review animates the rendered action-art cards when the review opens or
  left-to-right order changes. Ordinary rerenders do not replay the commitment
  sequence.
- Resolution playback may use static curtains, cut-ins, rings, slash paths,
  impact flashes, HP-lag rails, floating values, and short camera shake. These
  are viewer feedback for serialized events, not a second resolver.
- Motion preference has three persisted modes: `system`, `reduced`, and `full`.
  `system` follows `prefers-reduced-motion`, including runtime OS changes.
  Reduced mode halts active decorative tweens, removes continuous parallax,
  tap pulses, camera shake, and Boot pulse/fade motion, and replaces playback
  movement with short static readable holds.
- Gesture-gated WebAudio cues separately identify press, selection, target,
  queue placement/reorder, confirm, error, visible skill start, impact, heal,
  status change, reveal, turn handoff, and result. The original synthesized
  palette uses filtered sine/triangle layers and short noise texture through
  UI/combat/cinematic buses, a conservative master gain, and dynamics control;
  it creates no context before a user gesture and fails silently when audio is
  unavailable. The maintained mix contract is documented in
  `docs/phaser_audio_system.md`.
- One persistent interaction-audio service is reused across scene transitions;
  destroying a scene does not repeatedly close and recreate its AudioContext.
  Sound mute and volume, haptics, and motion mode persist under
  `jjk_arena.presentation_settings.v1`.
- Haptics use short semantic vibration patterns only after a user gesture. They
  are independently disableable and safely no-op when `navigator.vibrate` is
  absent, rejected, or unsupported.
- Combat exposes a visible `SOUND`/`MUTED` top-HUD entry. Its presentation sheet
  provides mute, volume down/up, haptics, motion mode, Close, and Exit Battle
  controls with mobile-size hit targets.
- Compact battle cards prioritize illustration, skill name, target, cost, and
  actionable disabled/queued/replacement ribbons. Classes and effect prose use
  the second-tap technique dossier instead of unreadably small card overlays.

## Mobile loading contract

- Boot loads only the splash and immediate Home environment plates. Campus,
  Map, and Rooftop are staged by their first active scene; Boot no longer
  eagerly downloads every portrait, fallback skill image, or action atlas. It
  initially requests the story trio plus the player’s saved active team.
- `BaseScene` stages missing portrait textures for the active screen. First
  Creation and Team Setup request the locked 19-person roster; Lobby, Mission,
  Result, and Combat request the currently relevant player/server teams.
- First Creation and Combat stage all five v3 skill atlases and the four family
  fallbacks after Boot. The loader deduplicates texture keys, starts Phaser’s
  loader only when work is pending, and rerenders the active scene on completion.
- A missing or failed staged asset uses the registered portrait, procedural, or
  semantic-family fallback rather than producing an empty card. A failed key is
  attempted once per scene instance so routine rerenders cannot create a retry
  loop.

The canonical component/token facade, environment allocation, exact startup
texture budgets, release-clearance status, and QA cache/version gate are
documented in `docs/phaser_asset_delivery_contract.md`. The machine-readable
sources are `web/static/assets/runtime-texture-budget.json` and
`web/static/assets/asset-clearance-manifest.json`.

The maintained environment and portrait registries are
`web/static/phaser/core/asset-registry.js` and
`web/static/phaser/core/portrait-registry.js`. Full generation prompts,
identifiers, hashes, processing, and limitations are recorded under
`web/static/assets/portraits/PROVENANCE.md`,
`web/static/assets/environments/PROVENANCE.md`,
`web/static/assets/skills/PROVENANCE.md`, and
`artifacts/ui-redesign/s3-style/PROMPTS.md`.

The maintained Phaser cache version for this structural and vocabulary pass is `v36`.

## Gameplay invariants

This is a visual contract only. Python Battle v2 remains authoritative. The
browser submits intent and renders viewer-specific state; it does not decide
legality, damage, costs, hidden information, cooldowns, duration clocks, or
victory. The exact locked 19-character First Creation roster is unchanged.
