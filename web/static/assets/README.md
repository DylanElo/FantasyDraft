# Asset Inventory

These assets support the Phaser Battle v2 shell.

| File | What it is |
|---|---|
| `portraits/culling-current/*.webp` | Exact 19-file, 600x800 Season 3 starter portrait set used by the maintained Phaser client. |
| `environments/culling-current-home-hero-v2.webp` | 853x1844 full-bleed, character-led Home composition for the structurally rebuilt lobby. |
| `environments/culling-current-rooftop-v2.webp` | 853x1844 bright rooftop battlefield used by Combat, Queue Review, and Result. |
| `environments/culling-current-{home,campus,map}.webp` | Original 773x1672 character-free plates retained for Boot, Draft/First Creation/Records, and Mission Map. |
| `skills/culling-current/{body,technique,focus,curse}.webp` | Four 418x941 semantic skill-art crops used by the Combat command cards and Queue Review deck. |

The runtime portrait source of truth is
`web/static/phaser/core/portrait-registry.js`. Generation mode, prompts, result IDs, dimensions,
hashes, and release limitations are recorded in the `PROVENANCE.md` files under
`portraits/`, `environments/`, and `skills/`.

Release and loading truth are machine-readable:

- `asset-clearance-manifest.json` labels runtime-generated,
  review-required, and prototype-only visual groups. No current group is
  commercially release-cleared.
- `runtime-texture-budget.json` records exact checkout bytes, decoded RGBA8
  estimates, cold-start caps, and the scene-deferred environment plates.

See `docs/phaser_asset_delivery_contract.md` for the canonical Season 3 UI
facade, environment staging behavior, and exact QA cache/version policy.
