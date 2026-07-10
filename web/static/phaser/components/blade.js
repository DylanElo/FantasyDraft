/* Blade-cut geometry — canvas-side equivalents of the design system's
   --clip-blade / --clip-blade-both / --clip-tag / --clip-banner polygons.
   All shapes are convex, so gradient banding and FX sweeps clip with a
   simple half-plane routine. Coordinates are absolute pixels. */

export const BLADE_CUT = 16;

/* --clip-blade: square except a 16px cut on the bottom-right corner.
   corners: 'br' (default), 'both' (top-left + bottom-right), 'none'. */
export function bladePoints(x, y, w, h, cut = BLADE_CUT, corners = 'br') {
  const c = Math.min(cut, w / 2, h / 2);
  if (corners === 'none') {
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }
  if (corners === 'both') {
    return [
      { x: x + c, y },
      { x: x + w, y },
      { x: x + w, y: y + h - c },
      { x: x + w - c, y: y + h },
      { x, y: y + h },
      { x, y: y + c },
    ];
  }
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h - c },
    { x: x + w - c, y: y + h },
    { x, y: y + h },
  ];
}

/* --clip-tag: rectangle with an arrow point on the right edge. */
export function tagPoints(x, y, w, h, notch = 10) {
  return [
    { x, y },
    { x: x + w - notch, y },
    { x: x + w, y: y + h / 2 },
    { x: x + w - notch, y: y + h },
    { x, y: y + h },
  ];
}

/* --clip-banner: trapezoid, top wider than bottom. */
export function bannerPoints(x, y, w, h, slant = 22) {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w - slant, y: y + h },
    { x: x + slant, y: y + h },
  ];
}

export function translatePoints(points, dx, dy) {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

/* Skew a polygon horizontally around its vertical center (skewX(-6deg)
   season/turn tags). Positive degrees lean the top edge to the right. */
export function skewPointsX(points, degrees) {
  const tan = Math.tan((degrees * Math.PI) / 180);
  let cy = 0;
  points.forEach((p) => { cy += p.y; });
  cy /= points.length || 1;
  return points.map((p) => ({ x: p.x + (cy - p.y) * tan, y: p.y }));
}

/* Sutherland–Hodgman against one half-plane: keeps ax + by <= c. */
export function clipConvex(points, a, b, c) {
  const out = [];
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const cur = points[i];
    const next = points[(i + 1) % n];
    const curIn = a * cur.x + b * cur.y <= c;
    const nextIn = a * next.x + b * next.y <= c;
    if (curIn) out.push(cur);
    if (curIn !== nextIn) {
      const da = a * (next.x - cur.x) + b * (next.y - cur.y);
      const t = da === 0 ? 0 : (c - (a * cur.x + b * cur.y)) / da;
      out.push({ x: cur.x + (next.x - cur.x) * t, y: cur.y + (next.y - cur.y) * t });
    }
  }
  return out;
}

/* Keep only the horizontal band y0..y1 of a convex polygon. */
export function clipBand(points, y0, y1) {
  return clipConvex(clipConvex(points, 0, -1, -y0), 0, 1, y1);
}

export function polygonBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function lerpColor(from, to, t) {
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return (r << 16) | (g << 8) | b;
}
