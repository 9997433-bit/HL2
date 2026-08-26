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

Run every prototype check with one command:

```bash
./scripts/run-all-prototype-tests.sh
```

The aggregate runner requires Node 22+, npm, and Chrome/Chromium; it exercises
Jump Jump through the Chrome DevTools Protocol, runs the 14 Sheep Match-3 Node
tests, and invokes the Tile Trio verifier. The ranking snapshot has a separate
Python 3 check:

```bash
python3 scripts/collect_rankings.py --check
```

## Scope

These artifacts are research prototypes, not production WeChat Mini Game
packages. They do not establish parity for login, ads, payments, friend
leaderboards, chat sharing, review eligibility, or physical-device
performance. Mechanic-inspired work must use original code, names, art, audio,
levels, text, and branding.
