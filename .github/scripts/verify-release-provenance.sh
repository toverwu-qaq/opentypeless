#!/usr/bin/env bash
set -euo pipefail

official_repo=${OFFICIAL_REPO:-tover0314-w/opentypeless}

for name in GH_TOKEN TAG_NAME OFFICIAL_SHA EXPECTED_CICD_SHA; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to verify release provenance."
    exit 1
  fi
done

version=${TAG_NAME#v}
work_dir=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-release-provenance.XXXXXX")
covered_assets=()

verify_platform() {
  local platform=$1
  shift
  local manifest_name="OpenTypeless-provenance-${platform}.json"
  local platform_dir="$work_dir/$platform"
  local download_args=(--pattern "$manifest_name" --pattern "${manifest_name}.sig")
  local asset

  mkdir -p "$platform_dir"
  for asset in "$@"; do
    download_args+=(--pattern "$asset")
    covered_assets+=("$asset")
  done
  gh release download "$TAG_NAME" \
    --repo "$official_repo" \
    "${download_args[@]}" \
    --dir "$platform_dir"

  ./.github/scripts/verify-updater-file-signature.sh \
    "$platform_dir/$manifest_name" \
    "$platform_dir/${manifest_name}.sig"
  node .github/scripts/verify-release-provenance.mjs \
    "$platform" \
    "$platform_dir/$manifest_name" \
    "$platform_dir" \
    "$@"
}

verify_platform macos-universal \
  OpenTypeless_universal.app.tar.gz \
  OpenTypeless_universal.app.tar.gz.sig \
  "OpenTypeless_${version}_universal.dmg"

verify_platform linux-x86_64 \
  "OpenTypeless_${version}_amd64.AppImage" \
  "OpenTypeless_${version}_amd64.AppImage.sig" \
  "OpenTypeless_${version}_amd64.AppImage.asc" \
  "OpenTypeless_${version}_amd64.deb" \
  "OpenTypeless_${version}_amd64.deb.sig" \
  "OpenTypeless_${version}_amd64.deb.asc" \
  "OpenTypeless-${version}-1.x86_64.rpm" \
  "OpenTypeless-${version}-1.x86_64.rpm.sig" \
  "OpenTypeless-${version}-1.x86_64.rpm.asc" \
  OpenTypeless-Linux-x86_64-GPG-KEY.asc \
  SHA256SUMS-linux-x86_64.txt \
  SHA256SUMS-linux-x86_64.txt.asc

verify_platform linux-aarch64 \
  "OpenTypeless_${version}_aarch64.AppImage" \
  "OpenTypeless_${version}_aarch64.AppImage.sig" \
  "OpenTypeless_${version}_aarch64.AppImage.asc" \
  "OpenTypeless_${version}_arm64.deb" \
  "OpenTypeless_${version}_arm64.deb.sig" \
  "OpenTypeless_${version}_arm64.deb.asc" \
  "OpenTypeless-${version}-1.aarch64.rpm" \
  "OpenTypeless-${version}-1.aarch64.rpm.sig" \
  "OpenTypeless-${version}-1.aarch64.rpm.asc" \
  OpenTypeless-Linux-aarch64-GPG-KEY.asc \
  SHA256SUMS-linux-aarch64.txt \
  SHA256SUMS-linux-aarch64.txt.asc

verify_platform windows-x86_64 \
  "OpenTypeless_${version}_x64_en-US.msi" \
  "OpenTypeless_${version}_x64_en-US.msi.sig" \
  "OpenTypeless_${version}_x64-setup.exe" \
  "OpenTypeless_${version}_x64-setup.exe.sig" \
  SHA256SUMS-windows-x86_64.txt

if (( ${#covered_assets[@]} != $(printf '%s\n' "${covered_assets[@]}" | sort -u | wc -l) )); then
  echo "::error::The hard-coded provenance asset groups overlap."
  exit 1
fi
control_assets=(
  latest.json
  OpenTypeless-provenance-macos-universal.json
  OpenTypeless-provenance-macos-universal.json.sig
  OpenTypeless-provenance-linux-x86_64.json
  OpenTypeless-provenance-linux-x86_64.json.sig
  OpenTypeless-provenance-linux-aarch64.json
  OpenTypeless-provenance-linux-aarch64.json.sig
  OpenTypeless-provenance-windows-x86_64.json
  OpenTypeless-provenance-windows-x86_64.json.sig
)
release_payload_assets=()
while IFS= read -r asset; do
  is_control_asset=false
  for control_asset in "${control_assets[@]}"; do
    if [[ "$asset" == "$control_asset" ]]; then
      is_control_asset=true
      break
    fi
  done
  if [[ "$is_control_asset" == false ]]; then
    release_payload_assets+=("$asset")
  fi
done < <(gh api "repos/$official_repo/releases/tags/$TAG_NAME" --jq '.assets[].name' | sort)
if [[ "$(printf '%s\n' "${covered_assets[@]}" | sort)" != "$(printf '%s\n' "${release_payload_assets[@]}")" ]]; then
  echo "::error::Signed provenance does not cover every non-control Release asset exactly once."
  exit 1
fi

echo "Verified signed release provenance for all four platform builds in $TAG_NAME."
