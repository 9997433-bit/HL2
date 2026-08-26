# Prototypes

Runnable code produced by the WeChat mini-games replication study. Each
prototype exists to put a number on a claim made in the analysis rather than to
be a finished game.

| Prototype | Mechanic and implementation | Verification | WeChat status |
|---|---|---|---|
| [`jump-jump/`](./jump-jump/) | Hold-to-charge jumping, randomized platforms, scoring, and combos in one Canvas/DOM HTML file | Manual browser play only; no automated tests | Browser-only; no `wx` adapter or Mini Game project files |
| [`sheep-match3/`](./sheep-match3/) | Modular stacked match-3 with cover-graph rules, a guaranteed-solvable generator, solver/hints, four props, and debug autoplay | 14 Node tests covering generation, solvability, rules, and props | Core and renderer are platform-neutral; the entry point has limited canvas/input/size `wx` branches, but this is not a deployable WeChat package |
| [`tile-trio/`](./tile-trio/) | Single-file layered three-match with three levels, seven tray slots, and shuffle/pull/undo props | `verify.js` checks constructed winning lines, solver clears, state conservation, and reachability | Includes an inline explanatory/mock shim that grants rewards locally; real `wx.*` integrations and Mini Game project files are absent |

## Run

Serve the repository root:

```bash
python3 -m http.server 8080
```

Open one of:

- `http://localhost:8080/prototypes/jump-jump/`
- `http://localhost:8080/prototypes/sheep-match3/`
- `http://localhost:8080/prototypes/tile-trio/`

`jump-jump` and `tile-trio` are single-file demos that can also be opened
directly. `sheep-match3` uses JavaScript modules and should be served over HTTP.

## Controls and debug entry points

- **Jump Jump:** hold and release the mouse/touch, or hold and release Space;
  after a loss, click the canvas or press Space to restart.
- **Sheep Match-3:** tap/click an uncovered tile; use
  `?level=1&seed=77&autoplay=90` to select a level, fix the random seed, and run
  solver autoplay at a 90 ms interval.
- **Tile Trio:** tap/click an uncovered tile; use `?level=1`, `?level=2`, or
  `?level=3` to start a level directly.

## Verify

From the repository root:

```bash
node --test prototypes/sheep-match3/test/core.test.mjs
node prototypes/tile-trio/verify.js
```

The scripts require Node 18+ and install no dependencies. There is no
automated check for `jump-jump` in Round 1.

## Scope

All three are browser mechanic probes. None is a release-ready WeChat Mini
Game: production ads, sharing, identity, payment, friend leaderboards,
compliance, package configuration, review, and real-device performance remain
outside their validated scope.

See the [master research index](../.agent_workspace/README.md) for every report
and dataset, especially the
[core-mechanics analysis](../.agent_workspace/round1/opus-mechanics-analysis.md)
and [prototype feasibility report](../.agent_workspace/round1/opus-prototype-report.md).
