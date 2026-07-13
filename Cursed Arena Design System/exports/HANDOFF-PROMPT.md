# Handoff prompt — Cursed Arena design system → FantasyDraft Phaser client

Copy everything below the line into Claude Code / Codex, run from the FantasyDraft repo root, with this design-system folder placed at `design_system/` (or adjust the path).

---

You are integrating a complete design system into this repo's Phaser 3 mobile client. This is a **ground-up UI rebuild to a new spec**, NOT a reskin. Do not keep the existing scene layouts and swap colors — rebuild each scene's composition to match the reference prototypes.

## Ground truth (read these first, in order)
1. `design_system/readme.md` — the full visual/content/motion spec. The VISUAL FOUNDATIONS and combat-state color rules are law.
2. `design_system/ui_kits/mobile-app-v2/` — the reference implementation of every screen (Lobby, Team Builder, Roster, Combat, Queue Review, Results). Open `index.html` in a browser and click through it. **Your Phaser scenes must match these compositions** — element placement, hierarchy, sizes, and interaction flow — not the current scenes.
3. `design_system/exports/phaser-design-tokens.js` — replaces `web/static/phaser-design-tokens.js` (same `window.JJK_MOBILE_TOKENS` shape, plus `combatStates`, `rarity`, `plate`). Copy it in and migrate all scene code to the new token names; delete dead old tokens.
4. `design_system/ui_kits/mobile-app-v2/ScreensV2A.jsx` + `ScreensV2B.jsx` — read the JSX as a spec: every inline style value (paddings, clip cuts, gradients, sizes) is intentional. Where the JSX uses CSS vars, resolve them from `design_system/tokens/*.css`.

## Hard rules
- **Server authority unchanged.** Do not touch `jjk_arena/battle_v2/`, socket contracts, or any legality/state logic. UI only.
- **Combat-state colors are strict**: gold = selected caster/skill, teal = legal target (pulse), red = enemy threat/damage ONLY, violet = domain/cinematic moments ONLY — never routine chrome.
- **Plate language**: every raised element = near-black keyline (3px, `plate.keylineColor`) + inner bevel (light top `plate.bevelTopAlpha`, dark bottom `plate.bevelBottomAlpha`) + hard 4px color ledge below buttons. Press = translate down 3–4px onto the ledge in 80ms. Build ONE reusable plate factory (e.g. `phaser/components/plate.js`) and use it everywhere; do not hand-draw panels per scene.
- **Blade geometry**: primary plates and fighter cards use cut corners (16px blade cut, see `--clip-blade*` in `design_system/tokens/fx.css`). In Phaser, draw with `Phaser.GameObjects.Graphics` polygon paths or 9-slice textures — pick one approach and use it consistently.
- **Type**: load Google Fonts (Lilita One, Inter, JetBrains Mono) in `web/templates/index.html` BEFORE Phaser boots (use `document.fonts.ready` or WebFont loader gating the boot scene). Display type is Lilita One uppercase; stats are JetBrains Mono tabular.
- **Assets**: copy `design_system/assets/` into `web/static/assets/` (portraits/orbs/icons/backdrops overwrite is fine — they originated here). Keep the manifest pattern; portraits remain replaceable slots.
- **Motion**: use `motion.*` from the token file. Rebuild the CSS FX as Phaser equivalents: shine sweep = masked gradient tween across gold/CTA plates; ember field = small particle emitter (curse-300, alpha rise/fade); target pulse = expanding stroke ring at 1200ms; reward pop-in = scale-from-0.55 with `Back.easeOut`, staggered 100ms; victory rays = rotating rays texture at very low alpha. Gate all ambient loops on a reduced-motion setting.
- **Frames**: portrait-first 390×844 design target (360×800 min, 430×932 max), desktop centers a phone-shaped canvas at >620px. All critical taps in the lower 55%; 44px minimum touch targets.

## Scene-by-scene acceptance (match mobile-app-v2)
- **Lobby**: full-bleed character poster with bottom protection gradient; trophy count in HUD; skewed season tag; giant blade-cut BATTLE plate with shine sweep + breathing glow; two mode tiles; Arena Pass strip with progress + Claim.
- **Team Builder**: skewed section banner; 3-slot pedestal with violet glow floor; 4-column blade-cut roster grid with checkmarks; Enter Arena CTA disabled until 3 picked.
- **Combat**: versus header (two aggregate HP bars meeting at a gold VS diamond); "Your Turn" gold tag; energy tray in an inset well; enemy/ally rows of cut-corner fighter cards (88px portrait, HP bar, ACTIVE tag on selected, teal pulse when targetable); perspective grid battlefield floor with a center prompt banner; command console = 4 technique tabs + ONE focused technique panel (name, effect, CD, cost pips, blocked reason, Use/Armed button); Reset + Review Queue row.
- **Queue Review**: bottom sheet; numbered rows (order · portrait · skill → target · cost pips); wild-payment note; Confirm Queue.
- **Results**: rotating burst rays + gold radial wash; VICTORY in gold-gradient display type; MVP blade-framed portrait; reward row (gold, gems, XP, trophies) popping in staggered; Battle Again / Home.

## Process
1. Copy tokens + assets in; wire fonts; migrate token references. Run the app, confirm nothing crashes.
2. Build the shared plate/blade/text factories in `phaser/components/`.
3. Rebuild scenes one at a time in the order above, screenshotting each at 390×844 and comparing against the corresponding screen in `mobile-app-v2` before moving on.
4. Keep `python -m pytest -q` green; update `docs/session_history.md` when done.
5. Report any spec ambiguity instead of inventing — the design system repo is the source of truth.
