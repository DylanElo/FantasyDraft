import { CULLING_COLORS, ENERGY_COLORS } from '../core/runtime-config.js?v=57';

// Shared "energy pip" primitive: an ivory/charcoal-backed colored circle with
// an optional label above and a second line below (count, or current/after
// ratio). Combat's top HUD meter, skill-card cost pips, and Queue Review's
// cost orbs and pool/after meter each drew their own copy of this same
// fill/stroke/text sequence with only the geometry and color options
// differing - this consolidates that sequence into one place.
export function drawEnergyPip(scene, cx, cy, color, options = {}) {
  const opts = options;
  const tone = color === 'black' ? CULLING_COLORS.charcoal : (ENERGY_COLORS[color] || CULLING_COLORS.charcoal);
  const radius = opts.radius === undefined ? 6 : opts.radius;
  const backingColor = opts.backingColor === undefined ? CULLING_COLORS.ivory : opts.backingColor;
  const backingAlpha = opts.backingAlpha === undefined ? 0.98 : opts.backingAlpha;
  const backingRadius = opts.backingRadius === undefined ? radius + 2 : opts.backingRadius;
  const fillAlpha = opts.fillAlpha === undefined ? 0.96 : opts.fillAlpha;
  const strokeRadius = opts.strokeRadius === undefined ? radius + 1.3 : opts.strokeRadius;
  const strokeColor = opts.strokeColor === undefined
    ? (color === 'white' ? CULLING_COLORS.charcoal : tone)
    : opts.strokeColor;
  const strokeAlpha = opts.strokeAlpha === undefined ? 0.74 : opts.strokeAlpha;
  const strokeWidth = opts.strokeWidth === undefined ? 1 : opts.strokeWidth;

  const g = scene.graphics;
  g.fillStyle(backingColor, backingAlpha);
  g.fillCircle(cx, cy, backingRadius);
  g.fillStyle(tone, fillAlpha);
  g.fillCircle(cx, cy, radius);
  g.lineStyle(strokeWidth, strokeColor, strokeAlpha);
  g.strokeCircle(cx, cy, strokeRadius);

  if (opts.label !== undefined && opts.label !== null) {
    const labelStyle = {
      color: opts.labelColor === undefined ? (color === 'white' ? CULLING_COLORS.text : CULLING_COLORS.inverseText) : opts.labelColor,
      fontSize: opts.labelFontSize || '10px',
    };
    if (opts.labelFontStyle !== undefined) labelStyle.fontStyle = opts.labelFontStyle;
    scene.mono(cx, cy + (opts.labelOffsetY === undefined ? -4 : opts.labelOffsetY), opts.label, labelStyle).setOrigin(0.5, 0);
  }
  if (opts.below !== undefined && opts.below !== null) {
    const belowStyle = {
      color: opts.belowColor === undefined ? CULLING_COLORS.text : opts.belowColor,
      fontSize: opts.belowFontSize || '12px',
    };
    if (opts.belowFontStyle !== undefined) belowStyle.fontStyle = opts.belowFontStyle;
    scene.mono(cx, cy + (opts.belowOffsetY === undefined ? 9 : opts.belowOffsetY), opts.below, belowStyle).setOrigin(0.5, 0);
  }
}
