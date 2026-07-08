# Phaser Mobile Runtime

This folder is the module boundary for the mobile-first Phaser shell.

- `index.js` is the public module entrypoint loaded by `phaser-shell.js`.
- `legacy-shell.js` is now the Phaser entrypoint: it wires the store, socket adapter, and imported scene registry.
- `core/` owns token/bootstrap config, text helpers, local storage, layout, assets, and roster lookup helpers.
- `fx/` owns reusable event-resolution metrics and combat cinematic/playback scene behavior.
- `store/` owns battle state, queue review state, First Creation selections, and socket event reactions.
- `network/` owns the Socket.IO adapter.
- `scenes/` owns the scene registry, reusable Phaser scene base primitives, concrete scene modules, and scene-adjacent UI bases such as combat queue review and draft roster/dossier browsing.

Next extraction targets:

1. `ui/` for larger repeated scene widgets such as token rows, roster cards, and mission cards.
2. Dedicated scene-adjacent modules for First Creation preset browsing.
3. Smaller UI modules for repeated card rows once the scene bases settle.
