#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

langfile="src/lang/en.json"

if [[ ! -f "${langfile}" ]]; then
  echo "❌ Unable to find ${langfile}"
  exit 1
else
  echo "✅ Found ${langfile}!"
fi

# Load all localization identifiers from the English language file
# Shortcut to true as we test this after so we can give an error message
strings=$(grep CPR "${langfile}" | awk -F '"' '{print $2}' || true)

if [[ -z "${strings}" ]]; then
  echo "❌ Unable to find any strings in ${langfile}"
  exit 1
else
  echo "✅ Found strings in ${langfile}!"
fi

i=0
# Iterate through them and check if they exist elsewhere in the code
for str in ${strings}; do
  if ! grep -rq --exclude-dir=lang --exclude-dir=node_modules "${str}" ./*; then
    echo "❌ String not used: ${str}"
    i=$((i+=1))
  else
    echo "✅ ${str} used!"
  fi
done
# If some do not exist elsewhere in the code fail this job
if [[ "${i}" -gt 0 ]]; then
  echo "❌ The above listed ${i} strings are not in use. Please remove or use them."
  exit 1
else
  echo "✅ All good!"
fi
