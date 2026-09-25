#!/usr/bin/env bash
set -euo pipefail

official_repo="${OFFICIAL_REPO:-tover0314-w/opentypeless}"

for name in GH_TOKEN TAG_NAME; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to verify release assets."
    exit 1
  fi
done

version="${TAG_NAME#v}"
work_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-release-manifest.XXXXXX")"

./.github/scripts/verify-prerelease-release.sh
gh release download "$TAG_NAME" \
  --repo "$official_repo" \
  --pattern latest.json \
  --dir "$work_dir"

manifest="$work_dir/latest.json"
if ! jq -e '
  (keys | sort) == ["notes", "platforms", "pub_date", "version"]
  and (.version | type == "string")
  and (.notes | type == "string" and length <= 10000)
  and (.pub_date | type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]+)?Z$"))
  and (.platforms | type == "object")
  and (.platforms | to_entries | all(.[]; .value |
    type == "object"
    and (keys | sort) == ["signature", "url"]
  ))
' "$manifest" >/dev/null; then
  echo "::error::latest.json does not match the exact updater schema."
  exit 1
fi
if [[ "$(jq -r '.version' "$manifest")" != "$version" ]]; then
  echo "::error::latest.json version does not match $TAG_NAME."
  exit 1
fi

expected_platforms=(
  darwin-aarch64
  darwin-aarch64-app
  darwin-x86_64
  darwin-x86_64-app
  linux-aarch64
  linux-aarch64-appimage
  linux-aarch64-deb
  linux-aarch64-rpm
  linux-x86_64
  linux-x86_64-appimage
  linux-x86_64-deb
  linux-x86_64-rpm
  windows-x86_64
  windows-x86_64-msi
  windows-x86_64-nsis
)
mapfile -t actual_platforms < <(jq -r '.platforms | keys[]' "$manifest")
if [[ "$(printf '%s\n' "${expected_platforms[@]}" | sort)" != "$(printf '%s\n' "${actual_platforms[@]}" | sort)" ]]; then
  echo "::error::latest.json does not contain exactly the expected 15 platform keys."
  printf 'Expected:\n%s\nActual:\n%s\n' \
    "$(printf '%s\n' "${expected_platforms[@]}" | sort)" \
    "$(printf '%s\n' "${actual_platforms[@]}" | sort)"
  exit 1
fi

if ! jq -e --arg base "https://github.com/tover0314-w/opentypeless/releases/download/$TAG_NAME/" '
  .platforms
  | to_entries
  | all(
      (.value.signature | type == "string" and length > 0)
      and (.value.url | type == "string" and startswith($base))
    )
' "$manifest" >/dev/null; then
  echo "::error::Every updater entry must have a signature and an official URL for the current tag."
  exit 1
fi

declare -A expected_urls=(
  [darwin-aarch64]="OpenTypeless_universal.app.tar.gz"
  [darwin-aarch64-app]="OpenTypeless_universal.app.tar.gz"
  [darwin-x86_64]="OpenTypeless_universal.app.tar.gz"
  [darwin-x86_64-app]="OpenTypeless_universal.app.tar.gz"
  [linux-aarch64]="OpenTypeless_${version}_aarch64.AppImage"
  [linux-aarch64-appimage]="OpenTypeless_${version}_aarch64.AppImage"
  [linux-aarch64-deb]="OpenTypeless_${version}_arm64.deb"
  [linux-aarch64-rpm]="OpenTypeless-${version}-1.aarch64.rpm"
  [linux-x86_64]="OpenTypeless_${version}_amd64.AppImage"
  [linux-x86_64-appimage]="OpenTypeless_${version}_amd64.AppImage"
  [linux-x86_64-deb]="OpenTypeless_${version}_amd64.deb"
  [linux-x86_64-rpm]="OpenTypeless-${version}-1.x86_64.rpm"
  [windows-x86_64]="OpenTypeless_${version}_x64_en-US.msi"
  [windows-x86_64-msi]="OpenTypeless_${version}_x64_en-US.msi"
  [windows-x86_64-nsis]="OpenTypeless_${version}_x64-setup.exe"
)
base_url="https://github.com/tover0314-w/opentypeless/releases/download/$TAG_NAME"
for platform in "${expected_platforms[@]}"; do
  actual_url="$(jq -r --arg platform "$platform" '.platforms[$platform].url' "$manifest")"
  expected_url="$base_url/${expected_urls[$platform]}"
  if [[ "$actual_url" != "$expected_url" ]]; then
    echo "::error::$platform points to $actual_url; expected $expected_url."
    exit 1
  fi
done

mapfile -t release_assets < <(gh api "repos/$official_repo/releases/tags/$TAG_NAME" --jq '.assets[].name' | sort)
if (( ${#release_assets[@]} != $(printf '%s\n' "${release_assets[@]}" | sort -u | wc -l) )); then
  echo "::error::The Release contains duplicate asset names."
  exit 1
fi
required_assets=(
  latest.json
  OpenTypeless_universal.app.tar.gz
  OpenTypeless_universal.app.tar.gz.sig
  "OpenTypeless_${version}_universal.dmg"
  "OpenTypeless_${version}_amd64.AppImage"
  "OpenTypeless_${version}_amd64.AppImage.sig"
  "OpenTypeless_${version}_amd64.AppImage.asc"
  "OpenTypeless_${version}_amd64.deb"
  "OpenTypeless_${version}_amd64.deb.sig"
  "OpenTypeless_${version}_amd64.deb.asc"
  "OpenTypeless-${version}-1.x86_64.rpm"
  "OpenTypeless-${version}-1.x86_64.rpm.sig"
  "OpenTypeless-${version}-1.x86_64.rpm.asc"
  "OpenTypeless_${version}_aarch64.AppImage"
  "OpenTypeless_${version}_aarch64.AppImage.sig"
  "OpenTypeless_${version}_aarch64.AppImage.asc"
  "OpenTypeless_${version}_arm64.deb"
  "OpenTypeless_${version}_arm64.deb.sig"
  "OpenTypeless_${version}_arm64.deb.asc"
  "OpenTypeless-${version}-1.aarch64.rpm"
  "OpenTypeless-${version}-1.aarch64.rpm.sig"
  "OpenTypeless-${version}-1.aarch64.rpm.asc"
  OpenTypeless-Linux-x86_64-GPG-KEY.asc
  OpenTypeless-Linux-aarch64-GPG-KEY.asc
  SHA256SUMS-linux-x86_64.txt
  SHA256SUMS-linux-x86_64.txt.asc
  SHA256SUMS-linux-aarch64.txt
  SHA256SUMS-linux-aarch64.txt.asc
  "OpenTypeless_${version}_x64_en-US.msi"
  "OpenTypeless_${version}_x64_en-US.msi.sig"
  "OpenTypeless_${version}_x64-setup.exe"
  "OpenTypeless_${version}_x64-setup.exe.sig"
  SHA256SUMS-windows-x86_64.txt
  OpenTypeless-provenance-macos-universal.json
  OpenTypeless-provenance-macos-universal.json.sig
  OpenTypeless-provenance-linux-x86_64.json
  OpenTypeless-provenance-linux-x86_64.json.sig
  OpenTypeless-provenance-linux-aarch64.json
  OpenTypeless-provenance-linux-aarch64.json.sig
  OpenTypeless-provenance-windows-x86_64.json
  OpenTypeless-provenance-windows-x86_64.json.sig
)

for asset in "${required_assets[@]}"; do
  if ! printf '%s\n' "${release_assets[@]}" | grep -Fqx -- "$asset"; then
    echo "::error::Required release asset is missing: $asset"
    exit 1
  fi
done

if [[ "$(printf '%s\n' "${required_assets[@]}" | sort)" != "$(printf '%s\n' "${release_assets[@]}" | sort)" ]]; then
  echo "::error::The Release contains missing or unexpected assets."
  printf 'Expected:\n%s\nActual:\n%s\n' \
    "$(printf '%s\n' "${required_assets[@]}" | sort)" \
    "$(printf '%s\n' "${release_assets[@]}" | sort)"
  exit 1
fi

while IFS= read -r url; do
  asset_name="${url##*/}"
  if ! printf '%s\n' "${release_assets[@]}" | grep -Fqx -- "$asset_name"; then
    echo "::error::latest.json references a missing asset: $asset_name"
    exit 1
  fi
done < <(jq -r '.platforms[].url' "$manifest")

echo "Verified the complete $TAG_NAME updater manifest and release asset set."
