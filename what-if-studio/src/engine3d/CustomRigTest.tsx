import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { CinematicCamera, CameraKey } from './camera';
import { CustomCharacter, CustomHairStyle, CustomLook } from './customCharacter';
import type { FaceExpr } from './character';
import type { CustomViseme, VisemeTimeline } from './lipsync';
import rewindVisemes from '../episodes/rewind/visemes.json';
import borrowVisemes from '../episodes/borrow-skill/visemes.json';
import copyPasteVisemes from '../episodes/copy-paste/visemes.json';

type View = 'body' | 'face' | 'side' | 'walk';
type TimelineId = 'rewind' | 'borrow-skill' | 'copy-paste';

const TIMELINES: Record<TimelineId, VisemeTimeline> = {
  rewind: rewindVisemes as VisemeTimeline,
  'borrow-skill': borrowVisemes as VisemeTimeline,
  'copy-paste': copyPasteVisemes as VisemeTimeline,
};

type Props = {
  view?: View;
  src?: string;
  clip?: string;
  clipTime?: number;
  expr?: FaceExpr;
  viseme?: CustomViseme;
  blink?: number | 'auto';
  hair?: CustomHairStyle;
  debugColor?: string;
  look?: CustomLook;
  timeline?: TimelineId;
};

const CAMERAS: Record<View, CameraKey[]> = {
  body: [
    { t: 0, pos: [0.0, 1.02, 4.7], target: [0, 0.96, 0], fov: 30, ease: 1 },
    { t: 2.0, pos: [0.2, 1.04, 4.45], target: [0, 0.99, 0], fov: 29, ease: 1 },
  ],
  face: [
    { t: 0, pos: [0.0, 1.666, 1.02], target: [0, 1.655, 0.02], fov: 25, ease: 1 },
    { t: 2.0, pos: [0.05, 1.67, 0.98], target: [0, 1.657, 0.02], fov: 24, ease: 1 },
  ],
  side: [
    { t: 0, pos: [4.0, 1.04, 0.7], target: [0, 0.96, 0], fov: 30, ease: 1 },
    { t: 2.0, pos: [3.8, 1.02, 0.85], target: [0, 0.98, 0], fov: 29, ease: 1 },
  ],
  walk: [
    { t: 0, pos: [3.0, 1.16, 3.5], target: [0, 0.96, 0], fov: 32, ease: 1 },
    { t: 2.0, pos: [2.6, 1.18, 3.8], target: [0, 0.98, 0], fov: 31, ease: 1 },
  ],
};

export const Room: React.FC = () => (
  <>
    <color attach="background" args={['#1A1424']} />
    <ambientLight intensity={0.35} color="#BBA8D8" />
    <hemisphereLight args={['#8E7AB8', '#241C2E', 0.55]} />
    <directionalLight position={[2.8, 4.4, 3.2]} intensity={2.6} color="#FFD2A1" />
    <directionalLight position={[-3.2, 2.4, 1.0]} intensity={1.2} color="#7E6BFF" />
    <pointLight position={[-2.2, 2.4, 1.4]} intensity={7} distance={6} color="#FFB36B" />
    <pointLight position={[2.4, 1.8, -1.2]} intensity={3} distance={5} color="#6D7DFF" />

    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#2A2034" roughness={0.95} metalness={0.0} />
    </mesh>
    <mesh position={[0, 1.7, -1.9]}>
      <planeGeometry args={[7.5, 4.6]} />
      <meshStandardMaterial color="#3A2C4A" roughness={1} />
    </mesh>
    <mesh position={[-2.55, 1.72, -1.84]}>
      <planeGeometry args={[1.55, 1.9]} />
      <meshBasicMaterial color="#6C7DB8" side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[-2.55, 1.72, -1.82]}>
      <planeGeometry args={[1.4, 1.75]} />
      <meshBasicMaterial color="#A8B8E8" transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[2.35, 0.78, -0.95]}>
      <cylinderGeometry args={[0.06, 0.09, 1.55, 12]} />
      <meshStandardMaterial color="#4A3A56" roughness={0.7} />
    </mesh>
    <mesh position={[2.35, 1.62, -0.95]}>
      <sphereGeometry args={[0.15, 20, 14]} />
      <meshStandardMaterial color="#FFD2A1" emissive="#FFB36B" emissiveIntensity={1.8} roughness={0.4} />
    </mesh>
    <gridHelper args={[6, 12, '#5C4A72', '#332842']} position={[0, 0.002, 0]} />
  </>
);

const Scene: React.FC<Props> = ({
  view = 'body',
  src,
  clip,
  clipTime,
  expr = 'happy',
  viseme = 'sil',
  blink = 'auto',
  hair = 'short',
  debugColor,
  look,
  timeline,
}) => {
  const activeClip = clip ?? (view === 'walk' ? 'Walk_Loop' : 'Idle_Loop');
  return (
    <>
      <Room />
      <CinematicCamera keys={CAMERAS[view]} handheld={0.0035} seed={view.length} />
      <CustomCharacter
        src={src}
        look={look}
        clip={activeClip}
        clipTime={clipTime}
        expr={expr}
        viseme={viseme}
        visemeTimeline={timeline ? TIMELINES[timeline] : undefined}
        blink={blink}
        hair={hair}
        debugColor={debugColor}
        position={[0, 0, 0]}
        rotationY={0}
      />
    </>
  );
};

export const CustomRigTest: React.FC<Props> = (props) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#1A1424' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 1.02, 4.7], fov: 30, near: 0.01, far: 60 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Scene {...props} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
