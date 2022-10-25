#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'


GAME_ID="cyberpunk-red-core"

# Look for "cyberpunk-red-core" in the code, and fail if any is found.
# Contributors should be using game.system.id instead.
if grep -r --include="*.js" "${GAME_ID}" ./*; then
  echo "❌ '${GAME_ID}' string found, use 'game.system.id' instead."
  exit 1
else
  echo "✅ '${GAME_ID}' not found!"
fi
