# JJK Fantasy Draft

A browser-based Jujutsu Kaisen fantasy draft and battle arena.

Players enter the Phaser arena, choose a three-fighter Battle v2 team, and resolve turns through the live Flask-SocketIO web UI. The server owns the game state; the browser renders the first-creation roster, CPU practice, private PvP lobbies, queue review, and combat.

## Run Locally

On Windows, double-click `start_server.bat`. The launcher creates the local
virtual environment when needed, synchronizes dependencies whenever
`requirements.txt` changes, waits for the server readiness check, and opens the
arena in the default browser. Set `JJK_NO_BROWSER=1` before launching if you do
not want it to open a browser automatically.

The equivalent manual launch is:

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
- The current Phaser visual direction is the Season 3 Culling Current system: sharp ink and hatch work, hard cel shadows, storm-lit painted cities, bone/smoke UI surfaces, barrier red, curse cyan, and strict combat-state colors. See `docs/season3_visual_system.md`.
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
