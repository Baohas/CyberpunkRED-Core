#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0

# Get a list of all yaml files, ignore dirs we don't care about
mapfile -t docs < <(
  find . \
    -not \( -path "./dist" -prune \) \
    -not \( -path "./node_modules" -prune \) \
    -iname "*.yml" \
    -o -iname "*.yaml"
)

# Check we get files returned
if [[ -z "${docs[*]}" ]]; then
  echo "❌ Unable to find any yaml files in the repo"
  exit 1
fi

# Loop over the files and run through yaml-lint
for doc in "${docs[@]}"; do
  if ! npx yaml-lint "${doc}" &>/dev/null; then
    echo "❌ ${doc} does not validate with yaml-lint"
    ((ERRORS += 1))
  else
    echo "✅ ${doc} passed yaml-lint"
  fi
done

# Check if we got any errors
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} files have errors please check the output above for more details"
  exit 1
else
  echo "🎉 All good!"
fi
