Model slug: gpt-5.6-sol-xhigh-fast

# Unified Headless Test Harness Report

## Local result

Run on 2026-08-26 from the repository root:

```bash
./scripts/run-all-prototype-tests.sh
```

Result: **PASS — 3 prototype suites passed, 0 failed.**

- jump-jump: Chrome/CDP smoke test passed.
- sheep-match3: 14/14 Node tests passed.
- tile-trio: all real-file checks passed.

The runner executes every current prototype suite even if an earlier suite
fails, prints a final pass/fail count, and exits with status 1 when any suite
fails. It also discovers `prototypes/*/verify.js` and
`prototypes/*/verify.mjs` entry points added by future prototypes.

## Coverage matrix

| Prototype | Test level | Covered | Not covered |
|---|---|---|---|
| `jump-jump` | Real headless Chrome controlled directly through CDP; no Puppeteer dependency | Loads the shipped `index.html`; catches runtime/console errors; verifies the 400×600 canvas renders; checks 20-platform initialization; drives Space key charge/release; observes upward jump and animation movement; checks reset state | Deterministic landing/scoring and combo progression; game-over/retry click path; touch input; long-run platform progression; visual pixel-regression |
| `sheep-match3` | Node unit/integration suite over `src/core.js` | Seed determinism; board divisibility; cover graph; legal opening; bounded tray construction; generated-level solvability; solver replay; covered-tile rejection; match and loss rules; undo/remove/shuffle/hint props; hard-level scaling | Browser rendering and pointer input; UI state; frame performance; WeChat SDK behavior |
| `tile-trio` | Shipped inline game script executed in a stubbed DOM/canvas VM | Render-loop startup; all three layouts; 300 generated intended solutions per level; 60 greedy autoplay runs per level; tile-count divisibility; state conservation across undo/shuffle/pull; complete reachability; rendering during autoplay | Real-browser layout/pixels; physical pointer input; delayed animation timing (timers are immediate); WeChat SDK behavior |

## Harness files

- `scripts/run-all-prototype-tests.sh` — one-command aggregate runner and exit-status gate.
- `scripts/verify-jump-jump.mjs` — dependency-free Node 22 CDP client that launches installed Chrome/Chromium.
- `prototypes/tile-trio/verify.js` — existing real-file verifier, now invoked by the aggregate runner.
- `prototypes/sheep-match3/test/core.test.mjs` — existing Node test suite, now invoked by the aggregate runner.

## Runtime requirements

- Node.js 22 or newer (the CDP verifier uses Node's built-in `WebSocket`).
- npm (for the existing sheep-match3 package test command).
- Chrome or Chromium discoverable in `PATH`, `CHROME_PATH`, or `CHROME_BIN`.
