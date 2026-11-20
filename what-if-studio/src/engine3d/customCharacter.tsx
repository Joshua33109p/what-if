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

// Original CC0 custom rig. 57 joints, 45 blend shapes, 16 baked clips.
export const CUSTOM_RIG_URL = 'models/custom/custom_rig.glb';

export type CustomLook = {
  name?: string;
  tint?: string;
  skin?: string;
  shirt?: string;
  pants?: string;
  hair?: string;
  iris?: string;
  shoe?: string;
};

export type CustomHairStyle = 'short' | 'bob' | 'ponytail';

export type CustomCharacterProps = {
  model?: string;
  look?: CustomLook;
  src?: string;
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
  hair?: CustomHairStyle;
  debugColor?: string;
};

const HAIR_STYLE_PARTS: Record<CustomHairStyle, string[]> = {
  short: ['Hair_Short', 'Fringe_Short'],
  bob: ['Hair_Bob', 'Fringe_Bob'],
  ponytail: ['Hair_Ponytail', 'Ponytail'],
};

const MATERIAL_ROLE: Record<string, string> = {
  CUSTOM_SKIN: 'skin',
  CUSTOM_SHIRT: 'shirt',
  CUSTOM_PANTS: 'pants',
  CUSTOM_SHOE: 'shoe',
  CUSTOM_SOLE: 'sole',
  CUSTOM_BELT: 'belt',
  CUSTOM_HAIR: 'hair',
  CUSTOM_EYE_WHITE: 'eye_white',
  CUSTOM_IRIS: 'iris',
  CUSTOM_PUPIL: 'pupil',
  CUSTOM_MOUTH: 'mouth',
  CUSTOM_TEETH: 'teeth',
  CUSTOM_TONGUE: 'tongue',
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const darken = (hex: string, amount: number) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(amount);
  return c;
};

const roleColor = (role: string, look: CustomLook): THREE.Color => {
  const shirt = look.shirt ?? look.tint ?? '#F2B33D';
  switch (role) {
    case 'skin':
      return new THREE.Color(look.skin ?? '#E7B98E');
    case 'shirt':
      return new THREE.Color(shirt);
    case 'pants':
      return look.pants ? new THREE.Color(look.pants) : darken(shirt, 0.44);
    case 'shoe':
      return new THREE.Color(look.shoe ?? '#35262B');
    case 'sole':
      return new THREE.Color('#17131A');
    case 'belt':
      return new THREE.Color('#3A2C24');
    case 'hair':
      return new THREE.Color(look.hair ?? '#241B18');
    case 'iris':
      return new THREE.Color(look.iris ?? '#5A7A5A');
    case 'pupil':
      return new THREE.Color('#151018');
    case 'mouth':
      return new THREE.Color('#3A1E22');
    case 'teeth':
      return new THREE.Color('#F7F2E8');
    case 'tongue':
      return new THREE.Color('#B85C66');
    default:
      return new THREE.Color('#F8F4EE');
  }
};

const EXPR_MORPHS: Record<FaceExpr, string[]> = {
  neutral: [],
  happy: ['mouthSmileLeft', 'mouthSmileRight', 'cheekSquintLeft', 'cheekSquintRight'],
  worried: ['browInnerUp', 'mouthFrownLeft', 'mouthFrownRight'],
  shock: ['jawOpen', 'browInnerUp', 'eyeWideLeft', 'eyeWideRight'],
  smug: ['mouthSmileLeft', 'browDownRight'],
  sad: ['browInnerUp', 'mouthFrownLeft', 'mouthFrownRight'],
  angry: ['browDownLeft', 'browDownRight', 'mouthPressLeft', 'mouthPressRight'],
};

type MorphMesh = {
  mesh: THREE.Mesh;
  map: Record<string, number>;
  influences: number[];
};

const normalizeMorph = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const collectMorphs = (root: THREE.Object3D): MorphMesh[] => {
  const out: MorphMesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.morphTargetDictionary || !m.morphTargetInfluences) return;
    const map: Record<string, number> = {};
    for (const [name, index] of Object.entries(m.morphTargetDictionary)) {
      map[normalizeMorph(name)] = index;
    }
    out.push({ mesh: m, map, influences: m.morphTargetInfluences });
  });
  return out;
};

const setMorph = (meshes: MorphMesh[], name: string, value: number) => {
  const key = normalizeMorph(name);
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
    const name = VISEME_MORPH[v];
    if (name) setMorph(meshes, name, w * mouthScale);
  }
  if (!Object.keys(visemeWeights).length && viseme) {
    const name = VISEME_MORPH[viseme];
    if (name) setMorph(meshes, name, mouthScale);
  }

  for (const name of EXPR_MORPHS[expr]) setMorph(meshes, name, 0.5);
};

const loopClip = (name: string) => name.endsWith('_Loop');

const CLIP_ALIASES: Record<string, string> = {
  idle: 'Idle_Loop',
  talk: 'Idle_Talking_Loop',
  talking: 'Idle_Talking_Loop',
  walk: 'Walk_Loop',
  run: 'Run_Loop',
  wave: 'Wave',
  point: 'Point',
  shrug: 'Shrug',
  think: 'Think',
  reach: 'Reach',
  throw: 'Throw',
  piano: 'Piano',
  surgery: 'Surgery',
  operate: 'Surgery',
  collapse: 'Collapse',
  interact: 'Interact',
  nod: 'Nod',
  shake: 'Shake',
};

const resolveClip = (animations: THREE.AnimationClip[], clip: string): THREE.AnimationClip | undefined => {
  const exact = animations.find((a) => a.name === clip);
  if (exact) return exact;
  const normalized = clip.toLowerCase().replace(/[^a-z]/g, '');
  const alias = CLIP_ALIASES[normalized];
  if (alias) {
    const found = animations.find((a) => a.name === alias);
    if (found) return found;
  }
  return animations.find((a) => a.name.toLowerCase().replace(/[^a-z]/g, '') === normalized);
};

export const CustomCharacter: React.FC<CustomCharacterProps> = ({
  look = {},
  src = CUSTOM_RIG_URL,
  clip = 'Idle_Loop',
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
  hair = 'short',
  debugColor,
}) => {
  const gltf = useLoader(GLTFLoader, staticFile(src));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const group = useRef<THREE.Group>(null);

  const cloned = useMemo(() => {
    const c = cloneSkeleton(gltf.scene);
    const allow = new Set(HAIR_STYLE_PARTS[hair] ?? HAIR_STYLE_PARTS.short);
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
        const role = MATERIAL_ROLE[cm.name] ?? 'generic';
        cm.color.copy(roleColor(role, look));
        if (role === 'eye_white' || role === 'iris' || role === 'pupil') {
          cm.roughness = 0.3;
          cm.metalness = 0.0;
        } else if (role === 'shirt' || role === 'pants') {
          cm.roughness = 0.82;
          cm.metalness = 0.0;
        } else if (role === 'shoe' || role === 'belt') {
          cm.roughness = 0.55;
          cm.metalness = 0.04;
        }
        cm.needsUpdate = true;
        return cm;
      });
      mesh.material = Array.isArray(mesh.material) ? clonedMats : clonedMats[0];

      if (mesh.name.startsWith('Hair_') || mesh.name.startsWith('Fringe_') || mesh.name === 'Ponytail') {
        mesh.visible = allow.has(mesh.name);
      }
    });
    return c;
  }, [gltf.scene, hair, debugColor, look.skin, look.shirt, look.pants, look.hair, look.iris, look.shoe, look.tint]);

  const morphMeshes = useMemo(() => collectMorphs(cloned), [cloned]);
  const eyes = useMemo(
    () => ({
      left: cloned.getObjectByName('LeftEye') as THREE.Object3D | undefined,
      right: cloned.getObjectByName('RightEye') as THREE.Object3D | undefined,
      head: cloned.getObjectByName('Head') as THREE.Object3D | undefined,
    }),
    [cloned],
  );

  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const action = useMemo(() => {
    const found =
      resolveClip(gltf.animations, clip) ??
      gltf.animations.find((a) => a.name === 'Idle_Loop') ??
      gltf.animations[0];
    if (!found) return null;
    const a = mixer.clipAction(found);
    a.enabled = true;
    a.setLoop(loopClip(found.name) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = !loopClip(found.name);
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

    if (eyes.head) {
      eyes.head.rotation.y += lookYaw * 0.25;
      eyes.head.rotation.x += lookPitch * 0.2;
    }
    const eyeYaw = lookYaw * 0.4;
    const eyePitch = lookPitch * 0.4;
    if (eyes.left) eyes.left.rotation.set(eyePitch, eyeYaw, 0);
    if (eyes.right) eyes.right.rotation.set(eyePitch, eyeYaw, 0);

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
    <group ref={group} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
};
