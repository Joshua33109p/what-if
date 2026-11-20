import React, { useLayoutEffect } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Character, LOOKS3D, RIG_SAMPLE } from '../../engine3d/character';
import { CustomCharacter } from '../../engine3d/customCharacter';
import { AraCharacter } from '../../engine3d/araCharacter';
import type { VisemeTimeline } from '../../engine3d/lipsync';
import borrowVisemes from './visemes.json';
import { SkillLibrary, SkillLibraryLights, SkillOrb } from '../../engine3d/SkillLibrary';
import episode from './episode.json';

type Vec3 = [number, number, number];

type HeroView = {
  position: Vec3;
  rotationY: number;
  clip: string;
  expr: 'neutral' | 'happy' | 'worried' | 'shock' | 'smug' | 'sad' | 'angry';
  lookYaw?: number;
  lookPitch?: number;
};

type MoView = {
  position: Vec3;
  rotationY: number;
  clip: string;
  clipTime: number;
  expr: 'neutral' | 'happy' | 'worried' | 'shock' | 'smug' | 'sad' | 'angry';
};

type ShotView = {
  camera: Vec3;
  target: Vec3;
  fov: number;
  hero: HeroView;
  mo?: MoView;
  ball?: Vec3;
  orb?: Vec3;
  title?: boolean;
  schematic?: boolean;
  dark?: number;
};

const SHOTS: Record<string, ShotView> = {
  S1: {
    camera: [-0.2, 1.55, 2.7],
    target: [-1.55, 1.12, 0.5],
    fov: 35,
    hero: { position: [-1.32, 0, 0.55], rotationY: -1.15, clip: 'piano', expr: 'happy', lookYaw: 0.15 },
  },
  S2: {
    camera: [-1.05, 1.18, 1.12],
    target: [-1.85, 0.98, 0.62],
    fov: 28,
    hero: { position: [-1.32, 0, 0.55], rotationY: -1.15, clip: 'piano', expr: 'happy', lookYaw: 0.1 },
  },
  S3: {
    camera: [3.35, 1.6, 2.5],
    target: [2.1, 1.05, -0.05],
    fov: 35,
    hero: { position: [2.15, 0, -0.58], rotationY: 0, clip: 'surgery', expr: 'worried', lookPitch: -0.1 },
  },
  S4: {
    camera: [2.72, 1.22, 1.08],
    target: [2.15, 1.0, 0.08],
    fov: 28,
    hero: { position: [2.15, 0, -0.58], rotationY: 0, clip: 'surgery', expr: 'worried', lookPitch: -0.1 },
  },
  S5: {
    camera: [1.95, 0.85, 3.15],
    target: [0.2, 1.45, -1.0],
    fov: 40,
    hero: { position: [0.2, 0, 0.9], rotationY: Math.PI, clip: 'throw', expr: 'smug' },
    ball: [0.2, 2.45, -1.0],
  },
  S6: {
    camera: [0.2, 1.8, 0.35],
    target: [0.2, 1.95, -2.55],
    fov: 28,
    hero: { position: [0.2, 0, 0.9], rotationY: Math.PI, clip: 'throw', expr: 'smug' },
    ball: [0.2, 1.95, -2.45],
  },
  S7: {
    camera: [3.8, 1.95, 5.0],
    target: [0.0, 1.2, -0.4],
    fov: 40,
    hero: { position: [0.0, 0, 0.6], rotationY: 0, clip: 'idle', expr: 'neutral' },
    title: true,
  },
  S8: {
    camera: [2.55, 1.55, 2.65],
    target: [0.15, 1.1, 1.35],
    fov: 35,
    hero: { position: [-0.5, 0, 1.05], rotationY: 0.7, clip: 'reach', expr: 'smug', lookYaw: 0.15 },
    mo: { position: [0.55, 0, 2.0], rotationY: 0, clip: 'Interact', clipTime: 0.5, expr: 'worried' },
    orb: [-0.08, 1.14, 1.16],
  },
  S9: {
    camera: [1.25, 1.18, 2.7],
    target: [0.6, 0.98, 1.92],
    fov: 28,
    hero: { position: [-0.5, 0, 1.05], rotationY: 0.7, clip: 'reach', expr: 'worried' },
    mo: { position: [0.55, 0, 2.0], rotationY: 0, clip: 'Interact', clipTime: 0.62, expr: 'worried' },
    orb: [0.55, 0.99, 1.83],
  },
  S10: {
    camera: [0.2, 1.82, 2.6],
    target: [0.2, 1.82, 1.08],
    fov: 30,
    hero: { position: [-0.5, 0, 1.05], rotationY: 0.7, clip: 'idle', expr: 'worried' },
    schematic: true,
  },
  S11: {
    camera: [-0.5, 1.66, 2.05],
    target: [-0.5, 1.62, 1.05],
    fov: 25,
    hero: { position: [-0.5, 0, 1.05], rotationY: 0.2, clip: 'idle', expr: 'worried', lookYaw: 0.12 },
  },
  S12: {
    camera: [3.8, 1.95, 5.0],
    target: [0.0, 1.2, -0.4],
    fov: 40,
    hero: { position: [-0.5, 0, 1.05], rotationY: 0.55, clip: 'reach', expr: 'worried' },
    mo: { position: [0.55, 0, 2.0], rotationY: 0.7, clip: 'Interact', clipTime: 0.75, expr: 'sad' },
    dark: 0.42,
  },
};

const CameraRig: React.FC<{ view: ShotView }> = ({ view }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = view.fov;
    cam.near = 0.05;
    cam.far = 40;
    cam.position.set(...view.camera);
    cam.lookAt(new THREE.Vector3(...view.target));
    cam.updateProjectionMatrix();
  }, [camera, view]);
  return null;
};

const TitleCard: React.FC = () => (
  <div style={{ position: 'absolute', left: 110, bottom: 130, maxWidth: 1500 }}>
    <div
      style={{
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        fontSize: 46,
        fontWeight: 700,
        letterSpacing: 12,
        color: '#F2D7A8',
        textShadow: '0 3px 18px rgba(0,0,0,0.75)',
      }}
    >
      WHAT IF YOU COULD
    </div>
    <div
      style={{
        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
        fontSize: 124,
        fontWeight: 900,
        lineHeight: 0.9,
        letterSpacing: -2,
        color: '#FFF3DD',
        textShadow: '0 8px 38px rgba(0,0,0,0.8)',
      }}
    >
      <span style={{ color: '#FFB067' }}>BORROW</span> A SKILL?
    </div>
  </div>
);

const Schematic: React.FC = () => (
  <div style={{ position: 'absolute', left: 110, bottom: 110, fontFamily: '"Courier New", monospace', color: '#9FF4E6' }}>
    <div style={{ fontSize: 22, letterSpacing: 5, opacity: 0.8 }}>CEREBELLUM</div>
    <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1, textShadow: '0 0 24px rgba(124,224,211,0.55)' }}>80%</div>
    <div style={{ fontSize: 20, letterSpacing: 2, opacity: 0.75 }}>69.03B / 86.06B NEURONS</div>
    <div style={{ marginTop: 14, width: 420, height: 2, background: 'linear-gradient(90deg,#7CE0D3,rgba(124,224,211,0.05))' }} />
  </div>
);

const Darken: React.FC<{ amount: number }> = ({ amount }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(circle at 50% 45%, rgba(8,5,16,${amount * 0.35}) 0%, rgba(8,5,16,${amount}) 62%, rgba(4,2,10,${Math.min(0.92, amount + 0.18)}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

type RigKind = 'mpfb' | 'custom' | 'ara';

const Scene: React.FC<{ shot: string; keyFrame: number; debugColor?: string; rig?: RigKind }> = ({
  shot,
  keyFrame,
  debugColor,
  rig = 'mpfb',
}) => {
  const view = SHOTS[shot] ?? SHOTS.S1;
  const t = keyFrame / 30;
  return (
    <>
      <SkillLibraryLights />
      <SkillLibrary t={t} ball={view.ball} />
      {rig === 'ara' ? (
        <AraCharacter
          look={LOOKS3D.pip}
          clip={view.hero.clip}
          clipTime={t}
          expr={view.hero.expr}
          visemeTimeline={borrowVisemes as VisemeTimeline}
          blink="auto"
          position={view.hero.position}
          rotationY={view.hero.rotationY}
          lookYaw={view.hero.lookYaw ?? 0}
          lookPitch={view.hero.lookPitch ?? 0}
          debugColor={debugColor}
        />
      ) : rig === 'custom' ? (
        <CustomCharacter
          look={LOOKS3D.pip}
          clip={view.hero.clip}
          clipTime={t}
          expr={view.hero.expr}
          visemeTimeline={borrowVisemes as VisemeTimeline}
          blink="auto"
          hair="short"
          position={view.hero.position}
          rotationY={view.hero.rotationY}
          lookYaw={view.hero.lookYaw ?? 0}
          lookPitch={view.hero.lookPitch ?? 0}
          debugColor={debugColor}
        />
      ) : (
        <Character
          model="female"
          src={RIG_SAMPLE}
          look={LOOKS3D.pip}
          clip={view.hero.clip}
          clipTime={t}
          expr={view.hero.expr}
          viseme="rest"
          blink={0}
          position={view.hero.position}
          rotationY={view.hero.rotationY}
          lookYaw={view.hero.lookYaw ?? 0}
          lookPitch={view.hero.lookPitch ?? 0}
          debugColor={debugColor}
        />
      )}
      {view.mo ? (
        rig === 'ara' ? (
          <AraCharacter
            src="models/ara/ara-mo.glb"
            look={LOOKS3D.mo}
            clip={view.mo.clip}
            clipTime={view.mo.clipTime}
            expr={view.mo.expr}
            blink="auto"
            visemeTimeline={borrowVisemes as VisemeTimeline}
            position={view.mo.position}
            rotationY={view.mo.rotationY}
            scale={0.96}
            debugColor={debugColor}
          />
        ) : rig === 'custom' ? (
          <CustomCharacter
            look={LOOKS3D.mo}
            clip={view.mo.clip}
            clipTime={view.mo.clipTime}
            expr={view.mo.expr}
            blink="auto"
            hair="bob"
            visemeTimeline={borrowVisemes as VisemeTimeline}
            position={view.mo.position}
            rotationY={view.mo.rotationY}
            scale={0.96}
            debugColor={debugColor}
          />
        ) : (
          <Character
            model="male"
            look={LOOKS3D.mo}
            clip={view.mo.clip}
            clipTime={view.mo.clipTime}
            expr={view.mo.expr}
            viseme="rest"
            blink={0}
            position={view.mo.position}
            rotationY={view.mo.rotationY}
            scale={0.96}
          />
        )
      ) : null}
      {view.orb ? <SkillOrb position={view.orb} color="#FFC46A" radius={0.085} t={t} /> : null}
      <CameraRig view={view} />
    </>
  );
};

export type Board3DProps = { shot?: string; debugColor?: string; rig?: RigKind };

export const BorrowSkillBoard3D: React.FC<Board3DProps> = ({ shot = 'S1', debugColor, rig = 'mpfb' }) => {
  const { width, height } = useVideoConfig();
  const data = (episode as { shots: { id: string; key: number }[] }).shots.find((s) => s.id === shot) ?? {
    id: 'S1',
    key: 20,
  };
  const view = SHOTS[shot] ?? SHOTS.S1;
  return (
    <AbsoluteFill style={{ backgroundColor: '#141020' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: view.camera, fov: view.fov, near: 0.05, far: 40 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <Scene shot={shot} keyFrame={data.key} debugColor={debugColor} rig={rig} />
      </ThreeCanvas>
      {view.title ? <TitleCard /> : null}
      {view.schematic ? <Schematic /> : null}
      {view.dark ? <Darken amount={view.dark} /> : null}
    </AbsoluteFill>
  );
};
