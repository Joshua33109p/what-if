"""Head, face, eyes, brows, eyelids, hair and all facial shape keys."""
from __future__ import annotations

import math
from typing import Callable

from .geometry import (
    MeshData,
    Vec3,
    clamp,
    disc,
    ellipse_ring,
    ellipsoid,
    smoothstep,
    tube,
    vadd,
    vsub,
)
from .geometry import weights_fixed
from .skeleton import REST_POS

HEAD_C: Vec3 = (0.0, 1.655, 0.018)
HEAD_R: Vec3 = (0.124, 0.142, 0.126)
EYE_C: dict[str, Vec3] = {'L': (0.047, 1.676, 0.112), 'R': (-0.047, 1.676, 0.112)}
EYE_R = 0.027
MOUTH_C: Vec3 = (0.0, 1.606, 0.129)
MOUTH_RX = 0.044
MOUTH_RY = 0.016

HEAD_WEIGHTS = weights_fixed('Head')
JAW_WEIGHTS = {'Jaw': 0.55, 'Head': 0.45}


def head_surface_z(x: float, y: float, margin: float = 0.0) -> float:
    nx = (x - HEAD_C[0]) / (HEAD_R[0] + margin)
    ny = (y - HEAD_C[1]) / (HEAD_R[1] + margin)
    q = max(0.0, 1.0 - nx * nx - ny * ny)
    return HEAD_C[2] + (HEAD_R[2] + margin) * math.sqrt(q)


def _head_deform(p: Vec3) -> Vec3:
    x, y, z = p
    # taper the jaw and push the chin forward
    ny = (y - HEAD_C[1]) / HEAD_R[1]
    if ny < 0:
        taper = 0.80 + 0.20 * (1.0 + ny)
        x = HEAD_C[0] + (x - HEAD_C[0]) * taper
        z = HEAD_C[2] + (z - HEAD_C[2]) * (0.94 + 0.06 * (1.0 + ny))
    if y < 1.625 and z > 0.04:
        f = smoothstep(1.625, 1.54, y) * clamp(1.0 - abs(x) / 0.10)
        z += 0.010 * f
    # soft eye sockets
    for side in ('L', 'R'):
        ex, ey, ez = EYE_C[side]
        d = math.hypot((x - ex) / 0.045, (y - ey) / 0.035)
        if d < 1.0 and z > 0.06:
            z -= 0.006 * (1.0 - d)
    return (x, y, z)


def _head_tag(p: Vec3, _center: Vec3) -> str:
    x, y, z = p
    if y < 1.632 and z > 0.055:
        if abs(x) < 0.035:
            return 'chin'
        return 'jaw_side'
    if 1.618 < y < 1.665 and z > 0.06 and abs(x) > 0.045:
        return 'cheek_L' if x > 0 else 'cheek_R'
    if y > 1.690 and z > 0.075:
        if abs(x) < 0.018:
            return 'brow_inner'
        return 'brow_L' if x > 0 else 'brow_R'
    if y > 1.635 and y < 1.665 and abs(x) < 0.028 and z > 0.12:
        return 'nose'
    return 'head'


def _head_morphs(head: MeshData) -> None:
    def jaw_open(v, _i):
        if v.tag in ('chin', 'jaw_side'):
            f = 1.0 if v.tag == 'chin' else 0.55
            return (0.0, -0.021 * f, -0.003 * f)
        return (0.0, 0.0, 0.0)

    head.add_morph('jawOpen', jaw_open)

    for side, sgn in (('Left', 1.0), ('Right', -1.0)):
        tag = 'cheek_L' if sgn > 0 else 'cheek_R'

        def smile(v, _i, sgn=sgn, tag=tag):
            if v.tag == tag or (v.tag == 'chin' and v.pos[0] * sgn > 0.015):
                return (0.0045 * sgn, 0.0055, 0.0015)
            return (0.0, 0.0, 0.0)

        def frown(v, _i, sgn=sgn, tag=tag):
            if v.tag == tag or (v.tag == 'chin' and v.pos[0] * sgn > 0.015):
                return (-0.0020 * sgn, -0.0050, 0.0010)
            return (0.0, 0.0, 0.0)

        def squint(v, _i, tag=tag):
            if v.tag == tag:
                return (0.0, 0.0040, 0.0020)
            return (0.0, 0.0, 0.0)

        def brow_up(v, _i, sgn=sgn):
            if v.tag == ('brow_L' if sgn > 0 else 'brow_R'):
                return (0.0, 0.0060, 0.0010)
            return (0.0, 0.0, 0.0)

        def brow_down(v, _i, sgn=sgn):
            if v.tag == ('brow_L' if sgn > 0 else 'brow_R'):
                return (0.0, -0.0045, 0.0005)
            return (0.0, 0.0, 0.0)

        def nose_sneer(v, _i, sgn=sgn):
            if v.tag == 'nose':
                return (0.0025 * sgn, 0.0030, 0.0005)
            return (0.0, 0.0, 0.0)

        head.add_morph(f'mouthSmile{side}', smile)
        head.add_morph(f'mouthFrown{side}', frown)
        head.add_morph(f'cheekSquint{side}', squint)
        head.add_morph(f'browOuterUp{side}', brow_up)
        head.add_morph(f'browDown{side}', brow_down)
        head.add_morph(f'noseSneer{side}', nose_sneer)

    def brow_inner(v, _i):
        if v.tag == 'brow_inner':
            return (0.0, 0.0065, 0.0010)
        return (0.0, 0.0, 0.0)

    head.add_morph('browInnerUp', brow_inner)

    def eye_wide(v, _i):
        if v.tag.startswith('brow_'):
            return (0.0, 0.0030, 0.0)
        return (0.0, 0.0, 0.0)

    head.add_morph('eyeWideLeft', eye_wide)
    head.add_morph('eyeWideRight', eye_wide)


def _lip_tag(p: Vec3, a: float, b: float) -> str:
    dx = p[0] - MOUTH_C[0]
    dy = p[1] - MOUTH_C[1]
    if abs(dx) > MOUTH_RX * 0.72:
        return 'corner_L' if dx > 0 else 'corner_R'
    return 'lip_upper' if dy >= 0 else 'lip_lower'


def _lip_delta(
    v: MeshData,
    open_: float = 0.0,
    wide: float = 0.0,
    round_: float = 0.0,
    press: float = 0.0,
    smile: float = 0.0,
    frown: float = 0.0,
    upper_up: float = 0.0,
    lower_down: float = 0.0,
    pucker: float = 0.0,
) -> Vec3:
    x, y, z = v.pos
    dx = x - MOUTH_C[0]
    dy = y - MOUTH_C[1]
    sgn = 1.0 if dx >= 0 else -1.0
    upper = v.tag == 'lip_upper'
    lower = v.tag == 'lip_lower'
    corner = v.tag in ('corner_L', 'corner_R')

    ox = 0.0
    oy = 0.0
    oz = 0.0

    # opening: lower lip drops, upper lip lifts a little
    if upper:
        oy += open_ * 0.0045 + upper_up * 0.0065
    if lower:
        oy -= open_ * 0.0135 + lower_down * 0.0085
    # width
    ox += dx * wide * 0.22
    if corner:
        ox += sgn * wide * 0.0085
        ox += sgn * smile * 0.0030
        ox -= sgn * frown * 0.0020
        oy += smile * 0.0060 - frown * 0.0055
    # pressing / closing
    if upper:
        oy -= press * 0.0030
    if lower:
        oy += press * 0.0030
    # rounding and puckering
    ox -= dx * round_ * 0.35
    ox -= dx * pucker * 0.50
    oz += round_ * 0.0060 + pucker * 0.0075
    if upper:
        oy += pucker * 0.0010
    if lower:
        oy -= pucker * 0.0010
    # funnel keeps the opening but pulls the corners in
    if corner:
        ox -= sgn * round_ * 0.0055
        oz -= round_ * 0.0015
    return (ox, oy, oz)


# Oculus-style visemes, expressed as the lip parameters above.
VISEME_PARAMS: dict[str, dict[str, float]] = {
    'viseme_sil': dict(press=0.15),
    'viseme_PP': dict(press=1.0),
    'viseme_FF': dict(open_=0.06, press=0.55, upper_up=0.18),
    'viseme_TH': dict(open_=0.28, wide=0.10, upper_up=0.10),
    'viseme_DD': dict(open_=0.20, wide=0.16),
    'viseme_kk': dict(open_=0.24, wide=0.06),
    'viseme_CH': dict(open_=0.22, round_=0.30),
    'viseme_SS': dict(open_=0.09, wide=0.38, upper_up=0.10),
    'viseme_nn': dict(open_=0.12, wide=0.10),
    'viseme_RR': dict(open_=0.20, round_=0.34),
    'viseme_aa': dict(open_=1.00, wide=0.34, lower_down=0.20),
    'viseme_E': dict(open_=0.46, wide=0.78),
    'viseme_I': dict(open_=0.20, wide=0.95),
    'viseme_O': dict(open_=0.66, round_=0.92, pucker=0.25),
    'viseme_U': dict(open_=0.22, round_=1.00, pucker=0.45),
}


def face_meshes() -> list[MeshData]:
    meshes: list[MeshData] = []

    head = ellipsoid(
        'Head', 'CUSTOM_SKIN', HEAD_C, HEAD_R, segs=40, rings=28,
        tag_fn=_head_tag, weight_fn=lambda _p: HEAD_WEIGHTS, deform=_head_deform,
    )
    _head_morphs(head)
    # viseme jaw/chin motion on the head
    for name, p in VISEME_PARAMS.items():
        o = p.get('open_', 0.0)
        head.add_morph(name, lambda v, _i, o=o: (
            (0.0, -0.021 * o * (1.0 if v.tag == 'chin' else 0.5 if v.tag == 'jaw_side' else 0.0), -0.002 * o)
        ))
    meshes.append(head)

    # ears and nose as extra head pieces
    for side, sx in (('L', 1.0), ('R', -1.0)):
        ear = ellipsoid(
            f'Ear_{side}', 'CUSTOM_SKIN',
            (0.121 * sx, 1.655, 0.008), (0.020, 0.032, 0.026), segs=16, rings=10,
            tag_fn=lambda _p, _c: 'head', weight_fn=lambda _p: HEAD_WEIGHTS,
        )
        meshes.append(ear)
    nose = ellipsoid(
        'Nose', 'CUSTOM_SKIN', (0.0, 1.646, 0.146), (0.017, 0.020, 0.019),
        segs=18, rings=12, tag_fn=lambda _p, _c: 'nose', weight_fn=lambda _p: HEAD_WEIGHTS,
    )
    meshes.append(nose)

    # lips
    lips = ellipse_ring(
        'Lips', 'CUSTOM_SKIN', MOUTH_C, MOUTH_RX, MOUTH_RY, 0.0080, 0.0060,
        segs=36, tube_segs=10, tag_fn=_lip_tag, weight_fn=lambda _p: HEAD_WEIGHTS,
    )
    for name, params in VISEME_PARAMS.items():
        lips.add_morph(name, lambda v, _i, params=params: _lip_delta(v, **params))
    for side, sgn in (('Left', 1.0), ('Right', -1.0)):
        tag = 'corner_L' if sgn > 0 else 'corner_R'

        def smile(v, _i, tag=tag, sgn=sgn):
            if v.tag == tag:
                return (0.0030 * sgn, 0.0060, 0.0)
            return (0.0, 0.0, 0.0)

        def frown(v, _i, tag=tag, sgn=sgn):
            if v.tag == tag:
                return (-0.0020 * sgn, -0.0055, 0.0)
            return (0.0, 0.0, 0.0)

        lips.add_morph(f'mouthSmile{side}', smile)
        lips.add_morph(f'mouthFrown{side}', frown)
    lips.add_morph('mouthPressLeft', lambda v, _i: (0.0, -0.0025, 0.0) if v.tag == 'lip_upper' else (0.0, 0.0, 0.0))
    lips.add_morph('mouthPressRight', lambda v, _i: (0.0, 0.0025, 0.0) if v.tag == 'lip_lower' else (0.0, 0.0, 0.0))
    lips.add_morph('mouthUpperUpLeft', lambda v, _i: (0.0, 0.0040, 0.0) if v.tag == 'lip_upper' and v.pos[0] <= 0 else (0.0, 0.0, 0.0))
    lips.add_morph('mouthUpperUpRight', lambda v, _i: (0.0, 0.0040, 0.0) if v.tag == 'lip_upper' and v.pos[0] >= 0 else (0.0, 0.0, 0.0))
    lips.add_morph('mouthLowerDownLeft', lambda v, _i: (0.0, -0.0040, 0.0) if v.tag == 'lip_lower' and v.pos[0] <= 0 else (0.0, 0.0, 0.0))
    lips.add_morph('mouthLowerDownRight', lambda v, _i: (0.0, -0.0040, 0.0) if v.tag == 'lip_lower' and v.pos[0] >= 0 else (0.0, 0.0, 0.0))
    lips.add_morph('mouthStretchLeft', lambda v, _i: (0.0040, 0.0, 0.0) if v.tag == 'corner_L' else (0.0, 0.0, 0.0))
    lips.add_morph('mouthStretchRight', lambda v, _i: (-0.0040, 0.0, 0.0) if v.tag == 'corner_R' else (0.0, 0.0, 0.0))
    lips.add_morph('mouthFunnel', lambda v, _i: _lip_delta(v, open_=0.45, round_=0.65))
    lips.add_morph('mouthPucker', lambda v, _i: _lip_delta(v, round_=0.8, pucker=1.0))
    lips.add_morph('mouthClose', lambda v, _i: _lip_delta(v, press=1.0))
    meshes.append(lips)

    # dark mouth interior
    inner = MeshData('MouthInner', 'CUSTOM_MOUTH')
    center = (MOUTH_C[0], MOUTH_C[1], 0.121)
    ci = inner.add_vertex(center, 'inner', HEAD_WEIGHTS)
    ring: list[int] = []
    for j in range(32):
        a = 2.0 * math.pi * j / 32
        p = (center[0] + 0.034 * math.cos(a), center[1] + 0.0125 * math.sin(a), center[2])
        ring.append(inner.add_vertex(p, 'inner_lower' if p[1] < center[1] else 'inner_upper', HEAD_WEIGHTS))
    for j in range(32):
        k = (j + 1) % 32
        inner.add_face(ci, ring[j], ring[k])
    for name, p in VISEME_PARAMS.items():
        o = p.get('open_', 0.0)
        inner.add_morph(name, lambda v, _i, o=o: (
            (0.0, -0.012 * o if v.tag == 'inner_lower' else 0.003 * o, 0.0)
        ))
    inner.add_morph('jawOpen', lambda v, _i: (0.0, -0.010 if v.tag == 'inner_lower' else 0.002, 0.0))
    meshes.append(inner)

    # upper/lower teeth arcs
    for row, y0, mat in (('Upper', 1.6075, 'CUSTOM_TEETH'), ('Lower', 1.5965, 'CUSTOM_TEETH')):
        pts: list[Vec3] = []
        for i in range(11):
            t = -1.0 + 2.0 * i / 10.0
            x = t * 0.030
            y = y0 - 0.0025 * (1.0 - t * t) * (1.0 if row == 'Upper' else -1.0)
            pts.append((x, y, 0.124 - 0.004 * (1.0 - t * t)))
        teeth = tube(
            f'Teeth{row}', mat, pts, [0.0045 + 0.0012 * (1.0 - abs(-1.0 + 2.0 * i / 10.0)) for i in range(11)],
            segs=8, tag=row.lower(), weight_fn=lambda _p: HEAD_WEIGHTS,
        )
        if row == 'Lower':
            for name, p in VISEME_PARAMS.items():
                o = p.get('open_', 0.0)
                teeth.add_morph(name, lambda _v, _i, o=o: (0.0, -0.013 * o, 0.0))
            teeth.add_morph('jawOpen', lambda _v, _i: (0.0, -0.010, 0.0))
        meshes.append(teeth)

    tongue = ellipsoid(
        'Tongue', 'CUSTOM_TONGUE', (0.0, 1.590, 0.119), (0.019, 0.009, 0.018),
        segs=16, rings=10, tag_fn=lambda _p, _c: 'tongue', weight_fn=lambda _p: HEAD_WEIGHTS,
    )
    for name, p in VISEME_PARAMS.items():
        o = p.get('open_', 0.0)
        tongue.add_morph(name, lambda _v, _i, o=o: (0.0, -0.007 * o, 0.0))
    tongue.add_morph('jawOpen', lambda _v, _i: (0.0, -0.006, 0.0))
    tongue.add_morph('tongueOut', lambda v, _i: (0.0, -0.004, 0.014) if v.pos[2] > 0.115 else (0.0, 0.0, 0.004))
    meshes.append(tongue)

    # eyes: white, iris and pupil are skinned to the eye joints so the gaze moves
    for side, sx in (('L', 1.0), ('R', -1.0)):
        ex, ey, ez = EYE_C[side]
        bone = f'{side}Eye'
        w = weights_fixed(bone)
        white = ellipsoid(
            f'EyeWhite_{side}', 'CUSTOM_EYE_WHITE', (ex, ey, ez + 0.020),
            (0.026, 0.019, 0.010), segs=24, rings=14,
            tag_fn=lambda _p, _c: 'eye', weight_fn=lambda _p, w=w: w,
        )
        iris = ellipsoid(
            f'Iris_{side}', 'CUSTOM_IRIS', (ex, ey, ez + 0.0300),
            (0.0115, 0.0115, 0.0045), segs=20, rings=10,
            tag_fn=lambda _p, _c: 'iris', weight_fn=lambda _p, w=w: w,
        )
        pupil = ellipsoid(
            f'Pupil_{side}', 'CUSTOM_PUPIL', (ex, ey, ez + 0.0335),
            (0.0058, 0.0058, 0.0032), segs=16, rings=8,
            tag_fn=lambda _p, _c: 'pupil', weight_fn=lambda _p, w=w: w,
        )
        meshes.extend([white, iris, pupil])

    # eyelids: spherical patches over each eye
    for side, sx in (('L', 1.0), ('R', -1.0)):
        ex, ey, ez = EYE_C[side]
        lid = _eyelid_patch(side, ex, ey, ez, upper=True)
        meshes.append(lid)
        meshes.append(_eyelid_patch(side, ex, ey, ez, upper=False))

    # eyebrows
    for side, sx in (('L', 1.0), ('R', -1.0)):
        ex = 0.047 * sx
        pts: list[Vec3] = []
        for i in range(9):
            t = -1.0 + 2.0 * i / 8.0
            x = ex + t * 0.030
            y = 1.707 + 0.006 * (1.0 - t * t) - 0.003 * abs(t)
            z = head_surface_z(x, y, margin=0.002) + 0.002
            pts.append((x, y, z))
        brow = tube(
            f'Brow_{side}', 'CUSTOM_HAIR', pts, [0.0048] * len(pts), segs=7,
            tag=f'brow_{side}', weight_fn=lambda _p: HEAD_WEIGHTS,
        )
        _brow_morphs(brow, side)
        meshes.append(brow)

    # hair styles: short, bob, ponytail (same rig, toggled by the renderer)
    meshes.extend(_hair_meshes())

    return meshes


def _eyelid_patch(side: str, ex: float, ey: float, ez: float, upper: bool) -> MeshData:
    full_side = {'L': 'Left', 'R': 'Right'}[side]
    name = f'Eyelid{upper and "Upper" or "Lower"}_{side}'
    m = MeshData(name, 'CUSTOM_SKIN')
    nx, nt = 11, 4
    r = EYE_R + 0.006
    rings: list[list[int]] = []
    for j in range(nt):
        t = j / (nt - 1)
        if upper:
            yy = ey + 0.030 - t * 0.020
        else:
            yy = ey - 0.030 + t * 0.018
        ring: list[int] = []
        for i in range(nx):
            u = -1.0 + 2.0 * i / (nx - 1)
            xx = ex + u * 0.030
            q = max(0.0, r * r - (xx - ex) ** 2 - (yy - ey) ** 2)
            zz = ez + math.sqrt(q) + 0.002
            tag = 'lid_upper' if upper else 'lid_lower'
            ring.append(m.add_vertex((xx, yy, zz), tag, HEAD_WEIGHTS))
        rings.append(ring)
    for j in range(nt - 1):
        a, b = rings[j], rings[j + 1]
        for i in range(nx - 1):
            m.add_face(a[i], a[i + 1], b[i + 1], b[i])
    # blink: upper edge travels down, lower edge travels up
    for blink_name, amount in ((f'eyeBlink{full_side}', 1.0),):
        if upper:
            m.add_morph(blink_name, lambda v, _i, a=amount: (
                (0.0, -0.050 * a * smoothstep(ey + 0.030, ey + 0.005, v.pos[1]), 0.002)
            ))
            m.add_morph(f'eyeWide{full_side}', lambda v, _i: (
                (0.0, 0.006 * smoothstep(ey + 0.030, ey + 0.005, v.pos[1]), 0.0)
            ))
        else:
            m.add_morph(blink_name, lambda v, _i, a=amount: (
                (0.0, 0.028 * a * smoothstep(ey - 0.030, ey - 0.008, v.pos[1]), 0.002)
            ))
            m.add_morph(f'eyeWide{full_side}', lambda v, _i: (
                (0.0, -0.004 * smoothstep(ey - 0.030, ey - 0.008, v.pos[1]), 0.0)
            ))
    return m


def _brow_morphs(brow: MeshData, side: str) -> None:
    full_side = {'L': 'Left', 'R': 'Right'}[side]
    eye_x = 0.047 if side == 'L' else -0.047
    sgn = 1.0 if side == 'L' else -1.0

    def is_inner(v):
        return (v.pos[0] - eye_x) * sgn < 0.010

    brow.add_morph('browInnerUp', lambda v, _i: (0.0, 0.0055, 0.001) if is_inner(v) else (0.0, 0.0015, 0.0))
    brow.add_morph(f'browOuterUp{full_side}', lambda v, _i: (0.0, 0.0050, 0.001) if not is_inner(v) else (0.0, 0.0, 0.0))
    brow.add_morph(f'browDown{full_side}', lambda v, _i: (0.0, -0.0040, 0.001))
    brow.add_morph(f'eyeWide{full_side}', lambda v, _i: (0.0, 0.0030, 0.0))


def _filter_faces(mesh: MeshData, keep: Callable[[Vec3], bool]) -> MeshData:
    out = MeshData(mesh.name, mesh.material)
    remap: dict[int, int] = {}
    for f in mesh.faces:
        c = (0.0, 0.0, 0.0)
        for i in f:
            p = mesh.vertices[i].pos
            c = (c[0] + p[0] / len(f), c[1] + p[1] / len(f), c[2] + p[2] / len(f))
        if not keep(c):
            continue
        nf: list[int] = []
        for i in f:
            if i not in remap:
                v = mesh.vertices[i]
                remap[i] = out.add_vertex(v.pos, v.tag, v.weights)
            nf.append(remap[i])
        out.add_face(*nf)
    return out


def _hair_meshes() -> list[MeshData]:
    out: list[MeshData] = []

    def cap(name: str, scale: float, keep):
        h = ellipsoid(
            name, 'CUSTOM_HAIR',
            (HEAD_C[0], HEAD_C[1] + 0.006, HEAD_C[2] - 0.004),
            (HEAD_R[0] * scale, HEAD_R[1] * scale, HEAD_R[2] * scale),
            segs=32, rings=22, tag_fn=lambda _p, _c: 'hair', weight_fn=lambda _p: HEAD_WEIGHTS,
        )
        out.append(_filter_faces(h, keep))

    cap('Hair_Short', 1.035, lambda c: c[1] > 1.700 or c[2] < -0.005)
    cap('Hair_Bob', 1.045, lambda c: c[1] > 1.615 or c[2] < -0.020)

    def spiky(c: Vec3) -> bool:
        if c[1] > 1.700:
            return True
        if c[2] < -0.012 and c[1] > 1.640:
            return True
        return False

    cap('Hair_Ponytail', 1.038, spiky)
    # ponytail tube at the back
    pts: list[Vec3] = []
    for i in range(7):
        t = i / 6.0
        pts.append((0.0, 1.735 - 0.16 * t, -0.115 - 0.035 * math.sin(t * math.pi) + 0.02 * t))
    tail = tube('Ponytail', 'CUSTOM_HAIR', pts, [0.030 * (1.0 - 0.55 * i / 6.0) for i in range(7)], segs=12,
                tag='hair', weight_fn=lambda _p: HEAD_WEIGHTS)
    out.append(tail)
    # fringe on the short/bob caps
    for name, y in (('Fringe_Short', 1.715), ('Fringe_Bob', 1.705)):
        f = ellipsoid(
            name, 'CUSTOM_HAIR', (0.0, y, 0.108),
            (HEAD_R[0] * 0.95, 0.055, 0.045), segs=20, rings=10,
            tag_fn=lambda _p, _c: 'hair', weight_fn=lambda _p: HEAD_WEIGHTS,
        )
        out.append(f)
    return out


def face_morph_names() -> list[str]:
    names = set(VISEME_PARAMS)
    names.update({
        'jawOpen', 'browInnerUp', 'eyeWideLeft', 'eyeWideRight',
        'eyeBlinkLeft', 'eyeBlinkRight', 'tongueOut',
    })
    for side in ('Left', 'Right'):
        names.update({
            f'mouthSmile{side}', f'mouthFrown{side}', f'cheekSquint{side}',
            f'browOuterUp{side}', f'browDown{side}', f'noseSneer{side}',
            f'mouthPress{side}', f'mouthUpperUp{side}', f'mouthLowerDown{side}',
            f'mouthStretch{side}',
        })
    names.update({'mouthFunnel', 'mouthPucker', 'mouthClose'})
    return sorted(names)
