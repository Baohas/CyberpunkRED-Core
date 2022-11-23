#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
# Check the helperfile exists
HELPERFILE="src/modules/system/register-helpers.js"
# Check hbs_location exits
HBS_LOCATION="src/templates/"

if [[ ! -f "${HELPERFILE}" ]]; then
  echo "❌ Unable to find ${HELPERFILE}"
  exit 1
fi

# Check the HBS_LOCATION exists
if [[ ! -d "${HBS_LOCATION}" ]]; then
  echo "❌ Unable to find ${HBS_LOCATION}"
  exit 1
fi

# Check we have helpers in the helperfile
# Shortcut to true as we test this after so we can give an error message
HELPERS=$(grep "Handlebars.registerHelper" "${HELPERFILE}" |
  awk -F "\"" '{print $2}' ||
  true)

# Check we have helpers in the files
if [[ -z "${HELPERS}" ]]; then
  echo "❌ Unable to find any helpers in ${HELPERFILE}"
  exit 1
fi

# Check we have files in hbs_location
ALL_FILES=$(find "${HBS_LOCATION}" -type f -print)

if [[ -z "${ALL_FILES}" ]]; then
  echo "❌ Unable to find any helper files in ${HBS_LOCATION}"
  exit 1
fi

for file in ${ALL_FILES}; do
  #Figure out if a custom handlebar helper is used in the file
  used=0
  for str in ${HELPERS}; do
    if ! grep -q "${str}" "${file}"; then
      used=1
      echo "✅ ${str} is used!"
      break
    fi
  done
  # If a custom handelabr is used check if there are trace statements
  if [[ "${used}" != 0 ]]; then
    # Extract the name of the file and convert it to allcaps
    base=$(basename "${file}" | tr '[:lower:]' '[:upper:]')
    # Create the expected trace statements
    first="{{cprTrace \"START"
    last="{{cprTrace \"END"
    # Look for the starting trace messages in the file
    if [[ "$(grep "${first}" "${file}" | grep "${base}" -c)" != 1 ]]; then
      echo "❌ ${first} missing/incorrect at the beginning of ${file}"
      ((ERRORS = ERRORS + 1))
    fi
    # Look for the end trace message in the file
    if [[ "$(grep "${last}" "${file}" | grep "${base}" -c)" != 1 ]]; then
      echo "❌ ${last} missing/incorrect at the end of ${file}"
      ((ERRORS = ERRORS + 1))
    fi
  fi
done

# If some trace messages are missing or incorrect fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ There are ${ERRORS} missing/incorrect trace statements in the hbs files, as listed above."
  echo "A trace statement is required if a handlebar helper is called, which we wrote ourselves."
  echo "Please add or correct the trace statements."
  exit 1
else
  echo "🎉 All good!"
fi
