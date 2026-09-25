#!/usr/bin/env bash
set -euo pipefail

official_repo="${OFFICIAL_REPO:-tover0314-w/opentypeless}"

for name in GH_TOKEN TAG_NAME; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to verify the target prerelease."
    exit 1
  fi
done

release_json="$(gh api "repos/$official_repo/releases/tags/$TAG_NAME")"
if [[ "$(jq -r '.tag_name' <<<"$release_json")" != "$TAG_NAME" ]]; then
  echo "::error::The target Release is attached to an unexpected tag."
  exit 1
fi
if [[ "$(jq -r '.draft' <<<"$release_json")" != "false" ]]; then
  echo "::error::The target Release must not be a draft."
  exit 1
fi
if [[ "$(jq -r '.prerelease' <<<"$release_json")" != "true" ]]; then
  echo "::error::The target Release must remain a prerelease until final verification succeeds."
  exit 1
fi

echo "Verified that $official_repo $TAG_NAME is an unpublished prerelease."
