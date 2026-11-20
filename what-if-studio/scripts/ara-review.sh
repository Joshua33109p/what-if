#!/usr/bin/env bash
set -euo pipefail

studio="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
view="${1:-body}"

case "$view" in
  body|face|side|walk) ;;
  *) echo "usage: ara-review.sh [body|face|side|walk]" >&2; exit 2 ;;
esac

cd "$studio"

extra=()
if [[ "$(uname -o 2>/dev/null)" == "Android" ]]; then
  extra=(--gl=angle-egl --chrome-mode=chrome-for-testing --browser-executable="$studio/scripts/chrome-mesa.sh" --timeout=180000)
fi

npx remotion still src/index.ts AraRigTest "out/ara/review-$view.png" --props="{\"view\":\"$view\"}" "${extra[@]}"
