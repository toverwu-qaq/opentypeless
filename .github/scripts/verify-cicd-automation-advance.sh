#!/usr/bin/env bash
set -euo pipefail

for name in EXPECTED_CICD_SHA GITHUB_SHA; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to verify the CICD source transition."
    exit 1
  fi
done

allow_automation_advance="${ALLOW_CICD_AUTOMATION_ONLY_ADVANCE:-false}"
if [[ "$allow_automation_advance" != true && "$allow_automation_advance" != false ]]; then
  echo "::error::ALLOW_CICD_AUTOMATION_ONLY_ADVANCE must be true or false."
  exit 1
fi
if [[ "$GITHUB_SHA" == "$EXPECTED_CICD_SHA" ]]; then
  echo "Verified the exact CICD build commit."
  exit 0
fi
if [[ "$allow_automation_advance" != true ]]; then
  echo "::error::The checked-out CICD commit does not match EXPECTED_CICD_SHA."
  exit 1
fi
if ! git merge-base --is-ancestor "$EXPECTED_CICD_SHA" "$GITHUB_SHA"; then
  echo "::error::The CICD build commit is not an ancestor of the finalizer commit."
  exit 1
fi

unexpected_paths=()
while IFS= read -r -d '' path; do
  case "$path" in
    .github/scripts/test-release-finalization-guards.sh | \
      .github/scripts/verify-cicd-automation-advance.sh | \
      .github/scripts/verify-release-asset-snapshot.sh | \
      .github/scripts/verify-release-publisher.sh | \
      .github/scripts/verify-release-source.sh | \
      .github/workflows/ci.yml | \
      .github/workflows/finalize-release.yml | \
      docs/release-signing.md) ;;
    *) unexpected_paths+=("$path") ;;
  esac
done < <(git log --format= --name-only -z "${EXPECTED_CICD_SHA}..${GITHUB_SHA}" --)

if (( ${#unexpected_paths[@]} > 0 )); then
  echo "::error::CICD main changed release inputs after the artifacts were built."
  printf '%s\n' "${unexpected_paths[@]}"
  exit 1
fi

echo "Verified an automation-only CICD advance from $EXPECTED_CICD_SHA to $GITHUB_SHA."
