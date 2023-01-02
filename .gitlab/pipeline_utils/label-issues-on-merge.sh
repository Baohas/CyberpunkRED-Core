#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

##################
# GitLab Variables
##################
# Variables that are set by GitLab CI environment
# CI_API_V4_URL, CI_PROJECT_ID, CI_MERGE_REQUEST_IID

# URL to use as the base for out API calls
PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"

# Parse the mentioned issues from the MR description and create an array
mapfile -t ISSUES < <(
  curl \
    --silent \
    --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
    "${PROJECT_URL}/merge_requests/${CI_MERGE_REQUEST_IID}" |
    jq '.description' |
    grep -oE '#[0-9]{1,10}' |
    tr -d '#'
)

# Labels to add to the Issues in ISSUES
# Case sensitive
LABELS_TO_ADD=(
  "Workflow::In Dev"
  "Test Me!"
)

# Some issues we just want to close once merged like build system changes
# Case sensitive
LABELS_TO_CLOSE=(
  "Type::Build System"
)

# Note to add to each issue mentioned in the MR
NOTE="We have just merged !${CI_MERGE_REQUEST_IID} into \`dev\`.

This means it's on track to be in the next release but it needs testing first.

If you want to help test this please check out the documentation on [Development Release](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core/-/wikis/releases/Development-Releases) and how to install them."

# Run checks on an issue
# $1 == issue_id
function check_issue() {
  local response
  local errors
  local state

  response=$(
    curl \
      --silent \
      --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
      "${PROJECT_URL}/issues/$1"
  )

  errors=$(echo "${response}" | jq --raw-output '.message')
  state=$(echo "${response}" | jq --raw-output '.state')

  # Let's check if we want to process the linked issue
  if [[ "${errors}" == "404 Not found" ]]; then
    # If we can't find the issue we don't want to process
    return 1
  elif [[ "${state}" == "closed" ]]; then
    # If the state is closed we don't want to process
    return 1
  else
    # Otherwise continue
    return 0
  fi
}

# Close the issue
# $1 == issue_id
function close_issue() {
  curl \
    --data-urlencode "state_event=close" \
    --request PUT \
    --silent \
    --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
    "${PROJECT_URL}/issues/$1" >/dev/null
}

# Update the Labels using LABELS_TO_ADD defined above
# $1 == issue_id
function add_labels() {
  curl \
    --data-urlencode "add_labels=$(
      IFS=,
      echo "${LABELS_TO_ADD[*]}"
    )" \
    --request PUT \
    --silent \
    --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
    "${PROJECT_URL}/issues/$1" >/dev/null
}

# Leave a Note (comment) on the issue to say it's in dev and needs testing
# $1 == issue_id
function add_note() {
  curl \
    --data-urlencode "body=${NOTE}" \
    --request POST \
    --silent \
    --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
    "${PROJECT_URL}/issues/$1/notes" >/dev/null
}

function main() {
  # Loop over each issue
  for issue in "${ISSUES[@]}"; do
    # Only process the issue if 'check_issue' passes
    # shellcheck disable=SC2310
    if check_issue "${issue}"; then
      mapfile -t labels < <(
        curl \
          --silent \
          --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
          "${PROJECT_URL}/issues/${issue}" |
          jq --raw-output '.labels[]'
      )

      # Check if the issue's lables are in our LABELS_TO_CLOSE array
      close=0
      for label in "${labels[@]}"; do
        for ltc in "${LABELS_TO_CLOSE[@]}"; do
          if [[ "${ltc}" == "${label}" ]]; then
            # If there is a match mark the issue to be closed
            ((close = close + 1))
          fi
        done
      done
      # Close if in LABELS_TO_CLOSE
      if [[ ${close} -gt 0 ]]; then
        close_issue "${issue}"
      else # Add the labels from LABELS_TO_ADD and add NOTE to the issue
        add_labels "${issue}"
        add_note "${issue}"
      fi
    fi
  done
}

main
