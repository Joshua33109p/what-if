import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Character, LOOKS3D } from './character';

// A validation composition, not an episode: confirms the CC0 rigs load, face the camera,
// skin correctly, and receive the dusk lighting before any episode is built on them.

const Room: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial color="#2A2233" roughness={0.9} />
    </mesh>
    <mesh position={[0, 2.2, -2.6]}>
      <boxGeometry args={[9, 4.4, 0.15]} />
      <meshStandardMaterial color="#3A2C46" roughness={0.95} />
    </mesh>
    <mesh position={[-4.5, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
      <boxGeometry args={[5.2, 4.4, 0.15]} />
      <meshStandardMaterial color="#33283D" roughness={0.95} />
    </mesh>
    <mesh position={[1.9, 2.0, -2.5]}>
      <planeGeometry args={[2.6, 2.4]} />
      <meshBasicMaterial color="#FFB26B" />
    </mesh>
    <mesh position={[1.9, 2.0, -2.48]}>
      <planeGeometry args={[2.9, 2.7]} />
      <meshBasicMaterial color="#1A1220" />
    </mesh>
    <pointLight position={[1.9, 2.2, -2.0]} color="#FFB26B" intensity={28} distance={9} decay={2} />
    <pointLight position={[-2.4, 2.4, 1.0]} color="#8A6CFF" intensity={10} distance={8} decay={2} />
    <mesh position={[0, 0.02, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.5, 48]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} />
    </mesh>
  </group>
);

const TestScene: React.FC = () => (
  <>
    <color attach="background" args={['#0E0C1E']} />
    <fog attach="fog" args={['#0E0C1E', 6, 16]} />
    <ambientLight intensity={0.35} color="#8C7BB8" />
    <directionalLight position={[3, 5, 4]} intensity={2.4} color="#FFD2A1" />
    <directionalLight position={[-4, 3, -2]} intensity={1.2} color="#FF7A59" />
    <Room />
    <Character model="male" look={LOOKS3D.pip} clip="Idle_Talking_Loop" position={[-0.65, 0, -0.8]} rotationY={0.18} expr="happy" viseme="AA" />
    <Character model="female" look={LOOKS3D.sis} clip="Idle_Loop" position={[0.75, 0, -0.8]} rotationY={-0.18} expr="worried" blink={0} />
    <mesh position={[0, 0.85, 0.6]}>
      <boxGeometry args={[1.2, 0.08, 0.7]} />
      <meshStandardMaterial color="#4A3546" roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.42, 0.6]}>
      <boxGeometry args={[0.9, 0.8, 0.55]} />
      <meshStandardMaterial color="#332430" roughness={0.8} />
    </mesh>
  </>
);

export const ModelTest: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#0E0C1E' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 1.35, 4.6], fov: 35, near: 0.1, far: 60 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 1.0, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <TestScene />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
