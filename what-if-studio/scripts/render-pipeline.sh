#!/usr/bin/env bash
set -euo pipefail

slug="${1:?usage: render-pipeline.sh <slug>}"
studio="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skill="${SKILL_DIR:-$studio/scripts/skill}"

if [[ ! -f "$studio/src/episodes/$slug/episode.json" ]]; then
  echo "No episode at $studio/src/episodes/$slug/episode.json" >&2
  exit 1
fi
if [[ ! -f "$skill/master.py" ]]; then
  echo "Set SKILL_DIR to the folder containing master.py (missing $skill/master.py)" >&2
  exit 1
fi

cd "$studio"

if [[ "${REGENERATE_VOICE:-0}" == "1" ]]; then
  python "$skill/voice.py" "$slug"
elif [[ ! -f "public/$slug/voice.wav" ]]; then
  echo "No cached voice at public/$slug/voice.wav; enable regenerate_voice." >&2
  exit 1
fi

python "$skill/plan.py" "$slug"

if [[ "${GENERATE_SFX:-0}" == "1" ]]; then
  python "$skill/sfx.py" "$slug"
fi

python "$skill/master.py" "$slug" --concurrency "${CONCURRENCY:-4}"
