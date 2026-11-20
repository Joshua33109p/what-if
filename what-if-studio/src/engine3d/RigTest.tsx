import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { RIG_SAMPLE, Character, FaceExpr, LOOKS3D, Viseme } from './character';

type Props = {
  view?: 'body' | 'face' | 'side';
  src?: string;
  clip?: string;
  expr?: FaceExpr;
  viseme?: Viseme;
  blink?: number;
  debugColor?: string;
};

const Scene: React.FC<Props> = ({
  view = 'body',
  src = RIG_SAMPLE,
  clip = 'Idle_Loop',
  expr = 'happy',
  viseme = 'AA',
  blink = 0,
  debugColor,
}) => (
  <>
    <color attach="background" args={['#141020']} />
    <ambientLight intensity={0.55} color="#B9A6D6" />
    <directionalLight position={[2, 4, 4]} intensity={3} color="#FFD2A1" />
    <directionalLight position={[-3, 2, 1]} intensity={1.4} color="#8A6CFF" />
    {view !== 'face' && <gridHelper args={[6, 12, '#6A5A8A', '#2E2640']} position={[0, 0, 0]} />}
    <Character
      model="male"
      src={src}
      look={LOOKS3D.pip}
      clip={clip}
      expr={expr}
      viseme={viseme}
      blink={blink}
      debugColor={debugColor}
      position={[0, 0, 0]}
      rotationY={0}
    />
  </>
);

export const RigTest: React.FC<Props> = (props) => {
  const { width, height } = useVideoConfig();
  const view = props.view ?? 'body';
  const face = view === 'face';
  const side = view === 'side';
  return (
    <AbsoluteFill style={{ backgroundColor: '#141020' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={
          face
            ? { position: [0, 1.68, 0.92], fov: 30, near: 0.01, far: 30 }
            : side
              ? { position: [3.8, 1.0, 0], fov: 35, near: 0.1, far: 40 }
              : { position: [0, 1.0, 3.8], fov: 35, near: 0.1, far: 40 }
        }
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, face ? 1.68 : 0.95, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Scene {...props} view={view} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
