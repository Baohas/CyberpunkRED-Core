#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Check if the helper file exists
helperfile="src/modules/system/register-helpers.js"

if [[ ! -f "${helperfile}" ]]; then
  echo "❌ ${helperfile} not found"
  exit 1
else
  echo "✅ ${helperfile} found!"
fi

# Check if the helper file contains helpers
# Shortcut to true as we test this after so we can give an error message
helpers=$(grep registerHelper "${helperfile}" | awk -F "\"" '{print $2}' || true)

if [[ -z "${helpers}" ]]; then
  echo "❌ No helpers found in ${helperfile}"
  exit 1
else
  echo "✅ Helpers found in ${helperfile}"
fi

# Check if helpers are used and start with cpr
i=0
for helper in ${helpers} ; do
  if ! grep -rq "${helper}" src/templates/*; then
    # it is ok if cprDebug and cprIsDebug are not used anywhere
    if [[  ! "${helper}" == "cprDebug" || "${helper}" == "cprIsDebug" ]] ; then
      echo "❌ Handlebars helper not used: ${helper}"
      i=$((i+=1))
    else
      echo "✅ ${helper} Handlebars helper found!"
    fi
  elif [[ ! "${helper}" =~ ^cpr.* ]]; then
    echo "❌ Handbars helpers must start with 'cpr', ${helper} does not."
    i=$((i+=1))
  else
    echo "✅ ${helper} Handlebars helper starts with 'cpr'!"
  fi
done

# Fail if any issues were found
if [[ "${i}" -gt 0 ]]; then
  echo "❌ ${i} helpers have issues. Please correct them."
  exit 1
else
  echo "✅ All good!"
fi
