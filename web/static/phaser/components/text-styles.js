/* Type ramp — Lilita One display (uppercase), Inter UI, JetBrains Mono stats.
   Phaser has no text-transform, so display/label helpers uppercase content. */

import { COLORS, TOKEN_TYPE } from '../core/runtime-config.js?v=18';

export const FONT_DISPLAY = TOKEN_TYPE.display || '"Lilita One", Inter, sans-serif';
export const FONT_UI = TOKEN_TYPE.ui || 'Inter, Arial, sans-serif';
export const FONT_MONO = TOKEN_TYPE.mono || '"JetBrains Mono", monospace';
export const FONT_KANJI = '"Yuji Mai", serif';

export function displayStyle(size, overrides = {}) {
  return {
    fontFamily: FONT_DISPLAY,
    fontSize: `${size}px`,
    color: COLORS.text,
    ...overrides,
  };
}

export function uiStyle(size, overrides = {}) {
  return {
    fontFamily: FONT_UI,
    fontSize: `${size}px`,
    fontStyle: '500',
    color: COLORS.text,
    ...overrides,
  };
}

/* Card/plate name — Inter black. */
export function h3Style(size, overrides = {}) {
  return uiStyle(size, { fontStyle: '900', ...overrides });
}

/* ALL-CAPS tracked label. Caller uppercases the string. */
export function labelStyle(size, overrides = {}) {
  return {
    fontFamily: FONT_UI,
    fontSize: `${size}px`,
    fontStyle: '700',
    color: COLORS.muted,
    letterSpacing: 1.4,
    ...overrides,
  };
}

export function eyebrowStyle(size, overrides = {}) {
  return labelStyle(size, { fontStyle: '900', letterSpacing: 2, ...overrides });
}

/* HP / cost / cooldown numerals — mono tabular. */
export function statStyle(size, overrides = {}) {
  return {
    fontFamily: FONT_MONO,
    fontSize: `${size}px`,
    fontStyle: '700',
    color: COLORS.text,
    ...overrides,
  };
}

export function upper(value) {
  return String(value === undefined || value === null ? '' : value).toUpperCase();
}
