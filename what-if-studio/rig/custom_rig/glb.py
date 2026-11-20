"""Minimal, dependency-free glTF 2.0 binary writer for the custom rig."""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

import numpy as np

from .geometry import MeshData, vadd, vcross, vnorm, vsub

COMPONENT = {
    'FLOAT': 5126,
    'UNSIGNED_SHORT': 5123,
    'UNSIGNED_INT': 5125,
}
TYPE_SIZE = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear(hex_color: str) -> list[float]:
    h = hex_color.lstrip('#')
    rgb = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return [srgb_to_linear(v) for v in rgb] + [1.0]


class GlbBuilder:
    def __init__(self):
        self.blob = bytearray()
        self.buffer_views: list[dict] = []
        self.accessors: list[dict] = []
        self.meshes: list[dict] = []
        self.nodes: list[dict] = []
        self.materials: list[dict] = []
        self.animations: list[dict] = []
        self.skins: list[dict] = []
        self.material_index: dict[str, int] = {}

    def _align(self) -> None:
        while len(self.blob) % 4:
            self.blob.append(0)

    def add_view(self, data: bytes, target: int | None = None) -> int:
        self._align()
        offset = len(self.blob)
        self.blob.extend(data)
        view = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(data)}
        if target is not None:
            view['target'] = target
        self.buffer_views.append(view)
        return len(self.buffer_views) - 1

    def add_accessor(
        self,
        array,
        component: str,
        type_: str,
        target: int = 34962,
        minmax: bool = False,
        normalized: bool = False,
    ) -> int:
        arr = np.asarray(array)
        if component == 'FLOAT':
            arr = arr.astype(np.float32)
        elif component == 'UNSIGNED_SHORT':
            arr = arr.astype(np.uint16)
        elif component == 'UNSIGNED_INT':
            arr = arr.astype(np.uint32)
        item = TYPE_SIZE[type_]
        if arr.ndim == 1 and item > 1:
            arr = arr.reshape(-1, item)
        if arr.size % item:
            raise ValueError(f'accessor {type_} needs a multiple of {item} values, got {arr.size}')
        count = arr.size // item
        raw = arr.tobytes(order='C')
        view = self.add_view(raw, target)
        acc = {
            'bufferView': view,
            'componentType': COMPONENT[component],
            'count': int(count),
            'type': type_,
        }
        if minmax:
            if arr.ndim == 1:
                acc['min'] = [float(arr.min())]
                acc['max'] = [float(arr.max())]
            else:
                acc['min'] = [float(v) for v in arr.min(axis=0)]
                acc['max'] = [float(v) for v in arr.max(axis=0)]
        if normalized:
            acc['normalized'] = True
        self.accessors.append(acc)
        return len(self.accessors) - 1

    def material(self, name: str, props: dict) -> int:
        if name in self.material_index:
            return self.material_index[name]
        color = props.get('color', '#CCCCCC')
        mat = {
            'name': name,
            'doubleSided': True,
            'pbrMetallicRoughness': {
                'baseColorFactor': hex_to_linear(color),
                'metallicFactor': float(props.get('metallic', 0.0)),
                'roughnessFactor': float(props.get('roughness', 0.7)),
            },
            'extras': {'role': props.get('role', 'generic')},
        }
        self.material_index[name] = len(self.materials)
        self.materials.append(mat)
        return self.material_index[name]

    def add_bone_nodes(self, bones: list[dict]) -> tuple[int, dict[str, int]]:
        name_to_index: dict[str, int] = {}
        for b in bones:
            name_to_index[b['name']] = len(self.nodes)
            self.nodes.append({'name': b['name']})
        for b in bones:
            node = self.nodes[name_to_index[b['name']]]
            parent = b['parent']
            if parent is None:
                node['translation'] = [float(v) for v in b['rest']]
            else:
                p = next(x for x in bones if x['name'] == parent)
                node['translation'] = [float(b['rest'][i] - p['rest'][i]) for i in range(3)]
        for b in bones:
            parent = b['parent']
            if parent is not None:
                pidx = name_to_index[parent]
                self.nodes[pidx].setdefault('children', []).append(name_to_index[b['name']])
        return name_to_index['Root'], name_to_index

    def add_skin(self, bones: list[dict], name_to_index: dict[str, int]) -> int:
        inverse = []
        for b in bones:
            x, y, z = b['rest']
            inverse.extend([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1])
        acc = self.add_accessor(np.array(inverse, dtype=np.float64), 'FLOAT', 'MAT4', target=None)
        self.skins.append({
            'name': 'CustomRig',
            'inverseBindMatrices': acc,
            'skeleton': name_to_index['Root'],
            'joints': [name_to_index[b['name']] for b in bones],
        })
        return len(self.skins) - 1

    def add_mesh(self, mesh: MeshData, bone_indices: dict[str, int], skin: int, material_idx: int) -> int:
        verts = mesh.vertices
        pos = np.array([v.pos for v in verts], dtype=np.float32)
        normals = np.array(mesh.compute_normals(), dtype=np.float32)
        tris = mesh.tri_faces()
        indices = np.array([i for t in tris for i in t], dtype=np.uint32)

        joints = np.zeros((len(verts), 4), dtype=np.uint16)
        weights = np.zeros((len(verts), 4), dtype=np.float32)
        for i, v in enumerate(verts):
            items = sorted(v.weights.items(), key=lambda kv: kv[1], reverse=True)[:4]
            for j, (bone, w) in enumerate(items):
                joints[i, j] = bone_indices.get(bone, bone_indices['Hips'])
                weights[i, j] = float(w)
            s = weights[i].sum()
            if s > 0:
                weights[i] /= s

        attrs = {
            'POSITION': self.add_accessor(pos, 'FLOAT', 'VEC3', minmax=True),
            'NORMAL': self.add_accessor(normals, 'FLOAT', 'VEC3'),
            'JOINTS_0': self.add_accessor(joints, 'UNSIGNED_SHORT', 'VEC4'),
            'WEIGHTS_0': self.add_accessor(weights, 'FLOAT', 'VEC4'),
        }
        idx_acc = self.add_accessor(indices, 'UNSIGNED_INT', 'SCALAR', target=34963)

        targets = []
        target_names = []
        for morph_name, deltas in mesh.morphs.items():
            d = np.asarray(deltas, dtype=np.float32)
            acc = self.add_accessor(d, 'FLOAT', 'VEC3')
            targets.append({'POSITION': acc})
            target_names.append(morph_name)

        prim = {
            'attributes': attrs,
            'indices': idx_acc,
            'material': material_idx,
            'mode': 4,
        }
        if targets:
            prim['targets'] = targets
        mesh_def = {
            'name': mesh.name,
            'primitives': [prim],
            'extras': {'targetNames': target_names} if target_names else {},
        }
        self.meshes.append(mesh_def)
        return len(self.meshes) - 1

    def add_animation(self, clip: dict, name_to_index: dict[str, int], rest_local: dict[str, tuple[float, float, float]]) -> None:
        samplers = []
        channels = []
        for bone, track in clip['rotations'].items():
            if bone not in name_to_index:
                continue
            inp = self.add_accessor(np.array(track['times'], dtype=np.float64), 'FLOAT', 'SCALAR', target=None, minmax=True)
            out = self.add_accessor(np.array(track['values'], dtype=np.float64), 'FLOAT', 'VEC4', target=None)
            samplers.append({'input': inp, 'output': out, 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': name_to_index[bone], 'path': 'rotation'}})
        for bone, track in clip['translations'].items():
            if bone not in name_to_index:
                continue
            rest = rest_local.get(bone, (0.0, 0.0, 0.0))
            values = [(v[0] + rest[0], v[1] + rest[1], v[2] + rest[2]) for v in track['values']]
            inp = self.add_accessor(np.array(track['times'], dtype=np.float64), 'FLOAT', 'SCALAR', target=None, minmax=True)
            out = self.add_accessor(np.array(values, dtype=np.float64), 'FLOAT', 'VEC3', target=None)
            samplers.append({'input': inp, 'output': out, 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': name_to_index[bone], 'path': 'translation'}})
        if not channels:
            return
        self.animations.append({
            'name': clip['name'],
            'samplers': samplers,
            'channels': channels,
            'extras': {'loop': bool(clip.get('loop', False)), 'duration': clip.get('duration')},
        })

    def finish(self, root_node: int, scene_nodes: list[int], extras: dict) -> dict:
        gltf = {
            'asset': {
                'version': '2.0',
                'generator': 'what-if-studio custom rig builder',
                'extras': extras,
            },
            'scene': 0,
            'scenes': [{'nodes': scene_nodes, 'name': 'CustomRigScene'}],
            'nodes': self.nodes,
            'meshes': self.meshes,
            'materials': self.materials,
            'skins': self.skins,
            'animations': self.animations,
            'accessors': self.accessors,
            'bufferViews': self.buffer_views,
            'buffers': [{'byteLength': len(self.blob)}],
        }
        return gltf


def write_glb(path: str | Path, gltf: dict, blob: bytes) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    js = json.dumps(gltf, separators=(',', ':'), allow_nan=False).encode('utf-8')
    while len(js) % 4:
        js += b' '
    while len(blob) % 4:
        blob += b'\x00'
    total = 12 + 8 + len(js) + 8 + len(blob)
    out = bytearray()
    out.extend(struct.pack('<III', 0x46546C67, 2, total))
    out.extend(struct.pack('<II', len(js), 0x4E4F534A))
    out.extend(js)
    out.extend(struct.pack('<II', len(blob), 0x004E4942))
    out.extend(blob)
    path.write_bytes(out)


def build_glb(spec: dict, out_path: str | Path) -> dict:
    b = GlbBuilder()
    root, name_to_index = b.add_bone_nodes(spec['bones'])
    skin = b.add_skin(spec['bones'], name_to_index)

    material_ids: dict[str, int] = {}
    for name, props in spec['materials'].items():
        material_ids[name] = b.material(name, props)

    scene_nodes = [root]
    for mesh_def in spec.get('meshes', []):
        material_idx = material_ids.get(mesh_def['material'])
        if material_idx is None:
            material_idx = b.material(mesh_def['material'], {'color': '#CCCCCC'})
        # reconstruct a MeshData-compatible object
        md = MeshData(mesh_def['name'], mesh_def['material'])
        for v in mesh_def['vertices']:
            md.add_vertex(tuple(v['p']), v.get('t', 'body'), v.get('w', {'Hips': 1.0}))
        md.faces = [tuple(f) for f in mesh_def['faces']]
        md.morphs = {k: [tuple(d) for d in v] for k, v in mesh_def.get('morphs', {}).items()}
        mi = b.add_mesh(md, name_to_index, skin, material_idx)
        node_idx = len(b.nodes)
        b.nodes.append({
            'name': mesh_def['name'],
            'mesh': mi,
            'skin': skin,
            'translation': [0.0, 0.0, 0.0],
        })
        scene_nodes.append(node_idx)

    rest_by_name = {bone['name']: bone['rest'] for bone in spec['bones']}
    parent_by_name = {bone['name']: bone['parent'] for bone in spec['bones']}
    rest_local = {}
    for bone in spec['bones']:
        parent_name = parent_by_name.get(bone['name'])
        parent_rest = rest_by_name[parent_name] if parent_name else (0.0, 0.0, 0.0)
        rest_local[bone['name']] = tuple(bone['rest'][i] - parent_rest[i] for i in range(3))
    for clip in spec.get('clips', []):
        b.add_animation(clip, name_to_index, rest_local)

    extras = {
        'license': spec.get('license'),
        'morphNames': spec.get('morph_names'),
        'hairParts': spec.get('hair_parts'),
        'rigVersion': spec.get('version'),
    }
    gltf = b.finish(root, scene_nodes, extras)
    write_glb(out_path, gltf, bytes(b.blob))
    return gltf
