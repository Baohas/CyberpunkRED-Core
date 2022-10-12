#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Check the helperfile exists
helperfile="src/modules/system/register-helpers.js"

if [[ ! -f "${helperfile}" ]]; then
  echo "❌ Unable to find ${helperfile}"
  exit 1
else
  echo "✅ Found ${helperfile}!"
fi

# Check we have helpers in the helperfile
# Shortcut to true as we test this after so we can give an error message
helpers=$(grep "Handlebars.registerHelper" "${helperfile}" \
  | awk -F "\"" '{print $2}' \
  || true)

if [[ -z "${helpers}" ]]; then
  echo "❌ Unable to find any helpers in ${helperfile}"
  exit 1
else
  echo "✅ Helpers found in ${helperfile}!"
fi

# Check hbs_location exits
hbs_location="src/templates/"

if [[ ! -d "${hbs_location}" ]]; then
  echo "❌ Unable to find ${hbs_location}"
  exit 1
else
  echo "✅ Found ${hbs_location}!"
fi

# Check we have files in hbs_location
all_files=$(find "${hbs_location}" -type f -print)

if [[ -z "${all_files}" ]]; then
  echo "❌ Unable to find any helper files in ${hbs_location}"
  exit 1
else
  echo "✅ Found helper files in ${hbs_location}"
fi

i=0
for file in ${all_files}; do
  #Figure out if a custom handlebar helper is used in the file
  used=0
  for str in ${helpers}; do
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
      ((i+=1))
    fi
    # Look for the end trace message in the file
    if [[ "$(grep "${last}" "${file}" | grep "${base}" -c)" != 1 ]]; then
      echo "❌ ${last} missing/incorrect at the end of ${file}"
      ((i+=1))
    fi
  fi
done

# If some trace messages are missing or incorrect fail this job
if [[ "${i}" -gt 0 ]]; then
  echo "❌ There are ${i} missing/incorrect trace statements in the hbs files, as listed above."
  echo "A trace statement is required if a handlebar helper is called, which we wrote ourselves."
  echo "Please add or correct the trace statements."
  exit 1
else
  echo "✅ All good!"
  fi
