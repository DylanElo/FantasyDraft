const DESIGN_TOKENS = globalThis.JJK_MOBILE_TOKENS || {};
const TOKEN_COLORS = DESIGN_TOKENS.phaserColors || {};
const CURRENT_TOKEN_COLORS = DESIGN_TOKENS.cullingCurrentPhaser || {};
const CURRENT_TEXT_COLORS = DESIGN_TOKENS.cullingCurrent || {};
const bootstrap = globalThis.JJK_BOOTSTRAP || {};

export const TOKEN_TYPE = DESIGN_TOKENS.type || {};
export const TOKEN_RADIUS = DESIGN_TOKENS.radius || {};
export const TOKEN_FRAMES = DESIGN_TOKENS.frames || {};
export const TOKEN_TOUCH = DESIGN_TOKENS.touch || {};
export const TOKEN_MOTION = DESIGN_TOKENS.motion || {};

// Real minimum sizes for mobile UI text -- `micro` is the only tier allowed
// below 12px, and only for single-glyph badges in small fixed chips (slot
// markers, energy-pip letters) where color/position carry as much meaning
// as the character. Everything a player is meant to read starts at `body`.
export const TYPE_SCALE = {
  micro: 10,
  label: 12,
  body: 14,
  subtitle: 16,
  title: 20,
  display: 28,
};

export const COLORS = {
  bg: TOKEN_COLORS.voidBlack || 0x030303,
  voidBlack: TOKEN_COLORS.voidBlack || 0x030303,
  inkBlack: TOKEN_COLORS.inkBlack || 0x08080a,
  panel: TOKEN_COLORS.surfaceDeep || 0x111111,
  panel2: TOKEN_COLORS.surfaceRaised || 0x181715,
  surfaceDeep: TOKEN_COLORS.surfaceDeep || 0x111111,
  surfaceRaised: TOKEN_COLORS.surfaceRaised || 0x181715,
  line: TOKEN_COLORS.surfaceLine || 0x3a3327,
  surfaceLine: TOKEN_COLORS.surfaceLine || 0x3a3327,
  talismanPaper: TOKEN_COLORS.talismanPaper || 0xd8c28a,
  talismanDim: TOKEN_COLORS.talismanDim || 0x8a7650,
  selectionGold: TOKEN_COLORS.selectionGold || 0xe6b84a,
  cursedTeal: TOKEN_COLORS.cursedTeal || 0x20d0b2,
  domainViolet: TOKEN_COLORS.domainViolet || 0x7c3aed,
  sealRed: TOKEN_COLORS.sealRed || 0xa92d2d,
  bloodRed: TOKEN_COLORS.bloodRed || 0xd43b3b,
  bodyGreen: TOKEN_COLORS.bodyGreen || 0x4fb06d,
  techniqueBlue: TOKEN_COLORS.techniqueBlue || 0x3d6bff,
  focusIvory: TOKEN_COLORS.focusIvory || 0xede9d5,
  text: (DESIGN_TOKENS.colors && DESIGN_TOKENS.colors.textMain) || '#f4efe1',
  muted: (DESIGN_TOKENS.colors && DESIGN_TOKENS.colors.textMuted) || '#a39a86',
  dim: (DESIGN_TOKENS.colors && DESIGN_TOKENS.colors.textDim) || '#6f675a',
  cyan: TOKEN_COLORS.cursedTeal || 0x20d0b2,
  purple: TOKEN_COLORS.domainViolet || 0x7c3aed,
  gold: TOKEN_COLORS.selectionGold || 0xe6b84a,
  red: TOKEN_COLORS.bloodRed || 0xd43b3b,
  green: TOKEN_COLORS.bodyGreen || 0x4fb06d,
  white: TOKEN_COLORS.focusIvory || 0xede9d5,
  blue: TOKEN_COLORS.techniqueBlue || 0x3d6bff,
  black: TOKEN_COLORS.surfaceRaised || 0x181715,
};

export const CULLING_COLORS = {
  ivory: CURRENT_TOKEN_COLORS.warmIvory || 0xf7f4ec,
  concrete: CURRENT_TOKEN_COLORS.paleConcrete || 0xe6e8ec,
  sky: CURRENT_TOKEN_COLORS.powderSky || 0xbfd6f2,
  cobalt: CURRENT_TOKEN_COLORS.cobalt || 0x2566ff,
  vermilion: CURRENT_TOKEN_COLORS.vermilion || 0xe53935,
  cyan: CURRENT_TOKEN_COLORS.electricCyan || 0x00e6f2,
  gold: CURRENT_TOKEN_COLORS.sunGold || 0xffc94d,
  charcoal: CURRENT_TOKEN_COLORS.charcoal || 0x33363a,
  muted: CURRENT_TOKEN_COLORS.mutedText || 0x66707a,
  shadow: CURRENT_TOKEN_COLORS.softShadow || 0x18233a,
  text: CURRENT_TEXT_COLORS.charcoal || '#33363A',
  mutedText: CURRENT_TEXT_COLORS.mutedText || '#66707A',
  inverseText: CURRENT_TEXT_COLORS.warmIvory || '#F7F4EC',
  cobaltText: CURRENT_TEXT_COLORS.cobalt || '#2566FF',
  redText: CURRENT_TEXT_COLORS.vermilion || '#E53935',
};
CULLING_COLORS.selected = CULLING_COLORS.gold;
CULLING_COLORS.target = CULLING_COLORS.cyan;
CULLING_COLORS.enemy = CULLING_COLORS.vermilion;
CULLING_COLORS.queued = COLORS.bodyGreen;
CULLING_COLORS.domain = COLORS.domainViolet;
COLORS.stageDeep = COLORS.voidBlack;
COLORS.stageInk = COLORS.inkBlack;
COLORS.panelInk = COLORS.surfaceDeep;
COLORS.paperGold = COLORS.talismanPaper;
COLORS.ally = COLORS.cursedTeal;
COLORS.enemy = COLORS.bloodRed;
COLORS.target = COLORS.cursedTeal;
COLORS.queued = COLORS.bodyGreen;
COLORS.protected = COLORS.talismanDim;
COLORS.domain = COLORS.domainViolet;
COLORS.selection = COLORS.selectionGold;
COLORS.cta = COLORS.selectionGold;
COLORS.paperText = (DESIGN_TOKENS.colors && DESIGN_TOKENS.colors.talismanPaper) || '#d8c28a';
COLORS.dimText = (DESIGN_TOKENS.colors && DESIGN_TOKENS.colors.textDim) || '#6f675a';

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
  'junpei-yoshino.svg',
  'kasumi-miwa.svg',
  'kenjaku.svg',
  'kokichi-muta-mechamaru.svg',
  'mahito.svg',
  'mai-zenin.svg',
  'maki-zenin.svg',
  'megumi-fushiguro.svg',
  'mei-mei-young.svg',
  'momo-nishimiya.svg',
  'nobara-kugisaki.svg',
  'noritoshi-kamo.svg',
  'panda.svg',
  'shoko-ieiri-young.svg',
  'suguru-geto-young.svg',
  'sukuna-full-power.svg',
  'sukuna-heian-era.svg',
  'toge-inumaki.svg',
  'uraume.svg',
  'utahime-iori-young.svg',
  'yuji-awakened.svg',
  'yuji-black-flash.svg',
  'yuta-gojo-s-body.svg',
  'yuta-okkotsu-jjk-0.svg',
  'yuta-okkotsu-sendai.svg',
]);
