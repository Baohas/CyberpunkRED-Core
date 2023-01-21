#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# SYSTEM_VERSION

# Variables that are set by GitLab CI environment
# CI_API_V4_URL, CI_PROJECT_ID, CHOOM_BOT_API, SYSTEM_VERSION

# URL to use as the base for out API calls
PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"

# Labels for issue we want to close
# Case sensitive
LABELS_TO_CLOSE=(
  "Workflow::In Dev"
  "Workflow::Ready For Master"
  "Workflow::Dev Merge"
)

# Note to add to each issue
NOTE="We have just released ${SYSTEM_VERSION} which includes these changes."

# Find all issues labelled with the LABELS_TO_CLOSE labels
# We have to loop over each label and add it to an array here as you can't
# just query multiple lables at once
declare -a TEMP_ISSUES
for label in "${LABELS_TO_CLOSE[@]}"; do
  mapfile -t label_issues < <(
    curl \
      --request GET \
      --data-urlencode "scope=all" \
      --data-urlencode "state=opened" \
      --data-urlencode "per_page=100" \
      --data-urlencode "labels=${label}" \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/issues" |
      jq '.[].iid'
  )

  TEMP_ISSUES+=("${label_issues[@]}")
done

# Dedupe the list of issues
mapfile -t ISSUES < <(
  tr ' ' '\n' <<<"${TEMP_ISSUES[@]}" |
    awk '!u[$0]++' |
    tr '\n' ' '
)

# Close the issue
# $1 == issue_id
function close_issue() {
  curl \
    --data-urlencode "state_event=close" \
    --request PUT \
    --silent \
    --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
    "${PROJECT_URL}/issues/$1" >/dev/null
}

# Leave a Note (comment) on the issue to say it's in dev and needs testing
# $1 == issue_id
function add_note() {
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
    add_note "${issue}"
    close_issue "${issue}"
  done
}

main
