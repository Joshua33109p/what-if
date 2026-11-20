export type Seg = {
  shot: string;
  a: number;
  b: number;
  t0: number;
  t1: number;
  look?: string;
  line?: string;
};

export type ShotInfo = { id: string; size: string; key: number; len: number; first: number; line?: string; note?: string };
export type Fx = { f: number; kind: 'flash' | 'shake'; color?: string; o?: number; len?: number; amp?: number };
export type Timeline = {
  slug: string;
  title: string;
  fps: number;
  total: number;
  segments: Seg[];
  shots: ShotInfo[];
  fx: Fx[];
  audio: { voice?: string; sfx?: string; music?: string; voiceVol?: number; sfxVol?: number; musicVol?: number };
};
