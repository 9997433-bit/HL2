#!/usr/bin/env bash

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIR="$ROOT_DIR/games/fucheng-life/tests"
passed=0
failed=0

run_test() {
  local label="$1"
  local file="$2"

  printf '\n==> %s\n' "$label"
  if node "$file"; then
    printf 'PASS: %s\n' "$label"
    passed=$((passed + 1))
  else
    local status=$?
    printf 'FAIL: %s (exit %d)\n' "$label" "$status" >&2
    failed=$((failed + 1))
  fi
}

command -v node >/dev/null 2>&1 || {
  printf 'ERROR: Node.js is required to run the 浮城人生 test suite\n' >&2
  exit 127
}

run_test "JavaScript syntax" "$TEST_DIR/js-syntax.test.js"
run_test "story.json schema and deterministic counts" "$TEST_DIR/story-schema.test.js"
run_test "O1 event schema and coverage" "$TEST_DIR/o1-events.test.js"
run_test "gameplay-pack.json content" "$TEST_DIR/gameplay-pack.test.js"
run_test "headless life sim pacing" "$TEST_DIR/life-sim.test.js"
run_test "static HTML link integrity" "$TEST_DIR/html-links.test.js"
run_test "fc-events and fc-motion browser exports" "$TEST_DIR/exports-smoke.test.js"

printf '\n浮城人生 test summary: %d passed, %d failed\n' "$passed" "$failed"
if ((failed > 0)); then
  exit 1
fi
