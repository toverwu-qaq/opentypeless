#!/usr/bin/env bash
set -euo pipefail

fixture_dir=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-provenance-test.XXXXXX")
tag_name=v1.1.60
official_sha=1111111111111111111111111111111111111111
cicd_sha=2222222222222222222222222222222222222222

printf 'first release asset\n' > "$fixture_dir/a.bin"
printf 'second release asset\n' > "$fixture_dir/b.bin"

TAG_NAME=$tag_name \
OFFICIAL_SHA=$official_sha \
EXPECTED_CICD_SHA=$cicd_sha \
  node .github/scripts/create-release-provenance.mjs \
    windows-x86_64 \
    "$fixture_dir/provenance.json" \
    "$fixture_dir/b.bin" \
    "$fixture_dir/a.bin"

verify_fixture() {
  TAG_NAME=$tag_name \
  OFFICIAL_SHA=$official_sha \
  EXPECTED_CICD_SHA=$cicd_sha \
    node .github/scripts/verify-release-provenance.mjs \
      windows-x86_64 \
      "$fixture_dir/provenance.json" \
      "$fixture_dir" \
      a.bin b.bin
}

verify_fixture

printf 'tampered\n' >> "$fixture_dir/a.bin"
if verify_fixture; then
  echo "::error::Tampered release bytes passed provenance verification."
  exit 1
fi
printf 'first release asset\n' > "$fixture_dir/a.bin"

if TAG_NAME=v1.1.61 \
  OFFICIAL_SHA=$official_sha \
  EXPECTED_CICD_SHA=$cicd_sha \
  node .github/scripts/verify-release-provenance.mjs \
    windows-x86_64 \
    "$fixture_dir/provenance.json" \
    "$fixture_dir" \
    a.bin b.bin; then
  echo "::error::A provenance manifest was replayed for a different tag."
  exit 1
fi

if TAG_NAME=$tag_name \
  OFFICIAL_SHA=$official_sha \
  EXPECTED_CICD_SHA=$cicd_sha \
  node .github/scripts/verify-release-provenance.mjs \
    windows-x86_64 \
    "$fixture_dir/provenance.json" \
    "$fixture_dir" \
    a.bin; then
  echo "::error::An incomplete expected asset set passed provenance verification."
  exit 1
fi

echo "Release provenance positive and negative fixtures passed."
