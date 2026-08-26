#!/usr/bin/env bash

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
passed=0
failed=0

run_test() {
  local label="$1"
  shift

  printf '\n==> %s\n' "$label"
  if "$@"; then
    printf 'PASS: %s\n' "$label"
    passed=$((passed + 1))
  else
    local status=$?
    printf 'FAIL: %s (exit %d)\n' "$label" "$status" >&2
    failed=$((failed + 1))
  fi
}

command -v node >/dev/null 2>&1 || {
  printf 'ERROR: node is required to run prototype tests\n' >&2
  exit 127
}

command -v npm >/dev/null 2>&1 || {
  printf 'ERROR: npm is required to run sheep-match3 tests\n' >&2
  exit 127
}

run_test \
  "jump-jump browser smoke test" \
  node "$ROOT_DIR/scripts/verify-jump-jump.mjs"

run_test \
  "sheep-match3 unit and solver tests" \
  npm --prefix "$ROOT_DIR/prototypes/sheep-match3" test

run_test \
  "tile-trio real-file integration verifier" \
  node "$ROOT_DIR/prototypes/tile-trio/verify.js"

run_test \
  "parking-jam core unit tests" \
  npm --prefix "$ROOT_DIR/prototypes/parking-jam" test

# Automatically include verification entry points added by future prototypes.
shopt -s nullglob
for verifier in "$ROOT_DIR"/prototypes/*/verify.js "$ROOT_DIR"/prototypes/*/verify.mjs; do
  case "$verifier" in
    "$ROOT_DIR/prototypes/tile-trio/verify.js")
      continue
      ;;
  esac
  run_test \
    "$(basename "$(dirname "$verifier")") verifier" \
    node "$verifier"
done

printf '\nPrototype test summary: %d passed, %d failed\n' "$passed" "$failed"
if ((failed > 0)); then
  exit 1
fi
