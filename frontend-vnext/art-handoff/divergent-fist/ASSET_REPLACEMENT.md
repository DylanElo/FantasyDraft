# Asset replacement guide

No TypeScript inspection is required. Work from this guide and
`ASSET_MANIFEST.md`.

## 1. Destination and registration

Copy every export beneath:

```text
frontend-vnext/public/assets/combat/divergent-fist/
```

Use the exact relative path in the manifest's **Production delivery path**
column. Then add that row's **Runtime ID** to:

```text
frontend-vnext/src/prototypes/divergent-fist-lab/productionAssetIds.json
```

The JSON file is the only runtime registration edit. Keep it a JSON array of
quoted runtime IDs. The runtime automatically switches registered IDs from the
placeholder path to the production path.

## 2. Expected directory structure

```text
public/assets/combat/divergent-fist/
  yuji/          # six poses + shadow
  maki/          # seven poses + shadow
  support/       # one neutral support fighter
  environment/   # nine independent layers
  effects/       # twelve targeting/impact/damage treatments
  ui/            # ten interface treatments
```

## 3. Fighter assets

Use the 16 fighter/shadow/support rows in `ASSET_MANIFEST.md` verbatim.

- Format: WebP.
- Dimensions: encoded in each required filename, from `800×240` through
  `1600×1600`.
- Transparency: required.
- Origin and ground anchor: `(0.5,1)` for fighters; shadow uses center origin.
- Facing: Yuji right, Maki left. Never mirror either lead. Support may mirror.
- Safe area: 6%; no baked floor, UI, text, effects, or background.
- Depth: fighter shadow `0`; fighter art and parented health presentation
  `10–11`, depth-sorted by formation Y.
- Pose beats: Yuji `idle` (planning/restored), `selected`
  (selection/targeting), `anticipation`, `strike` (advance through physical
  impact), `recovery` (reactions through recovery), and `return`. Maki uses
  `idle`, `targeted`, `physical-hit`, `stagger`, `delayed-hit`, `recovery`;
  `defeated` is validation-only in this non-lethal sequence.

Preview each pose with:

```text
/prototype/divergent-fist?review=1&preset=desktop&beat=<beat>&anchors=1&labels=1
```

## 4. Environment assets

Use all nine `environment.*` rows and filenames from the manifest.

- Format: WebP.
- Dimensions: `2560×1440` for sky/city/middle/ground/barrier/foreground;
  `1920×1080` for rain/haze/lighting.
- Transparency: required except `environment.sky`, which may be opaque.
- Origin: `(0.5,0.5)`; no ground anchor.
- Facing/mirroring: neutral; mirroring allowed only when composition survives.
- Safe area: keep the central action corridor and all six formation footprints clear.
- Depths: sky `-100`, city `-90`, middle `-80`, ground `-70`, barrier `-60`,
  foreground `40`, rain `50`, haze `60`, lighting `70`.
- Used by every beat and every viewport.

Preview the full stack at planning and both impacts in every preset.

## 5. Targeting and impact effects

Use all 12 `effects.*` rows and filenames from the manifest.

- Format: WebP except the two damage-treatment SVGs.
- Dimensions: encoded in each filename; SVGs retain the manifest viewBox.
- Transparency: required.
- Origin: `(0.5,0.5)`; attachment and facing follow each manifest row.
- Mirroring: only where the row permits it.
- Safe area: 6%.
- Depth: `30`, with runtime decimal offsets preserving local stacking.
- Beats: intent/arrow/sigils at `maki-targeted` and `target-confirmed`;
  physical impact/speed lines/hit flash/physical damage at `physical-impact`;
  compression at `cursed-compression`; delayed impact/delayed damage at
  `delayed-impact`; residual energy at `recovery` and `planning-restored`.

Compression is pending energy, not damage. Damage values remain runtime text.

## 6. Shared UI assets

Use all 10 `ui.*` rows and filenames from the manifest.

- Format: WebP.
- Dimensions: encoded in each filename.
- Transparency: required except the maskable health-fill and damage-lag pixels.
- Origins: health sprites `(0,0.5)`; other UI `(0.5,0.5)`.
- Facing/mirroring: neutral; mirroring allowed.
- Safe area: 2–10% as listed per manifest row.
- Depth: `100`, except health visuals parented inside fighter containers.
- Beats: health/energy persist; selected skill at `skill-selected`; target
  confirmation at `target-confirmed`; queue actor/skill/target at `queued` and
  `resolution-start`; icon appears in selected-skill and queue treatments.

Do not bake control labels, fighter names, health values, or damage numbers.

## 7. Verify and capture

From `frontend-vnext` run:

```powershell
npm run audit:divergent-fist-art
npm test -- --run
npm run build
```

The art audit lists missing files, warnings, remaining placeholders, and final
production readiness. It verifies exact filenames, dimensions, encoded alpha,
registry agreement, distinct poses, inventory counts, origins, and anchors.

For QA, open artist review mode at each preset and capture the canvas only:

```text
?review=1&preset=desktop&beat=<beat>
?review=1&preset=laptop&beat=<beat>
?review=1&preset=mobile&beat=<beat>
```

Repeat with `debug=1`, then compare the clean capture against `references/`.
