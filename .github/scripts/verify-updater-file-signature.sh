#!/usr/bin/env bash
set -euo pipefail

payload=${1:-}
signature=${2:-}

if [[ -z "$payload" || -z "$signature" ]]; then
  echo "Usage: $0 PAYLOAD SIGNATURE" >&2
  exit 2
fi
if [[ ! -f "$payload" || -L "$payload" || ! -s "$payload" ]]; then
  echo "::error::Updater payload must be a non-empty regular file."
  exit 1
fi
if [[ ! -f "$signature" || -L "$signature" || ! -s "$signature" ]]; then
  echo "::error::Updater signature must be a non-empty regular file."
  exit 1
fi
if ! command -v minisign >/dev/null; then
  echo "::error::minisign is required to verify updater signatures."
  exit 1
fi
if (( $(wc -c < "$signature") > 16384 )); then
  echo "::error::Updater signature is unexpectedly large."
  exit 1
fi

mapfile -t updater_public_keys < <(
  jq -r '.plugins.updater.pubkey' src-tauri/tauri.conf.json \
    | base64 --decode \
    | awk '/^RW/ { print }'
)
if (( ${#updater_public_keys[@]} != 1 )); then
  echo "::error::Expected exactly one Tauri updater public key."
  exit 1
fi
updater_public_key=${updater_public_keys[0]}

encoded_signature=$(tr -d '\r\n' < "$signature")
if [[ ! "$encoded_signature" =~ ^[A-Za-z0-9+/]+={0,2}$ ]]; then
  echo "::error::Updater signature is not canonical base64."
  exit 1
fi
decoded_signature=$(mktemp "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/opentypeless-updater-signature.XXXXXX")
if ! printf '%s' "$encoded_signature" | base64 --decode > "$decoded_signature"; then
  echo "::error::Could not decode updater signature."
  exit 1
fi

minisign -Vm "$payload" -x "$decoded_signature" -P "$updater_public_key"
echo "Verified updater signature for $(basename "$payload")."
