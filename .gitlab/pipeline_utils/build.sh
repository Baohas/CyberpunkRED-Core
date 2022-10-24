#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# SYSTEM_NAME is declared in .gitlab-ci.yml
# CI_API_V4_URL, CI_PROJECT_ID, CI_COMMIT_TAG come from Gitlab CI

# Base URL for the project
PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"
# Set CI_COMMIT_TAG to "" if it does not exist
CI_COMMIT_TAG="${CI_COMMIT_TAG:-}"
# System manifest
SYSTEM_FILE="system.json"
# Define the url we upload the packages to
REPO_URL="${PROJECT_URL}/packages/generic/fvtt-${SYSTEM_NAME}"
# Set the version number
VERSION="${CI_COMMIT_TAG}"
# SYSTEM_TITLE (display name for system in Foundry)
SYSTEM_TITLE="Cyberpunk RED - CORE"

# If we don't have CI_COMMIT_TAG we're most likely merging to dev so
# overwite the defaults.
if [[ -z "${CI_COMMIT_TAG}" ]]; then
  # Append "-dev" to the package repo name
  REPO_URL="${PROJECT_URL}/packages/generic/fvtt-${SYSTEM_NAME}-dev"
  # Use the date/time as a version number
  VERSION="v$(date +%Y%m%d.%H%M)"
  # Set the system title to inclue DEV to make identifying it easier in Foundry
  SYSTEM_TITLE="Cyberpunk RED - CORE - DEV"
fi

# Full name of the release including version
# SYSTEM_NAME if declared in .gitlab-ci.yml
RELEASE_NAME="fvtt-${SYSTEM_NAME}-${VERSION}"
# Define the files we'll be working with to publish later
ZIP_FILE="${RELEASE_NAME}.zip"

# Export some variables we'll use in later CI steps
# Keeps all the logic in one place
{
  echo "PROJECT_URL=${PROJECT_URL}"
  echo "RELEASE_NAME=${RELEASE_NAME}"
  echo "REPO_URL=${REPO_URL}"
  echo "SYSTEM_FILE=${SYSTEM_FILE}"
  echo "SYSTEM_TITLE=${SYSTEM_TITLE}"
  echo "VERSION=${VERSION}"
  echo "ZIP_FILE=${ZIP_FILE}"
} > build.env

# Export them for processes in this script
export PROJECT_URL="${PROJECT_URL}"
export RELEASE_NAME="${RELEASE_NAME}"
export REPO_URL="${REPO_URL}"
export SYSTEM_FILE="${SYSTEM_FILE}"
export SYSTEM_TITLE="${SYSTEM_TITLE}"
export VERSION="${VERSION}"
export ZIP_FILE="${ZIP_FILE}"

# Then stick them in an array so we can loop over them later
declare -a UPLOAD_FILES
UPLOAD_FILES=(
  "${SYSTEM_FILE}"
  "${ZIP_FILE}"
)

# Build the system
if ! npm run build; then
  echo "❌ Failed to build system using npm build"
  exit 1
else
  echo "✅ Project sucessfully built!"
fi

# Copy the system.json so we can export it as an artifact
if ! cp "dist/${SYSTEM_FILE}" "${SYSTEM_FILE}"; then
  echo "❌ Unable to copy 'dist/${SYSTEM_FILE}'"
  exit 1
else
  echo "✅ Copied dist/${SYSTEM_FILE}!"
fi

# Rename the dist dir so it's the correct name in the zip
if ! mv dist "${RELEASE_NAME}"; then
  echo "❌ Unable to rename 'dist/' to '${RELEASE_NAME}'"
  exit 1
else
  echo "✅ Moved 'dist/' '${RELEASE_NAME}'!"
fi

# Zip up the system directory to create the system artifact
if ! zip --quiet "${ZIP_FILE}" --recurse-paths "${RELEASE_NAME}"; then
  echo "❌ Unable to zip ${SYSTEM_NAME}"
  exit 1
else
  echo "✅ Successfully zipped ${SYSTEM_NAME}!"
fi

# Upload UPLOAD_FILES to generic repo
# Available at: https://gitlab.com/api/v4/projects/39692371/packages/generic/fvtt-cyberpunk-red-core/${version}/${file}.json

for file in "${UPLOAD_FILES[@]}"; do
  # Upload the file and grab the response from the api
  response=$(curl \
    --silent \
    --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
    --upload-file "${file}" "${REPO_URL}/${VERSION}/${file}"
  )

  # Check the response
  if [[ "$(echo "${response}" | jq -r .message)" != "201 Created" ]]; then
    echo "❌ Uploading ${file} failed, please see the message below"
    echo "❌ ${response}"
    exit 1
  else
    echo "🎉 Uploaded ${file} sucesfully"
  fi
done
