import { TOKEN_FRAMES } from './runtime-config.js?v=38';

function cssPixels(name) {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return 0;
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

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
    const safeTop = cssPixels('--jjk-safe-top');
    const safeBottom = cssPixels('--jjk-safe-bottom');
    const bottomInset = Math.max(14, safeBottom + 10);
    return {
      fullWidth: width,
      fullHeight: height,
      x,
      y: 0,
      width: gameWidth,
      height,
      gutter: 16,
      safeTop,
      safeBottom,
      top: Math.max(10, safeTop + 10),
      bottom: height - bottomInset,
      desktop: width > (TOKEN_FRAMES.desktopCenterAt || 620),
    };
  }

  phoneFrame() {
    return this.frame();
  }

  homeScreen() {
    const frame = this.frame();
    const profileH = 56;
    const navH = 60;
    const modesH = frame.height < 830 ? 82 : 88;
    const primaryH = frame.height < 830 ? 76 : 82;
    const navY = frame.bottom - navH;
    const modesY = navY - 10 - modesH;
    const primaryY = modesY - 10 - primaryH;
    const profileY = frame.top;
    const heroY = profileY + profileH + 8;
    return {
      frame,
      contentX: frame.x + frame.gutter,
      contentW: frame.width - frame.gutter * 2,
      profile: { x: frame.x + 12, y: profileY, w: frame.width - 24, h: profileH },
      hero: { x: frame.x + 12, y: heroY, w: frame.width - 24, h: Math.max(180, primaryY - heroY - 10) },
      primary: { x: frame.x + frame.gutter, y: primaryY, w: frame.width - frame.gutter * 2, h: primaryH },
      modes: { x: frame.x + frame.gutter, y: modesY, w: frame.width - frame.gutter * 2, h: modesH },
      nav: { x: frame.x, y: navY, w: frame.width, h: navH },
    };
  }

  topHud() {
    const frame = this.frame();
    return { x: frame.x + 10, y: frame.top + 2, width: frame.width - 20, height: 58 };
  }

  enemyLane() {
    const frame = this.frame();
    const compact = frame.height < 730;
    const token = compact ? 58 : 66;
    return { x: frame.x + frame.gutter, y: frame.top + (compact ? 76 : 82), width: frame.width - 32, height: token + 54 };
  }

  commandDock() {
    const frame = this.frame();
    const height = frame.height < 730 ? 248 : 268;
    return { x: frame.x, y: frame.bottom - height, width: frame.width, height };
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
