#!/usr/bin/env bash
set -euo pipefail

platform=${1:-}
shift || true

for name in GH_TOKEN TAG_NAME; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to publish release provenance."
    exit 1
  fi
done
if [[ -z "$platform" || $# -eq 0 ]]; then
  echo "Usage: $0 PLATFORM ASSET..." >&2
  exit 2
fi

provenance="OpenTypeless-provenance-${platform}.json"
./.github/scripts/create-signed-release-provenance.sh "$platform" "$@"

gh release upload "$TAG_NAME" "$provenance" "${provenance}.sig" \
  --repo tover0314-w/opentypeless \
  --clobber

echo "Published signed $platform release provenance for $TAG_NAME."
