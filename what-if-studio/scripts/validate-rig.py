#!/usr/bin/env python3
import json, struct, sys

REQUIRED_BONES = [
    'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
    'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
    'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
    'LeftUpLeg', 'LeftLeg', 'LeftFoot',
    'RightUpLeg', 'RightLeg', 'RightFoot',
]

VISEMES = [
    'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
    'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
    'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
]

ARKIT = [
    'eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen',
    'mouthSmileLeft', 'mouthSmileRight',
    'browInnerUp', 'browDownLeft', 'browDownRight',
    'cheekSquintLeft', 'cheekSquintRight',
]

ARKIT_COMBINED = {
    'eyeBlinkLeft': ['eyeBlink'],
    'eyeBlinkRight': ['eyeBlink'],
    'mouthSmileLeft': ['mouthSmile'],
    'mouthSmileRight': ['mouthSmile'],
    'cheekSquintLeft': ['cheekSquint'],
    'cheekSquintRight': ['cheekSquint'],
    'browDownLeft': ['browDown'],
    'browDownRight': ['browDown'],
}

ARKIT_OPTIONAL = {'cheekSquintLeft', 'cheekSquintRight'}

def load_glb(path):
    with open(path, 'rb') as f:
        data = f.read()
    magic, ver, length = struct.unpack_from('<III', data, 0)
    if magic != 0x46546C67:
        raise SystemExit(f'{path}: not a GLB')
    off = 12
    js = None
    while off < length:
        clen, ctype = struct.unpack_from('<II', data, off)
        off += 8
        chunk = data[off:off + clen]
        off += clen
        if ctype == 0x4E4F534A:
            js = json.loads(chunk.decode('utf-8'))
    if js is None:
        raise SystemExit(f'{path}: no JSON chunk')
    return js

def main(path):
    js = load_glb(path)
    nodes = js.get('nodes', [])
    meshes = js.get('meshes', [])
    skins = js.get('skins', [])
    names = {n.get('name', '') for n in nodes}
    morph_names = set()
    morph_meshes = []
    for m in meshes:
        target_names = (m.get('extras') or {}).get('targetNames') or []
        count = sum(len(p.get('targets', [])) for p in m.get('primitives', []))
        if count:
            morph_meshes.append((m.get('name'), count, target_names))
            morph_names.update(target_names)
    lower = {n.lower() for n in morph_names}
    lower_bones = {n.lower() for n in names}
    missing_bones = [b for b in REQUIRED_BONES if b.lower() not in lower_bones]
    missing_visemes = [v for v in VISEMES if v.lower() not in lower]
    combined_used = []
    missing_arkit = []
    for a in ARKIT:
        if a.lower() in lower:
            continue
        alias = next((x for x in ARKIT_COMBINED.get(a, []) if x.lower() in lower), None)
        if alias:
            combined_used.append(f'{a}->{alias}')
        else:
            missing_arkit.append(a)
    missing_required = [a for a in missing_arkit if a not in ARKIT_OPTIONAL]
    missing_optional = [a for a in missing_arkit if a in ARKIT_OPTIONAL]
    max_targets = max((c for _, c, _ in morph_meshes), default=0)
    joints = max((len(s.get('joints', [])) for s in skins), default=0)

    print(f'file: {path}')
    print(f'nodes: {len(nodes)}  meshes: {len(meshes)}  skins: {len(skins)}  joints: {joints}')
    print(f'morph meshes: {len(morph_meshes)}  max morph targets: {max_targets}  total names: {len(morph_names)}')
    for name, count, target_names in morph_meshes:
        print(f'  {name or "(unnamed)":28s} targets={count:3d} names={len(target_names):3d}')
    print(f'required bones: {"OK" if not missing_bones else "MISSING " + ", ".join(missing_bones)}')
    print(f'visemes:        {"OK" if not missing_visemes else "MISSING " + ", ".join(missing_visemes)}')
    print(f'ARKit:          {"OK" if not missing_required else "MISSING " + ", ".join(missing_required)}')
    if combined_used:
        print(f'ARKit combined: {", ".join(combined_used)}')
    if missing_optional:
        print(f'ARKit optional: absent {", ".join(missing_optional)}')
    print(f'viseme_sil:     {"present" if "viseme_sil" in lower else "optional / absent"}')

    # Morph targets may be split across head, lips, eyelids and brows. What matters is that the
    # set of visemes and ARKit controls is complete and the skeleton is full-body.
    ok = (not missing_bones and not missing_visemes and not missing_required
          and joints >= 50 and len(morph_names) >= 30 and max_targets >= 40)
    if not ok:
        print('\nNOT A USABLE FULL-BODY FACE RIG')
        print('Use a full-body rig with ARKit-compatible and Oculus viseme blendshapes.')
        return 1
    print('\nFULL-BODY FACE RIG OK')
    return 0

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: python scripts/validate-rig.py <avatar.glb>')
    raise SystemExit(main(sys.argv[1]))
