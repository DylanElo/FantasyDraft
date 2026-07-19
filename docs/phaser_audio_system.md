# Phaser combat audio system

Status: maintained synthesized fallback, 2026-07-19.

## Purpose and authority boundary

The Phaser client uses a small original WebAudio mix for immediate mobile
feedback. It presents authoritative input and Battle v2 events; it never
decides whether an action is legal, applies an effect, advances a turn, or
infers hidden information.

The maintained implementation is
`web/static/phaser/core/interaction-sfx.js`. It has no production dependency
and ships no copied or third-party audio. A future licensed/original asset pack
may replace the synthesis while keeping the same semantic cue names.

## Semantic cue set

| Cue | Player meaning | Character |
| --- | --- | --- |
| `press` | Physical contact with a control | Soft low tap and paper transient |
| `select` | Fighter/skill selection | Warm rising interval |
| `target` | Legal target lock | Focused two-note lock |
| `queue` | Action placed/opened in Queue Review | Card drop and placement tick |
| `reorder` | Queue order changed | Short down/up movement pair |
| `confirm` | Queue or major choice committed | Compact three-note resolve |
| `error` | Disabled/rejected interaction | Two low descending pulses |
| `skill` | Visible technique begins resolving | Low body, energy rise, filtered air |
| `impact` | Authoritative damage impact | Low thump and filtered air burst |
| `heal` | Authoritative healing | Gentle ascending pair |
| `status` | Status or energy state changed | Low, restrained unstable pulse |
| `reveal` | Counter, reflect, or hidden reveal | Airy upward signature |
| `turn` | Player turn is passed/handed off | Low marker and delayed response |
| `result` | Terminal result screen opens | Neutral three-note cadence |

Result audio is intentionally neutral so victory, defeat, draw, and no-contest
cannot be misrepresented by a client-side guess. The visual result remains the
authoritative explanation.

## Mix architecture

The cue palette avoids raw square and sawtooth waves, which become brittle on
small phone speakers. It uses only sine/triangle tone layers and short seeded
noise transients, each with an amplitude envelope and low-pass filter.

```text
voice envelopes + filters
  -> UI / combat / cinematic buses
  -> dynamics compressor
  -> persisted volume + immediate mute gain
  -> device output
```

Cue input peaks are statically limited, the master gain is conservative, and a
soft compressor controls coincident cues. A finite active-voice budget prevents
runaway scheduling. UI cues sit below combat cues; cinematic cues remain
restrained so reveal/result sounds do not overpower combat information.

## Platform behavior

- No `AudioContext` is created or resumed before a trusted pointer, touch, or
  keyboard gesture.
- One persistent audio service survives scene transitions. Scene teardown does
  not close and recreate the device context.
- Mute immediately drops the master output, including an active cue tail.
- Volume, mute, and haptics continue to use
  `jjk_arena.presentation_settings.v1`.
- Haptics remain independent of sound mute and safely no-op when unsupported.
- Reduced-motion mode does not remove semantic audio. Sound can be muted
  independently; this avoids treating a visual-motion preference as an audio
  preference.
- Missing WebAudio features degrade progressively: filters, noise, and the
  compressor are optional, while supported tone layers still play. If WebAudio
  is unavailable, cues fail silently without blocking input.

## Verification

Automated checks cover:

- trusted-gesture gating and no pre-gesture context creation;
- cue availability and semantic routing;
- persisted mute/volume/haptics behavior;
- context reuse across scene transitions;
- sine/triangle-only tonal palette, filter metadata, cue peak budgets, master
  compressor creation, and immediate master mute;
- graceful no-audio fallback.

Automated checks cannot judge timbre, loudness across real phone speakers,
headphone fatigue, or personal preference. Release acceptance still requires a
human listening pass on at least iOS Safari and Android Chrome at low, medium,
and full device volume, with both speaker and headphones.
