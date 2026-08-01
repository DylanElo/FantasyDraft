export function clippedPoints(x, y, w, h, cut = 8) {
  return [
    { x: x + cut, y },
    { x: x + w, y },
    { x: x + w, y: y + h - cut },
    { x: x + w - cut, y: y + h },
    { x, y: y + h },
    { x, y: y + cut },
  ];
}
