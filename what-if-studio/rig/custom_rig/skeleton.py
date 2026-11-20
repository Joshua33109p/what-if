"""The custom rig skeleton.

All rest rotations are identity: a joint's local axes are aligned with the character's world
axes at rest. That keeps animation authoring readable (X = sagittal swing, Y = twist/yaw,
Z = lateral raise) and exports cleanly to glTF and to a Blender armature whose edit bones all
point +Y with roll 0.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

Vec3 = tuple[float, float, float]

# name, parent, rest world position, optional terminal tail
BONES: list[tuple[str, str | None, Vec3, Vec3 | None]] = [
    ('Root', None, (0.0, 0.0, 0.0), (0.0, 0.08, 0.0)),
    ('Hips', 'Root', (0.0, 0.92, 0.0), (0.0, 0.99, 0.0)),
    ('Spine', 'Hips', (0.0, 1.02, 0.0), (0.0, 1.16, 0.0)),
    ('Spine1', 'Spine', (0.0, 1.16, 0.0), (0.0, 1.30, 0.0)),
    ('Spine2', 'Spine1', (0.0, 1.30, 0.0), (0.0, 1.40, 0.0)),
    ('Chest', 'Spine2', (0.0, 1.40, 0.0), (0.0, 1.47, 0.0)),
    ('Neck', 'Chest', (0.0, 1.47, 0.0), (0.0, 1.55, 0.0)),
    ('Head', 'Neck', (0.0, 1.55, 0.0), (0.0, 1.75, 0.0)),
    ('Jaw', 'Head', (0.0, 1.60, 0.035), (0.0, 1.575, 0.10)),
    ('LeftEye', 'Head', (0.047, 1.675, 0.112), (0.047, 1.675, 0.16)),
    ('RightEye', 'Head', (-0.047, 1.675, 0.112), (-0.047, 1.675, 0.16)),

    ('LeftShoulder', 'Chest', (0.055, 1.405, 0.0), (0.18, 1.40, 0.0)),
    ('LeftArm', 'LeftShoulder', (0.18, 1.40, 0.0), (0.32, 1.15, 0.0)),
    ('LeftForeArm', 'LeftArm', (0.32, 1.15, 0.0), (0.405, 0.915, 0.0)),
    ('LeftHand', 'LeftForeArm', (0.405, 0.915, 0.0), (0.428, 0.845, 0.0)),
    ('RightShoulder', 'Chest', (-0.055, 1.405, 0.0), (-0.18, 1.40, 0.0)),
    ('RightArm', 'RightShoulder', (-0.18, 1.40, 0.0), (-0.32, 1.15, 0.0)),
    ('RightForeArm', 'RightArm', (-0.32, 1.15, 0.0), (-0.405, 0.915, 0.0)),
    ('RightHand', 'RightForeArm', (-0.405, 0.915, 0.0), (-0.428, 0.845, 0.0)),

    ('LeftUpLeg', 'Hips', (0.105, 0.90, 0.0), (0.115, 0.50, 0.0)),
    ('LeftLeg', 'LeftUpLeg', (0.115, 0.50, 0.0), (0.12, 0.095, 0.0)),
    ('LeftFoot', 'LeftLeg', (0.12, 0.095, 0.0), (0.12, 0.045, 0.115)),
    ('LeftToe', 'LeftFoot', (0.12, 0.045, 0.115), (0.12, 0.035, 0.19)),
    ('RightUpLeg', 'Hips', (-0.105, 0.90, 0.0), (-0.115, 0.50, 0.0)),
    ('RightLeg', 'RightUpLeg', (-0.115, 0.50, 0.0), (-0.12, 0.095, 0.0)),
    ('RightFoot', 'RightLeg', (-0.12, 0.095, 0.0), (-0.12, 0.045, 0.115)),
    ('RightToe', 'RightFoot', (-0.12, 0.045, 0.115), (-0.12, 0.035, 0.19)),
]

# Fingers: three phalanges each. Rest positions are laid out along the hanging hand.
_FINGER_LAYOUT = [
    # name, root offset from wrist, direction, lengths
    ('Thumb', (-0.018, -0.045, 0.030), (-0.25, -0.72, 0.60), (0.026, 0.024, 0.020)),
    ('Index', (0.012, -0.075, 0.028), (0.10, -0.99, 0.06), (0.028, 0.024, 0.018)),
    ('Middle', (0.004, -0.078, 0.008), (0.05, -1.00, 0.01), (0.030, 0.026, 0.019)),
    ('Ring', (-0.004, -0.076, -0.012), (0.00, -1.00, -0.04), (0.028, 0.024, 0.018)),
    ('Pinky', (-0.012, -0.070, -0.030), (-0.04, -0.99, -0.10), (0.023, 0.020, 0.016)),
]


def _norm(v: Vec3) -> Vec3:
    import math
    n = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    return (v[0] / n, v[1] / n, v[2] / n) if n else v


def _add(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def _scale(v: Vec3, s: float) -> Vec3:
    return (v[0] * s, v[1] * s, v[2] * s)


def _build_fingers() -> list[tuple[str, str | None, Vec3, Vec3 | None]]:
    out: list[tuple[str, str | None, Vec3, Vec3 | None]] = []
    for side, sign in (('Left', 1.0), ('Right', -1.0)):
        wrist = (0.405 * sign, 0.915, 0.0)
        parent = f'{side}Hand'
        for finger, off, direction, lengths in _FINGER_LAYOUT:
            d = _norm((direction[0] * sign, direction[1], direction[2]))
            p = (wrist[0] + off[0] * sign, wrist[1] + off[1], wrist[2] + off[2])
            prev = parent
            for i, L in enumerate(lengths, start=1):
                name = f'{side}{finger}{i}'
                next_p = _add(p, _scale(d, L))
                out.append((name, prev, p, next_p))
                p = next_p
                prev = name
    return out


BONES.extend(_build_fingers())

BONE_INDEX = {name: i for i, (name, _, _, _) in enumerate(BONES)}
PARENT = {name: parent for name, parent, _, _ in BONES}
REST_POS = {name: pos for name, _, pos, _ in BONES}


def bone_tail(name: str) -> Vec3:
    for n, _, _, tail in BONES:
        if n == name and tail is not None:
            return tail
    # terminal joints get a short segment along their local direction
    pos = REST_POS[name]
    parent = PARENT[name]
    if parent:
        d = _norm((pos[0] - REST_POS[parent][0], pos[1] - REST_POS[parent][1], pos[2] - REST_POS[parent][2]))
        return _add(pos, _scale(d, 0.025))
    return (pos[0], pos[1] + 0.025, pos[2])


def child_positions() -> dict[str, Vec3]:
    out: dict[str, Vec3] = {}
    for name, parent, pos, tail in BONES:
        out.setdefault(name, tail or pos)
        if parent and parent not in out:
            out[parent] = pos
    # prefer actual child heads for parent tails
    for name, parent, pos, _ in BONES:
        if parent:
            out[parent] = pos
    return out


def segments(names: Iterable[str]) -> list[tuple[str, Vec3, Vec3]]:
    cp = child_positions()
    out: list[tuple[str, Vec3, Vec3]] = []
    for n in names:
        out.append((n, REST_POS[n], cp.get(n, bone_tail(n))))
    return out


SPINE_CHAIN = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Chest', 'Neck']
TORSO_CHAIN = SPINE_CHAIN + ['Head']
LEFT_ARM_CHAIN = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand']
RIGHT_ARM_CHAIN = ['RightShoulder', 'RightArm', 'RightForeArm', 'RightHand']
LEFT_LEG_CHAIN = ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToe']
RIGHT_LEG_CHAIN = ['RightUpLeg', 'RightLeg', 'RightFoot', 'RightToe']


def finger_names(side: str) -> list[str]:
    out: list[str] = []
    for finger in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        out.extend(f'{side}{finger}{i}' for i in (1, 2, 3))
    return out


LEFT_FINGERS = finger_names('Left')
RIGHT_FINGERS = finger_names('Right')


def hierarchy() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {name: [] for name, _, _, _ in BONES}
    for name, parent, _, _ in BONES:
        if parent:
            out[parent].append(name)
    return out


def validate() -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    for name, parent, pos, _ in BONES:
        if name in seen:
            errors.append(f'duplicate bone {name}')
        seen.add(name)
        if parent and parent not in seen:
            errors.append(f'{name}: parent {parent} is not defined before child')
    for req in SPINE_CHAIN + LEFT_ARM_CHAIN + LEFT_LEG_CHAIN:
        if req not in seen:
            errors.append(f'missing required bone {req}')
    return errors
