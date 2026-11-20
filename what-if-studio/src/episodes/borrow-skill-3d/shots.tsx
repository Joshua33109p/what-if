import React from 'react';
import * as THREE from 'three';
import { CinematicCamera, CameraKey } from '../../engine3d/camera';
import { AraCharacter, AraLook } from '../../engine3d/araCharacter';
import { SkillLibrary, SkillLibraryLights, SkillOrb } from '../../engine3d/SkillLibrary';
import type { FaceExpr } from '../../engine3d/character';
import type { VisemeTimeline } from '../../engine3d/lipsync';
import { OverlayFlags, OverlayLayer, Shot3DDef, Shot3DProps } from '../../engine3d/episode3d';
import visemes from './visemes.json';

type Vec3 = [number, number, number];

type CameraMove = {
  from: Vec3;
  to: Vec3;
  targetFrom: Vec3;
  targetTo: Vec3;
  fovFrom: number;
  fovTo: number;
};

type CharView = {
  src: string;
  look: AraLook;
  position: Vec3;
  rotationY: number;
  scale?: number;
  clip: string;
  expr: FaceExpr;
  lookYaw?: number;
  lookPitch?: number;
  talk?: boolean;
  move?: { from: Vec3; to: Vec3 };
};

export type ShotView = {
  camera: CameraMove;
  pip?: CharView;
  mo?: CharView;
  suit?: CharView;
  ball?: { from: Vec3; to: Vec3 };
  orb?: { from: Vec3; to: Vec3; color?: string; radius?: number };
  flags?: OverlayFlags;
};

const PIP = 'models/ara/ara-pip.glb';
const MO = 'models/ara/ara-pip-male.glb';

const PIP_LOOK: AraLook = { name: 'PIP', tint: '#F2B33D', hair: '#241B18', shirt: '#B96A3A', shoe: '#241B18' };
const MO_LOOK: AraLook = { name: 'ARA MO', tint: '#6F8A52', hair: '#2A1C18', shirt: '#3E5A6A', shoe: '#1E1A18' };
const SUIT_LOOK: AraLook = { name: 'THE SUIT', tint: '#2B2F3A', hair: '#17141A', shirt: '#1E222C', shoe: '#111014' };

const cam = (
  from: Vec3,
  to: Vec3,
  targetFrom: Vec3,
  targetTo: Vec3 = targetFrom,
  fovFrom = 35,
  fovTo = fovFrom,
): CameraMove => ({ from, to, targetFrom, targetTo, fovFrom, fovTo });

const char = (
  src: string,
  look: AraLook,
  position: Vec3,
  rotationY: number,
  clip: string,
  expr: FaceExpr,
  extra: Partial<CharView> = {},
): CharView => ({ src, look, position, rotationY, clip, expr, ...extra });

const orb = (from: Vec3, to: Vec3, color = '#FFC46A', radius = 0.1) => ({ from, to, color, radius });

const C = {
  wide: cam([3.8, 1.95, 5], [3.2, 2.05, 4.5], [0, 1.2, -0.4], [0.1, 1.2, -0.3], 40, 38),
  wideDark: cam([3.8, 1.95, 5], [2.8, 2.0, 4.0], [0, 1.2, -0.4], [0, 1.2, -0.4], 40, 36),
  pianoWide: cam([-0.2, 1.55, 2.7], [0.4, 1.65, 3.2], [-1.55, 1.12, 0.5], [-1.4, 1.12, 0.4], 35, 33),
  pianoMed: cam([-1.05, 1.18, 1.12], [-0.9, 1.22, 1.4], [-1.85, 0.98, 0.62], [-1.8, 1.0, 0.55], 28, 27),
  pianoInsert: cam([-1.7, 1.02, 1.0], [-1.55, 1.05, 1.25], [-2.1, 0.95, 0.68], [-2.1, 0.96, 0.62], 24, 23),
  surgWide: cam([3.35, 1.6, 2.5], [3.0, 1.7, 2.8], [2.1, 1.05, -0.05], [2.1, 1.08, 0], 35, 33),
  surgMed: cam([2.72, 1.22, 1.08], [2.55, 1.28, 1.25], [2.15, 1.0, 0.08], [2.15, 1.02, 0.1], 28, 27),
  surgInsert: cam([2.3, 1.12, 0.78], [2.2, 1.15, 1.0], [2.1, 1.0, 0.12], [2.1, 1.02, 0.14], 24, 23),
  hoopWide: cam([1.95, 0.85, 3.15], [2.15, 1.0, 3.55], [0.2, 1.45, -1.0], [0.2, 1.55, -1.1], 40, 38),
  hoopInsert: cam([0.2, 1.8, 0.35], [0.2, 1.82, 0.55], [0.2, 1.95, -2.55], [0.2, 1.95, -2.5], 28, 27),
  deskWide: cam([2.55, 1.55, 2.65], [2.2, 1.65, 2.4], [0.15, 1.1, 1.35], [0.15, 1.12, 1.3], 35, 34),
  deskMed: cam([1.25, 1.18, 2.7], [1.1, 1.22, 2.45], [0.6, 0.98, 1.92], [0.6, 1.0, 1.9], 28, 27),
  orbInsert: cam([-0.1, 1.24, 2.2], [-0.02, 1.28, 2.0], [-0.08, 1.15, 1.28], [-0.08, 1.16, 1.3], 22, 21),
  pipFace: cam([-0.5, 1.66, 2.05], [-0.42, 1.67, 1.9], [-0.5, 1.62, 1.05], [-0.5, 1.63, 1.05], 25, 24),
  moFace: cam([0.55, 1.58, 2.0], [0.5, 1.6, 1.85], [0.55, 1.57, 1.05], [0.55, 1.58, 1.05], 25, 24),
  brainWide: cam([0.2, 1.82, 2.6], [0.2, 1.84, 2.35], [0.2, 1.82, 1.08], [0.2, 1.82, 1.08], 30, 29),
  brainClose: cam([0.2, 1.85, 1.78], [0.2, 1.85, 1.62], [0.2, 1.82, 1.08], [0.2, 1.82, 1.08], 24, 23),
  suitWide: cam([1.5, 1.5, 3.2], [1.3, 1.55, 2.9], [0.2, 1.2, 1.4], [0.2, 1.2, 1.35], 38, 36),
  faceOrb: cam([-0.1, 1.35, 2.25], [-0.05, 1.38, 2.05], [-0.1, 1.3, 1.3], [-0.1, 1.32, 1.3], 22, 21),
};

const S = (view: ShotView): Shot3DDef => ({
  Scene: (p: Shot3DProps) => <ShotScene view={view} {...p} />,
  Overlay: view.flags ? (p) => <OverlayLayer {...p} flags={view.flags!} /> : undefined,
});

export const SHOTS: Record<string, Shot3DDef> = {
  S1: S({
    camera: C.wide,
    pip: char(PIP, PIP_LOOK, [-1.32, 0, 0.55], -1.15, 'walk', 'neutral', {
      move: { from: [-3.4, 0, 2.0], to: [-1.32, 0, 0.55] },
      lookYaw: 0.1,
      talk: true,
    }),
    orb: orb([-1.0, 1.22, 0.8], [-1.0, 1.28, 0.7]),
  }),
  S2: S({
    camera: C.pianoMed,
    pip: char(PIP, PIP_LOOK, [-1.32, 0, 0.55], -1.15, 'piano', 'happy', { lookYaw: 0.15, talk: true }),
    orb: orb([-1.42, 1.25, 0.65], [-1.42, 1.3, 0.62], '#FFC46A', 0.075),
  }),
  S3: S({
    camera: C.pianoInsert,
    pip: char(PIP, PIP_LOOK, [-1.32, 0, 0.55], -1.15, 'piano', 'happy', { lookPitch: -0.2 }),
    orb: orb([-1.55, 1.02, 0.48], [-1.52, 1.08, 0.5], '#FFC46A', 0.06),
  }),
  S4: S({
    camera: C.surgWide,
    mo: char(MO, MO_LOOK, [2.15, 0, -0.58], 0, 'walk', 'worried', {
      move: { from: [3.4, 0, 1.6], to: [2.15, 0, -0.58] },
      lookYaw: -0.1,
      talk: true,
    }),
    orb: orb([2.1, 1.25, 0.15], [2.1, 1.3, 0.12], '#7CE0D3', 0.075),
  }),
  S5: S({
    camera: C.hoopWide,
    mo: char(MO, MO_LOOK, [0.2, 0, 0.9], Math.PI, 'throw', 'smug', { talk: true }),
    ball: { from: [0.2, 1.4, 0.9], to: [0.2, 2.2, -2.2] },
    orb: orb([0.2, 1.42, 0.8], [0.2, 2.3, -2.35], '#FFC46A', 0.065),
  }),
  S6: S({
    camera: C.hoopInsert,
    mo: char(MO, MO_LOOK, [0.2, 0, 0.9], Math.PI, 'throw', 'smug'),
    ball: { from: [0.2, 2.2, -2.55], to: [0.2, 1.7, -2.55] },
    orb: orb([0.2, 2.55, -2.55], [0.2, 2.45, -2.55], '#FFC46A', 0.06),
  }),
  S7: S({
    camera: C.wide,
    pip: char(PIP, PIP_LOOK, [-1.32, 0, 0.55], -1.15, 'idle', 'happy'),
    mo: char(MO, MO_LOOK, [0.2, 0, 0.9], Math.PI, 'idle', 'smug'),
    orb: orb([-0.45, 1.35, 0.9], [-0.35, 1.42, 0.85], '#FFC46A', 0.07),
    flags: { dark: 0.04 },
  }),
  S8: S({
    camera: C.wide,
    pip: char(PIP, PIP_LOOK, [-1.1, 0, 0.55], -1.0, 'idle', 'happy'),
    mo: char(MO, MO_LOOK, [0.35, 0, 0.9], Math.PI, 'idle', 'smug'),
    orb: orb([-0.2, 1.42, 0.95], [-0.16, 1.48, 0.92], '#FFC46A', 0.075),
    flags: { dark: 0.03 },
  }),
  S9: S({
    camera: C.wide,
    pip: char(PIP, PIP_LOOK, [0, 0, 0.6], 0, 'idle', 'neutral'),
    mo: char(MO, MO_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'neutral'),
    orb: orb([0.2, 1.4, 1.1], [0.2, 1.45, 1.1]),
    flags: { title: true },
  }),
  S10: S({
    camera: C.deskMed,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'worried', { talk: true }),
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0, 'idle', 'worried'),
    orb: orb([0.2, 1.16, 1.2], [0.2, 1.22, 1.18]),
    flags: { countdown: true },
  }),
  S11: S({
    camera: C.orbInsert,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'worried', { talk: true }),
    orb: orb([0.08, 1.14, 1.3], [0.1, 1.2, 1.28]),
    flags: { countdown: true },
  }),
  S12: S({
    camera: C.pianoMed,
    mo: char(MO, MO_LOOK, [-1.32, 0, 0.55], -1.15, 'idle', 'worried'),
    orb: orb([-1.42, 1.2, 0.65], [-1.42, 1.24, 0.64], '#FFC46A', 0.07),
  }),
  S13: S({
    camera: C.surgMed,
    pip: char(PIP, PIP_LOOK, [2.15, 0, -0.58], 0, 'idle', 'worried'),
    orb: orb([2.14, 1.12, 0.16], [2.14, 1.18, 0.14], '#7CE0D3', 0.07),
  }),
  S14: S({
    camera: C.wideDark,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'worried'),
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0, 'idle', 'worried', { talk: true }),
    orb: orb([0.2, 1.32, 1.15], [0.2, 1.36, 1.12]),
    flags: { countdown: true, dark: 0.12 },
  }),
  S15: S({
    camera: C.pianoWide,
    pip: char(PIP, PIP_LOOK, [-1.32, 0, 0.55], -1.15, 'piano', 'happy', { lookYaw: 0.1, talk: true }),
    orb: orb([-1.55, 1.2, 0.55], [-1.5, 1.28, 0.52], '#FFC46A', 0.08),
  }),
  S16: S({
    camera: C.pianoMed,
    pip: char(PIP, PIP_LOOK, [-1.32, 0, 0.55], -1.15, 'piano', 'happy', { lookYaw: 0.12 }),
    orb: orb([-1.4, 1.24, 0.64], [-1.38, 1.28, 0.62], '#FFC46A', 0.07),
  }),
  S17: S({
    camera: C.hoopWide,
    mo: char(MO, MO_LOOK, [0.2, 0, 0.9], Math.PI, 'throw', 'happy', { talk: true }),
    ball: { from: [0.2, 1.4, 0.9], to: [0.2, 2.18, -2.25] },
    orb: orb([0.2, 1.4, 0.75], [0.2, 2.2, -2.4], '#FFC46A', 0.065),
  }),
  S18: S({
    camera: C.hoopInsert,
    mo: char(MO, MO_LOOK, [0.2, 0, 0.9], Math.PI, 'throw', 'happy'),
    ball: { from: [0.2, 2.18, -2.55], to: [0.2, 1.72, -2.55] },
    orb: orb([0.2, 2.5, -2.55], [0.2, 2.42, -2.55], '#FFC46A', 0.06),
  }),
  S19: S({
    camera: C.deskMed,
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0, 'interact', 'smug', { talk: true }),
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'happy'),
    orb: orb([0.2, 1.14, 1.2], [0.2, 1.22, 1.18]),
  }),
  S20: S({
    camera: C.pipFace,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.2, 'idle', 'happy'),
    orb: orb([-0.42, 1.08, 1.22], [-0.4, 1.12, 1.24], '#FFC46A', 0.06),
  }),
  S21: S({
    camera: C.wide,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'happy', { talk: true }),
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0, 'idle', 'neutral'),
    orb: orb([0.2, 1.45, 1.1], [0.24, 1.52, 1.08]),
  }),
  S22: S({
    camera: C.pianoWide,
    pip: char(PIP, PIP_LOOK, [-1.32, 0, 0.55], -1.15, 'piano', 'neutral', { lookPitch: -0.1, talk: true }),
    orb: orb([-1.5, 1.2, 0.56], [-1.46, 1.25, 0.54], '#FFC46A', 0.07),
  }),
  S23: S({
    camera: C.pianoWide,
    mo: char(MO, MO_LOOK, [-1.32, 0, 0.55], -1.15, 'idle', 'worried', { talk: true }),
    orb: orb([-1.45, 1.16, 0.62], [-1.4, 1.22, 0.6], '#FFB067', 0.06),
    flags: { dark: 0.12 },
  }),
  S24: S({
    camera: C.pianoMed,
    mo: char(MO, MO_LOOK, [-1.32, 0, 0.55], -1.15, 'idle', 'sad'),
    orb: orb([-1.42, 1.18, 0.64], [-1.4, 1.22, 0.62], '#FFB067', 0.055),
  }),
  S25: S({
    camera: C.surgWide,
    pip: char(PIP, PIP_LOOK, [2.15, 0, -0.58], 0, 'idle', 'worried', { talk: true }),
    orb: orb([2.14, 1.12, 0.16], [2.14, 1.16, 0.14], '#7CE0D3', 0.06),
    flags: { dark: 0.08 },
  }),
  S26: S({
    camera: C.pipFace,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.2, 'idle', 'shock'),
  }),
  S27: S({
    camera: C.hoopWide,
    mo: char(MO, MO_LOOK, [0.2, 0, 0.9], Math.PI, 'throw', 'worried', { talk: true }),
    ball: { from: [0.2, 1.4, 0.9], to: [0.75, 1.75, -1.5] },
    orb: orb([0.2, 1.4, 0.72], [0.6, 1.9, -1.2], '#FF8A7A', 0.06),
  }),
  S28: S({
    camera: C.brainWide,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'worried', { talk: true }),
    flags: { brain: true, dark: 0.06 },
  }),
  S29: S({
    camera: C.brainClose,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'worried'),
    flags: { brain: true, dark: 0.06 },
  }),
  S30: S({
    camera: C.pipFace,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.2, 'idle', 'shock', { lookYaw: 0.1 }),
    flags: { dark: 0.05 },
  }),
  S31: S({
    camera: C.deskWide,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'reach', 'worried', { talk: true }),
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0, 'reach', 'worried'),
    orb: orb([0.2, 1.15, 1.2], [0.22, 1.22, 1.18]),
  }),
  S32: S({
    camera: C.suitWide,
    suit: char(MO, SUIT_LOOK, [0.55, 0, 2.3], 0.2, 'walk', 'angry', {
      move: { from: [3.2, 0, 2.6], to: [0.55, 0, 2.3] },
      lookYaw: -0.15,
    }),
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'shock'),
    flags: { dark: 0.1 },
  }),
  S33: S({
    camera: C.suitWide,
    suit: char(MO, SUIT_LOOK, [0.55, 0, 2.3], 0.2, 'point', 'angry', { talk: true }),
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'worried'),
    orb: orb([0.2, 1.15, 1.2], [0.2, 1.2, 1.18]),
    flags: { countdown: true },
  }),
  S34: S({
    camera: C.pianoMed,
    mo: char(MO, MO_LOOK, [-1.32, 0, 0.55], -1.15, 'idle', 'sad'),
    suit: char(MO, SUIT_LOOK, [0.0, 0, 1.2], 0.4, 'point', 'angry'),
    flags: { dark: 0.1 },
  }),
  S35: S({
    camera: C.surgWide,
    pip: char(PIP, PIP_LOOK, [2.15, 0, -0.58], 0, 'idle', 'worried'),
    suit: char(MO, SUIT_LOOK, [2.15, 0, 0.8], 0.2, 'point', 'angry'),
    flags: { dark: 0.12 },
  }),
  S36: S({
    camera: C.orbInsert,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'reach', 'worried', { talk: true }),
    orb: orb([0.08, 1.14, 1.3], [0.1, 1.2, 1.28], '#FFC46A', 0.09),
    flags: { countdown: true, dark: 0.06 },
  }),
  S37: S({
    camera: C.wide,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'worried'),
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0, 'idle', 'sad'),
    suit: char(MO, SUIT_LOOK, [0.55, 0, 2.65], 0.1, 'point', 'angry', { talk: true }),
    orb: orb([0.2, 1.45, 1.12], [0.2, 1.5, 1.1]),
    flags: { countdown: true, dark: 0.16 },
  }),
  S38: S({
    camera: C.deskMed,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'reach', 'worried', { talk: true }),
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0, 'idle', 'sad'),
    orb: orb([0.2, 1.15, 1.2], [0.2, 1.22, 1.18]),
    flags: { countdown: true },
  }),
  S39: S({
    camera: C.pipFace,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.2, 'idle', 'worried', { lookYaw: -0.1 }),
    flags: { countdown: true },
  }),
  S40: S({
    camera: C.moFace,
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0.7, 'idle', 'sad', { talk: true }),
    flags: { countdown: true },
  }),
  S41: S({
    camera: C.deskWide,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'reach', 'worried'),
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0, 'reach', 'sad'),
    orb: orb([0.18, 1.16, 1.18], [0.28, 1.22, 1.2], '#FFC46A', 0.09),
    flags: { countdown: true, dark: 0.08 },
  }),
  S42: S({
    camera: C.wideDark,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.7, 'idle', 'worried', { talk: true }),
    mo: char(MO, MO_LOOK, [0.55, 0, 2.0], 0, 'idle', 'sad'),
    orb: orb([0.2, 1.32, 1.15], [0.2, 1.36, 1.12], '#FFC46A', 0.09),
    flags: { countdown: true, dark: 0.56 },
  }),
  S43: S({
    camera: C.faceOrb,
    pip: char(PIP, PIP_LOOK, [-0.5, 0, 1.05], 0.2, 'idle', 'shock', { lookYaw: 0.05 }),
    orb: orb([-0.32, 1.3, 1.38], [-0.28, 1.34, 1.4], '#FF8A7A', 0.12),
    flags: { countdown: true, dark: 0.34 },
  }),
};

const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

const AnimatedCharacter: React.FC<{ view: CharView; t: number; len: number; f: number }> = ({ view, t, len, f }) => {
  const p = Math.max(0, Math.min(1, t / Math.max(1, len)));
  const position = view.move ? lerp3(view.move.from, view.move.to, smooth(p)) : view.position;
  return (
    <AraCharacter
      src={view.src}
      look={view.look}
      clip={view.clip}
      clipTime={f / 30}
      expr={view.expr}
      blink="auto"
      visemeTimeline={view.talk ? (visemes as VisemeTimeline) : undefined}
      viseme="sil"
      position={position}
      rotationY={view.rotationY}
      scale={view.scale ?? 1}
      lookYaw={view.lookYaw ?? 0}
      lookPitch={view.lookPitch ?? 0}
    />
  );
};

export const ShotScene: React.FC<{ view: ShotView; t: number; len: number; f: number }> = ({ view, t, len, f }) => {
  const p = Math.max(0, Math.min(1, t / Math.max(1, len)));
  const keys: CameraKey[] = [
    { t: 0, pos: view.camera.from, target: view.camera.targetFrom, fov: view.camera.fovFrom, ease: 1 },
    {
      t: Math.max(0.6, len / 30),
      pos: view.camera.to,
      target: view.camera.targetTo,
      fov: view.camera.fovTo,
      ease: 1,
    },
  ];
  const ball = view.ball ? lerp3(view.ball.from, view.ball.to, p) : undefined;
  const orbPos = view.orb ? lerp3(view.orb.from, view.orb.to, p) : undefined;
  return (
    <>
      <SkillLibraryLights />
      <SkillLibrary t={t / 30} ball={ball} />
      <CinematicCamera keys={keys} time={t / 30} handheld={0.0035} seed={Math.round(view.camera.from[0] * 10)} />
      {view.pip ? <AnimatedCharacter view={view.pip} t={t} len={len} f={f} /> : null}
      {view.mo ? <AnimatedCharacter view={view.mo} t={t} len={len} f={f} /> : null}
      {view.suit ? <AnimatedCharacter view={view.suit} t={t} len={len} f={f} /> : null}
      {view.orb && orbPos ? (
        <SkillOrb position={orbPos} color={view.orb.color} radius={view.orb.radius} t={t / 30} light />
      ) : null}
    </>
  );
};

export const episodeTitle = ['WHAT IF YOU COULD', 'BORROW A SKILL?'];
export const episodeAccent = 'BORROW';
