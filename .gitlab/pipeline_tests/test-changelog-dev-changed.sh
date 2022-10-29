#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# CHANGELOG_FILE

# If not during a MR related job this will not be set, so default to dev
CI_MERGE_REQUEST_TARGET_BRANCH_NAME="${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-dev}"
# Make a shorter variable
BRANCH="${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}"

# Check that Gitlab has fetched the dev branch
if ! git branch -a | grep -q "remotes/origin/${BRANCH}"; then
  echo "remotes/origin/${BRANCH} branch does not exist"
  exit 1
fi

# Test if the CHANGELOG has been updated
if git diff --quiet HEAD "remotes/origin/${BRANCH}" -- "${CHANGELOG_FILE}"; then
  echo "❌ Changelog not changed"
  exit 1
else
  echo "✅ Changelog changed"
fi
