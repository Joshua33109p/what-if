import React from 'react';
import { CinematicCamera, CameraKey } from '../../engine3d/camera';
import { AraCharacter, AraLook } from '../../engine3d/araCharacter';
import { SleepHouse, SleepHouseLights } from '../../engine3d/SleepHouse';
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
  blink?: number | 'auto';
  lookYaw?: number;
  lookPitch?: number;
  talk?: boolean;
  move?: { from: Vec3; to: Vec3 };
};

type Hud = { label: string; value: string; p?: number };

type ShotView = {
  camera: CameraMove;
  pip?: CharView;
  mo?: CharView;
  sis?: CharView;
  mom?: CharView;
  suit?: CharView;
  debt?: number | { from: number; to: number };
  red?: boolean;
  holo?: boolean;
  alarm?: boolean;
  hud?: Hud;
  flags?: OverlayFlags;
};

const PIP_RIG = 'models/ara/ara-pip.glb';
const MO_RIG = 'models/ara/ara-pip-male.glb';

const PIP_LOOK: AraLook = { name: 'PIP', tint: '#F2B33D', hair: '#241B18', shirt: '#B96A3A', shoe: '#241B18' };
const MO_LOOK: AraLook = { name: 'MO', tint: '#6F8A52', hair: '#2A1C18', shirt: '#3E5A6A', shoe: '#1E1A18' };
const SIS_LOOK: AraLook = { name: 'SIS', tint: '#3E8C86', hair: '#43251F', shirt: '#2F7B78', shoe: '#241B18' };
const MOM_LOOK: AraLook = { name: 'MUM', tint: '#8A5A6A', hair: '#5A3226', shirt: '#8A5A6A', shoe: '#241B18' };
const SUIT_LOOK: AraLook = { name: 'THE SUIT', tint: '#2B2F3A', hair: '#17141A', shirt: '#1E222C', shoe: '#111014' };

const PIP_POS: Vec3 = [-0.55, 0, 0.65];
const MO_POS: Vec3 = [0.78, 0, 0.9];
const SIS_POS: Vec3 = [-0.5, 0, 1.62];
const MOM_POS: Vec3 = [1.2, 0, 1.65];
const SUIT_POS: Vec3 = [2.25, 0, 1.25];

const cam = (
  from: Vec3,
  to: Vec3,
  targetFrom: Vec3,
  targetTo: Vec3 = targetFrom,
  fovFrom = 35,
  fovTo = fovFrom,
): CameraMove => ({ from, to, targetFrom, targetTo, fovFrom, fovTo });

const ch = (
  src: string,
  look: AraLook,
  position: Vec3,
  rotationY: number,
  clip: string,
  expr: FaceExpr,
  extra: Partial<CharView> = {},
): CharView => ({ src, look, position, rotationY, clip, expr, blink: 'auto', ...extra });

const P = (extra: Partial<CharView> = {}) => ch(PIP_RIG, PIP_LOOK, PIP_POS, 0.55, 'idle', 'neutral', extra);
const M = (extra: Partial<CharView> = {}) => ch(MO_RIG, MO_LOOK, MO_POS, -0.45, 'idle', 'neutral', extra);
const SIS = (extra: Partial<CharView> = {}) => ch(PIP_RIG, SIS_LOOK, SIS_POS, 0.2, 'idle', 'neutral', { scale: 0.72, ...extra });
const MOM = (extra: Partial<CharView> = {}) => ch(PIP_RIG, MOM_LOOK, MOM_POS, -0.3, 'idle', 'neutral', { scale: 0.94, ...extra });
const SUIT = (extra: Partial<CharView> = {}) => ch(MO_RIG, SUIT_LOOK, SUIT_POS, 0.15, 'idle', 'angry', extra);

const C = {
  wide: cam([3.6, 1.95, 4.8], [3.2, 2.0, 4.4], [0, 1.18, -0.3], [0.05, 1.18, -0.25], 40, 38),
  wideDark: cam([3.6, 1.95, 4.8], [3.0, 2.0, 4.3], [0, 1.18, -0.3], [0.05, 1.18, -0.25], 40, 37),
  bedWide: cam([-0.1, 1.65, 2.6], [-0.25, 1.7, 2.35], [-1.75, 1.15, -1.15], [-1.7, 1.18, -1.1], 36, 34),
  bedMed: cam([-0.9, 1.4, 1.25], [-0.8, 1.42, 1.05], [-1.75, 1.2, -1.35], [-1.75, 1.22, -1.3], 29, 28),
  clockWide: cam([-1.7, 2.05, 1.55], [-1.7, 2.08, 1.25], [-1.75, 2.15, -2.93], [-1.75, 2.15, -2.93], 32, 31),
  clockInsert: cam([-1.75, 2.15, 0.35], [-1.75, 2.16, 0.1], [-1.75, 2.15, -2.93], [-1.75, 2.15, -2.93], 23, 22),
  clockReach: cam([-1.1, 1.85, 0.3], [-1.05, 1.88, 0.1], [-1.75, 2.1, -2.9], [-1.75, 2.1, -2.9], 26, 25),
  faceClock: cam([-1.78, 2.15, -0.45], [-1.78, 2.16, -0.65], [-1.75, 2.15, -2.93], [-1.75, 2.15, -2.93], 20, 19),
  deskWide: cam([2.5, 1.55, 2.65], [2.3, 1.6, 2.45], [1.45, 1.08, 0.05], [1.5, 1.1, 0.05], 36, 35),
  deskMed: cam([1.75, 1.3, 1.25], [1.65, 1.32, 1.05], [1.6, 1.0, 0.05], [1.6, 1.02, 0.05], 28, 27),
  deskInsert: cam([1.62, 1.12, 0.72], [1.62, 1.13, 0.52], [1.6, 0.86, 0.05], [1.6, 0.86, 0.05], 22, 21),
  tableWide: cam([2.05, 1.55, 3.35], [1.95, 1.58, 3.15], [0.15, 1.05, 1.6], [0.15, 1.06, 1.55], 38, 36),
  tableMed: cam([0.95, 1.28, 2.75], [0.9, 1.3, 2.55], [0.4, 1.0, 1.72], [0.4, 1.02, 1.7], 28, 27),
  tableInsert: cam([0.25, 1.1, 2.55], [0.25, 1.12, 2.35], [0.1, 0.78, 1.78], [0.1, 0.78, 1.78], 22, 21),
  facePip: cam([-0.4, 1.66, 1.85], [-0.35, 1.67, 1.68], [-0.55, 1.6, 0.65], [-0.55, 1.61, 0.65], 25, 24),
  faceMo: cam([0.9, 1.64, 1.85], [0.85, 1.65, 1.68], [0.78, 1.6, 0.9], [0.78, 1.61, 0.9], 25, 24),
  faceSis: cam([-0.42, 1.42, 2.45], [-0.4, 1.43, 2.25], [-0.5, 1.2, 1.62], [-0.5, 1.21, 1.62], 24, 23),
  faceMom: cam([1.25, 1.62, 2.55], [1.22, 1.63, 2.35], [1.2, 1.52, 1.65], [1.2, 1.53, 1.65], 24, 23),
  faceSuit: cam([2.35, 1.68, 2.4], [2.3, 1.7, 2.2], [2.25, 1.6, 1.25], [2.25, 1.61, 1.25], 24, 23),
  suitWide: cam([2.9, 1.62, 3.25], [2.7, 1.66, 3.0], [1.85, 1.2, 1.25], [1.9, 1.2, 1.2], 38, 36),
  suitMed: cam([2.55, 1.42, 2.25], [2.45, 1.44, 2.05], [2.45, 1.12, 0.1], [2.5, 1.12, 0.0], 28, 27),
  boardInsert: cam([2.55, 1.62, 0.65], [2.55, 1.63, 0.4], [2.55, 1.55, -0.35], [2.55, 1.55, -0.35], 22, 21),
  holoWide: cam([0.2, 1.85, 2.65], [0.2, 1.88, 2.4], [0.2, 1.68, 0.5], [0.2, 1.7, 0.5], 32, 31),
  holoClose: cam([0.2, 1.8, 1.65], [0.2, 1.82, 1.45], [0.2, 1.7, 0.5], [0.2, 1.7, 0.5], 24, 23),
  windowWide: cam([1.5, 1.8, 1.6], [1.5, 1.82, 1.3], [1.45, 1.72, -2.96], [1.45, 1.72, -2.96], 30, 29),
  windowInsert: cam([1.45, 1.72, -0.85], [1.45, 1.74, -1.05], [1.45, 1.72, -2.96], [1.45, 1.72, -2.96], 22, 21),
  doorWide: cam([-2.1, 1.6, 3.05], [-1.95, 1.62, 2.8], [-3.1, 1.25, 0.7], [-2.9, 1.25, 0.7], 38, 36),
  stepInsert: cam([-0.95, 0.75, 3.65], [-0.95, 0.76, 3.45], [-0.95, 0.2, 2.85], [-0.95, 0.2, 2.85], 24, 23),
};

const HudLayer: React.FC<{ hud: Hud }> = ({ hud }) => (
  <div style={{ position: 'absolute', right: 92, top: 76, fontFamily: '"Courier New", monospace', color: '#9FF4E6', textAlign: 'right' }}>
    <div style={{ fontSize: 18, letterSpacing: 4, opacity: 0.78 }}>{hud.label}</div>
    <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1, textShadow: '0 0 18px rgba(124,224,211,0.6)' }}>{hud.value}</div>
    {typeof hud.p === 'number' ? (
      <div style={{ marginTop: 12, marginLeft: 'auto', width: 300, height: 3, background: 'rgba(124,224,211,0.18)' }}>
        <div style={{ width: `${Math.max(0, Math.min(1, hud.p)) * 100}%`, height: '100%', background: '#7CE0D3' }} />
      </div>
    ) : null}
  </div>
);

const S = (view: ShotView): Shot3DDef => {
  const flags = view.flags ?? {};
  return {
    Scene: (p: Shot3DProps) => <ShotScene view={view} {...p} />,
    Overlay:
      view.flags || view.hud
        ? (p) => (
            <>
              <OverlayLayer {...p} flags={flags} />
              {view.hud ? <HudLayer hud={view.hud} /> : null}
            </>
          )
        : undefined,
  };
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
      blink={view.blink ?? 'auto'}
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
  const debt = typeof view.debt === 'number' ? view.debt : view.debt ? lerp(view.debt.from, view.debt.to, p) : 0.08;
  return (
    <>
      <SleepHouseLights red={view.red} />
      <SleepHouse t={t / 30} debt={debt} red={view.red} holo={view.holo} alarm={view.alarm} />
      <CinematicCamera keys={keys} time={t / 30} handheld={0.003} seed={Math.round(view.camera.from[0] * 11)} />
      {view.pip ? <AnimatedCharacter view={view.pip} t={t} len={len} f={f} /> : null}
      {view.mo ? <AnimatedCharacter view={view.mo} t={t} len={len} f={f} /> : null}
      {view.sis ? <AnimatedCharacter view={view.sis} t={t} len={len} f={f} /> : null}
      {view.mom ? <AnimatedCharacter view={view.mom} t={t} len={len} f={f} /> : null}
      {view.suit ? <AnimatedCharacter view={view.suit} t={t} len={len} f={f} /> : null}
    </>
  );
};

export const SHOTS: Record<string, Shot3DDef> = {
  S1: S({ camera: C.clockInsert, alarm: true, debt: 0.04, hud: { label: 'ALARM', value: '05:00' } }),
  S2: S({ camera: C.bedWide, pip: P({ position: [-1.75, 0, -0.45], clip: 'idle', expr: 'happy', talk: true }), debt: 0.05 }),
  S3: S({ camera: C.clockWide, debt: { from: 0.05, to: 0.18 }, hud: { label: 'BANKED', value: '08 HRS' } }),
  S4: S({ camera: C.faceClock, debt: 0.26, hud: { label: 'BANKED', value: '08 HRS' } }),
  S5: S({ camera: C.deskWide, pip: P({ clip: 'interact', expr: 'happy', talk: true }), debt: 0.28 }),
  S6: S({ camera: C.deskInsert, debt: 0.31 }),
  S7: S({ camera: C.tableWide, pip: P({ clip: 'talk', expr: 'happy' }), sis: SIS({ clip: 'idle', expr: 'neutral' }), debt: 0.34 }),
  S8: S({ camera: C.faceSis, sis: SIS({ clip: 'idle', expr: 'worried', blink: 1 }), debt: 0.36 }),
  S9: S({ camera: C.wide, pip: P({ expr: 'happy' }), mo: M({ expr: 'smug' }), sis: SIS({ expr: 'neutral' }), debt: 0.42 }),
  S10: S({ camera: C.wide, pip: P({ position: [0, 0, 0.6], rotationY: 0 }), mo: M({ position: [-0.5, 0, 1.05], rotationY: 0.7 }), debt: 0.42, flags: { title: true } }),
  S11: S({ camera: C.clockWide, debt: { from: 0.42, to: 0.55 }, hud: { label: 'BANKED', value: '16 HRS' } }),
  S12: S({ camera: C.holoWide, pip: P({ clip: 'talk', expr: 'worried', talk: true }), holo: true, debt: 0.55 }),
  S13: S({ camera: C.tableWide, mom: MOM({ expr: 'neutral' }), sis: SIS({ expr: 'neutral' }), debt: 0.56 }),
  S14: S({ camera: C.wide, pip: P({ clip: 'talk', expr: 'smug', talk: true }), debt: 0.58 }),
  S15: S({ camera: C.deskInsert, debt: 0.6 }),
  S16: S({ camera: C.windowWide, debt: 0.62 }),
  S17: S({ camera: C.tableWide, mom: MOM({ clip: 'interact', expr: 'neutral' }), debt: 0.64 }),
  S18: S({ camera: C.faceMom, mom: MOM({ expr: 'happy' }), debt: 0.65 }),
  S19: S({ camera: C.tableWide, mo: M({ clip: 'idle', expr: 'smug', talk: true }), debt: 0.66 }),
  S20: S({ camera: C.deskMed, pip: P({ clip: 'interact', expr: 'happy', talk: true }), debt: 0.68 }),
  S21: S({ camera: C.deskInsert, debt: 0.7 }),
  S22: S({ camera: C.bedMed, pip: P({ position: [-1.75, 0, -0.45], clip: 'idle', expr: 'happy' }), debt: 0.72 }),
  S23: S({ camera: C.clockWide, debt: 0.78, hud: { label: 'BANKED', value: '16 HRS' } }),
  S24: S({ camera: C.clockInsert, debt: 0.84, hud: { label: 'BANKED', value: '20 HRS' } }),
  S25: S({ camera: C.faceClock, debt: 0.9, hud: { label: 'BANKED', value: '24 HRS' } }),
  S26: S({ camera: C.windowWide, debt: 0.92 }),
  S27: S({ camera: C.facePip, pip: P({ expr: 'worried', blink: 0.8 }), debt: 0.92, flags: { dark: 0.05 } }),
  S28: S({ camera: C.wideDark, pip: P({ clip: 'talk', expr: 'worried', talk: true }), debt: 0.94, flags: { dark: 0.12 } }),
  S29: S({ camera: C.holoWide, pip: P({ clip: 'idle', expr: 'worried', talk: true }), holo: true, debt: 0.95, flags: { dark: 0.06 } }),
  S30: S({ camera: C.holoClose, holo: true, debt: 0.95, flags: { dark: 0.06 }, hud: { label: 'SLEEP DEBT', value: '22%', p: 0.75 } }),
  S31: S({ camera: C.facePip, pip: P({ expr: 'shock' }), debt: 0.95, flags: { dark: 0.08 } }),
  S32: S({ camera: C.holoClose, holo: true, red: true, debt: 1, hud: { label: 'SLEEP DEBT', value: '22%', p: 0.9 } }),
  S33: S({ camera: C.facePip, pip: P({ expr: 'worried' }), red: true, debt: 1, flags: { dark: 0.1 } }),
  S34: S({ camera: C.faceMo, mo: M({ expr: 'worried' }), red: true, debt: 1, flags: { dark: 0.1 } }),
  S35: S({ camera: C.stepInsert, red: true, debt: 1, flags: { dark: 0.12 } }),
  S36: S({ camera: C.facePip, pip: P({ expr: 'worried', blink: 1 }), red: true, debt: 1, flags: { dark: 0.14 } }),
  S37: S({ camera: C.windowInsert, red: true, debt: 1, flags: { dark: 0.16 } }),
  S38: S({ camera: C.deskInsert, red: true, debt: 1, flags: { dark: 0.14 } }),
  S39: S({ camera: C.facePip, pip: P({ expr: 'shock' }), red: true, debt: 1, flags: { dark: 0.12 } }),
  S40: S({ camera: C.doorWide, suit: SUIT({ clip: 'walk', expr: 'angry', move: { from: [-3.25, 0, 0.7], to: [2.25, 0, 1.25] } }), red: true, debt: 1, flags: { dark: 0.14 } }),
  S41: S({ camera: C.boardInsert, red: true, debt: 1, flags: { dark: 0.1 } }),
  S42: S({ camera: C.faceSuit, suit: SUIT({ clip: 'talk', expr: 'angry', talk: true }), red: true, debt: 1, flags: { dark: 0.12 } }),
  S43: S({ camera: C.clockWide, red: true, debt: 1, hud: { label: 'STOLEN', value: '40 HRS' } }),
  S44: S({ camera: C.wideDark, pip: P({ expr: 'worried' }), mo: M({ expr: 'worried' }), sis: SIS({ expr: 'sad' }), mom: MOM({ expr: 'worried' }), suit: SUIT({ clip: 'point', expr: 'angry' }), red: true, debt: 1, flags: { dark: 0.18 } }),
  S45: S({ camera: C.faceMo, mo: M({ expr: 'worried', talk: true }), red: true, debt: 1, flags: { dark: 0.1 } }),
  S46: S({ camera: C.faceSis, sis: SIS({ expr: 'sad' }), red: true, debt: 1, flags: { dark: 0.1 } }),
  S47: S({ camera: C.faceMom, mom: MOM({ expr: 'worried' }), red: true, debt: 1, flags: { dark: 0.1 } }),
  S48: S({ camera: C.clockInsert, red: true, debt: 1, hud: { label: 'GLASS CLOCK', value: '40 HRS' } }),
  S49: S({ camera: C.deskWide, pip: P({ clip: 'talk', expr: 'worried', talk: true }), red: true, debt: 1, flags: { dark: 0.1 } }),
  S50: S({ camera: C.clockWide, red: true, debt: 1, hud: { label: 'GLASS CLOCK', value: '40 HRS' } }),
  S51: S({ camera: C.suitMed, suit: SUIT({ clip: 'talk', expr: 'angry', talk: true }), red: true, debt: 1, flags: { dark: 0.12 } }),
  S52: S({ camera: C.faceClock, alarm: true, red: true, debt: 1, hud: { label: 'GLASS CLOCK', value: '40 HRS' } }),
  S53: S({ camera: C.clockWide, red: true, debt: { from: 1, to: 0.82 }, hud: { label: 'GLASS CLOCK', value: '40 HRS' } }),
  S54: S({ camera: C.faceSis, sis: SIS({ expr: 'sad', talk: true }), red: true, debt: 0.82, flags: { dark: 0.12 } }),
  S55: S({ camera: C.faceMom, mom: MOM({ expr: 'worried' }), red: true, debt: 0.82, flags: { dark: 0.12 } }),
  S56: S({ camera: C.faceMo, mo: M({ expr: 'sad' }), red: true, debt: 0.82, flags: { dark: 0.14 } }),
  S57: S({ camera: C.clockInsert, alarm: true, red: true, debt: 0.82, hud: { label: 'GLASS CLOCK', value: '40 HRS' } }),
  S58: S({ camera: C.clockReach, pip: P({ position: [-1.75, 0, -0.8], rotationY: 0, clip: 'reach', expr: 'worried' }), red: true, debt: 0.82, flags: { dark: 0.16 } }),
  S59: S({ camera: C.faceClock, red: true, debt: { from: 0.82, to: 1 }, flags: { dark: 0.35 } }),
  S60: S({ camera: C.wideDark, pip: P({ expr: 'shock' }), mo: M({ expr: 'sad' }), sis: SIS({ expr: 'sad' }), mom: MOM({ expr: 'worried' }), suit: SUIT({ clip: 'point', expr: 'angry' }), red: true, debt: 1, flags: { dark: 0.5 } }),
};

export const episodeTitle = ['WHAT IF YOU NEVER', 'SLEPT AGAIN?'];
export const episodeAccent = 'SLEPT';
