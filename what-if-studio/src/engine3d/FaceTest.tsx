import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Character, FaceExpr, LOOKS3D, ModelId, Viseme } from './character';

type Props = {
  model?: ModelId;
  expr?: FaceExpr;
  viseme?: Viseme;
  blink?: number;
};

const FaceScene: React.FC<Props> = ({ model = 'male', expr = 'happy', viseme = 'AA', blink = 0 }) => (
  <>
    <color attach="background" args={['#1A1524']} />
    <ambientLight intensity={0.7} color="#B9A6D6" />
    <directionalLight position={[1.5, 3.2, 2.5]} intensity={3.2} color="#FFD2A1" />
    <directionalLight position={[-2.2, 2.0, 1.0]} intensity={1.6} color="#FF8A63" />
    <Character
      model={model}
      look={model === 'male' ? LOOKS3D.pip : LOOKS3D.sis}
      clip="Idle_Loop"
      expr={expr}
      viseme={viseme}
      blink={blink}
      position={[0, 0, 0]}
      rotationY={0}
    />
  </>
);

export const FaceTest: React.FC<Props> = (props) => {
  const { width, height } = useVideoConfig();
  const model = props.model ?? 'male';
  const camY = model === 'male' ? 1.67 : 1.625;
  return (
    <AbsoluteFill style={{ backgroundColor: '#1A1524' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, camY, 0.82], fov: 30, near: 0.01, far: 30 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, camY, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <FaceScene {...props} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
