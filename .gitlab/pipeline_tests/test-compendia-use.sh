#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

STR="game.packs.get("

# Look for "game.packs.get" calls in the code, and fail if any are found.
# Contributors should be using SystemUtils.getCompendiumDoc instead.
if find . \
  -path "./src/modules/system/migrate/scripts" -prune -o \
  -name "*.js" \
  ! -name "cpr-systemUtils.js" \
  -print0 | xargs -0 grep -l "${STR}"; then
  echo "❌ 'game.packs.get' string found, use 'game.system.id' instead."
  exit 1
else
  echo "✅ 'game.packs.get' not found!"
fi
