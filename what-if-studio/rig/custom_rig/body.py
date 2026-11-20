"""Body, hands, feet and the layered t-shirt / trousers / shoes costume."""
from __future__ import annotations

import math

from .geometry import MeshData, Vec3, ellipsoid, loft, tube, weights_fixed, weights_nearest
from .skeleton import (
    LEFT_ARM_CHAIN,
    LEFT_FINGERS,
    LEFT_LEG_CHAIN,
    REST_POS,
    RIGHT_ARM_CHAIN,
    RIGHT_FINGERS,
    RIGHT_LEG_CHAIN,
    SPINE_CHAIN,
    TORSO_CHAIN,
    child_positions,
    segments,
)

ARM_SEGS = {side: segments([f'{side}Shoulder', f'{side}Arm', f'{side}ForeArm', f'{side}Hand']) for side in ('Left', 'Right')}
LEG_SEGS = {
    side: segments(
        ['Hips', f'{side}UpLeg', f'{side}Leg', f'{side}Foot', f'{side}Toe']
    )
    for side in ('Left', 'Right')
}
TORSO_SEGS = segments(TORSO_CHAIN)
SHIRT_SEGS = segments(SPINE_CHAIN)


def torso_weight(p: Vec3) -> dict[str, float]:
    return weights_nearest(p, TORSO_SEGS, max_inf=4, power=3.0)


def shirt_weight(p: Vec3) -> dict[str, float]:
    return weights_nearest(p, SHIRT_SEGS, max_inf=4, power=3.0)


def arm_weight(side: str):
    segs = ARM_SEGS[side]
    return lambda p: weights_nearest(p, segs, max_inf=4, power=3.5)


def leg_weight(side: str):
    segs = LEG_SEGS[side]
    return lambda p: weights_nearest(p, segs, max_inf=4, power=3.5)


def fingers_weight(side: str, finger: str):
    names = [f'{side}Hand'] + [f'{side}{finger}{i}' for i in (1, 2, 3)]
    segs = segments(names)
    return lambda p: weights_nearest(p, segs, max_inf=2, power=3.2, eps=0.008)


TORSO_SECTIONS = [
    dict(y=0.835, rx=0.132, rz=0.090),
    dict(y=0.900, rx=0.152, rz=0.100),
    dict(y=0.960, rx=0.142, rz=0.094),
    dict(y=1.020, rx=0.122, rz=0.083),
    dict(y=1.100, rx=0.128, rz=0.086),
    dict(y=1.180, rx=0.145, rz=0.094),
    dict(y=1.270, rx=0.166, rz=0.103),
    dict(y=1.350, rx=0.188, rz=0.109),
    dict(y=1.405, rx=0.200, rz=0.112),
    dict(y=1.440, rx=0.178, rz=0.104),
    dict(y=1.470, rx=0.080, rz=0.075),
    dict(y=1.505, rx=0.049, rz=0.049),
    dict(y=1.555, rx=0.055, rz=0.055),
]

SHIRT_SECTIONS = [
    dict(y=0.945, rx=0.158, rz=0.106),
    dict(y=0.995, rx=0.142, rz=0.095),
    dict(y=1.070, rx=0.138, rz=0.092),
    dict(y=1.170, rx=0.158, rz=0.100),
    dict(y=1.270, rx=0.180, rz=0.110),
    dict(y=1.350, rx=0.202, rz=0.116),
    dict(y=1.405, rx=0.214, rz=0.119),
    dict(y=1.438, rx=0.192, rz=0.111),
]

PANTS_SECTIONS = [
    dict(y=0.830, rx=0.150, rz=0.102),
    dict(y=0.880, rx=0.166, rz=0.112),
    dict(y=0.940, rx=0.168, rz=0.113),
    dict(y=1.000, rx=0.146, rz=0.100),
    dict(y=1.035, rx=0.140, rz=0.096),
]


def _arm_points(side: str) -> list[Vec3]:
    s = 1.0 if side == 'Left' else -1.0
    return [
        (0.175 * s, 1.405, 0.0),
        (0.238 * s, 1.300, 0.0),
        (0.320 * s, 1.150, 0.0),
        (0.364 * s, 1.030, 0.0),
        (0.405 * s, 0.915, 0.0),
    ]


def _leg_points(side: str) -> list[Vec3]:
    s = 1.0 if side == 'Left' else -1.0
    return [
        (0.105 * s, 0.905, 0.0),
        (0.110 * s, 0.760, 0.004),
        (0.115 * s, 0.590, 0.002),
        (0.117 * s, 0.420, 0.0),
        (0.120 * s, 0.230, 0.002),
        (0.120 * s, 0.100, 0.0),
    ]


def _finger_meshes(side: str) -> list[MeshData]:
    out: list[MeshData] = []
    for finger in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        names = [f'{side}{finger}{i}' for i in (1, 2, 3)]
        cp = child_positions()
        pts = [REST_POS[names[0]], REST_POS[names[1]], REST_POS[names[2]], cp[names[2]]]
        radii = [0.0115, 0.0098, 0.0084, 0.0064]
        if finger == 'Thumb':
            radii = [0.0130, 0.0110, 0.0090, 0.0070]
        mesh = tube(
            f'Finger_{side}{finger}', 'CUSTOM_SKIN', pts, radii, segs=8,
            tag='hand', weight_fn=fingers_weight(side, finger), cap_start=True, cap_end=True,
            up=(0.0, 0.0, 1.0),
        )
        out.append(mesh)

        # a small rounded knuckle at each joint
        for i, name in enumerate(names, start=1):
            r = 0.0105 - i * 0.0012
            out.append(ellipsoid(
                f'Knuckle_{side}{finger}{i}', 'CUSTOM_SKIN', REST_POS[name],
                (r, r, r), segs=10, rings=7, tag_fn=lambda _p, _c: 'hand',
                weight_fn=lambda _p, n=name: weights_fixed(n),
            ))
    return out


def body_meshes() -> list[MeshData]:
    out: list[MeshData] = []

    out.append(loft(
        'Body', 'CUSTOM_SKIN', TORSO_SECTIONS, 32,
        tag_fn=lambda _p, _a: 'body', weight_fn=torso_weight,
        cap_start=True, cap_end=True,
    ))

    for side in ('Left', 'Right'):
        pts = _arm_points(side)
        out.append(tube(
            f'Arm_{side}', 'CUSTOM_SKIN', pts, [0.064, 0.057, 0.051, 0.045, 0.040],
            segs=16, tag='arm', weight_fn=arm_weight(side), cap_start=True, cap_end=True,
        ))
        wrist = pts[-1]
        palm = (wrist[0] + (0.010 if side == 'Left' else -0.010), wrist[1] - 0.038, wrist[2] + 0.004)
        out.append(ellipsoid(
            f'Palm_{side}', 'CUSTOM_SKIN', palm, (0.036, 0.047, 0.024),
            segs=18, rings=12, tag_fn=lambda _p, _c: 'hand',
            weight_fn=lambda _p, s=side: weights_fixed(f'{s}Hand'),
        ))
        out.extend(_finger_meshes(side))

    for side in ('Left', 'Right'):
        pts = _leg_points(side)
        out.append(tube(
            f'Leg_{side}', 'CUSTOM_SKIN', pts, [0.080, 0.072, 0.063, 0.055, 0.047, 0.042],
            segs=16, tag='leg', weight_fn=leg_weight(side), cap_start=True, cap_end=True,
        ))
        s = 1.0 if side == 'Left' else -1.0
        out.append(ellipsoid(
            f'Foot_{side}', 'CUSTOM_SKIN', (0.120 * s, 0.060, 0.075),
            (0.046, 0.048, 0.105), segs=18, rings=12,
            tag_fn=lambda _p, _c: 'foot', weight_fn=leg_weight(side),
        ))

    return out


def costume_meshes() -> list[MeshData]:
    out: list[MeshData] = []

    out.append(loft(
        'Shirt', 'CUSTOM_SHIRT', SHIRT_SECTIONS, 32,
        tag_fn=lambda _p, _a: 'shirt', weight_fn=shirt_weight,
        cap_start=True, cap_end=False,
    ))
    # collar
    collar = loft(
        'Collar', 'CUSTOM_SHIRT',
        [dict(y=1.432, rx=0.088, rz=0.080), dict(y=1.458, rx=0.073, rz=0.070)],
        24, tag_fn=lambda _p, _a: 'shirt', weight_fn=shirt_weight,
        cap_start=False, cap_end=False,
    )
    out.append(collar)

    for side in ('Left', 'Right'):
        s = 1.0 if side == 'Left' else -1.0
        out.append(tube(
            f'Sleeve_{side}', 'CUSTOM_SHIRT',
            [(0.160 * s, 1.405, 0.0), (0.225 * s, 1.318, 0.0), (0.275 * s, 1.235, 0.0)],
            [0.086, 0.078, 0.072], segs=16, tag='shirt',
            weight_fn=arm_weight(side), cap_start=True, cap_end=True,
        ))

    out.append(loft(
        'Pants', 'CUSTOM_PANTS', PANTS_SECTIONS, 32,
        tag_fn=lambda _p, _a: 'pants', weight_fn=torso_weight,
        cap_start=True, cap_end=True,
    ))
    for side in ('Left', 'Right'):
        pts = _leg_points(side)
        out.append(tube(
            f'PantLeg_{side}', 'CUSTOM_PANTS', pts,
            [0.089, 0.080, 0.071, 0.062, 0.053, 0.047],
            segs=16, tag='pants', weight_fn=leg_weight(side), cap_start=True, cap_end=True,
        ))
        s = 1.0 if side == 'Left' else -1.0
        out.append(ellipsoid(
            f'Shoe_{side}', 'CUSTOM_SHOE', (0.120 * s, 0.058, 0.078),
            (0.052, 0.052, 0.118), segs=20, rings=12,
            tag_fn=lambda _p, _c: 'shoe', weight_fn=leg_weight(side),
        ))
        out.append(ellipsoid(
            f'Sole_{side}', 'CUSTOM_SOLE', (0.120 * s, 0.020, 0.080),
            (0.054, 0.020, 0.120), segs=20, rings=10,
            tag_fn=lambda _p, _c: 'shoe', weight_fn=leg_weight(side),
        ))

    # belt
    out.append(loft(
        'Belt', 'CUSTOM_BELT',
        [dict(y=1.005, rx=0.150, rz=0.103), dict(y=1.033, rx=0.152, rz=0.104)],
        32, tag_fn=lambda _p, _a: 'belt', weight_fn=torso_weight,
        cap_start=False, cap_end=False,
    ))
    return out
