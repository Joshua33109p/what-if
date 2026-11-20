"""Original animation clips for the custom rig, baked to glTF quaternion tracks.

Clip names intentionally match the studio's existing acting vocabulary (`Idle_Loop`,
`Idle_Talking_Loop`, `Walk_Loop`, `Run_Loop`, `Wave`, `Point`, `Shrug`, `Think`, `Reach`,
`Throw`, `Piano`, `Surgery`, `Collapse`, `Interact`). Everything is authored from scratch.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

FPS = 30

Euler = tuple[float, float, float]
Quat = tuple[float, float, float, float]


def q_from_euler(x: float, y: float, z: float) -> Quat:
    c1, c2, c3 = math.cos(x / 2), math.cos(y / 2), math.cos(z / 2)
    s1, s2, s3 = math.sin(x / 2), math.sin(y / 2), math.sin(z / 2)
    return (
        s1 * c2 * c3 + c1 * s2 * s3,
        c1 * s2 * c3 - s1 * c2 * s3,
        c1 * c2 * s3 + s1 * s2 * c3,
        c1 * c2 * c3 - s1 * s2 * s3,
    )


def q_identity() -> Quat:
    return (0.0, 0.0, 0.0, 1.0)


def q_nlerp(a: Quat, b: Quat, t: float) -> Quat:
    d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
    if d < 0:
        b = (-b[0], -b[1], -b[2], -b[3])
        d = -d
    if d > 0.9995:
        out = tuple(a[i] + (b[i] - a[i]) * t for i in range(4))
    else:
        th = math.acos(max(-1.0, min(1.0, d)))
        s = math.sin(th)
        out = tuple(
            (math.sin((1 - t) * th) * a[i] + math.sin(t * th) * b[i]) / s for i in range(4)
        )
    n = math.sqrt(sum(v * v for v in out)) or 1.0
    return tuple(v / n for v in out)


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


@dataclass
class Track:
    times: list[float] = field(default_factory=list)
    values: list[tuple] = field(default_factory=list)


@dataclass
class Clip:
    name: str
    duration: float
    loop: bool
    rotations: dict[str, Track] = field(default_factory=dict)
    translations: dict[str, Track] = field(default_factory=dict)


def _merge(a: dict[str, Euler], b: dict[str, Euler]) -> dict[str, Euler]:
    out = dict(a)
    for k, v in b.items():
        if k in out:
            out[k] = (out[k][0] + v[0], out[k][1] + v[1], out[k][2] + v[2])
        else:
            out[k] = v
    return out


def _side(side: str) -> float:
    return 1.0 if side == 'Left' else -1.0


def _hand_curl(side: str, curl: float = 0.20, thumb_curl: float = 0.25) -> dict[str, Euler]:
    s = _side(side)
    out: dict[str, Euler] = {}
    for finger in ('Index', 'Middle', 'Ring', 'Pinky'):
        for i in (1, 2, 3):
            out[f'{side}{finger}{i}'] = (0.0, 0.0, -s * curl * (0.7 + 0.15 * i))
    for i in (1, 2, 3):
        out[f'{side}Thumb{i}'] = (0.0, 0.0, -s * thumb_curl)
    return out


def _base_relaxed() -> dict[str, Euler]:
    p: dict[str, Euler] = {
        'LeftArm': (0.0, 0.0, -0.08),
        'RightArm': (0.0, 0.0, 0.08),
        'LeftForeArm': (-0.08, 0.0, 0.0),
        'RightForeArm': (-0.08, 0.0, 0.0),
        'LeftHand': (0.0, 0.0, 0.0),
        'RightHand': (0.0, 0.0, 0.0),
    }
    p = _merge(p, _hand_curl('Left'))
    p = _merge(p, _hand_curl('Right'))
    return p


def _idle(t: float, talking: bool = False) -> dict[str, Euler]:
    p = _base_relaxed()
    w = 2.0 * math.pi / 4.0
    breath = math.sin(w * t)
    sway = math.sin(w * t + 0.9)
    p = _merge(p, {
        'Spine1': (0.012 * breath, 0.010 * sway, 0.0),
        'Spine2': (0.008 * breath, -0.006 * sway, 0.0),
        'Chest': (0.006 * breath, 0.0, 0.0),
        'Neck': (-0.005 * breath, -0.010 * sway, 0.0),
        'Head': (0.006 * math.sin(w * t + 0.4), 0.030 * sway, 0.012 * breath),
        'Hips': (0.0, 0.018 * sway, 0.0),
    })
    if talking:
        g = math.sin(2.0 * math.pi * 1.35 * t)
        h = math.sin(2.0 * math.pi * 0.75 * t + 0.8)
        p = _merge(p, {
            'RightArm': (-0.42 + 0.07 * g, 0.0, -0.34 + 0.05 * h),
            'RightForeArm': (-0.62 + 0.10 * g, 0.0, 0.18),
            'RightHand': (0.10 * g, 0.08 * h, 0.0),
            'LeftArm': (-0.10, 0.0, -0.16),
            'LeftForeArm': (-0.35, 0.0, 0.0),
            'Head': (0.010 * g, 0.045 * h, 0.018 * g),
            'Spine1': (0.014 * breath, 0.020 * h, 0.0),
            'Chest': (0.008 * breath, 0.010 * h, 0.0),
        })
    return p


def _walk(t: float) -> dict[str, Euler]:
    p = _base_relaxed()
    w = 2.0 * math.pi / 1.0
    ph = w * t
    s, c = math.sin(ph), math.cos(ph)
    ls, rs = s, -s
    knee_l = 0.90 * max(0.0, math.cos(ph)) ** 1.4
    knee_r = 0.90 * max(0.0, math.cos(ph + math.pi)) ** 1.4
    p = _merge(p, {
        'LeftUpLeg': (-0.46 * ls, 0.0, 0.012),
        'RightUpLeg': (-0.46 * rs, 0.0, -0.012),
        'LeftLeg': (knee_l, 0.0, 0.0),
        'RightLeg': (knee_r, 0.0, 0.0),
        'LeftFoot': (0.34 * s - 0.25 * max(0.0, c), 0.0, 0.0),
        'RightFoot': (-0.34 * s - 0.25 * max(0.0, -c), 0.0, 0.0),
        'LeftToe': (-0.18 * max(0.0, -s), 0.0, 0.0),
        'RightToe': (-0.18 * max(0.0, s), 0.0, 0.0),
        'LeftArm': (0.38 * s, 0.0, -0.10),
        'RightArm': (-0.38 * s, 0.0, 0.10),
        'LeftForeArm': (-0.20 - 0.10 * max(0.0, s), 0.0, 0.0),
        'RightForeArm': (-0.20 - 0.10 * max(0.0, -s), 0.0, 0.0),
        'Hips': (0.012 * math.sin(2 * ph), 0.070 * s, 0.030 * s),
        'Spine1': (0.020, -0.050 * s, -0.018 * s),
        'Spine2': (0.012, 0.030 * s, 0.012 * s),
        'Chest': (0.010, 0.020 * s, 0.0),
        'Neck': (-0.008, -0.025 * s, 0.0),
        'Head': (0.0, -0.020 * s, -0.010 * s),
    })
    p['_hips'] = (0.014 * s, 0.010 + 0.012 * (1.0 - math.cos(2 * ph)) * 0.5, 0.0)
    return p


def _run(t: float) -> dict[str, Euler]:
    p = _base_relaxed()
    w = 2.0 * math.pi / 0.62
    ph = w * t
    s, c = math.sin(ph), math.cos(ph)
    knee_l = 1.35 * max(0.0, math.cos(ph)) ** 1.2 + 0.15
    knee_r = 1.35 * max(0.0, math.cos(ph + math.pi)) ** 1.2 + 0.15
    p = _merge(p, {
        'LeftUpLeg': (-0.82 * s - 0.10, 0.0, 0.020),
        'RightUpLeg': (0.82 * s - 0.10, 0.0, -0.020),
        'LeftLeg': (knee_l, 0.0, 0.0),
        'RightLeg': (knee_r, 0.0, 0.0),
        'LeftFoot': (0.52 * s - 0.30 * max(0.0, c), 0.0, 0.0),
        'RightFoot': (-0.52 * s - 0.30 * max(0.0, -c), 0.0, 0.0),
        'LeftToe': (-0.22 * max(0.0, -s), 0.0, 0.0),
        'RightToe': (-0.22 * max(0.0, s), 0.0, 0.0),
        'LeftArm': (0.82 * s, 0.0, -0.08),
        'RightArm': (-0.82 * s, 0.0, 0.08),
        'LeftForeArm': (-0.70 - 0.20 * max(0.0, s), 0.0, 0.0),
        'RightForeArm': (-0.70 - 0.20 * max(0.0, -s), 0.0, 0.0),
        'Hips': (0.018 * math.sin(2 * ph), 0.100 * s, 0.045 * s),
        'Spine1': (0.140, -0.100 * s, -0.022 * s),
        'Spine2': (0.060, 0.060 * s, 0.016 * s),
        'Chest': (0.030, 0.040 * s, 0.0),
        'Neck': (-0.120, -0.040 * s, 0.0),
        'Head': (-0.050, -0.030 * s, -0.012 * s),
    })
    p['_hips'] = (0.020 * s, 0.020 + 0.040 * abs(math.sin(ph)), 0.0)
    return p


def _keys(t: float, keys: list[tuple[float, dict[str, Euler]]]) -> dict[str, Euler]:
    if t <= keys[0][0]:
        return dict(keys[0][1])
    if t >= keys[-1][0]:
        return dict(keys[-1][1])
    for (t0, p0), (t1, p1) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            u = ease((t - t0) / (t1 - t0))
            out: dict[str, Euler] = {}
            for k in set(p0) | set(p1):
                a = p0.get(k, (0.0, 0.0, 0.0))
                b = p1.get(k, (0.0, 0.0, 0.0))
                out[k] = (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u)
            return out
    return dict(keys[-1][1])


def _gesture_clips() -> list[Clip]:
    clips: list[Clip] = []

    def add(name: str, duration: float, loop: bool, pose_fn):
        clips.append(bake(name, duration, loop, pose_fn))

    # Wave
    base = _base_relaxed()

    def wave(t):
        u = math.sin(2 * math.pi * 2.2 * t)
        p = _merge(base, {
            'RightArm': (-0.18, 0.0, -2.05),
            'RightForeArm': (-0.15, 0.0, -0.10 + 0.18 * u),
            'RightHand': (0.0, 0.0, 0.35 * u),
            'LeftArm': (-0.15, 0.0, -0.06),
            'LeftForeArm': (-0.25, 0.0, 0.0),
            'Head': (0.0, -0.10, 0.08),
            'Spine1': (0.0, -0.06, 0.03),
        })
        return p

    add('Wave', 1.8, True, wave)

    def point(t):
        p = _merge(base, {
            'RightArm': (-1.32, 0.0, -0.18),
            'RightForeArm': (-0.10, 0.0, 0.0),
            'RightHand': (0.0, -0.10, 0.0),
            'LeftArm': (-0.08, 0.0, -0.10),
            'LeftForeArm': (-0.22, 0.0, 0.0),
            'Chest': (0.0, 0.08, 0.0),
            'Head': (0.02, -0.12, 0.0),
        })
        return p

    add('Point', 1.4, True, point)

    def shrug(t):
        u = math.sin(math.pi * min(1.0, t / 0.35)) if t < 0.35 else 1.0
        p = _merge(base, {
            'LeftShoulder': (0.0, 0.0, 0.22 * u),
            'RightShoulder': (0.0, 0.0, -0.22 * u),
            'LeftArm': (-0.18 * u, 0.0, -0.58 * u),
            'RightArm': (-0.18 * u, 0.0, 0.58 * u),
            'LeftForeArm': (-0.70 * u, 0.0, -0.20 * u),
            'RightForeArm': (-0.70 * u, 0.0, 0.20 * u),
            'LeftHand': (0.0, 0.35 * u, 0.0),
            'RightHand': (0.0, -0.35 * u, 0.0),
            'Head': (0.04 * u, 0.0, 0.0),
        })
        return p

    add('Shrug', 1.3, True, shrug)

    def think(t):
        p = _merge(base, {
            'RightArm': (-0.58, 0.0, -1.02),
            'RightForeArm': (-1.42, 0.0, 0.20),
            'RightHand': (-0.25, 0.0, 0.15),
            'LeftArm': (-0.10, 0.0, -0.05),
            'LeftForeArm': (-0.30, 0.0, 0.0),
            'Head': (0.10, 0.10, 0.05),
            'Neck': (0.04, 0.0, 0.0),
            'Spine1': (0.04, 0.03, 0.0),
        })
        return p

    add('Think', 2.2, True, think)

    def reach(t):
        p = _merge(base, {
            'RightArm': (-1.48, 0.0, -0.10),
            'RightForeArm': (-0.08, 0.0, 0.0),
            'RightHand': (0.0, 0.0, 0.0),
            'LeftArm': (-0.10, 0.0, -0.08),
            'LeftForeArm': (-0.22, 0.0, 0.0),
            'Spine1': (0.06, 0.0, 0.0),
            'Chest': (0.04, 0.0, 0.0),
            'Head': (0.04, 0.0, 0.0),
        })
        return p

    add('Reach', 1.4, True, reach)

    def throw(t):
        p = _merge(base, {
            'RightArm': (0.0, 0.0, 0.0),
            'RightForeArm': (-0.20, 0.0, 0.0),
        })
        keys = [
            (0.0, p),
            (0.28, _merge(p, {
                'RightArm': (0.95, 0.0, -0.15),
                'RightForeArm': (-0.55, 0.0, 0.0),
                'Spine1': (-0.05, 0.25, 0.0),
                'Spine2': (0.0, 0.20, 0.0),
                'LeftArm': (-0.35, 0.0, -0.20),
                'Head': (0.0, -0.18, 0.0),
            })),
            (0.52, _merge(p, {
                'RightArm': (-1.45, 0.0, -0.12),
                'RightForeArm': (-0.10, 0.0, 0.0),
                'Spine1': (0.10, -0.25, 0.0),
                'Spine2': (0.06, -0.20, 0.0),
                'LeftArm': (-0.20, 0.0, -0.10),
                'Head': (0.08, 0.12, 0.0),
                'LeftUpLeg': (-0.18, 0.0, 0.0),
                'RightUpLeg': (0.14, 0.0, 0.0),
            })),
            (1.1, _merge(p, {
                'RightArm': (-0.60, 0.0, -0.20),
                'RightForeArm': (-0.35, 0.0, 0.0),
                'Spine1': (0.05, -0.08, 0.0),
                'Head': (0.04, 0.04, 0.0),
            })),
        ]
        return _keys(t, keys)

    add('Throw', 1.2, False, throw)

    def piano(t):
        p = _merge(base, {
            'LeftArm': (-0.98, 0.0, 0.18),
            'RightArm': (-0.98, 0.0, -0.18),
            'LeftForeArm': (-0.72, 0.0, -0.08),
            'RightForeArm': (-0.72, 0.0, 0.08),
            'LeftHand': (0.10, 0.0, 0.0),
            'RightHand': (0.10, 0.0, 0.0),
            'Spine1': (0.06, 0.0, 0.0),
            'Chest': (0.03, 0.0, 0.0),
            'Neck': (0.06, 0.0, 0.0),
            'Head': (0.09, 0.0, 0.0),
        })
        for side, sgn in (('Left', 1.0), ('Right', -1.0)):
            for fi, finger in enumerate(('Index', 'Middle', 'Ring', 'Pinky')):
                ph = 2 * math.pi * 1.7 * t + fi * 0.9 + (0.5 if side == 'Right' else 0.0)
                bend = 0.34 * max(0.0, math.sin(ph))
                for i in (1, 2, 3):
                    p[f'{side}{finger}{i}'] = (bend * (0.8 + 0.1 * i), 0.0, -sgn * 0.16)
        return p

    add('Piano', 2.4, True, piano)

    def surgery(t):
        p = _merge(base, {
            'LeftArm': (-0.92, 0.0, 0.14),
            'RightArm': (-0.92, 0.0, -0.14),
            'LeftForeArm': (-0.82, 0.0, -0.10),
            'RightForeArm': (-0.82, 0.0, 0.10),
            'LeftHand': (0.18, 0.0, -0.10),
            'RightHand': (0.18, 0.0, 0.10),
            'Spine1': (0.12, 0.0, 0.0),
            'Spine2': (0.06, 0.0, 0.0),
            'Neck': (0.10, 0.0, 0.0),
            'Head': (0.16, 0.0, 0.0),
        })
        for side, sgn in (('Left', 1.0), ('Right', -1.0)):
            for finger in ('Index', 'Middle', 'Ring', 'Pinky'):
                for i in (1, 2, 3):
                    p[f'{side}{finger}{i}'] = (0.10, 0.0, -sgn * 0.10)
        return p

    add('Surgery', 2.0, True, surgery)

    def collapse(t):
        p = _merge(base, {
            'Spine1': (0.0, 0.0, 0.0),
            'Spine2': (0.0, 0.0, 0.0),
            'Neck': (0.0, 0.0, 0.0),
            'Head': (0.0, 0.0, 0.0),
            'LeftArm': (0.10, 0.0, -0.08),
            'RightArm': (0.10, 0.0, 0.08),
            'LeftForeArm': (0.10, 0.0, 0.0),
            'RightForeArm': (0.10, 0.0, 0.0),
            'LeftUpLeg': (0.0, 0.0, 0.0),
            'RightUpLeg': (0.0, 0.0, 0.0),
            'LeftLeg': (0.0, 0.0, 0.0),
            'RightLeg': (0.0, 0.0, 0.0),
        })
        keys = [
            (0.0, p),
            (0.6, _merge(p, {
                'Spine1': (0.30, 0.0, 0.0),
                'Spine2': (0.20, 0.0, 0.0),
                'Neck': (0.20, 0.0, 0.0),
                'Head': (0.30, 0.0, 0.0),
                'LeftArm': (0.20, 0.0, -0.20),
                'RightArm': (0.20, 0.0, 0.20),
                'LeftForeArm': (0.15, 0.0, 0.0),
                'RightForeArm': (0.15, 0.0, 0.0),
                'LeftUpLeg': (0.18, 0.0, 0.0),
                'RightUpLeg': (0.18, 0.0, 0.0),
                'LeftLeg': (0.28, 0.0, 0.0),
                'RightLeg': (0.28, 0.0, 0.0),
            })),
            (1.4, _merge(p, {
                'Spine1': (0.42, 0.0, 0.0),
                'Spine2': (0.28, 0.0, 0.0),
                'Neck': (0.28, 0.0, 0.0),
                'Head': (0.40, 0.0, 0.0),
                'LeftArm': (0.30, 0.0, -0.25),
                'RightArm': (0.30, 0.0, 0.25),
                'LeftForeArm': (0.20, 0.0, 0.0),
                'RightForeArm': (0.20, 0.0, 0.0),
                'LeftUpLeg': (0.30, 0.0, 0.0),
                'RightUpLeg': (0.30, 0.0, 0.0),
                'LeftLeg': (0.45, 0.0, 0.0),
                'RightLeg': (0.45, 0.0, 0.0),
            })),
        ]
        q = _keys(t, keys)
        q['_hips'] = (0.0, -0.12 * ease(t / 1.4), 0.0)
        return q

    add('Collapse', 1.5, False, collapse)

    def interact(t):
        p = _merge(base, {
            'RightArm': (-0.90, 0.0, -0.15),
            'RightForeArm': (-0.95, 0.0, 0.10),
            'RightHand': (0.15, 0.0, 0.0),
            'LeftArm': (-0.12, 0.0, -0.10),
            'LeftForeArm': (-0.25, 0.0, 0.0),
            'Spine1': (0.06, 0.0, 0.0),
            'Neck': (0.05, 0.0, 0.0),
            'Head': (0.10, -0.08, 0.0),
        })
        return p

    add('Interact', 1.6, True, interact)

    def nod(t):
        u = math.sin(2 * math.pi * t)
        p = _merge(base, {'Head': (0.10 * max(0.0, u), 0.0, 0.0), 'Neck': (0.04 * max(0.0, u), 0.0, 0.0)})
        return p

    add('Nod', 1.2, True, nod)

    def shake(t):
        u = math.sin(2 * math.pi * 2.0 * t)
        p = _merge(base, {'Head': (0.0, 0.16 * u, 0.0), 'Neck': (0.0, 0.05 * u, 0.0)})
        return p

    add('Shake', 1.0, True, shake)

    return clips


def bake(name: str, duration: float, loop: bool, pose_fn) -> Clip:
    clip = Clip(name, duration, loop)
    frames = max(1, int(round(duration * FPS)))
    times = [i / FPS for i in range(frames + 1)]
    samples = []
    for t in times:
        pose = dict(pose_fn(t))
        samples.append(pose)
    # union of animated joints
    joints: set[str] = set()
    for s in samples:
        joints.update(k for k in s if not k.startswith('_'))
    for joint in sorted(joints):
        track = Track()
        for t, s in zip(times, samples):
            e = s.get(joint, (0.0, 0.0, 0.0))
            track.times.append(t)
            track.values.append(q_from_euler(*e))
        clip.rotations[joint] = track
    hips = [s.get('_hips') for s in samples]
    if any(h is not None for h in hips):
        tr = Track()
        for t, h in zip(times, hips):
            tr.times.append(t)
            tr.values.append(tuple(h or (0.0, 0.0, 0.0)))
        clip.translations['Hips'] = tr
    return clip


def clips() -> list[Clip]:
    out = [
        bake('Idle_Loop', 4.0, True, lambda t: _idle(t, False)),
        bake('Idle_Talking_Loop', 3.0, True, lambda t: _idle(t, True)),
        bake('Walk_Loop', 1.0, True, _walk),
        bake('Run_Loop', 0.62, True, _run),
    ]
    out.extend(_gesture_clips())
    return out
