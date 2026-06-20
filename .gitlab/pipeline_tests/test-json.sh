#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0

# Get a list of all json files, ignore dirs we don't care about
# `dist`             Is the default build dir and we don't care abut it
# `node_modules`     Is the not our code
# `.vscode`          We don't care about
# `.claude`          Claude Code config, not part of the module
# `.gitlab`          Doesn't need checking
# `.gitlab-ci-local` Is just local stuff
# `src/babele/*`     Are translation files that are machine generated
#                    we check the en ones though as these being incorrect would
#                    break a lot of stuff
# `schema`           Are JSONSchema files, if incorrect they will fail during the
#                    validate-packs job
# `package*.json`    Is npm stuff we don't care about
# `.fallowrc.json`   Is JSONC (has comments) which jsonlint can't parse
mapfile -t DOCS < <(
  find . \
    -not \( -path "./dist" -prune \) \
    -not \( -path "./node_modules" -prune \) \
    -not \( -path "./.vscode" -prune \) \
    -not \( -path "./.claude" -prune \) \
    -not \( -path "./.gitlab" -prune \) \
    -not \( -path "./.gitlab-ci-local" -prune \) \
    -not \( -path "./src/babele/cz" -prune \) \
    -not \( -path "./src/babele/de" -prune \) \
    -not \( -path "./src/babele/es" -prune \) \
    -not \( -path "./src/babele/fr" -prune \) \
    -not \( -path "./src/babele/it" -prune \) \
    -not \( -path "./src/babele/pl" -prune \) \
    -not \( -path "./src/babele/pt-BR" -prune \) \
    -not \( -path "./src/babele/ru" -prune \) \
    -not \( -path "./schema" -prune \) \
    -not \( -name "package*.json" \) \
    -not \( -name ".fallowrc.json" \) \
    -iname "*.json"
)

# Check we get files returned
if [[ -z "${DOCS[*]}" ]]; then
  echo "❌ Unable to find any json files in the repo"
  exit 1
fi

# Loop over the files and run through json lint
for doc in "${DOCS[@]}"; do
  if ! npx jsonlint --quiet "${doc}"; then
    echo "❌ ${doc} does not validate with jsonlint"
    ((ERRORS += 1))
  fi
done

# Check if we got any errors
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} files have errors please check the output above for more details"
  exit 1
else
  echo "🎉 All good!"
fi
