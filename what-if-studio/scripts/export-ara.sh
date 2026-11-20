#!/usr/bin/env bash
set -euo pipefail

studio="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ara="${ARA3D_DIR:-$studio/../ara3d-gen}"
tsx="$ara/node_modules/tsx/dist/cli.mjs"
clips="idle,talk,talk_gestures,walk,run,wave,point,look_around,open_door,use_press,knockdown,fall,cheer,laugh,clap,thumbs_up,bow,phone_call,texting,pick_up,push,sit_idle,sit_down,stand_up,punch_combo,run_slide"

if [[ ! -f "$tsx" ]]; then
  echo "Ara 3D Gen dependencies missing at $ara; run npm install there." >&2
  exit 1
fi
if [[ ! -d "$ara/public/assets" ]]; then
  echo "Ara 3D Gen assets missing at $ara/public/assets; run npm run setup-assets there." >&2
  exit 1
fi

for name in ara-pip ara-mo; do
  params="$studio/public/models/ara/$name.params.json"
  out="$studio/public/models/ara/$name.glb"
  if [[ ! -f "$params" ]]; then
    echo "Missing $params" >&2
    exit 1
  fi
  node "$tsx" "$ara/scripts/whatif-export.ts" --params "$params" --out "$out" --clips "$clips"
done

python "$studio/scripts/validate-rig.py" "$studio/public/models/ara/ara-pip.glb"
python "$studio/scripts/validate-rig.py" "$studio/public/models/ara/ara-mo.glb"
