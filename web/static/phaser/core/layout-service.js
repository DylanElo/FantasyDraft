import { TOKEN_FRAMES } from './runtime-config.js?v=21';

export class LayoutService {
  constructor(scene) {
    this.scene = scene;
  }

  frame() {
    const canvas = this.scene.game && this.scene.game.canvas;
    const width = Math.round((canvas && canvas.clientWidth) || this.scene.scale.width);
    const height = Math.round((canvas && canvas.clientHeight) || this.scene.scale.height);
    const gameWidth = Math.min(width, TOKEN_FRAMES.large ? TOKEN_FRAMES.large.width : 430);
    const x = Math.round((width - gameWidth) / 2);
    return {
      fullWidth: width,
      fullHeight: height,
      x,
      y: 0,
      width: gameWidth,
      height,
      gutter: 16,
      top: 22,
      bottom: height - 22,
      desktop: width > (TOKEN_FRAMES.desktopCenterAt || 620),
    };
  }

  phoneFrame() {
    return this.frame();
  }

  topHud() {
    const frame = this.frame();
    return { x: frame.x + 10, y: 12, width: frame.width - 20, height: 58 };
  }

  enemyLane() {
    const frame = this.frame();
    const compact = frame.height < 730;
    const token = compact ? 58 : 66;
    return { x: frame.x + frame.gutter, y: compact ? 86 : 92, width: frame.width - 32, height: token + 54 };
  }

  commandDock() {
    const frame = this.frame();
    const height = frame.height < 730 ? 248 : 268;
    return { x: frame.x, y: frame.height - height, width: frame.width, height };
  }

  allyLane() {
    const frame = this.frame();
    const dock = this.commandDock();
    const compact = frame.height < 730;
    const token = compact ? 58 : 66;
    const enemy = this.enemyLane();
    const y = Math.max(enemy.y + token + 128, dock.y - token - (compact ? 44 : 54));
    return { x: frame.x + frame.gutter, y, width: frame.width - 32, height: token + 58 };
  }

  centerStage() {
    const frame = this.frame();
    const enemy = this.enemyLane();
    const ally = this.allyLane();
    const token = frame.height < 730 ? 58 : 66;
    const y = enemy.y + token + 42;
    return { x: frame.x + frame.gutter, y, width: frame.width - 32, height: Math.max(88, ally.y - y - 28) };
  }
}
