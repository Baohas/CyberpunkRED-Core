#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'


# Look for "cyberpunk-red-core" in the code, and fail if any is found.
# Contributors should be using game.system.id instead.
game_id="cyberpunk-red-core"
if grep -r --include="*.js" "${game_id}" ./*; then
    echo "\"${game_id}\" string found, use \"game.system.id\" instead."
    exit 1
fi

