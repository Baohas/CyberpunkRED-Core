#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars come from build.sh which creates build.env
# which is then loaded into the env by .gitlab-ci.yml
# REPO_URL, SYSTEM_FILE, VERSION, ZIP_FILE

# Create a Release in GitLab
# NOTE: This references the files created by `build.sh` not the
#       system.json above
if ! release-cli create \
      --name "${VERSION}" \
      --description "Automated release of ${VERSION}" \
      --tag-name "${VERSION}" \
      --assets-link "{\"name\":\"${SYSTEM_FILE}\",\"url\":\"${REPO_URL}/${VERSION}/${SYSTEM_FILE}\"}" \
      --assets-link "{\"name\":\"${ZIP_FILE}\",\"url\":\"${REPO_URL}/${VERSION}/${ZIP_FILE}\"}"; then
      # TODO: We can probably parse CHANGELOG.md and publish the changelog
      # as part of the release as a file and as the description.

  echo "❌ Unable to create release for ${SYSTEM_NAME} ${VERSION}"
else
  echo "🎉 Created ${SYSTEM_NAME} ${VERSION} release successfully!"
fi
