#!/usr/bin/env bash
set -euo pipefail

for name in GH_TOKEN TAG_NAME EXPECTED_ASSET_SNAPSHOT_SHA256; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to verify the release asset snapshot."
    exit 1
  fi
done
if [[ ! "$EXPECTED_ASSET_SNAPSHOT_SHA256" =~ ^[0-9a-f]{64}$ ]]; then
  echo "::error::EXPECTED_ASSET_SNAPSHOT_SHA256 must be a lowercase SHA-256 digest."
  exit 1
fi

snapshot_file="$(mktemp "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-release-snapshot.XXXXXX")"
./.github/scripts/snapshot-release-assets.sh >"$snapshot_file"
if command -v sha256sum >/dev/null; then
  actual_digest="$(sha256sum "$snapshot_file" | awk '{ print $1 }')"
else
  actual_digest="$(shasum -a 256 "$snapshot_file" | awk '{ print $1 }')"
fi
if [[ "$actual_digest" != "$EXPECTED_ASSET_SNAPSHOT_SHA256" ]]; then
  echo "::error::Release assets changed after verification began."
  exit 1
fi

echo "Verified unchanged release asset snapshot $actual_digest."
