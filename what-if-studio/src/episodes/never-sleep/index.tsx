import type { Timeline } from '../../timeline';
import { defineEpisode3D } from '../../engine3d/episode3d';
import timeline from './timeline.json';
import { SHOTS, episodeAccent, episodeTitle } from './shots';

export const neverSleep3D = defineEpisode3D('NeverSleep3D', {
  timeline: timeline as Timeline,
  shots: SHOTS,
  title: episodeTitle,
  accent: episodeAccent,
  bg: '#141020',
  grain: false,
});
