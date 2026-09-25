#!/usr/bin/env bash
set -euo pipefail

official_repo=${OFFICIAL_REPO:-tover0314-w/opentypeless}

for name in GH_TOKEN TAG_NAME OFFICIAL_SHA; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to prepare the official prerelease."
    exit 1
  fi
done
if [[ ! "$TAG_NAME" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "::error::TAG_NAME must be a stable semantic-version tag."
  exit 1
fi
if [[ ! "$OFFICIAL_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::OFFICIAL_SHA must be a full lowercase 40-character commit SHA."
  exit 1
fi

verify_official_tag() {
  local tag_ref="refs/tags/$TAG_NAME"
  local direct_sha
  local peeled_sha
  local tag_sha

  if ! direct_sha=$(git ls-remote --exit-code "https://github.com/${official_repo}.git" "$tag_ref" | awk 'NR == 1 { print $1 }'); then
    echo "::error::$TAG_NAME does not exist in the official repository."
    exit 1
  fi
  peeled_sha=$(git ls-remote "https://github.com/${official_repo}.git" "${tag_ref}^{}" | awk 'NR == 1 { print $1 }')
  tag_sha=${peeled_sha:-$direct_sha}
  if [[ "$tag_sha" != "$OFFICIAL_SHA" ]]; then
    echo "::error::$TAG_NAME does not resolve to OFFICIAL_SHA."
    exit 1
  fi
}

gh api "repos/$official_repo" >/dev/null
verify_official_tag
releases=$(gh api --paginate "repos/$official_repo/releases?per_page=100")
matches=$(jq -s --arg tag "$TAG_NAME" '[.[][] | select(.tag_name == $tag)]' <<<"$releases")
match_count=$(jq 'length' <<<"$matches")
if (( match_count > 1 )); then
  echo "::error::Multiple GitHub Releases claim $TAG_NAME."
  exit 1
fi

if (( match_count == 0 )); then
  gh release create "$TAG_NAME" \
    --repo "$official_repo" \
    --verify-tag \
    --target "$OFFICIAL_SHA" \
    --title "OpenTypeless $TAG_NAME" \
    --notes 'See the assets below to download and install.' \
    --prerelease \
    --latest=false
else
  release=$(jq '.[0]' <<<"$matches")
  if [[ "$(jq -r '.draft' <<<"$release")" == true ]]; then
    echo "::error::$TAG_NAME already exists as a draft. Refusing to mutate it automatically; review and remove the stale draft first."
    exit 1
  elif [[ "$(jq -r '.prerelease' <<<"$release")" != true ]]; then
    echo "::error::$TAG_NAME already exists as a stable Release."
    exit 1
  fi
fi

verify_official_tag
./.github/scripts/verify-prerelease-release.sh
