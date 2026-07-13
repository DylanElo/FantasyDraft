# Combat UI Redesign Handoff

## Scope

This pass redesigns and implements the maintained Phaser combat interface. It does not change Battle v2 combat rules, roster data, socket contracts, server authority, energy calculations, targeting legality, cooldown behavior, or queue semantics.

The design target is an environment-integrated, portrait-first mobile battlefield rather than a stack of dashboard panels. The first location is an original rain-darkened municipal underpass adjoining an old school courtyard, partially distorted by cursed residue.

## Runtime path

- App/server entry point: `run_server.py`
- Flask-SocketIO bridge and security policy: `web/app.py`
- Phaser shell/runtime: `web/static/phaser-shell.js`
- Combat renderer: `web/static/phaser/scenes/combat-scene.js`
- Queue Review renderer: `web/static/phaser/scenes/combat-queue-review-scene.js`
- Asset loading: `web/static/phaser/scenes/boot-scene.js`
- Shared visual tokens: `web/static/phaser-design-tokens.js`
- Battle rules/state authority: `jjk_arena/battle_v2/`

## Structural changes

### World layer

- Added a full-height authored environment with recognizable underpass, school, stair, fence, wet ground, practical lamp, rain, reflected light, mist, and restrained cursed fissures.
- Kept the environment visible through local contrast grading rather than a single opaque full-screen panel.
- Added restrained rain and domain residue in Phaser so the location remains spatially alive without obscuring state.

### Narrative layer

- Added a location/time/weather header and battlefield-language labels such as hostile signatures, tactical directive, orders, and resolution order.
- Used angular dossier geometry, targeting brackets, queue markers, and cursed seams instead of generic rounded application cards.

### Interaction layer

- Replaced six floating circular tokens with rectangular, world-anchored combatant dossier plates.
- Added compact HP/status/selected/queued/legal-target information to each plate.
- Rebuilt the top HUD as an angular location/turn/energy strip with queue state and exit access.
- Rebuilt the lower command dock around the selected combatant, technique identity, availability, cost, disabled inspection, and one clear Review action.
- Rebuilt Queue Review as a tactical resolution sheet that keeps the battlefield visible and preserves action order, target details, Wild payment, cancel/back, and confirmation controls.
- Preserved the public GameStore interactions and authoritative server validation.

## Files changed or added

### Application implementation

- `web/static/phaser/scenes/combat-scene.js`
- `web/static/phaser/scenes/combat-queue-review-scene.js`
- `web/static/phaser/scenes/boot-scene.js`
- `web/static/phaser-design-tokens.js`
- `web/templates/index.html`
- `web/app.py`

### New assets and tools

- `web/static/assets/environments/underpass-courtyard-night.png`
- `tools/generate_underpass_environment.py`
- `tools/capture_combat_redesign.py`
- `artifacts/ui-redesign/`

## Asset provenance and readiness

### Existing assets reused

- Existing First Creation portrait SVGs in `web/static/assets/portraits/`.
- Existing Phaser runtime, interaction logic, energy colors, state store, and combat data.

### Newly created in this pass

- `underpass-courtyard-night.png`, generated locally from original procedural drawing code in `tools/generate_underpass_environment.py`.
- All combat layout, dossier, HUD, targeting, dock, and queue-review rendering in Phaser.
- Visual QA capture and hit-target reporting script.

### Temporary production-intent assets

- The underpass environment is an original, self-contained production-intent placeholder. It establishes composition, depth, palette, and implementation requirements, but a final commercial release should replace or professionally repaint it with approved art-direction and provenance.
- The current portrait SVG set remains placeholder/working game art. The interface supports taller card crops, but final character illustration should be produced or licensed separately.

### Production-ready implementation elements

- Responsive layout rules and touch-target geometry.
- World/UI layering architecture.
- Selection, targeting, disabled, queued, and queue-review state treatments.
- Asset registration and fallback rendering.
- Google Fonts integration and declared fallback stacks.
- Visual QA automation.

## Fonts

The project continues to load Shippori Mincho B1, Zen Kaku Gothic New, and IBM Plex Mono from Google Fonts. Local font binaries are not bundled. The declared fallbacks keep the game usable when the CDN is unavailable; self-hosting can be added later after obtaining the actual licensed binaries.

## Run locally

From the project root:

```bash
python -m pip install -r requirements.txt
python run_server.py
```

Open `http://127.0.0.1:5000`.

For the development test dependencies:

```bash
python -m pip install -r requirements-dev.txt
```

## Regenerate the environment

```bash
python tools/generate_underpass_environment.py
```

The generator is deterministic and overwrites:

`web/static/assets/environments/underpass-courtyard-night.png`

## Capture the combat QA suite

With the local server running:

```bash
python tools/capture_combat_redesign.py --base-url http://127.0.0.1:5000
```

The script drives the real GameStore and captures the live Phaser canvas at 360x800, 390x844, and 430x932, plus the required combat interaction states. It also reports touch targets below 44px and hit regions outside the viewport.

## Verification completed

- `tests/test_production_readiness.py`: 8 passed.
- Remaining pytest suite in a clean process: 281 passed, 1 skipped.
- The monolithic pytest invocation produced 288 passed, 1 skipped, and one order-dependent production-readiness failure caused by leaked global runtime state. The identical failure reproduces in the untouched source archive; the test passes alone and the complete suite passes when split into isolated processes.
- Changed JavaScript passed `node --check`.
- Python sources passed compilation.
- `git diff --check` passed.
- Live browser QA passed at 360x800, 390x844, and 430x932.
- Live hit-target report found zero controls below 44x44 and zero controls outside each viewport.
- Final browser console contained the Phaser startup banner only; no warnings or errors were recorded.

## Known limitations and external validation

- Final commercial environment and character art still need approved human art direction, production painting, licensing/provenance review, and optimization.
- The current environment PNG is approximately 1.5 MB and should be converted to an appropriate production texture format after the final art pipeline is chosen.
- Google Fonts require network access unless the font binaries are later self-hosted.
- Physical iOS/Android device testing, assistive-technology review, localization stress, and reduced-motion user testing remain external validation work.
- The exit control retains the existing return-to-lobby behavior; it is not a new pause-system mechanic.
