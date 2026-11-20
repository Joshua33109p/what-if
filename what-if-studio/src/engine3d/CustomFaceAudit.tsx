import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { CinematicCamera } from './camera';
import { CustomCharacter } from './customCharacter';
import type { CustomViseme } from './lipsync';
import { Room } from './CustomRigTest';

export const AUDIT_VISEMES: CustomViseme[] = [
  'sil', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR', 'aa', 'E', 'I', 'O', 'U',
];

const CAMERA = [{ t: 0, pos: [0, 1.66, 0.80] as [number, number, number], target: [0, 1.65, 0.02] as [number, number, number], fov: 22 }];

export const CustomFaceAudit: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const viseme = AUDIT_VISEMES[Math.min(frame, AUDIT_VISEMES.length - 1)];
  return (
    <AbsoluteFill style={{ backgroundColor: '#1A1424' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 1.66, 0.8], fov: 22, near: 0.01, far: 60 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Room />
        <CinematicCamera keys={CAMERA} handheld={0} />
        <CustomCharacter
          clip="Idle_Loop"
          clipTime={0}
          expr="neutral"
          viseme={viseme}
          blink={0}
          position={[0, 0, 0]}
          rotationY={0}
        />
      </ThreeCanvas>
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 8,
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 16,
          textShadow: '0 1px 2px #000',
        }}
      >
        {viseme}
      </div>
    </AbsoluteFill>
  );
};
