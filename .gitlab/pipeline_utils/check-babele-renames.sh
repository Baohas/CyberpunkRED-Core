#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Variables that are set by GitLab CI environment
# CHOOM_BOT_API
# CI_API_V4_URL
# CI_MERGE_REQUEST_ASSIGNEES
# CI_MERGE_REQUEST_IID
# CI_PROJECT_ID

# URL to use as the base for out API calls
PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"

# Get the MR_IID from the environment
MR_IID="${CI_MERGE_REQUEST_IID:-''}"

MESSAGE="This MR looks like it's renaming/deleting a file in src/babele/en.

Unfortunately Crowdin does not automatically handle this so you will need to perform some manual steps before and after merging this MR.

Please see the [wiki](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core/-/wikis/ops/Crowdin#removing-or-renaming-files) for the exact process."

function check_babele_changed() {
  local changed_files

  if ! git fetch --quiet --all; then
    echo "❌ Unable to fetch dev"
    echo "Check the target branch exists and re-run the job"
    exit 1
  fi

  changed_files=$(git diff --name-only -M "remotes/origin/dev" -- src/babele/en)

  if [[ -n ${changed_files} ]]; then
    echo "MR has renamed files in src/babele/en."
    curl \
      --data-urlencode "body=${MESSAGE}" \
      --request POST \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/merge_requests/${MR_IID}/notes" >/dev/null
  else
    echo "MR has no renamed files in src/babele/en."
  fi
}

function main() {
  check_babele_changed
}

main
