#!/usr/bin/env bash
set -euo pipefail

if (( $# < 2 )); then
  echo "::error::Usage: $0 <public-key.asc> <package.rpm> [package.rpm ...]"
  exit 1
fi

public_key=$1
shift
package_count=$#

if [[ ! -f "$public_key" ]]; then
  echo "::error::RPM public key does not exist: $public_key"
  exit 1
fi
for package in "$@"; do
  if [[ ! -f "$package" || "$package" != *.rpm ]]; then
    echo "::error::RPM package does not exist or has the wrong extension: $package"
    exit 1
  fi
done

if ! command -v rpm >/dev/null 2>&1; then
  echo "::error::rpm is required to verify RPM package signatures."
  exit 1
fi

if ! command -v dpkg >/dev/null 2>&1; then
  echo "::error::dpkg is required to compare the RPM verifier version."
  exit 1
fi
rpm_version="$(rpm --version | sed -E 's/^RPM version[[:space:]]+//')"
if [[ -z "$rpm_version" || "$rpm_version" == *[[:space:]]* ]]; then
  echo "::error::Unable to parse the RPM verifier version: $rpm_version"
  exit 1
fi
if ! dpkg --compare-versions "$rpm_version" ge 4.18.0; then
  echo "::error::RPM 4.18 or newer is required to verify OpenPGP critical subpackets; found $rpm_version."
  exit 1
fi

rpm_db="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-rpmdb.XXXXXX")"
rpm --dbpath "$rpm_db" --initdb
rpm --dbpath "$rpm_db" --import "$public_key"
rpm --define '_pkgverify_level all' --dbpath "$rpm_db" --checksig -v "$@"

echo "Verified $package_count RPM package signature(s) with RPM $rpm_version."
