#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Variables that are set by GitLab CI environment
# CI_API_V4_URL, CI_PROJECT_ID, CHOOM_BOT_API

# URL to use as the base for out API calls
PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"

# This is insane, GitLab doesn't pass the MR IID to a 'push' event in any
# ENVARS as you would expect but it does put something along the lines of
# 'See merge request cyberpunk-red-team/ci-testing!5' in `env`?! so we can
# grep for this and extract the MR IID.

# However if the source of the pipeline is 'push' which is what a merge request
# is labelled as this also applies to direct pushes to the branch, so they won't
# have the text so we need to set ISSUES to an empty array so we can skip the labelling if it's just a standard push to `dev` not from an MR.

# Short circuit to 0 if we can't find an MR IID
MR_IID=$(
  env |
    grep 'See merge request' |
    grep -Eom 1 '![0-9]{1,10}$' |
    tr -d "!"
)

if [[ -z ${MR_IID} ]]; then
  echo "Unable to find MR IID"
  echo "No issue management will be done in this pipeline"
  exit 0
fi

if [[ ${MR_IID} -ne 0 ]]; then
  mapfile -t ISSUES < <(
    curl \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/merge_requests/${MR_IID}" |
      jq '.description' |
      grep -oE '#[0-9]{1,10}' |
      tr -d '#' |
      sort -u
  )
  echo "Issues linked from MR: ${ISSUES[*]}"
else
  echo "No issues found in MR ${MR_IID} description"
  exit 0
fi

# Labels to add to the Issues in ISSUES
# Case sensitive
LABELS_TO_ADD=(
  "Workflow::In Dev"
  "Test Me!"
)

# Note to add to each issue mentioned in the MR
NOTE="We have just merged !${MR_IID} into \`dev\` to address this issue.

This means it's on track to be in the next release. You can track the next release on the [milestones page](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core/-/milestones).

If you want to help test this please check out the documentation on [Development Releases](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core/-/wikis/Fundamentals/Development-Releases) and how to install them."

# Run checks on an issue
# $1 == issue_id
function check_issue() {
  local response
  local errors
  local state

  response=$(
    curl \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/issues/$1"
  )

  errors=$(echo "${response}" | jq --raw-output '.message')
  state=$(echo "${response}" | jq --raw-output '.state')

  # Let's check if we want to process the linked issue
  if [[ "${errors}" == "404 Not found" ]]; then
    # If we can't find the issue we don't want to process
    echo "Issue $1 not found"
    return 1
  elif [[ "${state}" == "closed" ]]; then
    # If the state is closed we don't want to process
    echo "Issue $1 already closed, ignoring"
    return 1
  else
    # Otherwise continue
    echo "Processing issue $1"
    return 0
  fi
}

# Close the issue
# $1 == issue_id
function close_issue() {
  echo "Closing issue $1"
  response=$(
    curl \
      --data-urlencode "state_event=close" \
      --request PUT \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/issues/$1"
  )

  errors=$(echo "${response}" | jq --raw-output '.message')
  state=$(echo "${response}" | jq --raw-output '.state')

  # Let's check if we want to process the linked issue
  if [[ "${errors}" == "404 Not found" ]]; then
    # If we can't find the issue we don't want to process
    echo "Issue $1 not found"
    return 1
  elif [[ "${state}" == "closed" ]]; then
    # If the state is closed we don't want to process
    echo "Issue $1 sucessfully closed"
    return 0
  else
    # Otherwise continue
    echo "Error Processing issue $1"
    echo "Close issue API response:"
    echo "${response}"
    return 1
  fi
}

# Update the Labels using LABELS_TO_ADD defined above
# $1 == issue_id
function add_labels() {
  echo "Adding labels to issue $1"
  curl \
    --data-urlencode "add_labels=$(
      IFS=,
      echo "${LABELS_TO_ADD[*]}"
    )" \
    --request PUT \
    --silent \
    --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
    "${PROJECT_URL}/issues/$1" >/dev/null
}

# Leave a Note (comment) on the issue to say it's in dev and needs testing
# $1 == issue_id
function add_note() {
  echo "Adding note to issue $1"
  curl \
    --data-urlencode "body=${NOTE}" \
    --request POST \
    --silent \
    --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
    "${PROJECT_URL}/issues/$1/notes" >/dev/null
}

function main() {
  # Loop over each issue
  for issue in "${ISSUES[@]}"; do
    # Only process the issue if 'check_issue' passes
    # shellcheck disable=SC2310
    if check_issue "${issue}"; then
      add_labels "${issue}"
      add_note "${issue}"
      close_issue "${issue}"
    fi
  done
}

main
