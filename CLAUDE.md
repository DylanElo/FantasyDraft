# JJK Fantasy Draft - Project Context

## What This Project Is

JJK Fantasy Draft is a browser-based Jujutsu Kaisen draft and tactical battle arena inspired by Naruto Arena.

Players choose a three-fighter Battle v2 team, then resolve server-authoritative turns through the live Flask-SocketIO web app. The browser renders the current Phaser-based Battle v2 experience; Python owns legality, state, queue resolution, energy, cooldowns, hidden information, CPU practice, and PvP room orchestration.

## Current Architecture

```text
run_server.py                    # Local entrypoint for the Flask-SocketIO app
web/
  app.py                         # HTTP routes and SocketIO event bridge
  templates/index.html           # Single-page shell
  static/
    phaser-shell.js              # Battle v2 client, scenes, state store, SocketIO bridge
    phaser-shell.css             # Phaser shell/canvas reset
    jjk-tokens.css               # Theme tokens
    jjk-theme.css                # Shared app theme
    arena-redesign.css           # Arena-specific styling
    effects.js                   # Visual/audio helpers
    socket.io.min.js             # Vendored SocketIO client
    vendor/phaser.min.js         # Vendored Phaser runtime
jjk_arena/
  battle_v2/                     # Default rules engine and room manager
docs/
  *.md                           # Design notes and contracts
tests/                           # Pytest coverage for v2, sockets, and progression
```

## Runtime Truths

- Battle v2 is the only maintained gameplay engine.
- The live game is `web/` plus `run_server.py` on a Python host.
- `docs/` contains markdown design notes and contracts only.
- The server should stay authoritative. Browser code submits player intent and renders state; it must not decide legality or mutate battle truth.
- Eventlet may warn that it is deprecated. That warning is known, but do not hide new runtime failures behind it.

## How to Run

```bash
python -m pip install -r requirements.txt
python run_server.py
```

Open `http://127.0.0.1:5000`.

## Useful Commands

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

## Battle v2 Model Boundaries

- `jjk_arena/battle_v2/models.py` defines battle phases, entities, skills, statuses, actions, and `use_battle_v2()`.
- `energy.py` handles deterministic energy gain and wildcard payment validation.
- `conditions.py` evaluates structured kit conditions.
- `targeting.py` validates legal targets.
- `effects.py` applies effect helpers.
- `resolver.py` resolves queued actions.
- `starter_roster.py` contains the implemented starter kits.
- `serialization.py` builds public/private viewer-specific state.
- `manager.py` owns room lifecycle, CPU choices, PvP lobbies, and match orchestration.
- `web/app.py` exposes the SocketIO surface for CPU practice, classic v2 rooms, private PvP, queue review, confirm, cancel, end turn, and surrender.

## Current Battle v2 Loop

1. Player selects one skill per living active character.
2. Player chooses legal targets for each selected skill.
3. Player enters queue review.
4. Wildcard costs are assigned from available core energy.
5. Player orders queued skills.
6. Server validates and spends energy on confirm.
7. Resolver applies queued actions left-to-right.
8. Statuses, cooldowns, deaths, domains, and energy update at turn end.
9. Next player acts unless the match is finished.

## Naruto Arena Design Reference

Naruto Arena is the design reference for tactical readability, not a mandate to copy every legacy implementation detail.

Keep these principles:

- Three active characters matter every turn.
- Skills should show cost, target rule, classes, cooldown, duration, effect, condition, and counterplay.
- Energy should be visible as colored pips and validated server-side.
- Damage families must stay distinct: normal, piercing, soul, sure-hit, affliction-style bypass effects, shields, reduction, invulnerability, and health steal all have different rules.
- Hidden statuses must serialize privately to the owner and never leak protected targets to opponents.

## Character And Progression Notes

- Battle v2 starter content currently lives in `jjk_arena/battle_v2/starter_roster.py`.
- First character creation/progression is documented in `docs/first_character_creation.md`.
- Unlocks and profile progress are implemented under `jjk_arena/battle_v2/first_creation_*.py`.
- Do not add large batches of characters casually. Prefer a small, fully tested kit over broad roster churn.
- Use `docs/jjk_kit_grammar.md` when adding or changing skill grammar.

## Deployment Surfaces

- Live multiplayer app: deploy `run_server.py` / `web/app.py` to a Python web host such as Render, Railway, or Fly.io.

## Do Not Do

- Do not reintroduce Telegram bot identity or old bot runtime assumptions.
- Do not add Node, npm, webpack, or a JS build pipeline unless the user explicitly approves it.
- Do not move rules authority into the browser.
- Do not replace the current random draw/keep/pass draft flavor with simultaneous direct pick unless explicitly requested.
- Do not reintroduce the removed v1 engine, old character module, or static Pages demo.
- Do not change the visual language casually; the current shell uses the JJK theme/token files and Phaser presentation.

## Before Finishing Work

- Run `python -m pytest -q` for code changes unless there is a clear reason it cannot run.
- For frontend changes, start the local server and check the live page in a browser when feasible.
- For Battle v2 contract changes, update `docs/battle_v2_socket_contract.md`.
- For engine or loop changes, update `docs/battle_system_v2_design.md` and add focused tests.
- Be explicit about what was actually verified. Do not describe unrun checks as passing.
