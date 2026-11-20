import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <color attach="background" args={['#101024']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={3} color="#FFD2A1" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2A2233" roughness={0.9} />
      </mesh>
      <mesh rotation={[0.4, frame * 0.03, 0.2]} position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color="#F2B33D" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshBasicMaterial color="#8A6CFF" />
      </mesh>
    </>
  );
};

export const GLTest: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#101024' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 1.2, 4.2], fov: 35 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <Scene />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
