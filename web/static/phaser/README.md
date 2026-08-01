# Phaser Mobile Runtime

This folder is the module boundary for the mobile-first Phaser shell.

- `index.js` is the browser module entrypoint; it wires the store, socket adapter, DOM accessibility bridge, and scene registry.
- `core/` owns token/bootstrap config, text helpers, local storage, layout, assets, and roster lookup helpers.
- `fx/` owns reusable event-resolution metrics and combat cinematic/playback scene behavior.
- `store/` owns battle state, queue review state, First Creation selections, and socket event reactions.
- `network/` owns the Socket.IO adapter.
- `scenes/` owns the scene registry, reusable Phaser scene base primitives, concrete scene modules, and scene-adjacent UI bases such as combat queue review and draft roster/dossier browsing.
- `ui/season3-ui.js` is the canonical Season 3 component facade. The three
  older helper names remain compatibility variants for approved compositions;
  shared palette, semantics, typography, and compatible clipped geometry live
  in `ui/season3-tokens.js`.

Environment allocation and lazy staging live in `core/asset-registry.js`.
Boot owns only the splash and immediate Home plates; other world textures are
requested by the active scene's world component and retain a deterministic
gradient fallback.
