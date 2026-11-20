// Oculus viseme timeline sampling for narration. Timelines are generated from ElevenLabs
// word-level alignment by scripts/lipsync.py; sampling is deterministic at any frame.
export type CustomViseme =
  | 'sil'
  | 'PP'
  | 'FF'
  | 'TH'
  | 'DD'
  | 'kk'
  | 'CH'
  | 'SS'
  | 'nn'
  | 'RR'
  | 'aa'
  | 'E'
  | 'I'
  | 'O'
  | 'U';

export type VisemeCue = { t: number; v: CustomViseme; dur: number };
export type VisemeTimeline = { fps?: number; duration?: number; visemes: VisemeCue[] };

export const VISEME_MORPH: Record<CustomViseme, string> = {
  sil: 'viseme_sil',
  PP: 'viseme_PP',
  FF: 'viseme_FF',
  TH: 'viseme_TH',
  DD: 'viseme_DD',
  kk: 'viseme_kk',
  CH: 'viseme_CH',
  SS: 'viseme_SS',
  nn: 'viseme_nn',
  RR: 'viseme_RR',
  aa: 'viseme_aa',
  E: 'viseme_E',
  I: 'viseme_I',
  O: 'viseme_O',
  U: 'viseme_U',
};

const smoothstep = (a: number, b: number, x: number) => {
  if (a === b) return x < a ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Returns normalised weights for the cues active at `time`. Edge fades keep mouths from
 * popping between visemes; when no cue is active, `sil` owns the mouth.
 */
export const sampleVisemeWeights = (
  timeline: VisemeTimeline | undefined,
  time: number,
): Partial<Record<CustomViseme, number>> => {
  const out: Partial<Record<CustomViseme, number>> = {};
  let total = 0;
  if (timeline?.visemes?.length) {
    for (const cue of timeline.visemes) {
      const start = cue.t;
      const end = cue.t + cue.dur;
      if (time < start - 0.06 || time > end + 0.06) continue;
      const fadeIn = smoothstep(start - 0.025, start + 0.025, time);
      const fadeOut = 1 - smoothstep(end - 0.035, end + 0.035, time);
      const w = fadeIn * fadeOut;
      if (w > 0.001) {
        out[cue.v] = (out[cue.v] ?? 0) + w;
        total += w;
      }
    }
  }
  if (total <= 0.001) return { sil: 1 };
  for (const key of Object.keys(out) as CustomViseme[]) {
    out[key] = (out[key] ?? 0) / total;
  }
  return out;
};

export const sampleViseme = (timeline: VisemeTimeline | undefined, time: number): CustomViseme => {
  const weights = sampleVisemeWeights(timeline, time);
  let best: CustomViseme = 'sil';
  let bestW = -1;
  for (const [v, w] of Object.entries(weights) as [CustomViseme, number][]) {
    if (w > bestW) {
      bestW = w;
      best = v;
    }
  }
  return best;
};

/** Deterministic natural blink: mostly single, occasional double, with tiny timing jitter. */
export const autoBlink = (time: number): number => {
  const period = 3.6;
  const phase = time % period;
  const jitter = Math.sin(Math.floor(time / period) * 12.9898) * 0.12;
  const single = smoothstep(0.0, 0.09, phase + jitter) * (1 - smoothstep(0.13, 0.24, phase + jitter));
  const double = smoothstep(0.32, 0.38, phase + jitter) * (1 - smoothstep(0.40, 0.48, phase + jitter));
  return Math.max(single, double * 0.9);
};
