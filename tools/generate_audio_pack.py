"""Render the original JJK Arena interaction audio pack.

Deterministic, standard-library-only DSP. Every sample is computed from the
code in this file: there is no recording, no sample library, no third-party
audio, and no generative model in the pipeline. Re-running this script on the
same revision reproduces byte-identical WAV files, which is what makes the pack
trivially auditable for rights review.

Cue names and character follow `docs/phaser_audio_system.md`. The mix rules from
that document are enforced here too: sine and triangle tone layers only (no raw
square or sawtooth, which turn brittle on phone speakers), short filtered noise
transients, an amplitude envelope on every voice, and a conservative peak
ceiling.

Usage:
    python tools/generate_audio_pack.py [--outdir web/static/assets/audio]
"""

from __future__ import annotations

import argparse
import json
import math
import pathlib
import random
import struct
import wave

SAMPLE_RATE = 44_100
PEAK_CEILING = 0.72  # headroom for the runtime compressor and coincident cues
BIT_DEPTH = 16


# --------------------------------------------------------------------------
# primitives
# --------------------------------------------------------------------------
def _sine(freq: float, t: float) -> float:
    return math.sin(2.0 * math.pi * freq * t)


def _triangle(freq: float, t: float) -> float:
    phase = (freq * t) % 1.0
    return 4.0 * abs(phase - 0.5) - 1.0


def _glide(start: float, end: float, progress: float) -> float:
    """Exponential frequency glide; matches how pitch is perceived."""
    if start <= 0 or end <= 0:
        return start + (end - start) * progress
    return start * (end / start) ** progress


def _envelope(index: int, total: int, attack: float, release: float) -> float:
    """Percussive attack/decay envelope, both segments in seconds."""
    t = index / SAMPLE_RATE
    dur = total / SAMPLE_RATE
    if t < attack:
        return t / attack if attack > 0 else 1.0
    remaining = dur - t
    if remaining < release:
        return max(0.0, remaining / release) if release > 0 else 0.0
    return 1.0


def _tone(buf: list[float], *, freq, to=None, dur, gain, wave_fn=_sine,
          start=0.0, attack=0.004, release=None, vibrato=0.0):
    """Mix one tone voice into buf at `start` seconds."""
    n = int(dur * SAMPLE_RATE)
    offset = int(start * SAMPLE_RATE)
    release = dur * 0.72 if release is None else release
    end_freq = freq if to is None else to
    phase = 0.0
    for i in range(n):
        pos = offset + i
        if pos >= len(buf):
            break
        progress = i / max(1, n - 1)
        f = _glide(freq, end_freq, progress)
        if vibrato:
            f *= 1.0 + vibrato * math.sin(2.0 * math.pi * 5.5 * (i / SAMPLE_RATE))
        # integrate frequency so glides stay phase-continuous
        phase += f / SAMPLE_RATE
        buf[pos] += wave_fn(1.0, phase) * _envelope(i, n, attack, release) * gain


def _noise(buf: list[float], *, dur, gain, cutoff, seed, start=0.0,
           attack=0.001, release=None, highpass=False):
    """Mix a seeded, filtered noise transient into buf."""
    n = int(dur * SAMPLE_RATE)
    offset = int(start * SAMPLE_RATE)
    release = dur * 0.85 if release is None else release
    rng = random.Random(seed)
    # one-pole coefficient
    dt = 1.0 / SAMPLE_RATE
    rc = 1.0 / (2.0 * math.pi * cutoff)
    alpha = dt / (rc + dt)
    lp = 0.0
    for i in range(n):
        pos = offset + i
        if pos >= len(buf):
            break
        white = rng.uniform(-1.0, 1.0)
        lp += alpha * (white - lp)
        value = (white - lp) if highpass else lp
        buf[pos] += value * _envelope(i, n, attack, release) * gain


def _buffer(seconds: float) -> list[float]:
    return [0.0] * int(seconds * SAMPLE_RATE)


# --------------------------------------------------------------------------
# cues — character text mirrors docs/phaser_audio_system.md
# --------------------------------------------------------------------------
def cue_press() -> list[float]:
    """Soft low tap and paper transient."""
    b = _buffer(0.11)
    _tone(b, freq=186, to=150, dur=0.075, gain=0.21, release=0.06)
    _noise(b, dur=0.030, gain=0.085, cutoff=2600, seed=11, highpass=True)
    return b


def cue_select() -> list[float]:
    """Warm rising interval."""
    b = _buffer(0.20)
    _tone(b, freq=392, dur=0.10, gain=0.24, wave_fn=_triangle, release=0.08)
    _tone(b, freq=494, dur=0.13, gain=0.22, wave_fn=_triangle, start=0.055, release=0.10)
    return b


def cue_target() -> list[float]:
    """Focused two-note lock."""
    b = _buffer(0.19)
    _tone(b, freq=740, dur=0.055, gain=0.20, release=0.04)
    _tone(b, freq=988, dur=0.090, gain=0.22, start=0.058, release=0.07)
    _noise(b, dur=0.018, gain=0.06, cutoff=5200, seed=23, start=0.058, highpass=True)
    return b


def cue_queue() -> list[float]:
    """Card drop and placement tick."""
    b = _buffer(0.17)
    _noise(b, dur=0.055, gain=0.17, cutoff=1900, seed=37, highpass=True)
    _tone(b, freq=232, to=196, dur=0.085, gain=0.26, start=0.012, release=0.07)
    _tone(b, freq=880, dur=0.022, gain=0.11, start=0.030, release=0.018)
    return b


def cue_reorder() -> list[float]:
    """Short down/up movement pair."""
    b = _buffer(0.20)
    _tone(b, freq=540, to=414, dur=0.070, gain=0.19, wave_fn=_triangle, release=0.05)
    _tone(b, freq=414, to=572, dur=0.085, gain=0.19, wave_fn=_triangle, start=0.078, release=0.06)
    return b


def cue_confirm() -> list[float]:
    """Compact three-note resolve."""
    b = _buffer(0.34)
    for i, f in enumerate((523.25, 659.25, 783.99)):
        _tone(b, freq=f, dur=0.13 + i * 0.03, gain=0.20,
              wave_fn=_triangle, start=i * 0.062, release=0.11)
    return b


def cue_error() -> list[float]:
    """Two low descending pulses."""
    b = _buffer(0.28)
    _tone(b, freq=233, to=190, dur=0.10, gain=0.26, release=0.07)
    _tone(b, freq=190, to=152, dur=0.12, gain=0.24, start=0.115, release=0.09)
    return b


def cue_skill() -> list[float]:
    """Low body, energy rise, filtered air."""
    b = _buffer(0.42)
    _tone(b, freq=104, dur=0.30, gain=0.28, attack=0.010, release=0.22)
    _tone(b, freq=294, to=698, dur=0.32, gain=0.16, wave_fn=_triangle,
          attack=0.030, release=0.20)
    _noise(b, dur=0.34, gain=0.09, cutoff=3400, seed=53, attack=0.06, highpass=True)
    return b


def cue_impact() -> list[float]:
    """Low thump and filtered air burst."""
    b = _buffer(0.30)
    _tone(b, freq=118, to=64, dur=0.19, gain=0.42, attack=0.002, release=0.15)
    _noise(b, dur=0.13, gain=0.22, cutoff=1500, seed=71)
    _noise(b, dur=0.075, gain=0.10, cutoff=4800, seed=73, highpass=True)
    return b


def cue_heal() -> list[float]:
    """Gentle ascending pair."""
    b = _buffer(0.34)
    _tone(b, freq=523.25, dur=0.15, gain=0.17, attack=0.014, release=0.12)
    _tone(b, freq=783.99, dur=0.19, gain=0.15, start=0.095, attack=0.018, release=0.15)
    return b


def cue_status() -> list[float]:
    """Low, restrained unstable pulse."""
    b = _buffer(0.30)
    _tone(b, freq=214, dur=0.24, gain=0.22, wave_fn=_triangle,
          attack=0.012, release=0.18, vibrato=0.035)
    _noise(b, dur=0.10, gain=0.05, cutoff=900, seed=89)
    return b


def cue_reveal() -> list[float]:
    """Airy upward signature."""
    b = _buffer(0.42)
    _tone(b, freq=660, to=1320, dur=0.28, gain=0.15, attack=0.020, release=0.22)
    _tone(b, freq=990, to=1760, dur=0.24, gain=0.08, start=0.055, attack=0.030, release=0.19)
    _noise(b, dur=0.30, gain=0.07, cutoff=6200, seed=101, attack=0.05, highpass=True)
    return b


def cue_turn() -> list[float]:
    """Low marker and delayed response."""
    b = _buffer(0.40)
    _tone(b, freq=165, dur=0.13, gain=0.28, release=0.10)
    _tone(b, freq=247, dur=0.17, gain=0.20, start=0.150, release=0.13)
    return b


def cue_result() -> list[float]:
    """Neutral three-note cadence.

    Deliberately neutral: the doc requires that result audio cannot imply win,
    loss, draw or no-contest, so this is an even whole-tone step rather than a
    triumphant or minor cadence.
    """
    b = _buffer(0.52)
    for i, f in enumerate((440.00, 493.88, 554.37)):
        _tone(b, freq=f, dur=0.22, gain=0.17, wave_fn=_triangle,
              start=i * 0.105, attack=0.012, release=0.18)
    return b


CUES = {
    "press": cue_press, "select": cue_select, "target": cue_target,
    "queue": cue_queue, "reorder": cue_reorder, "confirm": cue_confirm,
    "error": cue_error, "skill": cue_skill, "impact": cue_impact,
    "heal": cue_heal, "status": cue_status, "reveal": cue_reveal,
    "turn": cue_turn, "result": cue_result,
}


# --------------------------------------------------------------------------
# output
# --------------------------------------------------------------------------
def _limit(buf: list[float]) -> list[float]:
    peak = max((abs(s) for s in buf), default=0.0)
    if peak <= 0:
        return buf
    scale = PEAK_CEILING / peak if peak > PEAK_CEILING else 1.0
    return [s * scale for s in buf]


def _write_wav(path: pathlib.Path, buf: list[float]) -> int:
    frames = b"".join(
        struct.pack("<h", max(-32768, min(32767, int(s * 32767.0)))) for s in buf
    )
    with wave.open(str(path), "wb") as fh:
        fh.setnchannels(1)
        fh.setsampwidth(BIT_DEPTH // 8)
        fh.setframerate(SAMPLE_RATE)
        fh.writeframes(frames)
    return path.stat().st_size


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--outdir", default="web/static/assets/audio")
    args = ap.parse_args()

    out = pathlib.Path(args.outdir)
    out.mkdir(parents=True, exist_ok=True)

    index, total = {}, 0
    for name, fn in CUES.items():
        buf = _limit(fn())
        size = _write_wav(out / f"{name}.wav", buf)
        total += size
        index[name] = {
            "file": f"{name}.wav",
            "duration_ms": round(len(buf) / SAMPLE_RATE * 1000, 1),
            "bytes": size,
            "peak": round(max((abs(s) for s in buf), default=0.0), 4),
        }
        print(f"  {name:8s} {index[name]['duration_ms']:6.1f} ms  {size:7d} B")

    manifest = {
        "schema_version": 1,
        "generator": "tools/generate_audio_pack.py",
        "origin": "synthesized_from_project_source",
        "sample_rate_hz": SAMPLE_RATE,
        "bit_depth": BIT_DEPTH,
        "channels": 1,
        "peak_ceiling": PEAK_CEILING,
        "deterministic": True,
        "cues": index,
        "total_bytes": total,
    }
    (out / "audio-pack-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\n{len(CUES)} cues, {total/1024:.1f} KiB total -> {out}")


if __name__ == "__main__":
    main()
