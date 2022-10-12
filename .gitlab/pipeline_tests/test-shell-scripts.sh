#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

echo "Checking Shell Scripts..."

scripts=$(find . -type f -iname '*.sh' -print)

if [[ -z "${scripts}" ]]; then
  echo "❌ Unable to find any scripts in the repo"
  exit 1
fi

errors=0
for script in ${scripts}; do
  # Test we have a portable shebang and are strictmode compliant
  # http://redsymbol.net/articles/unofficial-bash-strict-mode/
  #
  # This could possibly be done better with grep or awk,
  # this way ensures we always have this at the top of the file for consistency

  first=$(sed -n '1p' "${script}")
  second=$(sed -n '2p' "${script}")
  third=$(sed -n '3p' "${script}")
  i=0

  # Check we have a prtable shebang
  if [[ "${first}" != '#!/usr/bin/env bash' ]]; then
    echo "❌ ${script##*/} does not use '#!/usr/bin/env bash'"
    ((i+=1))
  fi

  # Check we are setting '-euo pipefail'
  if [[ "${second}" != 'set -euo pipefail' ]]; then
    echo "❌ ${script##*/} does not set '-euo pipefail'"
    ((i+=1))
  fi

  # Check we are setting 'IFS' corectly
  if [[ "${third}" != 'IFS=$'\''\n\t'\''' ]]; then
    # shellcheck disable=SC2028
    echo "❌ ${script##*/} does not set 'IFS=\$'\n\t'"
    ((i+=1))
  fi

  # If any of the above fail add to the error count
  if [[ "${i}" -gt 0 ]]; then
    ((errors+=1))
    echo "❌ ${script##*/} is not strictmode compliant."
  else
    echo "✅ ${script##*/} is strictmode compliant!"
  fi

  # Check we pass shellcheck
  if ! shellcheck "${script}"; then
    echo "❌ ${script##*/} does not validate with shellcheck"
    ((errors+=1))
  else
    echo "✅ ${script##*/} passed shellcheck!"
  fi
done

if [[ "${errors}" -gt 0 ]]; then
  echo "❌ ${errors} files have errors please check the output above for more details"
  exit 1
else
  echo "✅ All good!"
fi
