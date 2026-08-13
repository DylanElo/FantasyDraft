# Interaction audio pack — provenance

Status: authored 2026-08-12. Not yet wired into the runtime.

## What this is

Fourteen original interaction cues covering the complete semantic cue set in
`docs/phaser_audio_system.md`. They are an optional replacement for the live
WebAudio synthesis in `web/static/phaser/core/interaction-sfx.js`, which that
document already anticipates: *"A future licensed/original asset pack may
replace the synthesis while keeping the same semantic cue names."*

The cue names here match that document and the existing implementation exactly,
so swapping playback for synthesis does not change any call site.

## Origin — why this pack carries no third-party rights question

Every sample is computed by `tools/generate_audio_pack.py` from oscillator and
filter maths in that file. Specifically, the pipeline contains:

- **No recordings.** Nothing was captured from a microphone or any physical source.
- **No sample library.** No commercial, free, or Creative Commons sample packs.
- **No third-party audio.** Nothing was copied, extracted, or adapted from the
  anime, the games, or any other work.
- **No generative model.** No AI audio model, no training data, no prompts. This
  is deterministic signal processing, not generation.
- **No dependencies.** Standard library only — `math`, `wave`, `struct`, `random`.
  The `random` use is a seeded LCG producing noise transients, seeded per cue so
  output is reproducible.

The consequence is that the pack is byte-for-byte reproducible from source.
Re-running the generator on this revision reproduces identical files, which was
verified. A reviewer can therefore confirm originality by reading roughly 300
lines of arithmetic rather than by auditing an asset trail.

**This is a factual description of how the files were made. It is not a legal
clearance.** Per `asset-clearance-manifest.json`, only the rights owner or a
qualified reviewer may mark anything cleared, and provenance never grants that
status by itself.

## Technical specification

| Property | Value |
|---|---|
| Format | WAV, PCM signed 16-bit little-endian |
| Sample rate | 44,100 Hz |
| Channels | 1 (mono) |
| Peak ceiling | 0.72 of full scale |
| Total size | ~356 KiB across 14 files |
| Reproducible | Yes, verified byte-identical across runs |

## Mix conformance

`docs/phaser_audio_system.md` constrains the palette; this pack follows it:

- **Sine and triangle layers only.** No raw square or sawtooth, which the
  document notes turn brittle on small phone speakers.
- **Seeded, filtered noise transients** via a one-pole filter, used only for
  paper/air texture.
- **An amplitude envelope on every voice.**
- **Bus loudness hierarchy preserved** — measured mean RMS: combat `0.111`,
  UI `0.091`, cinematic `0.078`. This satisfies "UI cues sit below combat cues;
  cinematic cues remain restrained so reveal/result sounds do not overpower
  combat information."
- **No clipping.** Zero samples at or beyond full scale in any file.
- **`result` is deliberately neutral** — an even whole-tone step rather than a
  triumphant or minor cadence, so the cue cannot imply win, loss, draw, or
  no-contest. The visual result stays the authoritative explanation.

## What has NOT been verified

Automated checks cannot judge timbre, loudness on real phone speakers, headphone
fatigue, or preference — the audio document says so, and it is still true here.
These files were verified for structure, level, determinism, and clipping only.
**Nobody has listened to them.**

Release acceptance still requires the human listening pass the document
mandates: iOS Safari and Android Chrome, at low, medium, and full device volume,
on both speaker and headphones.

## Regenerating

```bash
python tools/generate_audio_pack.py
```

Edit the cue functions in the generator to retune. Do not hand-edit the WAV
files — that breaks reproducibility, which is the property that makes this pack
cheap to review.
