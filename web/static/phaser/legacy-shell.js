import { SocketClient } from './network/socket-client.js?v=37';
import { GameStore } from './store/game-store.js?v=37';
import { SCENE_LIST } from './scenes/scene-registry.js?v=37';
import { DomUiBridge } from './core/dom-ui-bridge.js?v=37';

function startShell() {
  const element = document.getElementById('v2-phaser-shell');
  if (!element || !window.Phaser) return;
  const domUI = new DomUiBridge(document);
  const socketClient = new SocketClient();
  const store = new GameStore(socketClient);
  window.JJKPhaserShell = { store, domUI, bootReady: false };
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: element,
    backgroundColor: '#F7F4EC',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: Math.max(320, element.clientWidth || window.innerWidth || 390),
      height: Math.max(640, element.clientHeight || window.innerHeight || 844),
    },
    audio: { noAudio: false },
    render: { antialias: true, pixelArt: false },
    loader: { maxParallelDownloads: 64 },
    scene: SCENE_LIST,
  });
  window.JJKPhaserShell.game = game;
  if (game.canvas) {
    game.canvas.setAttribute('aria-hidden', 'true');
    game.canvas.tabIndex = -1;
  }
  if (game.events && game.events.once) game.events.once('destroy', () => domUI.destroy());
  store.onChange(() => {
    // Boot owns the initial transition. Socket/status notifications can arrive
    // while its loader is still active; starting Lobby here would create a
    // second scene loader racing for the same startup portrait texture keys.
    if (!window.JJKPhaserShell.bootReady) return;
    if (game.scene && game.scene.isActive('BootScene')) return;
    if (game.scene && store.scene && !game.scene.isActive(store.scene)) {
      game.scene.start(store.scene);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startShell, { once: true });
} else {
  startShell();
}
