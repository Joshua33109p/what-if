import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { FaceExpr } from './character';
import {
  autoBlink,
  CustomViseme,
  sampleVisemeWeights,
  VISEME_MORPH,
  VisemeTimeline,
} from './lipsync';

// Ara 3D Gen export: 69 Mixamo-named bones, 34 ARKit/viseme morphs, selected clips.
// Character assets are CC0 MakeHuman data; see public/models/ara/.
export const ARA_RIG_URL = 'models/ara/ara-pip.glb';

export type AraLook = {
  name?: string;
  tint?: string;
  skin?: string;
  shirt?: string;
  hair?: string;
  shoe?: string;
};

export type AraCharacterProps = {
  src?: string;
  look?: AraLook;
  clip?: string;
  clipTime?: number;
  speed?: number;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  expr?: FaceExpr;
  blink?: number | 'auto';
  viseme?: CustomViseme;
  visemeTimeline?: VisemeTimeline;
  lookYaw?: number;
  lookPitch?: number;
  mouthScale?: number;
  debugColor?: string;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const MATERIAL_ROLE: Record<string, string> = {
  Skin: 'skin',
  'Skin details': 'skin',
  Eyes: 'eye',
  Eyebrows: 'hair',
  Eyelashes: 'hair',
  Hair: 'hair',
  Outfit: 'shirt',
  Shoes: 'shoe',
  Teeth: 'teeth',
  Tongue: 'tongue',
};

const EXPR_MORPHS: Record<FaceExpr, [string, number][]> = {
  neutral: [],
  happy: [['mouthSmile', 0.7], ['eyeSquintLeft', 0.3], ['eyeSquintRight', 0.3]],
  worried: [['browInnerUp', 0.55], ['mouthFrown', 0.5]],
  shock: [['jawOpen', 0.55], ['browInnerUp', 0.55], ['eyeWideLeft', 0.7], ['eyeWideRight', 0.7]],
  smug: [['mouthSmile', 0.4], ['browDownLeft', 0.25]],
  sad: [['mouthFrown', 0.6], ['browInnerUp', 0.45]],
  angry: [['browDownLeft', 0.65], ['browDownRight', 0.65], ['noseSneerLeft', 0.3], ['noseSneerRight', 0.3], ['mouthPress', 0.35]],
};

const LOOPING = new Set([
  'Idle',
  'Talk',
  'Talk with gestures',
  'Walk',
  'Run',
  'Wave',
  'Look around',
  'Phone call',
  'Texting',
  'Cheer',
  'Laugh',
  'Clap',
  'Sit idle (chair)',
  'Punch combo (jab, cross, hook)',
]);

const CLIP_ALIASES: Record<string, string> = {
  idle: 'Idle',
  idletalking: 'Talk',
  talk: 'Talk',
  talking: 'Talk with gestures',
  walk: 'Walk',
  run: 'Run',
  wave: 'Wave',
  point: 'Point',
  shrug: 'Talk with gestures',
  think: 'Look around',
  lookaround: 'Look around',
  reach: 'Open door',
  open: 'Open door',
  opendoor: 'Open door',
  throw: 'Throw grenade',
  piano: 'Use / press',
  surgery: 'Use / press',
  operate: 'Use / press',
  interact: 'Use / press',
  usepress: 'Use / press',
  collapse: 'Knockdown',
  fall: 'Fall',
  nod: 'Idle',
  shake: 'Idle',
  cheer: 'Cheer',
  laugh: 'Laugh',
  clap: 'Clap',
  thumbsup: 'Thumbs up',
  bow: 'Bow',
  phone: 'Phone call',
  phonecall: 'Phone call',
  texting: 'Texting',
  pickup: 'Pick up (ground)',
  push: 'Push',
  sit: 'Sit idle (chair)',
  sitidle: 'Sit idle (chair)',
  sitdown: 'Sit down (chair)',
  standup: 'Stand up (chair)',
  punch: 'Punch combo (jab, cross, hook)',
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

const resolveClip = (animations: THREE.AnimationClip[], clip: string): THREE.AnimationClip | undefined => {
  const exact = animations.find((a) => a.name === clip);
  if (exact) return exact;
  const key = normalize(clip);
  const alias = CLIP_ALIASES[key];
  if (alias) {
    const found = animations.find((a) => a.name === alias);
    if (found) return found;
  }
  return animations.find((a) => normalize(a.name) === key);
};

type MorphMesh = {
  mesh: THREE.Mesh;
  map: Record<string, number>;
  influences: number[];
};

const collectMorphs = (root: THREE.Object3D): MorphMesh[] => {
  const out: MorphMesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.morphTargetDictionary || !m.morphTargetInfluences) return;
    const map: Record<string, number> = {};
    for (const [name, index] of Object.entries(m.morphTargetDictionary)) map[normalize(name)] = index;
    out.push({ mesh: m, map, influences: m.morphTargetInfluences });
  });
  return out;
};

const setMorph = (meshes: MorphMesh[], name: string, value: number) => {
  const key = normalize(name);
  const v = clamp01(value);
  for (const m of meshes) {
    const index = m.map[key];
    if (index !== undefined) m.influences[index] = v;
  }
};

const applyFace = (
  meshes: MorphMesh[],
  expr: FaceExpr,
  blink: number,
  viseme: CustomViseme,
  visemeWeights: Partial<Record<CustomViseme, number>>,
  mouthScale: number,
) => {
  if (!meshes.length) return;
  for (const m of meshes) m.influences.fill(0);

  const b = clamp01(blink);
  setMorph(meshes, 'eyeBlinkLeft', b);
  setMorph(meshes, 'eyeBlinkRight', b);

  for (const [v, w] of Object.entries(visemeWeights) as [CustomViseme, number][]) {
    if (v === 'sil') continue;
    setMorph(meshes, VISEME_MORPH[v], w * mouthScale);
  }
  if (!Object.keys(visemeWeights).length && viseme && viseme !== 'sil') {
    setMorph(meshes, VISEME_MORPH[viseme], mouthScale);
  }

  for (const [name, value] of EXPR_MORPHS[expr]) setMorph(meshes, name, value);
};

const tintMaterial = (name: string, look: AraLook): THREE.Color | null => {
  const role = MATERIAL_ROLE[name];
  switch (role) {
    case 'skin':
      return look.skin ? new THREE.Color(look.skin) : null;
    case 'shirt':
      return new THREE.Color(look.shirt ?? look.tint ?? '#ffffff');
    case 'hair':
      return new THREE.Color(look.hair ?? '#ffffff');
    case 'shoe':
      return new THREE.Color(look.shoe ?? '#ffffff');
    default:
      return null;
  }
};

export const AraCharacter: React.FC<AraCharacterProps> = ({
  src = ARA_RIG_URL,
  look = {},
  clip = 'idle',
  clipTime,
  speed = 1,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  expr = 'neutral',
  blink = 'auto',
  viseme = 'sil',
  visemeTimeline,
  lookYaw = 0,
  lookPitch = 0,
  mouthScale = 1,
  debugColor,
}) => {
  const gltf = useLoader(GLTFLoader, staticFile(src));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cloned = useMemo(() => {
    const c = cloneSkeleton(gltf.scene);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      if (debugColor) {
        mesh.material = new THREE.MeshBasicMaterial({ color: debugColor });
        return;
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const clonedMats = mats.map((m) => {
        const cm = m.clone() as THREE.MeshStandardMaterial;
        const color = tintMaterial(cm.name, look);
        if (color) cm.color.copy(color);
        if (cm.name === 'Eyes') {
          cm.roughness = 0.18;
          cm.metalness = 0;
          if (cm.map) cm.map.anisotropy = 8;
        }
        cm.needsUpdate = true;
        return cm;
      });
      mesh.material = Array.isArray(mesh.material) ? clonedMats : clonedMats[0];
    });
    return c;
  }, [gltf.scene, debugColor, look.skin, look.shirt, look.hair, look.shoe, look.tint]);

  const morphMeshes = useMemo(() => collectMorphs(cloned), [cloned]);
  const eyes = useMemo(() => {
    const left = cloned.getObjectByName('LeftEye') as THREE.Object3D | undefined;
    const right = cloned.getObjectByName('RightEye') as THREE.Object3D | undefined;
    return {
      left,
      right,
      restLeft: left?.quaternion.clone(),
      restRight: right?.quaternion.clone(),
      head: cloned.getObjectByName('Head') as THREE.Object3D | undefined,
      neck: cloned.getObjectByName('Neck') as THREE.Object3D | undefined,
    };
  }, [cloned]);

  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const action = useMemo(() => {
    const found =
      resolveClip(gltf.animations, clip) ??
      gltf.animations.find((a) => a.name === 'Idle') ??
      gltf.animations[0];
    if (!found) return null;
    const a = mixer.clipAction(found);
    a.enabled = true;
    a.setLoop(LOOPING.has(found.name) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = !LOOPING.has(found.name);
    return a;
  }, [mixer, gltf.animations, clip]);

  useLayoutEffect(() => {
    if (!action) return;
    action.reset();
    action.play();
    return () => {
      action.stop();
      mixer.uncacheAction(action.getClip());
    };
  }, [action, mixer]);

  useLayoutEffect(() => {
    const t = clipTime ?? (frame / fps) * speed;
    if (action) mixer.setTime(t);

    if (eyes.head) eyes.head.rotation.y += lookYaw * 0.22;
    if (eyes.neck) eyes.neck.rotation.y += lookYaw * 0.08;
    if (eyes.head) eyes.head.rotation.x += lookPitch * 0.18;
    const eyeYaw = lookYaw * 0.35;
    const eyePitch = lookPitch * 0.35;
    const lookQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(eyePitch, eyeYaw, 0));
    if (eyes.left && eyes.restLeft) eyes.left.quaternion.copy(eyes.restLeft).multiply(lookQuat);
    if (eyes.right && eyes.restRight) eyes.right.quaternion.copy(eyes.restRight).multiply(lookQuat);

    const b = blink === 'auto' ? autoBlink(t) : clamp01(blink);
    const weights = visemeTimeline ? sampleVisemeWeights(visemeTimeline, t) : { [viseme]: 1 };
    applyFace(morphMeshes, expr, b, viseme, weights, mouthScale);
  }, [
    action,
    mixer,
    frame,
    fps,
    clipTime,
    speed,
    lookYaw,
    lookPitch,
    blink,
    viseme,
    visemeTimeline,
    expr,
    mouthScale,
    eyes,
    morphMeshes,
  ]);

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
};
