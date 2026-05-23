# Asset Inventory

| File | What it is | Origin |
|---|---|---|
| `logo-mark.svg` | Square 呪 brand mark — purple tile + kanji. Use anywhere the product has only ~80–120px to spend on a logo. | Recreated from the `.logo-kanji` block in `docs/index.html`. |
| `logo-lockup.svg` | Horizontal lockup: 呪 tile + "JJK / FANTASY DRAFT" wordmark. Use as the email/landing header. | Recreated from the setup‑screen logo block. |
| `orb-{blue,red,green,white,black}.svg` | Energy orbs at 32×32 with the canonical radial glow. Drop these in place of the 11px CSS dots when you want crisp medium‑sized chips. | Recreated from `.orb-*` rules in `docs/style.css`. |
| `icons/{draw,keep,pass,teams,arrow-left,arrow-right}.svg` | The six inline SVGs the product currently ships, extracted verbatim. 2–2.5px stroke, round caps, Feather/Lucide family. | Copied 1:1 from `docs/index.html`. |
| `characters.sample.json` | A 5‑character subset of the full roster, with Fandom image URLs intact. Use when prototyping; pull from the full `docs/characters.json` (imported) for production. | Subset of `docs/characters.json`. |

## When you need an icon that isn't here

Pull from [**Lucide**](https://lucide.dev/) at the same settings — `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`, `stroke="currentColor"`. Do not import a different icon library; the stroke families won't match.

## Character art

Character portraits hot‑link from the JJK Fandom wiki at `static.wikia.nocookie.net`. We do **not** own those images and we do **not** redistribute them. If you need offline portraits, either capture them per fair‑use review at build time, or commission art.
