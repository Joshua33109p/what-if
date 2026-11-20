"""Assemble the complete custom-rig spec used by both the direct GLB writer and Blender."""
from __future__ import annotations

import math

from . import animation, body, face
from .geometry import MeshData, Vec3
from .skeleton import BONES, PARENT, REST_POS, bone_tail, validate

# Base colours are authored in sRGB; the GLB writer converts them to linear.
MATERIALS: dict[str, dict] = {
    'CUSTOM_SKIN': {'color': '#E7B98E', 'roughness': 0.62, 'metallic': 0.0, 'role': 'skin'},
    'CUSTOM_SHIRT': {'color': '#F2B33D', 'roughness': 0.78, 'metallic': 0.0, 'role': 'shirt'},
    'CUSTOM_PANTS': {'color': '#2E3440', 'roughness': 0.86, 'metallic': 0.0, 'role': 'pants'},
    'CUSTOM_SHOE': {'color': '#35262B', 'roughness': 0.55, 'metallic': 0.02, 'role': 'shoe'},
    'CUSTOM_SOLE': {'color': '#17131A', 'roughness': 0.90, 'metallic': 0.0, 'role': 'sole'},
    'CUSTOM_BELT': {'color': '#3A2C24', 'roughness': 0.60, 'metallic': 0.05, 'role': 'belt'},
    'CUSTOM_HAIR': {'color': '#241B18', 'roughness': 0.72, 'metallic': 0.0, 'role': 'hair'},
    'CUSTOM_EYE_WHITE': {'color': '#F8F4EE', 'roughness': 0.28, 'metallic': 0.0, 'role': 'eye_white'},
    'CUSTOM_IRIS': {'color': '#5A7A5A', 'roughness': 0.32, 'metallic': 0.0, 'role': 'iris'},
    'CUSTOM_PUPIL': {'color': '#151018', 'roughness': 0.25, 'metallic': 0.0, 'role': 'pupil'},
    'CUSTOM_MOUTH': {'color': '#3A1E22', 'roughness': 0.58, 'metallic': 0.0, 'role': 'mouth'},
    'CUSTOM_TEETH': {'color': '#F7F2E8', 'roughness': 0.35, 'metallic': 0.0, 'role': 'teeth'},
    'CUSTOM_TONGUE': {'color': '#B85C66', 'roughness': 0.55, 'metallic': 0.0, 'role': 'tongue'},
}

# Parts whose visibility is controlled by the reusable character system.
HAIR_PARTS = ['Hair_Short', 'Fringe_Short', 'Hair_Bob', 'Fringe_Bob', 'Hair_Ponytail', 'Ponytail']

BONE_TAILS = {name: bone_tail(name) for name, _, _, _ in BONES}


def _clean_morphs(mesh: MeshData) -> dict[str, list[Vec3]]:
    out: dict[str, list[Vec3]] = {}
    for name, deltas in mesh.morphs.items():
        if any(abs(d[0]) + abs(d[1]) + abs(d[2]) > 1e-6 for d in deltas):
            out[name] = deltas
    return out


def meshes() -> list[MeshData]:
    all_meshes = body.body_meshes() + body.costume_meshes() + face.face_meshes()
    for m in all_meshes:
        for v in m.vertices:
            if not v.weights:
                v.weights = {'Hips': 1.0}
            # normalise and clamp to four influences
            items = sorted(v.weights.items(), key=lambda kv: kv[1], reverse=True)[:4]
            total = sum(w for _, w in items)
            if total <= 1e-9:
                v.weights = {'Hips': 1.0}
            else:
                v.weights = {k: w / total for k, w in items if w / total > 0.0005}
        m.morphs = _clean_morphs(m)
    return all_meshes


def all_morph_names() -> list[str]:
    names: set[str] = set()
    for m in meshes():
        names.update(m.morphs)
    return sorted(names)


def spec(include_mesh_data: bool = True) -> dict:
    errors = validate()
    if errors:
        raise SystemExit('skeleton errors: ' + '; '.join(errors))
    ms = meshes()
    clips = animation.clips()
    out = {
        'format': 'what-if-custom-rig',
        'version': 1,
        'generator': 'rig/custom_rig',
        'fps': animation.FPS,
        'coordinate_system': {'up': 'Y', 'forward': 'Z', 'handedness': 'right'},
        'bones': [
            {
                'name': name,
                'parent': parent,
                'rest': list(REST_POS[name]),
                'tail': list(BONE_TAILS[name]),
            }
            for name, parent, _, _ in BONES
        ],
        'materials': MATERIALS,
        'morph_names': all_morph_names(),
        'hair_parts': HAIR_PARTS,
        'clips': [
            {
                'name': c.name,
                'duration': c.duration,
                'loop': c.loop,
                'rotations': {
                    k: {'times': t.times, 'values': t.values} for k, t in c.rotations.items()
                },
                'translations': {
                    k: {'times': t.times, 'values': t.values} for k, t in c.translations.items()
                },
            }
            for c in clips
        ],
        'license': {
            'name': 'What If Studio Custom Rig',
            'spdx': 'CC0-1.0',
            'note': 'Original procedural character, skeleton, face shapes and animation authored for this studio.',
        },
    }
    if include_mesh_data:
        out['meshes'] = [
            {
                'name': m.name,
                'material': m.material,
                'vertices': [
                    {'p': list(v.pos), 't': v.tag, 'w': v.weights} for v in m.vertices
                ],
                'faces': [list(f) for f in m.faces],
                'morphs': {k: [list(d) for d in v] for k, v in m.morphs.items()},
            }
            for m in ms
        ]
    return out
