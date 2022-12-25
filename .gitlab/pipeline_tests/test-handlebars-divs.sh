#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
# Check hbs_location exits
HBS_LOCATION="src/templates"

# Check the HBS_LOCATION exists
if [[ ! -d "${HBS_LOCATION}" ]]; then
  echo "❌ Unable to find ${HBS_LOCATION}"
  exit 1
fi

ALL_FILES=$(find "${HBS_LOCATION}" -type f -print)

if [[ -z "${ALL_FILES}" ]]; then
  echo "❌ Unable to find any template files in ${HBS_LOCATION}"
  exit 1
fi

for FILE in ${ALL_FILES}; do
  # Sort circuit here as grep will error if we don't find any results in a file
  OPEN_DIV=$(grep -Eo '<div' "${FILE}" | wc -l || true)
  CLOSE_DIV=$(grep -Eo '</div' "${FILE}" | wc -l || true)
  if [[ ${OPEN_DIV} -ne ${CLOSE_DIV} ]]; then
    echo "❌ Mismatch of '<div' (${OPEN_DIV}) and '</div' (${CLOSE_DIV}) in ${FILE}"
    ((ERRORS += 1))
  fi
done

# If some trace messages are missing or incorrect fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ There are ${ERRORS} hbs files with mismatched <div and </div statements."
  echo "Each HBS file should have an opened '<div' and a matching closing '</div' statement".
  echo "Please add or correct this issue."
  exit 1
else
  echo "🎉 All good!"
fi
