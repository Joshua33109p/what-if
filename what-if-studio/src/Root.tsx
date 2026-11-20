import React from 'react';
import { Composition } from 'remotion';
import { STUDIO } from './studio.config';
import { EPISODES } from './episodes';
import { ModelTest } from './engine3d/ModelTest';
import { GLTest } from './engine3d/GLTest';
import { FaceTest } from './engine3d/FaceTest';
import { CharacterFront } from './engine3d/CharacterFront';
import { RigTest } from './engine3d/RigTest';
import { StageTest } from './engine3d/StageTest';
import { CustomRigTest } from './engine3d/CustomRigTest';
import { AraRigTest } from './engine3d/AraRigTest';
import { CustomClipAudit, AUDIT_CLIPS } from './engine3d/CustomClipAudit';
import { CustomFaceAudit, AUDIT_VISEMES } from './engine3d/CustomFaceAudit';
import { BorrowSkillBoard3D } from './episodes/borrow-skill/Board3D';

// Every episode gets two compositions: <Id> (the film) and <Id>Board (one frame per shot, at its key frame, for the
// storyboard).
//   npx remotion studio src/index.ts --port 3430

export const Root: React.FC = () => {
  const common = { width: STUDIO.width, height: STUDIO.height, fps: STUDIO.fps };
  return (
    <>
      {EPISODES.map((e) => (
        <React.Fragment key={e.id}>
          <Composition id={e.id} component={e.Main} durationInFrames={Math.max(1, e.total)} {...common} />
          <Composition id={`${e.id}Board`} component={e.Board} durationInFrames={Math.max(1, e.shotCount)} {...common} />
        </React.Fragment>
      ))}
      <Composition id="ModelTest" component={ModelTest} durationInFrames={90} {...common} />
      <Composition id="GLTest" component={GLTest} durationInFrames={90} {...common} />
      <Composition id="FaceTest" component={FaceTest} durationInFrames={90} {...common} />
      <Composition id="CharacterFront" component={CharacterFront} durationInFrames={90} {...common} />
      <Composition id="RigTest" component={RigTest} durationInFrames={90} defaultProps={{ view: 'body' }} {...common} />
      <Composition id="StageTest" component={StageTest} durationInFrames={90} {...common} />
      <Composition
        id="CustomRigTest"
        component={CustomRigTest}
        durationInFrames={60}
        defaultProps={{ view: 'body' }}
        {...common}
      />
      <Composition id="AraRigTest" component={AraRigTest} durationInFrames={60} defaultProps={{ view: 'body' }} {...common} />
      <Composition id="CustomFaceAudit" component={CustomFaceAudit} durationInFrames={AUDIT_VISEMES.length} {...common} />
      <Composition id="CustomClipAudit" component={CustomClipAudit} durationInFrames={AUDIT_CLIPS.length} {...common} />
      <Composition
        id="BorrowSkillBoard3D"
        component={BorrowSkillBoard3D}
        durationInFrames={1}
        defaultProps={{ shot: 'S1' }}
        {...common}
      />
    </>
  );
};
