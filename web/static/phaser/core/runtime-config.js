const DESIGN_TOKENS = globalThis.JJK_MOBILE_TOKENS || {};
const TOKEN_COLORS = DESIGN_TOKENS.phaserColors || {};
const TOKEN_TEXT = DESIGN_TOKENS.colors || {};
const bootstrap = globalThis.JJK_BOOTSTRAP || {};

export const TOKEN_TYPE = DESIGN_TOKENS.type || {};
export const TOKEN_RADIUS = DESIGN_TOKENS.radius || {};
export const TOKEN_FRAMES = DESIGN_TOKENS.frames || {};
export const TOKEN_TOUCH = DESIGN_TOKENS.touch || {};
export const TOKEN_MOTION = DESIGN_TOKENS.motion || {};
export const TOKEN_PLATE = DESIGN_TOKENS.plate || {
  keylineWidth: 3,
  keylineColor: 0x0e0b16,
  ledgeOffset: 4,
  bevelTopAlpha: 0.28,
  bevelBottomAlpha: 0.22,
};
export const COMBAT_STATES = DESIGN_TOKENS.combatStates || {};
export const RARITY = DESIGN_TOKENS.rarity || {};

/* Numeric (0x) fills for Graphics. Ink-plum neutral floor, curse violet
   brand, talisman gold, cursed teal, blood red — see design system readme. */
export const COLORS = {
  // ink neutrals
  ink950: TOKEN_COLORS.ink950 ?? 0x0e0b16,
  ink900: TOKEN_COLORS.ink900 ?? 0x171223,
  ink800: TOKEN_COLORS.ink800 ?? 0x211a31,
  ink700: TOKEN_COLORS.ink700 ?? 0x2c2340,
  ink500: TOKEN_COLORS.ink500 ?? 0x4e4169,
  ink300: TOKEN_COLORS.ink300 ?? 0x9285a9,
  ink100: TOKEN_COLORS.ink100 ?? 0xe6e0ee,
  paper: TOKEN_COLORS.paper ?? 0xfffdf7,
  // curse violet — brand voltage; violet chrome is domain/cinematic ONLY
  curse900: TOKEN_COLORS.curse900 ?? 0x2e1065,
  curse600: TOKEN_COLORS.curse600 ?? 0x6d28d9,
  curse500: TOKEN_COLORS.curse500 ?? 0x8b3ff0,
  curse400: TOKEN_COLORS.curse400 ?? 0xa855f7,
  curse300: TOKEN_COLORS.curse300 ?? 0xc084fc,
  // talisman gold — currency, rarity, victory, selected caster/skill
  gold800: TOKEN_COLORS.gold800 ?? 0x8a5a12,
  gold500: TOKEN_COLORS.gold500 ?? 0xf0a82e,
  gold400: TOKEN_COLORS.gold400 ?? 0xfbbf42,
  gold300: TOKEN_COLORS.gold300 ?? 0xffd873,
  // cursed teal — legal target pulse only
  teal500: TOKEN_COLORS.teal500 ?? 0x17b39b,
  teal400: TOKEN_COLORS.teal400 ?? 0x38d9be,
  // blood red — enemy threat / damage only
  red600: TOKEN_COLORS.red600 ?? 0xd8203b,
  red500: TOKEN_COLORS.red500 ?? 0xf03a52,
  red400: TOKEN_COLORS.red400 ?? 0xff6b7e,
};

// Plate keyline (near-black sticker outline)
COLORS.keyline = TOKEN_PLATE.keylineColor;

// Strict combat-state colors (see design system: these four are law)
COLORS.selection = (COMBAT_STATES.selected && COMBAT_STATES.selected.phaser) ?? COLORS.gold400;
COLORS.target = (COMBAT_STATES.legalTarget && COMBAT_STATES.legalTarget.phaser) ?? COLORS.teal400;
COLORS.enemy = (COMBAT_STATES.threat && COMBAT_STATES.threat.phaser) ?? COLORS.red500;
COLORS.domain = (COMBAT_STATES.domain && COMBAT_STATES.domain.phaser) ?? COLORS.curse400;

// Routine chrome (never the four combat states)
COLORS.success = 0x3fbe6b;

// CSS text colors
COLORS.text = TOKEN_TEXT.textMain || '#FBF8FF';
COLORS.muted = TOKEN_TEXT.textDim || '#C3B9D2';
COLORS.dim = TOKEN_TEXT.textMuted || '#9285A9';
COLORS.goldText = TOKEN_TEXT.gold400 || '#FBBF42';
COLORS.goldTextSoft = TOKEN_TEXT.gold300 || '#FFD873';
COLORS.tealText = TOKEN_TEXT.teal400 || '#38D9BE';
COLORS.redText = TOKEN_TEXT.red500 || '#F03A52';
COLORS.curseText = TOKEN_TEXT.curse300 || '#C084FC';
COLORS.inkText = TOKEN_TEXT.ink950 || '#0E0B16';

const TOKEN_ENERGY = DESIGN_TOKENS.energy || {};

/* Server cost/energy keys stay green/blue/white/red/black; display colors
   come from the design system energy set (focus is gold now, not ivory). */
export const ENERGY_COLORS = {
  green: (TOKEN_ENERGY.body && TOKEN_ENERGY.body.phaser) ?? 0x3fbe6b,
  blue: (TOKEN_ENERGY.technique && TOKEN_ENERGY.technique.phaser) ?? 0x3d7bff,
  white: (TOKEN_ENERGY.focus && TOKEN_ENERGY.focus.phaser) ?? 0xfbbf42,
  red: (TOKEN_ENERGY.curse && TOKEN_ENERGY.curse.phaser) ?? 0xd8203b,
  black: (TOKEN_ENERGY.wild && TOKEN_ENERGY.wild.phaser) ?? 0x4e4169,
};

export const ENERGY_TEXT_COLORS = {
  green: (TOKEN_ENERGY.body && TOKEN_ENERGY.body.color) || '#3FBE6B',
  blue: (TOKEN_ENERGY.technique && TOKEN_ENERGY.technique.color) || '#3D7BFF',
  white: (TOKEN_ENERGY.focus && TOKEN_ENERGY.focus.color) || '#FBBF42',
  red: (TOKEN_ENERGY.curse && TOKEN_ENERGY.curse.color) || '#D8203B',
  black: (TOKEN_ENERGY.wild && TOKEN_ENERGY.wild.color) || '#4E4169',
};

export const CORE_ENERGY = ['green', 'blue', 'white', 'red'];

export const ENERGY_LABELS = {
  green: 'B',
  blue: 'T',
  white: 'F',
  red: 'C',
  black: 'X',
};

export const BOOT = {
  playerId: bootstrap.playerId || (typeof PLAYER_SESSION_ID !== 'undefined' ? PLAYER_SESSION_ID : 'player'),
  battleV2Enabled: bootstrap.battleV2Enabled ?? (typeof BATTLE_V2_ENABLED !== 'undefined' ? BATTLE_V2_ENABLED : false),
  roster: bootstrap.roster || (typeof BATTLE_V2_STARTER_ROSTER !== 'undefined' ? BATTLE_V2_STARTER_ROSTER : {}),
  firstCreation: bootstrap.firstCreation || (typeof FIRST_CREATION !== 'undefined' ? FIRST_CREATION : {}),
};

export const LOCAL_PORTRAIT_FILES = new Set([
  'aoi-todo.svg',
  'gojo-unsealed.svg',
  'gojo-young.svg',
  'hiromi-higuruma.svg',
  'kenjaku.svg',
  'mahito.svg',
  'maki-zenin.svg',
  'megumi-fushiguro.svg',
  'nobara-kugisaki.svg',
  'sukuna-full-power.svg',
  'sukuna-heian-era.svg',
  'toge-inumaki.svg',
  'uraume.svg',
  'yuji-awakened.svg',
  'yuji-black-flash.svg',
  'yuta-gojo-s-body.svg',
  'yuta-okkotsu-jjk-0.svg',
  'yuta-okkotsu-sendai.svg',
]);
