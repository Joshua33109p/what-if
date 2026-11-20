#!/usr/bin/env bash
set -euo pipefail

slug="${1:?usage: render-pipeline.sh <slug>}"
studio="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skill="${SKILL_DIR:-$studio/scripts/skill}"

if [[ ! -f "$studio/src/episodes/$slug/episode.json" ]]; then
  echo "No episode at $studio/src/episodes/$slug/episode.json" >&2
  exit 1
fi
if [[ ! -f "$skill/scripts/master.py" ]]; then
  echo "Set SKILL_DIR to the what-if-animation skill folder (missing $skill/scripts/master.py)" >&2
  exit 1
fi

cd "$studio"

if [[ "${REGENERATE_VOICE:-0}" == "1" ]]; then
  python "$skill/scripts/voice.py" "$slug"
elif [[ ! -f "public/$slug/voice.wav" ]]; then
  echo "No cached voice at public/$slug/voice.wav; enable regenerate_voice." >&2
  exit 1
fi

python "$skill/scripts/plan.py" "$slug"

if [[ "${GENERATE_SFX:-0}" == "1" ]]; then
  python "$skill/scripts/sfx.py" "$slug"
fi

python "$skill/scripts/master.py" "$slug" --concurrency "${CONCURRENCY:-4}"
