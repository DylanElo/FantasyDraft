/* Small shared game-HUD widgets: energy pips, HP bars, skewed tags.
   Pure draw helpers — hit areas stay in the scenes. */

import { COLORS, ENERGY_COLORS, ENERGY_LABELS } from '../core/runtime-config.js?v=18';
import { skewPointsX, tagPoints, lerpColor } from './blade.js?v=18';
import { fillPoly, strokePoly } from './plate.js?v=18';

/* Energy is never an icon — always a colored orb bead with its letter. */
export function drawEnergyPip(scene, g, x, y, colorKey, size, opts = {}) {
  const radius = size / 2;
  const tone = ENERGY_COLORS[colorKey] ?? COLORS.ink500;
  const filled = opts.filled !== false;
  g.fillStyle(COLORS.keyline, 1);
  g.fillCircle(x, y, radius + 1.5);
  g.fillStyle(tone, filled ? 1 : 0.16);
  g.fillCircle(x, y, radius);
  if (filled) {
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(x - radius * 0.28, y - radius * 0.32, radius * 0.34);
  }
  if (size >= 12 && opts.label !== false) {
    scene.nodeText(x, y, ENERGY_LABELS[colorKey] || 'X', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: `${Math.max(7, Math.round(size * 0.52))}px`,
      fontStyle: '700',
      color: filled ? '#0E0B16' : COLORS.dim,
    }).setOrigin(0.5, 0.5);
  }
}

export function drawCostPips(scene, g, x, y, cost, size, gap = 4) {
  (cost || []).slice(0, 6).forEach((colorKey, index) => {
    drawEnergyPip(scene, g, x + size / 2 + index * (size + gap), y, String(colorKey).toLowerCase(), size);
  });
  return (cost || []).length * (size + gap);
}

/* HP bar in an inset well. tone: 'hp' (green) | 'danger' (red) | 'gold'. */
export function drawHpBar(g, x, y, w, h, pct, tone = 'hp', opts = {}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const radius = h / 2;
  g.fillStyle(COLORS.keyline, 1);
  g.fillRoundedRect(x - 1.5, y - 1.5, w + 3, h + 3, radius + 1.5);
  g.fillStyle(COLORS.ink900, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  const fillColor = tone === 'danger' ? COLORS.red500 : tone === 'gold' ? COLORS.gold400 : COLORS.success;
  // Lagging damage ghost (orange) behind the live fill.
  if (opts.ghostPct !== undefined && opts.ghostPct > clamped) {
    const ghostW = Math.max(h, w * Math.min(1, opts.ghostPct));
    g.fillStyle(0xff8a3d, 0.8);
    g.fillRoundedRect(x, y, ghostW, h, radius);
  }
  if (clamped > 0) {
    const fillW = Math.max(h, w * clamped);
    g.fillStyle(lerpColor(fillColor, 0x000000, 0.25), 1);
    g.fillRoundedRect(x, y, fillW, h, radius);
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x, y, fillW, Math.max(2, h * 0.55), radius);
  }
}

/* Skewed arrow tag ("SEASON 4", "YOUR TURN"). Returns tag width. */
export function drawSkewTag(scene, g, x, y, text, opts = {}) {
  const fontSize = opts.fontSize || 11;
  const padX = opts.padX || 12;
  const notch = 10;
  const h = opts.height || fontSize + 12;
  const label = String(text).toUpperCase();
  const w = Math.round(label.length * fontSize * 0.82) + padX * 2 + notch;
  const points = skewPointsX(tagPoints(x, y, w, h, notch), -6);
  fillPoly(g, points, opts.bg === undefined ? COLORS.curse600 : opts.bg, 1);
  if (opts.keyline !== false) strokePoly(g, points, 2, COLORS.keyline, 1);
  scene.nodeText(x + padX, y + h / 2, label, {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: `${fontSize}px`,
    fontStyle: '900',
    letterSpacing: 2,
    color: opts.color || '#FFFFFF',
  }).setOrigin(0, 0.5);
  return w;
}
