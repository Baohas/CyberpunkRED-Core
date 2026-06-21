#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Post (or update) a single Merge Request comment summarising the browser test
# run: a table of any failed tests plus a gallery of the rendered-sheet
# screenshots captured during the run. Runs from test-browser's after_script, so
# it fires on both pass and fail. No-op outside a Merge Request pipeline.
#
# Uses the CHOOM_BOT_API bot token, like the issue-management jobs. Relevant env:
#   CHOOM_BOT_API CI_API_V4_URL CI_PROJECT_ID CI_MERGE_REQUEST_IID CI_JOB_URL

readonly MARKER="<!-- browser-report -->"
readonly RESULTS=".playwright/test-results/results.json"
readonly SHEETS_DIR=".playwright/test-results/sheets"

# Only comment on Merge Requests.
readonly MR_IID="${CI_MERGE_REQUEST_IID:-}"
if [[ -z "${MR_IID}" ]]; then
  echo "Not a Merge Request pipeline; skipping browser report comment."
  exit 0
fi

# No results.json means the job failed before the tests ran (image pull, Foundry
# download, build, or harness launch). There's nothing test-related to report, so
# don't post a comment at all — the job log has the failure.
if [[ ! -f "${RESULTS}" ]]; then
  echo "No test results at ${RESULTS}; the job failed before tests ran — skipping report."
  exit 0
fi

readonly PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"
readonly MR_URL="${PROJECT_URL}/merge_requests/${MR_IID}"
readonly AUTH=(--header "PRIVATE-TOKEN: ${CHOOM_BOT_API}")

body="$(mktemp)"
trap 'rm -f "${body}"' EXIT

{
  echo "${MARKER}"
  echo "## 🎭 Browser tests"
  echo
} >"${body}"

# --- Status / failed-tests table (from the Playwright JSON report) ----------
mapfile -t failed < <(
  jq -r \
    '[.. | .specs? // empty | .[] | select(.ok == false) | .title] | unique | .[]' \
    "${RESULTS}"
)
if [[ "${#failed[@]}" -gt 0 ]]; then
  {
    echo "### ❌ ${#failed[@]} failed"
    echo
    echo "| Failed test |"
    echo "| --- |"
    for title in "${failed[@]}"; do
      echo "| ${title} |"
    done
    echo
  } >>"${body}"
else
  echo "✅ All browser tests passed." >>"${body}"
  echo >>"${body}"
fi

# --- Rendered-sheet gallery -------------------------------------------------
shopt -s nullglob
shots=("${SHEETS_DIR}"/*.png)
shopt -u nullglob

if [[ "${#shots[@]}" -gt 0 ]]; then
  {
    echo "<details><summary>Rendered sheets (${#shots[@]})</summary>"
    echo
  } >>"${body}"
  for shot in "${shots[@]}"; do
    # Upload the screenshot; the API returns a ready-to-embed markdown snippet.
    markdown="$(
      curl --silent "${AUTH[@]}" --form "file=@${shot}" "${PROJECT_URL}/uploads" |
        jq -r '.markdown // empty' 2>/dev/null || true
    )"
    if [[ -n "${markdown}" ]]; then
      echo "${markdown}" >>"${body}"
      echo >>"${body}"
    fi
  done
  {
    echo "</details>"
    echo
  } >>"${body}"
fi

echo "_[Pipeline job](${CI_JOB_URL})_" >>"${body}"

# --- Post or update a single comment ----------------------------------------
existing_id="$(
  curl --silent "${AUTH[@]}" \
    "${MR_URL}/notes?per_page=100&order_by=updated_at&sort=desc" |
    jq -r --arg m "${MARKER}" 'map(select(.body | startswith($m))) | .[0].id // empty'
)"

if [[ -n "${existing_id}" ]]; then
  echo "Updating existing browser-report comment ${existing_id}"
  curl --silent --fail --request PUT "${AUTH[@]}" \
    --data-urlencode "body@${body}" \
    "${MR_URL}/notes/${existing_id}" >/dev/null
else
  echo "Creating browser-report comment"
  curl --silent --fail --request POST "${AUTH[@]}" \
    --data-urlencode "body@${body}" \
    "${MR_URL}/notes" >/dev/null
fi

echo "✅ Posted browser report to MR !${MR_IID}"
