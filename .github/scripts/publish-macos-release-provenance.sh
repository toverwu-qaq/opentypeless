#!/usr/bin/env bash
set -euo pipefail

for name in TAG_NAME ARTIFACT_PATHS; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to publish macOS release provenance."
    exit 1
  fi
done

select_artifact() {
  local suffix=$1
  local count
  count=$(jq --arg suffix "$suffix" '[.[] | select(endswith($suffix))] | length' <<<"$ARTIFACT_PATHS")
  if [[ "$count" != 1 ]]; then
    echo "::error::Expected exactly one macOS artifact ending in $suffix; found $count." >&2
    exit 1
  fi
  jq -r --arg suffix "$suffix" '.[] | select(endswith($suffix))' <<<"$ARTIFACT_PATHS"
}

tarball_path=$(select_artifact '.app.tar.gz')
tarball_signature_path=$(select_artifact '.app.tar.gz.sig')
dmg_path=$(select_artifact '.dmg')
version=${TAG_NAME#v}
stage_dir=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-macos-provenance.XXXXXX")

cp "$tarball_path" "$stage_dir/OpenTypeless_universal.app.tar.gz"
cp "$tarball_signature_path" "$stage_dir/OpenTypeless_universal.app.tar.gz.sig"
cp "$dmg_path" "$stage_dir/OpenTypeless_${version}_universal.dmg"

./.github/scripts/publish-release-provenance.sh macos-universal \
  "$stage_dir/OpenTypeless_universal.app.tar.gz" \
  "$stage_dir/OpenTypeless_universal.app.tar.gz.sig" \
  "$stage_dir/OpenTypeless_${version}_universal.dmg"
