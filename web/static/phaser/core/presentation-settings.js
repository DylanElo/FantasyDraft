export const PRESENTATION_SETTINGS_STORAGE_KEY = 'jjk_arena.presentation_settings.v1';

export const DEFAULT_PRESENTATION_SETTINGS = Object.freeze({
  muted: false,
  volume: 0.7,
  haptics: true,
  motion: 'system',
});

const MOTION_VALUES = Object.freeze(['system', 'reduced', 'full']);
const SETTINGS_BY_ENVIRONMENT = new WeakMap();
let fallbackSettings = null;

function safeStorage(environment, explicitStorage) {
  if (explicitStorage) return explicitStorage;
  try {
    return environment && environment.localStorage || null;
  } catch (_error) {
    return null;
  }
}

function clampVolume(value) {
  return Math.max(0, Math.min(1, Math.round((Number(value) || 0) * 20) / 20));
}

function normalizeSettings(value = {}) {
  const motion = MOTION_VALUES.includes(value.motion) ? value.motion : DEFAULT_PRESENTATION_SETTINGS.motion;
  return Object.freeze({
    muted: value.muted == null ? DEFAULT_PRESENTATION_SETTINGS.muted : Boolean(value.muted),
    volume: value.volume == null ? DEFAULT_PRESENTATION_SETTINGS.volume : clampVolume(value.volume),
    haptics: value.haptics == null ? DEFAULT_PRESENTATION_SETTINGS.haptics : Boolean(value.haptics),
    motion,
  });
}

function readSettings(storage, storageKey) {
  try {
    const raw = storage && storage.getItem && storage.getItem(storageKey);
    if (raw) return normalizeSettings(JSON.parse(raw));
    const legacyMuted = storage && storage.getItem && storage.getItem('jjk_arena.interaction_sfx.muted.v1');
    if (legacyMuted === 'true') return normalizeSettings({ muted: true });
  } catch (_error) {
    // Corrupt or blocked storage falls back to safe defaults.
  }
  return normalizeSettings();
}

export class PresentationSettings {
  constructor(options = {}) {
    this.environment = options.environment || (typeof window !== 'undefined' ? window : globalThis);
    this.storage = safeStorage(this.environment, options.storage);
    this.storageKey = options.storageKey || PRESENTATION_SETTINGS_STORAGE_KEY;
    this.listeners = new Set();
    this.value = options.value ? normalizeSettings(options.value) : readSettings(this.storage, this.storageKey);
  }

  snapshot() {
    return this.value;
  }

  persist() {
    try {
      if (this.storage && this.storage.setItem) this.storage.setItem(this.storageKey, JSON.stringify(this.value));
    } catch (_error) {
      // In-memory settings remain usable when storage is unavailable.
    }
  }

  update(patch = {}) {
    const next = normalizeSettings({ ...this.value, ...patch });
    const changed = Object.keys(next).some((key) => next[key] !== this.value[key]);
    if (!changed) return this.value;
    this.value = next;
    this.persist();
    this.listeners.forEach((listener) => listener(this.value));
    return this.value;
  }

  setMuted(value) { return this.update({ muted: Boolean(value) }); }
  toggleMuted() { return this.setMuted(!this.value.muted); }
  setVolume(value) { return this.update({ volume: clampVolume(value) }); }
  stepVolume(direction) { return this.setVolume(this.value.volume + (Number(direction) < 0 ? -0.1 : 0.1)); }
  setHaptics(value) { return this.update({ haptics: Boolean(value) }); }
  toggleHaptics() { return this.setHaptics(!this.value.haptics); }
  setMotion(value) { return this.update({ motion: MOTION_VALUES.includes(value) ? value : 'system' }); }

  cycleMotion() {
    const index = MOTION_VALUES.indexOf(this.value.motion);
    return this.setMotion(MOTION_VALUES[(index + 1) % MOTION_VALUES.length]);
  }

  effectiveReducedMotion(environment = this.environment) {
    if (this.value.motion === 'reduced') return true;
    if (this.value.motion === 'full') return false;
    try {
      return Boolean(environment && environment.matchMedia && environment.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_error) {
      return false;
    }
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function getPersistentPresentationSettings(options = {}) {
  const environment = options.environment || (typeof window !== 'undefined' ? window : globalThis);
  if (environment && (typeof environment === 'object' || typeof environment === 'function')) {
    const existing = SETTINGS_BY_ENVIRONMENT.get(environment);
    if (existing) return existing;
    const settings = new PresentationSettings({ ...options, environment });
    SETTINGS_BY_ENVIRONMENT.set(environment, settings);
    return settings;
  }
  if (!fallbackSettings) fallbackSettings = new PresentationSettings(options);
  return fallbackSettings;
}
