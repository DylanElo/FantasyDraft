# Divergent Fist art handoff

Produce the finished art package for **Yuji Itadori using Divergent Fist on
Maki Zenin**. The engineering scaffold, composition, formation, choreography,
timing direction, and asset slots are approved and frozen.

## Reference source

- Figma: <https://www.figma.com/design/GHFdjoR7g0eIYgqsUWBf9a>
- Desktop nodes: `1:3`, `2:3`, `2:125`, `2:259`, `3:3`, `3:122`, `3:243`
- Mobile node: `1:4`
- Exact review frames: `1440×900`, `1280×720`, and `844×390`
- Runtime preview: `/prototype/divergent-fist?review=1&preset=desktop&beat=planning`
- Exact filenames and technical metadata: `ASSET_MANIFEST.md`
- Integration steps: `ASSET_REPLACEMENT.md`

## Required production groups

- Yuji poses
- Maki poses and reactions
- layered urban battlefield
- target intent treatment
- target sigil
- physical impact
- cursed-energy compression
- delayed impact
- health treatment
- damage-number treatment
- Divergent Fist icon

## Do not change

- fighter formation or character ground anchors
- actor-target relationship
- two-hit mechanic or the physical-versus-cursed impact distinction
- mobile framing
- transparent-background requirements
- filenames without engineering coordination

## You may improve

Silhouette, anatomy, pose strength, costume detail, lighting, ink work,
hatching, environmental storytelling, atmospheric depth, cursed-energy
texture, impact composition, and character-specific graphic language.

## Visual target

The finished result should feel cinematic, dangerous, urban, ritualistic,
grounded, character-driven, consistent with the established Season 3 visual
direction, and integrated into one coherent world.

Avoid opaque poster rectangles, embedded backgrounds inside character art,
generic red-bordered UI, random grunge, neon sci-fi styling, flat dashboard
presentation, and excessive visual noise.

## Artist Delivery Checklist

- [ ] Review every listed Figma node and all three exact viewport references.
- [ ] Deliver all 47 filenames from `ASSET_MANIFEST.md` in the documented tree.
- [ ] Keep Yuji facing right and Maki facing left; do not mirror either lead.
- [ ] Keep fighter canvases transparent with bottom-center `(0.5,1)` anchors.
- [ ] Deliver all nine environment layers separately; only sky may be opaque.
- [ ] Keep physical, compression, and delayed effects visually distinct.
- [ ] Keep damage values as runtime text; do not bake `−20` or `−10` into art.
- [ ] Supply editable sources, flattened runtime exports, color profile, and
      provenance/licensing notes.
- [ ] Follow `ASSET_REPLACEMENT.md`, then run
      `npm run audit:divergent-fist-art`.
- [ ] Capture clean and debug QA at 1440×900, 1280×720, and 844×390.
- [ ] Obtain visual and rights approval before marking the drop production-ready.

## Known technical constraints

- Phaser loads the exact registered filename; renames require coordination.
- Runtime text and accessible controls remain code-owned.
- Camera framing is deterministic per beat and must not be compensated for in art.
- One source may serve all viewports only when it survives every reference crop.
- Production WebP transparency is checked from the encoded alpha declaration.
- The laboratory is a presentation scaffold, not the live Battle v2 client.
