# JJK Fantasy Draft

A browser-based Jujutsu Kaisen fantasy draft and battle arena.

Players enter the Phaser arena, choose a three-fighter Battle v2 team, and resolve turns through the live Flask-SocketIO web UI. The server owns the game state; the browser renders the first-creation roster, CPU practice, private PvP lobbies, queue review, and combat.

## Run Locally

```bash
pip install -r requirements.txt
python run_server.py
```

Open `http://127.0.0.1:5000`.

## Useful Commands

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

## Runtime Notes

- `web/app.py` is the Flask-SocketIO bridge.
- `web/static/phaser-shell.js` owns the v2 browser client, scene stack, SocketIO bridge, and Phaser UI.
- `web/static/phaser-design-tokens.js` exposes the portrait-first mobile UI tokens consumed by Phaser.
- The current Phaser visual direction is Ink + Talisman: ink surfaces, aged paper accents, restrained cursed-energy glow, and strict combat-state colors.
- `web/static/phaser-shell.css` is only the canvas/container reset. Phaser draws the v2 screens.
- `jjk_arena/battle_v2/` contains the Battle v2 rules engine and roster data.
- Battle v2 currently supports CPU Practice and Private PvP room lobbies. PvP waiting rooms clean up when a player cancels, resets, or disconnects.
- `docs/mobile_phaser_ui_ux_brief.md` is the current mobile UI/UX source brief.
- `docs/mobile_screen_inventory.md` tracks the required Figma pages, Phaser screens, components, and mobile QA checklist.

## Deployment

Production uses the guarded Gunicorn configuration in `gunicorn.conf.py` and a
durable SQLite volume. Copy `.env.example`, provide real secrets/origins, and
follow `docs/production_runbook.md`. Battle authority is deliberately limited
to one worker until rooms, timers, sessions, and command receipts share an
external coordinator.
