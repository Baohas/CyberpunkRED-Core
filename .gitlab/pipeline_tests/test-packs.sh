#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
SYSTEM_FILE="${SYSTEM_FILE:-src/system.json}"
TEMPLATE_FILE="${TEMPLATE_FILE:-src/template.json}"

# Get a list of itemTypes from the template.json file
# Remove 'netarch' from the from the results as we don't validate those
mapfile -t ITEMS < <(
  jq \
    --compact-output \
    --raw-output \
    '.Item.types | del(.[index("netarch")]) | .[]' \
    "${TEMPLATE_FILE}"
)

# For each itemType run the YAML fragments through v8r
for item in "${ITEMS[@]}"; do
  # Shortcut v84r as we're doing error handling based on the output
  npx v8r src/packs/**/"${item}".*.yaml \
    >results.json \
    2>errors.txt || true

  # Validate we actually get JSON back
  if ! jq empty results.json >/dev/null 2>&1; then
    echo "❌ v8r returned invalid JSON for ${item}. Output:"
    cat errors.txt
    echo "---"
    cat results.json
    echo "Exiting"
    exit 1
  fi

  # If we do get JSON output, make sure that it contains the `results` key
  if ! jq .results results.json >/dev/null 2>&1; then
    echo "❌ v8r output does not contain the 'results' key"
    cat errors.txt
    echo "---"
    cat results.json
    echo "Exiting"
    exit 1
  fi

  # Parse out errors from the results
  all_errors=$(
    jq 'del(.results[]
      | select(.code == 0))
      | [.results[]
      | {file: .fileLocation, errors: .errors, code: .code}]' results.json
  )

  rm -rf results.json
  rm -rf errors.txt

  # Get a count of the errors
  end=$(echo "${all_errors}" | jq length)

  count=0
  while [[ "${count}" -lt "${end}" ]]; do
    # Check the exit code of the test, and output the fielename, and error
    # https://github.com/chris48s/v8r#exit-codes
    code=$(echo "${all_errors}" | jq -r .["${count}"].code)
    echo "❌ Errors detected in $(echo "${all_errors}" | jq -r .["${count}"].file)"
    if [[ "${code}" -eq 99 ]]; then
      echo "${all_errors}" | jq -r '.['"${count}"'].errors | .[]'
    else
      echo "Could not find schema for this file."
    fi
    ((ERRORS = ERRORS + 1))
    ((count = count + 1))
  done
done

if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} files have errors please check the output above for more details"
  exit 1
else
  echo "🎉 All good!"
fi
