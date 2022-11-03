#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0

# Get a list of all json files, ignore dirs we don't care about
mapfile -t DOCS < <(
  find . \
    -not \( -path "./dist" -prune \) \
    -not \( -path "./node_modules" -prune \) \
    -not \( -path "./.vscode" -prune \) \
    -not \( -path "./.gitlab/pipeline_tests/eslint-plugin-foundry-cpr" -prune \) \
    -not \( -name "package*.json" \) \
    -iname "*.json"
)

# Check we get files returned
if [[ -z "${DOCS[*]}" ]]; then
  echo "❌ Unable to find any json files in the repo"
  exit 1
fi

# Loop over the files and run through json lint
for doc in "${DOCS[@]}"; do
  if ! npx jsonlint --quiet "${doc}" &>/dev/null; then
    echo "❌ ${doc} does not validate with jsonlint"
    ((ERRORS += 1))
  else
    echo "✅ ${doc} passed jsonlint"
  fi
done

# Check if we got any errors
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} files have errors please check the output above for more details"
  exit 1
else
  echo "🎉 All good!"
fi
