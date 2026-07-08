(function () {
  'use strict';

  const colors = {
    voidBlack: '#050711',
    panelDeep: '#0B1020',
    panelRaised: '#111827',
    surfaceLine: '#273449',
    cursedPurple: '#A855F7',
    cursedPurpleGlow: 'rgba(168,85,247,0.34)',
    domainGold: '#F59E0B',
    cursedBlue: '#3B82F6',
    bloodRed: '#EF4444',
    bodyGreen: '#22C55E',
    focusWhite: '#F8FAFC',
    textMain: '#F8FAFC',
    textMuted: '#94A3B8',
    textDim: '#64748B',
  };

  window.JJK_MOBILE_TOKENS = {
    colors,
    phaserColors: {
      voidBlack: 0x050711,
      panelDeep: 0x0b1020,
      panelRaised: 0x111827,
      surfaceLine: 0x273449,
      cursedPurple: 0xa855f7,
      domainGold: 0xf59e0b,
      cursedBlue: 0x3b82f6,
      bloodRed: 0xef4444,
      bodyGreen: 0x22c55e,
      focusWhite: 0xf8fafc,
      textDim: 0x64748b,
    },
    energy: {
      body: { label: 'B', key: 'green', color: colors.bodyGreen, phaser: 0x22c55e },
      technique: { label: 'T', key: 'blue', color: colors.cursedBlue, phaser: 0x3b82f6 },
      focus: { label: 'F', key: 'white', color: colors.focusWhite, phaser: 0xf8fafc },
      curse: { label: 'C', key: 'red', color: colors.bloodRed, phaser: 0xef4444 },
      wild: { label: 'X', key: 'black', color: colors.panelRaised, phaser: 0x111827 },
    },
    energyPhaser: {
      green: 0x22c55e,
      blue: 0x3b82f6,
      white: 0xf8fafc,
      red: 0xef4444,
      black: 0x111827,
    },
    type: {
      display: 'Cinzel, Inter, serif',
      ui: 'Inter, Arial, sans-serif',
      mono: '"JetBrains Mono", monospace',
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
