const DESIGN_TOKENS = globalThis.JJK_MOBILE_TOKENS || {};
const TOKEN_COLORS = DESIGN_TOKENS.phaserColors || {};
const bootstrap = globalThis.JJK_BOOTSTRAP || {};

export const TOKEN_TYPE = DESIGN_TOKENS.type || {};
export const TOKEN_RADIUS = DESIGN_TOKENS.radius || {};
export const TOKEN_FRAMES = DESIGN_TOKENS.frames || {};
export const TOKEN_TOUCH = DESIGN_TOKENS.touch || {};
export const TOKEN_MOTION = DESIGN_TOKENS.motion || {};

export const COLORS = {
  bg: TOKEN_COLORS.voidBlack || 0x050711,
  panel: TOKEN_COLORS.panelDeep || 0x0b1020,
  panel2: TOKEN_COLORS.panelRaised || 0x111827,
  line: TOKEN_COLORS.surfaceLine || 0x273449,
  text: (DESIGN_TOKENS.colors && DESIGN_TOKENS.colors.textMain) || '#f8fafc',
  muted: (DESIGN_TOKENS.colors && DESIGN_TOKENS.colors.textMuted) || '#94a3b8',
  cyan: TOKEN_COLORS.cursedBlue || 0x3b82f6,
  purple: TOKEN_COLORS.cursedPurple || 0xa855f7,
  gold: TOKEN_COLORS.domainGold || 0xf59e0b,
  red: TOKEN_COLORS.bloodRed || 0xef4444,
  green: TOKEN_COLORS.bodyGreen || 0x22c55e,
  white: TOKEN_COLORS.focusWhite || 0xf8fafc,
  blue: TOKEN_COLORS.cursedBlue || 0x3b82f6,
  black: TOKEN_COLORS.panelRaised || 0x111827,
};
COLORS.stageDeep = 0x020412;
COLORS.stageInk = 0x030712;
COLORS.panelInk = 0x07101f;
COLORS.paperGold = 0xfde68a;

export const ENERGY_COLORS = DESIGN_TOKENS.energyPhaser || {
  green: COLORS.green,
  red: COLORS.red,
  blue: COLORS.blue,
  white: COLORS.white,
  black: COLORS.black,
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
  'uraume.svg',
  'yuji-awakened.svg',
  'yuji-black-flash.svg',
  'yuta-gojo-s-body.svg',
  'yuta-okkotsu-jjk-0.svg',
  'yuta-okkotsu-sendai.svg',
]);

