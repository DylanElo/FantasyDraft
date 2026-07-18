# Season 3 semantic skill-art provenance

## Unique per-skill action atlases v3

Five character-free 4x4 atlases generated on 2026-07-18 replace the repeated
16-cell runtime mapping with one unique raster cell for each of the 78 shipping
First Creation skills. The calls used OpenAI built-in image generation and no
input images. Sources remain in the local built-in generation store; only the
processed WebP runtime files are committed.

Each source was generated as a 1254x1254 RGB PNG, resized once to 1248x1248 so
every 4x4 cell is exactly 312x312, then encoded as RGB WebP at quality 88 with
Pillow's method 6 encoder. No UI, typography, character, logo, or additional
paint-over was composited. The assignment remains presentation-only; Battle v2
continues to own names, costs, cooldowns, target rules, legality, replacements,
and outcomes.

| Family/use | Shipping file | Built-in result | Source SHA-256 | Shipping bytes | Shipping SHA-256 |
|---|---|---|---|---:|---|
| Body (14 used cells) | `culling-current/skill-atlas-body-v3.webp` | `exec-b467ea09-72d1-4078-9e6d-a3f83da0d9d1` | `2F49ECF65DADCD52669097F9391EE4776DA82B1D259C1C9BDBA688B965C63712` | 633,754 | `D836D33AD501BEC903AF1B77A1EF0A1CA4E90512602DEA6DC1EB77D6B1E57240` |
| Technique (16 cells) | `culling-current/skill-atlas-technique-v3.webp` | `exec-d5357894-d9b9-43e9-9a55-687b3c12d57f` | `F31FB14858A0F82D45AE24DC4CE23407E14FB4744108D3755924F5DE9D3B6F25` | 560,240 | `2EDB76CC36D25072FCABFD172FFB50EF89AFFAFB9BD0F24F0DA896F9725E1EE2` |
| Curse (16 cells) | `culling-current/skill-atlas-curse-v3.webp` | `exec-93cedd52-1f3a-44dd-a781-0e439e2d24cd` | `9C3BD0A90F0A456421B7A9D2CA1C721D52256EABB80B44F3084EBE295329116B` | 591,802 | `385943A3402CAE9A39B91B2A9235F8B89D651E6304809423F418C20F3D617F63` |
| Focus guard/support (16 cells) | `culling-current/skill-atlas-focus-guard-v3.webp` | `exec-13efaaf2-eda7-48d4-8145-b24c08e5d61b` | `7357679644A172C9EBC8194CA8879398A24BF7A1D110C4EE936FFE3EF6F8FC8E` | 480,202 | `FE5A975778449B445E70818A7AA4A0E35D9110806BBE6927C94738C909269B55` |
| Focus control/tactics (16 cells) | `culling-current/skill-atlas-focus-control-v3.webp` | `exec-d56ce45b-f6d6-492e-a215-b08993923106` | `53C443ADD4F4E06161D79A95CEA749FC1E25028AF97392EEB731E289BC15A8C9` | 443,544 | `6942F410EAF30F80A3A201E34DA5BA9B5A133DC8078B960D365377041916C8C5` |

### Exact Body prompt

> Use case: stylized-concept
>
> Asset type: production mobile game skill-action atlas, BODY family
>
> Primary request: Create one strict 4-by-4 atlas of sixteen distinct square physical-combat action illustrations. Cell subjects in reading order: reinforced fist shockwave; brutal open-palm impact; divergent double-hit fist trail; black precision impact burst; hammer and nail strike; sweeping spear arc; crossed cursed-tool blades; defensive weapon parry; heavy gorilla drum shockwave; crushing heel kick; rapid brotherly combo impacts; blood-tipped arrow launch; revolver muzzle impact; simple-domain sword draw; earnest katana slash; heavy axe sweep.
>
> Style/medium: original sharp hand-inked anime game effects, raw dry-brush and cross-hatch accents, hard cel-shadow masses, painted debris and impact energy, bone paper highlights, deep indigo structure, Body green, selective curse cyan, aged gold, restrained barrier red.
>
> Composition/framing: exactly four equal columns and four equal rows, straight uniform gutters, clear cell edges, one centered readable action silhouette in every square, generous crop safety, no element crossing a cell boundary.
>
> Lighting/mood: bright high-contrast kinetic action, readable at small mobile size.
>
> Constraints: effects and weapons only; no people, faces, hands attached to bodies, recognizable characters, creatures, interface, card frames, icons, text, letters, numbers, logos, official imagery, copied poses, or watermark. No glossy gacha rendering and no rounded app icons.

### Exact Technique prompt

> Use case: stylized-concept
>
> Asset type: production mobile game skill-action atlas, TECHNIQUE family
>
> Primary request: Create one strict 4-by-4 atlas of sixteen distinct square cursed-technique action illustrations. Cell subjects in reading order: paired shadow hounds rushing; lightning-wing dive; spinning nail barrage; explosive hairpin detonation; cursed-speech blast rings; wind scythe crescent; puppet energy beam; charged mechanical cannon; remote binding net; blue spatial compression vortex; red reversal-force burst; pale reverse-energy healing flare; ritual rhythm wave; black crow dive strike; clean reverse-energy restoration; spatial clap-and-swap distortion.
>
> Style/medium: original sharp hand-inked anime game effects, raw brush and cross-hatch accents, large hard cel-shadow masses, painted energy, bone paper highlights, deep indigo, Technique blue, selective curse cyan, aged gold, restrained barrier red.
>
> Composition/framing: exactly four equal columns and four equal rows, straight uniform gutters, clear cell edges, one centered readable effect silhouette per square, generous crop safety, no element crossing a cell boundary.
>
> Lighting/mood: bright high-contrast supernatural action, readable at small mobile size.
>
> Constraints: abstract effects, animals, weapons, and mechanisms only; no people, faces, recognizable characters, interface, card frames, icons, text, letters, numbers, logos, official imagery, copied poses, or watermark. No glossy gacha rendering and no rounded app icons.

### Exact Curse prompt

> Use case: stylized-concept
>
> Asset type: production mobile game skill-action atlas, CURSE family
>
> Primary request: Create one strict 4-by-4 atlas of sixteen distinct square volatile curse-action illustrations. Cell subjects in reading order: straw-doll resonance shock; clustered hairpin detonation; flowing red blood-scale armor; crimson blood binding; constructed hidden bullet; poisonous jellyfish sting; venom bloom; ink-black shikigami veil; crawling curse swarm; hooked worm curse coil; rainbow-scaled guardian dragon; curse-screen vortex; compressed spiral curse blast; enormous pale protector spirit aura; red-black protector barrier; cursed bond ignition.
>
> Style/medium: original sharp hand-inked anime game effects, raw brush and cross-hatch accents, hard cel-shadow masses, painted volatile energy, bone paper highlights, deep indigo structure, curse crimson, black ink, selective cyan, pale spectral white, aged gold.
>
> Composition/framing: exactly four equal columns and four equal rows, straight uniform gutters, clear cell edges, one centered readable effect silhouette per square, generous crop safety, no element crossing a cell boundary.
>
> Lighting/mood: dangerous high-contrast curse energy, bright enough for mobile readability.
>
> Constraints: abstract effects, spirits, tools, and creature silhouettes only; no people, faces, recognizable characters, interface, card frames, icons, text, letters, numbers, logos, official imagery, copied poses, or watermark. No gore, glossy gacha rendering, or rounded app icons.

### Exact Focus guard/support prompt

> Use case: stylized-concept
>
> Asset type: production mobile game skill-action atlas, FOCUS GUARD/SUPPORT family
>
> Primary request: Create one strict 4-by-4 atlas of sixteen distinct square tactical support illustrations. Cell subjects in reading order: reinforced defensive aura; reflexive cross-guard; shadow retreat portal; hammer guard barrier; throat medicine vial and soothing wave; guardian shield core; blood veil; aerial rescue wind ribbon; high-altitude evasion trail; cover-position barricade; useful retreat footwork; withdrawal signal flare; jellyfish screen; infinity barrier layers; rainbow guardian ward; emergency medical step.
>
> Style/medium: original sharp hand-inked anime game effects, restrained raw brush and cross-hatch accents, hard cel-shadow geometry, bone paper surfaces, deep indigo structure, Focus ivory, aged gold, selective curse cyan and muted green.
>
> Composition/framing: exactly four equal columns and four equal rows, straight uniform gutters, clear cell edges, one centered readable tactical symbol or object per square, generous crop safety, no element crossing a cell boundary.
>
> Lighting/mood: calm but powerful, bright high-contrast support energy readable at small mobile size.
>
> Constraints: abstract effects, barriers, tools, and symbols only; no people, faces, hands, recognizable characters, interface, card frames, text, letters, numbers, logos, official imagery, copied poses, or watermark. No glossy gacha rendering or rounded app icons.

### Exact Focus control/tactics prompt

> Use case: stylized-concept
>
> Asset type: production mobile game skill-action atlas, FOCUS CONTROL/TACTICS family
>
> Primary request: Create one strict 4-by-4 atlas of sixteen distinct square tactical control illustrations. Cell subjects in reading order: toad binding rope; cursed-speech stop shockwave; cursed-speech lock seal; clap feint afterimage; aerial scout eye compass; rubber-round decoy trajectory; simple-domain circular barrier; remote puppet net grid; venom control sigil; six-eyes read compass; talisman strike; solo chant waveform; curtain barrier step; crow scout silhouette; ritual timing metronome; cursed-speech megaphone shock cone.
>
> Style/medium: original sharp hand-inked anime game effects, raw brush and cross-hatch accents, hard cel-shadow tactical geometry, bone paper highlights, deep indigo structure, Focus ivory, aged gold, selective curse cyan, restrained barrier red.
>
> Composition/framing: exactly four equal columns and four equal rows, straight uniform gutters, clear cell edges, one centered readable tactical effect or object per square, generous crop safety, no element crossing a cell boundary.
>
> Lighting/mood: precise, intelligent, high-contrast tactical energy readable at small mobile size.
>
> Constraints: abstract effects, tools, animal silhouettes, barriers, and symbols only; no people, faces, recognizable characters, interface, card frames, text, letters, numbers, logos, official imagery, copied poses, or watermark. No glossy gacha rendering or rounded app icons.

## Superseded action atlas v2

`culling-current/skill-action-atlas-v2.png` is retained only as generated-art
lineage and is no longer loaded by the shipping skill-card system. It was the
interim 16-cell source before the five v3 atlases gave all 78 shipping skills
unique cells. It is a 1254 x 1254 RGB PNG created
on 2026-07-18 with OpenAI built-in image generation. The generated source and
shipping file are byte-identical: 3,588,212 bytes with SHA-256
`1E4D76797147BC506D3E94CA4360602A939B3A32CDEA89C4208A407E2722CBE2`.
The built-in result artifact is
`exec-1bd5f982-a914-42c2-b6dd-d65fc21ea2dd.png`; no crop, resampling, format
conversion, paint-over, or compositing was performed before the file was
copied into the workspace.

The generation used two user-supplied images as style and composition
references:

- `codex-clipboard-464e9758-4aab-4619-ba26-38cc42eaf98a.png` — the approved
  visual-system board;
- `codex-clipboard-b4199638-6865-4231-bc3f-341c471e5aa3.png` — the approved
  battle command-card and VFX composition.

The source contains a strict four-by-four grid. Phaser selects one of its 16
normalized cells, then combines that raster action art with stable,
data-driven sigil, accent, motion, and variant metadata keyed by shipping
skill ID. The resulting 78-skill coverage is presentation only; authoritative
skill name, slot, cost, cooldown, replacement, target rule, classes, legality,
description, and outcome continue to come from Battle v2 state.

### Exact action-atlas prompt

> Use case: stylized-concept
>
> Asset type: production mobile game skill-art atlas
>
> Input images: Image 1 is the approved visual-system reference; Image 2 is the approved battle command-card and VFX composition reference.
>
> Primary request: Create one strict 4-by-4 atlas of sixteen distinct square skill-action illustrations for JJK Arena. Every cell must be a self-contained action artwork suitable for a tall mobile skill card crop. The sixteen cells should cover: cyan reinforced fist impact; black-and-red precision energy burst; blue shadow/shikigami rush; red nail-and-hammer detonation; sweeping cursed weapon slash; concentric cursed-speech shockwave; heavy guardian block; clap/teleport spatial distortion; blood arrow and binding; wind scythe; revolver muzzle impact; simple-domain sword draw; puppet cannon beam; poisonous jellyfish bloom; blue infinity compression versus red reversal force; black curse swarm with pale healing/ritual/crow/protector energy variants blended into the final cell.
>
> Style/medium: sharp hand-inked anime game illustration, raw brush and cross-hatch accents, large hard cel-shadow masses, painted impact effects, bone paper highlights, deep indigo structure, barrier red, curse cyan, aged gold. Match the energy and print texture of the references without copying their layouts or characters.
>
> Composition/framing: portrait-oriented atlas, exactly four equal columns and four equal rows, straight uniform gutters, every cell edge clearly separated, central readable silhouette in each cell, no element crossing a cell boundary.
>
> Constraints: no characters or recognizable faces; no text; no letters; no numbers; no logos; no UI labels; no watermark; no official frames or copied poses; no soft glossy gacha rendering; no rounded app icons. Keep all sixteen cells visually distinct and readable at small mobile size.

The atlas is character-free, but its two user-supplied references contain
franchise characters and franchise-directed concept art. This provenance
record does not provide commercial-release or licensing clearance.

## Earlier four-family source textures

The four runtime skill textures under `culling-current/` were cut from one
original 1672 x 941 RGB PNG generated on 2026-07-18 with OpenAI built-in image
generation. The call used the user-supplied Combat screenshot
`codex-clipboard-1bd9d821-45ff-4357-92e9-156e8c9ddfe7.png` as a reference for
intensity, sharp energy brushwork, and tall-card framing only. It was explicitly
instructed not to reproduce the screenshot's characters, interface, labels,
symbols, borders, or text.

The generated source was 3,092,710 bytes with SHA-256
`66B9D08B80A942E38082FFAFC6B2967526C489199878E33A0A4B0DFEB24D8456`.
Its result ID is `exec-8c04fe3f-eca8-4622-8dd7-e8cac99d11a1`. The source PNG
remains in the local built-in generation output and is not committed.

## Processing and shipping files

The atlas was divided left-to-right into four exact 418 x 941 columns without
resampling, then each crop was encoded as RGB WebP. No interface, border, icon,
text, character, or additional painted element was composited afterward.

| Column | Semantic use | Shipping file | Bytes | SHA-256 |
|---|---|---|---|---|
| 1 | B / Body | `culling-current/body.webp` | 153,814 | `F810ECC6DB0B799B27C6938E0B4476CD68FEBD0C52384860437F773F488DE4E0` |
| 2 | T / Technique | `culling-current/technique.webp` | 139,482 | `DCEE9C418AF9A64EB01270AB3FBAD86309440073A1B4299745F6E02D7F5BAE0A` |
| 3 | F / Focus | `culling-current/focus.webp` | 147,668 | `9CCDCA4CFFEA7135058298C89AB98BEDF0C230A4C555568F9291C405F2F39B0F` |
| 4 | C / Curse | `culling-current/curse.webp` | 147,738 | `1705F3BCCD830224A683859ECE5D4353BF745A817A4B8AEAA543746C6D5FB2CF` |

These are generic semantic illustrations, not authoritative skill data. Phaser
maps them by the relevant core-energy family while server-provided skill name,
adjusted cost, cooldown, replacement, legality, targeting, and effect text
remain authoritative. X remains a Wild cost placeholder and has no fifth art
panel.

## Exact revised prompt

> Use case: stylized-concept
>
> Asset type: four-panel painted skill-card art atlas for a portrait mobile tactical battler
>
> Input images: Image 1 is a reference for the intensity, sharp anime energy brushwork, and tall skill-card framing only. Do not reproduce its characters, UI, labels, symbols, borders, or text.
>
> Primary request: create one landscape image divided into exactly four equal-width vertical illustration panels, edge-to-edge, each designed to be cropped into a tall mobile skill card.
>
> Panel 1: a clenched martial-arts fist breaking through cobalt and electric-cyan cursed energy, bold forward impact.
>
> Panel 2: an abstract black shikigami or shadow-beast silhouette cutting through deep indigo and cyan energy, fast technique motion.
>
> Panel 3: a precise amber-gold barrier compass and tactical focus lines on bone-white smoke, controlled and intelligent.
>
> Panel 4: a violent crimson-black curse explosion with fractured concrete and hot vermilion sparks, volatile power.
>
> Style/medium: high-end contemporary anime action illustration; sharp ink contours; hard cel shadow; rough dry-brush streaks; cinematic painted particles; strong readable focal object in each panel.
>
> Composition/framing: exact four-column atlas with each column independently usable as a 3:5 vertical crop. Keep focal action centered in each column. Fill every panel to its edges. No gutters, no outer frame.
>
> Lighting/mood: high contrast action energy, bright and legible rather than dark.
>
> Constraints: no people, no faces, no characters, no interface, no card frames, no icons, no letters, no numbers, no words, no watermark, no logo, no extra fifth panel.

## Limitation

This file records generated production lineage, not copyright, trademark,
licensing, or commercial-release clearance for the Jujutsu Kaisen project as a
whole. The user-supplied reference screenshot contains franchise characters and
art. Although the generated atlas is abstract and character-free, it still
requires release-rights review; provenance alone does not grant a right to ship
it.
