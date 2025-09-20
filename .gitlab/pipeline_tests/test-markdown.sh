#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0

#get a list of all markdown files, ignore dirs we don't care about
mapfile -t DOCS < <(
  find . \
    -not \( -path "./dist" -prune \) \
    -not \( -path "./node_modules" -prune \) \
    -not \( -path "./.gitlab/pipeline_tests" -prune \) \
    -not \( -path "./.gitlab/merge_request_templates" -prune \) \
    -not \( -path "./.gitlab/issue_templates" -prune \) \
    -not \( -path "./.gitlab-ci-local" -prune \) \
    -not -name "CHANGELOG.*.md" \
    -iname "*.md"
)

# Check we get files returned
if [[ -z "${DOCS[*]}" ]]; then
  echo "❌ Unable to find any markdown files in the repo"
  exit 1
fi

# Loop over files and run through markdownlint
for doc in "${DOCS[@]}"; do
  if ! npx markdownlint-cli \
    --config .markdownlint.yaml \
    "${doc}"; then

    echo "❌ ${doc} does not validate with markdownlint"
    ((ERRORS = ERRORS + 1))
  fi
done

# Check if we got any errors
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} files have errors please check the output above for more details"
  exit 1
else
  echo "🎉 All good!"
fi
