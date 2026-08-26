# WeChat Mini Games Research

Research and executable mechanic probes for leading WeChat mini games in
2025–2026. The project keeps the top-grossing (IAP) and most-played (IAA)
charts separate, examines what can be reproduced with open web/game
technology, and distinguishes a portable core mechanic from a complete
WeChat-dependent product.

The research covers rankings, engine and runtime constraints, backend and
live-operations scope, WeChat SDK dependencies, and legal/IP boundaries.
Three dependency-free HTML5 prototypes provide concrete evidence for the
smallest casual-game loops.

## Repository map

- [`.agent_workspace/`](./.agent_workspace/) — Master index for all research reports, JSON datasets, round context, and follow-up gaps.
- [`prototypes/`](./prototypes/) — Playable browser prototypes and their verification instructions.
- [`scripts/collect_rankings.py`](./scripts/collect_rankings.py) — Rebuilds or checks the structured ranking snapshot.

## Run the prototypes

From the repository root, start any static file server:

```bash
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/prototypes/jump-jump/`
- `http://localhost:8080/prototypes/sheep-match3/`
- `http://localhost:8080/prototypes/tile-trio/`

The prototypes have no install or build step. `jump-jump` and `tile-trio` can
also be opened directly; `sheep-match3` uses JavaScript modules and should be
served over HTTP.

## Verify the checked-in evidence

Node 18+ and Python 3 are sufficient:

```bash
node --test prototypes/sheep-match3/test/core.test.mjs
node prototypes/tile-trio/verify.js
python3 scripts/collect_rankings.py --check
```

There is currently no automated harness for `jump-jump`; use its browser demo
for manual verification.

## Scope

These artifacts are research prototypes, not production WeChat Mini Game
packages. They do not establish parity for login, ads, payments, friend
leaderboards, chat sharing, review eligibility, or physical-device
performance. Mechanic-inspired work must use original code, names, art, audio,
levels, text, and branding.
