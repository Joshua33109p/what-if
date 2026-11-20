#!/usr/bin/env python3
"""Structural and skinning validation for a built custom-rig GLB."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

REQUIRED_BONES = [
    'Root', 'Hips', 'Spine', 'Spine1', 'Spine2', 'Chest', 'Neck', 'Head',
    'Jaw', 'LeftEye', 'RightEye',
    'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
    'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
    'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToe',
    'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToe',
]
REQUIRED_VISEMES = [
    'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
    'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
    'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
]
REQUIRED_FACE = [
    'jawOpen', 'eyeBlinkLeft', 'eyeBlinkRight', 'eyeWideLeft', 'eyeWideRight',
    'browInnerUp', 'browDownLeft', 'browDownRight',
    'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
    'cheekSquintLeft', 'cheekSquintRight', 'mouthPucker', 'mouthFunnel', 'tongueOut',
]
REQUIRED_CLIPS = [
    'Idle_Loop', 'Idle_Talking_Loop', 'Walk_Loop', 'Run_Loop', 'Wave', 'Point',
    'Shrug', 'Think', 'Reach', 'Throw', 'Piano', 'Surgery', 'Collapse', 'Interact',
]
REQUIRED_MATERIALS = [
    'CUSTOM_SKIN', 'CUSTOM_SHIRT', 'CUSTOM_PANTS', 'CUSTOM_HAIR',
    'CUSTOM_EYE_WHITE', 'CUSTOM_IRIS', 'CUSTOM_PUPIL', 'CUSTOM_MOUTH',
    'CUSTOM_TEETH', 'CUSTOM_TONGUE',
]


def load_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    magic, ver, length = struct.unpack_from('<III', data, 0)
    if magic != 0x46546C67:
        raise SystemExit(f'{path}: not a GLB')
    off = 12
    js = None
    blob = b''
    while off < length:
        clen, ctype = struct.unpack_from('<II', data, off)
        off += 8
        chunk = data[off:off + clen]
        off += clen
        if ctype == 0x4E4F534A:
            js = json.loads(chunk.decode('utf-8'))
        elif ctype == 0x004E4942:
            blob = chunk
    if js is None:
        raise SystemExit(f'{path}: no JSON chunk')
    return js, blob


def accessor_values(js: dict, blob: bytes, index: int):
    acc = js['accessors'][index]
    view = js['bufferViews'][acc['bufferView']]
    comp = acc['componentType']
    type_ = acc['type']
    ncomp = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[type_]
    fmt = {5126: 'f', 5123: 'H', 5125: 'I'}[comp]
    size = struct.calcsize(fmt)
    start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    stride = view.get('byteStride') or size * ncomp
    out = []
    for i in range(acc['count']):
        vals = struct.unpack_from('<' + fmt * ncomp, blob, start + i * stride)
        out.append(vals[0] if ncomp == 1 else vals)
    return out


def main(path: Path) -> int:
    js, blob = load_glb(path)
    errors: list[str] = []
    warnings: list[str] = []

    nodes = js.get('nodes', [])
    names = {n.get('name', '') for n in nodes}
    lower = {n.lower() for n in names}
    for b in REQUIRED_BONES:
        if b.lower() not in lower:
            errors.append(f'missing bone {b}')
    finger_count = sum(1 for n in names if any(n.startswith(f'{s}{f}') for s in ('Left', 'Right')
                                                for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')))
    if finger_count < 30:
        errors.append(f'finger joints: expected 30, found {finger_count}')

    skins = js.get('skins', [])
    if not skins:
        errors.append('no skin')
    joints = max((len(s.get('joints', [])) for s in skins), default=0)
    if joints < 55:
        errors.append(f'joints: expected >=55, found {joints}')

    morph_names: set[str] = set()
    morph_meshes = 0
    vertex_count = 0
    tri_count = 0
    bad_weights = 0
    for m in js.get('meshes', []):
        target_names = (m.get('extras') or {}).get('targetNames') or []
        if target_names:
            morph_meshes += 1
            morph_names.update(target_names)
        for p in m.get('primitives', []):
            acc = js['accessors'][p['attributes']['POSITION']]
            vertex_count += acc['count']
            if 'indices' in p:
                tri_count += js['accessors'][p['indices']]['count'] // 3
            if 'WEIGHTS_0' in p['attributes']:
                weights = accessor_values(js, blob, p['attributes']['WEIGHTS_0'])
                for w in weights[:200]:
                    s = sum(w)
                    if abs(s - 1.0) > 1e-3:
                        bad_weights += 1
    if not morph_meshes:
        errors.append('no morph targets')
    for name in REQUIRED_VISEMES:
        if name.lower() not in {n.lower() for n in morph_names}:
            errors.append(f'missing viseme {name}')
    for name in REQUIRED_FACE:
        if name.lower() not in {n.lower() for n in morph_names}:
            errors.append(f'missing face control {name}')
    if bad_weights:
        errors.append(f'{bad_weights} sampled vertices have unnormalised skin weights')

    anims = js.get('animations', [])
    clip_names = {a.get('name', '') for a in anims}
    for name in REQUIRED_CLIPS:
        if name not in clip_names:
            errors.append(f'missing clip {name}')
    for a in anims:
        if not a.get('channels') or not a.get('samplers'):
            errors.append(f"clip {a.get('name')} is empty")

    mats = {m.get('name', '') for m in js.get('materials', [])}
    for name in REQUIRED_MATERIALS:
        if name not in mats:
            errors.append(f'missing material {name}')

    # bounds and scale sanity
    mins = [1e9, 1e9, 1e9]
    maxs = [-1e9, -1e9, -1e9]
    for m in js.get('meshes', []):
        for p in m.get('primitives', []):
            acc = js['accessors'][p['attributes']['POSITION']]
            if 'min' in acc:
                for i in range(3):
                    mins[i] = min(mins[i], acc['min'][i])
                    maxs[i] = max(maxs[i], acc['max'][i])
    height = maxs[1] - mins[1]
    if not (1.5 < height < 2.2):
        warnings.append(f'height is {height:.2f} m (expected about 1.8 m)')
    if abs(mins[1]) > 0.12:
        warnings.append(f'feet do not sit near y=0 (min y {mins[1]:.3f})')

    print(f'file: {path} ({path.stat().st_size / 1024 / 1024:.2f} MB)')
    print(f'nodes={len(nodes)} meshes={len(js.get("meshes", []))} joints={joints} '
          f'morphs={len(morph_names)} clips={len(anims)} materials={len(mats)}')
    print(f'vertices={vertex_count} triangles={tri_count} height={height:.2f} m')
    print(f'clips: {", ".join(sorted(clip_names))}')
    if warnings:
        print('warnings:')
        for w in warnings:
            print('  ! ' + w)
    if errors:
        print('FAIL')
        for e in errors:
            print('  - ' + e)
        return 1
    print('PASS: custom rig is structurally complete')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: python rig/custom_rig/validate.py <custom_rig.glb>')
    raise SystemExit(main(Path(sys.argv[1])))
