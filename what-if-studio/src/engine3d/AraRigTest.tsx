import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { CinematicCamera, CameraKey } from './camera';
import { AraCharacter, AraLook } from './araCharacter';
import type { FaceExpr } from './character';
import type { CustomViseme, VisemeTimeline } from './lipsync';
import { Room } from './CustomRigTest';
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
  debugColor?: string;
  look?: AraLook;
  timeline?: TimelineId;
};

const CAMERAS: Record<View, CameraKey[]> = {
  body: [
    { t: 0, pos: [0.0, 1.0, 4.5], target: [0, 0.9, 0], fov: 30, ease: 1 },
    { t: 2.0, pos: [0.2, 1.02, 4.25], target: [0, 0.92, 0], fov: 29, ease: 1 },
  ],
  face: [
    { t: 0, pos: [0.0, 1.5, 0.95], target: [0, 1.48, 0.02], fov: 24, ease: 1 },
    { t: 2.0, pos: [0.05, 1.5, 0.9], target: [0, 1.48, 0.02], fov: 23, ease: 1 },
  ],
  side: [
    { t: 0, pos: [3.9, 1.0, 0.7], target: [0, 0.9, 0], fov: 30, ease: 1 },
    { t: 2.0, pos: [3.7, 1.0, 0.85], target: [0, 0.92, 0], fov: 29, ease: 1 },
  ],
  walk: [
    { t: 0, pos: [3.0, 1.1, 3.4], target: [0, 0.9, 0], fov: 32, ease: 1 },
    { t: 2.0, pos: [2.6, 1.12, 3.7], target: [0, 0.92, 0], fov: 31, ease: 1 },
  ],
};

const Scene: React.FC<Props> = ({
  view = 'body',
  src,
  clip,
  clipTime,
  expr = 'happy',
  viseme = 'sil',
  blink = 'auto',
  debugColor,
  look,
  timeline,
}) => {
  const activeClip = clip ?? (view === 'walk' ? 'walk' : 'idle');
  return (
    <>
      <Room />
      <CinematicCamera keys={CAMERAS[view]} handheld={0.0035} seed={view.length} />
      <AraCharacter
        src={src}
        look={look}
        clip={activeClip}
        clipTime={clipTime}
        expr={expr}
        viseme={viseme}
        visemeTimeline={timeline ? TIMELINES[timeline] : undefined}
        blink={blink}
        debugColor={debugColor}
        position={[0, 0, 0]}
        rotationY={0}
      />
    </>
  );
};

export const AraRigTest: React.FC<Props> = (props) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#1A1424' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 1.0, 4.5], fov: 30, near: 0.01, far: 60 }}
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
