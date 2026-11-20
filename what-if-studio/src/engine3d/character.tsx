import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Rigged 3D cast. Models: Quaternius Universal Base Characters + Universal Animation Library,
// CC0 1.0 (see public/licenses). One 65-joint skeleton, 86 named clips, cloned per character.

export type ModelId = 'male' | 'female';
export type FaceExpr = 'neutral' | 'happy' | 'worried' | 'shock' | 'smug' | 'sad' | 'angry';
export type Viseme = 'rest' | 'AA' | 'EE' | 'OH' | 'OO' | 'MM' | 'FV' | 'TH' | 'L' | 'WQ';

export type Look3D = {
  name: string;
  tint: string;
  hair?: string;
  skin?: string;
};

export const LOOKS3D: Record<string, Look3D> = {
  pip: { name: 'PIP', tint: '#F2B33D', hair: '#241B18' },
  pipHood: { name: 'PIP B', tint: '#5A4A3A', hair: '#241B18' },
  mo: { name: 'MO', tint: '#6F8A52', hair: '#2A1C18' },
  sis: { name: 'SIS', tint: '#3E8C86', hair: '#3A2620' },
  mom: { name: 'MUM', tint: '#8A5A6A', hair: '#5A3226' },
  suit: { name: 'THE SUIT', tint: '#2B2F3A', hair: '#17141A' },
};

const MODEL_URL: Record<ModelId, string> = {
  male: 'models/human_male.glb',
  female: 'models/human_female.glb',
};

const CLIP_FALLBACK = 'Idle_Loop';

const loopClip = (name: string) => name.endsWith('_Loop');

export const RIG_SAMPLE = 'models/mpfb/mpfb.glb';

type BoneBase = {
  bone: THREE.Bone;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

type MorphBodyRig = {
  bones: Record<string, BoneBase>;
};

const MORPH_BONES = [
  'Hips',
  'Spine',
  'Spine1',
  'Spine2',
  'Neck',
  'Head',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
] as const;

const buildMorphBodyRig = (root: THREE.Object3D): MorphBodyRig => {
  const bones: Record<string, BoneBase> = {};
  for (const name of MORPH_BONES) {
    const bone = root.getObjectByName(name) as THREE.Bone | undefined;
    if (!bone) continue;
    bones[name] = {
      bone,
      position: bone.position.clone(),
      quaternion: bone.quaternion.clone(),
    };
  }
  return { bones };
};

const resetMorphBody = (rig: MorphBodyRig) => {
  for (const b of Object.values(rig.bones)) {
    b.bone.position.copy(b.position);
    b.bone.quaternion.copy(b.quaternion);
  }
};

const rot = (rig: MorphBodyRig, name: string, x: number, y: number, z: number) => {
  const b = rig.bones[name];
  if (!b) return;
  b.bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
};

// Morph rigs have a Mixamo-compatible skeleton but no animation clips. These original poses are
// deterministic, license-free, and additive over the bind pose.
const applyMorphPose = (rig: MorphBodyRig, clip: string, t: number, lookYaw: number, lookPitch: number) => {
  resetMorphBody(rig);
  const breath = Math.sin(t * 1.6);
  const sway = Math.sin(t * 0.7);
  const isTalk = /talk/i.test(clip);
  const isWalk = /walk/i.test(clip);
  const isRun = /run/i.test(clip);
  const isWave = /wave/i.test(clip);
  const isPoint = /point/i.test(clip);
  const isShrug = /shrug/i.test(clip);
  const isThink = /think/i.test(clip);
  const isPiano = /piano/i.test(clip);
  const isSurgery = /surg|operat/i.test(clip);
  const isThrow = /throw|shoot/i.test(clip);
  const isReach = /reach/i.test(clip);
  const isCollapse = /collapse|slump/i.test(clip);

  rot(rig, 'LeftArm', 0.05, 0, -1.12);
  rot(rig, 'RightArm', 0.05, 0, 1.12);
  rot(rig, 'LeftForeArm', 0.05, 0, -0.18);
  rot(rig, 'RightForeArm', 0.05, 0, 0.18);
  rot(rig, 'LeftHand', 0, 0, -0.05);
  rot(rig, 'RightHand', 0, 0, 0.05);
  rot(rig, 'Spine1', breath * 0.015, 0, 0);
  rot(rig, 'Spine2', breath * 0.02, 0, 0);
  rot(rig, 'Neck', -breath * 0.012, 0, 0);
  rot(rig, 'Head', lookPitch * 0.25 + sway * 0.015, lookYaw * 0.35 + sway * 0.025, 0);

  if (isWalk || isRun) {
    const speed = isRun ? 2.2 : 1.35;
    const phase = t * Math.PI * 2 * speed;
    const amp = isRun ? 0.85 : 0.5;
    rot(rig, 'LeftUpLeg', Math.sin(phase) * amp, 0, 0);
    rot(rig, 'RightUpLeg', -Math.sin(phase) * amp, 0, 0);
    rot(rig, 'LeftLeg', Math.max(0, -Math.sin(phase)) * amp * 1.2, 0, 0);
    rot(rig, 'RightLeg', Math.max(0, Math.sin(phase)) * amp * 1.2, 0, 0);
    rot(rig, 'LeftFoot', -Math.max(0, -Math.sin(phase)) * 0.25, 0, 0);
    rot(rig, 'RightFoot', -Math.max(0, Math.sin(phase)) * 0.25, 0, 0);
    rot(rig, 'LeftArm', -Math.sin(phase) * amp * 0.8, 0, 0);
    rot(rig, 'RightArm', Math.sin(phase) * amp * 0.8, 0, 0);
    rot(rig, 'Hips', 0, Math.sin(phase) * 0.06, 0);
    const hips = rig.bones.Hips;
    if (hips) hips.bone.position.y = hips.position.y + Math.abs(Math.sin(phase)) * (isRun ? 0.06 : 0.03);
  }

  if (isTalk) {
    const g = Math.sin(t * 3.1);
    rot(rig, 'RightArm', -0.55, 0.1, 0.95);
    rot(rig, 'RightForeArm', -0.35, 0.1, 1.15 + g * 0.12);
    rot(rig, 'RightHand', 0.1, g * 0.2, 0.15);
    rot(rig, 'LeftArm', -0.1, 0, -1.05);
    rot(rig, 'LeftForeArm', 0.1, 0, -0.35);
    rot(rig, 'Head', lookPitch * 0.25 + g * 0.02, lookYaw * 0.35 + g * 0.03, 0);
  }

  if (isWave) {
    rot(rig, 'RightArm', 0, 0, -2.05);
    rot(rig, 'RightForeArm', 0, 0, -0.25);
    rot(rig, 'RightHand', 0, 0, Math.sin(t * 9) * 0.35);
  }

  if (isPoint) {
    rot(rig, 'RightArm', -1.15, 0.2, 0.35);
    rot(rig, 'RightForeArm', -0.1, 0, 0.1);
    rot(rig, 'Head', lookPitch * 0.25, lookYaw * 0.35 + 0.12, 0);
  }

  if (isShrug) {
    rot(rig, 'LeftShoulder', 0, 0, 0.18);
    rot(rig, 'RightShoulder', 0, 0, -0.18);
    rot(rig, 'LeftArm', 0, 0, -0.95);
    rot(rig, 'RightArm', 0, 0, 0.95);
    rot(rig, 'LeftForeArm', 0, 0, -0.55);
    rot(rig, 'RightForeArm', 0, 0, 0.55);
  }

  if (isThink) {
    rot(rig, 'RightArm', -0.45, 0.15, 1.15);
    rot(rig, 'RightForeArm', -0.85, 0.1, 1.55);
    rot(rig, 'RightHand', 0, 0, 0.2);
    rot(rig, 'Head', lookPitch * 0.25 + 0.08, lookYaw * 0.35 - 0.08, 0);
  }

  if (isPiano) {
    rot(rig, 'Spine1', 0.08, 0, 0);
    rot(rig, 'Spine2', 0.05, 0, 0);
    rot(rig, 'Neck', 0.08, 0, 0);
    rot(rig, 'Head', 0.1, 0, 0);
    rot(rig, 'LeftArm', -1.0, 0.1, 0.35);
    rot(rig, 'RightArm', -1.0, -0.1, -0.35);
    rot(rig, 'LeftForeArm', -0.55, 0, -0.2);
    rot(rig, 'RightForeArm', -0.55, 0, 0.2);
    rot(rig, 'LeftHand', 0.15, 0, -0.1);
    rot(rig, 'RightHand', 0.15, 0, 0.1);
  }

  if (isSurgery) {
    rot(rig, 'Spine1', 0.12, 0, 0);
    rot(rig, 'Neck', 0.12, 0, 0);
    rot(rig, 'Head', 0.18, 0, 0);
    rot(rig, 'LeftArm', -0.75, 0.15, 0.25);
    rot(rig, 'RightArm', -0.75, -0.15, -0.25);
    rot(rig, 'LeftForeArm', -0.45, 0, -0.15);
    rot(rig, 'RightForeArm', -0.45, 0, 0.15);
  }

  if (isThrow) {
    rot(rig, 'Spine1', -0.05, 0.15, 0);
    rot(rig, 'Spine2', 0, 0.2, 0);
    rot(rig, 'RightArm', -0.4, 0, 0.9);
    rot(rig, 'RightForeArm', -0.3, 0, 0.2);
    rot(rig, 'LeftArm', -1.0, -0.1, -0.35);
    rot(rig, 'LeftForeArm', -0.5, 0, -0.2);
    rot(rig, 'LeftUpLeg', -0.18, 0, 0);
    rot(rig, 'RightUpLeg', 0.18, 0, 0);
    rot(rig, 'LeftLeg', 0.25, 0, 0);
    rot(rig, 'RightLeg', 0.25, 0, 0);
    rot(rig, 'Head', 0.05, 0, 0);
  }

  if (isReach) {
    rot(rig, 'Spine1', 0.1, 0, 0);
    rot(rig, 'RightArm', -1.35, 0.1, 0.15);
    rot(rig, 'RightForeArm', -0.15, 0, 0.1);
    rot(rig, 'LeftArm', -0.15, 0, 0);
    rot(rig, 'Head', 0.08, 0, 0);
  }

  if (isCollapse) {
    rot(rig, 'Spine1', 0.35, 0, 0);
    rot(rig, 'Spine2', 0.25, 0, 0);
    rot(rig, 'Neck', 0.3, 0, 0);
    rot(rig, 'Head', 0.35, 0, 0);
    rot(rig, 'LeftArm', 0.2, 0, 0.2);
    rot(rig, 'RightArm', 0.2, 0, -0.2);
    rot(rig, 'LeftForeArm', 0.2, 0, 0);
    rot(rig, 'RightForeArm', 0.2, 0, 0);
  }
};

type MorphMesh = {
  mesh: THREE.Mesh;
  map: Record<string, number>;
  influences: number[];
};

type MorphFaceRig = {
  meshes: MorphMesh[];
};

const normalizeMorph = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const buildMorphFaceRig = (root: THREE.Object3D): MorphFaceRig => {
  const meshes: MorphMesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.morphTargetDictionary || !m.morphTargetInfluences) return;
    const map: Record<string, number> = {};
    for (const [name, index] of Object.entries(m.morphTargetDictionary)) {
      map[normalizeMorph(name)] = index;
    }
    meshes.push({ mesh: m, map, influences: m.morphTargetInfluences });
  });
  return { meshes };
};

const setMorph = (rig: MorphFaceRig, names: string[], value: number): boolean => {
  let used = false;
  for (const m of rig.meshes) {
    for (const name of names) {
      const index = m.map[normalizeMorph(name)];
      if (index !== undefined) {
        m.influences[index] = Math.max(0, Math.min(1, value));
        used = true;
      }
    }
  }
  return used;
};

const VISEME_MORPHS: Record<Viseme, string[]> = {
  rest: ['viseme_sil', 'visemeSil', 'sil'],
  AA: ['viseme_aa', 'visemeAA', 'aa'],
  EE: ['viseme_E', 'viseme_ee', 'visemeEE', 'E', 'ee'],
  OH: ['viseme_O', 'viseme_oh', 'visemeOH', 'O', 'oh'],
  OO: ['viseme_U', 'viseme_ou', 'visemeOO', 'U', 'ou'],
  MM: ['viseme_PP', 'viseme_mm', 'visemeMM', 'PP', 'mm'],
  FV: ['viseme_FF', 'viseme_fv', 'visemeFV', 'FF', 'fv'],
  TH: ['viseme_TH', 'viseme_th', 'visemeTH', 'TH', 'th'],
  L: ['viseme_nn', 'viseme_l', 'visemeL', 'nn', 'l'],
  WQ: ['viseme_U', 'viseme_wq', 'visemeWQ', 'wq'],
};

const EXPR_MORPHS: Record<FaceExpr, string[][]> = {
  happy: [['mouthSmileLeft', 'mouthSmile_L'], ['mouthSmileRight', 'mouthSmile_R'], ['cheekSquintLeft'], ['cheekSquintRight']],
  worried: [['browInnerUp'], ['mouthFrownLeft'], ['mouthFrownRight']],
  shock: [['jawOpen'], ['browInnerUp'], ['eyeWideLeft'], ['eyeWideRight']],
  smug: [['mouthSmileLeft'], ['browDownRight']],
  sad: [['browInnerUp'], ['mouthFrownLeft'], ['mouthFrownRight']],
  angry: [['browDownLeft'], ['browDownRight'], ['mouthPressLeft'], ['mouthPressRight']],
  neutral: [],
};

const applyMorphFace = (
  rig: MorphFaceRig,
  expr: FaceExpr,
  blink: number,
  viseme: Viseme,
  lookYaw: number,
  lookPitch: number,
  mouthScale: number,
) => {
  if (!rig.meshes.length) return;
  for (const m of rig.meshes) m.influences.fill(0);

  const b = Math.max(0, Math.min(1, blink));
  setMorph(rig, ['eyeBlinkLeft', 'eyeBlink_L'], b);
  setMorph(rig, ['eyeBlinkRight', 'eyeBlink_R'], b);

  const v = Math.max(0, Math.min(1, mouthScale));
  const usedViseme = setMorph(rig, VISEME_MORPHS[viseme], v);
  if (!usedViseme) {
    switch (viseme) {
      case 'AA':
        setMorph(rig, ['jawOpen'], 0.65 * v);
        setMorph(rig, ['mouthStretchLeft', 'mouthStretch_L'], 0.2 * v);
        setMorph(rig, ['mouthStretchRight', 'mouthStretch_R'], 0.2 * v);
        break;
      case 'EE':
        setMorph(rig, ['jawOpen'], 0.22 * v);
        setMorph(rig, ['mouthSmileLeft', 'mouthSmile_L'], 0.3 * v);
        setMorph(rig, ['mouthSmileRight', 'mouthSmile_R'], 0.3 * v);
        break;
      case 'OH':
        setMorph(rig, ['jawOpen'], 0.5 * v);
        setMorph(rig, ['mouthFunnel'], 0.45 * v);
        break;
      case 'OO':
        setMorph(rig, ['jawOpen'], 0.18 * v);
        setMorph(rig, ['mouthPucker'], 0.65 * v);
        break;
      case 'MM':
        setMorph(rig, ['mouthClose'], 0.75 * v);
        setMorph(rig, ['mouthPressLeft', 'mouthPress_L'], 0.4 * v);
        setMorph(rig, ['mouthPressRight', 'mouthPress_R'], 0.4 * v);
        break;
      case 'FV':
        setMorph(rig, ['mouthClose'], 0.25 * v);
        setMorph(rig, ['mouthUpperUpLeft', 'mouthUpperUp_L'], 0.3 * v);
        setMorph(rig, ['mouthUpperUpRight', 'mouthUpperUp_R'], 0.3 * v);
        break;
      case 'TH':
        setMorph(rig, ['jawOpen'], 0.28 * v);
        setMorph(rig, ['tongueOut'], 0.3 * v);
        break;
      case 'L':
        setMorph(rig, ['jawOpen'], 0.28 * v);
        setMorph(rig, ['tongueOut'], 0.2 * v);
        break;
      case 'WQ':
        setMorph(rig, ['mouthPucker'], 0.55 * v);
        setMorph(rig, ['mouthFunnel'], 0.25 * v);
        break;
      default:
        break;
    }
  }

  for (const names of EXPR_MORPHS[expr]) setMorph(rig, names, 0.45);

  if (lookYaw !== 0) {
    const yaw = Math.max(-1, Math.min(1, lookYaw));
    setMorph(rig, ['eyeLookInLeft', 'eyeLookIn_L'], Math.max(0, -yaw) * 0.7);
    setMorph(rig, ['eyeLookOutLeft', 'eyeLookOut_L'], Math.max(0, yaw) * 0.7);
    setMorph(rig, ['eyeLookInRight', 'eyeLookIn_R'], Math.max(0, yaw) * 0.7);
    setMorph(rig, ['eyeLookOutRight', 'eyeLookOut_R'], Math.max(0, -yaw) * 0.7);
  }
  if (lookPitch !== 0) {
    const pitch = Math.max(-1, Math.min(1, lookPitch));
    setMorph(rig, ['eyeLookUpLeft'], Math.max(0, pitch) * 0.7);
    setMorph(rig, ['eyeLookUpRight'], Math.max(0, pitch) * 0.7);
    setMorph(rig, ['eyeLookDownLeft'], Math.max(0, -pitch) * 0.7);
    setMorph(rig, ['eyeLookDownRight'], Math.max(0, -pitch) * 0.7);
  }
};

type FaceGeom = {
  mouth: [number, number, number];
  eyeL: [number, number, number];
  eyeR: [number, number, number];
  lidScale: [number, number, number];
  mouthBase: [number, number, number];
};

// Bind-pose face landmarks measured from the GLBs (world units, character at origin).
const FACE_GEOM: Record<ModelId, FaceGeom> = {
  male: {
    mouth: [0, 1.652, 0.105],
    eyeL: [-0.0245, 1.6986, 0.084],
    eyeR: [0.0245, 1.6986, 0.084],
    lidScale: [0.014, 0.0065, 0.009],
    mouthBase: [0.035, 0.012, 0.012],
  },
  female: {
    mouth: [0, 1.61, 0.103],
    eyeL: [-0.0255, 1.656, 0.079],
    eyeR: [0.0255, 1.656, 0.079],
    lidScale: [0.013, 0.006, 0.0085],
    mouthBase: [0.032, 0.011, 0.011],
  },
};

type FaceRig = {
  head: THREE.Object3D | null;
  eyes: THREE.Object3D | null;
  brows: THREE.Object3D | null;
  mouth: THREE.Mesh;
  lidL: THREE.Mesh;
  lidR: THREE.Mesh;
  baseBrowY: number;
  mouthBaseY: number;
  geom: FaceGeom;
};

const makeMat = (color: string, roughness = 0.65) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });

/** Build a small procedural mouth/eyelid rig on the head bone. The base models have no blendshapes. */
const buildFaceRig = (root: THREE.Object3D, look: Look3D, model: ModelId): FaceRig => {
  const head = root.getObjectByName('Head') ?? null;
  const eyes = root.getObjectByName('Eyes') ?? null;
  let brows: THREE.Object3D | null = root.getObjectByName('Eyebrows') ?? null;

  // The male base calls its eyebrow mesh "Face"; find it by the hair material instead.
  if (!brows) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (mat?.name?.startsWith('MI_Hair') && !brows) brows = m;
    });
  }

  const geom = FACE_GEOM[model];
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), makeMat('#3A1E22', 0.45));
  mouth.scale.set(...geom.mouthBase);
  mouth.renderOrder = 3;

  const lidMat = makeMat(look.skin ?? '#E7C6A8', 0.7);
  const lidL = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), lidMat);
  const lidR = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), lidMat);
  lidL.scale.set(...geom.lidScale);
  lidR.scale.set(...geom.lidScale);
  lidL.visible = false;
  lidR.visible = false;

  if (head) {
    head.add(mouth, lidL, lidR);
  } else {
    root.add(mouth, lidL, lidR);
  }

  return {
    head,
    eyes,
    brows,
    mouth,
    lidL,
    lidR,
    baseBrowY: brows ? brows.position.y : 0,
    mouthBaseY: 0,
    geom,
  };
};

const placeFaceRig = (root: THREE.Object3D, rig: FaceRig) => {
  const head = rig.head;
  if (!head) return;
  root.updateMatrixWorld(true);
  // Landmarks are in the character's own bind-pose space. Convert through the root so a moved
  // or rotated <group> does not shift the face rig into world space.
  const toLocal = (p: [number, number, number]) => {
    const world = root.localToWorld(new THREE.Vector3(...p));
    return head.worldToLocal(world);
  };
  rig.mouth.position.copy(toLocal(rig.geom.mouth));
  rig.lidL.position.copy(toLocal(rig.geom.eyeL));
  rig.lidR.position.copy(toLocal(rig.geom.eyeR));
  rig.mouthBaseY = rig.mouth.position.y;
};

const visemeShape: Record<Viseme, [number, number, number, number]> = {
  // width, height, depth, jaw drop (model units)
  rest: [1, 1, 1, 0],
  AA: [1.15, 1.55, 1.1, 0.008],
  EE: [1.5, 0.55, 1, 0.002],
  OH: [0.72, 1.2, 1.1, 0.006],
  OO: [0.52, 0.85, 1.1, 0.004],
  MM: [1.0, 0.18, 1, 0],
  FV: [0.95, 0.32, 1, 0.001],
  TH: [1.1, 0.4, 1, 0.002],
  L: [1.0, 0.62, 1, 0.003],
  WQ: [0.62, 0.72, 1.05, 0.004],
};

const exprBrow = (expr: FaceExpr): { y: number; rot: number } => {
  switch (expr) {
    case 'happy':
      return { y: 0.006, rot: 0.02 };
    case 'worried':
      return { y: 0.004, rot: -0.16 };
    case 'shock':
      return { y: 0.012, rot: 0 };
    case 'smug':
      return { y: 0.002, rot: 0.12 };
    case 'sad':
      return { y: -0.004, rot: -0.2 };
    case 'angry':
      return { y: -0.006, rot: 0.22 };
    default:
      return { y: 0, rot: 0 };
  }
};

export type CharacterProps = {
  model: ModelId;
  look: Look3D;
  src?: string;
  clip?: string;
  clipTime?: number;
  speed?: number;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  expr?: FaceExpr;
  blink?: number;
  viseme?: Viseme;
  lookYaw?: number;
  lookPitch?: number;
  mouthScale?: number;
  debugColor?: string;
};

/**
 * One rigged character. Animation is deterministic: the clip is sampled at `clipTime` (or the
 * composition's current time), then the procedural face rig is applied on top.
 */
export const Character: React.FC<CharacterProps> = ({
  model,
  look,
  src,
  clip = CLIP_FALLBACK,
  clipTime,
  speed = 1,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  expr = 'neutral',
  blink = 0,
  viseme = 'rest',
  lookYaw = 0,
  lookPitch = 0,
  mouthScale = 1,
  debugColor,
}) => {
  const gltf = useLoader(GLTFLoader, staticFile(src ?? MODEL_URL[model]));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const group = useRef<THREE.Group>(null);

  const clonedData = useMemo(() => {
    const c = cloneSkeleton(gltf.scene);
    const morphRig = !!c.getObjectByName('Hips') && !c.getObjectByName('spine_01');
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      if (debugColor) {
        mesh.material = new THREE.MeshBasicMaterial({ color: debugColor });
        return;
      }
      if (morphRig) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const clonedMats = mats.map((m) => {
        const cm = m.clone() as THREE.MeshStandardMaterial;
        const name = cm.name ?? '';
        if (name.includes('Superhero')) {
          cm.color = new THREE.Color(look.tint);
          cm.roughness = 0.72;
          cm.metalness = 0.03;
        } else if (name.startsWith('MI_Hair') && look.hair) {
          cm.color = new THREE.Color(look.hair);
        }
        return cm;
      });
      mesh.material = Array.isArray(mesh.material) ? clonedMats : clonedMats[0];
    });
    return { scene: c, morphRig };
  }, [gltf.scene, look.tint, look.hair, debugColor]);

  const cloned = clonedData.scene;
  const isMorphRig = clonedData.morphRig;

  const rig = useMemo(
    () => (isMorphRig ? null : buildFaceRig(cloned, look, model)),
    [cloned, isMorphRig, look, model],
  );
  const morphBody = useMemo(
    () => (isMorphRig ? buildMorphBodyRig(cloned) : null),
    [cloned, isMorphRig],
  );
  const morphFace = useMemo(
    () => (isMorphRig ? buildMorphFaceRig(cloned) : null),
    [cloned, isMorphRig],
  );

  const mixer = useMemo(
    () => (isMorphRig ? null : new THREE.AnimationMixer(cloned)),
    [cloned, isMorphRig],
  );

  const action = useMemo(() => {
    if (isMorphRig || !mixer) return null;
    const found =
      gltf.animations.find((a) => a.name === clip) ??
      gltf.animations.find((a) => a.name === CLIP_FALLBACK) ??
      gltf.animations[0];
    if (!found) return null;
    const a = mixer.clipAction(found);
    a.enabled = true;
    a.setLoop(loopClip(found.name) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = !loopClip(found.name);
    return a;
  }, [isMorphRig, mixer, gltf.animations, clip]);

  useLayoutEffect(() => {
    if (!action || !mixer) return;
    action.reset().play();
    return () => {
      action.stop();
      mixer.uncacheAction(action.getClip());
    };
  }, [action, mixer]);

  const placedFor = useRef<THREE.Object3D | null>(null);

  useLayoutEffect(() => {
    const t = clipTime ?? (frame / fps) * speed;

    if (isMorphRig) {
      if (morphBody) applyMorphPose(morphBody, clip, t, lookYaw, lookPitch);
      if (morphFace) applyMorphFace(morphFace, expr, blink, viseme, lookYaw, lookPitch, mouthScale);
      return;
    }

    if (!action || !mixer || !rig) return;
    mixer.setTime(t);
    if (placedFor.current !== cloned) {
      placeFaceRig(cloned, rig);
      placedFor.current = cloned;
    }

    // Procedural additive acting on top of the sampled clip.
    if (rig.head) {
      rig.head.rotation.y += lookYaw * 0.35;
      rig.head.rotation.x += lookPitch * 0.25;
    }
    if (rig.brows) {
      const b = exprBrow(expr);
      rig.brows.position.y = rig.baseBrowY + b.y;
      rig.brows.rotation.z = b.rot;
    }

    const closed = blink > 0.5;
    if (rig.eyes) rig.eyes.visible = !closed;
    rig.lidL.visible = closed;
    rig.lidR.visible = closed;

    const shape = visemeShape[viseme];
    const base = rig.geom.mouthBase;
    rig.mouth.scale.set(base[0] * shape[0] * mouthScale, base[1] * shape[1] * mouthScale, base[2] * shape[2]);
    rig.mouth.position.y = rig.mouthBaseY + shape[3];
  }, [
    frame,
    fps,
    action,
    mixer,
    clipTime,
    speed,
    lookYaw,
    lookPitch,
    expr,
    blink,
    viseme,
    mouthScale,
    cloned,
    rig,
    isMorphRig,
    morphBody,
    morphFace,
    clip,
  ]);

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
};
