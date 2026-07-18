# Season 3 semantic skill-art provenance

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
