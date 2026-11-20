#!/usr/bin/env bash
set -euo pipefail

studio="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$studio"

mkdir -p out/borrow-skill-3d
npx remotion render out/bundle BorrowSkill3D out/borrow-skill-3d/borrow-skill-3d-raw.mp4 \
  --gl=angle-egl \
  --chrome-mode=chrome-for-testing \
  --browser-executable="$studio/scripts/chrome-mesa.sh" \
  --concurrency=1 \
  --scale=1 \
  --timeout=600000 \
  --log=info
