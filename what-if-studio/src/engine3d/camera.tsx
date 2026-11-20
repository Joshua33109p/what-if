import React, { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

export type Vec3 = [number, number, number];

export type CameraKey = {
  t: number;
  pos: Vec3;
  target: Vec3;
  fov?: number;
  roll?: number;
  /** 0 = linear, 1 = smooth, 2 = smoother */
  ease?: number;
};

export type CinematicCameraProps = {
  keys: CameraKey[];
  /** Handheld drift amplitude in metres. */
  handheld?: number;
  /** Seed the drift so different shots do not move in lockstep. */
  seed?: number;
  time?: number;
};

const smooth = (x: number, power = 1) => {
  const t = Math.max(0, Math.min(1, x));
  const s = t * t * (3 - 2 * t);
  return power <= 1 ? s : s * s * (3 - 2 * s);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

const sample = (keys: CameraKey[], t: number) => {
  if (keys.length === 0) return null;
  if (t <= keys[0].t) return keys[0];
  if (t >= keys[keys.length - 1].t) return keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const raw = (t - a.t) / Math.max(1e-6, b.t - a.t);
      const e = smooth(raw, b.ease ?? 1);
      return {
        t,
        pos: lerp3(a.pos, b.pos, e),
        target: lerp3(a.target, b.target, e),
        fov: lerp(a.fov ?? 35, b.fov ?? 35, e),
        roll: lerp(a.roll ?? 0, b.roll ?? 0, e),
        ease: b.ease,
      };
    }
  }
  return keys[keys.length - 1];
};

/**
 * Deterministic cinematic camera. Place inside a ThreeCanvas; it drives the default camera from
 * keyframes and adds a tiny handheld drift so locked-off shots still breathe.
 */
export const CinematicCamera: React.FC<CinematicCameraProps> = ({
  keys,
  handheld = 0.004,
  seed = 0,
  time,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { camera } = useThree();

  useLayoutEffect(() => {
    const t = time ?? frame / fps;
    const k = sample(keys, t);
    if (!k) return;
    const drift = handheld;
    const nx = Math.sin(t * 0.71 + seed * 1.7) * drift;
    const ny = Math.sin(t * 0.93 + seed * 2.3 + 1.2) * drift * 0.6;
    const nz = Math.sin(t * 0.57 + seed * 4.1 + 0.4) * drift * 0.35;
    camera.position.set(k.pos[0] + nx, k.pos[1] + ny, k.pos[2] + nz);
    const target = new THREE.Vector3(k.target[0], k.target[1], k.target[2]);
    camera.lookAt(target);
    if (k.roll) camera.rotation.z += k.roll;
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = k.fov ?? 35;
      if (Math.abs(camera.fov - fov) > 0.001) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
  }, [frame, fps, keys, handheld, seed, time, camera]);

  return null;
};

export const SHOT_PRESETS = {
  wide: (pos: Vec3, target: Vec3): CameraKey => ({ t: 0, pos, target, fov: 35 }),
  medium: (pos: Vec3, target: Vec3): CameraKey => ({ t: 0, pos, target, fov: 30 }),
  close: (pos: Vec3, target: Vec3): CameraKey => ({ t: 0, pos, target, fov: 24 }),
};
