"""Sample-pack playback in core/interaction-sfx.js.

The optional original audio pack replaces synthesis per cue. These checks pin
the properties that make that swap safe: no context before a gesture, calibrated
levels inside the mixer budget, independent per-cue fallback, and buffers that do
not outlive their context.
"""

import json
from pathlib import Path

from conftest import run_node

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "web" / "static" / "assets" / "audio"

HARNESS = r"""
const sfx = await import('./web/static/phaser/core/interaction-sfx.js');
const { InteractionSfx, INTERACTION_SFX_SAMPLES, SFX_SAMPLE_CALIBRATION, SFX_MIXER_CONFIG } = sfx;

let contextsCreated = 0;
let oscillatorsStarted = 0;
let buffersStarted = 0;   // any buffer source, including synthesised noise voices
let samplesStarted = 0;   // only decoded pack samples
const gainsSet = [];

class FakeParam {
  constructor() { this.value = 0; }
  setValueAtTime(v) { this.value = v; }
  exponentialRampToValueAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  cancelScheduledValues() {}
  setTargetAtTime(v) { this.value = v; }
}
// Separate so playbackRate and mixer wiring are not mistaken for cue gain.
class GainParam extends FakeParam {
  setValueAtTime(v) { this.value = v; gainsSet.push(v); }
  exponentialRampToValueAtTime(v) { this.value = v; gainsSet.push(v); }
}
class FakeContext {
  constructor() {
    contextsCreated += 1;
    this.state = 'suspended';
    this.currentTime = 1;
    this.sampleRate = 44100;
    this.destination = {};
  }
  async resume() { this.state = 'running'; }
  createGain() { return { gain: new GainParam(), connect() {}, disconnect() {} }; }
  createOscillator() {
    return { frequency: new FakeParam(), type: 'sine', connect() {}, disconnect() {},
             start() { oscillatorsStarted += 1; }, stop() {} };
  }
  createBuffer(ch, len, rate) { return { length: len, sampleRate: rate, getChannelData: () => new Float32Array(len) }; }
  createBufferSource() {
    return {
      buffer: null, playbackRate: new FakeParam(), connect() {}, disconnect() {},
      start() {
        buffersStarted += 1;
        if (this.buffer && this.buffer.decoded) samplesStarted += 1;
      },
      stop() {},
    };
  }
  createBiquadFilter() { return { type: 'lowpass', frequency: new FakeParam(), Q: new FakeParam(), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() {
    return { threshold: new FakeParam(), knee: new FakeParam(), ratio: new FakeParam(),
             attack: new FakeParam(), release: new FakeParam(), connect() {} };
  }
  decodeAudioData(bytes) { return Promise.resolve({ decoded: true, byteLength: bytes.byteLength }); }
  async close() { this.state = 'closed'; }
}

const FAIL = new Set(__FAIL__);
const fetched = [];
function makeEnv() {
  return {
    AudioContext: FakeContext,
    localStorage: { getItem() { return null; }, setItem() {} },
    navigator: {},
    async fetch(url) {
      fetched.push(url);
      const name = String(url).split('/').pop();
      if (FAIL.has(name)) return { ok: false };
      return { ok: true, async arrayBuffer() { return new ArrayBuffer(64); } };
    },
  };
}
"""


def _run(body: str, fail: list[str] | None = None) -> dict:
    script = HARNESS.replace("__FAIL__", json.dumps(fail or [])) + body
    return run_node(script)


def test_sample_pack_files_match_the_cue_manifest_exactly():
    manifest = json.loads((AUDIO_DIR / "audio-pack-manifest.json").read_text(encoding="utf-8"))
    on_disk = {path.name for path in AUDIO_DIR.glob("*.wav")}
    declared = {entry["file"] for entry in manifest["cues"].values()}
    assert on_disk == declared

    probe = _run(
        """
console.log(JSON.stringify({ cues: Object.keys(INTERACTION_SFX_SAMPLES).sort() }));
"""
    )
    # every cue the client can play has a file, and every file maps to a cue
    assert set(probe["cues"]) == set(manifest["cues"])
    assert {f"{cue}.wav" for cue in probe["cues"]} == on_disk


def test_loading_requires_a_gesture_and_never_creates_a_context_early():
    probe = _run(
        """
const audio = new InteractionSfx({ environment: makeEnv(), autoLoadSamples: false });
const beforeGesture = await audio.loadSamplePack();
const contextsBefore = contextsCreated;
await audio.unlockFromGesture();
const afterGesture = await audio.loadSamplePack();
console.log(JSON.stringify({
  beforeGesture, contextsBefore, afterGesture,
  fetchedBeforeGesture: beforeGesture.status === 'locked' && contextsBefore === 0,
}));
"""
    )
    assert probe["beforeGesture"]["status"] == "locked"
    assert probe["beforeGesture"]["loaded"] == 0
    assert probe["contextsBefore"] == 0
    assert probe["afterGesture"]["status"] == "ready"
    assert probe["afterGesture"]["loaded"] == 14
    assert probe["afterGesture"]["failed"] == 0


def test_a_loaded_cue_plays_the_sample_instead_of_the_oscillator_voices():
    probe = _run(
        """
const audio = new InteractionSfx({ environment: makeEnv(), autoLoadSamples: false });
await audio.unlockFromGesture();
const synthOnly = audio.play('impact');
const oscillatorsAfterSynth = oscillatorsStarted;
const samplesAfterSynth = samplesStarted;
await audio.loadSamplePack();
audio.lastPlayed.clear();
const sampled = audio.play('impact');
console.log(JSON.stringify({
  synthOnly, sampled,
  oscillatorsAfterSynth, samplesAfterSynth,
  oscillatorsFinal: oscillatorsStarted, samplesFinal: samplesStarted,
  hasSample: audio.hasSample('impact'),
}));
"""
    )
    # before loading, synthesis drives the cue
    assert probe["synthOnly"] is True
    assert probe["oscillatorsAfterSynth"] > 0
    assert probe["samplesAfterSynth"] == 0
    # after loading, the same cue plays one decoded sample and no new oscillator
    assert probe["sampled"] is True
    assert probe["hasSample"] is True
    assert probe["samplesFinal"] == 1
    assert probe["oscillatorsFinal"] == probe["oscillatorsAfterSynth"]


def test_a_cue_that_fails_to_load_keeps_its_synthesised_voices():
    probe = _run(
        """
const audio = new InteractionSfx({ environment: makeEnv(), autoLoadSamples: false });
await audio.unlockFromGesture();
const result = await audio.loadSamplePack();
const before = { osc: oscillatorsStarted, buf: samplesStarted };
audio.play('impact');
const afterImpact = { osc: oscillatorsStarted, buf: samplesStarted };
audio.play('heal');
const afterHeal = { osc: oscillatorsStarted, buf: samplesStarted };
console.log(JSON.stringify({
  result, before, afterImpact, afterHeal,
  impactHasSample: audio.hasSample('impact'), healHasSample: audio.hasSample('heal'),
}));
""",
        fail=["impact.wav"],
    )
    assert probe["result"]["status"] == "partial"
    assert probe["result"]["loaded"] == 13
    assert probe["result"]["failed"] == 1
    assert probe["impactHasSample"] is False
    assert probe["healHasSample"] is True
    # the failed cue still sounds, via oscillators
    assert probe["afterImpact"]["osc"] > probe["before"]["osc"]
    assert probe["afterImpact"]["buf"] == probe["before"]["buf"]
    # the loaded cue uses a buffer and no extra oscillator
    assert probe["afterHeal"]["buf"] == probe["afterImpact"]["buf"] + 1
    assert probe["afterHeal"]["osc"] == probe["afterImpact"]["osc"]


def test_sample_gain_is_calibrated_and_stays_inside_the_mixer_budget():
    probe = _run(
        """
const audio = new InteractionSfx({ environment: makeEnv(), autoLoadSamples: false });
await audio.unlockFromGesture();
await audio.loadSamplePack();
gainsSet.length = 0;
audio.play('impact');
const atUnity = gainsSet.slice();
audio.lastPlayed.clear();
gainsSet.length = 0;
audio.play('impact', { volume: 0.5 });
const atHalf = gainsSet.slice();
console.log(JSON.stringify({
  calibration: SFX_SAMPLE_CALIBRATION,
  budget: SFX_MIXER_CONFIG.maximumCueInputPeak,
  atUnity, atHalf,
}));
"""
    )
    calibration = probe["calibration"]
    budget = probe["budget"]
    # calibration must actually attenuate, and never exceed the per-cue budget
    assert 0 < calibration < 1
    assert calibration <= budget
    assert calibration in probe["atUnity"]
    assert not [value for value in probe["atUnity"] if value > budget]
    # option volume scales it proportionally
    assert calibration * 0.5 in probe["atHalf"]


def test_muting_still_suppresses_sample_playback_and_destroy_releases_buffers():
    probe = _run(
        """
const audio = new InteractionSfx({ environment: makeEnv(), autoLoadSamples: false });
await audio.unlockFromGesture();
await audio.loadSamplePack();
audio.setMuted(true);
const whileMuted = audio.play('confirm');
const buffersWhileMuted = samplesStarted;
audio.setMuted(false);
audio.lastPlayed.clear();
const afterUnmute = audio.play('confirm');
const bufferCountBeforeDestroy = audio.sampleBuffers.size;
await audio.destroy();
console.log(JSON.stringify({
  whileMuted, buffersWhileMuted, afterUnmute,
  bufferCountBeforeDestroy,
  bufferCountAfterDestroy: audio.sampleBuffers.size,
  statusAfterDestroy: audio.samplePackStatus,
}));
"""
    )
    assert probe["whileMuted"] is False
    assert probe["buffersWhileMuted"] == 0
    assert probe["afterUnmute"] is True
    assert probe["bufferCountBeforeDestroy"] == 14
    assert probe["bufferCountAfterDestroy"] == 0
    assert probe["statusAfterDestroy"] == "idle"


def test_the_pack_loads_automatically_on_the_first_gesture_and_can_be_disabled():
    probe = _run(
        """
const auto = new InteractionSfx({ environment: makeEnv() });
await auto.unlockFromGesture();
await new Promise((r) => setTimeout(r, 0));   // let the fire-and-forget settle
const off = new InteractionSfx({ environment: makeEnv(), autoLoadSamples: false });
await off.unlockFromGesture();
await new Promise((r) => setTimeout(r, 0));
// an environment with no fetch must not throw or block the unlock
const bare = new InteractionSfx({ environment: { AudioContext: FakeContext, navigator: {} } });
const bareUnlocked = await bare.unlockFromGesture();
console.log(JSON.stringify({
  autoLoaded: auto.sampleBuffers.size, autoStatus: auto.samplePackStatus,
  offLoaded: off.sampleBuffers.size, offStatus: off.samplePackStatus,
  bareUnlocked, bareLoaded: bare.sampleBuffers.size,
}));
"""
    )
    assert probe["autoLoaded"] == 14
    assert probe["autoStatus"] == "ready"
    # opting out leaves the synthesised palette untouched
    assert probe["offLoaded"] == 0
    assert probe["offStatus"] == "idle"
    # no fetch available: unlock still succeeds, cues stay synthesised
    assert probe["bareUnlocked"] is True
    assert probe["bareLoaded"] == 0
