#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ENVAR_FILE=".gitlab/pipeline_utils/envars.sh"

# Find all the ENVARS in the ENVAR_FILE.
# Exclude IFS and CI_ prefixed vars
mapfile -t ENVARS < <(
  grep -Eo '^[A-Z].*=' "${ENVAR_FILE}" |
    grep -Ev '^IFS=' |
    grep -Ev '^CI_.*=' |
    tr -d '='
)

# Loop over the ENVARs and check they are exported to vars.env
errors=0
for envar in "${ENVARS[@]}"; do
  if ! grep -q "  echo \"${envar}=\${${envar}}" "${ENVAR_FILE}"; then
    echo "❌ ${envar} is not exported in ${ENVAR_FILE##*/}"
    ((errors + 1))
  else
    echo "✅ ${envar} is exported in ${ENVAR_FILE##*/}"
  fi
done

if [[ "${errors}" -gt 0 ]]; then
  echo "❌ ${errors} envars not exported, please check the output above for more details."
  exit 1
fi
