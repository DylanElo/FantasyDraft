# Season 3 semantic skill-art provenance

## Per-skill action atlas v2

`culling-current/skill-action-atlas-v2.png` is the current illustrated action
source for the shipping skill-card system. It is a 1254 x 1254 RGB PNG created
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
