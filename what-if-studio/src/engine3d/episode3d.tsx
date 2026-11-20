import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import type { Timeline } from '../timeline';

// A 3D episode is the same timeline as a drawn episode, but every shot is a real Three.js scene.
// The timeline's segments choose the shot, and the shot's own clock drives the camera and the rig.

export type Shot3DProps = {
  t: number; // the shot's clock, in frames
  len: number; // how long the shot's clock runs, in frames
  f: number; // the global frame
  total: number; // the episode length, in frames
};

export type OverlayContext = {
  title?: string[];
  accent?: string;
};

export type Shot3DDef = {
  Scene: React.FC<Shot3DProps>;
  Overlay?: React.FC<Shot3DProps & OverlayContext>;
};

export type Shot3DMap = Record<string, Shot3DDef>;

export type Episode3DProps = {
  timeline: Timeline;
  shots: Shot3DMap;
  title?: string[];
  accent?: string;
  grain?: boolean;
  vignette?: boolean;
  bg?: string;
};

const segAt = (tl: Timeline, f: number) => tl.segments.find((s) => f >= s.a && f < s.b) ?? tl.segments[tl.segments.length - 1];
const clockAt = (s: Timeline['segments'][number], f: number) => s.t0 + ((s.t1 - s.t0) * (f - s.a)) / Math.max(1, s.b - s.a);

const fxAt = (tl: Timeline, f: number) => {
  let flash: { color: string; o: number } | null = null;
  let x = 0;
  let y = 0;
  for (const e of tl.fx) {
    if (e.kind === 'flash') {
      if (f === e.f) flash = { color: e.color ?? '#FFFFFF', o: e.o ?? 0.85 };
      else if (f === e.f + 1) flash = { color: e.color ?? '#FFFFFF', o: (e.o ?? 0.85) * 0.35 };
    } else if (e.kind === 'shake') {
      const len = e.len ?? 8;
      const amp = e.amp ?? 12;
      if (f >= e.f && f < e.f + len) {
        const k = amp * (1 - (f - e.f) / len);
        x += Math.sin(f * 2.9) * k;
        y += Math.cos(f * 3.7) * k * 0.7;
      }
    }
  }
  return { flash, x, y };
};

const Grade: React.FC<{ f: number; grain: boolean; vignette: boolean }> = ({ f, grain, vignette }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="ep3dVig" cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.58} />
        </radialGradient>
      </defs>
      {vignette ? <rect width="1920" height="1080" fill="url(#ep3dVig)" /> : null}
    </svg>
    {grain ? (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${staticFile('grain.png')})`,
          backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
          opacity: 0.6,
        }}
      />
    ) : null}
  </div>
);

const TitleCard: React.FC<{ title?: string[]; accent?: string }> = ({ title, accent }) => {
  const kicker = title?.[0] ?? 'WHAT IF YOU COULD';
  const line = title?.[1] ?? '';
  const upper = line.toUpperCase();
  const accentUpper = (accent ?? '').toUpperCase();
  const at = accentUpper ? upper.indexOf(accentUpper) : -1;
  const before = at >= 0 ? line.slice(0, at) : line;
  const hit = at >= 0 ? line.slice(at, at + accentUpper.length) : '';
  const after = at >= 0 ? line.slice(at + accentUpper.length) : '';
  return (
    <div style={{ position: 'absolute', left: 110, bottom: 122, maxWidth: 1540, pointerEvents: 'none' }}>
      <div
        style={{
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: 12,
          color: '#F2D7A8',
          textShadow: '0 3px 18px rgba(0,0,0,0.8)',
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
          fontSize: 116,
          fontWeight: 900,
          lineHeight: 0.92,
          letterSpacing: -2,
          color: '#FFF3DD',
          textShadow: '0 8px 38px rgba(0,0,0,0.85)',
        }}
      >
        {before}
        {hit ? <span style={{ color: '#FFB067' }}>{hit}</span> : null}
        {after}
      </div>
    </div>
  );
};

const BrainHud: React.FC<{ p: number }> = ({ p }) => (
  <div style={{ position: 'absolute', left: 110, bottom: 112, fontFamily: '"Courier New", monospace', color: '#9FF4E6' }}>
    <div style={{ fontSize: 22, letterSpacing: 5, opacity: 0.8 }}>CEREBELLUM</div>
    <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, textShadow: '0 0 24px rgba(124,224,211,0.55)' }}>80%</div>
    <div style={{ fontSize: 20, letterSpacing: 2, opacity: 0.75 }}>69.03B / 86.06B NEURONS</div>
    <div style={{ marginTop: 14, width: 430, height: 3, background: 'rgba(124,224,211,0.18)' }}>
      <div style={{ width: `${Math.min(1, p) * 100}%`, height: '100%', background: '#7CE0D3', boxShadow: '0 0 16px #7CE0D3' }} />
    </div>
  </div>
);

const CountdownHud: React.FC<{ f: number; total: number }> = ({ f, total }) => {
  const remaining = Math.max(0, 600 * (1 - f / Math.max(1, total)));
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  return (
    <div style={{ position: 'absolute', right: 92, top: 76, fontFamily: '"Courier New", monospace', color: '#FFD7A0', textAlign: 'right' }}>
      <div style={{ fontSize: 18, letterSpacing: 4, opacity: 0.75 }}>SKILL REMAINING</div>
      <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1, textShadow: '0 0 18px rgba(255,176,103,0.7)' }}>
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </div>
    </div>
  );
};

const Darken: React.FC<{ amount: number }> = ({ amount }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(circle at 50% 45%, rgba(8,5,16,${amount * 0.3}) 0%, rgba(8,5,16,${amount}) 62%, rgba(4,2,10,${Math.min(0.94, amount + 0.18)}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

export type OverlayFlags = {
  title?: boolean;
  brain?: boolean;
  countdown?: boolean;
  dark?: number;
};

export const OverlayLayer: React.FC<Shot3DProps & OverlayContext & { flags: OverlayFlags }> = ({
  t,
  len,
  f,
  total,
  title,
  accent,
  flags,
}) => {
  const p = Math.max(0, Math.min(1, t / Math.max(1, len)));
  return (
    <>
      {flags.dark ? <Darken amount={flags.dark} /> : null}
      {flags.title ? <TitleCard title={title} accent={accent} /> : null}
      {flags.brain ? <BrainHud p={p} /> : null}
      {flags.countdown ? <CountdownHud f={f} total={total} /> : null}
    </>
  );
};

export const Episode3D: React.FC<Episode3DProps> = ({
  timeline: tl,
  shots,
  title,
  accent,
  grain = true,
  vignette = true,
  bg = '#141020',
}) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const seg = segAt(tl, f);
  const def = shots[seg.shot] ?? shots[Object.keys(shots)[0]];
  if (!def) return null;
  const t = clockAt(seg, f);
  const len = Math.max(1, seg.b - seg.a);
  const { flash, x, y } = fxAt(tl, f);
  const A = tl.audio;
  const props: Shot3DProps = { t, len, f, total: tl.total };
  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${x || y ? 1.02 : 1})` }}>
        <ThreeCanvas
          width={width}
          height={height}
          camera={{ position: [3.8, 1.95, 5], fov: 40, near: 0.05, far: 60 }}
          gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <def.Scene {...props} />
        </ThreeCanvas>
      </AbsoluteFill>
      {def.Overlay ? <def.Overlay {...props} title={title} accent={accent} /> : null}
      <Grade f={f} grain={grain} vignette={vignette} />
      {flash ? <AbsoluteFill style={{ backgroundColor: flash.color, opacity: flash.o }} /> : null}
      {A.voice ? <Audio src={staticFile(A.voice)} volume={A.voiceVol ?? 1} /> : null}
      {A.sfx ? <Audio src={staticFile(A.sfx)} volume={A.sfxVol ?? 1} /> : null}
      {A.music ? <Audio src={staticFile(A.music)} volume={A.musicVol ?? 1} /> : null}
    </AbsoluteFill>
  );
};

export const Board3D: React.FC<Episode3DProps> = ({
  timeline: tl,
  shots,
  title,
  accent,
  grain = true,
  vignette = true,
  bg = '#141020',
}) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const info = tl.shots[Math.min(f, tl.shots.length - 1)];
  const def = shots[info.id] ?? shots[Object.keys(shots)[0]];
  if (!def) return null;
  const props: Shot3DProps = { t: info.key, len: info.len, f: info.first + info.key, total: tl.total };
  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [3.8, 1.95, 5], fov: 40, near: 0.05, far: 60 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <def.Scene {...props} />
      </ThreeCanvas>
      {def.Overlay ? <def.Overlay {...props} title={title} accent={accent} /> : null}
      <Grade f={info.key} grain={grain} vignette={vignette} />
    </AbsoluteFill>
  );
};

export const defineEpisode3D = (id: string, p: Episode3DProps) => ({
  id,
  total: p.timeline.total,
  shotCount: p.timeline.shots.length,
  Main: () => <Episode3D {...p} />,
  Board: () => <Board3D {...p} />,
});

export type Episode3DDef = ReturnType<typeof defineEpisode3D>;
