import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Character, LOOKS3D } from './character';

const Scene: React.FC = () => (
  <>
    <color attach="background" args={['#141020']} />
    <ambientLight intensity={0.8} />
    <directionalLight position={[2, 4, 4]} intensity={3} color="#FFD2A1" />
    <directionalLight position={[-3, 2, 1]} intensity={1.2} color="#8A6CFF" />
    <gridHelper args={[6, 12, '#6A5A8A', '#2E2640']} position={[0, 0, 0]} />
    <axesHelper args={[1.2]} />
    <mesh position={[0.6, 0.5, 0]}>
      <boxGeometry args={[0.08, 0.08, 0.08]} />
      <meshBasicMaterial color="#FF3B3B" />
    </mesh>
    <mesh position={[0, 0.5, 0.6]}>
      <boxGeometry args={[0.08, 0.08, 0.08]} />
      <meshBasicMaterial color="#3B7BFF" />
    </mesh>
    <Character model="male" look={LOOKS3D.pip} clip="Idle_Loop" position={[0, 0, 0]} rotationY={0} expr="happy" viseme="AA" />
  </>
);

export const CharacterFront: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#141020' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 1.0, 3.2], fov: 35, near: 0.1, far: 40 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0.95, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Scene />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
