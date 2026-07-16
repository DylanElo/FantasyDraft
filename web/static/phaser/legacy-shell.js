import { SocketClient } from './network/socket-client.js?v=21';
import { GameStore } from './store/game-store.js?v=21';
import { SCENE_LIST } from './scenes/scene-registry.js?v=21';

function startShell() {
  const element = document.getElementById('v2-phaser-shell');
  if (!element || !window.Phaser) return;
  const socketClient = new SocketClient();
  const store = new GameStore(socketClient);
  window.JJKPhaserShell = { store };
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: element,
    backgroundColor: '#050711',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: Math.max(320, element.clientWidth || window.innerWidth || 390),
      height: Math.max(640, element.clientHeight || window.innerHeight || 844),
    },
    audio: { noAudio: true },
    render: { antialias: true, pixelArt: false },
    loader: { maxParallelDownloads: 64 },
    scene: SCENE_LIST,
  });
  window.JJKPhaserShell.game = game;
  store.onChange(() => {
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
