# Fonts

The system uses **two web fonts**, both loaded from Google Fonts. **No self‑hosted TTFs / WOFFs are required.**

| Role | Family | Weights |
|---|---|---|
| Display (logo, character names, screen titles, winner) | **Cinzel** | 700, 900 |
| UI / body / buttons | **Inter** | 400, 500, 600, 700, 800 |

## Embed snippet (paste in `<head>`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

## Why these

- **Cinzel** is a Roman‑inscription serif by Natanael Gama. It gives section titles and the JJK wordmark a chiseled, engraved‑on‑stone feel — pairs well with the "talisman / cursed seal" mood without veering into LARP gothic.
- **Inter** is the workhorse. Tight metrics, great at small sizes on dark backgrounds, broad weight range — handles every UI label without fighting Cinzel.

## Fallbacks

- Cinzel → `'Trajan Pro', 'Cormorant Garamond', serif`
- Inter → `system-ui, -apple-system, 'Segoe UI', sans-serif`

## Substitution note (please confirm)

The repo loads these from Google Fonts at run time; no font files are committed. **If you need fully offline / self‑hosted builds**, download the static TTFs from [Google Fonts](https://fonts.google.com/) and drop them in this folder, then swap the `<link>` for `@font-face` declarations. Flagging because the source repo did not ship font binaries.
