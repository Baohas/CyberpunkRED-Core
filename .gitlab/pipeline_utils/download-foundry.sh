#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Download and unpack the latest Foundry VTT "Node" build for the generation this
# system targets (src/system.json -> compatibility.verified), using foundryvtt.com
# account credentials (replacing the felddy container for CI). It finds the newest
# build of that generation, logs in, resolves its presigned release URL, downloads
# it, and extracts it to <FOUNDRY_APP_PATH>/v<generation> — the layout the test
# harness expects.
#
# Required environment:
#   FOUNDRY_USER      foundryvtt.com account username or email
#   FOUNDRY_PASS      foundryvtt.com account password
#   FOUNDRY_APP_PATH  base install dir (the v<generation> subdir is created here)

readonly BASE_URL="https://foundryvtt.com"
readonly LOGIN_URL="${BASE_URL}/auth/login/"
readonly USER_AGENT="cyberpunk-red-core-ci"
# Retry transient failures (timeouts, 5xx, refused connections) — foundryvtt.com
# is external. curl does not retry 4xx, so bad credentials still fail fast.
readonly CURL_RETRY=(--retry 3 --retry-delay 5 --retry-connrefused)

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
system_json="${script_dir}/../../src/system.json"

# Foundry generation this system targets, e.g. 13.
generation="$(node -p "require('${system_json}').compatibility.verified")"

cookies="$(mktemp)"
archive="$(mktemp --suffix=.zip)"
trap 'rm -f "${cookies}" "${archive}"' EXIT

# Resolve the newest build for that generation from the public releases list
# (e.g. generation 13 -> 13.351). Links look like /releases/13.351.
releases_html="$(
  curl --fail --silent --show-error --location "${CURL_RETRY[@]}" \
    --user-agent "${USER_AGENT}" "${BASE_URL}/releases/"
)"
version="$(
  printf '%s' "${releases_html}" |
    grep -oP "/releases/${generation}\.[0-9]+" |
    grep -oP "${generation}\.[0-9]+" | sort -V | tail -n1
)"
if [[ -z "${version}" ]]; then
  echo "❌ Could not find a release for Foundry generation ${generation}" >&2
  exit 1
fi
build="${version##*.}"
dest="${FOUNDRY_APP_PATH}/v${generation}"

# 1. Load the login page to read the CSRF form token (the csrftoken cookie lands
#    in the jar at the same time).
login_page="$(
  curl --fail --silent --show-error --location "${CURL_RETRY[@]}" \
    --cookie-jar "${cookies}" --user-agent "${USER_AGENT}" "${LOGIN_URL}"
)"
csrf_token="$(
  printf '%s' "${login_page}" |
    grep -oP 'name="csrfmiddlewaretoken"[^>]*value="\K[^"]+' | head -n1
)"
if [[ -z "${csrf_token}" ]]; then
  echo "❌ Could not read csrfmiddlewaretoken from the login page" >&2
  exit 1
fi

# 2. Log in; success is signalled by a sessionid cookie being set.
curl --fail --silent --show-error "${CURL_RETRY[@]}" \
  --cookie "${cookies}" --cookie-jar "${cookies}" \
  --user-agent "${USER_AGENT}" --referer "${LOGIN_URL}" \
  --data-urlencode "csrfmiddlewaretoken=${csrf_token}" \
  --data-urlencode "username=${FOUNDRY_USER}" \
  --data-urlencode "password=${FOUNDRY_PASS}" \
  --data-urlencode "next=/" \
  --output /dev/null "${LOGIN_URL}"
if ! grep -q "sessionid" "${cookies}"; then
  echo "❌ Login failed — check FOUNDRY_USER / FOUNDRY_PASS" >&2
  exit 1
fi

# 3. Resolve the presigned download URL for the Node build.
release_json="$(
  curl --fail --silent --show-error --location "${CURL_RETRY[@]}" \
    --cookie "${cookies}" --user-agent "${USER_AGENT}" --referer "${BASE_URL}" \
    "${BASE_URL}/releases/download?build=${build}&platform=node&response_type=json"
)"
download_url="$(
  FVTT_RELEASE_JSON="${release_json}" node -e \
    'process.stdout.write(JSON.parse(process.env.FVTT_RELEASE_JSON).url || "")'
)"
if [[ -z "${download_url}" ]]; then
  echo "❌ Could not resolve a download URL for build ${build}" >&2
  exit 1
fi

# 4. Download the archive and extract it to the harness's expected layout.
curl --fail --silent --show-error --location "${CURL_RETRY[@]}" \
  --user-agent "${USER_AGENT}" --output "${archive}" "${download_url}"
mkdir -p "${dest}"
unzip -q -o "${archive}" -d "${dest}"

echo "✅ Foundry ${version} (Node build ${build}) installed to ${dest}"
