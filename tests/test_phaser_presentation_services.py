import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _run_node(script: str) -> dict:
    result = subprocess.run(
        ["node", "--experimental-default-type=module", "-"],
        input=script,
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=True,
    )
    return json.loads(result.stdout)


def test_interaction_sfx_is_gesture_gated_mutable_and_graceful_without_audio():
    probe = _run_node(
        r"""
const { InteractionSfx, INTERACTION_SFX_CUES } = await import('./web/static/phaser/core/interaction-sfx.js');
let contextsCreated = 0;
let oscillatorsStarted = 0;
let closed = 0;
const values = new Map();
const storage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, value); },
};
class FakeParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeContext {
  constructor() {
    contextsCreated += 1;
    this.state = 'suspended';
    this.currentTime = 1;
    this.destination = {};
  }
  async resume() { this.state = 'running'; }
  createOscillator() {
    return {
      frequency: new FakeParam(),
      connect() {},
      start() { oscillatorsStarted += 1; },
      stop() {},
    };
  }
  createGain() { return { gain: new FakeParam(), connect() {} }; }
  async close() { this.state = 'closed'; closed += 1; }
}
const service = new InteractionSfx({ AudioContext: FakeContext, storage });
const before = {
  contextsCreated,
  supported: service.isSupported(),
  unlocked: service.isUnlocked(),
  lockedPlay: service.press(),
};
const unlocked = await service.unlockFromGesture();
const played = Object.fromEntries(Object.keys(INTERACTION_SFX_CUES).map((cue) => [cue, service.play(cue, { minimumInterval: 0 })]));
const muted = service.setMuted(true);
const mutedPlay = service.confirm({ minimumInterval: 0 });
const persistedMute = storage.getItem(service.storageKey);
service.toggleMuted();
const unmutedPlay = service.reveal({ minimumInterval: 0 });
await service.destroy();

const noAudio = new InteractionSfx({ environment: {}, storage: null });
const noAudioUnlock = await noAudio.unlockFromGesture();
console.log(JSON.stringify({
  cues: Object.keys(INTERACTION_SFX_CUES),
  before,
  unlocked,
  contextsCreated,
  played,
  oscillatorsStarted,
  muted,
  mutedPlay,
  persistedMute,
  unmutedPlay,
  closed,
  noAudioSupported: noAudio.isSupported(),
  noAudioUnlock,
  noAudioPlay: noAudio.error(),
}));
"""
    )

    assert probe["cues"] == [
        "press",
        "select",
        "target",
        "queue",
        "reorder",
        "confirm",
        "error",
        "skill",
        "impact",
        "heal",
        "status",
        "reveal",
        "turn",
        "result",
    ]
    assert probe["before"] == {
        "contextsCreated": 0,
        "supported": True,
        "unlocked": False,
        "lockedPlay": False,
    }
    assert probe["unlocked"] is True
    assert probe["contextsCreated"] == 1
    assert all(probe["played"].values())
    assert probe["oscillatorsStarted"] >= 8
    assert probe["muted"] is True
    assert probe["mutedPlay"] is False
    assert probe["persistedMute"] == "true"
    assert probe["unmutedPlay"] is True
    assert probe["closed"] == 1
    assert probe["noAudioSupported"] is False
    assert probe["noAudioUnlock"] is False
    assert probe["noAudioPlay"] is False


def test_sfx_palette_is_filtered_peak_bounded_and_uses_a_master_dynamics_bus():
    probe = _run_node(
        r"""
const {
  InteractionSfx,
  INTERACTION_SFX_CUES,
  SFX_MIXER_CONFIG,
} = await import('./web/static/phaser/core/interaction-sfx.js');

const paramWrites = [];
const nodes = [];
class FakeParam {
  constructor(name) { this.name = name; }
  setValueAtTime(value) { paramWrites.push([this.name, value]); }
  exponentialRampToValueAtTime(value) { paramWrites.push([`${this.name}:ramp`, value]); }
  setTargetAtTime(value) { paramWrites.push([`${this.name}:target`, value]); }
  cancelScheduledValues() {}
}
function node(kind, extras = {}) {
  const value = {
    kind,
    connect(target) { this.target = target && target.kind || 'destination'; },
    disconnect() {},
    ...extras,
  };
  nodes.push(value);
  return value;
}
class FakeContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 2;
    this.sampleRate = 16000;
    this.destination = { kind: 'destination' };
  }
  async resume() { this.state = 'running'; }
  createGain() { return node('gain', { gain: new FakeParam('gain') }); }
  createDynamicsCompressor() {
    return node('compressor', {
      threshold: new FakeParam('threshold'), knee: new FakeParam('knee'), ratio: new FakeParam('ratio'),
      attack: new FakeParam('attack'), release: new FakeParam('release'),
    });
  }
  createBiquadFilter() {
    return node('filter', { frequency: new FakeParam('filter-frequency'), Q: new FakeParam('filter-q') });
  }
  createOscillator() {
    return node('oscillator', {
      frequency: new FakeParam('frequency'), start() {}, stop() {},
    });
  }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData() { return data; } };
  }
  createBufferSource() { return node('noise', { start() {}, stop() {} }); }
}

const metrics = Object.fromEntries(Object.entries(INTERACTION_SFX_CUES).map(([name, cue]) => [name, {
  bus: cue.bus,
  peak: cue.voices.reduce((sum, voice) => sum + voice.gain, 0),
  waves: cue.voices.filter((voice) => voice.kind === 'tone').map((voice) => voice.wave),
  filtered: cue.voices.every((voice) => Number(voice.lowpass) > 0),
}]));
const service = new InteractionSfx({ AudioContext: FakeContext, storage: null });
const beforeUnlock = { contexts: nodes.length, mixBus: service.mixBus };
await service.unlockFromGesture();
const played = ['press', 'queue', 'skill', 'impact', 'status', 'reveal', 'turn', 'result']
  .map((name) => service.play(name, { minimumInterval: 0 }));
service.setVolume(0.5);
service.setMuted(true);
console.log(JSON.stringify({
  metrics,
  mixer: SFX_MIXER_CONFIG,
  beforeUnlock,
  played,
  nodeKinds: nodes.map((entry) => entry.kind),
  paramWrites,
}));
"""
    )

    assert probe["beforeUnlock"] == {"contexts": 0, "mixBus": None}
    assert all(probe["played"])
    assert set(item["bus"] for item in probe["metrics"].values()) == {"ui", "combat", "cinematic"}
    assert all(item["peak"] <= probe["mixer"]["maximumCueInputPeak"] for item in probe["metrics"].values())
    assert all(item["filtered"] for item in probe["metrics"].values())
    assert all(wave in {"sine", "triangle"} for item in probe["metrics"].values() for wave in item["waves"])
    assert "compressor" in probe["nodeKinds"]
    assert "filter" in probe["nodeKinds"]
    assert "noise" in probe["nodeKinds"]
    assert ["threshold", probe["mixer"]["compressor"]["threshold"]] in probe["paramWrites"]
    assert ["gain:target", 0] in probe["paramWrites"]


def test_gesture_gate_only_unlocks_after_a_registered_user_event():
    probe = _run_node(
        r"""
const { InteractionSfx } = await import('./web/static/phaser/core/interaction-sfx.js');
let contextsCreated = 0;
const listeners = new Map();
const target = {
  addEventListener(name, callback) { listeners.set(name, callback); },
  removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); },
};
class FakeContext {
  constructor() { contextsCreated += 1; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  createOscillator() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
}
const service = new InteractionSfx({ AudioContext: FakeContext, storage: null });
const gate = service.attachGestureGate(target);
const before = { contextsCreated, listeners: [...listeners.keys()].sort() };
listeners.get('pointerdown')();
await Promise.resolve();
const after = { contextsCreated, unlocked: service.isUnlocked(), listeners: [...listeners.keys()] };
gate.destroy();
console.log(JSON.stringify({ before, after }));
"""
    )

    assert probe["before"] == {
        "contextsCreated": 0,
        "listeners": ["keydown", "pointerdown", "touchstart"],
    }
    assert probe["after"] == {"contextsCreated": 1, "unlocked": True, "listeners": []}


def test_trusted_gesture_resumes_an_interrupted_mobile_audio_context():
    probe = _run_node(
        r"""
const { InteractionSfx } = await import('./web/static/phaser/core/interaction-sfx.js');
let resumes = 0;
const context = {
  state: 'interrupted', currentTime: 0, destination: {},
  async resume() { resumes += 1; this.state = 'running'; },
  createGain() { return { gain: { setValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} }, connect() {} }; },
};
const service = new InteractionSfx({ context, storage: null });
const unlocked = await service.unlockFromGesture();
console.log(JSON.stringify({ resumes, unlocked, state: context.state }));
"""
    )

    assert probe == {"resumes": 1, "unlocked": True, "state": "running"}


def test_motion_service_exposes_rule_clarifying_cues_and_respects_reduced_motion():
    probe = _run_node(
        r"""
const motionModule = await import('./web/static/phaser/fx/motion-vfx.js');
const methods = Object.getOwnPropertyNames(motionModule.MotionVfx.prototype).filter((name) => name !== 'constructor');
const pointerHandlers = new Map();
const destroyed = [];
const scene = {
  add: {
    circle(x, y, radius, color, alpha) { return { x, y, radius, color, alpha, active: true, destroy() { destroyed.push('mote'); } }; },
    container(x, y, children) {
      return {
        x, y, children, active: true,
        setDepth(depth) { this.depth = depth; return this; },
        destroy() { this.active = false; destroyed.push('container'); },
      };
    },
  },
  input: {
    on(name, callback) { pointerHandlers.set(name, callback); },
    off(name, callback) { if (pointerHandlers.get(name) === callback) pointerHandlers.delete(name); },
  },
  events: { once() {} },
};
const motion = new motionModule.MotionVfx(scene, { reducedMotion: true });
const introTarget = { x: 10, y: 20, alpha: 0, setAlpha(value) { this.alpha = value; } };
motion.sceneIntro(introTarget);
const ambient = motion.ambientWorldTreatment({ x: 0, y: 0, w: 390, h: 844 }, { count: 9 });
const duration = motion.duration(500);
ambient.destroy();
motion.destroy();
console.log(JSON.stringify({
  methods,
  reducedPreference: motionModule.prefersReducedMotion({ matchMedia: () => ({ matches: true }) }),
  normalPreference: motionModule.prefersReducedMotion({ matchMedia: () => ({ matches: false }) }),
  introTarget,
  ambientCount: ambient.motes.length,
  ambientDepth: ambient.container.depth,
  duration,
  pointerHandlers: [...pointerHandlers.keys()],
  destroyed,
}));
"""
    )

    required_methods = {
        "ambientWorldTreatment",
        "sceneIntro",
        "fighterIdleParallax",
        "selectionCommitment",
        "legalTargetCue",
        "skillCardSheen",
        "bindSkillCard",
        "queueCommit",
        "impactFlash",
        "destroy",
    }
    assert required_methods <= set(probe["methods"])
    assert probe["reducedPreference"] is True
    assert probe["normalPreference"] is False
    assert probe["introTarget"] == {"x": 10, "y": 20, "alpha": 1}
    assert probe["ambientCount"] == 3
    assert probe["ambientDepth"] == 1
    assert probe["duration"] == 0
    assert probe["pointerHandlers"] == []
    assert "container" in probe["destroyed"]


def test_motion_service_drops_stopped_infinite_tweens_from_its_registry():
    probe = _run_node(
        r"""
const { MotionVfx } = await import('./web/static/phaser/fx/motion-vfx.js');
const handlers = new Map();
const fakeTween = {
  once(name, callback) { handlers.set(name, callback); return this; },
  stop() { const callback = handlers.get('stop'); if (callback) callback(); },
};
const scene = {
  events: { once() {} },
  tweens: { add() { return fakeTween; } },
};
const motion = new MotionVfx(scene);
const tween = motion.tween({ targets: {}, repeat: -1 });
const before = motion.tweens.size;
tween.stop();
const after = motion.tweens.size;
motion.destroy();
console.log(JSON.stringify({ before, after }));
"""
    )

    assert probe == {"before": 1, "after": 0}


def test_presentation_layer_routes_distinct_combat_and_result_audio_cues():
    probe = _run_node(
        r"""
const { createPresentationLayer } = await import('./web/static/phaser/core/presentation-layer.js');
const played = [];
const settings = {
  effectiveReducedMotion() { return false; },
  subscribe() { return () => {}; },
};
const audio = {
  settings,
  cue(name) { played.push(name); return true; },
};
const scene = { keyName: 'CombatScene', events: { once() {} } };
const layer = createPresentationLayer(scene, { audio, settings, motionOptions: { reducedMotion: true } });
layer.interactionCue(scene, { cue: 'queue', context: 'queue-reorder' });
layer.interactionCue(scene, { cue: 'turn-pass' });
layer.interactionCue(scene, { cue: 'skill-resolve' });
layer.interactionCue(scene, { cue: 'heal' });
layer.interactionCue(scene, { cue: 'status-change' });
layer.interactionCue({ keyName: 'ResultScene' }, { cue: 'reveal' });
layer.interactionCue(scene, { cue: 'reveal' });
await layer.destroy();
console.log(JSON.stringify({ played }));
"""
    )

    assert probe["played"] == ["reorder", "turn", "skill", "heal", "status", "result", "reveal"]


def test_combat_playback_uses_semantic_skill_heal_status_reveal_and_impact_cues():
    source = (ROOT / "web/static/phaser/fx/combat-playback-scene.js").read_text(encoding="utf-8")

    assert "cue: 'skill-resolve'" in source
    assert "cue: 'heal'" in source
    assert "cue: 'status-change'" in source
    assert "cue: 'reveal'" in source
    assert "presentationLayer.impactFlash" in source
    assert "ENERGY_NAMES[payload.energy]" in source


def test_presentation_barrel_exports_registry_rendering_motion_audio_and_preload_api():
    probe = _run_node(
        r"""
const presentation = await import('./web/static/phaser/core/presentation-layer.js');
const loaded = [];
const scene = {
  load: { image(key, path) { loaded.push([key, path]); } },
  textures: { exists() { return false; } },
  events: { once() {} },
};
const preloadResult = presentation.preloadPresentationAssets(scene);
const layer = presentation.createPresentationLayer(scene, {
  motionOptions: { reducedMotion: true },
  audioOptions: { environment: {}, storage: null },
});
scene.presentationLayer = layer;
const reused = presentation.createPresentationLayer(scene) === layer;
const visual = layer.skill.visualFor('fc_yuji_itadori_divergent_fist');
await layer.destroy();
console.log(JSON.stringify({
  exports: Object.keys(presentation).sort(),
  preloadResult,
  loaded,
  visualId: visual.id,
  hasMotion: layer.motion instanceof presentation.MotionVfx,
  hasAudio: layer.audio instanceof presentation.InteractionSfx,
  hasDrawIcon: typeof layer.skill.drawIcon === 'function',
  hasDrawArt: typeof layer.skill.drawArt === 'function',
  reused,
  compatibilityMethods: ['skillVisualFor', 'renderSkillVisual', 'renderFighterState', 'renderTargetLane', 'renderSelectedFighter', 'renderQueueReviewState', 'interactionCue', 'ambientWorld', 'sceneIntro', 'queueCommit', 'impactFlash']
    .filter((name) => typeof layer[name] === 'function'),
}));
"""
    )

    required_exports = {
        "InteractionSfx",
        "MotionVfx",
        "SFX_MIXER_CONFIG",
        "SKILL_ACTION_ATLAS",
        "SKILL_VISUALS",
        "createPresentationLayer",
        "drawSkillArtCrop",
        "drawSkillIcon",
        "preloadPresentationAssets",
        "skillVisualFor",
    }
    assert required_exports <= set(probe["exports"])
    assert probe["preloadResult"] is True
    assert probe["loaded"] == [
        ["s3-skill-atlas-body-v3", "/static/assets/skills/culling-current/skill-atlas-body-v3.webp"],
        ["s3-skill-atlas-technique-v3", "/static/assets/skills/culling-current/skill-atlas-technique-v3.webp"],
        ["s3-skill-atlas-curse-v3", "/static/assets/skills/culling-current/skill-atlas-curse-v3.webp"],
        ["s3-skill-atlas-focus-guard-v3", "/static/assets/skills/culling-current/skill-atlas-focus-guard-v3.webp"],
        ["s3-skill-atlas-focus-control-v3", "/static/assets/skills/culling-current/skill-atlas-focus-control-v3.webp"],
    ]
    assert probe["visualId"] == "fc_yuji_itadori_divergent_fist"
    assert probe["hasMotion"] is True
    assert probe["hasAudio"] is True
    assert probe["hasDrawIcon"] is True
    assert probe["hasDrawArt"] is True
    assert probe["reused"] is True
    assert set(probe["compatibilityMethods"]) == {
        "skillVisualFor",
        "renderSkillVisual",
        "renderFighterState",
        "renderTargetLane",
        "renderSelectedFighter",
        "renderQueueReviewState",
        "interactionCue",
        "ambientWorld",
        "sceneIntro",
        "queueCommit",
        "impactFlash",
    }
