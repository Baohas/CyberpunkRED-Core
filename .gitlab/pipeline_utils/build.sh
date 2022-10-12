#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# SYSTEM_NAME is declared in .gitlab-ci.yml
# Get the version from the CI_COMMIT_TAG provided by GitLab CI
VERSION="${CI_COMMIT_TAG}"
# Base URL for the project
PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"
# Base URL of the repo + $VERSION
REPO_URL="${PROJECT_URL}/packages/generic/fvtt-${SYSTEM_NAME}"
# Full name of the release including version
# SYSTEM_NAME if declared in .gitlab-ci.yml
RELEASE_NAME="fvtt-${SYSTEM_NAME}-${VERSION}"
# Define the files we'll be working with to publish later
SYSTEM_FILE="system.json"
ZIP_FILE="${RELEASE_NAME}.zip"

# Export some variables we'll use in later CI steps
# Keeps all the logic in one place
{
  echo "PROJECT_URL=${PROJECT_URL}"
  echo "RELEASE_NAME=${RELEASE_NAME}"
  echo "REPO_URL=${REPO_URL}"
  echo "SYSTEM_FILE=${SYSTEM_FILE}"
  echo "VERSION=${VERSION}"
  echo "ZIP_FILE=${ZIP_FILE}"
} > build.env

# Export them for processes in this script
export "PROJECT_URL=${PROJECT_URL}"
export "RELEASE_NAME=${RELEASE_NAME}"
export "REPO_URL=${REPO_URL}"
export "SYSTEM_FILE=${SYSTEM_FILE}"
export "VERSION=${VERSION}"
export "ZIP_FILE=${ZIP_FILE}"

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
