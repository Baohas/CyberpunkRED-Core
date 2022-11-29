#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# SYSTEM_FILE

ERRORS=0
LANG_DIR="src/lang"
LANG_FILE="${LANG_DIR}/en.json"

# Extract the paths to the language files (other than `en` from system.json)
mapfile -t LANGUAGES < <(
  jq -r \
    '.languages | .[] | .path' \
    "src/${SYSTEM_FILE}" |
    grep -v en
)

# Extract strings from srv/lang/en.json
mapfile -t EN_STRINGS < <(jq -r 'keys[]' "${LANG_FILE}")

# Check we get language files returned
if [[ -z "${LANGUAGES[*]}" ]]; then
  echo "❌ Unable to find any language files in src/${SYSTEM_FILE}"
  exit 1
fi

# Check we get strings from en.json
if [[ -z "${EN_STRINGS[*]}" ]]; then
  echo "❌ Unable to find any strings in ${LANG_FILE}"
  exit 1
fi

# Loop over each language
for lang in "${LANGUAGES[@]}"; do
  # For each string in en.json test if it exists in the language
  for en_string in "${EN_STRINGS[@]}"; do
    if ! grep -rq "${en_string}" "src/${lang}"; then
      echo "❌ ${en_string} not in src/${lang}"
      ((ERRORS += 1))
    else
      echo "✅ ${en_string} in src/${lang}!"
    fi
  done
  # Extract strings from each language and check if it exists in en.json
  mapfile -t LANG_STRINGS < <(jq -r 'keys[]' "src/${lang}")
  # Check we get strings from src/lang/en.json
  if [[ -z "${LANG_STRINGS[*]}" ]]; then
    echo "❌ Unable to find any strings in src/${lang}"
    ((ERRORS += 1))
  fi
  # Loop over each string in language file and check if it exists in en.json
  for lang_string in "${LANG_STRINGS[@]}"; do
    if ! grep -rq "${lang_string}" "${LANG_FILE}"; then
      echo "❌ ${lang_string} not in ${LANG_FILE}"
      ((ERRORS += 1))
    else
      echo "✅ ${lang_string} in ${LANG_FILE}!"
    fi
  done
done

# Check if we got any errors
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} strings missing from language files."
  echo "   Run 'npx gulp build' locally to resolve these issues."
  exit 1
else
  echo "🎉 All good!"
fi
