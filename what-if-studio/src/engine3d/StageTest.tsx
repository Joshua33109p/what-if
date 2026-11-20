import React, { useLayoutEffect } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RIG_SAMPLE, Character, LOOKS3D } from './character';

const ease = (k: number) => k * k * (3 - 2 * k);

const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  useLayoutEffect(() => {
    const k = ease(Math.min(1, frame / 89));
    camera.position.set(3.6 - 0.8 * k, 1.75 - 0.15 * k, 4.4 - 0.7 * k);
    camera.lookAt(0.08 * k, 1.05, 0);
  }, [camera, frame]);
  return null;
};

const Window: React.FC = () => (
  <group position={[1.65, 1.55, -2.96]}>
    <mesh>
      <planeGeometry args={[2.5, 1.8]} />
      <meshBasicMaterial color="#5C86C8" />
    </mesh>
    <mesh position={[0, 0, 0.012]}>
      <planeGeometry args={[2.3, 1.6]} />
      <meshBasicMaterial color="#9CC4F2" transparent opacity={0.35} />
    </mesh>
    {[-1.25, 0, 1.25].map((x) => (
      <mesh key={`v${x}`} position={[x, 0, 0.03]}>
        <boxGeometry args={[0.05, 1.86, 0.05]} />
        <meshStandardMaterial color="#241C30" roughness={0.8} />
      </mesh>
    ))}
    {[-0.9, 0, 0.9].map((y) => (
      <mesh key={`h${y}`} position={[0, y, 0.03]}>
        <boxGeometry args={[2.56, 0.05, 0.05]} />
        <meshStandardMaterial color="#241C30" roughness={0.8} />
      </mesh>
    ))}
    <mesh position={[0, 0, -0.02]}>
      <boxGeometry args={[2.62, 1.92, 0.08]} />
      <meshStandardMaterial color="#241C30" roughness={0.85} />
    </mesh>
  </group>
);

const DeskLamp: React.FC = () => (
  <group position={[-1.55, 0.79, -1.55]}>
    <mesh position={[0, 0.03, 0]}>
      <cylinderGeometry args={[0.18, 0.22, 0.06, 20]} />
      <meshStandardMaterial color="#3A2E2A" roughness={0.5} metalness={0.4} />
    </mesh>
    <mesh position={[0, 0.3, 0]}>
      <cylinderGeometry args={[0.025, 0.025, 0.55, 10]} />
      <meshStandardMaterial color="#3A2E2A" roughness={0.5} metalness={0.4} />
    </mesh>
    <mesh position={[0.18, 0.58, 0]} rotation-z={-0.45}>
      <coneGeometry args={[0.2, 0.3, 20, 1, true]} />
      <meshStandardMaterial color="#E8B36A" emissive="#FFB067" emissiveIntensity={0.5} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0.26, 0.5, 0]}>
      <sphereGeometry args={[0.055, 16, 12]} />
      <meshBasicMaterial color="#FFE0A8" />
    </mesh>
    <pointLight position={[0.26, 0.5, 0]} intensity={16} distance={5} decay={2} color="#FFB067" />
  </group>
);

const Desk: React.FC = () => (
  <group>
    <mesh position={[-1.5, 0.74, -1.6]}>
      <boxGeometry args={[2.4, 0.09, 0.85]} />
      <meshStandardMaterial color="#5A3E2E" roughness={0.7} />
    </mesh>
    {[
      [-2.55, 0.37, -1.9],
      [-0.45, 0.37, -1.9],
      [-2.55, 0.37, -1.3],
      [-0.45, 0.37, -1.3],
    ].map((p) => (
      <mesh key={p.join(',')} position={p as [number, number, number]}>
        <boxGeometry args={[0.08, 0.74, 0.08]} />
        <meshStandardMaterial color="#3E2A20" roughness={0.8} />
      </mesh>
    ))}
    <mesh position={[-1.9, 0.81, -1.5]}>
      <boxGeometry args={[0.38, 0.05, 0.26]} />
      <meshStandardMaterial color="#C9B79A" roughness={0.8} />
    </mesh>
    <mesh position={[-1.9, 0.84, -1.5]}>
      <boxGeometry args={[0.3, 0.015, 0.2]} />
      <meshStandardMaterial color="#F0E4CE" roughness={0.9} />
    </mesh>
  </group>
);

const Room: React.FC = () => (
  <group>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial color="#2A2238" roughness={0.95} />
    </mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0.35]}>
      <planeGeometry args={[3.6, 2.8]} />
      <meshStandardMaterial color="#4A2E3A" roughness={1} />
    </mesh>
    <mesh position={[0, 2.1, -3]}>
      <planeGeometry args={[14, 4.2]} />
      <meshStandardMaterial color="#342A46" roughness={0.95} />
    </mesh>
    <mesh position={[-3.5, 2.1, 0]} rotation-y={Math.PI / 2}>
      <planeGeometry args={[6, 4.2]} />
      <meshStandardMaterial color="#2E2540" roughness={0.95} />
    </mesh>
    <mesh position={[-3.46, 1.9, 0.2]} rotation-y={Math.PI / 2}>
      <planeGeometry args={[1.2, 0.8]} />
      <meshStandardMaterial color="#1B1526" roughness={0.9} />
    </mesh>
    <mesh position={[-3.44, 1.9, 0.2]} rotation-y={Math.PI / 2}>
      <planeGeometry args={[1.02, 0.62]} />
      <meshStandardMaterial color="#7A4A3A" roughness={0.9} />
    </mesh>
    <Window />
    <Desk />
    <DeskLamp />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.014, 0.25]}>
      <circleGeometry args={[0.52, 32]} />
      <meshBasicMaterial color="#0B0816" transparent opacity={0.42} />
    </mesh>
  </group>
);

type Props = { debugColor?: string };

const Scene: React.FC<Props> = ({ debugColor }) => (
  <>
    <color attach="background" args={['#141020']} />
    <fog attach="fog" args={['#141020', 7, 16]} />
    <ambientLight intensity={0.5} color="#B9A6D6" />
    <directionalLight position={[2.4, 3.4, 3.6]} intensity={2.8} color="#FFD2A1" />
    <directionalLight position={[-3.2, 2.6, -2.8]} intensity={1.6} color="#7FA8FF" />
    <pointLight position={[1.65, 1.55, -2.2]} intensity={14} distance={7} decay={2} color="#8DB8FF" />
    <Room />
    <Character
      model="male"
      src={RIG_SAMPLE}
      look={LOOKS3D.pip}
      clip="Idle_Loop"
      expr="neutral"
      viseme="rest"
      blink={0}
      debugColor={debugColor}
      position={[0, 0, 0.2]}
      rotationY={0}
    />
    <CameraRig />
  </>
);

export const StageTest: React.FC<Props> = ({ debugColor }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#141020' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [3.6, 1.75, 4.4], fov: 35, near: 0.1, far: 40 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <Scene debugColor={debugColor} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
