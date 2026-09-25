#!/usr/bin/env bash
set -euo pipefail

official_repo="${OFFICIAL_REPO:-tover0314-w/opentypeless}"

for name in GH_TOKEN TAG_NAME; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to snapshot release assets."
    exit 1
  fi
done
if [[ ! "$TAG_NAME" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "::error::TAG_NAME must be a stable semantic-version tag."
  exit 1
fi

release_json="$(gh api "repos/$official_repo/releases/tags/$TAG_NAME")"
if ! jq -e '.assets | length > 0 and all(.[]; (.digest | type == "string") and (.digest | test("^sha256:[0-9a-f]{64}$")))' \
  <<<"$release_json" >/dev/null; then
  echo "::error::Every release asset must have a GitHub SHA-256 digest."
  exit 1
fi

jq -cS '{
      release_id: .id,
      tag_name: .tag_name,
      draft: .draft,
      prerelease: .prerelease,
      assets: [.assets[] | {id, name, size, digest}] | sort_by(.name)
    }' <<<"$release_json" | tr -d '\r\n'
