#!/usr/bin/env python3
"""Build the custom rig GLB and its manifest.

    python rig/custom_rig/build.py
    python rig/custom_rig/build.py --spec rig/out/custom_rig_spec.json

The same spec JSON is consumed by rig/blender/build_custom_rig.py, so the Blender and direct
builders can be compared byte-for-byte at the structural level.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from rig.custom_rig.glb import build_glb  # noqa: E402
from rig.custom_rig.spec import spec  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / 'public/models/custom/custom_rig.glb'))
    ap.add_argument('--spec', default=str(ROOT / 'rig/out/custom_rig_spec.json'))
    ap.add_argument('--no-spec', action='store_true')
    args = ap.parse_args()

    s = spec(include_mesh_data=True)
    out = Path(args.out)
    gltf = build_glb(s, out)

    manifest = {
        'format': s['format'],
        'version': s['version'],
        'generator': s['generator'],
        'file': out.name,
        'bytes': out.stat().st_size,
        'bones': [b['name'] for b in s['bones']],
        'boneCount': len(s['bones']),
        'materials': list(s['materials']),
        'morphNames': s['morph_names'],
        'morphCount': len(s['morph_names']),
        'clips': [{'name': c['name'], 'duration': c['duration'], 'loop': c['loop']} for c in s['clips']],
        'hairParts': s['hair_parts'],
        'license': s['license'],
        'meshCount': len(s.get('meshes', [])),
        'vertexCount': sum(len(m['vertices']) for m in s.get('meshes', [])),
        'triangleCount': sum(len(m['faces']) * 2 for m in s.get('meshes', [])),
    }
    man_path = out.with_suffix('.manifest.json')
    man_path.write_text(json.dumps(manifest, indent=2) + '\n')

    if not args.no_spec:
        sp = Path(args.spec)
        sp.parent.mkdir(parents=True, exist_ok=True)
        sp.write_text(json.dumps(s, separators=(',', ':')))

    print(f'wrote {out} ({out.stat().st_size / 1024 / 1024:.2f} MB)')
    print(f'wrote {man_path}')
    if not args.no_spec:
        print(f'wrote {args.spec} ({Path(args.spec).stat().st_size / 1024 / 1024:.2f} MB)')
    print(f"bones={manifest['boneCount']} morphs={manifest['morphCount']} clips={len(manifest['clips'])} "
          f"meshes={manifest['meshCount']} verts={manifest['vertexCount']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
