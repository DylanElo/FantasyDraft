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
        "confirm",
        "error",
        "reveal",
        "impact",
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
  compatibilityMethods: ['skillVisualFor', 'renderSkillVisual', 'renderFighterState', 'renderTargetLane', 'renderSelectedFighter', 'interactionCue', 'ambientWorld', 'sceneIntro', 'queueCommit', 'impactFlash']
    .filter((name) => typeof layer[name] === 'function'),
}));
"""
    )

    required_exports = {
        "InteractionSfx",
        "MotionVfx",
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
    assert probe["loaded"] == [[
        "s3-skill-action-atlas-v2",
        "/static/assets/skills/culling-current/skill-action-atlas-v2.png",
    ]]
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
        "interactionCue",
        "ambientWorld",
        "sceneIntro",
        "queueCommit",
        "impactFlash",
    }
