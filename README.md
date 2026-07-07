# JJK Fantasy Draft

A browser-based Jujutsu Kaisen fantasy draft and battle arena.

Players enter an arena, draft a five-character team, choose three fighters for combat, and resolve turns through the live Flask-SocketIO web UI. The server owns the game state; the browser renders the draft, roster lab, team selection, and Battle v2 arena.

## Run Locally

```bash
pip install -r requirements.txt
python run_server.py
```

Open `http://127.0.0.1:5000`.

## Useful Commands

```bash
python -m pytest -q
python scripts/roster_audit.py
python scripts/export_characters_data.py
```

## Runtime Notes

- `web/app.py` is the Flask-SocketIO bridge.
- `web/static/phaser-shell.js` owns the v2 browser client, scene stack, SocketIO bridge, and Phaser UI.
- `web/static/phaser-shell.css` is only the canvas/container reset. Phaser draws the v2 screens.
- `jjk_bot/battle_v2/` contains the newer Battle v2 rules engine behind the `JJK_BATTLE_SYSTEM=v2` feature flag.
- Battle v2 currently supports CPU Practice and Private PvP room lobbies. PvP waiting rooms clean up when a player cancels, resets, or disconnects.
