import { CULLING_COLORS, TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=38';
import { stageEnvironmentTexture } from '../core/asset-registry.js?v=38';

function clipPoints(x, y, w, h, cut = 9) {
  const safeCut = Math.max(0, Math.min(cut, w / 4, h / 3));
  return [
    { x: x + safeCut, y },
    { x: x + w, y },
    { x: x + w, y: y + h - safeCut },
    { x: x + w - safeCut, y: y + h },
    { x, y: y + h },
    { x, y: y + safeCut },
  ];
}

export function drawCurrentWorld(scene, frame, textureKey, options) {
  const opts = options || {};
  const g = scene.graphics;
  stageEnvironmentTexture(scene, textureKey);
  const world = scene.coverImage(textureKey, frame.x, 0, frame.width, frame.height, { depth: -30, alpha: opts.imageAlpha || 1 });
  if (!world) {
    g.fillGradientStyle(CULLING_COLORS.sky, CULLING_COLORS.sky, CULLING_COLORS.ivory, CULLING_COLORS.concrete, 1);
    g.fillRect(frame.x, 0, frame.width, frame.height);
  }

  // Bone/smoke washes preserve the painted city while keeping routine UI
  // readable. Darkness is reserved for the ink structure and Domain moments.
  g.fillStyle(CULLING_COLORS.ivory, opts.topWash === undefined ? 0.26 : opts.topWash);
  g.fillRect(frame.x, 0, frame.width, Math.max(92, frame.top + 64));
  g.fillStyle(CULLING_COLORS.ivory, opts.bottomWash === undefined ? 0.74 : opts.bottomWash);
  g.fillRect(frame.x, frame.height - (opts.bottomHeight || 330), frame.width, opts.bottomHeight || 330);
  g.fillStyle(CULLING_COLORS.sky, 0.12);
  g.fillRect(frame.x, frame.height - 10, frame.width, 10);

  if (opts.accents !== false) {
    g.lineStyle(2, CULLING_COLORS.vermilion, 0.42);
    for (let index = 0; index < 4; index += 1) {
      const y = frame.top + 88 + index * 28;
      g.beginPath();
      g.moveTo(frame.x + frame.width - 82 + index * 7, y);
      g.lineTo(frame.x + frame.width + 16, y - 34);
      g.strokePath();
    }
    g.fillStyle(CULLING_COLORS.charcoal, 0.76);
    g.fillTriangle(frame.x, frame.top + 158, frame.x + 15, frame.top + 151, frame.x, frame.top + 186);
    g.lineStyle(1, CULLING_COLORS.charcoal, 0.12);
    for (let index = 0; index < 7; index += 1) {
      const y = frame.top + 34 + index * 19;
      g.beginPath();
      g.moveTo(frame.x + 4, y + 28);
      g.lineTo(frame.x + Math.min(frame.width * 0.42, 150), y);
      g.strokePath();
    }
  }
}

export function drawCurrentPanel(scene, x, y, w, h, options) {
  const opts = options || {};
  const g = scene.graphics;
  const cut = opts.cut === undefined ? Math.min(12, Math.max(6, (opts.radius || 18) * 0.55)) : opts.cut;
  const fill = opts.fill === undefined ? CULLING_COLORS.ivory : opts.fill;
  const stroke = opts.stroke === undefined ? CULLING_COLORS.charcoal : opts.stroke;
  const accent = opts.accent === undefined ? CULLING_COLORS.cobalt : opts.accent;
  g.fillStyle(CULLING_COLORS.shadow, opts.shadowAlpha === undefined ? 0.16 : opts.shadowAlpha);
  g.fillPoints(clipPoints(x + (opts.shadowX || 0), y + (opts.shadowY === undefined ? 5 : opts.shadowY), w, h, cut), true);
  g.fillStyle(fill, opts.alpha === undefined ? 0.94 : opts.alpha);
  g.fillPoints(clipPoints(x, y, w, h, cut), true);
  if (opts.highlight !== false) {
    g.fillStyle(0xffffff, 0.38);
    g.fillPoints(clipPoints(x + 3, y + 3, w - 6, Math.max(8, Math.min(18, h * 0.24)), Math.max(3, cut - 4)), true);
  }
  if (opts.accentEdge !== false) {
    g.fillStyle(accent, opts.accentAlpha === undefined ? 0.9 : opts.accentAlpha);
    g.fillTriangle(x, y + h - Math.min(34, h), x, y + h, x + Math.min(34, w), y + h);
    g.fillTriangle(x + w - Math.min(36, w), y, x + w, y, x + w, y + Math.min(36, h));
  }
  g.lineStyle(opts.strokeWidth || 1.25, stroke, opts.strokeAlpha === undefined ? 0.2 : opts.strokeAlpha);
  g.strokePoints(clipPoints(x, y, w, h, cut), true);
  g.lineStyle(1, CULLING_COLORS.charcoal, 0.1);
  for (let index = 0; index < 3; index += 1) {
    g.beginPath();
    g.moveTo(x + w - 42 + index * 10, y + 7);
    g.lineTo(x + w - 16 + index * 5, y + 29);
    g.strokePath();
  }
}

export function drawCurrentPill(scene, x, y, label, options) {
  const opts = options || {};
  const h = opts.h || 24;
  const w = opts.w || Math.max(62, label.length * 7 + 24);
  const fill = opts.fill === undefined ? CULLING_COLORS.charcoal : opts.fill;
  scene.graphics.fillStyle(fill, opts.alpha === undefined ? 0.9 : opts.alpha);
  scene.graphics.fillRoundedRect(x, y, w, h, h / 2);
  scene.text(x + w / 2, y + h / 2 - 7, label, {
    fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
    fontSize: opts.fontSize || `${TYPE_SCALE.label}px`,
    fontStyle: '800',
    color: opts.color || CULLING_COLORS.inverseText,
  }).setOrigin(0.5, 0);
  return w;
}

export function drawCurrentButton(scene, x, y, w, h, label, onClick, options) {
  const opts = options || {};
  const disabled = !!opts.disabled;
  const fill = opts.fill === undefined ? CULLING_COLORS.cobalt : opts.fill;
  const stroke = opts.stroke === undefined ? CULLING_COLORS.charcoal : opts.stroke;
  const color = opts.color || CULLING_COLORS.inverseText;
  const cut = opts.cut === undefined ? 9 : opts.cut;
  const alpha = disabled ? 0.5 : 1;
  const g = scene.graphics;
  g.fillStyle(CULLING_COLORS.shadow, disabled ? 0.08 : 0.22);
  g.fillPoints(clipPoints(x, y + 5, w, h, cut), true);
  g.fillStyle(fill, alpha);
  g.fillPoints(clipPoints(x, y, w, h, cut), true);
  g.fillStyle(0xffffff, disabled ? 0.08 : 0.17);
  g.fillPoints(clipPoints(x + 4, y + 4, w - 8, Math.max(8, h * 0.25), Math.max(3, cut - 4)), true);
  g.fillStyle(opts.brush === 'red' ? CULLING_COLORS.vermilion : CULLING_COLORS.gold, disabled ? 0.18 : 0.92);
  g.fillTriangle(x + w - 38, y, x + w, y, x + w, y + Math.min(h, 38));
  g.lineStyle(opts.strokeWidth || 1.5, stroke, disabled ? 0.16 : 0.34);
  g.strokePoints(clipPoints(x, y, w, h, cut), true);

  const titleY = opts.subtitle ? y + h / 2 - 18 : y + h / 2 - 11;
  scene.text(x + w / 2, titleY, label, {
    fontFamily: opts.display === false ? (TOKEN_TYPE.ui || 'Inter, Arial, sans-serif') : (TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif'),
    fontSize: opts.fontSize || `${Math.min(26, Math.max(16, Math.round(h * 0.3)))}px`,
    fontStyle: '900',
    color: disabled ? CULLING_COLORS.mutedText : color,
    align: 'center',
  }).setOrigin(0.5, 0);
  if (opts.subtitle) {
    scene.text(x + w / 2, y + h / 2 + 10, opts.subtitle, {
      fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
      fontSize: `${TYPE_SCALE.label}px`,
      fontStyle: '700',
      color: disabled ? CULLING_COLORS.mutedText : (opts.subtitleColor || color),
    }).setOrigin(0.5, 0);
  }
  scene.registerHitTarget(x, y, w, h, opts.accessibilityLabel || label, onClick, {
    disabled,
    disabledReason: opts.disabledReason || opts.reason,
    accessibilityId: opts.accessibilityId,
    cue: opts.cue,
  });
}

export function drawCurrentModeCard(scene, x, y, w, h, label, kicker, onClick, options) {
  const opts = options || {};
  drawCurrentPanel(scene, x, y, w, h, {
    fill: opts.fill === undefined ? CULLING_COLORS.ivory : opts.fill,
    stroke: opts.stroke === undefined ? CULLING_COLORS.charcoal : opts.stroke,
    accent: opts.accent === undefined ? CULLING_COLORS.cobalt : opts.accent,
    radius: 16,
    shadowY: 4,
    shadowAlpha: 0.13,
  });
  scene.mono(x + 13, y + 13, kicker, {
    color: opts.accentText || CULLING_COLORS.cobaltText,
    fontSize: '10px',
    fontStyle: '700',
  });
  const title = scene.text(x + 13, y + 34, label, {
    fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
    fontSize: w < 112 ? '12px' : '13px',
    fontStyle: '900',
    color: CULLING_COLORS.text,
    lineSpacing: 2,
    wordWrap: { width: w - 24 },
  });
  title.setMaxLines(2);
  scene.graphics.lineStyle(2, opts.accent || CULLING_COLORS.cobalt, 0.72);
  scene.graphics.beginPath();
  scene.graphics.moveTo(x + w - 26, y + h - 16);
  scene.graphics.lineTo(x + w - 12, y + h - 16);
  scene.graphics.lineTo(x + w - 17, y + h - 21);
  scene.graphics.moveTo(x + w - 12, y + h - 16);
  scene.graphics.lineTo(x + w - 17, y + h - 11);
  scene.graphics.strokePath();
  scene.registerHitTarget(x, y, w, h, opts.accessibilityLabel || label, onClick, {
    disabled: opts.disabled,
    disabledReason: opts.disabledReason || opts.reason,
    accessibilityId: opts.accessibilityId,
    cue: opts.cue,
  });
}

export function drawCurrentNav(scene, region, items) {
  const g = scene.graphics;
  g.fillStyle(CULLING_COLORS.ivory, 0.98);
  g.fillRect(region.x, region.y, region.w, region.h + 32);
  g.lineStyle(1, CULLING_COLORS.charcoal, 0.16);
  g.beginPath();
  g.moveTo(region.x, region.y);
  g.lineTo(region.x + region.w, region.y);
  g.strokePath();
  const itemW = region.w / items.length;
  items.forEach((item, index) => {
    const x = region.x + index * itemW;
    if (item.active) {
      g.fillStyle(CULLING_COLORS.cobalt, 0.1);
      g.fillRoundedRect(x + 8, region.y + 7, itemW - 16, region.h - 14, 14);
      g.fillStyle(CULLING_COLORS.cobalt, 0.9);
      g.fillRoundedRect(x + itemW / 2 - 13, region.y + 7, 26, 4, 2);
    }
    scene.text(x + itemW / 2, region.y + 22, item.label, {
      fontFamily: TOKEN_TYPE.ui || 'Inter, Arial, sans-serif',
      fontSize: `${TYPE_SCALE.label}px`,
      fontStyle: item.active ? '900' : '700',
      color: item.active ? CULLING_COLORS.cobaltText : CULLING_COLORS.mutedText,
    }).setOrigin(0.5, 0);
    scene.registerHitTarget(x + 6, region.y + 4, itemW - 12, region.h - 8, item.accessibilityLabel || item.label, item.onClick, {
      disabled: !!item.disabled,
      disabledReason: item.disabledReason || item.reason,
      accessibilityId: item.accessibilityId,
    });
  });
}
