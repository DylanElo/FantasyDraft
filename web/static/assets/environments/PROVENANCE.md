# Environment asset provenance

The two `culling-current-*.webp` environment plates are original, generated assets made for JJK Arena's Culling Current UI direction. They contain no characters, logos, text, or baked user-interface elements.

## Culling Current Home

- Shipping file: `culling-current-home.webp`
- Dimensions: 773 x 1672
- SHA-256: `3B85C486BAA28C739D0718AA19D7DA7648E69FB8A5773AFB2E845C52CD9C3A66`
- Created: 2026-07-17
- Generation mode: OpenAI built-in image generation
- Generated source: 941 x 1672 RGB PNG, result `exec-06b6094a-6439-455d-9964-8b40728fbd44`
- Prompt: "A luminous Japanese city avenue environment for a portrait-first mobile anime tactical game home screen, environment only. Warm ivory daylight, powder-blue sky, cobalt signage and railings, restrained vermilion and sun-gold accents, pale concrete, dynamic manga-inspired diagonal perspective, elevated train structures and dense urban detail, energetic but welcoming, premium illustrated game background, clear central space for three separate character portraits and UI overlays. No characters, no people, no faces, no text, no letters, no logos, no icons, no interface, no frames, no buttons, no dark palette, no night scene. 390x844 portrait composition."
- Post-processing: center-cropped to the target portrait aspect ratio and converted lossily to WebP for client delivery; no content was composited into the image.

## Culling Current Rooftop

- Shipping file: `culling-current-rooftop.webp`
- Dimensions: 773 x 1672
- SHA-256: `3FE076F8A66EB01F1AB347FD18EF5C1D1A94C509444806D78A5417B1D653351D`
- Created: 2026-07-17
- Generation mode: OpenAI built-in image generation
- Generated source: 941 x 1672 RGB PNG, result `exec-ecf634ef-fdbf-4632-91de-a9f3665cbdb1`
- Prompt: "A bright Japanese rooftop tactical arena environment for a portrait-first mobile anime battler, environment only. Daylight sky, warm ivory and pale concrete rooftop, cobalt structural details, restrained vermilion and electric-cyan markings, distant Tokyo-style skyline, energetic manga perspective lines, open readable central combat lane with upper and lower staging space for two teams, polished hand-painted game background, optimistic high-contrast Season-3-inspired urban energy without copying any existing artwork. No characters, no people, no faces, no text, no letters, no logos, no icons, no interface, no frames, no buttons, no dark palette, no night scene. 390x844 portrait composition."
- Post-processing: center-cropped to the target portrait aspect ratio and converted lossily to WebP for client delivery; no content was composited into the image.

Both sources were horizontally center-cropped from 941 to 773 pixels without
resizing, then encoded as lossy RGB WebP. The one-off conversion did not retain
its exact quality flag, so the current SHA-256 values—not a regeneration
recipe—identify the shipping bytes. The generator's internal model identifier
was not exposed.

These are original generated vertical-slice environment plates, not a legal or
commercial-clearance determination for final release art. The abstract roster
portraits remain separate placeholders. Exploratory images under
`artifacts/ui-redesign/concepts/` are references only and are not runtime
assets.
