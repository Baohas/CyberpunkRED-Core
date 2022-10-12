#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Check if src/system.json exists
systemfile="src/system.json"

if [[ ! -f "${systemfile}" ]]; then
  echo "❌ Unable to find ${systemfile}"
  exit 1
else
  echo "✅ found ${systemfile}"
fi

# Check we have lanaguaged defined in system.json
langfiles=$(jq -r '.languages | .[] | .path' "${systemfile}")

if [[ -z "${langfiles}" ]]; then
  echo "❌ Unable to find any language files in ${systemfile}"
  exit 1
else
  echo "✅ found language files in ${systemfile}"
fi

# Check language files in system.json exist
i=0
for lang in ${langfiles}; do
  if [[ ! -f "src/${lang}" ]]; then
    echo "❌ Unable to find src/${lang}"
    ((i+=1))
  else
    echo "✅ ${lang} found!"
  fi
done

if [[ "${i}" -gt 0 ]]; then
  echo "❌ ${i} of the above listed languages specified in the system.json are missing the corresponding language file(s). Please add them (via crowdin and an automatically created MR) or correct their location!"
  exit 1
else
  echo "✅ All good!"
fi
