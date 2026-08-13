import { ENERGY_COLORS, ENERGY_LABELS, TOKEN_TYPE, TYPE_SCALE } from '../../core/runtime-config.js?v=58';
import { stageEnvironmentTexture } from '../../core/asset-registry.js?v=58';
import { safeText } from '../../core/text.js?v=58';
import { INCIDENT } from './tokens.js?v=58';

export function cutPoints(x, y, w, h, cut = 8, reverse = false) {
  const c = Math.max(0, Math.min(cut, w / 4, h / 3));
  return reverse
    ? [{ x, y }, { x: x + w - c, y }, { x: x + w, y: y + c }, { x: x + w, y: y + h }, { x: x + c, y: y + h }, { x, y: y + h - c }]
    : [{ x: x + c, y }, { x: x + w, y }, { x: x + w, y: y + h - c }, { x: x + w - c, y: y + h }, { x, y: y + h }, { x, y: y + c }];
}

export function drawIncidentWorld(scene, frame, textureKey, options = {}) {
  stageEnvironmentTexture(scene, textureKey);
  const image = scene.coverImage(textureKey, frame.x, 0, frame.width, frame.height, {
    depth: -30,
    alpha: options.imageAlpha ?? 1,
  });
  const g = scene.graphics;
  if (!image) {
    g.fillStyle(INCIDENT.indigo, 1);
    g.fillRect(frame.x, 0, frame.width, frame.height);
  }
  g.fillStyle(INCIDENT.indigo, options.topWash ?? 0.1);
  g.fillRect(frame.x, 0, frame.width, Math.max(82, frame.top + 56));
  const bottomH = options.bottomHeight ?? Math.round(frame.height * 0.23);
  g.fillStyle(INCIDENT.ink, options.bottomWash ?? 0.15);
  g.fillRect(frame.x, frame.height - bottomH, frame.width, bottomH);
  if (options.accents === false) return;
  g.lineStyle(2, INCIDENT.red, 0.56);
  g.beginPath();
  g.moveTo(frame.x - 8, frame.top + 126);
  g.lineTo(frame.x + frame.width * 0.72, frame.top + 98);
  g.lineTo(frame.x + frame.width + 8, frame.top + 110);
  g.strokePath();
  g.lineStyle(1, INCIDENT.bone, 0.22);
  for (let index = 0; index < 5; index += 1) {
    g.beginPath();
    g.moveTo(frame.x, frame.top + 150 + index * 31);
    g.lineTo(frame.x + 74 + index * 18, frame.top + 126 + index * 31);
    g.strokePath();
  }
}

export function drawIncidentSurface(scene, x, y, w, h, options = {}) {
  const g = scene.graphics;
  const points = cutPoints(x, y, w, h, options.cut ?? 8, options.reverse);
  g.fillStyle(INCIDENT.ink, options.shadowAlpha ?? 0.16);
  g.fillPoints(cutPoints(x + 2, y + 4, w, h, options.cut ?? 8, options.reverse), true);
  g.fillStyle(options.fill ?? INCIDENT.bone, options.alpha ?? 0.94);
  g.fillPoints(points, true);
  if (options.accent !== false) {
    const accent = options.accent ?? INCIDENT.red;
    g.fillStyle(accent, options.accentAlpha ?? 0.92);
    g.fillTriangle(x, y + h - Math.min(24, h), x, y + h, x + Math.min(28, w), y + h);
  }
  g.lineStyle(options.strokeWidth ?? 1.5, options.stroke ?? INCIDENT.ink, options.strokeAlpha ?? 0.74);
  g.strokePoints(points, true);
  return { x, y, w, h, points };
}

export function drawIncidentButton(scene, x, y, w, h, label, onClick, options = {}) {
  const disabled = !!options.disabled;
  const primary = options.variant === 'primary';
  drawIncidentSurface(scene, x, y, w, h, {
    fill: primary ? INCIDENT.red : options.fill ?? INCIDENT.bone,
    accent: primary ? INCIDENT.bone : options.accent ?? INCIDENT.cyan,
    alpha: disabled ? 0.58 : 0.98,
    stroke: primary ? INCIDENT.bone : INCIDENT.ink,
    cut: options.cut ?? 8,
    reverse: options.reverse,
  });
  scene.text(x + 12, y + h / 2 - 11, label, {
    fontFamily: options.mono ? (TOKEN_TYPE.mono || 'monospace') : (TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif'),
    fontSize: options.fontSize ?? `${Math.min(22, Math.max(13, Math.round(h * 0.34)))}px`,
    fontStyle: '900',
    color: disabled ? INCIDENT.mutedText : primary ? INCIDENT.inverse : (options.color ?? INCIDENT.text),
    align: 'left',
    wordWrap: { width: w - 42 },
  }).setOrigin(0, 0).setMaxLines(2);
  scene.text(x + w - 18, y + h / 2 - 15, '›', {
    fontFamily: TOKEN_TYPE.ui || 'Arial, sans-serif', fontSize: '28px', fontStyle: '900',
    color: disabled ? INCIDENT.mutedText : primary ? INCIDENT.inverse : INCIDENT.text,
  }).setOrigin(0.5, 0);
  scene.registerHitTarget(x, y, w, h, options.accessibilityLabel || label, onClick, {
    disabled,
    disabledReason: options.disabledReason || options.reason,
    accessibilityId: options.accessibilityId,
    cue: options.cue,
  });
}

export function drawIncidentChip(scene, x, y, label, options = {}) {
  const value = safeText(label);
  const h = options.h ?? 22;
  const w = options.w ?? Math.max(54, Math.min(options.maxW ?? 180, value.length * 7 + 18));
  scene.graphics.fillStyle(options.fill ?? INCIDENT.ink, options.alpha ?? 0.92);
  scene.graphics.fillPoints(cutPoints(x, y, w, h, 4), true);
  scene.mono(x + w / 2, y + 5, value, {
    color: options.color ?? INCIDENT.inverse,
    fontSize: options.fontSize ?? `${TYPE_SCALE.label}px`, fontStyle: '900',
  }).setOrigin(0.5, 0);
  return w;
}

export function drawIncidentHeader(scene, frame, options = {}) {
  const x = frame.x + 10;
  const y = frame.top;
  const w = frame.width - 20;
  scene.mono(x, y + 2, options.eyebrow ?? 'JJK ARENA', {
    color: options.accent === INCIDENT.red ? INCIDENT.redText : INCIDENT.cyanText,
    fontSize: `${TYPE_SCALE.label}px`, fontStyle: '900',
  });
  scene.text(x, y + 18, options.title ?? '', {
    fontFamily: TOKEN_TYPE.impact || TOKEN_TYPE.ui || 'Impact, sans-serif',
    fontSize: '25px', fontStyle: '900', color: INCIDENT.text,
    stroke: INCIDENT.bone, strokeThickness: 3,
  });
  scene.graphics.fillStyle(options.accent ?? INCIDENT.red, 0.9);
  scene.graphics.fillRect(x, y + 49, Math.min(w - 2, 166), 3);
  if (options.backHandler) {
    drawIncidentButton(scene, x + w - 72, y, 72, 44, 'BACK', options.backHandler, {
      fontSize: '13px', accessibilityLabel: options.backLabel || 'Back', accessibilityId: options.backAccessibilityId || 'back',
    });
  }
  return { x, y, w, h: 54, bottom: y + 54 };
}

export function drawIncidentPortrait(scene, characterOrId, x, y, w, h, options = {}) {
  const character = typeof characterOrId === 'string' ? scene.store.character(characterOrId) : characterOrId;
  scene.portraitArtwork(character || characterOrId || '', x, y, w, h, {
    context: options.context || scene.portraitContextFor(w, h), alpha: options.dead ? 0.3 : options.alpha ?? 1,
    dead: !!options.dead, tone: options.accent ?? INCIDENT.cyan,
  });
  scene.graphics.lineStyle(options.selected ? 3 : 1.5, options.accent ?? INCIDENT.cyan, options.dead ? 0.28 : 0.88);
  scene.graphics.strokePoints(cutPoints(x, y, w, h, options.cut ?? 6, options.reverse), true);
}

export function drawIncidentProgress(scene, x, y, w, h, value, options = {}) {
  const pct = Math.max(0, Math.min(1, Number(value) || 0));
  scene.graphics.fillStyle(INCIDENT.ink, 0.34); scene.graphics.fillRect(x, y, w, h);
  scene.graphics.fillStyle(options.fill ?? INCIDENT.cyan, 0.96); scene.graphics.fillRect(x, y, w * pct, h);
}

export function drawIncidentCost(scene, x, y, cost, options = {}) {
  const size = options.size ?? 14;
  const values = Array.isArray(cost) && cost.length ? cost.slice(0, 5) : ['free'];
  values.forEach((raw, index) => {
    const key = safeText(raw).toLowerCase();
    const cx = x + index * (size + (options.gap ?? 4));
    scene.graphics.fillStyle(key === 'free' ? INCIDENT.bone : key === 'black' ? INCIDENT.ink : (ENERGY_COLORS[key] ?? INCIDENT.concrete), 0.98);
    scene.graphics.fillCircle(cx, y, size / 2);
    scene.graphics.lineStyle(1, INCIDENT.ink, 0.72); scene.graphics.strokeCircle(cx, y, size / 2);
    scene.mono(cx, y - 5, key === 'free' ? '0' : (ENERGY_LABELS[key] || 'X'), {
      color: key === 'white' || key === 'free' ? INCIDENT.text : INCIDENT.inverse,
      fontSize: `${TYPE_SCALE.micro}px`, fontStyle: '900',
    }).setOrigin(0.5, 0);
  });
}

export function drawIncidentPager(scene, region, label, previous, next, options = {}) {
  drawIncidentButton(scene, region.x, region.y, 64, region.h, 'PREV', previous, { disabled: !!options.prevDisabled, fontSize: '11px' });
  drawIncidentButton(scene, region.x + region.w - 64, region.y, 64, region.h, 'NEXT', next, { disabled: !!options.nextDisabled, fontSize: '11px', reverse: true });
  scene.mono(region.x + region.w / 2, region.y + region.h / 2 - 5, label, {
    color: INCIDENT.text, fontSize: `${TYPE_SCALE.label}px`, fontStyle: '900',
  }).setOrigin(0.5, 0);
}
