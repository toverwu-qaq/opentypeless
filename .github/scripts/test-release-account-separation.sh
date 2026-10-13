#!/usr/bin/env bash
set -euo pipefail

guard=./.github/scripts/verify-cicd-dispatcher.sh
fixture_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-accounts-test.XXXXXX")"
trap 'rm -rf "$fixture_dir"' EXIT

GITHUB_REPOSITORY=toverwu-qaq/opentypeless \
GITHUB_ACTOR=toverwu-qaq GITHUB_TRIGGERING_ACTOR=toverwu-qaq "$guard"

reject_dispatch() {
  local repository=$1 actor=$2 triggering_actor=$3
  if GITHUB_REPOSITORY="$repository" GITHUB_ACTOR="$actor" \
    GITHUB_TRIGGERING_ACTOR="$triggering_actor" "$guard" >"$fixture_dir/rejected.log" 2>&1; then
    echo "::error::An invalid CI/CD account combination passed verification."
    exit 1
  fi
}

reject_dispatch toverwu-qaq/opentypeless tover0314-w tover0314-w
reject_dispatch toverwu-qaq/opentypeless toverwu-qaq tover0314-w
reject_dispatch tover0314-w/opentypeless toverwu-qaq toverwu-qaq
reject_dispatch toverwu-qaq/opentypeless toverwu-qaq ''

echo 'CI/CD account separation guards passed: valid dispatcher accepted; wrong actor, rerun actor, repository, and missing identity rejected.'
