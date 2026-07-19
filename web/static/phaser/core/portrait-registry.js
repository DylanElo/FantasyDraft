export const PORTRAIT_BASE_URL = '/static/assets/portraits/culling-current';
export const PORTRAIT_SOURCE_WIDTH = 600;
export const PORTRAIT_SOURCE_HEIGHT = 800;

const DEFAULT_FOCALS = Object.freeze({
  hero: Object.freeze({ x: 0.5, y: 0.42 }),
  square: Object.freeze({ x: 0.5, y: 0.36 }),
  combat: Object.freeze({ x: 0.5, y: 0.31 }),
});

const STARTER_DEFINITIONS = Object.freeze([
  ['yuji_itadori', 'Yuji Itadori', 0xe32620],
  ['megumi_fushiguro', 'Megumi Fushiguro', 0x101b36],
  ['nobara_kugisaki', 'Nobara Kugisaki', 0xe32620],
  ['maki_zenin', 'Maki Zenin', 0x4fb06d],
  ['toge_inumaki', 'Toge Inumaki', 0x35dde8],
  ['panda', 'Panda', 0xb7b5ad],
  ['aoi_todo', 'Aoi Todo', 0xe32620],
  ['noritoshi_kamo', 'Noritoshi Kamo', 0xe32620],
  ['momo_nishimiya', 'Momo Nishimiya', 0x101b36],
  ['mai_zenin', 'Mai Zenin', 0xd8bf68],
  ['kasumi_miwa', 'Kasumi Miwa', 0x35dde8],
  ['kokichi_muta_mechamaru', 'Kokichi Muta / Mechamaru', 0xb58b5b],
  ['junpei_yoshino', 'Junpei Yoshino', 0x101b36],
  ['satoru_gojo_young', 'Satoru Gojo (Young)', 0x35dde8],
  ['suguru_geto_young', 'Suguru Geto (Young)', 0x4fb06d],
  ['shoko_ieiri_young', 'Shoko Ieiri (Young)', 0xe76b9a],
  ['utahime_iori_young', 'Utahime Iori (Young)', 0xe32620],
  ['mei_mei_young', 'Mei Mei (Young)', 0xd8bf68],
  ['yuta_okkotsu_jjk0', 'Yuta Okkotsu (JJK 0)', 0x101b36],
]);

function normalizedPortraitId(value) {
  return String(value || '').trim().replace(/[^a-z0-9_]+/gi, '_');
}

function portraitFileName(id) {
  return `${id.replace(/_/g, '-')}.webp`;
}

function portraitEntry(id, name, accent) {
  const file = portraitFileName(id);
  const textureKey = `portrait_${id}`;
  return Object.freeze({
    id,
    name,
    starter: true,
    file,
    url: `${PORTRAIT_BASE_URL}/${file}`,
    mime: 'image/webp',
    width: PORTRAIT_SOURCE_WIDTH,
    height: PORTRAIT_SOURCE_HEIGHT,
    aspect: PORTRAIT_SOURCE_WIDTH / PORTRAIT_SOURCE_HEIGHT,
    textureKey,
    focal: DEFAULT_FOCALS,
    accent,
  });
}

export const STARTER_PORTRAIT_IDS = Object.freeze(
  STARTER_DEFINITIONS.map(([id]) => id),
);

export const STARTER_PORTRAITS = Object.freeze(Object.fromEntries(
  STARTER_DEFINITIONS.map(([id, name, accent]) => [id, portraitEntry(id, name, accent)]),
));

const PORTRAITS_BY_TEXTURE_KEY = new Map();
Object.values(STARTER_PORTRAITS).forEach((entry) => {
  PORTRAITS_BY_TEXTURE_KEY.set(entry.textureKey, entry);
});

export function starterPortraitEntries() {
  return STARTER_PORTRAIT_IDS.map((id) => STARTER_PORTRAITS[id]);
}

export function portraitEntryFor(id) {
  return STARTER_PORTRAITS[String(id || '')] || null;
}

export function portraitEntryForTextureKey(textureKey) {
  return PORTRAITS_BY_TEXTURE_KEY.get(String(textureKey || '')) || null;
}

export function portraitTextureKeyFor(id) {
  const entry = portraitEntryFor(id);
  if (entry) return entry.textureKey;
  return `portrait_${normalizedPortraitId(id)}`;
}

export function portraitFileFor(id) {
  const entry = portraitEntryFor(id);
  return entry ? entry.file : null;
}

export function portraitFocalFor(id, context = 'square') {
  const entry = portraitEntryFor(id);
  const focalMap = entry ? entry.focal : DEFAULT_FOCALS;
  return focalMap[context] || focalMap.square;
}

function positiveDimension(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
  return number;
}

function normalizedFocal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return Math.max(0, Math.min(1, number));
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function focalCoverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight, focal = {}) {
  const sw = positiveDimension(sourceWidth, 'sourceWidth');
  const sh = positiveDimension(sourceHeight, 'sourceHeight');
  const tw = positiveDimension(targetWidth, 'targetWidth');
  const th = positiveDimension(targetHeight, 'targetHeight');
  const fx = normalizedFocal(focal.x);
  const fy = normalizedFocal(focal.y);
  const sourceAspect = sw / sh;
  const targetAspect = tw / th;

  let x = 0;
  let y = 0;
  let width = sw;
  let height = sh;

  if (sourceAspect > targetAspect) {
    width = sh * targetAspect;
    x = clamp(sw * fx - width / 2, 0, sw - width);
  } else if (sourceAspect < targetAspect) {
    height = sw / targetAspect;
    y = clamp(sh * fy - height / 2, 0, sh - height);
  }

  return {
    x,
    y,
    width,
    height,
    scale: tw / width,
    focalX: fx,
    focalY: fy,
  };
}

export function starterPortraitContractIssues(roster) {
  if (!roster || typeof roster !== 'object' || Array.isArray(roster)) {
    return [{ code: 'invalid_roster', message: 'First Creation roster is not an object.' }];
  }
  const rosterIds = Object.keys(roster);
  if (!rosterIds.length) return [];

  const issues = [];
  const starterIds = new Set(STARTER_PORTRAIT_IDS);
  rosterIds.forEach((id) => {
    const entry = portraitEntryFor(id);
    if (!entry) {
      issues.push({ code: 'unregistered_id', id, message: `No starter portrait is registered for ${id}.` });
      return;
    }
    const rosterName = String((roster[id] && roster[id].name) || '');
    if (rosterName !== entry.name) {
      issues.push({
        code: 'name_mismatch',
        id,
        message: `Portrait name mismatch for ${id}: expected "${entry.name}", received "${rosterName}".`,
      });
    }
  });
  STARTER_PORTRAIT_IDS.forEach((id) => {
    if (!Object.prototype.hasOwnProperty.call(roster, id)) {
      issues.push({ code: 'missing_id', id, message: `First Creation roster is missing ${id}.` });
    }
  });
  rosterIds.filter((id) => !starterIds.has(id)).forEach((id) => {
    if (!issues.some((issue) => issue.code === 'unregistered_id' && issue.id === id)) {
      issues.push({ code: 'extra_id', id, message: `Unexpected First Creation portrait id ${id}.` });
    }
  });
  return issues;
}
