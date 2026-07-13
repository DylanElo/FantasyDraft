import { COLORS, TOKEN_PLATE } from '../core/runtime-config.js?v=28';

export function bladePath(g, x, y, w, h, cut = 16, mode = 'both') {
  const c = Math.max(0, Math.min(cut, w / 3, h / 2));
  g.beginPath();
  if (mode === 'left') {
    g.moveTo(x + c, y);
    g.lineTo(x + w, y);
    g.lineTo(x + w, y + h);
    g.lineTo(x, y + h);
    g.lineTo(x + c, y);
  } else if (mode === 'right') {
    g.moveTo(x, y);
    g.lineTo(x + w - c, y);
    g.lineTo(x + w, y + c);
    g.lineTo(x + w, y + h);
    g.lineTo(x, y + h);
  } else {
    g.moveTo(x + c, y);
    g.lineTo(x + w, y);
    g.lineTo(x + w, y + h - c);
    g.lineTo(x + w - c, y + h);
    g.lineTo(x, y + h);
    g.lineTo(x, y + c);
  }
  g.closePath();
}

export function drawBladePlate(scene, x, y, w, h, options = {}) {
  const g = options.graphics || scene.graphics;
  const cut = options.cut === undefined ? 16 : options.cut;
  const mode = options.mode || 'both';
  const keyline = options.keyline || TOKEN_PLATE.keylineColor || COLORS.ink950;
  const fill = options.fill || COLORS.ink800;
  const ledge = options.ledge || options.stroke || COLORS.curse600;
  const stroke = options.stroke || keyline;
  const ledgeOffset = options.ledgeOffset === undefined ? (TOKEN_PLATE.ledgeOffset || 4) : options.ledgeOffset;
  const alpha = options.alpha === undefined ? 1 : options.alpha;
  const lineWidth = options.lineWidth || TOKEN_PLATE.keylineWidth || 3;

  if (ledgeOffset > 0) {
    g.fillStyle(ledge, options.ledgeAlpha === undefined ? 0.95 : options.ledgeAlpha);
    bladePath(g, x, y + ledgeOffset, w, h, cut, mode);
    g.fillPath();
  }

  g.fillStyle(keyline, options.keylineAlpha === undefined ? 1 : options.keylineAlpha);
  bladePath(g, x, y, w, h, cut, mode);
  g.fillPath();

  const inset = Math.max(2, Math.ceil(lineWidth));
  g.fillStyle(fill, alpha);
  bladePath(g, x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(3, cut - inset), mode);
  g.fillPath();

  if (options.highlight !== false) {
    g.lineStyle(1.5, 0xffffff, options.bevelTopAlpha === undefined ? (TOKEN_PLATE.bevelTopAlpha || 0.28) : options.bevelTopAlpha);
    g.beginPath();
    g.moveTo(x + cut + 4, y + inset + 2);
    g.lineTo(x + w - 10, y + inset + 2);
    g.strokePath();
    g.lineStyle(1.5, 0x000000, options.bevelBottomAlpha === undefined ? (TOKEN_PLATE.bevelBottomAlpha || 0.22) : options.bevelBottomAlpha);
    g.beginPath();
    g.moveTo(x + 8, y + h - inset - 2);
    g.lineTo(x + w - cut - 4, y + h - inset - 2);
    g.strokePath();
  }

  if (options.strokeAlpha !== 0) {
    g.lineStyle(lineWidth, stroke, options.strokeAlpha === undefined ? 0.85 : options.strokeAlpha);
    bladePath(g, x, y, w, h, cut, mode);
    g.strokePath();
  }
}

export function drawInsetWell(scene, x, y, w, h, options = {}) {
  const g = options.graphics || scene.graphics;
  const cut = options.cut === undefined ? 12 : options.cut;
  g.fillStyle(options.fill || COLORS.ink950, options.alpha === undefined ? 0.72 : options.alpha);
  bladePath(g, x, y, w, h, cut, options.mode || 'both');
  g.fillPath();
  g.lineStyle(2, options.stroke || COLORS.ink500, options.strokeAlpha === undefined ? 0.45 : options.strokeAlpha);
  bladePath(g, x + 1, y + 1, w - 2, h - 2, Math.max(4, cut - 1), options.mode || 'both');
  g.strokePath();
  g.lineStyle(2, 0x000000, 0.36);
  g.beginPath();
  g.moveTo(x + cut + 4, y + 5);
  g.lineTo(x + w - 10, y + 5);
  g.strokePath();
}
