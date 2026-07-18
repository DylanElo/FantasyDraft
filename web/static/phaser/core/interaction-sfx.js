// Small synthesized interaction cues. The service never creates or resumes an
// AudioContext until unlockFromGesture() is called from an actual user input.

import { getPersistentPresentationSettings } from './presentation-settings.js?v=32';

export const INTERACTION_SFX_CUES = Object.freeze({
  press: Object.freeze({ voices: [{ wave: 'triangle', from: 230, to: 190, duration: 0.055, gain: 0.035 }] }),
  select: Object.freeze({ voices: [{ wave: 'sine', from: 330, to: 510, duration: 0.11, gain: 0.045 }] }),
  target: Object.freeze({ voices: [{ wave: 'sine', from: 560, to: 690, duration: 0.09, gain: 0.038 }, { wave: 'triangle', from: 280, to: 350, duration: 0.08, gain: 0.018 }] }),
  queue: Object.freeze({ voices: [{ wave: 'square', from: 180, to: 220, duration: 0.07, gain: 0.024 }, { wave: 'sine', from: 430, to: 510, duration: 0.1, gain: 0.028, delay: 0.035 }] }),
  confirm: Object.freeze({ voices: [{ wave: 'triangle', from: 280, to: 420, duration: 0.13, gain: 0.045 }, { wave: 'sine', from: 560, to: 840, duration: 0.16, gain: 0.035, delay: 0.045 }] }),
  error: Object.freeze({ voices: [{ wave: 'sawtooth', from: 190, to: 105, duration: 0.16, gain: 0.035 }, { wave: 'square', from: 92, to: 78, duration: 0.18, gain: 0.016 }] }),
  reveal: Object.freeze({ voices: [{ wave: 'sine', from: 410, to: 920, duration: 0.22, gain: 0.035 }, { wave: 'triangle', from: 205, to: 460, duration: 0.2, gain: 0.022, delay: 0.025 }] }),
  impact: Object.freeze({ voices: [{ wave: 'sawtooth', from: 145, to: 58, duration: 0.12, gain: 0.045 }, { wave: 'triangle', from: 310, to: 125, duration: 0.09, gain: 0.026 }] }),
});

export const DEFAULT_SFX_STORAGE_KEY = 'jjk_arena.interaction_sfx.muted.v1';

export const INTERACTION_HAPTIC_CUES = Object.freeze({
  press: Object.freeze([8]),
  select: Object.freeze([12]),
  target: Object.freeze([10, 22, 10]),
  queue: Object.freeze([14]),
  confirm: Object.freeze([18, 24, 24]),
  error: Object.freeze([32, 28, 32]),
  reveal: Object.freeze([12, 18, 16]),
  impact: Object.freeze([26]),
});

const PERSISTENT_AUDIO_BY_ENVIRONMENT = new WeakMap();
let fallbackPersistentAudio = null;

function readMuted(storage, key) {
  try {
    return storage && storage.getItem && storage.getItem(key) === 'true';
  } catch (_error) {
    return false;
  }
}

function writeMuted(storage, key, value) {
  try {
    if (storage && storage.setItem) storage.setItem(key, value ? 'true' : 'false');
  } catch (_error) {
    // Storage may be blocked in privacy mode; in-memory mute still works.
  }
}

function audioContextConstructor(environment) {
  return environment && (environment.AudioContext || environment.webkitAudioContext) || null;
}

function environmentStorage(environment) {
  try {
    return environment && environment.localStorage || null;
  } catch (_error) {
    return null;
  }
}

export class InteractionSfx {
  constructor(options = {}) {
    this.environment = options.environment || (typeof window !== 'undefined' ? window : globalThis);
    this.storage = options.storage || environmentStorage(this.environment);
    this.storageKey = options.storageKey || DEFAULT_SFX_STORAGE_KEY;
    this.AudioContextCtor = options.AudioContext || null;
    this.context = options.context || null;
    this.ownsContext = false;
    this.unlocked = Boolean(options.context && options.unlocked);
    this.gestureSeen = Boolean(options.context && options.unlocked);
    this.settings = options.settings || null;
    const settingValue = this.settings && this.settings.snapshot ? this.settings.snapshot() : null;
    this.muted = options.muted == null
      ? settingValue ? settingValue.muted : readMuted(this.storage, this.storageKey)
      : Boolean(options.muted);
    this.volume = Math.max(0, Math.min(1, Number(options.volume == null ? (settingValue ? settingValue.volume : 1) : options.volume)));
    this.haptics = settingValue ? settingValue.haptics : options.haptics !== false;
    this.lastPlayed = new Map();
    this.destroyed = false;
    this.unsubscribeSettings = this.settings && this.settings.subscribe
      ? this.settings.subscribe((next) => {
        this.muted = Boolean(next.muted);
        this.volume = Math.max(0, Math.min(1, Number(next.volume) || 0));
        this.haptics = Boolean(next.haptics);
      })
      : null;
  }

  isSupported() {
    return Boolean(this.context || this.AudioContextCtor || audioContextConstructor(this.environment));
  }

  isUnlocked() {
    return Boolean(this.unlocked && this.context && this.context.state !== 'closed');
  }

  isMuted() {
    return this.muted;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.settings && this.settings.setMuted) this.settings.setMuted(this.muted);
    else writeMuted(this.storage, this.storageKey, this.muted);
    return this.muted;
  }

  toggleMuted() {
    return this.setMuted(!this.muted);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.settings && this.settings.setVolume) this.settings.setVolume(this.volume);
    return this.volume;
  }

  setHaptics(value) {
    this.haptics = Boolean(value);
    if (this.settings && this.settings.setHaptics) this.settings.setHaptics(this.haptics);
    return this.haptics;
  }

  toggleHaptics() {
    return this.setHaptics(!this.haptics);
  }

  async unlockFromGesture() {
    if (this.destroyed) return false;
    this.gestureSeen = true;
    try {
      if (!this.context) {
        const Context = this.AudioContextCtor || audioContextConstructor(this.environment);
        if (!Context) return false;
        this.context = new Context();
        this.ownsContext = true;
      }
      if (this.context.state === 'suspended' && this.context.resume) await this.context.resume();
      this.unlocked = this.context.state !== 'suspended' && this.context.state !== 'closed';
      return this.unlocked;
    } catch (_error) {
      this.unlocked = false;
      return false;
    }
  }

  attachGestureGate(target) {
    if (!target || !target.addEventListener) return Object.freeze({ destroy() {} });
    const unlock = () => {
      this.unlockFromGesture();
      destroy();
    };
    const events = ['pointerdown', 'touchstart', 'keydown'];
    events.forEach((event) => target.addEventListener(event, unlock, { once: true, passive: true }));
    const destroy = () => events.forEach((event) => target.removeEventListener && target.removeEventListener(event, unlock));
    return Object.freeze({ destroy });
  }

  play(cueName, options = {}) {
    const cue = INTERACTION_SFX_CUES[cueName];
    if (!cue || this.destroyed || this.muted || this.volume <= 0 || !this.isUnlocked()) return false;
    if (this.context.state !== 'running') return false;
    const nowMs = Date.now();
    const minimumInterval = Math.max(0, Number(options.minimumInterval == null ? 28 : options.minimumInterval));
    if (nowMs - (this.lastPlayed.get(cueName) || 0) < minimumInterval) return false;
    this.lastPlayed.set(cueName, nowMs);
    try {
      cue.voices.forEach((voice) => this.playVoice(voice, options));
      return true;
    } catch (_error) {
      return false;
    }
  }

  haptic(cueName) {
    const pattern = INTERACTION_HAPTIC_CUES[cueName];
    if (!pattern || this.destroyed || !this.haptics || !this.gestureSeen) return false;
    try {
      const navigatorObject = this.environment && this.environment.navigator;
      return Boolean(navigatorObject && typeof navigatorObject.vibrate === 'function' && navigatorObject.vibrate(pattern.slice()));
    } catch (_error) {
      return false;
    }
  }

  cue(cueName, options = {}) {
    const sounded = this.play(cueName, options);
    const vibrated = options.haptic === false ? false : this.haptic(cueName);
    return sounded || vibrated;
  }

  playVoice(voice, options) {
    const context = this.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + Math.max(0, Number(voice.delay) || 0);
    const duration = Math.max(0.025, Number(voice.duration) || 0.08);
    const stop = start + duration;
    const pitch = Math.max(0.5, Math.min(2, Number(options.pitch) || 1));
    const volume = this.volume * Math.max(0, Math.min(1, Number(options.volume == null ? 1 : options.volume)));
    oscillator.type = voice.wave;
    oscillator.frequency.setValueAtTime(voice.from * pitch, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, voice.to * pitch), stop);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, voice.gain * volume), start + Math.min(0.018, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(stop + 0.01);
  }

  press(options) { return this.play('press', options); }
  select(options) { return this.play('select', options); }
  target(options) { return this.play('target', options); }
  queue(options) { return this.play('queue', options); }
  confirm(options) { return this.play('confirm', options); }
  error(options) { return this.play('error', options); }
  reveal(options) { return this.play('reveal', options); }
  impact(options) { return this.play('impact', options); }

  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unlocked = false;
    if (this.ownsContext && this.context && this.context.state !== 'closed' && this.context.close) {
      try {
        await this.context.close();
      } catch (_error) {
        // Audio shutdown is best-effort.
      }
    }
    this.context = null;
    this.lastPlayed.clear();
    if (this.unsubscribeSettings) this.unsubscribeSettings();
    this.unsubscribeSettings = null;
  }
}

export function getPersistentInteractionSfx(options = {}) {
  const environment = options.environment || (typeof window !== 'undefined' ? window : globalThis);
  const create = () => new InteractionSfx({
    ...options,
    environment,
    settings: options.settings || getPersistentPresentationSettings({ environment, storage: options.storage }),
  });
  if (environment && (typeof environment === 'object' || typeof environment === 'function')) {
    const existing = PERSISTENT_AUDIO_BY_ENVIRONMENT.get(environment);
    if (existing && !existing.destroyed) return existing;
    const audio = create();
    PERSISTENT_AUDIO_BY_ENVIRONMENT.set(environment, audio);
    return audio;
  }
  if (!fallbackPersistentAudio || fallbackPersistentAudio.destroyed) fallbackPersistentAudio = create();
  return fallbackPersistentAudio;
}
