import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { CinematicCamera } from './camera';
import { CustomCharacter } from './customCharacter';
import { Room } from './CustomRigTest';

export const AUDIT_CLIPS = [
  'Idle_Loop',
  'Idle_Talking_Loop',
  'Walk_Loop',
  'Run_Loop',
  'Wave',
  'Point',
  'Shrug',
  'Think',
  'Reach',
  'Throw',
  'Piano',
  'Surgery',
  'Collapse',
  'Interact',
  'Nod',
  'Shake',
] as const;

const CAMERA = [{ t: 0, pos: [3.0, 1.16, 3.5] as [number, number, number], target: [0, 0.96, 0] as [number, number, number], fov: 32 }];

export const CustomClipAudit: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const clip = AUDIT_CLIPS[Math.min(frame, AUDIT_CLIPS.length - 1)];
  return (
    <AbsoluteFill style={{ backgroundColor: '#1A1424' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [3, 1.16, 3.5], fov: 32, near: 0.01, far: 60 }}
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
          clip={clip}
          clipTime={1}
          expr="neutral"
          viseme="sil"
          blink={0}
          debugColor="#00ff00"
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
        {clip}
      </div>
    </AbsoluteFill>
  );
};
