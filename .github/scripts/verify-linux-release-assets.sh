#!/usr/bin/env bash
set -euo pipefail

official_repo="${OFFICIAL_REPO:-tover0314-w/opentypeless}"

for name in GH_TOKEN TAG_NAME LINUX_EXPECTED_GPG_FINGERPRINT; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to verify Linux release assets."
    exit 1
  fi
done

version="${TAG_NAME#v}"
work_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-linux-release.XXXXXX")"
gpg_home="$work_dir/gnupg"
mkdir -m 700 "$gpg_home"
export GNUPGHOME="$gpg_home"

patterns=(
  '*AppImage'
  '*.deb'
  '*.rpm'
  '*.asc'
  'OpenTypeless-Linux-*-GPG-KEY.asc'
  'SHA256SUMS-linux-*.txt'
)
download_args=()
for pattern in "${patterns[@]}"; do
  download_args+=(--pattern "$pattern")
done
gh release download "$TAG_NAME" --repo "$official_repo" "${download_args[@]}" --dir "$work_dir"

expected_fingerprint="${LINUX_EXPECTED_GPG_FINGERPRINT//[[:space:]]/}"
if [[ ! "$expected_fingerprint" =~ ^[0-9A-Fa-f]{40,64}$ ]]; then
  echo "::error::LINUX_EXPECTED_GPG_FINGERPRINT must be a full hexadecimal fingerprint."
  exit 1
fi
expected_fingerprint="${expected_fingerprint^^}"

mapfile -t key_files < <(find "$work_dir" -maxdepth 1 -type f -name 'OpenTypeless-Linux-*-GPG-KEY.asc' -print | sort)
if (( ${#key_files[@]} != 2 )); then
  echo "::error::Expected exactly two Linux GPG public-key assets."
  exit 1
fi
for key_file in "${key_files[@]}"; do
  mapfile -t primary_fingerprints < <(
    gpg --batch --with-colons --import-options show-only --import "$key_file" \
      | awk -F: '$1 == "pub" { primary = 1; next } primary && $1 == "fpr" { print toupper($10); primary = 0 }'
  )
  if (( ${#primary_fingerprints[@]} != 1 )); then
    echo "::error::$(basename "$key_file") must contain exactly one primary public key."
    exit 1
  fi
  key_fingerprint="${primary_fingerprints[0]}"
  if [[ "$key_fingerprint" != "$expected_fingerprint" ]]; then
    echo "::error::Unexpected Linux GPG fingerprint in $(basename "$key_file")."
    exit 1
  fi
done
gpg --batch --import "${key_files[0]}"

verify_gpg_signature() {
  local signature=$1
  local payload=$2
  local status_file
  status_file="$(mktemp "$work_dir/gpg-status.XXXXXX")"
  if ! gpg --batch --status-fd 1 --verify "$signature" "$payload" >"$status_file"; then
    echo "::error::GPG verification failed for $(basename "$payload")."
    exit 1
  fi
  mapfile -t valid_fingerprints < <(
    awk -v expected="$expected_fingerprint" '
      $1 == "[GNUPG:]" && $2 == "VALIDSIG" {
        signing = toupper($3)
        primary = toupper($NF)
        if (signing == expected || primary == expected) print expected
      }
    ' "$status_file"
  )
  if (( ${#valid_fingerprints[@]} != 1 )) || [[ "${valid_fingerprints[0]}" != "$expected_fingerprint" ]]; then
    echo "::error::$(basename "$payload") was not signed by the expected Linux release key."
    exit 1
  fi
}

for arch in x86_64 aarch64; do
  checksum_file="$work_dir/SHA256SUMS-linux-${arch}.txt"
  verify_gpg_signature "${checksum_file}.asc" "$checksum_file"
  (cd "$work_dir" && sha256sum --check "$(basename "$checksum_file")")
done

mapfile -t packages < <(find "$work_dir" -maxdepth 1 -type f \
  \( -name '*.AppImage' -o -name '*.deb' -o -name '*.rpm' \) -print | sort)
if (( ${#packages[@]} != 6 )); then
  echo "::error::Expected exactly six Linux packages; found ${#packages[@]}."
  exit 1
fi
for package in "${packages[@]}"; do
  verify_gpg_signature "${package}.asc" "$package"
done

./.github/scripts/verify-rpm-signatures.sh "${key_files[0]}" \
  "$work_dir/OpenTypeless-${version}-1.x86_64.rpm" \
  "$work_dir/OpenTypeless-${version}-1.aarch64.rpm"

echo "Verified Linux checksums, detached signatures, signer fingerprint, and RPM signatures for $TAG_NAME."
