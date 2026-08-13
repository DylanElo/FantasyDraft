(function () {
  'use strict';

  // Night Parade — candidate replacement for web/static/phaser-design-tokens.js
  //
  // Shape deliberately mirrors the existing JJK_MOBILE_TOKENS export so a swap is
  // mechanical. Energy semantics are copied from the current file UNCHANGED:
  // they are gameplay law, not art direction, and must not be re-tinted to suit
  // a palette. X remains a Wild cost placeholder, never a fifth resource.
  //
  // BLOCKING NOTE FOR CODEX: adopting this file contradicts the locked Incident
  // Cut direction in docs/season3_visual_system.md (daylight bone/concrete).
  // Night Parade is nocturnal. Do not apply it until that decision record is
  // explicitly superseded by the user; per AGENTS.md, report the conflict first.

  const colors = {
    voidNavy: '#070A14',      // page ground
    veilIndigo: '#121A30',    // raised surface
    veilRaised: '#18213C',    // chips, secondary fills
    surfaceLine: '#26314F',   // hairlines, borders
    paperBone: '#EDE8DB',     // primary text
    textMuted: '#8B93AC',     // secondary text
    cursedCyan: '#45E0EA',    // actionable / legal target / cursed energy
    barrierCrimson: '#FF4438',// threat, damage, danger only
    agedGold: '#E4C475',      // commitment and selection
    domainViolet: '#9B7BD6',  // domain and cinematic states only
  };

  // Unchanged from the shipping token file. Do not reinterpret.
  const energyColors = {
    bodyGreen: '#4FB06D',
    techniqueBlue: '#3D6BFF',
    focusIvory: '#EDE9D5',
    bloodRed: '#D43B3B',
    wildPlaceholder: '#181715',
  };

  window.JJK_MOBILE_TOKENS_NIGHT_PARADE = {
    colors,
    nightParadePhaser: {
      voidNavy: 0x070a14,
      veilIndigo: 0x121a30,
      veilRaised: 0x18213c,
      surfaceLine: 0x26314f,
      paperBone: 0xede8db,
      textMuted: 0x8b93ac,
      cursedCyan: 0x45e0ea,
      barrierCrimson: 0xff4438,
      agedGold: 0xe4c475,
      domainViolet: 0x9b7bd6,
    },
    // Identical to the current shipping contract.
    energy: {
      taijutsu: { label: 'T', name: 'Taijutsu', key: 'green', color: energyColors.bodyGreen, phaser: 0x4fb06d },
      jujutsu: { label: 'J', name: 'Jujutsu', key: 'blue', color: energyColors.techniqueBlue, phaser: 0x3d6bff },
      strategic: { label: 'S', name: 'Strategic', key: 'white', color: energyColors.focusIvory, phaser: 0xede9d5 },
      bloodline: { label: 'B', name: 'Bloodline', key: 'red', color: energyColors.bloodRed, phaser: 0xd43b3b },
      wild: { label: 'X', name: 'Wild', key: 'black', color: energyColors.wildPlaceholder, phaser: 0x181715 },
    },
    energyPhaser: {
      green: 0x4fb06d,
      blue: 0x3d6bff,
      white: 0xede9d5,
      red: 0xd43b3b,
      black: 0x181715,
    },
    // Semantic combat state, kept separate from the accent hue.
    state: {
      queued: '#4FB06D',
      legalTarget: '#45E0EA',
      committed: '#E4C475',
      threat: '#FF4438',
      stunned: '#FF4438',
      destructibleDefense: '#45E0EA',
    },
    type: {
      display: '"Bahnschrift SemiBold Condensed", "Barlow Condensed", "Arial Narrow", sans-serif',
      ui: '"Segoe UI", Inter, system-ui, sans-serif',
      mono: '"Cascadia Code", "IBM Plex Mono", Consolas, monospace',
    },
    radius: {
      panel: 4,
      card: 4,
      chip: 3,
      pill: 999,
    },
    // Measured from the prototype's tween durations.
    motion: {
      pressMs: 80,
      viewEnterMs: 280,
      lungeMs: 150,
      lungeHeavyMs: 230,
      projectileMs: 300,
      recoverMs: 200,
      flinchMs: 260,
      hitStopMs: 55,
      deathFadeMs: 520,
      damageRiseMs: 900,
      targetPulseMs: 360,
      beatGapMs: 230,
    },
    frames: {
      small: { width: 360, height: 800 },
      primary: { width: 390, height: 844 },
      large: { width: 430, height: 932 },
      desktopCenterAt: 440,
    },
    touch: {
      minTarget: 44,
      lowerHalfPriority: 0.55,
    },
    // Canvas stage composition, as fractions of stage height.
    stage: {
      enemyRow: 0.32,
      allyRow: 0.55,
      horizon: 0.62,
      scrimTop: 0.60,
      enemyScale: 0.80,
      allyScale: 0.92,
      hpBarOffsetPx: 116,
    },
  };
})();
