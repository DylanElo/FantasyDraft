// Lightweight original WebAudio cues for the mobile game. The service never
// creates or resumes an AudioContext until unlockFromGesture() is called from
// an actual user input. All synthesis is local: no unlicensed audio assets or
// gameplay state are involved.

import { getPersistentPresentationSettings } from './presentation-settings.js?v=35';

const SILENCE = 0.0001;

function freezeVoice(kind, values) {
  return Object.freeze({ kind, ...values });
}

function tone(values) {
  return freezeVoice('tone', values);
}

function noise(values) {
  return freezeVoice('noise', values);
}

function cue(bus, minimumInterval, voices) {
  return Object.freeze({ bus, minimumInterval, voices: Object.freeze(voices) });
}

// Conservative levels are intentional. Phone speakers make unfiltered square
// and saw waves especially abrasive, so the palette is limited to sine,
// triangle, and short filtered noise. The dynamics stage catches coincident
// UI/combat cues without making every tap equally loud.
export const SFX_MIXER_CONFIG = Object.freeze({
  masterGain: 0.56,
  maximumCueInputPeak: 0.12,
  maximumActiveVoices: 48,
  buses: Object.freeze({
    ui: 0.72,
    combat: 0.88,
    cinematic: 0.8,
  }),
  compressor: Object.freeze({
    threshold: -20,
    knee: 18,
    ratio: 8,
    attack: 0.004,
    release: 0.11,
  }),
});

export const INTERACTION_SFX_CUES = Object.freeze({
  // Soft physical contact: a low tap plus a tiny paper-texture transient.
  press: cue('ui', 36, [
    tone({ wave: 'sine', from: 235, to: 178, duration: 0.045, gain: 0.018, attack: 0.004, lowpass: 980 }),
    noise({ duration: 0.026, gain: 0.005, attack: 0.002, lowpass: 1450, seed: 11 }),
  ]),
  // A warm rising interval for selection/commitment.
  select: cue('ui', 42, [
    tone({ wave: 'sine', from: 305, to: 430, duration: 0.105, gain: 0.024, attack: 0.008, lowpass: 1200 }),
    tone({ wave: 'triangle', from: 455, to: 610, duration: 0.12, gain: 0.013, attack: 0.01, delay: 0.018, lowpass: 1350 }),
  ]),
  // Clearer and slightly brighter than select, without a piercing notification ping.
  target: cue('ui', 48, [
    tone({ wave: 'sine', from: 510, to: 650, duration: 0.105, gain: 0.023, attack: 0.008, lowpass: 1450 }),
    tone({ wave: 'triangle', from: 255, to: 325, duration: 0.115, gain: 0.012, attack: 0.009, delay: 0.012, lowpass: 940 }),
  ]),
  // A restrained paper-card drop followed by a placement tick.
  queue: cue('ui', 54, [
    tone({ wave: 'triangle', from: 154, to: 116, duration: 0.09, gain: 0.029, attack: 0.005, lowpass: 620 }),
    noise({ duration: 0.045, gain: 0.008, attack: 0.002, lowpass: 1000, seed: 23 }),
    tone({ wave: 'sine', from: 410, to: 515, duration: 0.09, gain: 0.016, attack: 0.007, delay: 0.045, lowpass: 1250 }),
  ]),
  reorder: cue('ui', 42, [
    tone({ wave: 'sine', from: 340, to: 278, duration: 0.075, gain: 0.018, attack: 0.005, lowpass: 1050 }),
    tone({ wave: 'sine', from: 278, to: 360, duration: 0.08, gain: 0.014, attack: 0.006, delay: 0.042, lowpass: 1120 }),
  ]),
  // Confirmation is a compact three-note resolve, not a loud arcade fanfare.
  confirm: cue('ui', 90, [
    tone({ wave: 'triangle', from: 218, to: 305, duration: 0.15, gain: 0.025, attack: 0.01, lowpass: 900 }),
    tone({ wave: 'sine', from: 435, to: 610, duration: 0.18, gain: 0.021, attack: 0.012, delay: 0.04, lowpass: 1400 }),
    tone({ wave: 'sine', from: 650, to: 850, duration: 0.16, gain: 0.012, attack: 0.012, delay: 0.075, lowpass: 1650 }),
  ]),
  // Two soft, low descending pulses communicate rejection without buzzing.
  error: cue('ui', 110, [
    tone({ wave: 'triangle', from: 188, to: 142, duration: 0.13, gain: 0.025, attack: 0.006, lowpass: 720 }),
    tone({ wave: 'sine', from: 96, to: 80, duration: 0.18, gain: 0.021, attack: 0.008, delay: 0.035, lowpass: 430 }),
  ]),
  // Technique activation sits between UI and impact: body, energy, then air.
  skill: cue('combat', 70, [
    tone({ wave: 'triangle', from: 148, to: 225, duration: 0.18, gain: 0.034, attack: 0.009, lowpass: 780 }),
    tone({ wave: 'sine', from: 325, to: 505, duration: 0.21, gain: 0.02, attack: 0.013, delay: 0.028, lowpass: 1320 }),
    noise({ duration: 0.09, gain: 0.011, attack: 0.004, delay: 0.016, lowpass: 1180, seed: 37 }),
  ]),
  // A low body hit and filtered air burst; no raw sawtooth speaker crackle.
  impact: cue('combat', 58, [
    tone({ wave: 'sine', from: 92, to: 46, duration: 0.16, gain: 0.044, attack: 0.003, lowpass: 410 }),
    tone({ wave: 'triangle', from: 205, to: 88, duration: 0.11, gain: 0.023, attack: 0.003, lowpass: 680 }),
    noise({ duration: 0.08, gain: 0.023, attack: 0.002, lowpass: 820, seed: 41 }),
  ]),
  heal: cue('combat', 80, [
    tone({ wave: 'sine', from: 355, to: 515, duration: 0.18, gain: 0.022, attack: 0.014, lowpass: 1250 }),
    tone({ wave: 'sine', from: 535, to: 765, duration: 0.25, gain: 0.015, attack: 0.018, delay: 0.04, lowpass: 1550 }),
  ]),
  // Status application is deliberately lower and stranger than a reveal.
  status: cue('combat', 85, [
    tone({ wave: 'triangle', from: 168, to: 212, duration: 0.15, gain: 0.025, attack: 0.009, lowpass: 730 }),
    tone({ wave: 'sine', from: 425, to: 382, duration: 0.19, gain: 0.014, attack: 0.012, delay: 0.025, lowpass: 1080 }),
    noise({ duration: 0.07, gain: 0.007, attack: 0.004, delay: 0.02, lowpass: 960, seed: 53 }),
  ]),
  // Counter/reflect/reveal uses an airy upward signature.
  reveal: cue('cinematic', 120, [
    tone({ wave: 'sine', from: 375, to: 710, duration: 0.25, gain: 0.024, attack: 0.016, lowpass: 1500 }),
    tone({ wave: 'triangle', from: 188, to: 350, duration: 0.23, gain: 0.018, attack: 0.014, delay: 0.03, lowpass: 1060 }),
    tone({ wave: 'sine', from: 745, to: 1020, duration: 0.18, gain: 0.009, attack: 0.016, delay: 0.09, lowpass: 1700 }),
  ]),
  // Used for passing/handing off a player turn.
  turn: cue('cinematic', 130, [
    tone({ wave: 'triangle', from: 142, to: 188, duration: 0.16, gain: 0.029, attack: 0.009, lowpass: 760 }),
    tone({ wave: 'sine', from: 385, to: 575, duration: 0.16, gain: 0.018, attack: 0.012, delay: 0.09, lowpass: 1320 }),
  ]),
  // A neutral result cadence works for victory, defeat, draw, and no-contest.
  result: cue('cinematic', 500, [
    tone({ wave: 'triangle', from: 108, to: 162, duration: 0.3, gain: 0.034, attack: 0.018, lowpass: 680 }),
    tone({ wave: 'sine', from: 325, to: 485, duration: 0.34, gain: 0.022, attack: 0.022, delay: 0.06, lowpass: 1250 }),
    tone({ wave: 'sine', from: 485, to: 645, duration: 0.3, gain: 0.017, attack: 0.022, delay: 0.13, lowpass: 1480 }),
  ]),
});

export const DEFAULT_SFX_STORAGE_KEY = 'jjk_arena.interaction_sfx.muted.v1';

export const INTERACTION_HAPTIC_CUES = Object.freeze({
  press: Object.freeze([5]),
  select: Object.freeze([8]),
  target: Object.freeze([8, 24, 8]),
  queue: Object.freeze([12]),
  reorder: Object.freeze([6]),
  confirm: Object.freeze([14, 30, 18]),
  error: Object.freeze([24, 38, 24]),
  skill: Object.freeze([14]),
  impact: Object.freeze([20]),
  heal: Object.freeze([8, 28, 8]),
  status: Object.freeze([10, 34, 8]),
  reveal: Object.freeze([8, 24, 12]),
  turn: Object.freeze([10, 30, 12]),
  result: Object.freeze([16, 38, 24]),
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

function clamp01(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function setParam(param, value, atTime) {
  if (!param) return;
  try {
    if (typeof param.setValueAtTime === 'function') param.setValueAtTime(value, atTime);
    else param.value = value;
  } catch (_error) {
    try { param.value = value; } catch (_ignored) { /* Best effort. */ }
  }
}

function rampParam(param, value, atTime) {
  if (!param) return;
  try {
    if (typeof param.exponentialRampToValueAtTime === 'function' && value > 0) {
      param.exponentialRampToValueAtTime(value, atTime);
    } else if (typeof param.linearRampToValueAtTime === 'function') {
      param.linearRampToValueAtTime(value, atTime);
    } else {
      setParam(param, value, atTime);
    }
  } catch (_error) {
    setParam(param, value, atTime);
  }
}

function connect(source, target) {
  if (!source || !target || typeof source.connect !== 'function') return false;
  source.connect(target);
  return true;
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
    this.volume = clamp01(options.volume == null ? (settingValue ? settingValue.volume : 1) : options.volume, 1);
    this.haptics = settingValue ? settingValue.haptics : options.haptics !== false;
    this.lastPlayed = new Map();
    this.destroyed = false;
    this.mixBus = null;
    this.masterGain = null;
    this.compressor = null;
    this.busNodes = new Map();
    this.activeSources = new Set();
    this.unsubscribeSettings = this.settings && this.settings.subscribe
      ? this.settings.subscribe((next) => {
        this.muted = Boolean(next.muted);
        this.volume = clamp01(next.volume);
        this.haptics = Boolean(next.haptics);
        this.applyMasterLevel();
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
    this.applyMasterLevel();
    return this.muted;
  }

  toggleMuted() {
    return this.setMuted(!this.muted);
  }

  setVolume(value) {
    this.volume = clamp01(value);
    if (this.settings && this.settings.setVolume) this.settings.setVolume(this.volume);
    this.applyMasterLevel();
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

  currentTime() {
    return Math.max(0, Number(this.context && this.context.currentTime) || 0);
  }

  applyMasterLevel() {
    if (!this.masterGain || !this.masterGain.gain) return;
    const target = this.muted ? 0 : SFX_MIXER_CONFIG.masterGain * this.volume;
    const now = this.currentTime();
    try {
      const param = this.masterGain.gain;
      if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
      if (typeof param.setTargetAtTime === 'function') param.setTargetAtTime(target, now, 0.012);
      else setParam(param, target, now);
    } catch (_error) {
      setParam(this.masterGain.gain, target, now);
    }
  }

  ensureMixer() {
    if (this.mixBus && this.masterGain) return true;
    const context = this.context;
    if (!context || typeof context.createGain !== 'function' || !context.destination) return false;
    try {
      this.mixBus = context.createGain();
      this.masterGain = context.createGain();
      setParam(this.mixBus.gain, 1, this.currentTime());
      let tail = this.mixBus;
      if (typeof context.createDynamicsCompressor === 'function') {
        this.compressor = context.createDynamicsCompressor();
        const config = SFX_MIXER_CONFIG.compressor;
        setParam(this.compressor.threshold, config.threshold, this.currentTime());
        setParam(this.compressor.knee, config.knee, this.currentTime());
        setParam(this.compressor.ratio, config.ratio, this.currentTime());
        setParam(this.compressor.attack, config.attack, this.currentTime());
        setParam(this.compressor.release, config.release, this.currentTime());
        connect(tail, this.compressor);
        tail = this.compressor;
      }
      connect(tail, this.masterGain);
      connect(this.masterGain, context.destination);
      Object.entries(SFX_MIXER_CONFIG.buses).forEach(([name, level]) => {
        const bus = context.createGain();
        setParam(bus.gain, level, this.currentTime());
        connect(bus, this.mixBus);
        this.busNodes.set(name, bus);
      });
      this.applyMasterLevel();
      return true;
    } catch (_error) {
      this.mixBus = null;
      this.masterGain = null;
      this.compressor = null;
      this.busNodes.clear();
      return false;
    }
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
      // iOS may report `interrupted` after the app is backgrounded. A fresh
      // trusted gesture should resume either suspended or interrupted audio.
      if (this.context.state !== 'running' && this.context.state !== 'closed' && this.context.resume) {
        await this.context.resume();
      }
      this.unlocked = this.context.state === 'running';
      if (this.unlocked) this.ensureMixer();
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
    const spec = INTERACTION_SFX_CUES[cueName];
    if (!spec || this.destroyed || this.muted || this.volume <= 0 || !this.isUnlocked()) return false;
    if (this.context.state !== 'running' || !this.ensureMixer()) return false;
    const nowMs = Date.now();
    const minimumInterval = Math.max(0, Number(options.minimumInterval == null ? spec.minimumInterval : options.minimumInterval));
    if (nowMs - (this.lastPlayed.get(cueName) || 0) < minimumInterval) return false;
    try {
      const scheduled = spec.voices.reduce((count, voice) => count + (this.playVoice(voice, spec, options) ? 1 : 0), 0);
      if (!scheduled) return false;
      this.lastPlayed.set(cueName, nowMs);
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

  makeNoiseSource(voice, duration) {
    const context = this.context;
    if (!context || typeof context.createBuffer !== 'function' || typeof context.createBufferSource !== 'function') return null;
    const sampleRate = Math.max(8000, Number(context.sampleRate) || 44100);
    const length = Math.max(1, Math.ceil(sampleRate * duration));
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer && buffer.getChannelData ? buffer.getChannelData(0) : null;
    if (!data) return null;
    let state = (Number(voice.seed) || 1) >>> 0;
    for (let index = 0; index < data.length; index += 1) {
      state = (1664525 * state + 1013904223) >>> 0;
      data[index] = ((state / 0xffffffff) * 2) - 1;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  makeToneSource(voice, pitch, start, stop) {
    const context = this.context;
    if (!context || typeof context.createOscillator !== 'function') return null;
    const oscillator = context.createOscillator();
    oscillator.type = voice.wave === 'triangle' ? 'triangle' : 'sine';
    const from = Math.max(20, Number(voice.from) * pitch || 220);
    const to = Math.max(20, Number(voice.to) * pitch || from);
    setParam(oscillator.frequency, from, start);
    rampParam(oscillator.frequency, to, stop);
    return oscillator;
  }

  playVoice(voice, spec, options) {
    if (this.activeSources.size >= SFX_MIXER_CONFIG.maximumActiveVoices) return false;
    const context = this.context;
    const start = this.currentTime() + Math.max(0, Number(voice.delay) || 0);
    const duration = Math.max(0.025, Number(voice.duration) || 0.08);
    const stop = start + duration;
    const pitch = Math.max(0.65, Math.min(1.55, Number(options.pitch) || 1));
    const source = voice.kind === 'noise'
      ? this.makeNoiseSource(voice, duration)
      : this.makeToneSource(voice, pitch, start, stop);
    if (!source) return false;
    const gainNode = context.createGain();
    const optionLevel = clamp01(options.volume == null ? 1 : options.volume, 1);
    const peak = Math.max(0.0002, Math.min(SFX_MIXER_CONFIG.maximumCueInputPeak, Number(voice.gain) || 0.01) * optionLevel);
    const attack = Math.max(0.002, Math.min(duration * 0.45, Number(voice.attack) || duration * 0.12));
    setParam(gainNode.gain, SILENCE, start);
    rampParam(gainNode.gain, peak, start + attack);
    rampParam(gainNode.gain, SILENCE, stop);

    let voiceTail = source;
    if (typeof context.createBiquadFilter === 'function' && voice.lowpass) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      setParam(filter.frequency, Math.max(120, Number(voice.lowpass) || 1200), start);
      setParam(filter.Q, 0.7, start);
      connect(voiceTail, filter);
      voiceTail = filter;
    }
    connect(voiceTail, gainNode);
    connect(gainNode, this.busNodes.get(spec.bus) || this.mixBus);

    const cleanup = () => {
      this.activeSources.delete(source);
      try { if (source.disconnect) source.disconnect(); } catch (_error) { /* Best effort. */ }
      try { if (gainNode.disconnect) gainNode.disconnect(); } catch (_error) { /* Best effort. */ }
    };
    source.onended = cleanup;
    this.activeSources.add(source);
    source.start(start);
    source.stop(stop + 0.018);
    return true;
  }

  press(options) { return this.play('press', options); }
  select(options) { return this.play('select', options); }
  target(options) { return this.play('target', options); }
  queue(options) { return this.play('queue', options); }
  reorder(options) { return this.play('reorder', options); }
  confirm(options) { return this.play('confirm', options); }
  error(options) { return this.play('error', options); }
  skill(options) { return this.play('skill', options); }
  impact(options) { return this.play('impact', options); }
  heal(options) { return this.play('heal', options); }
  status(options) { return this.play('status', options); }
  reveal(options) { return this.play('reveal', options); }
  turn(options) { return this.play('turn', options); }
  result(options) { return this.play('result', options); }

  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unlocked = false;
    this.activeSources.forEach((source) => {
      try { if (source.stop) source.stop(); } catch (_error) { /* Already stopped. */ }
      try { if (source.disconnect) source.disconnect(); } catch (_error) { /* Best effort. */ }
    });
    this.activeSources.clear();
    if (this.ownsContext && this.context && this.context.state !== 'closed' && this.context.close) {
      try {
        await this.context.close();
      } catch (_error) {
        // Audio shutdown is best-effort.
      }
    }
    this.context = null;
    this.mixBus = null;
    this.masterGain = null;
    this.compressor = null;
    this.busNodes.clear();
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
