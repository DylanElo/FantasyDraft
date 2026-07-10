/* Ambient/motion FX, redrawn per-frame into a scene's fx overlay Graphics.
   Scenes register tasks during render(); BaseScene.update() replays them
   with the clock. Everything gates on reduced motion. */

import { COLORS, TOKEN_MOTION } from '../core/runtime-config.js?v=18';
import { clipConvex, polygonBounds } from './blade.js?v=18';
import { fillPoly } from './plate.js?v=18';

let reducedMotionQuery = null;

export function reducedMotion() {
  if (!reducedMotionQuery && typeof window !== 'undefined' && window.matchMedia) {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  if (typeof window !== 'undefined' && window.JJK_REDUCED_MOTION !== undefined) {
    return !!window.JJK_REDUCED_MOTION;
  }
  return !!(reducedMotionQuery && reducedMotionQuery.matches);
}

/* Shine sweep: skewed white band crossing a convex plate every ~3.2s. */
export function drawShine(g, poly, time, offsetMs = 0) {
  const period = 3200;
  const t = ((time + offsetMs) % period) / period;
  if (t < 0.62) return;
  const progress = (t - 0.62) / 0.38;
  const bounds = polygonBounds(poly);
  const bandW = 46;
  const skew = Math.tan((18 * Math.PI) / 180) * bounds.h;
  const x = bounds.x - bandW - skew + progress * (bounds.w + bandW * 2 + skew * 2);
  // Clip the plate polygon to the slanted band [x, x + bandW].
  const slope = skew / bounds.h;
  const layers = [
    { pad: 0, alpha: 0.3 },
    { pad: bandW * 0.28, alpha: 0.25 },
  ];
  layers.forEach((layer) => {
    const x0 = x + layer.pad;
    const x1 = x + bandW - layer.pad;
    let band = clipConvex(poly, -1, -slope, -(x0 - slope * bounds.y));
    band = clipConvex(band, 1, slope, x1 + slope * bounds.y);
    fillPoly(g, band, 0xffffff, layer.alpha);
  });
}

/* Breathing violet glow around the primary CTA. */
export function drawBreathe(g, poly, time, color = COLORS.curse500) {
  const period = 2400;
  const wave = (Math.sin(((time % period) / period) * Math.PI * 2) + 1) / 2;
  [
    { width: 10, alpha: 0.1 + wave * 0.14 },
    { width: 22, alpha: 0.04 + wave * 0.08 },
  ].forEach((ring) => {
    g.lineStyle(ring.width, color, ring.alpha);
    g.beginPath();
    g.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) g.lineTo(poly[i].x, poly[i].y);
    g.closePath();
    g.strokePath();
  });
}

/* Legal-target pulse: expanding teal stroke ring, 1200ms period. */
export function drawTargetPulse(g, x, y, baseRadius, time, offsetMs = 0) {
  const period = TOKEN_MOTION.targetPulseMs || 1200;
  const t = ((time + offsetMs) % period) / period;
  g.lineStyle(3, COLORS.target, 0.55 * (1 - t));
  g.strokeCircle(x, y, baseRadius + t * 9);
}

/* Legal-target pulse for card-shaped plates: expanding stroke around the
   polygon, 1200ms, teal only. */
export function drawTargetPulsePoly(g, poly, time, offsetMs = 0) {
  const period = TOKEN_MOTION.targetPulseMs || 1200;
  const t = ((time + offsetMs) % period) / period;
  g.lineStyle(3 + t * 8, COLORS.target, 0.5 * (1 - t));
  g.beginPath();
  g.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i += 1) g.lineTo(poly[i].x, poly[i].y);
  g.closePath();
  g.strokePath();
}

/* Drifting ember particles (curse-300), rising and fading. */
export function drawEmbers(g, xs, baseY, time) {
  const period = 5500;
  xs.forEach((x, index) => {
    const delay = index * 900;
    const t = (((time + delay) % period) / period);
    const alpha = t < 0.12 ? (t / 0.12) * 0.7 : 0.7 * (1 - (t - 0.12) / 0.88);
    const drift = Math.sin((time / 900) + index * 1.7) * 8;
    g.fillStyle(COLORS.curse300, Math.max(0, alpha));
    g.fillCircle(x + drift, baseY - t * 340, 2.5 * (1 - t * 0.6) + 0.6);
  });
}

/* Victory burst rays: rotating conic fan, very low alpha. */
export function drawRays(g, cx, cy, radius, time, color = COLORS.gold500) {
  const spin = ((time % 24000) / 24000) * Math.PI * 2;
  const rayCount = 15;
  const rayWidth = (9 * Math.PI) / 180;
  const step = (Math.PI * 2) / rayCount;
  g.fillStyle(color, 0.14);
  for (let i = 0; i < rayCount; i += 1) {
    const a0 = spin + i * step;
    const a1 = a0 + rayWidth;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius);
    g.lineTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
    g.closePath();
    g.fillPath();
  }
}

/* Reward pop-in: scale-from-0.55 translate-up with Back.easeOut overshoot.
   Applies to persistent game objects; call once after creating them. */
export function popIn(scene, targets, delayMs = 0) {
  const list = Array.isArray(targets) ? targets : [targets];
  if (reducedMotion()) return;
  list.forEach((node) => {
    const finalY = node.y;
    node.setScale(0.55);
    node.setAlpha(0);
    node.y = finalY + 18;
    scene.tweens.add({
      targets: node,
      scale: 1,
      alpha: 1,
      y: finalY,
      delay: delayMs,
      duration: TOKEN_MOTION.rewardPopMs || 380,
      ease: TOKEN_MOTION.easeOutBack || 'Back.easeOut',
    });
  });
}
