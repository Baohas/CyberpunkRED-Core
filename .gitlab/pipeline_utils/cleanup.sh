#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Script to cleanup the last X releases in the GitLab Package Repo

# The following vars are set by Gitlab CI
# CI_JOB_TOKEN

# The following vars are set during the 'init' CI job.
# PROJECT_URL SYSTEM_NAME

# Script variables
# URL of the GitLab Package Repo
PACKAGES_URL="${PROJECT_URL}/packages"

# Package name
# Read from environment, default to the dev release if not set.
PACKAGE_NAME="${PACKAGE_NAME:-fvtt-${SYSTEM_NAME}-dev}"

# Error counter
ERRORS=0

# Number of old releases to keep
# Read from environment, default to 3 if not set
PACKAGES_KEEP="${PACKAGES_KEEP:-3}"

# Get a list of release ids
# Sorts by version number oldest => newest
ALL_IDS=$(curl \
  --silent \
  --location \
  --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
  "${PACKAGES_URL}" \
  | jq '.[]
  | select(.name=="'"${PACKAGE_NAME}"'")
  | select(.version != "latest")
  | { version: .version, id: .id}' \
  | jq --slurp 'sort_by(.version) | .[] | .id'
)

# Filter ALL_IDS to get the ones we want to delete
DELETE_IDS=$(echo "${ALL_IDS}" | head -n -"${PACKAGES_KEEP}")

# Hit the GitLab API and delete a package
function delete_package() {
  local id
  local response_code

  id="$1"

  response_code=$(curl \
    -w "%{http_code}\\n" \
    --location \
    --silent \
    --request DELETE \
    -o /dev/null \
    --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
    "${PACKAGES_URL}/${id}"
  )

  # Check of we got a response from curl
  if [[ -z "${response_code}" ]]; then
    ((ERRORS+=1))
    echo "❌ Empty Response."
  elif [[ "${response_code}" =~ "404" ]]; then
    echo "❌ Package not found."
    ((ERRORS+=1))
  elif [[ "${response_code}" == "401" ]]; then
    echo "❌ 401 Unauthorized."
    ((ERRORS+=1))
  elif [[ "${response_code}" == "204" ]]; then
    echo "✅ Deleted package ID '${id}'."
  else
    ((ERRORS+=1))
    echo "❌ Unknown Response: '${response_code}'."
  fi
}

# Check if we have anything to delete, if we do loop over the results
# and delete the packages
if [[ -z "${DELETE_IDS}" ]]; then
  echo "Nothing to delete"
else
  for id in ${DELETE_IDS}; do
    delete_package "${id}"
  done
fi

# Check if we had any errors
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ Could not delete some packages, see above for more details"
  exit 1
else
  echo "🎉 All done!"
fi
