#!/usr/bin/env bash
set -euo pipefail

official_repo="${OFFICIAL_REPO:-tover0314-w/opentypeless}"
cicd_repo="${CICD_REPO:-toverwu-qaq/opentypeless}"

for name in TAG_NAME OFFICIAL_SHA EXPECTED_CICD_SHA GITHUB_REF GITHUB_SHA; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required for release source verification."
    exit 1
  fi
done

if [[ ! "$TAG_NAME" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "::error::TAG_NAME must be a stable semantic-version tag such as v1.1.60."
  exit 1
fi
if [[ ! "$OFFICIAL_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::OFFICIAL_SHA must be a full lowercase 40-character commit SHA."
  exit 1
fi
if [[ ! "$EXPECTED_CICD_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::EXPECTED_CICD_SHA must be a full lowercase 40-character commit SHA."
  exit 1
fi
if [[ "$GITHUB_REF" != "refs/heads/main" ]]; then
  echo "::error::Release workflows must be dispatched from the CICD main branch."
  exit 1
fi
if [[ "$GITHUB_SHA" != "$EXPECTED_CICD_SHA" ]]; then
  echo "::error::The checked-out CICD commit does not match EXPECTED_CICD_SHA."
  exit 1
fi

read_remote_sha() {
  local repository=$1
  local reference=$2
  git ls-remote --exit-code "https://github.com/${repository}.git" "$reference" | awk 'NR == 1 { print $1 }'
}

cicd_main_sha="$(read_remote_sha "$cicd_repo" refs/heads/main)"
if [[ "$cicd_main_sha" != "$EXPECTED_CICD_SHA" ]]; then
  echo "::error::CICD main moved or EXPECTED_CICD_SHA is not its current commit."
  exit 1
fi

official_main_sha="$(read_remote_sha "$official_repo" refs/heads/main)"
if [[ "$official_main_sha" != "$OFFICIAL_SHA" ]]; then
  echo "::error::Official main does not match OFFICIAL_SHA."
  exit 1
fi

tag_ref="refs/tags/$TAG_NAME"
if ! direct_tag_sha="$(read_remote_sha "$official_repo" "$tag_ref")"; then
  echo "::error::$TAG_NAME does not exist in the official repository."
  exit 1
fi
peeled_tag_sha="$(git ls-remote "https://github.com/${official_repo}.git" "${tag_ref}^{}" | awk 'NR == 1 { print $1 }')"
tag_commit_sha="${peeled_tag_sha:-$direct_tag_sha}"
if [[ "$tag_commit_sha" != "$OFFICIAL_SHA" ]]; then
  echo "::error::$TAG_NAME does not resolve to OFFICIAL_SHA in the official repository."
  exit 1
fi

git fetch --no-tags --depth=1 "https://github.com/${official_repo}.git" "$OFFICIAL_SHA"
if [[ "$(git rev-parse HEAD)" != "$EXPECTED_CICD_SHA" ]]; then
  echo "::error::The checked-out commit does not match EXPECTED_CICD_SHA."
  exit 1
fi

if ! git diff --quiet "$OFFICIAL_SHA" "$EXPECTED_CICD_SHA" -- . \
  ':(exclude,glob).github/**' \
  ':(exclude,glob)README*.md' \
  ':(exclude,glob)**/README*.md'; then
  echo "::error::The official and CICD commits do not contain identical release inputs."
  git diff --name-only "$OFFICIAL_SHA" "$EXPECTED_CICD_SHA" -- . \
    ':(exclude,glob).github/**' \
    ':(exclude,glob)README*.md' \
    ':(exclude,glob)**/README*.md'
  exit 1
fi

release_version="${TAG_NAME#v}"
RELEASE_VERSION="$release_version" node <<'NODE'
const fs = require('fs');

const expected = process.env.RELEASE_VERSION;
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const tauriConfig = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const cargoToml = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
const cargoLock = fs.readFileSync('src-tauri/Cargo.lock', 'utf8');

const packageSection = cargoToml.match(/\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m);
const lockSection = cargoLock
  .split('[[package]]')
  .find((section) => /^\s*name\s*=\s*"opentypeless"\s*$/m.test(section));
const lockVersion = lockSection?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

const versions = {
  'package.json': packageJson.version,
  'package-lock.json': packageLock.version,
  'package-lock.json root package': packageLock.packages?.['']?.version,
  'src-tauri/tauri.conf.json': tauriConfig.version,
  'src-tauri/Cargo.toml': packageSection?.[1],
  'src-tauri/Cargo.lock': lockVersion,
};

const mismatches = Object.entries(versions).filter(([, version]) => version !== expected);
if (mismatches.length > 0) {
  for (const [file, version] of mismatches) {
    console.error(`::error::${file} has version ${version ?? '<missing>'}; expected ${expected}.`);
  }
  process.exit(1);
}
NODE

echo "Verified $TAG_NAME: official $OFFICIAL_SHA; CICD $EXPECTED_CICD_SHA; release inputs and versions match."
