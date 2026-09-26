#!/usr/bin/env bash
set -euo pipefail

repo_root="$(pwd)"
fixture_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-finalize-test.XXXXXX")"
mock_bin="$fixture_dir/bin"
mkdir -p "$mock_bin"

cat >"$mock_bin/gh" <<'MOCK_GH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == api && "${2:-}" == user ]]; then
  printf '%s\r\n' "${MOCK_RELEASE_ACTOR:-tover0314-w}"
  exit 0
fi
cat "$MOCK_RELEASE_JSON"
MOCK_GH
chmod +x "$mock_bin/gh"

cat >"$mock_bin/sha256sum" <<'MOCK_SHA256SUM'
#!/usr/bin/env bash
set -euo pipefail
digest="$("$REAL_SHA256SUM" "$@" | awk '{ print $1 }')"
printf '%s\r\n' "$digest"
MOCK_SHA256SUM
chmod +x "$mock_bin/sha256sum"

cat >"$fixture_dir/release.json" <<'RELEASE_JSON'
{
  "id": 1,
  "tag_name": "v1.1.60",
  "draft": false,
  "prerelease": true,
  "assets": [
    {
      "id": 2,
      "name": "OpenTypeless_1.1.60_x64-setup.exe",
      "size": 1,
      "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  ]
}
RELEASE_JSON

export MOCK_RELEASE_JSON="$fixture_dir/release.json"
export REAL_SHA256SUM="$(command -v sha256sum)"
export PATH="$mock_bin:$PATH"

snapshot_file="$fixture_dir/release-assets.json"
GH_TOKEN=test TAG_NAME=v1.1.60 ./.github/scripts/snapshot-release-assets.sh >"$snapshot_file"
expected_digest="$("$REAL_SHA256SUM" "$snapshot_file" | awk '{ print $1 }')"

GH_TOKEN=test \
TAG_NAME=v1.1.60 \
EXPECTED_ASSET_SNAPSHOT_SHA256="$expected_digest" \
  ./.github/scripts/verify-release-asset-snapshot.sh

GH_TOKEN=test EXPECTED_RELEASE_ACTOR=tover0314-w \
  ./.github/scripts/verify-release-publisher.sh
if GH_TOKEN=test EXPECTED_RELEASE_ACTOR=someone-else \
  ./.github/scripts/verify-release-publisher.sh; then
  echo "::error::A release token for the wrong account passed publisher verification."
  exit 1
fi

source_repo="$fixture_dir/source-repo"
mkdir -p "$source_repo/.github/scripts" "$source_repo/.github/workflows" "$source_repo/docs" "$source_repo/src"
git -C "$source_repo" init --quiet
git -C "$source_repo" config user.name 'OpenTypeless CI'
git -C "$source_repo" config user.email 'ci@opentypeless.com'
printf 'base\n' >"$source_repo/src/app.txt"
printf 'snapshot verifier v1\n' >"$source_repo/.github/scripts/verify-release-asset-snapshot.sh"
printf 'finalizer v1\n' >"$source_repo/.github/workflows/finalize-release.yml"
printf 'release docs v1\n' >"$source_repo/docs/release-signing.md"
git -C "$source_repo" add .
git -C "$source_repo" commit --quiet -m base
build_sha="$(git -C "$source_repo" rev-parse HEAD)"
printf 'snapshot verifier v2\n' >"$source_repo/.github/scripts/verify-release-asset-snapshot.sh"
printf 'finalizer v2\n' >"$source_repo/.github/workflows/finalize-release.yml"
printf 'release docs v2\n' >"$source_repo/docs/release-signing.md"
git -C "$source_repo" add .
git -C "$source_repo" commit --quiet -m automation-only
automation_sha="$(git -C "$source_repo" rev-parse HEAD)"

if (
  cd "$source_repo"
  EXPECTED_CICD_SHA="$build_sha" GITHUB_SHA="$automation_sha" \
    "$repo_root/.github/scripts/verify-cicd-automation-advance.sh"
); then
  echo "::error::The default source guard accepted a different CICD commit."
  exit 1
fi
(
  cd "$source_repo"
  EXPECTED_CICD_SHA="$build_sha" GITHUB_SHA="$automation_sha" \
  ALLOW_CICD_AUTOMATION_ONLY_ADVANCE=true \
    "$repo_root/.github/scripts/verify-cicd-automation-advance.sh"
)

printf 'build workflow change\n' >"$source_repo/.github/workflows/release.yml"
git -C "$source_repo" add .
git -C "$source_repo" commit --quiet -m build-workflow-change
build_workflow_sha="$(git -C "$source_repo" rev-parse HEAD)"
if (
  cd "$source_repo"
  EXPECTED_CICD_SHA="$build_sha" GITHUB_SHA="$build_workflow_sha" \
  ALLOW_CICD_AUTOMATION_ONLY_ADVANCE=true \
    "$repo_root/.github/scripts/verify-cicd-automation-advance.sh"
); then
  echo "::error::A build workflow change passed the finalization-only source guard."
  exit 1
fi

git -C "$source_repo" reset --quiet --hard "$automation_sha"
printf 'temporary application change\n' >"$source_repo/src/app.txt"
git -C "$source_repo" add .
git -C "$source_repo" commit --quiet -m temporary-application-change
printf 'base\n' >"$source_repo/src/app.txt"
git -C "$source_repo" add .
git -C "$source_repo" commit --quiet -m revert-application-change
reverted_application_sha="$(git -C "$source_repo" rev-parse HEAD)"
if (
  cd "$source_repo"
  EXPECTED_CICD_SHA="$build_sha" GITHUB_SHA="$reverted_application_sha" \
  ALLOW_CICD_AUTOMATION_ONLY_ADVANCE=true \
    "$repo_root/.github/scripts/verify-cicd-automation-advance.sh"
); then
  echo "::error::A reverted application change passed the finalization-only source guard."
  exit 1
fi

git -C "$source_repo" reset --quiet --hard "$automation_sha"
printf 'application change\n' >"$source_repo/src/app.txt"
git -C "$source_repo" add .
git -C "$source_repo" commit --quiet -m application-change
application_sha="$(git -C "$source_repo" rev-parse HEAD)"
if (
  cd "$source_repo"
  EXPECTED_CICD_SHA="$build_sha" GITHUB_SHA="$application_sha" \
  ALLOW_CICD_AUTOMATION_ONLY_ADVANCE=true \
    "$repo_root/.github/scripts/verify-cicd-automation-advance.sh"
); then
  echo "::error::An application change passed the automation-only source guard."
  exit 1
fi

echo "Release finalization guard fixtures passed."
