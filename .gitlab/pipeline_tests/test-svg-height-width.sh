#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
# Check SVG_LOCATION exits
SVG_LOCATION="src/icons"

# Check the SVG_LOCATION exists
if [[ ! -d "${SVG_LOCATION}" ]]; then
  echo "❌ Unable to find ${SVG_LOCATION}"
  exit 1
fi

# Check we have files in SVG_LOCATION
ALL_FILES=$(find "${SVG_LOCATION}" -type f -name "*.svg" -print | sort -u)

if [[ -z "${ALL_FILES}" ]]; then
  echo "❌ Unable to find any SVG files in ${SVG_LOCATION}"
  exit 1
fi

for file in ${ALL_FILES}; do
  SVG_HEADER=$(awk '/<svg/,/>/' "${file}")
  MISSING_TAGS=0
  if ! grep -q " height=" "${SVG_HEADER}; then
    echo "❌ 'height=""' missing in the svg tag in ${file}"
    ((MISSING_TAGS = MISSING_TAGS + 1))
  fi

  if ! grep -q " width=" "${SVG_HEADER}; then
    echo "❌ 'width=""' missing in the svg tag in ${file}"
    ((MISSING_TAGS = MISSING_TAGS + 1))
  fi

  if [[ "${MISSING_TAGS}" -gt 0 ]]; then
    ((ERRORS = ERRORS + 1))
  fi
done

# If some svg tags are missing height/width fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ There are ${ERRORS} files missing height and/or width from the svg header tag, as listed above."
  echo "Please add or correct the svg header tags."
  exit 1
else
  echo "🎉 All good!"
fi
