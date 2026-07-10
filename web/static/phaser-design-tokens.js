/* Cursed Arena — Phaser design tokens.
   Same shape as web/static/phaser-design-tokens.js in the FantasyDraft repo,
   regenerated from the design system's tokens/*.css. Drop-in replacement:
   exposes window.JJK_MOBILE_TOKENS (alias window.CURSED_ARENA_TOKENS). */
(function () {
  'use strict';

  const colors = {
    ink950: '#0E0B16',
    ink900: '#171223',
    ink800: '#211A31',
    ink700: '#2C2340',
    ink500: '#4E4169',
    ink300: '#9285A9',
    ink100: '#E6E0EE',
    paper: '#FFFDF7',
    curse900: '#2E1065',
    curse600: '#6D28D9',
    curse500: '#8B3FF0',
    curse400: '#A855F7',
    curse300: '#C084FC',
    gold800: '#8A5A12',
    gold500: '#F0A82E',
    gold400: '#FBBF42',
    gold300: '#FFD873',
    teal500: '#17B39B',
    teal400: '#38D9BE',
    red600: '#D8203B',
    red500: '#F03A52',
    red400: '#FF6B7E',
    textMain: '#FBF8FF',
    textDim: '#C3B9D2',
    textMuted: '#9285A9',
  };

  const hex = (c) => parseInt(c.slice(1), 16);
  const phaserColors = {};
  Object.keys(colors).forEach((k) => { phaserColors[k] = hex(colors[k]); });

  window.JJK_MOBILE_TOKENS = window.CURSED_ARENA_TOKENS = {
    colors,
    phaserColors,
    energy: {
      body:      { label: 'B', key: 'green', color: '#3FBE6B', phaser: 0x3fbe6b },
      technique: { label: 'T', key: 'blue',  color: '#3D7BFF', phaser: 0x3d7bff },
      focus:     { label: 'F', key: 'gold',  color: '#FBBF42', phaser: 0xfbbf42 },
      curse:     { label: 'C', key: 'red',   color: '#D8203B', phaser: 0xd8203b },
      wild:      { label: 'X', key: 'wild',  color: '#4E4169', phaser: 0x4e4169 },
    },
    combatStates: {
      selected:   { color: colors.gold400, phaser: phaserColors.gold400 },   /* gold ring/plate */
      legalTarget:{ color: colors.teal400, phaser: phaserColors.teal400 },   /* teal pulse */
      threat:     { color: colors.red500,  phaser: phaserColors.red500 },    /* enemy/damage only */
      domain:     { color: colors.curse400, phaser: phaserColors.curse400 }, /* cinematic only */
    },
    rarity: {
      common:    { color: '#9285A9', phaser: 0x9285a9 },
      rare:      { color: '#3D7BFF', phaser: 0x3d7bff },
      epic:      { color: '#A855F7', phaser: 0xa855f7 },
      legendary: { color: '#F0A82E', phaser: 0xf0a82e },
    },
    type: {
      display: '"Lilita One", Inter, sans-serif',
      ui: 'Inter, Arial, sans-serif',
      mono: '"JetBrains Mono", monospace',
    },
    radius: {
      panelMin: 16, panelMax: 28, skillCard: 16, skillCardLarge: 22, pill: 999,
    },
    plate: {
      keylineWidth: 3,          /* near-black sticker outline */
      keylineColor: 0x0e0b16,
      ledgeOffset: 4,           /* hard 0 4px 0 colored ledge under buttons */
      bevelTopAlpha: 0.28,      /* light inner top edge */
      bevelBottomAlpha: 0.22,   /* dark inner bottom edge */
    },
    motion: {
      pressMs: 80, sheetMs: 240, targetPulseMs: 1200,
      damageRiseMs: 620, hpLagMs: 500, domainPulseMs: 3000, rewardPopMs: 380,
      easeOutBack: 'Back.easeOut', easeSnap: 'Cubic.easeOut', easeImpact: 'Quart.easeInOut',
    },
    frames: {
      small: { width: 360, height: 800 },
      primary: { width: 390, height: 844 },
      large: { width: 430, height: 932 },
      desktopCenterAt: 620,
    },
    touch: { minTarget: 44, lowerHalfPriority: 0.55 },
  };
})();
