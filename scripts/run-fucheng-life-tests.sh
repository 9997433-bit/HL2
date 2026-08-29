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
run_test "R5 event presentation schema" "$TEST_DIR/presentation.test.js"
run_test "gameplay-pack.json content" "$TEST_DIR/gameplay-pack.test.js"
run_test "R5 zone event deduplication" "$TEST_DIR/zone-dedup.test.js"
run_test "origin mini-saga content and mapping" "$TEST_DIR/origin-sagas.test.js"
run_test "origin mini-saga 24-month headless probe" "$TEST_DIR/origin-saga-sim.test.js"
run_test "headless life sim pacing" "$TEST_DIR/life-sim.test.js"
run_test "NPC relationship ledger and gated events" "$TEST_DIR/npc-ledger.test.js"
run_test "midgame life contract progression" "$TEST_DIR/contract.test.js"
run_test "R4 modal and saga pacing" "$TEST_DIR/pacing.test.js"
run_test "static HTML link integrity" "$TEST_DIR/html-links.test.js"
run_test "fc-events and fc-motion browser exports" "$TEST_DIR/exports-smoke.test.js"
run_test "R6 system depth (career/assets/debt/secondary)" "$TEST_DIR/r6-system.test.js"
run_test "R7 onboarding guide wiring" "$TEST_DIR/guide.test.js"
run_test "R8 hukou pacing and NPC followup queue" "$TEST_DIR/r8-pacing.test.js"
run_test "R9 month advice and zone blurbs" "$TEST_DIR/r9-guidance.test.js"
run_test "R10 NPC interact and 60-month challenge" "$TEST_DIR/r10-npc-challenge.test.js"
run_test "mobile one-screen play wiring" "$TEST_DIR/mobile-play.test.js"
run_test "R11 challenge goals and scoring" "$TEST_DIR/r11-challenge-goals.test.js"
run_test "R12 NPC ripples and face-turn costs" "$TEST_DIR/r12-npc-ripple.test.js"
run_test "R13 month crisis and zone aftershock" "$TEST_DIR/r13-month-crisis.test.js"
run_test "R14 flow fixes and goal bindings" "$TEST_DIR/r14-flow-fixes.test.js"
run_test "R15 fast-forward guards and settlement replay" "$TEST_DIR/r15-ff-guards.test.js"
run_test "R16 crisis modal replay and in-app confirm" "$TEST_DIR/r16-crisis-replay.test.js"
run_test "R17 contract O1 pending and boot coalescing" "$TEST_DIR/r17-pending-contract.test.js"
run_test "R18 stale contract replay and career picker guards" "$TEST_DIR/r18-stale-contract.test.js"
run_test "R19 cancelable career dismiss and §40 wording" "$TEST_DIR/r19-career-dismiss.test.js"
run_test "R20 career-pick motion and challenge Escape" "$TEST_DIR/r20-picker-motion.test.js"
run_test "R21 overlay focus trap and challenge Escape pulse" "$TEST_DIR/r21-focus-trap.test.js"
run_test "R22 visible focus trap and picker ARIA labels" "$TEST_DIR/r22-trap-visible.test.js"
run_test "R23 leaving-lock for event and letter faces" "$TEST_DIR/r23-leaving-lock.test.js"
run_test "R24 overlay max-height vh/dvh dual declarations" "$TEST_DIR/r24-dvh-modals.test.js"
run_test "dashboard browser boot regression" "$TEST_DIR/page-boot.test.js"

printf '\n浮城人生 test summary: %d passed, %d failed\n' "$passed" "$failed"
if ((failed > 0)); then
  exit 1
fi
