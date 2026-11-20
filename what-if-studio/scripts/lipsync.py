#!/usr/bin/env python3
"""Convert ElevenLabs word timestamps into an Oculus-viseme timeline.

    python scripts/lipsync.py src/episodes/borrow-skill-3d/words.json src/episodes/borrow-skill-3d/visemes.json

words.json is the word-level alignment emitted by the narration pipeline:
    [{"w": "Borrow", "s": 0.0, "e": 0.36, "p": ""}, ...]
The output is deterministic and can be imported directly by a Remotion composition.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

# Oculus visemes used by the rig: sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, I, O, U
DIGRAPHS = [
    ('tch', ['CH']),
    ('sch', ['SS', 'kk']),
    ('sh', ['CH']),
    ('ch', ['CH']),
    ('th', ['TH']),
    ('ph', ['FF']),
    ('wh', ['U']),
    ('qu', ['kk', 'U']),
    ('ng', ['nn', 'kk']),
    ('ck', ['kk']),
    ('oo', ['U']),
    ('ee', ['I']),
    ('ea', ['I']),
    ('ou', ['O', 'U']),
    ('ow', ['O', 'U']),
    ('oi', ['O', 'I']),
    ('oy', ['O', 'I']),
    ('ai', ['E', 'I']),
    ('ay', ['E', 'I']),
    ('au', ['O']),
    ('aw', ['O']),
    ('ei', ['E', 'I']),
    ('ie', ['I']),
]
LETTERS = {
    'a': 'aa', 'e': 'E', 'i': 'I', 'o': 'O', 'u': 'U', 'y': 'I',
    'p': 'PP', 'b': 'PP', 'm': 'PP',
    'f': 'FF', 'v': 'FF',
    't': 'DD', 'd': 'DD',
    'k': 'kk', 'g': 'kk', 'c': 'kk', 'q': 'kk', 'x': 'kk',
    's': 'SS', 'z': 'SS', 'j': 'CH',
    'n': 'nn', 'l': 'nn',
    'r': 'RR',
    'w': 'U', 'h': 'sil',
}


def phonemes(word: str) -> list[str]:
    w = re.sub(r"[^a-z']", '', word.lower()).replace("'", '')
    if not w:
        return ['sil']
    out: list[str] = []
    i = 0
    while i < len(w):
        matched = False
        for digraph, seq in DIGRAPHS:
            if w.startswith(digraph, i):
                out.extend(seq)
                i += len(digraph)
                matched = True
                break
        if matched:
            continue
        ch = w[i]
        out.append(LETTERS.get(ch, 'sil'))
        i += 1
    # collapse repeated visemes and drop runs longer than two
    dedup: list[str] = []
    for p in out:
        if dedup and dedup[-1] == p:
            continue
        dedup.append(p)
    return dedup or ['sil']


def build(words: list[dict], min_hold: float = 0.045) -> dict:
    cues: list[dict] = []
    duration = 0.0
    for item in words:
        w = str(item.get('w', '')).strip()
        s = float(item.get('s', 0.0))
        e = float(item.get('e', s + 0.15))
        if e <= s:
            e = s + 0.12
        duration = max(duration, e)
        ps = phonemes(w)
        # Silence should not be a cue inside a word.
        ps = [p for p in ps if p != 'sil'] or ['sil']
        weights = []
        for p in ps:
            weights.append(1.6 if p in ('aa', 'E', 'O', 'U') else 1.0)
        total = sum(weights)
        span = max(min_hold * len(ps), e - s)
        t = s
        for p, wt in zip(ps, weights):
            d = span * wt / total
            cues.append({'t': round(t, 4), 'v': p, 'dur': round(d, 4), 'w': w})
            t += d
        duration = max(duration, t)

    # fill gaps with silence and merge adjacent identical cues
    out: list[dict] = []
    cursor = 0.0
    for c in sorted(cues, key=lambda x: x['t']):
        if c['t'] > cursor + 0.03:
            out.append({'t': round(cursor, 4), 'v': 'sil', 'dur': round(c['t'] - cursor, 4)})
        if out and out[-1]['v'] == c['v'] and abs(out[-1]['t'] + out[-1]['dur'] - c['t']) < 0.02:
            out[-1]['dur'] = round(c['t'] + c['dur'] - out[-1]['t'], 4)
        else:
            out.append({'t': c['t'], 'v': c['v'], 'dur': c['dur']})
        cursor = c['t'] + c['dur']
    out.append({'t': round(cursor, 4), 'v': 'sil', 'dur': round(max(0.12, duration - cursor), 4)})
    return {
        'fps': 30,
        'duration': round(max(duration, out[-1]['t'] + out[-1]['dur']), 4),
        'visemes': out,
        'source': 'ElevenLabs word alignment',
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('words')
    ap.add_argument('out')
    ap.add_argument('--min-hold', type=float, default=0.045)
    args = ap.parse_args()
    data = json.loads(Path(args.words).read_text())
    if isinstance(data, dict):
        data = data.get('words') or data.get('alignment') or []
    timeline = build(data, min_hold=args.min_hold)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(timeline, indent=1) + '\n')
    print(f'wrote {out} ({len(timeline["visemes"])} cues, {timeline["duration"]:.2f}s)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
