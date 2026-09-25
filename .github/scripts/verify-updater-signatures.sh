#!/usr/bin/env bash
set -euo pipefail

official_repo="${OFFICIAL_REPO:-tover0314-w/opentypeless}"

for name in GH_TOKEN TAG_NAME; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to verify updater signatures."
    exit 1
  fi
done
if ! command -v minisign >/dev/null; then
  echo "::error::minisign is required to verify updater signatures."
  exit 1
fi

version="${TAG_NAME#v}"
work_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-updater-signatures.XXXXXX")"
assets=(
  OpenTypeless_universal.app.tar.gz
  "OpenTypeless_${version}_amd64.AppImage"
  "OpenTypeless_${version}_amd64.deb"
  "OpenTypeless-${version}-1.x86_64.rpm"
  "OpenTypeless_${version}_aarch64.AppImage"
  "OpenTypeless_${version}_arm64.deb"
  "OpenTypeless-${version}-1.aarch64.rpm"
  "OpenTypeless_${version}_x64_en-US.msi"
  "OpenTypeless_${version}_x64-setup.exe"
)
download_args=()
for asset in "${assets[@]}"; do
  download_args+=(--pattern "$asset" --pattern "${asset}.sig")
done
download_args+=(--pattern latest.json)
gh release download "$TAG_NAME" --repo "$official_repo" "${download_args[@]}" --dir "$work_dir"

updater_public_key="$(jq -r '.plugins.updater.pubkey' src-tauri/tauri.conf.json | base64 --decode | awk '/^RW/ { print; exit }')"
if [[ -z "$updater_public_key" ]]; then
  echo "::error::Could not extract the Tauri updater public key."
  exit 1
fi

for asset in "${assets[@]}"; do
  asset_path="$work_dir/$asset"
  signature_path="${asset_path}.sig"
  if [[ ! -s "$asset_path" || ! -s "$signature_path" ]]; then
    echo "::error::Missing updater artifact or signature for $asset."
    exit 1
  fi
  base64 --decode "$signature_path" > "${signature_path}.minisig"
  minisign -Vm "$asset_path" -x "${signature_path}.minisig" -P "$updater_public_key"
done

declare -A platform_assets=(
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
for platform in "${!platform_assets[@]}"; do
  asset="${platform_assets[$platform]}"
  signature="$(tr -d '\r\n' < "$work_dir/${asset}.sig")"
  manifest_signature="$(jq -r --arg platform "$platform" '.platforms[$platform].signature' "$work_dir/latest.json")"
  if [[ "$manifest_signature" != "$signature" ]]; then
    echo "::error::latest.json contains the wrong updater signature for $platform."
    exit 1
  fi
done

echo "Verified nine updater artifacts with the public key embedded in the tagged application source."
