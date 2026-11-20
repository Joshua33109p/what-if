#!/usr/bin/env python3
"""Blender automation for the custom rig.

Run with Blender 4.2+ (x64 desktop or a cloud/CI Blender image):

    blender -b --python rig/blender/build_custom_rig.py -- \
        --spec rig/out/custom_rig_spec.json \
        --out public/models/custom/custom_rig_blender.glb

The script reads the same JSON spec as the direct builder. It creates one mesh per part, the
57-joint armature (every edit bone points +Y with roll 0 so rest rotations stay identity),
all facial shape keys, and every action, then exports a GLB with ACTIONS mode.

This path is provided for the cloud/desktop pipeline. The checked-in shipping GLB was produced
by rig/custom_rig/build.py, which uses the identical spec and writes the same glTF structure.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


def srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_rgba(hex_color: str) -> tuple[float, float, float, float]:
    h = hex_color.lstrip('#')
    rgb = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return (*[srgb_to_linear(v) for v in rgb], 1.0)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)


def make_material(name: str, props: dict):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = hex_to_rgba(props.get('color', '#CCCCCC'))
        bsdf.inputs['Roughness'].default_value = float(props.get('roughness', 0.7))
        bsdf.inputs['Metallic'].default_value = float(props.get('metallic', 0.0))
    mat.diffuse_color = hex_to_rgba(props.get('color', '#CCCCCC'))
    return mat


def build_armature(spec: dict):
    arm_data = bpy.data.armatures.new('CustomRigArmature')
    arm = bpy.data.objects.new('CustomRig', arm_data)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')

    bones = spec['bones']
    edit = {}
    for b in bones:
        eb = arm_data.edit_bones.new(b['name'])
        eb.head = Vector(b['rest'])
        # Every bone points +Y with roll 0: matching the identity rest rotations in the GLB.
        eb.tail = eb.head + Vector((0.0, 0.02, 0.0))
        eb.roll = 0.0
        eb.use_connect = False
        edit[b['name']] = eb
    for b in bones:
        if b['parent']:
            edit[b['name']].parent = edit[b['parent']]
    bpy.ops.object.mode_set(mode='OBJECT')
    arm.show_in_front = True
    return arm


def build_mesh(mesh_spec: dict, mats: dict, arm):
    name = mesh_spec['name']
    verts = [tuple(v['p']) for v in mesh_spec['vertices']]
    faces = [tuple(f) for f in mesh_spec['faces']]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()

    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    obj.parent = arm
    obj.matrix_parent_inverse = arm.matrix_world.inverted()

    mat = mats.get(mesh_spec['material'])
    if mat:
        me.materials.append(mat)

    for poly in me.polygons:
        poly.use_smooth = True

    # vertex groups
    groups: dict[str, object] = {}
    for i, v in enumerate(mesh_spec['vertices']):
        for bone, weight in v.get('w', {}).items():
            g = groups.get(bone)
            if g is None:
                g = obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone)
                groups[bone] = g
            g.add([i], float(weight), 'REPLACE')

    # shape keys
    morphs = mesh_spec.get('morphs', {})
    if morphs:
        obj.shape_key_add(name='Basis', from_mix=False)
        for morph_name, deltas in morphs.items():
            kb = obj.shape_key_add(name=morph_name, from_mix=False)
            for i, d in enumerate(deltas):
                kb.data[i].co = Vector(verts[i]) + Vector(d)

    mod = obj.modifiers.new(name='Armature', type='ARMATURE')
    mod.object = arm
    mod.use_vertex_groups = True
    return obj


def build_actions(spec: dict, arm):
    arm.animation_data_create()
    for clip in spec['clips']:
        action = bpy.data.actions.new(clip['name'])
        action.use_fake_user = True
        arm.animation_data.action = action
        fps = spec.get('fps', 30)
        for bone, track in clip.get('rotations', {}).items():
            if bone not in arm.pose.bones:
                continue
            pb = arm.pose.bones[bone]
            pb.rotation_mode = 'QUATERNION'
            for t, q in zip(track['times'], track['values']):
                # glTF stores (x, y, z, w); Blender stores (w, x, y, z)
                pb.rotation_quaternion = Quaternion((q[3], q[0], q[1], q[2]))
                pb.keyframe_insert(data_path='rotation_quaternion', frame=round(t * fps) + 1)
        for bone, track in clip.get('translations', {}).items():
            if bone not in arm.pose.bones:
                continue
            pb = arm.pose.bones[bone]
            for t, v in zip(track['times'], track['values']):
                pb.location = Vector(v)
                pb.keyframe_insert(data_path='location', frame=round(t * fps) + 1)
    # leave the armature on the idle clip
    idle = bpy.data.actions.get('Idle_Loop')
    if idle:
        arm.animation_data.action = idle


def export_glb(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    wanted = dict(
        filepath=str(path),
        export_format='GLB',
        use_selection=False,
        export_apply=False,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_nla_strips=False,
        export_force_sampling=True,
        export_frame_range=False,
        export_anim_slide_to_zero=True,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=True,
        export_rest_position_armature=True,
        export_morph=True,
        export_morph_normal=False,
        export_skins=True,
        export_all_influences=False,
        export_def_bones=False,
        export_yup=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_materials='EXPORT',
    )
    props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    kwargs = {k: v for k, v in wanted.items() if k in props}
    bpy.ops.export_scene.gltf(**kwargs)


def main():
    argv = sys.argv
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        argv = []
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--blend', default='')
    args = ap.parse_args(argv)

    spec = json.loads(Path(args.spec).read_text())
    clear_scene()
    mats = {name: make_material(name, props) for name, props in spec['materials'].items()}
    arm = build_armature(spec)
    for mesh_spec in spec['meshes']:
        build_mesh(mesh_spec, mats, arm)
    build_actions(spec, arm)

    if args.blend:
        bpy.ops.wm.save_as_mainfile(filepath=str(Path(args.blend).resolve()))
    export_glb(Path(args.out))
    print(f'[custom-rig] exported {args.out}')


if __name__ == '__main__':
    main()
