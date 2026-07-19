import json
import re
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


def test_presentation_settings_persist_and_resolve_system_motion():
    probe = _run_node(
        r"""
const {
  PRESENTATION_SETTINGS_STORAGE_KEY,
  PresentationSettings,
  getPersistentPresentationSettings,
} = await import('./web/static/phaser/core/presentation-settings.js');
const values = new Map();
const storage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, value); },
};
let systemReduced = true;
const environment = {
  localStorage: storage,
  matchMedia() { return { matches: systemReduced }; },
};
const settings = new PresentationSettings({ environment, storage });
const defaults = settings.snapshot();
let notifications = 0;
settings.subscribe(() => { notifications += 1; });
settings.setMuted(true);
settings.setVolume(0.33);
settings.setHaptics(false);
const systemMotion = settings.effectiveReducedMotion();
settings.setMotion('full');
const fullMotion = settings.effectiveReducedMotion();
settings.setMotion('reduced');
const reducedMotion = settings.effectiveReducedMotion();
const restored = new PresentationSettings({ environment, storage }).snapshot();
const persistentA = getPersistentPresentationSettings({ environment, storage });
const persistentB = getPersistentPresentationSettings({ environment, storage });
console.log(JSON.stringify({
  defaults,
  notifications,
  systemMotion,
  fullMotion,
  reducedMotion,
  restored,
  persisted: JSON.parse(values.get(PRESENTATION_SETTINGS_STORAGE_KEY)),
  samePersistentInstance: persistentA === persistentB,
}));
"""
    )

    assert probe["defaults"] == {
        "muted": False,
        "volume": 0.7,
        "haptics": True,
        "motion": "system",
    }
    assert probe["notifications"] == 5
    assert probe["systemMotion"] is True
    assert probe["fullMotion"] is False
    assert probe["reducedMotion"] is True
    assert probe["restored"] == probe["persisted"] == {
        "muted": True,
        "volume": 0.35,
        "haptics": False,
        "motion": "reduced",
    }
    assert probe["samePersistentInstance"] is True


def test_audio_context_and_mixer_survive_scene_transitions_with_safe_haptics():
    probe = _run_node(
        r"""
const { createPresentationLayer } = await import('./web/static/phaser/core/presentation-layer.js');
let contextsCreated = 0;
let contextsClosed = 0;
let oscillatorsStarted = 0;
const vibrations = [];
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
      frequency: new FakeParam(), connect() {},
      start() { oscillatorsStarted += 1; }, stop() {},
    };
  }
  createGain() { return { gain: new FakeParam(), connect() {} }; }
  async close() { this.state = 'closed'; contextsClosed += 1; }
}
const environment = {
  AudioContext: FakeContext,
  localStorage: storage,
  navigator: { vibrate(pattern) { vibrations.push(pattern); return true; } },
  matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
};
const scene = () => ({ events: { once() {} } });
const firstScene = scene();
const first = createPresentationLayer(firstScene, { environment });
await first.audio.unlockFromGesture();
const firstCue = first.interactionCue(firstScene, { cue: 'select' });
await first.destroy();
const afterFirstDestroy = {
  audioDestroyed: first.audio.destroyed,
  unlocked: first.audio.isUnlocked(),
  contextsClosed,
};
const secondScene = scene();
const second = createPresentationLayer(secondScene, { environment });
second.settings.setVolume(0.35);
second.settings.setMuted(true);
const mutedCue = second.interactionCue(secondScene, { cue: 'error' });
second.settings.setHaptics(false);
const hapticsOffCue = second.interactionCue(secondScene, { cue: 'queue' });
await second.destroy();
const beforeExplicitShutdown = { contextsCreated, contextsClosed, sameAudio: first.audio === second.audio };
await second.audio.destroy();
console.log(JSON.stringify({
  firstCue,
  mutedCue,
  hapticsOffCue,
  afterFirstDestroy,
  beforeExplicitShutdown,
  contextsClosed,
  oscillatorsStarted,
  vibrations,
  savedSettings: second.settings.snapshot(),
}));
"""
    )

    assert probe["firstCue"] is True
    assert probe["mutedCue"] is True  # Audio is muted, but its haptic remains intentional.
    assert probe["hapticsOffCue"] is False
    assert probe["afterFirstDestroy"] == {
        "audioDestroyed": False,
        "unlocked": True,
        "contextsClosed": 0,
    }
    assert probe["beforeExplicitShutdown"] == {
        "contextsCreated": 1,
        "contextsClosed": 0,
        "sameAudio": True,
    }
    assert probe["contextsClosed"] == 1
    assert probe["oscillatorsStarted"] >= 1
    assert probe["vibrations"] == [[8], [24, 38, 24]]
    assert probe["savedSettings"] == {
        "muted": True,
        "volume": 0.35,
        "haptics": False,
        "motion": "system",
    }


def test_base_scene_stages_portraits_and_all_unique_skill_atlases_after_boot():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class {} };
const { BaseScene } = await import('./web/static/phaser/scenes/base-scene.js');
const loaded = [];
let complete = null;
let starts = 0;
const scene = Object.create(BaseScene.prototype);
Object.assign(scene, {
  keyName: 'FirstCreationScene',
  store: { playerTeam: [], enemyTeam: [], state: null },
  pendingAssetKeys: new Set(),
  attemptedAssetKeys: new Set(),
  textures: { exists(key) { return key === 'portrait_yuji_itadori'; } },
  load: {
    image(key, url) { loaded.push([key, url]); },
    once(name, callback) { if (name === 'complete') complete = callback; },
    isLoading() { return false; },
    start() { starts += 1; },
  },
  scene: { isActive() { return false; } },
});
const requested = scene.ensureSceneAssets();
const pendingBefore = scene.pendingAssetKeys.size;
complete();
console.log(JSON.stringify({
  requested,
  starts,
  pendingBefore,
  pendingAfter: scene.pendingAssetKeys.size,
  portraitCount: loaded.filter(([key]) => key.startsWith('portrait_')).length,
  atlasKeys: loaded.filter(([key]) => key.startsWith('s3-skill-atlas-')).map(([key]) => key),
  fallbackKeys: loaded.filter(([key]) => key.startsWith('s3-skill-') && !key.startsWith('s3-skill-atlas-')).map(([key]) => key),
}));
"""
    )

    assert probe["requested"] is True
    assert probe["starts"] == 1
    assert probe["pendingBefore"] == 27  # 18 portraits + 5 atlases + 4 safe fallbacks.
    assert probe["pendingAfter"] == 0
    assert probe["portraitCount"] == 18
    assert probe["atlasKeys"] == [
        "s3-skill-atlas-body-v3",
        "s3-skill-atlas-technique-v3",
        "s3-skill-atlas-curse-v3",
        "s3-skill-atlas-focus-guard-v3",
        "s3-skill-atlas-focus-control-v3",
    ]
    assert probe["fallbackKeys"] == [
        "s3-skill-body",
        "s3-skill-technique",
        "s3-skill-focus",
        "s3-skill-curse",
    ]


def test_destination_scene_rejects_the_pointer_event_that_started_it():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class {} };
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
const { BaseScene } = await import('./web/static/phaser/scenes/base-scene.js');
let destinationActivations = 0;
let delayedCalls = 0;
const destination = Object.create(BaseScene.prototype);
Object.assign(destination, {
  keyName: 'LobbyScene',
  buttons: [{ x: 0, y: 0, w: 44, h: 44, label: 'Records', disabled: false, onClick() { destinationActivations += 1; } }],
  time: { now: 101, delayedCall() { delayedCalls += 1; } },
  presentationLayer: null,
  scene: { isActive() { return false; } },
  render() {},
});
const source = Object.create(BaseScene.prototype);
const pointer = { x: 20, y: 20, downTime: 100 };
Object.assign(source, {
  keyName: 'ResultScene',
  buttons: [{ x: 0, y: 0, w: 44, h: 44, label: 'Return Home', disabled: false, onClick() { destination.handlePointer(pointer); } }],
  time: { now: 100, delayedCall() { delayedCalls += 1; } },
  presentationLayer: null,
  scene: { isActive() { return false; } },
  render() {},
});
source.handlePointer(pointer);
const afterTransitionTap = { destinationActivations, delayedCalls };
await Promise.resolve();
pointer.downTime = 101;
destination.handlePointer(pointer);
console.log(JSON.stringify({ afterTransitionTap, afterFreshTap: { destinationActivations, delayedCalls } }));
"""
    )

    assert probe["afterTransitionTap"] == {"destinationActivations": 0, "delayedCalls": 1}
    assert probe["afterFreshTap"] == {"destinationActivations": 1, "delayedCalls": 2}


def test_scene_asset_staging_deduplicates_game_wide_in_flight_textures():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class {} };
const { BaseScene } = await import('./web/static/phaser/scenes/base-scene.js');
const textures = new Set();
const queued = [];
let firstComplete = null;
let secondStarts = 0;
let secondRenders = 0;
function scene(keyName, loader) {
  const value = Object.create(BaseScene.prototype);
  Object.assign(value, {
    keyName,
    store: { playerTeam: ['yuji_itadori'], enemyTeam: [], state: null },
    pendingAssetKeys: new Set(),
    attemptedAssetKeys: new Set(),
    textures: { exists(key) { return textures.has(key); } },
    load: loader,
    scene: { isActive() { return true; } },
    render() {},
  });
  return value;
}
const first = scene('LobbyScene', {
  image(key) { queued.push(['first', key]); },
  once(name, callback) { if (name === 'complete') firstComplete = callback; },
  isLoading() { return false; },
  start() {},
});
const second = scene('RecordsScene', {
  image(key) { queued.push(['second', key]); },
  once() {},
  isLoading() { return false; },
  start() { secondStarts += 1; },
});
second.render = () => { secondRenders += 1; };
const firstRequested = first.ensureSceneAssets();
const secondRequested = second.ensureSceneAssets();
textures.add('portrait_yuji_itadori');
firstComplete();
console.log(JSON.stringify({ firstRequested, secondRequested, queued, secondStarts, secondRenders }));
"""
    )

    assert probe == {
        "firstRequested": True,
        "secondRequested": False,
        "queued": [["first", "portrait_yuji_itadori"]],
        "secondStarts": 0,
        "secondRenders": 1,
    }


def test_combat_presentation_closes_readability_motion_and_target_vfx_gaps():
    combat = (ROOT / "web/static/phaser/scenes/combat-scene.js").read_text(encoding="utf-8")
    queue = (ROOT / "web/static/phaser/scenes/combat-queue-review-scene.js").read_text(encoding="utf-8")
    playback = (ROOT / "web/static/phaser/fx/combat-playback-scene.js").read_text(encoding="utf-8")
    presentation = (ROOT / "web/static/phaser/core/presentation-layer.js").read_text(encoding="utf-8")
    boot = (ROOT / "web/static/phaser/scenes/boot-scene.js").read_text(encoding="utf-8")
    base = (ROOT / "web/static/phaser/scenes/base-scene.js").read_text(encoding="utf-8")

    assert not re.search(r"fontSize:\s*['\"](?:[0-8])px['\"]", combat)
    assert not re.search(r"fontSize:\s*['\"](?:[0-8])px['\"]", queue)
    assert "cards: motionCards" in queue
    assert queue.index("const motionCards") < queue.index("cards: motionCards")
    assert "renderQueueReviewState(_targetScene" in presentation

    assert "if (!selectedSkill)" in combat
    fighter_hook = presentation.split("renderFighterState", 1)[1].split("renderTargetLane", 1)[0]
    selected_hook = presentation.split("renderSelectedFighter", 1)[1].split("renderQueueReviewState", 1)[0]
    assert "legalTargetCue" not in fighter_hook
    assert "legalTargetCue" not in selected_hook

    assert playback.count("this.tweens.add(") == 1
    assert "if (!this.playbackReducedMotion()) this.cameras.main.shake" in playback
    assert "this.activeCinematicCutInTween.stop()" in playback
    assert "this.activeCinematicCutInNodes === nodes" in playback
    assert "titleNode.setMaxLines(1)" in playback
    assert "this.activeActionBannerTween.stop()" in playback
    assert "this.activeActionBannerNodes === nodes" in playback
    assert "bannerTitle.setMaxLines(1)" in playback
    assert "effectiveReducedMotion" in boot
    assert "startupPortraitIds" in boot
    assert "preloadPresentationAssets(this)" not in boot
    assert "Object.values(SKILL_ACTION_ATLASES)" in base
    legacy = (ROOT / "web/static/phaser/legacy-shell.js").read_text(encoding="utf-8")
    assert "window.JJKPhaserShell = { store, bootReady: false }" in legacy
    assert "if (!window.JJKPhaserShell.bootReady) return;" in legacy
    assert "window.JJKPhaserShell.bootReady = true" in boot
    assert "this.scene.start(destination)" in boot

    assert "renderPresentationSettingsSheet" in base
    assert "PRESENTATION" in base
    assert "VOLUME" in base
    assert "HAPTICS" in base
    assert "MOTION" in base
    assert "Open sound and battle settings" in combat
