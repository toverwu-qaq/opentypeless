#!/usr/bin/env bash
set -euo pipefail

for name in TAG_NAME LINUX_ARCH; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to publish Linux release provenance."
    exit 1
  fi
done

version=${TAG_NAME#v}
case "$LINUX_ARCH" in
  x86_64)
    platform=linux-x86_64
    bundle_dir=src-tauri/target/release/bundle
    appimage_name="OpenTypeless_${version}_amd64.AppImage"
    deb_name="OpenTypeless_${version}_amd64.deb"
    rpm_name="OpenTypeless-${version}-1.x86_64.rpm"
    ;;
  aarch64)
    platform=linux-aarch64
    bundle_dir=src-tauri/target/aarch64-unknown-linux-gnu/release/bundle
    appimage_name="OpenTypeless_${version}_aarch64.AppImage"
    deb_name="OpenTypeless_${version}_arm64.deb"
    rpm_name="OpenTypeless-${version}-1.aarch64.rpm"
    ;;
  *)
    echo "::error::Unsupported Linux release architecture: $LINUX_ARCH"
    exit 1
    ;;
esac

verification_dir="release-verification/linux-${LINUX_ARCH}"
assets=(
  "$bundle_dir/appimage/$appimage_name"
  "$bundle_dir/appimage/${appimage_name}.sig"
  "$verification_dir/${appimage_name}.asc"
  "$bundle_dir/deb/$deb_name"
  "$bundle_dir/deb/${deb_name}.sig"
  "$verification_dir/${deb_name}.asc"
  "$bundle_dir/rpm/$rpm_name"
  "$bundle_dir/rpm/${rpm_name}.sig"
  "$verification_dir/${rpm_name}.asc"
  "$verification_dir/OpenTypeless-Linux-${LINUX_ARCH}-GPG-KEY.asc"
  "$verification_dir/SHA256SUMS-linux-${LINUX_ARCH}.txt"
  "$verification_dir/SHA256SUMS-linux-${LINUX_ARCH}.txt.asc"
)

./.github/scripts/publish-release-provenance.sh "$platform" "${assets[@]}"
