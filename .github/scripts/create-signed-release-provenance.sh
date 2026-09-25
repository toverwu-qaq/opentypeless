#!/usr/bin/env bash
set -euo pipefail

platform=${1:-}
shift || true

for name in TAG_NAME OFFICIAL_SHA EXPECTED_CICD_SHA TAURI_SIGNING_PRIVATE_KEY TAURI_SIGNING_PRIVATE_KEY_PASSWORD; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to create signed release provenance."
    exit 1
  fi
done
if [[ -z "$platform" || $# -eq 0 ]]; then
  echo "Usage: $0 PLATFORM ASSET..." >&2
  exit 2
fi

provenance="OpenTypeless-provenance-${platform}.json"
node .github/scripts/create-release-provenance.mjs "$platform" "$provenance" "$@" >&2
npx tauri signer sign "$provenance" >/dev/null
if [[ ! -f "${provenance}.sig" || -L "${provenance}.sig" || ! -s "${provenance}.sig" ]]; then
  echo "::error::Tauri did not create a regular, non-empty provenance signature."
  exit 1
fi
if ! tr -d '\r\n' < "${provenance}.sig" | base64 --decode >/dev/null; then
  echo "::error::The provenance signature is not valid base64."
  exit 1
fi

echo "Created signed $platform release provenance." >&2
