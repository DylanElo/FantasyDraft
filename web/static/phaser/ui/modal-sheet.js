import { CULLING_COLORS } from '../core/runtime-config.js?v=43';
import { drawCurrentButton, drawCurrentPanel } from './culling-current-ui.js?v=43';

// Shared chrome for full-screen modal sheets (skill detail, fighter status
// inspection): a dim backdrop, the card panel, a full-frame blocking hit
// target so background isn't tappable, a "x" dismiss button, and an optional
// footer action button. Both combat sheets independently drew this exact
// sequence with only the dim rect/tone/footer geometry differing - this
// consolidates the sequence while letting each caller reproduce its own
// prior geometry exactly via options.
export function renderModalSheetChrome(scene, frame, options = {}) {
  const opts = options;
  const { x, y, w, h } = opts;

  scene.graphics.fillStyle(
    opts.dimColor === undefined ? CULLING_COLORS.charcoal : opts.dimColor,
    opts.dimAlpha === undefined ? 0.28 : opts.dimAlpha,
  );
  scene.graphics.fillRect(
    opts.dimX === undefined ? frame.x : opts.dimX,
    opts.dimY === undefined ? 0 : opts.dimY,
    opts.dimW === undefined ? frame.width : opts.dimW,
    opts.dimH === undefined ? frame.height : opts.dimH,
  );

  const tone = opts.tone === undefined ? CULLING_COLORS.gold : opts.tone;
  drawCurrentPanel(scene, x, y, w, h, {
    fill: opts.fill === undefined ? CULLING_COLORS.ivory : opts.fill,
    stroke: tone,
    accent: tone,
    radius: opts.radius === undefined ? 18 : opts.radius,
    alpha: opts.panelAlpha === undefined ? 0.995 : opts.panelAlpha,
    shadowY: 0,
    shadowAlpha: 0.28,
  });

  scene.buttons.push({
    x: 0,
    y: 0,
    w: opts.blockW === undefined ? (frame.fullWidth || frame.width) : opts.blockW,
    h: opts.blockH === undefined ? (frame.fullHeight || frame.height) : opts.blockH,
    label: opts.overlayLabel || 'Modal overlay',
    onClick: () => {},
    disabled: false,
  });

  drawCurrentButton(scene, x + w - 56, y + 12, 44, 44, '×', opts.onClose, {
    fill: CULLING_COLORS.vermilion,
    stroke: CULLING_COLORS.charcoal,
    color: CULLING_COLORS.inverseText,
    fontSize: '18px',
    display: false,
    radius: 10,
    brush: 'red',
  });

  if (opts.footerLabel) {
    drawCurrentButton(
      scene,
      opts.footerX === undefined ? x + 17 : opts.footerX,
      opts.footerY === undefined ? frame.bottom - 44 : opts.footerY,
      opts.footerW === undefined ? w - 34 : opts.footerW,
      44,
      opts.footerLabel,
      opts.onFooterAction || opts.onClose,
      {
        fill: CULLING_COLORS.cobalt,
        stroke: CULLING_COLORS.charcoal,
        color: CULLING_COLORS.inverseText,
        fontSize: '14px',
        display: false,
        radius: 12,
      },
    );
  }

  return { x, y, w, h };
}
