#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

LANGFILE="src/lang/en.json"
ERRORS=0

if [[ ! -f "${LANGFILE}" ]]; then
  echo "❌ Unable to find ${LANGFILE}"
  exit 1
else
  echo "✅ Found ${LANGFILE}!"
fi

# Load all localization identifiers from the English language file
# Shortcut to true as we test this after so we can give an error message
strings=$(grep CPR "${LANGFILE}" | awk -F '"' '{print $2}' || true)

# Check we're getting strings from the LANGFILE
if [[ -z "${strings}" ]]; then
  echo "❌ Unable to find any strings in ${LANGFILE}"
  exit 1
else
  echo "✅ Found strings in ${LANGFILE}!"
fi

# Iterate through them and check if they exist elsewhere in the code
for string in ${strings}; do
  if ! grep -rq --exclude-dir=lang --exclude-dir=node_modules "${string}" ./src; then
    echo "❌ String not used: ${string}"
    ((ERRORS = ERRORS + 1))
  else
    echo "✅ ${string} used!"
  fi
done

# If some do not exist elsewhere in the code fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} strings not detected, check the output above for more details."
  exit 1
else
  echo "✅ All good!"
fi
