#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# SYSTEM_FILE

# Check if src/system.json exists
SYSFILE="src/${SYSTEM_FILE}"
ERRORS=0

if [[ ! -f "${SYSFILE}" ]]; then
  echo "❌ Unable to find ${SYSFILE}"
  exit 1
fi

# Check we have lanaguaged defined in system.json
LANGFILES=$(jq -r '.languages | .[] | .path' "${SYSFILE}")

if [[ -z "${LANGFILES}" ]]; then
  echo "❌ Unable to find any language files in ${SYSFILE}"
  exit 1
else
  echo "✅ found language files in ${SYSFILE}"
fi

# Check language files in system.json exist
for lang in ${LANGFILES}; do
  if [[ ! -f "src/${lang}" ]]; then
    echo "❌ Unable to find src/${lang}"
    ((ERRORS = ERRORS + 1))
  else
    echo "✅ ${lang} found!"
  fi
done

if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} of the above listed languages specified in the system.json are missing the corresponding language file(s). Please add them (via crowdin and an automatically created MR) or correct their location!"
  exit 1
else
  echo "🎉 All good!"
fi
