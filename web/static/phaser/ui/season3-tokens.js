import {
  COLORS,
  CULLING_COLORS,
  TOKEN_TYPE,
  TYPE_SCALE,
} from '../core/runtime-config.js?v=36';

// Canonical Season 3 presentation tokens. The older UI helper modules keep
// their public names, but all three derive color and typography values from
// this one source so a compatibility surface cannot silently drift.
export const S3_PALETTE = Object.freeze({
  bone: CULLING_COLORS.ivory,
  boneBright: 0xf8f2e6,
  paper: 0xf8f2e6,
  smoke: 0xd6d1c7,
  smokeDeep: CULLING_COLORS.concrete,
  stormOchre: CULLING_COLORS.sky,
  ink: CULLING_COLORS.charcoal,
  indigo: CULLING_COLORS.cobalt,
  red: CULLING_COLORS.vermilion,
  cyan: CULLING_COLORS.cyan,
  cyanDeep: 0x087d86,
  gold: CULLING_COLORS.gold,
  green: COLORS.bodyGreen,
  domain: COLORS.domainViolet,
});

export const S3_TEXT_COLORS = Object.freeze({
  ink: CULLING_COLORS.text,
  muted: CULLING_COLORS.mutedText,
  inverse: '#F8F2E6',
  red: CULLING_COLORS.redText,
  cyan: '#087D86',
});

export const S3_SEMANTIC_COLORS = Object.freeze({
  selected: S3_PALETTE.gold,
  legalTarget: S3_PALETTE.cyan,
  danger: S3_PALETTE.red,
  queued: S3_PALETTE.green,
  domain: S3_PALETTE.domain,
});

export const S3_TOKENS = Object.freeze({
  palette: S3_PALETTE,
  text: S3_TEXT_COLORS,
  semantic: S3_SEMANTIC_COLORS,
  type: TOKEN_TYPE,
  typeScale: TYPE_SCALE,
});

export function season3ClipPoints(x, y, w, h, cut = 8) {
  const safeCut = Math.max(0, Math.min(cut, w / 4, h / 3));
  return [
    { x: x + safeCut, y },
    { x: x + w - safeCut, y },
    { x: x + w, y: y + safeCut },
    { x: x + w, y: y + h - safeCut },
    { x: x + w - safeCut, y: y + h },
    { x: x + safeCut, y: y + h },
    { x, y: y + h - safeCut },
    { x, y: y + safeCut },
  ];
}
