import {
  portraitEntryFor,
  portraitEntryForTextureKey,
  portraitFocalFor,
  portraitTextureKeyFor,
} from './portrait-registry.js?v=37';
import { COLORS, CULLING_COLORS } from './runtime-config.js?v=37';
import { safeText } from './text.js?v=37';

function environmentAsset(key, file, width, height, scenes) {
  return Object.freeze({
    key,
    file,
    url: `/static/assets/environments/${file}`,
    width,
    height,
    scenes: Object.freeze(scenes.slice()),
  });
}

export const ENVIRONMENT_ASSETS = Object.freeze({
  'culling-current-home': environmentAsset(
    'culling-current-home',
    'culling-current-home.webp',
    773,
    1672,
    ['BootScene'],
  ),
  'culling-current-home-hero': environmentAsset(
    'culling-current-home-hero',
    'culling-current-home-hero-v2.webp',
    853,
    1844,
    ['LobbyScene'],
  ),
  'culling-current-campus': environmentAsset(
    'culling-current-campus',
    'culling-current-campus.webp',
    773,
    1672,
    ['DraftScene', 'FirstCreationScene', 'RecordsScene'],
  ),
  'culling-current-map': environmentAsset(
    'culling-current-map',
    'culling-current-map.webp',
    773,
    1672,
    ['MissionMapScene'],
  ),
  'culling-current-rooftop': environmentAsset(
    'culling-current-rooftop',
    'culling-current-rooftop-v2.webp',
    853,
    1844,
    ['MatchupScene', 'CombatScene', 'ResultScene'],
  ),
});

// Boot owns only its splash and the immediately following Home plate. All
// other worlds are queued by the drawing helper for the scene that needs them.
export const INITIAL_ENVIRONMENT_KEYS = Object.freeze([
  'culling-current-home',
  'culling-current-home-hero',
]);

const ENVIRONMENT_ASSET_FLIGHTS = new Map();
const ENVIRONMENT_SCENE_ATTEMPTS = new WeakMap();

export function environmentAssetFor(textureKey) {
  return ENVIRONMENT_ASSETS[safeText(textureKey)] || null;
}

export function environmentAssetsForScene(sceneKey) {
  const normalized = safeText(sceneKey);
  return Object.values(ENVIRONMENT_ASSETS).filter((asset) => asset.scenes.includes(normalized));
}

function sceneAttemptSet(scene) {
  let attempts = ENVIRONMENT_SCENE_ATTEMPTS.get(scene);
  if (!attempts) {
    attempts = new Set();
    ENVIRONMENT_SCENE_ATTEMPTS.set(scene, attempts);
  }
  return attempts;
}

export function registerEnvironmentTextureAttempt(scene, textureKey) {
  const asset = environmentAssetFor(textureKey);
  if (!asset || !scene || typeof scene !== 'object') return false;
  sceneAttemptSet(scene).add(asset.key);
  return true;
}

function rerenderEnvironmentWaiters(waiters) {
  waiters.forEach((scene) => {
    if (!scene || typeof scene.render !== 'function') return;
    const sceneKey = scene.keyName || (scene.sys && scene.sys.settings && scene.sys.settings.key);
    const manager = scene.scene;
    if (manager && typeof manager.isActive === 'function' && sceneKey && !manager.isActive(sceneKey)) return;
    scene.render();
  });
}

// Queue one registered environment at most once per scene instance. The
// immediate gradient fallback remains visible while the texture is loading or
// after a failed request. TextureManager is game-wide, so concurrent scenes
// share one in-flight request and rerender only after that flight completes.
export function stageEnvironmentTexture(scene, textureKey) {
  const asset = environmentAssetFor(textureKey);
  if (!asset || !scene || typeof scene !== 'object') return 'fallback';
  if (scene.textures && typeof scene.textures.exists === 'function' && scene.textures.exists(asset.key)) return 'ready';

  const attempts = sceneAttemptSet(scene);
  if (attempts.has(asset.key)) return ENVIRONMENT_ASSET_FLIGHTS.has(asset.key) ? 'loading' : 'fallback';
  attempts.add(asset.key);

  const activeFlight = ENVIRONMENT_ASSET_FLIGHTS.get(asset.key);
  if (activeFlight) {
    activeFlight.waiters.add(scene);
    return 'loading';
  }
  if (!scene.load || typeof scene.load.image !== 'function') return 'fallback';

  const flight = { owner: scene, waiters: new Set([scene]), failed: false };
  ENVIRONMENT_ASSET_FLIGHTS.set(asset.key, flight);
  const onLoadError = (file) => {
    if (file && file.key === asset.key) flight.failed = true;
  };
  const complete = () => {
    if (scene.load && typeof scene.load.off === 'function') scene.load.off('loaderror', onLoadError);
    if (ENVIRONMENT_ASSET_FLIGHTS.get(asset.key) === flight) ENVIRONMENT_ASSET_FLIGHTS.delete(asset.key);
    rerenderEnvironmentWaiters(flight.waiters);
  };

  if (typeof scene.load.on === 'function') scene.load.on('loaderror', onLoadError);
  if (typeof scene.load.once === 'function') scene.load.once('complete', complete);
  try {
    scene.load.image(asset.key, asset.url);
    const loading = typeof scene.load.isLoading === 'function' && scene.load.isLoading();
    if (!loading && typeof scene.load.start === 'function') scene.load.start();
  } catch (_error) {
    flight.failed = true;
    complete();
    return 'fallback';
  }
  return 'queued';
}

export class AssetRegistry {
  constructor() {
    this.portraitFailures = new Map();
    this.portraitContractIssues = [];
  }

  portraitFor(characterOrId) {
    const id = typeof characterOrId === 'string'
      ? characterOrId
      : (characterOrId && (characterOrId.id || characterOrId.character_id));
    return portraitEntryFor(id);
  }

  portraitKeyFor(characterOrId) {
    const id = typeof characterOrId === 'string'
      ? characterOrId
      : (characterOrId && (characterOrId.id || characterOrId.character_id));
    return portraitTextureKeyFor(id);
  }

  portraitFocalFor(characterOrId, context = 'square') {
    const id = typeof characterOrId === 'string'
      ? characterOrId
      : (characterOrId && (characterOrId.id || characterOrId.character_id));
    return portraitFocalFor(id, context);
  }

  reportPortraitLoadError(file) {
    const entry = portraitEntryForTextureKey(file && file.key);
    if (!entry) return false;
    const existing = this.portraitFailures.get(entry.id);
    const textureKey = String((file && file.key) || entry.textureKey);
    const reason = safeText(
      file && file.error && file.error.message,
      safeText(file && file.xhrLoader && file.xhrLoader.statusText, 'Asset request failed'),
    );
    if (existing) {
      if (!existing.textureKeys.includes(textureKey)) existing.textureKeys.push(textureKey);
      this.syncPortraitDiagnostics();
      return true;
    }
    const diagnostic = {
      id: entry.id,
      name: entry.name,
      file: entry.file,
      url: entry.url,
      textureKeys: [textureKey],
      reason,
    };
    this.portraitFailures.set(entry.id, diagnostic);
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error(`[JJK portrait] Failed to load ${entry.id} from ${entry.url}: ${reason}`);
    }
    this.syncPortraitDiagnostics();
    return true;
  }

  reportPortraitContractIssue(issue) {
    if (!issue || !issue.message) return;
    const signature = `${issue.code || 'portrait_contract'}:${issue.id || ''}:${issue.message}`;
    if (this.portraitContractIssues.some((item) => item.signature === signature)) return;
    this.portraitContractIssues.push({ ...issue, signature });
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error(`[JJK portrait] ${issue.message}`);
    }
    this.syncPortraitDiagnostics();
  }

  portraitLoadDiagnostics() {
    return {
      failures: Array.from(this.portraitFailures.values()).map((item) => ({
        ...item,
        textureKeys: item.textureKeys.slice(),
      })),
      contractIssues: this.portraitContractIssues.map(({ signature, ...item }) => ({ ...item })),
    };
  }

  syncPortraitDiagnostics() {
    if (typeof window !== 'undefined') {
      window.__jjkPortraitDiagnostics = this.portraitLoadDiagnostics();
    }
  }

  toneFor(id) {
    const portrait = portraitEntryFor(id);
    if (portrait) return portrait.accent;
    const tones = [CULLING_COLORS.cobalt, CULLING_COLORS.vermilion, CULLING_COLORS.gold, COLORS.bodyGreen, CULLING_COLORS.muted];
    let hash = 0;
    safeText(id).split('').forEach((char) => {
      hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    });
    return tones[Math.abs(hash) % tones.length];
  }
}
