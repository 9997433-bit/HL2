Model slug: gpt-5.6-sol-xhigh-fast

# Round 3 — CI Gate and Seeded Regression Report

Date: 2026-08-26  
Implementation commit tested: `628cde278d02ff6e9d1adcd9c60598b522145755`

## Result

**PASS — workflow validation produced no diagnostics, and the local aggregate
harness passed 5 suites with 0 failures.**

## CI gate

`.github/workflows/prototype-tests.yml` now:

- runs for pushes and pull requests targeting `main` or `agent/*`;
- uses `ubuntu-latest` and Node.js 22;
- installs the latest Chromium snapshot with `browser-actions/setup-chrome@v2`;
- passes the installed binary through `CHROME_PATH`; and
- executes `./scripts/run-all-prototype-tests.sh` as the only test gate.

The workflow has read-only repository permissions and a 15-minute job timeout.
The first triggered run is
[GitHub Actions run 32948372141](https://github.com/9997433-bit/HL2/actions/runs/32948372141);
it was still in progress when this local report was written.

## Seeded tile-trio regression coverage

`prototypes/tile-trio/index.html` accepts `?seed=<value>`. Numeric seeds map
directly to uint32 values; named seeds are deterministically hashed. The seeded
PRNG is injected into both legal peel-order selection and symbol-bag shuffling.
With no query seed, normal play continues to use `Math.random()`.

The aggregate harness now runs:

```bash
node prototypes/tile-trio/verify.js '?seed=20260826'
```

The verifier rejects missing/empty seed queries and checks the fixed seed set
`0`, `1`, `20260826`, and `tray-overflow`. For every level, replaying each seed
produced an identical deal signature, while all four seeds produced distinct
signatures. The remaining generator, autoplay, prop, reachability, and wx-shim
assertions therefore run on a reproducible query-seeded sequence.

Measured tile-trio results:

| Check | Result |
|---|---:|
| Seed replay stability | 4/4 seeds on all 3 levels |
| Distinct signatures | 4/4 seeds on all 3 levels |
| Intended solution line | 300/300 on each level |
| Peak intended-line tray use | 4/7 on each level |
| Greedy clears — Level 1 | 60/60 |
| Greedy clears — Level 2 | 54/60 |
| Greedy clears — Level 3 | 34/60 |
| Reachability | 96/96 deepest-level tiles |
| Props / rewarded ad / friend board / revive | PASS |

## Local verification

Commands run from the repository root:

```bash
go run github.com/rhysd/actionlint/cmd/actionlint@latest \
  .github/workflows/prototype-tests.yml
./scripts/run-all-prototype-tests.sh
```

Results:

- `actionlint` 1.7.12: exit 0, no YAML or GitHub Actions diagnostics.
- Aggregate harness: `Prototype test summary: 5 passed, 0 failed`.
- sheep-match3: 14/14 Node tests passed.
- parking-jam: 23/23 Node tests plus its verifier passed.
- jump-jump browser smoke test passed.
- tile-trio seeded real-file checks passed.

Local environment: Linux, Node.js `v22.14.0`, npm `10.9.7`, Google Chrome
`148.0.7778.96`. This verifies the browser harness locally; CI is configured
separately for Chromium. No WeChat DevTools or physical-client validation is
claimed.
