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
      break
    fi
  done
  # If a custom handelabr is used check if there are trace statements
  if [[ "${used}" != 0 ]]; then
    # Convert the filepath into UPPER with spaces instead of /
    trace_file_start=$(
      echo "${file}" |
        sed 's/src\/templates\///g' |
        sed 's/\//\ /g' |
        tr '[:lower:]' '[:upper:]'
    )
    # Convert the filename to UPPER
    trace_file_end=$(basename "${file}" | tr '[:lower:]' '[:upper:]')
    # Build the trace statements
    trace_start="{{cprTrace \"START ${trace_file_start}\"}}"
    trace_end="{{cprTrace \"END ${trace_file_end}\"}}"

    # Test for cprTrace START
    if ! grep -q "${trace_start}" "${file}"; then
      echo "❌ Filename '${trace_start}' not found in ${file}"
      ((ERRORS = ERRORS + 1))
    fi

    # Test for cprTrace END
    if ! grep -q "${trace_end}" "${file}"; then
      echo "❌ Filename '${trace_end}' not found in ${file}"
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
