# Divergent Fist laboratory — runtime asset manifest

Status: approved choreography blocking, ready for human art production. Every row is mounted by `/prototype/divergent-fist`; every current SVG remains a temporary placeholder. The exact runtime registry is `src/prototypes/divergent-fist-lab/assetManifest.ts`. After copying a validated drop, list its runtime IDs in `src/prototypes/divergent-fist-lab/productionAssetIds.json`, then run `npm run audit:divergent-fist-art`. The focused registry test remains `npm run audit:divergent-fist`.

## Shared contract

- Review frames: desktop `1440×900`, desktop `1280×720`, and mobile landscape `844×390`.
- Fighter canvases: transparent, stable canvas and bottom-center ground anchor `(0.5,1)`, 6% safe area, no baked floor/UI/text/background.
- World effects: transparent, center origin `(0.5,0.5)`, 6% safe area, no baked damage values.
- Environment and interface layers use center origin unless a row says otherwise.
- Yuji is authored facing right; Maki is authored facing left. Neither primary fighter may be mirrored. Support blocking may mirror.
- Desktop and mobile columns are requirements, not optional alternate concepts. Use one source when it survives both; supply a separate crop only when explicitly approved.

## Render order

| Depth | Layer |
|---:|---|
| -100 | Background sky |
| -90 | Distant city |
| -80 | Middle-ground architecture |
| -70 | Battlefield ground |
| -60 | Barrier geometry |
| 0 | Fighter shadow child |
| 10–11 | Fighters, depth-sorted by formation Y; health presentation is parented inside each fighter |
| 30 | World-space targeting, impact, and damage effects |
| 40 | Foreground environment |
| 50 | Rain |
| 60 | Atmospheric haze |
| 70 | Lighting/color overlay |
| 100 | Laboratory UI |
| 200 | Development/review debug overlays |

## Fighter assets

All rows: mounted `yes`, transparent `yes`, origin/ground `(0.5,1)`, safe area `6%`, desktop `full silhouette readable`, mobile `full silhouette readable without clipping`, status `placeholder / production required`.

| Runtime ID | Current exact path | Production delivery path | Depth | Recommended size | Facing / mirror | Attachments | Placeholder |
|---|---|---|---:|---:|---|---|---|
| `yuji.idle` | `public/assets/combat/divergent-fist/yuji/idle.svg` | `yuji/idle-1200x1600.webp` | 10 | 1200×1600 | right / no | lead fist | `yuji/idle.svg` |
| `yuji.selected` | `public/assets/combat/divergent-fist/yuji/selected.svg` | `yuji/selected-1200x1600.webp` | 10 | 1200×1600 | right / no | lead fist | `yuji/selected.svg` |
| `yuji.anticipation` | `public/assets/combat/divergent-fist/yuji/anticipation.svg` | `yuji/anticipation-1200x1600.webp` | 10 | 1200×1600 | right / no | lead fist | `yuji/anticipation.svg` |
| `yuji.strike` | `public/assets/combat/divergent-fist/yuji/strike.svg` | `yuji/strike-1600x1600.webp` | 10 | 1600×1600 | right / no | contact point | `yuji/strike.svg` |
| `yuji.recovery` | `public/assets/combat/divergent-fist/yuji/recovery.svg` | `yuji/recovery-1200x1600.webp` | 10 | 1200×1600 | right / no | lead fist | `yuji/recovery.svg` |
| `yuji.return` | `public/assets/combat/divergent-fist/yuji/return.svg` | `yuji/return-1200x1600.webp` | 10 | 1200×1600 | right / no | none | `yuji/return.svg` |
| `maki.idle` | `public/assets/combat/divergent-fist/maki/idle.svg` | `maki/idle-1200x1600.webp` | 10 | 1200×1600 | left / no | torso effect | `maki/idle.svg` |
| `maki.targeted` | `public/assets/combat/divergent-fist/maki/targeted.svg` | `maki/targeted-1200x1600.webp` | 10 | 1200×1600 | left / no | target ground, torso | `maki/targeted.svg` |
| `maki.physical-hit` | `public/assets/combat/divergent-fist/maki/physical-hit.svg` | `maki/physical-hit-1400x1600.webp` | 10 | 1400×1600 | left / no | physical contact | `maki/physical-hit.svg` |
| `maki.stagger` | `public/assets/combat/divergent-fist/maki/stagger.svg` | `maki/stagger-1400x1600.webp` | 10 | 1400×1600 | left / no | torso effect | `maki/stagger.svg` |
| `maki.delayed-hit` | `public/assets/combat/divergent-fist/maki/delayed-hit.svg` | `maki/delayed-hit-1400x1600.webp` | 10 | 1400×1600 | left / no | torso effect | `maki/delayed-hit.svg` |
| `maki.recovery` | `public/assets/combat/divergent-fist/maki/recovery.svg` | `maki/recovery-1200x1600.webp` | 10 | 1200×1600 | left / no | none | `maki/recovery.svg` |
| `maki.defeated` | `public/assets/combat/divergent-fist/maki/defeated.svg` | `maki/defeated-1400x1600.webp` | 10 | 1400×1600 | left / no | ground contact | `maki/defeated.svg` |
| `yuji.shadow` | `public/assets/combat/divergent-fist/placeholders/shadow.svg` | `yuji/shadow-800x240.webp` | 0 | 800×240 | neutral / yes | fighter ground | `placeholders/shadow.svg` |
| `maki.shadow` | `public/assets/combat/divergent-fist/placeholders/shadow.svg` | `maki/shadow-800x240.webp` | 0 | 800×240 | neutral / yes | fighter ground | `placeholders/shadow.svg` |
| `support.fighter` | `public/assets/combat/divergent-fist/placeholders/support-silhouette.svg` | `support/support-fighter-1200x1600.webp` | 10 | 1200×1600 | right / yes | ground | `placeholders/support-silhouette.svg` |

Physical-hit and delayed-hit must differ in body silhouette, force direction, and reaction shape—not only color. The defeated pose is mounted in the pose controller for asset validation but is not selected by this non-lethal 30-damage sequence.

## Environment assets

All rows: mounted `yes`, origin `(0.5,0.5)`, facing `neutral`, mirror `yes`, safe area `keep central actor corridor and six formation footprints clear`, desktop `cover 1440×900 and 1280×720`, mobile `cover 844×390 without uniform desktop shrink`, status `placeholder / production required`.

| Runtime ID | Current exact path | Production delivery path | Depth | Recommended size | Transparency | Placeholder |
|---|---|---|---:|---:|---|---|
| `environment.sky` | `public/assets/combat/divergent-fist/environment/sky.svg` | `environment/sky-2560x1440.webp` | -100 | 2560×1440 | opaque allowed | `environment/sky.svg` |
| `environment.city` | `public/assets/combat/divergent-fist/environment/city.svg` | `environment/city-distant-2560x1440.webp` | -90 | 2560×1440 | transparent | `environment/city.svg` |
| `environment.middle` | `public/assets/combat/divergent-fist/environment/middle.svg` | `environment/architecture-middle-2560x1440.webp` | -80 | 2560×1440 | transparent | `environment/middle.svg` |
| `environment.ground` | `public/assets/combat/divergent-fist/environment/ground.svg` | `environment/battle-ground-2560x1440.webp` | -70 | 2560×1440 | transparent | `environment/ground.svg` |
| `environment.barrier` | `public/assets/combat/divergent-fist/environment/barrier.svg` | `environment/barrier-2560x1440.webp` | -60 | 2560×1440 | transparent | `environment/barrier.svg` |
| `environment.foreground` | `public/assets/combat/divergent-fist/environment/foreground.svg` | `environment/foreground-2560x1440.webp` | 40 | 2560×1440 | transparent | `environment/foreground.svg` |
| `environment.rain` | `public/assets/combat/divergent-fist/environment/rain.svg` | `environment/rain-1920x1080.webp` | 50 | 1920×1080 | transparent | `environment/rain.svg` |
| `environment.haze` | `public/assets/combat/divergent-fist/environment/haze.svg` | `environment/haze-1920x1080.webp` | 60 | 1920×1080 | transparent | `environment/haze.svg` |
| `environment.lighting` | `public/assets/combat/divergent-fist/environment/lighting.svg` | `environment/lighting-1920x1080.webp` | 70 | 1920×1080 | transparent | `environment/lighting.svg` |

## World-space effects

All rows: mounted `yes`, depth `30` (minor decimal offsets preserve local stacking), transparent `yes`, origin `(0.5,0.5)`, ground anchor `not applicable`, safe area `6%`, desktop/mobile `readable at all three review frames`, status `placeholder / production required`.

| Runtime ID | Current exact path | Production delivery path | Recommended size | Facing / mirror | Attachment | Placeholder |
|---|---|---|---:|---|---|---|
| `effects.intent-arc` | `public/assets/combat/divergent-fist/effects/intent-arc.svg` | `effects/intent-arc-1600x600.webp` | 1600×600 | right / reversed team only | Yuji fist → Maki torso | `effects/intent-arc.svg` |
| `effects.arrow-endpoint` | `public/assets/combat/divergent-fist/effects/arrow-endpoint.svg` | `effects/arrow-endpoint-256x256.webp` | 256×256 | right / reversed team only | Maki torso endpoint | `effects/arrow-endpoint.svg` |
| `effects.target-sigil-outer` | `public/assets/combat/divergent-fist/effects/target-sigil-outer.svg` | `effects/target-sigil-outer-800x400.webp` | 800×400 | neutral / yes | Maki ground target | `effects/target-sigil-outer.svg` |
| `effects.target-sigil-inner` | `public/assets/combat/divergent-fist/effects/target-sigil-inner.svg` | `effects/target-sigil-inner-800x400.webp` | 800×400 | neutral / yes | Maki ground target | `effects/target-sigil-inner.svg` |
| `effects.physical-impact` | `public/assets/combat/divergent-fist/effects/physical-impact.svg` | `effects/physical-impact-1024x1024.webp` | 1024×1024 | right / optional | physical contact | `effects/physical-impact.svg` |
| `effects.physical-speed-lines` | `public/assets/combat/divergent-fist/effects/physical-speed-lines.svg` | `effects/physical-speed-lines-1024x512.webp` | 1024×512 | right / optional | behind physical contact | `effects/physical-speed-lines.svg` |
| `effects.physical-hit-flash` | `public/assets/combat/divergent-fist/effects/physical-hit-flash.svg` | `effects/physical-hit-flash-1024x1024.webp` | 1024×1024 | neutral / yes | physical contact | `effects/physical-hit-flash.svg` |
| `effects.cursed-compression` | `public/assets/combat/divergent-fist/effects/cursed-compression.svg` | `effects/cursed-compression-1024x1024.webp` | 1024×1024 | radial / yes | Maki torso | `effects/cursed-compression.svg` |
| `effects.delayed-impact` | `public/assets/combat/divergent-fist/effects/delayed-impact.svg` | `effects/delayed-impact-1024x1024.webp` | 1024×1024 | radial / yes | Maki torso | `effects/delayed-impact.svg` |
| `effects.residual-energy` | `public/assets/combat/divergent-fist/effects/residual-energy.svg` | `effects/residual-energy-1024x1024.webp` | 1024×1024 | radial / yes | Maki torso | `effects/residual-energy.svg` |
| `effects.physical-damage` | `public/assets/combat/divergent-fist/effects/damage-physical.svg` | `effects/damage-physical-treatment.svg` | vector | neutral / yes | behind runtime `−20` | `effects/damage-physical.svg` |
| `effects.delayed-damage` | `public/assets/combat/divergent-fist/effects/damage-delayed.svg` | `effects/damage-delayed-treatment.svg` | vector | neutral / yes | behind runtime `−10` | `effects/damage-delayed.svg` |

Damage numbers remain runtime text. Compression is a pending-energy beat and must contain no damage number.

## Shared interface assets

All rows: mounted `yes`, depth `100` or parented fighter child, desktop/mobile `readable at all three review frames`, status `placeholder / production required`.

| Runtime ID | Current exact path | Production delivery path | Recommended size | Transparency | Origin | Safe area / attachment | Placeholder |
|---|---|---|---:|---|---|---|---|
| `ui.health-track` | `public/assets/combat/divergent-fist/ui/health-track.svg` | `ui/health-track-512x96.webp` | 512×96 | transparent | `(0,.5)` | 8%; fighter container | `ui/health-track.svg` |
| `ui.health-fill` | `public/assets/combat/divergent-fist/ui/health-fill.svg` | `ui/health-fill-512x64.webp` | 512×64 | opaque fill allowed inside maskable sprite | `(0,.5)` | 2%; fighter container | `ui/health-fill.svg` |
| `ui.damage-lag` | `public/assets/combat/divergent-fist/ui/damage-lag.svg` | `ui/damage-lag-512x64.webp` | 512×64 | opaque fill allowed inside maskable sprite | `(0,.5)` | 2%; fighter container | `ui/damage-lag.svg` |
| `ui.energy-pips` | `public/assets/combat/divergent-fist/ui/energy-pips.svg` | `ui/energy-pips-512x128.webp` | 512×128 | transparent | `(.5,.5)` | 8%; top HUD | `ui/energy-pips.svg` |
| `ui.queue-actor` | `public/assets/combat/divergent-fist/ui/queue-actor.svg` | `ui/queue-actor-256x192.webp` | 256×192 | transparent | `(.5,.5)` | 8%; queue actor slot | `ui/queue-actor.svg` |
| `ui.queue-skill` | `public/assets/combat/divergent-fist/ui/queue-skill.svg` | `ui/queue-skill-256x192.webp` | 256×192 | transparent | `(.5,.5)` | 8%; queue skill slot | `ui/queue-skill.svg` |
| `ui.queue-target` | `public/assets/combat/divergent-fist/ui/queue-target.svg` | `ui/queue-target-256x192.webp` | 256×192 | transparent | `(.5,.5)` | 8%; queue target slot | `ui/queue-target.svg` |
| `ui.confirm` | `public/assets/combat/divergent-fist/ui/confirm.svg` | `ui/confirm-640x192.webp` | 640×192 | transparent | `(.5,.5)` | 10%; target-confirmed state | `ui/confirm.svg` |
| `ui.skill-icon` | `public/assets/combat/divergent-fist/effects/skill-icon.svg` | `ui/divergent-fist-icon-512x512.webp` | 512×512 | transparent | `(.5,.5)` | 10%; selected skill and queue | `effects/skill-icon.svg` |
| `ui.selected-skill` | `public/assets/combat/divergent-fist/ui/selected-skill.svg` | `ui/selected-skill-768x192.webp` | 768×192 | transparent | `(.5,.5)` | 8%; selected-skill frame | `ui/selected-skill.svg` |

Interface facing is neutral and mirroring is allowed. Runtime DOM retains accessible control labels, focus behavior, and announcements; art never bakes interaction text.

## Artist Delivery Checklist

- [ ] Review Figma file `GHFdjoR7g0eIYgqsUWBf9a`: nodes `1:3`, `2:3`, `2:125`, `2:259`, `3:3`, `3:122`, `3:243`, and mobile `1:4`.
- [ ] Deliver the 13 distinct fighter pose files listed above plus Yuji and Maki shadows on consistent transparent canvases and pivots.
- [ ] Deliver the support-fighter replacement or explicitly approve retaining a neutral blocking silhouette for non-focus actors.
- [ ] Deliver all nine separate environment layers. Only the sky may be opaque; do not bake fighters, effects, UI, labels, or damage into any layer.
- [ ] Deliver all 12 effect files. Keep physical, compression, and delayed reads separate; compression must not imply damage.
- [ ] Deliver all 10 interface files. Health fill and damage-lag fill must remain independently maskable; all interaction text stays runtime-rendered.
- [ ] Preserve every filename, origin, ground anchor, facing rule, attachment point, and safe area in this manifest, or request a contract review before export.
- [ ] Test each export in artist-review mode at `1440×900`, `1280×720`, and `844×390`, with asset IDs and anchors enabled, then export one clean frame per required beat.
- [ ] Supply editable source files, flattened runtime exports, color profile, dimensions, and a licensing/provenance record for every final asset.
- [ ] Obtain visual and rights approval before changing registry status from `placeholder` to `production`.
- [ ] Run `npm run audit:divergent-fist-art`; do not call the drop ready unless it exits successfully with zero missing, invalid, or placeholder assets.
