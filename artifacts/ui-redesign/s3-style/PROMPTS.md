# Season 3 master visual-system artifact

This directory contains the original generated style board used as the sole
image reference for the runtime portrait and environment generation pass, plus
a deterministic contact sheet of the 19 shipping portraits.

| Artifact | Dimensions | SHA-256 |
|---|---:|---|
| `master-visual-system.png` | 1536 x 1024 | `0BBAAC5A1A98A2178648ADD1DC6F69CA8DD2FCD8DAC77D65147659CBD14DE71F` |
| `starter-portrait-contact-sheet.webp` | 900 x 1096 | `F09F08814FCF2504F8DF85182401CFAE123364A079E43BA9755ED7F18FEDA6BB` |

The master board was created on 2026-07-18 with OpenAI built-in image
generation, result `exec-ff298e55-fb7e-4ed0-87d7-102f0179c56a`. It used no
input image. The contact sheet is a local layout of the final 600 x 800 WebP
portrait files; it contains no newly generated content.

The checkout independently verifies both committed artifacts' dimensions and
hashes. It does not contain generator session logs, so the result identifier,
input history, and exact prompt below remain contemporaneous production records
rather than metadata recoverable from the image bytes.

## Exact master-board prompt

> Use case: ui-mockup
>
> Asset type: master visual-system board for every illustration, environment,
> VFX layer, transition, and UI surface in a portrait-first Jujutsu Kaisen
> tactical mobile game
>
> Primary request: create a cohesive production art-direction board strongly
> grounded in the visual language of Jujutsu Kaisen Season 3's Culling Game,
> but using only fresh original compositions and original sorcerer studies.
> This board will be the sole generated style reference for a full game asset
> pass.
>
> Subject: one wide editorial board containing two original character bust
> studies, one Tokyo colony rooftop environment, one damaged urban interior,
> cursed-energy VFX swatches, red barrier-line graphics, raw ink/hatching
> texture samples, and practical mobile UI cards/buttons/panels.
>
> Style/medium: sharp hand-inked anime contours; occasional raw pencil and
> cross-hatched stress marks; flat high-contrast cel shadow masses; selective
> rough line boil; photographic-feeling city depth translated into painted
> anime backgrounds; cinematic editorial layering; no glossy generic gacha
> rendering and no soft airbrushed 3D look.
>
> Composition/framing: asymmetric collage with aggressive diagonals, extreme
> scale contrast, small tilted or inverted studies, large negative-space zones,
> and red barrier geometry slicing across layers without obscuring faces or UI
> controls.
>
> Lighting/mood: post-Shibuya tension; storm-ochre daylight and cold concrete,
> sudden black/red danger frames, electric cyan curse light, harsh directional
> highlights, emotionally raw but still readable.
>
> Color palette: bone/ivory #F2E8D5, smoke gray #B7B5AD, storm ochre #B58B5B,
> deep indigo #101B36, barrier red #E32620, curse cyan #35DDE8, aged gold
> #D8BF68, ink charcoal #17191E. Routine UI samples should be mostly bone,
> smoke gray, and translucent off-white so the game does not become a dark
> dashboard.
>
> UI constraints: show tactile mobile surfaces with thick ink outlines,
> clipped red diagonals, paper/concrete grain, narrow condensed labels,
> 44px-equivalent controls, clean information hierarchy, and semantic
> cyan/gold/red/green states; environment and character art lead the
> composition.
>
> Text: no words, no letters, no numbers.
>
> Constraints: original art only; do not reproduce any official key visual,
> anime frame, manga panel, logo, character, pose, or typography; no copyrighted
> logos; no watermark; no phone bezel; no illegible microtext; no full-board
> black background; no neon cyberpunk; no gothic parchment; no glossy sci-fi
> HUD; production-ready and internally consistent.

Detailed per-file portrait and environment prompts, result identifiers,
post-processing, and hashes are recorded in:

- `web/static/assets/portraits/PROVENANCE.md`
- `web/static/assets/environments/PROVENANCE.md`

The board is an internal production reference, not a replacement for rights or
commercial-release review.
