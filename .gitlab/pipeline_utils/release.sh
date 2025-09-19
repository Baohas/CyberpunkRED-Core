#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# REPO_URL SYSTEM_FILE SYSTEM_NAME SYSTEM_VERSION ZIP_FILE

# Function to detect OS and architecture
detect_platform() {
  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"

  # Convert architecture naming
  case "${ARCH}" in
  x86_64) ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  armv7l) ARCH="arm" ;;
  esac

  echo "${OS}_${ARCH}"
}

# Get the platform
PLATFORM=$(detect_platform)

# Get the latest version from GitLab API
echo "Fetching latest glab version..."
LATEST_VERSION=$(curl -s "https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/releases" | jq -r '.[0].tag_name')

if [[ -z "${LATEST_VERSION}" ]]; then
  echo "Error: Could not determine the latest version."
  exit 1
fi

echo "Latest version: ${LATEST_VERSION}"

# Download URL
DOWNLOAD_URL="https://gitlab.com/gitlab-org/cli/-/releases/${LATEST_VERSION}/downloads/glab_${LATEST_VERSION#v}_${PLATFORM}.tar.gz"

# Create temporary directory
TMP_DIR=$(mktemp -d)

echo "Downloading glab..."
if ! curl -L "${DOWNLOAD_URL}" -o "${TMP_DIR}/glab.tar.gz"; then
  echo "Error: Downloading glab cli failed"
  rm -rf "${TMP_DIR}"
  exit 1
fi

# Extract the archive
echo "Extracting Gitlab CLI..."
tar -xzf "${TMP_DIR}/glab.tar.gz" -C "${TMP_DIR}"
mv "${TMP_DIR}/bin/glab" .
chmod +x ./glab

# Clean up
rm -rf "${TMP_DIR}"

# Create a Release in GitLab
# NOTE: This references the files created by the `build-artifacts` job.

if ! ./glab auth login --job-token "${CI_JOB_TOKEN}"; then
  echo "❌ Unable to log into the Gitlab API"
fi

if ! ./glab release create "${SYSTEM_VERSION}" \
  --name "${SYSTEM_VERSION}" \
  --notes "Automated release of ${SYSTEM_VERSION}" \
  --assets-links="[
    {
      \"name\": \"${SYSTEM_FILE}\",
      \"url\": \"${REPO_URL}/${SYSTEM_VERSION}/${SYSTEM_FILE}\",
      \"link_type\": \"other\"
    },
    {
      \"name\": \"${ZIP_FILE}\",
      \"url\": \"${REPO_URL}/${SYSTEM_VERSION}/${ZIP_FILE}\",
      \"link_type\": \"other\"
    }
  ]"; then

  echo "❌ Unable to create release for ${SYSTEM_NAME} ${SYSTEM_VERSION}"
  exit 1
else
  echo "🎉 Created ${SYSTEM_NAME} ${SYSTEM_VERSION} release successfully!"
fi
