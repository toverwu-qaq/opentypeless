#!/usr/bin/env bash
set -euo pipefail

for name in GH_TOKEN EXPECTED_RELEASE_ACTOR; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to verify the release publisher."
    exit 1
  fi
done

actual_actor="$(gh api user --jq .login | tr -d '\r\n')"
if [[ -z "$actual_actor" ]]; then
  echo "::error::The release token did not resolve to a GitHub account."
  exit 1
fi
if [[ "$actual_actor" != "$EXPECTED_RELEASE_ACTOR" ]]; then
  echo "::error::The release token belongs to '$actual_actor'; expected '$EXPECTED_RELEASE_ACTOR'."
  exit 1
fi

echo "Verified release publisher identity: $actual_actor."
