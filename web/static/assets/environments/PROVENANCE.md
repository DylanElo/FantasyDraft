# Season 3 environment provenance

The four original `culling-current-{home,rooftop,campus,map}.webp` files are
generated environment plates created on 2026-07-18 with OpenAI built-in image
generation.
They contain no characters, logos, text, or baked interface. Official anime
frames, manga panels, key visuals, and downloaded references were not supplied
to the generator. The only image input was the project’s original generated
master visual-system board documented in
`artifacts/ui-redesign/s3-style/PROMPTS.md`.

All shipping plates are 773 x 1672 RGB WebP, resized with Pillow LANCZOS
resampling and encoded at quality 88, method 6. No characters or UI were
composited during post-processing.

The checkout independently verifies the four shipping filenames, dimensions,
and hashes below. The generated source PNGs and generator session logs are not
committed, so result IDs, source dimensions, and input-history statements are
contemporaneous production records rather than facts reconstructable from the
shipping files alone.

| Screen use | Shipping file | Generated source | Result | SHA-256 |
|---|---|---|---|---|
| Home / Boot | `culling-current-home.webp` | 852 x 1846 PNG | `exec-a85ade70-ec45-4e2d-845e-37a95a7e7201` | `B10F447B9EE20BE99D97CF334DABE3B66D4531DA1C9DC83900E24AC0D93C54E3` |
| Combat / Queue Review / Result | `culling-current-rooftop.webp` | 853 x 1844 PNG | `exec-f546d2cb-70c6-49e6-b4e8-e6b7f693931d` | `5001A838D2D3B6BCEDC781AF1E606E2257068C53EB2B1EA1C35043384B7B4035` |
| Draft / First Creation / Records | `culling-current-campus.webp` | 853 x 1844 PNG | `exec-530751dd-a2ff-4462-89f5-a7bb29cf11fa` | `AF8FA45F3BB5111913A2650780A31F6A91CF887BDE6D8772076BC4245FC1724C` |
| Mission Map | `culling-current-map.webp` | 852 x 1846 PNG | `exec-1fe5e62e-e192-4965-83be-fb96b273cd39` | `04FD16C8B2FC382DC4B27B73BD55A6A0F2E58F07101B3FFAF5DBB4210A623171` |

## Shared generation prompt

> Use case: stylized-concept. Asset type: final full-screen runtime environment
> plate for a portrait-first Jujutsu Kaisen tactical mobile game at the visual
> proportion of 390x844. Input image 1 is the internally generated Season-3
> master visual system. Follow only its sharp inked architectural edges, raw
> hatch/brush texture, flat high-contrast shadow masses, storm-ochre and
> bone-gray city grade, barrier-red geometry, selective curse-cyan light,
> photographic-feeling city depth, and production finish. Do not copy its
> composition, characters, or UI. Style/medium: unmistakable Jujutsu Kaisen
> Season 3 Culling Game anime background language in a fresh original location;
> hand-painted anime environment with realistic urban detail, hard cel-shadow
> shapes, selective rough ink marks, aggressive editorial diagonals; no glossy
> concept-art airbrush and no 3D game render. Composition/framing: full-bleed
> portrait 390x844 proportion, no device frame, layered foreground/midground/
> depth, large practical negative-space zones for mobile UI, strong vertical
> read, important architecture kept away from outer 6% crop safety. Lighting/
> mood: tense post-Shibuya daylight, luminous storm-ochre clouds, cold concrete,
> hard directional light, sparse barrier-red lines, small curse-cyan
> reflections; mostly visible/readable rather than black night. Constraints:
> environment only, no people, faces, bodies, silhouettes, creatures, text,
> letters, numbers, logos, signs, watermark, border, device, official location,
> copied frame, cyberpunk, full darkness, gore, or destruction blocking UI.

## Plate-specific direction

- Home: an elevated Tokyo-colony transit plaza with rail spans, wet pale
  pavement, distant city depth, a broad center/lower control zone, and one red
  barrier beam.
- Rooftop: a high-rise arena with cracked bone-gray concrete, parapets, water
  tanks, a calm open combat lane, red boundary lines, and sparse cyan residue.
- Campus: a technical-school courtyard combining a traditional roof, modern
  concrete, winter trees, covered walkway, open sky, and a calm lower half.
- Map: an oblique aerial Tokyo grid of rivers, rail, and towers with ten
  abstract red-thread colony zones, a pale central corridor, and no labels.

## Structural-rewrite assets

The Home and Combat structures were rebuilt again on 2026-07-18 after the user
rejected the first production slice as a reskin of the previous hierarchy. The
two additional built-in image-generation results below replace the runtime Home
and rooftop compositions while leaving the original Boot, Campus, and Map
plates intact.

Reference inputs are documented explicitly because these calls were not
text-only. The Home call used the user-supplied
`codex-clipboard-a768cd59-39e5-4dcb-b86a-df4860045e20.png`; the rooftop call
used `codex-clipboard-1bd9d821-45ff-4357-92e9-156e8c9ddfe7.png`. Both contain
franchise characters, interface, typography, and card art. They were supplied
to the generator only as composition, hierarchy, lighting, and spatial
references, with instructions not to reproduce their interface, text, logos,
labels, icons, or card frames. The Home call also received the project's
existing generated `yuji-itadori.webp`, `megumi-fushiguro.webp`, and
`nobara-kugisaki.webp` portrait assets as identity/costume references. The
reference screenshots are not runtime assets.

| Screen use | Shipping file | Generated source | Result | Source SHA-256 | Shipping SHA-256 |
|---|---|---|---|---|---|
| Home | `culling-current-home-hero-v2.webp` | 853 x 1844 PNG, 2,906,926 bytes | `exec-2ee0c959-5ace-44bd-8ba2-dafc80bc9538` | `405C2942EE8D440364F9A3B03ADAF6E5BFCD6548D55DB2A39138EE93F1DC95A4` | `41513447825E80CC2ACE9ED7928BA98B10A480E7C0676D51C53A366AFBCDA2AA` |
| Combat / Queue Review / Result | `culling-current-rooftop-v2.webp` | 853 x 1844 PNG, 2,681,141 bytes | `exec-c2d72c9e-ed9c-476f-a18b-be2d9956224a` | `44155BF2C1C660EC281B88EF67EB3118A39E4A7304EE97A9971D7F1CF175EF96` | `99FD743EDF98F163BE2890CF23BF2A25C8C9F63816E8F8175CFE2770447C37AD` |

Both sources were converted at their generated dimensions to RGB WebP; no
resize, interface compositing, typography, or post-generation character
compositing was applied. The shipping files are 472,224 and 414,092 bytes,
respectively. Source PNGs remain in the local built-in generation output and
are not committed.

### Exact Home hero revised prompt

> Use case: stylized-concept
>
> Asset type: full-screen 9:16 portrait mobile game Home hero background
>
> Input images: Image 1 is composition and hierarchy reference only—do not reproduce its UI, title, logos, or text. Images 2, 3, and 4 are the character identity and costume references for Yuji Itadori, Megumi Fushiguro, and Nobara Kugisaki.
>
> Primary request: create a polished original anime key visual of the three referenced heroes preparing for battle in a bright Japanese city plaza.
>
> Scene/backdrop: vivid blue summer sky, large white clouds, modern Tokyo buildings, elevated rail line, broad sunlit concrete plaza with subtle red barrier markings.
>
> Subject: Yuji dominates the lower-left foreground lunging toward camera with cyan-black cursed energy around one fist; Megumi stands centered in the middle distance making a focused hand sign with deep blue-black shadow energy; Nobara stands on the right in an assertive hammer-ready pose with sharp red-black energy slashes.
>
> Style/medium: high-end contemporary cinematic anime cel illustration; sharp ink contour; confident flat cel shadows; controlled painterly urban depth; rough editorial brush cuts; bone-white, saturated cobalt, cyan, and barrier-red accents; energetic but readable.
>
> Composition/framing: exact vertical phone composition. Keep the upper 28 percent mostly sky and city with usable negative space for a large title and profile HUD. Place the trio across the middle 42 percent, with clear separated silhouettes and dramatic depth. Keep the bottom 30 percent as calmer sunlit plaza/paper texture so interface buttons remain legible. No character is cropped at the face or hands.
>
> Lighting/mood: bright hard daylight, optimistic pre-battle energy, crisp rim light, not dark or grim.
>
> Constraints: background art only; no interface panels, no buttons, no icons, no HUD, no title, no words, no letters, no numbers, no watermarks, no logos, no extra characters. Preserve the three character identities and outfits from Images 2–4. Do not copy any UI or embedded text from Image 1.

### Exact bright rooftop revised prompt

> Use case: stylized-concept
>
> Asset type: full-screen 9:16 portrait mobile tactical-battle environment background
>
> Input images: Image 1 is a spatial and lighting reference only. Recreate neither its characters nor its interface, labels, icons, arrows, cards, or text.
>
> Primary request: create a bright sunlit Tokyo rooftop arena designed for a mobile 3v3 battle screen.
>
> Scene/backdrop: expansive school or municipal rooftop surrounded by modern glass towers, railings, rooftop equipment, distant elevated transit, saturated blue sky with large white clouds.
>
> Subject: an empty battlefield with a broad central concrete lane and a large weathered circular ritual/target marking embedded in the rooftop floor.
>
> Style/medium: polished contemporary anime background painting; crisp architectural linework; hard cel-like daylight shadows; subtle dry-brush ink accents; restrained red barrier scratches and a few cyan energy scuffs.
>
> Composition/framing: exact vertical phone composition. Upper 24 percent is mostly sky and skyline for the turn HUD. Upper-middle 26 percent remains open behind the enemy row. Center 20 percent is an unobstructed target lane with the circular floor mark. Lower-middle 20 percent remains open behind the ally row. Bottom 10 percent is light concrete/paper texture for the action deck. Strong depth perspective converges through the center.
>
> Lighting/mood: clear midday sun, vivid cobalt blue, clean bone-white concrete, high visibility, energetic and optimistic; absolutely not overcast, sepia, nighttime, or dark.
>
> Constraints: empty environment only; no people, no characters, no UI, no panels, no cards, no buttons, no arrows, no icons, no letters, no numbers, no words, no watermark, no logo.

## Limitation

These records document generated production lineage, not copyright, trademark,
likeness, licensing, or commercial-release clearance for the Jujutsu Kaisen
project as a whole. In particular, the character-led Home result depicts named
franchise characters and was generated with user-supplied franchise imagery as
composition context. It requires explicit legal and commercial release review;
generation provenance alone does not grant any right to ship it. Exploratory
images under `artifacts/ui-redesign/concepts/` remain non-runtime references and
are deliberately excluded from delivery.
