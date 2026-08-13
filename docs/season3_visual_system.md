# Incident Cut visual system

Status: implemented maintained-client direction, 2026-08-02.
Illustration grammar superseded 2026-08-12 — see the correction notice below.

> ## ⚠ Illustration direction correction (2026-08-12)
>
> **The ink-hatch illustration grammar previously described in this document was
> rejected by the user on 2026-08-02 and must not be regenerated.**
>
> That grammar — hand-inked cross-hatch texture, flat hard-edge cel shadow, and
> comic-panel framing — was inferred from this document's own wording rather
> than researched against the aired anime. Research on 2026-08-02 into the real
> Jujutsu Kaisen Season 3 (Culling Game arc, MAPPA, dir. Shōta Goshozono)
> established the actual direction, and the user confirmed it as:
> **"cinematic/painterly, mood-graded color, no ink hatching."**
>
> The corrected illustration grammar is in [Visual grammar](#visual-grammar)
> below. Two consequences for anyone picking this work up:
>
> - **The generation prompts recorded in `web/static/assets/*/PROVENANCE.md`
>   describe the rejected pass.** Do not copy them for new art "for
>   consistency". They are retained as lineage, not as a template.
> - **The corrected direction has never been rendered.** Scenario's free-tier
>   generation cap was reached immediately after the corrected prompt was
>   written, before it could be tested, and the prompt was not persisted. It
>   must be rebuilt and test-rendered on a small sample before committing to a
>   19-character roster regeneration.
>
> **Scope of this correction:** it governs generated *illustration* — character
> portraits, environment plates, and skill/effect art. It does not by itself
> change the UI chrome rules in [UI contract](#ui-contract), which still specify
> thick ink borders and sparse hatching on panels. Whether the chrome should
> follow the illustration away from hatching is an open question for the user
> and has deliberately not been decided here.

This document defines the visual source of truth for the maintained Phaser
client. `Incident Cut` is the internal implementation codename and supersedes
the earlier Culling Current screen compositions. The semantic palette, asset
provenance, accessibility, viewer privacy, and server-authority rules remain.
The
player-facing game is not renamed, the starter era is not changed, and the
visual direction does not unlock Culling Game characters or alter progression.

## Direction

Every visible screen, character illustration, environment, transition, VFX
layer, and routine UI surface belongs to one coherent environment-first
editorial system. Navigation behaves like authored scene changes; selection
stages a fighter; targeting draws barrier geometry; the queue reads as a
left-to-right three-shot storyboard; resolution retracts commands; and Results
lands as an episode-ending title card.

The game uses fresh generated or appropriately licensed compositions. Do not
paste, trace, or regenerate official frames, key visuals, manga panels, logos,
poses, or typography. “Season 3” describes the visual grammar, not permission
to ship unlicensed source art.

## Visual grammar

Corrected 2026-08-12. This section governs generated illustration.

- **Painterly MAPPA-house digital cel-shading.** Soft, controlled light falloff
  and blended tonal transitions. **No hand-inked hatch texture, no cross-hatch
  stress marks, no raw pencil grain on the artwork itself.** Contours are clean
  and confident rather than scratchy.
- **Cinematic camera and shot composition.** Real lens logic — depth of field,
  considered focal length, dramatic and occasionally off-kilter angles. The
  reference point is film cinematography, not flat manga-panel framing.
- **Mood-graded colour that shifts per scene, location, and emotional beat.**
  This is the largest departure from the previous grammar: a single rigid
  palette must not be applied uniformly to every illustration. The semantic
  palette below still governs *interface state*; it does not flatten the art.
- **Painted urban depth** with a photographic sense of architecture, weather,
  and perspective.
- **Psychological unease as undertone, not horror.** Symbolic, slightly
  off-kilter, art-referencing composition. Restraint over gore or darkness.
- **High-end blended 2D/3D polish.** Smooth, film-quality finish.
- Stark black/red danger frames remain brief punctuation for damage, Domains,
  and finishers; ordinary navigation is not a near-black dashboard.

Interface chrome is specified separately in [UI contract](#ui-contract) and is
not changed by this correction.

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

**Scope (clarified 2026-08-12).** This table is the *interface* palette: it
governs UI chrome, state colour, and semantic meaning, and it stays locked.
It is **not** a uniform grade to be applied across every illustration. Per the
correction above, generated art is mood-graded per scene, location, and beat.
Art and interface should stay in the same family and remain readable together,
but an environment plate is not required to match these hex values.

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

## Shipped composition contract

- Home is a full-screen trio staging scene with an edge navigation rail and a
  contextual Deploy mode cut. It has no feature-card grid or bottom app bar.
- First Creation and Team Setup share a featured-fighter browser and the same
  authoritative Character Study treatment.
- Mission nodes live directly on the painted route map.
- Matchup is a diagonal confrontation with layered trios; unrevealed PvP
  opponents remain sealed.
- Combat reserves at least 55% of the mobile frame for the stage. HUD, four
  technique cuts, storyboard, and next action stay within approximately 35%.
- Queue Review expands across the lower 35% while the battlefield remains
  visible. Results and Records use outcome/reel compositions, not dashboards.

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
| `culling-current-home.webp` | Boot, Home |
| `culling-current-home-hero-v2.webp` | Retained prototype plate; not loaded at runtime |
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
older `skill-action-atlas-v2.png` binary was removed; its provenance document
retains the lineage. The earlier internal `body`, `technique`, `focus`,
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

The maintained Phaser cache version for this Incident Cut pass is `v58`.

## Gameplay invariants

This is a visual contract only. Python Battle v2 remains authoritative. The
browser submits intent and renders viewer-specific state; it does not decide
legality, damage, costs, hidden information, cooldowns, duration clocks, or
victory. The exact locked 19-character First Creation roster is unchanged.
