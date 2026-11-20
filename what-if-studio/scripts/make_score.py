#!/usr/bin/env python3
"""Generate an original, deterministic music bed for a 3D episode.

    python scripts/make_score.py borrow-skill-3d

Reads the episode's sound.clips.music prompt/length, then writes the same cached
library file that sfx.py expects. The score is synthesized locally; no API call.
"""
from __future__ import annotations

import hashlib
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

SR = 44100
STUDIO = Path.cwd()
LIB = STUDIO / 'library' / 'sfx'


def midi_hz(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def env_ad(n: int, attack: float, release: float) -> np.ndarray:
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a) ** 0.7
    e[-r:] = np.linspace(1, 0, r) ** 1.4
    return e


def add_tone(buf: np.ndarray, start: float, dur: float, hz: float, amp: float, attack: float, release: float, detune: float = 0.0) -> None:
    i = max(0, int(start * SR))
    n = min(len(buf) - i, int(dur * SR))
    if n <= 0:
        return
    t = np.arange(n) / SR
    e = env_ad(n, attack, release)
    x = np.sin(2 * np.pi * hz * t)
    if detune:
        x = 0.6 * x + 0.4 * np.sin(2 * np.pi * hz * (1 + detune) * t)
    buf[i:i + n] += x * e * amp


def bell(buf: np.ndarray, start: float, hz: float, amp: float) -> None:
    i = max(0, int(start * SR))
    n = min(len(buf) - i, int(1.8 * SR))
    if n <= 0:
        return
    t = np.arange(n) / SR
    e = np.exp(-t * 3.2)
    x = np.sin(2 * np.pi * hz * t) + 0.35 * np.sin(2 * np.pi * hz * 2.01 * t) + 0.18 * np.sin(2 * np.pi * hz * 3.03 * t)
    buf[i:i + n] += x * e * amp


def make_score(duration: float) -> np.ndarray:
    n = int(duration * SR)
    y = np.zeros(n)
    t = np.arange(n) / SR

    # D minor, Bb major, F major, C major: warm, curious, slightly unresolved.
    chords = [
        (38, [50, 53, 57, 62]),   # Dm: D2, D3, F3, A3, D4
        (34, [46, 50, 53, 58]),   # Bb: Bb1, Bb2, D3, F3, Bb3
        (41, [53, 57, 60, 65]),   # F: F2, F3, A3, C4, F4
        (36, [48, 52, 55, 60]),   # C: C2, C3, E3, G3, C4
    ]
    bar = 8.0
    for k, start in enumerate(np.arange(0, duration, bar)):
        root, notes = chords[k % len(chords)]
        length = min(bar, duration - start)

        # pad
        pad = np.zeros(int(length * SR))
        for j, note in enumerate(notes):
            hz = midi_hz(note)
            tt = np.arange(len(pad)) / SR
            amp = 0.075 if j < 2 else 0.045
            pad += amp * np.sin(2 * np.pi * hz * tt)
            pad += amp * 0.22 * np.sin(2 * np.pi * hz * 1.006 * tt)
        pad = lowpass(pad, 1150)
        pad *= env_ad(len(pad), 1.4, 2.2)
        i = int(start * SR)
        y[i:i + len(pad)] += pad[: len(y) - i]

        # slow pulsing bass, one soft pulse every two seconds
        for beat in np.arange(start, start + length, 2.0):
            add_tone(y, beat, 1.9, midi_hz(root), 0.16, 0.03, 0.9, detune=-0.004)

        # glassy arpeggio, half-second steps
        pattern = [notes[2], notes[1], notes[3], notes[0], notes[2], notes[3], notes[1], notes[2]]
        for s in range(0, int(length / 0.5)):
            at = start + s * 0.5
            hz = midi_hz(pattern[s % len(pattern)] + 12)
            bell(y, at, hz, 0.035 if s % 2 else 0.05)

    # low ominous drone and a little air
    y += 0.03 * np.sin(2 * np.pi * midi_hz(26) * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.03 * t))
    rng = np.random.default_rng(7)
    air = lowpass(rng.normal(0, 1, n), 650) * 0.009
    y += air

    # taper the very start and end
    fade = int(2.5 * SR)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    y /= max(1e-9, np.abs(y).max())
    y *= 0.92
    return y


def main() -> int:
    slug = sys.argv[1]
    ep = json.loads((STUDIO / 'src' / 'episodes' / slug / 'episode.json').read_text())
    prompt, secs = ep['sound']['clips']['music']
    h = hashlib.sha1(f'{prompt}|{secs}'.encode()).hexdigest()[:8]
    out = LIB / f'music-{h}.mp3'
    if out.exists():
        print(f'{out} already exists ({out.stat().st_size} bytes)')
        return 0
    y = make_score(float(secs))
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2')
    LIB.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', dir=out.parent, delete=False) as f:
        wav = Path(f.name)
    import wave
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '128k', str(out)], check=True)
    wav.unlink(missing_ok=True)
    print(f'wrote {out} ({out.stat().st_size} bytes)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
