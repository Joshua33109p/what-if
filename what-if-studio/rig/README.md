# Custom rig

Original, CC0, fully procedural cartoon humanoid for What If Studio. The shipping asset is
`public/models/custom/custom_rig.glb`; the source of truth is `rig/custom_rig/`.

## What is in it

- 57-joint full-body skeleton: spine/neck/head, jaw, eye joints, clavicles, arms, legs, toes,
  and 15 finger joints per hand (3 phalanges x 5 fingers).
- 45 facial blend shapes: 15 Oculus visemes (`viseme_sil` ... `viseme_U`), ARKit-style expression
  controls (`jawOpen`, `eyeBlinkLeft/Right`, `browInnerUp`, `mouthSmileLeft/Right`, ...), plus
  eyelid, brow and tongue controls.
- 16 baked clips at 30 fps: `Idle_Loop`, `Idle_Talking_Loop`, `Walk_Loop`, `Run_Loop`, `Wave`,
  `Point`, `Shrug`, `Think`, `Reach`, `Throw`, `Piano`, `Surgery`, `Collapse`, `Interact`,
  `Nod`, `Shake`.
- 13 materials with stable names (`CUSTOM_SKIN`, `CUSTOM_SHIRT`, `CUSTOM_PANTS`, `CUSTOM_HAIR`,
  `CUSTOM_EYE_WHITE`, `CUSTOM_IRIS`, `CUSTOM_PUPIL`, ...). Tint them with
  `src/engine3d/customCharacter.tsx`.
- Three hair styles: `short`, `bob`, `ponytail` (parts `Hair_*`, `Fringe_*`, `Ponytail`).
- Y up, +Z forward, +X character's left. All rest rotations are identity, so authoring axes are
  world axes: X = sagittal swing, Y = twist/yaw, Z = lateral raise.

## Build

The direct builder is pure Python and runs on the Termux/ARM host:

```bash
python rig/custom_rig/build.py
python rig/custom_rig/validate.py public/models/custom/custom_rig.glb
```

It writes:

- `public/models/custom/custom_rig.glb`
- `public/models/custom/custom_rig.manifest.json`
- `rig/out/custom_rig_spec.json` (input for the Blender path)

Shortcuts: `npm run rig:build` and `npm run rig:validate`.

## Blender / cloud parity build

Blender has no native build for this Android ARM host, so the checked-in GLB is produced by the
pure-Python writer. On an x64 desktop or cloud Blender 4.2+ image, the same spec can be rebuilt
through Blender Python:

```bash
blender -b --python rig/blender/build_custom_rig.py -- \
  --spec rig/out/custom_rig_spec.json \
  --out public/models/custom/custom_rig_blender.glb \
  --blend rig/out/custom_rig.blend
```

The script creates every edit bone head at its rest position, points it +Y with roll 0, builds
the meshes, vertex groups, shape keys and actions, and exports with `export_animation_mode='ACTIONS'`.
Compare the result with `python rig/custom_rig/validate.py ...` and `scripts/validate-rig.py ...`.

## Ara 3D Gen realistic rig

A second, more realistic humanoid path lives in `public/models/ara/`. It comes from the sibling
`ara3d-gen` checkout (MIT code, CC0 MakeHuman data, free CMU mocap; see
`public/licenses/Ara-3D-Gen-CC0.txt`). The source project is not vendored.

Setup on a free/local machine:

```bash
git clone https://github.com/olatunde85/3d-gen.git ../ara3d-gen
cd ../ara3d-gen
npm install
npm run setup-assets
cd ../what-if-studio
npm run rig:export:ara
```

`npm run setup-assets` downloads MakeHuman data (~420 MB) and builds the asset cache; it needs no
API key, account or cloud render. The export writes:

- `public/models/ara/ara-pip.glb`, `ara-pip.params.json`
- `public/models/ara/ara-mo.glb`, `ara-mo.params.json`

Each GLB has 69 joints, 34 named morph targets (340 targets on the mesh), 15 Oculus visemes,
ARKit-compatible face controls and 26 clips (idle, talk, talk with gestures, walk, run, wave,
point). Ara uses a combined `mouthSmile`/`mouthFrown` control instead of left/right smile pairs;
`scripts/validate-rig.py` accepts that and treats `cheekSquint` as optional.

```bash
npm run rig:validate:ara
npm run rig:review:ara -- body
npm run rig:review:ara -- face
```

`AraRigTest` is the review composition (`body`, `face`, `side`, `walk`). It renders a still locally;
on Termux the review script uses the installed Chromium with Mesa llvmpipe because SwiftShader
crashes on this device. The default character, `RIG_SAMPLE`, `Board3D` and every episode remain on
the existing MPFB/custom path until a human reviews the Ara renders and approves a per-episode
switch.

## Runtime

```tsx
import { CustomCharacter } from './engine3d/customCharacter';

<CustomCharacter
  look={{ tint: '#F2B33D', hair: '#241B18' }}
  clip="Walk_Loop"
  expr="happy"
  blink="auto"
  visemeTimeline={timeline}
  hair="short"
/>
```

`CustomRigTest` props: `body`, `face`, `side`, `walk`, optional `clip`, `clipTime`, `timeline`
(`rewind`, `borrow-skill`, `copy-paste`) and `debugColor` for silhouette checks.

`CustomClipAudit` renders all 16 clips as one 16-frame sequence with a flat debug colour, which
makes limb collapse or mesh explosion obvious in a contact sheet:

```bash
npx remotion render src/index.ts CustomClipAudit out/custom-rig/audit \
  --sequence --image-format=png --width=480 --height=270
```

`CustomFaceAudit` does the same for the 15 Oculus visemes at a face close-up, so mouth shapes can
be reviewed as a contact sheet:

```bash
npx remotion render src/index.ts CustomFaceAudit out/custom-rig/face-audit \
  --sequence --image-format=png --width=480 --height=270
```

Episode boards can opt in without changing the default:

```tsx
<BorrowSkillBoard3D shot="S1" rig="custom" />
```

## Lip-sync

`scripts/lipsync.py` converts ElevenLabs word alignment (`words.json`) into an Oculus-viseme
timeline:

```bash
python scripts/lipsync.py src/episodes/borrow-skill-3d/words.json src/episodes/borrow-skill-3d/visemes.json
```

Runtime sampling is in `src/engine3d/lipsync.ts` (`sampleVisemeWeights`, `autoBlink`). Cues are
cross-faded at the edges; silence falls back to `viseme_sil`.

## License

CC0 1.0 Universal. See `public/licenses/Custom-Rig-CC0.txt`. The rig contains no third-party
mesh, skeleton or animation data.

## Guardrail and promotion checklist

The previous Quaternius/MPFB path is intentionally untouched. Keep `src/engine3d/character.tsx`,
`public/models/human_*.glb` and `public/models/mpfb/mpfb.glb` until the new rig has passed renders in
every episode. Switch `RIG_SAMPLE` or the character import only after that.

- [x] Structural validation: 57 bones, 45 morphs, 16 clips, visemes and ARKit controls.
- [x] Clip contact sheet: all 16 clips keep a stable full-body silhouette.
- [x] Viseme contact sheet: all 15 mouth shapes differ from silence.
- [x] Episode stills: BorrowSkill S1, S3 and S11 with `rig="custom"`.
- [x] 1920x1080 video smoke test: 30 frames of `Walk_Loop`.
- [ ] Visual QA of the contact sheets and episode stills by a human.
- [ ] Per-episode side-by-side against the MPFB path.
- [ ] Flip episode defaults or `RIG_SAMPLE`.

Ara path:

- [x] Export `ara-pip.glb` and `ara-mo.glb` with the what-if clip set.
- [x] Structural validation: 69 joints, 34 morph names, visemes, combined ARKit smiles.
- [ ] Human review of `AraRigTest` body/face/walk stills.
- [ ] One episode rendered on the Ara path and compared with MPFB.
- [ ] Flip a per-episode `rig="ara"` default only after that review.
