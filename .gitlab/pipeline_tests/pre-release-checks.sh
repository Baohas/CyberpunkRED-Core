#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# CHANGELOG_FILE PROJECT_URL RELEASE_NAME REPO_URL SYSTEM_FILE VERSION ZIP_FILE

# Create error counter
errors=0

# Get the release from GitLab
RELEASE=$(curl \
  --silent \
  --location \
  "https://gitlab.com/api/v4/projects/${CI_PROJECT_ID}/releases" \
  | jq '.[] | select(.name=="'"${VERSION}"'")'
)

# Get the system.json download link
RELEASE_MANIFEST=$(echo "${RELEASE}" \
  | jq -r '.assets.links[] | select (.name=="system.json") | .url'
)
# Get the zip download link
RELEASE_DOWNLOAD=$(echo "${RELEASE}" \
  | jq -r '.assets.links[] | select (.name=="'"${ZIP_FILE}"'") | .url'
)

# Test if we have updated the CHANGELOG.md
if grep -q "WIP" "${CHANGELOG_FILE}"; then
	echo "❌ The string 'WIP' exists in the changelog..."
  ((errors+=1))
else
  echo "✅ CHANGELOG.md has been updated!"
fi

# Check the versioned system.json url is what we expect
if [[ "${RELEASE_MANIFEST}" != "${REPO_URL}/${VERSION}/${SYSTEM_FILE}" ]]; then
  echo "❌ ${SYSTEM_FILE} download is incorrect"
  ((errors+=1))
else
  echo "✅ ${SYSTEM_FILE} url in release is correct!"
fi

# Check the versioned system url is what we expect
if [[ "${RELEASE_DOWNLOAD}" != "${REPO_URL}/${VERSION}/${ZIP_FILE}" ]]; then
  echo "❌ ${ZIP_FILE} download url is incorect."
  ((errors+=1))
else
  echo "✅ ${ZIP_FILE} url in release is correct!"
fi

# Check we can download the system.json
if ! curl --silent --location "${RELEASE_MANIFEST}" --output "${SYSTEM_FILE}"; then
  echo "❌ Unable to download ${SYSTEM_FILE}"
  ((errors+=1))
else
  echo "✅ ${SYSTEM_FILE} downloaded!"
fi

# Check we can download the zip
if ! curl --silent --location "${RELEASE_DOWNLOAD}" --output "${ZIP_FILE}"; then
  echo "❌ Unable to download ${ZIP_FILE}"
  ((errors+=1))
else
  echo "✅ ${ZIP_FILE} downloaded!"
fi

# Read the local system.json
local_version=$(jq -r .version "${SYSTEM_FILE}")
local_manifest=$(jq -r .manifest "${SYSTEM_FILE}")
local_download=$(jq -r .download "${SYSTEM_FILE}")
local_title=$(jq -r .title "${SYSTEM_FILE}")

# Check the `version` is correct in systm.json
if [[ "${local_version}" != "${VERSION}" ]]; then
  ((errors+=1))
  echo "❌ Version in ${SYSTEM_FILE} is incorrect"
else
  echo "✅ Version in ${SYSTEM_FILE} is correct!"
fi

# Check the `manifest` url is correct
if [[ "${local_manifest}" != "${REPO_URL}/latest/${SYSTEM_FILE}" ]]; then
  ((errors+=1))
  echo "❌ The 'manifest' url is incorrect in ${SYSTEM_FILE}"
else
  echo "✅ The 'manifest' url is correct in ${SYSTEM_FILE}!"
fi

# Check the `download` url is corect
if [[ "${local_download}" != "${REPO_URL}/${VERSION}/${ZIP_FILE}" ]]; then
  ((errors+=1))
  echo "❌ The 'download' url is incorrect in ${SYSTEM_FILE}"
else
  echo "✅ The 'download' url is correct in ${SYSTEM_FILE}!"
fi

# Check the `title` url is corect
if [[ "${local_title}" != "${SYSTEM_TITLE}" ]]; then
  ((errors+=1))
  echo "❌ The 'title' url is incorrect in ${SYSTEM_FILE}"
else
  echo "✅ The 'title' url is correct in ${SYSTEM_FILE}!"
fi

if [[ ${errors} -gt 0 ]]; then
  echo "❌ Errors were detected, please see output above."
  exit 1
else
  echo "🎉 All good. Ready to release!"
fi
