#!/usr/bin/env bash
set -euo pipefail

expected_actor=toverwu-qaq
expected_repository=toverwu-qaq/opentypeless

for name in GITHUB_REPOSITORY GITHUB_ACTOR GITHUB_TRIGGERING_ACTOR; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::$name is required to verify the CI/CD dispatcher."
    exit 1
  fi
done

if [[ "$GITHUB_REPOSITORY" != "$expected_repository" ]]; then
  echo "::error::Release automation must run in $expected_repository."
  exit 1
fi
if [[ "$GITHUB_ACTOR" != "$expected_actor" || "$GITHUB_TRIGGERING_ACTOR" != "$expected_actor" ]]; then
  echo "::error::Release automation must be dispatched and rerun by $expected_actor."
  exit 1
fi

echo "Verified CI/CD dispatcher identity: $expected_actor in $expected_repository."
