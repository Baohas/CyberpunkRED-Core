#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# CHANGELOG_FILE

# The following vare are set by GitLab CI
# CI_MERGE_REQUEST_TARGET_BRANCH_NAME

# If not during a MR related job this will not be set, so default to dev
BRANCH="${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-dev}"

# Check that Gitlab has the target branch fetched and if not fetch it
if ! git branch -a | grep -q "remotes/origin/${BRANCH}"; then
  if ! git fetch --quiet origin "${BRANCH}" ; then
    echo "❌ Unable to fetch ${BRANCH}"
    echo "Check the target branch exists and re-run the job"
    exit 1
  fi
fi

# Test if the CHANGELOG has been updated
if git diff --quiet HEAD "remotes/origin/${BRANCH}" -- "${CHANGELOG_FILE}"; then
  echo "❌ Changelog not changed"
  exit 1
else
  echo "✅ Changelog changed"
fi
