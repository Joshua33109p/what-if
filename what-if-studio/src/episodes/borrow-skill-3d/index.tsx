import type { Timeline } from '../../timeline';
import { defineEpisode3D } from '../../engine3d/episode3d';
import timeline from './timeline.json';
import { SHOTS, episodeAccent, episodeTitle } from './shots';

export const borrowSkill3D = defineEpisode3D('BorrowSkill3D', {
  timeline: timeline as Timeline,
  shots: SHOTS,
  title: episodeTitle,
  accent: episodeAccent,
  bg: '#141020',
  grain: false,
});
