import { ENERGY_COLORS, ENERGY_LABELS, TOKEN_TYPE, TYPE_SCALE } from '../core/runtime-config.js?v=38';
import { safeText } from '../core/text.js?v=38';
import { stageEnvironmentTexture } from '../core/asset-registry.js?v=38';
import {
  S3_PALETTE,
  S3_TEXT_COLORS,
  season3ClipPoints,
} from './season3-tokens.js?v=38';

// Compatibility view. New code should import Season3UI from season3-ui.js.
export const S3_COLORS = Object.freeze({
  bone: S3_PALETTE.bone,
  paper: S3_PALETTE.paper,
  smoke: S3_PALETTE.smoke,
  smokeDeep: S3_PALETTE.smokeDeep,
  ink: S3_PALETTE.ink,
  navy: S3_PALETTE.indigo,
  red: S3_PALETTE.red,
  cyan: S3_PALETTE.cyan,
  cyanDeep: S3_PALETTE.cyanDeep,
  gold: S3_PALETTE.gold,
  green: 0x3f8d61,
  whiteText: S3_TEXT_COLORS.inverse,
  inkText: S3_TEXT_COLORS.ink,
  mutedText: S3_TEXT_COLORS.muted,
  redText: '#B91F1A',
  cyanText: S3_TEXT_COLORS.cyan,
});

function clipPoints(x, y, w, h, cut = 8) {
  return season3ClipPoints(x, y, w, h, cut);
}

export function missionMapS3Layout(frame) {
  const x = frame.x + frame.gutter;
  const w = frame.width - frame.gutter * 2;
  const header = { x: frame.x + 10, y: frame.top, w: frame.width - 20, h: 62 };
  header.bottom = header.y + header.h;
  const cta = { x, y: frame.bottom - 50, w, h: 50 };
  const pager = { x, y: cta.y - 52, w, h: 44 };
  const locked = { x, y: pager.y - 98, w, h: 90 };
  const route = { x, y: header.bottom + 8, w, h: 64 };
  const cardTop = route.y + route.h + 10;
  const usableHeight = frame.bottom - frame.top;
  const pageSize = frame.width >= 430 && usableHeight >= 820 ? 2 : 1;
  const gap = 8;
  const available = locked.y - cardTop - 10 - gap * (pageSize - 1);
  const cardH = Math.max(190, Math.min(pageSize === 2 ? 218 : 250, Math.floor(available / pageSize)));
  return {
    frame,
    header,
    cta,
    pager,
    locked,
    route,
    cards: { x, y: cardTop, w, h: cardH, gap, pageSize },
    toastY: pager.y - 54,
  };
}

export function bootS3Layout(frame) {
  const x = frame.x + frame.gutter;
  const w = frame.width - frame.gutter * 2;
  const meter = { x, y: frame.bottom - 106, w, h: 8 };
  const enter = { x, y: meter.y + 22, w, h: 44 };
  const sigilSize = Math.min(154, Math.max(122, Math.round(frame.width * 0.38)));
  const sigil = {
    x: frame.x + (frame.width - sigilSize) / 2,
    y: Math.max(frame.top + 88, Math.min(Math.round(frame.height * 0.31), meter.y - sigilSize - 112)),
    w: sigilSize,
    h: sigilSize,
  };
  return {
    frame,
    sigil,
    title: { x, y: sigil.y + sigil.h + 18, w, h: 58 },
    meter,
    enter,
  };
}

export function draftS3Layout(frame, options = {}) {
  const cpu = options.cpu !== false;
  const x = frame.x + frame.gutter;
  const w = frame.width - frame.gutter * 2;
  const header = { x: frame.x + 10, y: frame.top, w: frame.width - 20, h: 62 };
  header.bottom = header.y + header.h;
  const cta = { x, y: frame.bottom - 50, w, h: 50 };
  const pager = { x, y: cta.y - 52, w, h: 44 };
  let y = header.bottom + 8;
  const player = { x, y, w, h: 62 };
  y = player.y + player.h + 8;
  const enemy = cpu ? { x, y, w, h: 62 } : null;
  if (enemy) y = enemy.y + enemy.h + 8;
  const difficulty = cpu ? { x, y, w, h: 44 } : null;
  if (difficulty) y = difficulty.y + difficulty.h + 8;
  const targets = { x, y, w, h: 44 };
  y = targets.y + targets.h + 8;
  const rosterLabelY = y;
  const roster = { x, y: rosterLabelY + 18, w, cardH: 110, gap: 8 };
  return {
    frame,
    header,
    player,
    enemy,
    difficulty,
    targets,
    rosterLabelY,
    roster,
    pager,
    cta,
    toastY: pager.y - 54,
  };
}

export function drawS3World(scene, frame, textureKey, options = {}) {
  const g = scene.graphics;
  stageEnvironmentTexture(scene, textureKey);
  const world = scene.coverImage(textureKey, frame.x, 0, frame.width, frame.height, {
    depth: -30,
    alpha: options.imageAlpha ?? 0.42,
  });
  if (!world) {
    g.fillGradientStyle(S3_COLORS.smoke, S3_COLORS.smoke, S3_COLORS.bone, S3_COLORS.paper, 1);
    g.fillRect(frame.x, 0, frame.width, frame.height);
  }

  g.fillStyle(S3_COLORS.bone, options.washAlpha ?? 0.68);
  g.fillRect(frame.x, 0, frame.width, frame.height);
  g.fillStyle(S3_COLORS.smoke, 0.32);
  g.fillRect(frame.x, frame.top, frame.width, Math.max(76, frame.height * 0.14));

  // Printed storm hatching and clipped barrier cuts from the Season-3 board.
  g.lineStyle(1, S3_COLORS.ink, 0.09);
  for (let index = 0; index < 12; index += 1) {
    const y = frame.top + 18 + index * 43;
    g.beginPath();
    g.moveTo(frame.x, y + 28);
    g.lineTo(frame.x + Math.min(frame.width, 116 + index * 7), y);
    g.strokePath();
  }
  g.lineStyle(2, S3_COLORS.red, 0.52);
  for (let index = 0; index < 4; index += 1) {
    const y = frame.top + 118 + index * 27;
    g.beginPath();
    g.moveTo(frame.x + frame.width - 94 + index * 8, y + 44);
    g.lineTo(frame.x + frame.width + 12, y - 18);
    g.strokePath();
  }
  g.lineStyle(1, S3_COLORS.cyan, 0.32);
  g.beginPath();
  g.moveTo(frame.x + 6, frame.bottom - 142);
  g.lineTo(frame.x + 92, frame.bottom - 186);
  g.lineTo(frame.x + 150, frame.bottom - 166);
  g.strokePath();
}

export function drawS3Panel(scene, x, y, w, h, options = {}) {
  const g = scene.graphics;
  const cut = options.cut ?? 8;
  const points = clipPoints(x, y, w, h, cut);
  const fill = options.fill ?? S3_COLORS.paper;
  const stroke = options.stroke ?? S3_COLORS.ink;
  const accent = options.accent ?? S3_COLORS.red;
  g.fillStyle(S3_COLORS.ink, options.shadowAlpha ?? 0.14);
  g.fillPoints(clipPoints(x + 3, y + 4, w, h, cut), true);
  g.fillStyle(fill, options.alpha ?? 0.96);
  g.fillPoints(points, true);
  if (options.wash !== false) {
    g.fillStyle(S3_COLORS.smoke, options.washAlpha ?? 0.22);
    g.fillTriangle(x + cut, y, x + Math.min(w * 0.56, 136), y, x, y + Math.min(h, 72));
  }
  g.fillStyle(accent, options.accentAlpha ?? 0.9);
  g.fillTriangle(x, y + h - 28, x, y + h - cut, x + 28, y + h);
  if (options.hatch !== false) {
    g.lineStyle(1, S3_COLORS.ink, 0.12);
    for (let index = 0; index < 4; index += 1) {
      const hx = x + w - 48 + index * 10;
      g.beginPath();
      g.moveTo(hx, y + 7);
      g.lineTo(Math.min(x + w - 5, hx + 27), y + 34);
      g.strokePath();
    }
  }
  g.lineStyle(options.strokeWidth ?? 2, stroke, options.strokeAlpha ?? 0.88);
  g.strokePoints(points, true);
  return { x, y, w, h, points };
}

export function drawS3Chip(scene, x, y, label, options = {}) {
  const text = safeText(label);
  const h = options.h ?? 22;
  const w = options.w ?? Math.max(54, Math.min(options.maxW ?? 180, text.length * 7 + 20));
  const fill = options.fill ?? S3_COLORS.ink;
  scene.graphics.fillStyle(fill, options.alpha ?? 0.96);
  scene.graphics.fillPoints(clipPoints(x, y, w, h, 4), true);
  scene.graphics.lineStyle(1, options.stroke ?? S3_COLORS.ink, 0.82);
  scene.graphics.strokePoints(clipPoints(x, y, w, h, 4), true);
  const node = scene.mono(x + w / 2, y + 5, text, {
    color: options.color ?? S3_COLORS.whiteText,
    fontSize: options.fontSize ?? `${TYPE_SCALE.label}px`,
    fontStyle: '800',
  }).setOrigin(0.5, 0);
  if (options.maxW) node.setWordWrapWidth(w - 10);
  return w;
}

export function drawS3Button(scene, x, y, w, h, label, onClick, options = {}) {
  const disabled = !!options.disabled;
  const variant = options.variant ?? 'bone';
  const fill = options.fill ?? (variant === 'primary' ? S3_COLORS.ink : variant === 'smoke' ? S3_COLORS.smoke : S3_COLORS.paper);
  const color = options.color ?? (variant === 'primary' ? S3_COLORS.whiteText : S3_COLORS.inkText);
  const accent = options.accent ?? (variant === 'primary' ? S3_COLORS.cyan : S3_COLORS.red);
  const g = scene.graphics;
  g.fillStyle(S3_COLORS.ink, disabled ? 0.08 : 0.18);
  g.fillPoints(clipPoints(x + 2, y + 4, w, h, options.cut ?? 7), true);
  g.fillStyle(fill, disabled ? 0.56 : 0.98);
  g.fillPoints(clipPoints(x, y, w, h, options.cut ?? 7), true);
  g.fillStyle(accent, disabled ? 0.22 : 0.9);
  g.fillTriangle(x + w - Math.min(34, w * 0.25), y, x + w, y, x + w, y + Math.min(34, h));
  g.lineStyle(options.strokeWidth ?? 2, options.stroke ?? S3_COLORS.ink, disabled ? 0.28 : 0.9);
  g.strokePoints(clipPoints(x, y, w, h, options.cut ?? 7), true);
  const node = scene.text(x + w / 2, y + h / 2 - 9, label, {
    fontFamily: options.mono ? (TOKEN_TYPE.mono || 'monospace') : (TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif'),
    fontSize: options.fontSize ?? `${Math.min(18, Math.max(13, Math.round(h * 0.32)))}px`,
    fontStyle: '900',
    color: disabled ? S3_COLORS.mutedText : color,
    align: 'center',
    wordWrap: { width: w - 16 },
  }).setOrigin(0.5, 0);
  node.setMaxLines(2);
  scene.registerHitTarget(x, y, w, h, safeText(options.accessibilityLabel || label), onClick, {
    disabled,
    disabledReason: options.disabledReason || options.reason,
    accessibilityId: options.accessibilityId,
    cue: options.cue,
  });
}

export function drawS3Header(scene, frame, options = {}) {
  const x = frame.x + 10;
  const y = frame.top;
  const w = frame.width - 20;
  const h = 62;
  drawS3Panel(scene, x, y, w, h, {
    fill: S3_COLORS.bone,
    accent: options.accent ?? S3_COLORS.red,
    cut: 10,
    washAlpha: 0.3,
  });
  scene.mono(x + 14, y + 8, options.eyebrow ?? 'JUJUTSU ARENA', {
    color: S3_COLORS.redText,
    fontSize: `${TYPE_SCALE.label}px`,
    fontStyle: '800',
  });
  scene.text(x + 14, y + 25, options.title ?? '', {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Arial, sans-serif',
    fontSize: '22px',
    fontStyle: '900',
    color: S3_COLORS.inkText,
  });
  if (options.backHandler) {
    drawS3Button(scene, x + w - 52, y + 9, 44, 44, '<', options.backHandler, {
      variant: 'bone',
      accent: S3_COLORS.cyan,
      fontSize: '16px',
      mono: true,
      accessibilityLabel: options.backLabel || 'Back',
      accessibilityId: options.backAccessibilityId || 'back',
    });
  }
  return { x, y, w, h, bottom: y + h };
}

export function drawS3Progress(scene, x, y, w, h, value, options = {}) {
  const pct = Math.max(0, Math.min(1, Number(value) || 0));
  const g = scene.graphics;
  g.fillStyle(S3_COLORS.smokeDeep, 0.5);
  g.fillRect(x, y, w, h);
  g.fillStyle(options.fill ?? S3_COLORS.cyan, 0.94);
  g.fillRect(x, y, w * pct, h);
  g.lineStyle(1.5, S3_COLORS.ink, 0.9);
  g.strokeRect(x, y, w, h);
  if (pct > 0) {
    g.fillStyle(options.marker ?? S3_COLORS.red, 0.95);
    g.fillRect(x + Math.max(0, w * pct - 2), y - 2, 3, h + 4);
  }
}

export function drawS3Portrait(scene, characterOrId, x, y, w, h, options = {}) {
  const character = typeof characterOrId === 'string' ? scene.store.character(characterOrId) : characterOrId;
  const id = character && (character.id || character.character_id);
  drawS3Panel(scene, x, y, w, h, {
    fill: options.fill ?? S3_COLORS.smoke,
    accent: options.accent ?? S3_COLORS.cyan,
    cut: options.cut ?? 5,
    strokeWidth: options.selected ? 3 : 1.5,
    hatch: false,
    wash: false,
    shadowAlpha: 0.08,
  });
  const inset = Math.min(4, Math.max(2, Math.floor(Math.min(w, h) * 0.08)));
  scene.portraitArtwork(character || id || '', x + inset, y + inset, Math.max(4, w - inset * 2), Math.max(4, h - inset * 2), {
    context: options.context || scene.portraitContextFor(w, h),
    alpha: options.alpha ?? 0.97,
    dead: !!options.dead,
    tone: options.accent ?? S3_COLORS.cyan,
  });
}

export function drawS3Cost(scene, x, y, cost, options = {}) {
  const size = options.size ?? 13;
  const gap = options.gap ?? 5;
  const colors = Array.isArray(cost) ? cost.slice(0, 5) : [];
  if (!colors.length) {
    scene.graphics.fillStyle(S3_COLORS.paper, 0.94);
    scene.graphics.fillCircle(x, y, size / 2);
    scene.graphics.lineStyle(1.5, S3_COLORS.green, 0.9);
    scene.graphics.strokeCircle(x, y, size / 2);
    scene.mono(x, y - 5, '0', { color: S3_COLORS.inkText, fontSize: `${TYPE_SCALE.micro}px`, fontStyle: '800' }).setOrigin(0.5, 0);
    return;
  }
  colors.forEach((raw, index) => {
    const color = safeText(raw).toLowerCase();
    const cx = x + index * (size + gap);
    const fill = color === 'black' ? S3_COLORS.ink : (ENERGY_COLORS[color] ?? S3_COLORS.smokeDeep);
    scene.graphics.fillStyle(fill, 0.98);
    scene.graphics.fillCircle(cx, y, size / 2);
    scene.graphics.lineStyle(1.5, color === 'white' ? S3_COLORS.ink : S3_COLORS.paper, 0.92);
    scene.graphics.strokeCircle(cx, y, size / 2);
    scene.mono(cx, y - 5, ENERGY_LABELS[color] || 'X', {
      color: color === 'white' ? S3_COLORS.inkText : S3_COLORS.whiteText,
      fontSize: `${TYPE_SCALE.micro}px`,
      fontStyle: '900',
    }).setOrigin(0.5, 0);
  });
}

export function drawS3Pager(scene, region, label, previous, next, options = {}) {
  const buttonW = options.buttonW ?? 70;
  drawS3Button(scene, region.x, region.y, buttonW, region.h, 'Prev', previous, {
    variant: 'bone',
    disabled: !!options.prevDisabled,
    mono: true,
    fontSize: '12px',
  });
  const nextX = region.x + region.w - buttonW;
  drawS3Button(scene, nextX, region.y, buttonW, region.h, 'Next', next, {
    variant: 'bone',
    disabled: !!options.nextDisabled,
    mono: true,
    fontSize: '12px',
  });
  scene.mono(region.x + region.w / 2, region.y + region.h / 2 - 6, label, {
    color: S3_COLORS.inkText,
    fontSize: `${TYPE_SCALE.label}px`,
    fontStyle: '800',
  }).setOrigin(0.5, 0);
}
