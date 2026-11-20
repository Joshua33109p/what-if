"""Small procedural geometry toolkit for the custom cartoon rig.

Everything is built as indexed triangle/quad meshes with smooth vertex normals, per-vertex
skin weights and a tag string used by the facial shape-key generator. Coordinates are metres,
Y up, +Z forward, +X the character's left.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Iterable, Sequence

Vec3 = tuple[float, float, float]


def vadd(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def vsub(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vmul(a: Vec3, s: float) -> Vec3:
    return (a[0] * s, a[1] * s, a[2] * s)


def vdot(a: Vec3, b: Vec3) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def vcross(a: Vec3, b: Vec3) -> Vec3:
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def vlen(a: Vec3) -> float:
    return math.sqrt(vdot(a, a))


def vnorm(a: Vec3, fallback: Vec3 = (0.0, 1.0, 0.0)) -> Vec3:
    n = vlen(a)
    if n < 1e-9:
        return fallback
    return vmul(a, 1.0 / n)


def vlerp(a: Vec3, b: Vec3, t: float) -> Vec3:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if x < lo else hi if x > hi else x


def smoothstep(a: float, b: float, x: float) -> float:
    if a == b:
        return 0.0 if x < a else 1.0
    t = clamp((x - a) / (b - a))
    return t * t * (3.0 - 2.0 * t)


@dataclass
class Vertex:
    pos: Vec3
    tag: str = 'body'
    weights: dict[str, float] = field(default_factory=dict)


@dataclass
class MeshData:
    name: str
    material: str
    vertices: list[Vertex] = field(default_factory=list)
    faces: list[tuple[int, ...]] = field(default_factory=list)
    morphs: dict[str, list[Vec3]] = field(default_factory=dict)
    extras: dict = field(default_factory=dict)

    def add_vertex(self, pos: Vec3, tag: str = 'body', weights: dict[str, float] | None = None) -> int:
        self.vertices.append(Vertex(tuple(float(v) for v in pos), tag, dict(weights or {})))
        return len(self.vertices) - 1

    def add_face(self, *idx: int) -> None:
        self.faces.append(tuple(idx))

    def add_morph(self, name: str, fn: Callable[[Vertex, int], Vec3]) -> None:
        deltas: list[Vec3] = []
        for i, v in enumerate(self.vertices):
            d = fn(v, i)
            deltas.append((float(d[0]), float(d[1]), float(d[2])))
        self.morphs[name] = deltas

    def compute_normals(self) -> list[Vec3]:
        normals = [(0.0, 0.0, 0.0)] * len(self.vertices)
        for f in self.faces:
            if len(f) == 3:
                a, b, c = (self.vertices[i].pos for i in f)
                n = vcross(vsub(b, a), vsub(c, a))
                for i in f:
                    normals[i] = vadd(normals[i], n)
            elif len(f) == 4:
                a, b, c, d = (self.vertices[i].pos for i in f)
                n1 = vcross(vsub(b, a), vsub(c, a))
                n2 = vcross(vsub(c, a), vsub(d, a))
                for i in f:
                    normals[i] = vadd(normals[i], vadd(n1, n2))
        return [vnorm(n) for n in normals]

    def tri_faces(self) -> list[tuple[int, int, int]]:
        out: list[tuple[int, int, int]] = []
        for f in self.faces:
            if len(f) == 3:
                out.append((f[0], f[1], f[2]))
            elif len(f) == 4:
                out.append((f[0], f[1], f[2]))
                out.append((f[0], f[2], f[3]))
        return out


def weights_fixed(name: str) -> dict[str, float]:
    return {name: 1.0}


def weights_nearest(
    pos: Vec3,
    bones: Sequence[tuple[str, Vec3, Vec3]],
    max_inf: int = 4,
    power: float = 4.0,
    eps: float = 0.012,
) -> dict[str, float]:
    scored: list[tuple[float, str]] = []
    for name, head, tail in bones:
        seg = vsub(tail, head)
        l2 = vdot(seg, seg)
        t = 0.0 if l2 < 1e-12 else clamp(vdot(vsub(pos, head), seg) / l2)
        closest = vadd(head, vmul(seg, t))
        d = vlen(vsub(pos, closest))
        scored.append((1.0 / ((d + eps) ** power), name))
    scored.sort(reverse=True)
    chosen = scored[:max_inf]
    total = sum(w for w, _ in chosen)
    if total <= 0:
        return {bones[0][0]: 1.0}
    return {name: w / total for w, name in chosen if w / total > 0.001}


def loft(
    name: str,
    material: str,
    sections: Sequence[dict],
    segs: int,
    tag_fn: Callable[[Vec3, float], str] | None = None,
    weight_fn: Callable[[Vec3], dict[str, float]] | None = None,
    cap_start: bool = True,
    cap_end: bool = True,
) -> MeshData:
    """Loft elliptical rings stacked along Y. Section keys: y, cx, cz, rx, rz, rot."""
    m = MeshData(name, material)
    rings: list[list[int]] = []
    for s in sections:
        cy = float(s['y'])
        cx = float(s.get('cx', 0.0))
        cz = float(s.get('cz', 0.0))
        rx = float(s['rx'])
        rz = float(s['rz'])
        rot = float(s.get('rot', 0.0))
        ring: list[int] = []
        for j in range(segs):
            a = 2.0 * math.pi * j / segs
            x = rx * math.cos(a)
            z = rz * math.sin(a)
            if rot:
                cr, sr = math.cos(rot), math.sin(rot)
                x, z = x * cr - z * sr, x * sr + z * cr
            p = (cx + x, cy, cz + z)
            tag = tag_fn(p, a) if tag_fn else 'body'
            w = weight_fn(p) if weight_fn else {}
            ring.append(m.add_vertex(p, tag, w))
        rings.append(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(segs):
            k = (j + 1) % segs
            m.add_face(a[j], a[k], b[k], b[j])
    if cap_start:
        s = sections[0]
        c = m.add_vertex((float(s.get('cx', 0.0)), float(s['y']), float(s.get('cz', 0.0))),
                         'cap', weight_fn((float(s.get('cx', 0.0)), float(s['y']), float(s.get('cz', 0.0)))) if weight_fn else {})
        for j in range(segs):
            k = (j + 1) % segs
            m.add_face(rings[0][j], c, rings[0][k])
    if cap_end:
        s = sections[-1]
        c = m.add_vertex((float(s.get('cx', 0.0)), float(s['y']), float(s.get('cz', 0.0))),
                         'cap', weight_fn((float(s.get('cx', 0.0)), float(s['y']), float(s.get('cz', 0.0)))) if weight_fn else {})
        for j in range(segs):
            k = (j + 1) % segs
            m.add_face(rings[-1][j], rings[-1][k], c)
    return m


def ellipsoid(
    name: str,
    material: str,
    center: Vec3,
    radii: Vec3,
    segs: int = 28,
    rings: int = 18,
    tag_fn: Callable[[Vec3, Vec3], str] | None = None,
    weight_fn: Callable[[Vec3], dict[str, float]] | None = None,
    deform: Callable[[Vec3], Vec3] | None = None,
) -> MeshData:
    m = MeshData(name, material)
    cx, cy, cz = center
    rx, ry, rz = radii

    def place(lat: float, lon: float) -> Vec3:
        p = (
            cx + rx * math.cos(lat) * math.cos(lon),
            cy + ry * math.sin(lat),
            cz + rz * math.cos(lat) * math.sin(lon),
        )
        return deform(p) if deform else p

    def tagp(p: Vec3) -> str:
        return tag_fn(p, center) if tag_fn else 'body'

    top = m.add_vertex(place(math.pi / 2, 0), tagp(place(math.pi / 2, 0)), weight_fn(place(math.pi / 2, 0)) if weight_fn else {})
    ring_ids: list[list[int]] = []
    for i in range(1, rings):
        lat = math.pi / 2 - math.pi * i / rings
        ring: list[int] = []
        for j in range(segs):
            lon = 2.0 * math.pi * j / segs
            p = place(lat, lon)
            ring.append(m.add_vertex(p, tagp(p), weight_fn(p) if weight_fn else {}))
        ring_ids.append(ring)
    bottom = m.add_vertex(place(-math.pi / 2, 0), tagp(place(-math.pi / 2, 0)), weight_fn(place(-math.pi / 2, 0)) if weight_fn else {})

    first = ring_ids[0]
    for j in range(segs):
        k = (j + 1) % segs
        m.add_face(top, first[j], first[k])
    for i in range(len(ring_ids) - 1):
        a, b = ring_ids[i], ring_ids[i + 1]
        for j in range(segs):
            k = (j + 1) % segs
            m.add_face(a[j], a[k], b[k], b[j])
    last = ring_ids[-1]
    for j in range(segs):
        k = (j + 1) % segs
        m.add_face(last[j], bottom, last[k])
    return m


def _frames(points: Sequence[Vec3], up: Vec3) -> list[tuple[Vec3, Vec3, Vec3]]:
    frames: list[tuple[Vec3, Vec3, Vec3]] = []
    ref = up
    prev_u: Vec3 | None = None
    for i, p in enumerate(points):
        if i == 0:
            t = vnorm(vsub(points[1], p))
        elif i == len(points) - 1:
            t = vnorm(vsub(p, points[i - 1]))
        else:
            t = vnorm(vsub(points[i + 1], points[i - 1]))
        if prev_u is None:
            if abs(vdot(t, ref)) > 0.95:
                ref = (0.0, 0.0, 1.0) if abs(t[2]) < 0.9 else (1.0, 0.0, 0.0)
            u = vnorm(vcross(t, ref))
        else:
            u = vsub(prev_u, vmul(t, vdot(prev_u, t)))
            if vlen(u) < 1e-6:
                u = vnorm(vcross(t, (0.0, 0.0, 1.0)))
            u = vnorm(u)
        v = vnorm(vcross(t, u))
        frames.append((t, u, v))
        prev_u = u
    return frames


def tube(
    name: str,
    material: str,
    points: Sequence[Vec3],
    radii: Sequence[float] | Sequence[Vec3],
    segs: int = 12,
    tag: str = 'body',
    weight_fn: Callable[[Vec3], dict[str, float]] | None = None,
    cap_start: bool = True,
    cap_end: bool = True,
    up: Vec3 = (0.0, 0.0, 1.0),
    tag_fn: Callable[[Vec3, float], str] | None = None,
) -> MeshData:
    m = MeshData(name, material)
    frames = _frames(points, up)
    rings: list[list[int]] = []
    for i, (p, (t, u, v)) in enumerate(zip(points, frames)):
        r = radii[i]
        rx, rz = (float(r), float(r)) if isinstance(r, (int, float)) else (float(r[0]), float(r[1]))
        ring: list[int] = []
        for j in range(segs):
            a = 2.0 * math.pi * j / segs
            pos = vadd(p, vadd(vmul(u, rx * math.cos(a)), vmul(v, rz * math.sin(a))))
            ring.append(m.add_vertex(pos, tag_fn(pos, a) if tag_fn else tag, weight_fn(pos) if weight_fn else {}))
        rings.append(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(segs):
            k = (j + 1) % segs
            m.add_face(a[j], a[k], b[k], b[j])
    if cap_start:
        c = m.add_vertex(tuple(points[0]), tag, weight_fn(tuple(points[0])) if weight_fn else {})
        for j in range(segs):
            k = (j + 1) % segs
            m.add_face(rings[0][j], rings[0][k], c)
    if cap_end:
        c = m.add_vertex(tuple(points[-1]), tag, weight_fn(tuple(points[-1])) if weight_fn else {})
        for j in range(segs):
            k = (j + 1) % segs
            m.add_face(rings[-1][j], c, rings[-1][k])
    return m


def disc(
    name: str,
    material: str,
    center: Vec3,
    rx: float,
    ry: float,
    segs: int = 28,
    tag: str = 'body',
    weight: dict[str, float] | None = None,
    z_offset: float = 0.0,
) -> MeshData:
    m = MeshData(name, material)
    c = (center[0], center[1], center[2] + z_offset)
    center_i = m.add_vertex(c, tag, weight or {})
    ring: list[int] = []
    for j in range(segs):
        a = 2.0 * math.pi * j / segs
        ring.append(m.add_vertex((center[0] + rx * math.cos(a), center[1] + ry * math.sin(a), center[2] + z_offset), tag, weight or {}))
    for j in range(segs):
        k = (j + 1) % segs
        m.add_face(center_i, ring[j], ring[k])
    return m


def ellipse_ring(
    name: str,
    material: str,
    center: Vec3,
    rx: float,
    ry: float,
    tube_rx: float,
    tube_ry: float,
    segs: int = 32,
    tube_segs: int = 8,
    tag_fn: Callable[[Vec3, float, float], str] | None = None,
    weight_fn: Callable[[Vec3], dict[str, float]] | None = None,
) -> MeshData:
    """A torus whose centre curve is an ellipse in the XY plane."""
    m = MeshData(name, material)
    rings: list[list[int]] = []
    for j in range(segs):
        a = 2.0 * math.pi * j / segs
        cx = center[0] + rx * math.cos(a)
        cy = center[1] + ry * math.sin(a)
        # tangent of ellipse
        tx, ty = -rx * math.sin(a), ry * math.cos(a)
        tl = math.hypot(tx, ty) or 1.0
        # outward normal in XY
        nx, ny = math.cos(a), math.sin(a)
        ring: list[int] = []
        for i in range(tube_segs):
            b = 2.0 * math.pi * i / tube_segs
            off = (nx * tube_rx * math.cos(b), ny * tube_ry * math.cos(b), tube_rx * math.sin(b))
            p = (cx + off[0], cy + off[1], center[2] + off[2])
            ring.append(m.add_vertex(p, tag_fn(p, a, b) if tag_fn else 'lip', weight_fn(p) if weight_fn else {}))
        rings.append(ring)
    for j in range(segs):
        jn = (j + 1) % segs
        a, b = rings[j], rings[jn]
        for i in range(tube_segs):
            k = (i + 1) % tube_segs
            m.add_face(a[i], a[k], b[k], b[i])
    return m


def merge(meshes: Iterable[MeshData], name: str, material: str = '') -> MeshData:
    out = MeshData(name, material or next(iter(meshes)).material)
    for src in meshes:
        base = len(out.vertices)
        out.vertices.extend(src.vertices)
        for f in src.faces:
            out.faces.append(tuple(i + base for i in f))
        for morph, deltas in src.morphs.items():
            if morph not in out.morphs:
                out.morphs[morph] = [(0.0, 0.0, 0.0)] * base
            out.morphs[morph].extend(deltas)
    return out
