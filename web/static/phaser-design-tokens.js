(function () {
  'use strict';

  const colors = {
    voidBlack: '#0B0C10',
    inkBlack: '#101114',
    surfaceDeep: '#16171B',
    surfaceRaised: '#181715',
    surfaceLine: '#3A3327',
    talismanPaper: '#D8C28A',
    talismanDim: '#8A7650',
    selectionGold: '#E6B84A',
    cursedTeal: '#20D0B2',
    domainViolet: '#7C3AED',
    sealRed: '#A92D2D',
    bloodRed: '#D43B3B',
    bodyGreen: '#4FB06D',
    techniqueBlue: '#3D6BFF',
    focusIvory: '#EDE9D5',
    textMain: '#F4EFE1',
    textMuted: '#A39A86',
    textDim: '#8C8371',
  };

  // Season 3 Culling Game visual system. Routine surfaces stay bone/smoke
  // light; indigo is structural ink, barrier red marks danger, cyan marks
  // cursed energy, and ochre/gold carries the storm-lit city atmosphere.
  const cullingCurrent = {
    warmIvory: '#F2E8D5',
    paleConcrete: '#B7B5AD',
    powderSky: '#B58B5B',
    cobalt: '#101B36',
    vermilion: '#E32620',
    electricCyan: '#35DDE8',
    sunGold: '#D8BF68',
    charcoal: '#17191E',
    mutedText: '#5F625F',
    softShadow: '#101B36',
  };

  window.JJK_MOBILE_TOKENS = {
    colors,
    cullingCurrent,
    cullingCurrentPhaser: {
      warmIvory: 0xf2e8d5,
      paleConcrete: 0xb7b5ad,
      powderSky: 0xb58b5b,
      cobalt: 0x101b36,
      vermilion: 0xe32620,
      electricCyan: 0x35dde8,
      sunGold: 0xd8bf68,
      charcoal: 0x17191e,
      mutedText: 0x5f625f,
      softShadow: 0x101b36,
    },
    phaserColors: {
      voidBlack: 0x0b0c10,
      inkBlack: 0x101114,
      surfaceDeep: 0x16171b,
      surfaceRaised: 0x181715,
      surfaceLine: 0x3a3327,
      talismanPaper: 0xd8c28a,
      talismanDim: 0x8a7650,
      selectionGold: 0xe6b84a,
      cursedTeal: 0x20d0b2,
      domainViolet: 0x7c3aed,
      sealRed: 0xa92d2d,
      bloodRed: 0xd43b3b,
      bodyGreen: 0x4fb06d,
      techniqueBlue: 0x3d6bff,
      focusIvory: 0xede9d5,
      textDim: 0x8c8371,
    },
    energy: {
      taijutsu: { label: 'T', name: 'Taijutsu', key: 'green', color: colors.bodyGreen, phaser: 0x4fb06d },
      jujutsu: { label: 'J', name: 'Jujutsu', key: 'blue', color: colors.techniqueBlue, phaser: 0x3d6bff },
      strategic: { label: 'S', name: 'Strategic', key: 'white', color: colors.focusIvory, phaser: 0xede9d5 },
      bloodline: { label: 'B', name: 'Bloodline', key: 'red', color: colors.bloodRed, phaser: 0xd43b3b },
      wild: { label: 'X', name: 'Wild', key: 'black', color: colors.surfaceRaised, phaser: 0x181715 },
    },
    energyPhaser: {
      green: 0x4fb06d,
      blue: 0x3d6bff,
      white: 0xede9d5,
      red: 0xd43b3b,
      black: 0x181715,
    },
    type: {
      display: '"Shippori Mincho B1", "Noto Serif JP", Georgia, serif',
      impact: '"Barlow Condensed", "Arial Narrow", Impact, sans-serif',
      ui: '"Zen Kaku Gothic New", Inter, Arial, sans-serif',
      mono: '"IBM Plex Mono", "JetBrains Mono", monospace',
    },
    radius: {
      panelMin: 18,
      panelMax: 24,
      skillCard: 14,
      skillCardLarge: 16,
      pill: 999,
    },
    motion: {
      pressMs: 120,
      sheetMs: 200,
      targetPulseMs: 800,
      damageRiseMs: 620,
      hpLagMs: 350,
      domainPulseMs: 3000,
    },
    frames: {
      small: { width: 360, height: 800 },
      primary: { width: 390, height: 844 },
      large: { width: 430, height: 932 },
      desktopCenterAt: 620,
    },
    touch: {
      minTarget: 44,
      lowerHalfPriority: 0.55,
    },
  };
})();
