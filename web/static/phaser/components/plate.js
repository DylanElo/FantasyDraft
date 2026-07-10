/* The ONE plate factory. Every raised element in the shell is drawn here:
   near-black keyline, vertical two-tone face (banded gradient — the canvas
   renderer has no polygon gradients), inner bevel (light top / dark bottom),
   and a hard 4px color ledge under pressable plates. Pressed plates
   translate down onto the ledge. */

import { TOKEN_PLATE } from '../core/runtime-config.js?v=18';
import {
  bladePoints,
  clipBand,
  lerpColor,
  polygonBounds,
  translatePoints,
} from './blade.js?v=18';

function fillPoly(g, points, color, alpha = 1) {
  if (points.length < 3) return;
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) g.lineTo(points[i].x, points[i].y);
  g.closePath();
  g.fillPath();
}

function strokePoly(g, points, width, color, alpha = 1) {
  if (points.length < 2) return;
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) g.lineTo(points[i].x, points[i].y);
  g.closePath();
  g.strokePath();
}

/* Vertical gradient over a convex polygon via horizontal bands. */
function fillPolyGradient(g, points, topColor, bottomColor, alpha = 1, bands = 8) {
  if (topColor === bottomColor) {
    fillPoly(g, points, topColor, alpha);
    return;
  }
  const bounds = polygonBounds(points);
  const step = bounds.h / bands;
  for (let i = 0; i < bands; i += 1) {
    const y0 = bounds.y + i * step;
    // Slight overlap avoids hairline seams between bands.
    const band = clipBand(points, y0 - 0.5, y0 + step + 0.5);
    fillPoly(g, band, lerpColor(topColor, bottomColor, bands === 1 ? 0 : i / (bands - 1)), alpha);
  }
}

export { fillPoly, strokePoly, fillPolyGradient };

/* Draw a plate from an arbitrary convex polygon.
   opts:
     fillTop / fillBottom  face gradient (fillBottom defaults to fillTop)
     alpha                 face alpha
     ledge                 0x color for the hard 4px ledge (omit for flat panels)
     pressed               translate face onto the ledge (press state)
     keyline               near-black outline, default true
     bevel                 inner bevel, default true
     glow                  { color, alpha, width } aura stroke outside keyline */
export function drawPlatePoly(g, points, opts = {}) {
  const plate = TOKEN_PLATE;
  const ledgeOffset = plate.ledgeOffset || 4;
  const pressDrop = opts.pressed ? Math.max(0, ledgeOffset - 1) : 0;
  const face = pressDrop ? translatePoints(points, 0, pressDrop) : points;
  const alpha = opts.alpha === undefined ? 1 : opts.alpha;

  if (opts.glow) {
    strokePoly(g, face, (opts.glow.width || 8), opts.glow.color, opts.glow.alpha === undefined ? 0.28 : opts.glow.alpha);
  }
  if (opts.ledge !== undefined && opts.ledge !== null && !opts.pressed) {
    const ledge = translatePoints(points, 0, ledgeOffset);
    fillPoly(g, ledge, plate.keylineColor, 1);
    fillPoly(g, translatePoints(points, 0, ledgeOffset - 1), opts.ledge, 1);
  }
  const keylineOn = opts.keyline !== false;
  if (keylineOn) {
    strokePoly(g, face, plate.keylineWidth || 3, plate.keylineColor, 1);
  }
  const fillTop = opts.fillTop === undefined ? 0x2c2340 : opts.fillTop;
  const fillBottom = opts.fillBottom === undefined ? fillTop : opts.fillBottom;
  fillPolyGradient(g, face, fillTop, fillBottom, alpha);

  if (opts.bevel !== false) {
    const bounds = polygonBounds(face);
    const topEdge = clipBand(face, bounds.y + 1, bounds.y + 3.5);
    fillPoly(g, topEdge, 0xffffff, plate.bevelTopAlpha || 0.28);
    const bottomEdge = clipBand(face, bounds.y + bounds.h - 4, bounds.y + bounds.h - 1);
    fillPoly(g, bottomEdge, 0x000000, plate.bevelBottomAlpha || 0.22);
  }
  return face;
}

/* Blade-cut plate — the primary plate shape.
   corners: 'br' | 'both' | 'none'; cut defaults to the 16px blade cut. */
export function drawBladePlate(g, x, y, w, h, opts = {}) {
  const points = bladePoints(x, y, w, h, opts.cut, opts.corners || 'br');
  drawPlatePoly(g, points, opts);
  return points;
}

/* Inset well (energy tray, battlefield floor): sunken, no ledge/bevel-up. */
export function drawWell(g, points, fill, opts = {}) {
  fillPoly(g, points, fill, opts.alpha === undefined ? 1 : opts.alpha);
  const bounds = polygonBounds(points);
  const topShadow = clipBand(points, bounds.y, bounds.y + 4);
  fillPoly(g, topShadow, 0x000000, 0.4);
  const bottomLight = clipBand(points, bounds.y + bounds.h - 1.5, bounds.y + bounds.h);
  fillPoly(g, bottomLight, 0xffffff, 0.05);
  strokePoly(g, points, 2, TOKEN_PLATE.keylineColor, 0.9);
}
