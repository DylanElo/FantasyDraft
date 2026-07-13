# Battle v2 truth-alignment pass

## Done

- Made invulnerability block harmful targeting by default while allowing helpful ally skills, with explicit `invulnerable_to_helpful` and `invulnerable_to_all` overrides.
- Implemented the listed first-creation payload grammar: defense destruction before damage, OR target conditions, caster conditions, single-target amounts, low-HP defense, defense-gain blocks, melee punishment, ally-target locks, self-affliction cleanse, conditional ally defense, and incoming damage deltas.
- Corrected Maki's Cursed Tool Combo, Panda's Drumming Beat, and Yuji's Black Flash Attempt behavior.
- Made watcher/scout energy rewards use seeded random selection across the four core energy colors.
- Made Phaser render effective replacement skills in their original slots, keep the original slot id in queued actions, and use the replacement id for cooldown lookup.

## Verified

- `python -m pytest -q`: 121 passed, 1 skipped.
- `python -m compileall -q jjk_arena web/app.py`: passed.
- `node --check web/static/phaser/store/game-store.js`: passed.

## Remaining

- No new characters, screens, recoloring, or broader Battle v2 rules changes were included in this pass.
- Live browser/device visual validation was not required for these rule/store changes and was not performed.

## Caveats

- The worktree already contained a large in-progress Phaser/design-system change set. This pass preserved it and only changed the shared battle rules, store behavior, focused tests, and documentation listed in the handoff.
