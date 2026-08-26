# Prototypes

Runnable code produced by the WeChat mini-games replication study. Each
prototype exists to put a number on a claim made in the analysis rather than to
be a finished game.

| Prototype | Mechanic and implementation | Verification | WeChat status |
|---|---|---|---|
| [`jump-jump/`](./jump-jump/) | Hold-to-charge jumping, randomized platforms, scoring, and combos in one Canvas/DOM HTML file | Chrome/CDP smoke test covers loading, rendering, initialization, keyboard charge/release, jump motion, and reset state | Calls `wx.*` through [`shared/wx-shim.js`](./shared/): rewarded-video revive, share, cloud score and friend board. No Mini Game project files |
| [`sheep-match3/`](./sheep-match3/) | Modular stacked match-3 with cover-graph rules, a guaranteed-solvable generator, solver/hints, four props, and debug autoplay | 14 Node tests covering generation, solvability, rules, and props | Core and renderer are platform-neutral; the host shell detects the host with `isRealWx()` and runs the ad-gated props, cloud score and friend board through the shim. Not a deployable package |
| [`tile-trio/`](./tile-trio/) | Single-file layered three-match with three levels, seven tray slots, and shuffle/pull/undo props | `verify.js` checks constructed winning lines, solver clears, state conservation, reachability, and four platform-loop assertions | Fullest shim integration: props cost a rewarded video after one free use, a mock video player with a working skip path, ad- and share-revive, and a rendered friend leaderboard |
| [`parking-jam/`](./parking-jam/) | Sliding-block parking puzzle with a BFS solver as the level pipeline | `verify.js` plus Node unit tests | Platform calls are isolated behind a `platform` adapter but still local stubs; see the [shim report](../.agent_workspace/round2/opus-wx-shim-report.md) for the drop-in diff |
| [`shared/`](./shared/) | `wx-shim` — one mock of the 微信小游戏 `wx.*` surface (ads, share, cloud storage, login, system info, storage, haptics, payment) shared by every prototype | 19 Node tests | Stands aside when a genuine WeChat host is present, so the call sites above are the ones that would ship |

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
./scripts/run-all-prototype-tests.sh
node --test prototypes/shared/wx-shim.test.mjs   # the platform mock itself
```

The aggregate runner requires Node 22+, npm, and Chrome/Chromium. It runs the
Jump Jump browser smoke test, all 14 Sheep Match-3 tests, and the Tile Trio
real-file verifier, continues after individual failures, and returns a failing
exit status if any suite fails. See the
[harness report](../.agent_workspace/round2/gpt-test-harness-report.md) for the
coverage matrix and known exclusions.

## Scope

These are browser mechanic probes. None is a release-ready WeChat Mini Game.
The platform loop is exercised against a mock, not the platform: real ad fill
and revenue, the 开放数据域 sub-context that actually holds friend data, the
server half of `wx.login`, iOS 虚拟支付, in-chat distribution, 版号 and
real-device performance all remain outside their validated scope. The gap
matrix is in
[`opus-wx-shim-report.md`](../.agent_workspace/round2/opus-wx-shim-report.md).

See the [master research index](../.agent_workspace/README.md) for every report
and dataset, especially the
[core-mechanics analysis](../.agent_workspace/round1/opus-mechanics-analysis.md)
and [prototype feasibility report](../.agent_workspace/round1/opus-prototype-report.md).
