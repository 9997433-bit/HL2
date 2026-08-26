# Prototypes

Runnable code produced by the WeChat mini-games replication study. Each
prototype exists to put a number on a claim made in the analysis rather than to
be a finished game.

| Prototype | Mechanic and implementation | Verification | WeChat status |
|---|---|---|---|
| [`jump-jump/`](./jump-jump/) | Hold-to-charge jumping in one Canvas/DOM HTML file: charge sets the launch velocity with no aim assist, blocks are generated endlessly from a seeded PRNG, physics runs on a fixed step, and centre landings pay a 2/4/8/16/32 combo | 14 Chrome/CDP checks that step the shipped physics themselves: seeded replay, 200 worlds × 25 jumps all clearable, the exact score sequence, identical landings at 30/60/120/240 Hz, a miss ending the run, and the shim paths | Calls `wx.*` through [`shared/wx-shim.js`](./shared/): rewarded-video revive, share, cloud score, friend board and best-score storage. No Mini Game project files |
| [`sheep-match3/`](./sheep-match3/) | Modular stacked match-3 with cover-graph rules, a guaranteed-solvable generator, solver/hints, four props (the shuffle re-generates and is solver-checked, so it cannot strand a player), and debug autoplay | 17 Node tests covering generation, solvability, rules, props, and post-shuffle solvability | Core and renderer are platform-neutral; the host shell detects the host with `isRealWx()` and runs the ad-gated props, cloud score and friend board through the shim. Not a deployable package |
| [`parking-jam/`](./parking-jam/) | Parking-jam sliding puzzle (挪了下车 family) with a BFS solver that supplies par, stars, hints and the level generator's accept test; eight levels, move budget, two-gate variant | 23 Node unit tests, plus `verify.js` — a level audit, a random-move invariant fuzz, and a stub-DOM playthrough that finishes every level through the shipped pointer handlers | Uses the shared `wx-shim` for real: the hint is gated on `wx.createRewardedVideoAd` and bests go to `wx.setUserCloudStorage`; no Mini Game package files |
| [`tile-trio/`](./tile-trio/) | Single-file layered three-match with three levels, seven tray slots, and shuffle/pull/undo props | `verify.js` checks constructed winning lines, solver clears, state conservation, reachability, and four platform-loop assertions | Fullest shim integration: props cost a rewarded video after one free use, a mock video player with a working skip path, ad- and share-revive, and a rendered friend leaderboard |
| [`wechat-packaging-skeleton/`](./wechat-packaging-skeleton/) | Compact 18-tile native Canvas version of Tile Trio with a thin platform adapter | JSON parsing, JavaScript syntax, required-file and Node mock-platform smoke checks on Linux | Has `game.js`, `game.json`, and `project.config.json`; import/compile, package accounting, eligible APIs, and device behavior remain pending WeChat DevTools |
| [`shared/`](./shared/) | `wx-shim` — one mock of the 微信小游戏 `wx.*` surface (ads, share, cloud storage, login, system info, storage, haptics, payment) shared by every prototype | 19 Node tests | Stands aside when a genuine WeChat host is present, so the call sites above are the ones that would ship |

## Roles

Two of these are the same mechanic, which is deliberate but only useful if it is
labelled. `sheep-match3` and `tile-trio` were written to answer different
questions, and Round 3 gave each the other's strongest property rather than
merging them:

- **`sheep-match3` is the reference core.** Rules live in a pure module with no
  DOM, no canvas and no `wx`, driven by a seeded PRNG, with a bitset-memoised
  solver used as an oracle everywhere a fairness claim is made: level
  generation, the hint button, and now the shuffle prop. Read this one when
  writing game logic, and hold new logic to its test suite.
- **`tile-trio` is the demo-facing build.** One file that opens by
  double-clicking, with the product loop visible on screen: a mock rewarded
  video with a working skip path, one free prop use before the ad gate, ad- and
  share-revive, and a rendered friend leaderboard. Its `verify.js` loads the
  *shipped* file into a stubbed DOM, so what is verified is what is served.
  Show this one.
- **`parking-jam` is the content-pipeline probe.** Its BFS solver is not a hint
  feature bolted on afterwards — it supplies par, stars, the move budget and the
  generator's accept test, which is the closest thing here to how a level
  pipeline actually works.
- **`jump-jump` is the skill-loop and open-data-domain probe**, the genre where
  friend leaderboards *are* the product.
- **`shared/` is the one platform mock**; **`wechat-packaging-skeleton/` is the
  packaging probe**, and the only entry with real Mini Game project files.

What crossed over in Round 3: `sheep-match3` took `tile-trio`'s
generate-don't-permute shuffle (and strengthened it with a solver check that
`tile-trio` has no solver for), `tile-trio` took `sheep-match3`'s seedable RNG so
its 300-deal suites are replayable, and `parking-jam` and `jump-jump` took the
shared shim. What deliberately did not converge: the two match-3 cores stay
separate, because collapsing them would cost either the pure testable core or
the single-file demo, and both are load-bearing for the study.

## Run

Serve the repository root:

```bash
python3 -m http.server 8080
```

Open one of:

- `http://localhost:8080/prototypes/jump-jump/`
- `http://localhost:8080/prototypes/sheep-match3/`
- `http://localhost:8080/prototypes/tile-trio/`
- `http://localhost:8080/prototypes/parking-jam/`

`jump-jump` and `tile-trio` are single-file demos that can also be opened
directly. `sheep-match3` and `parking-jam` use JavaScript modules and must be
served over HTTP from the repository root; `node prototypes/parking-jam/serve.js`
does that in one command.

`wechat-packaging-skeleton` is not served over HTTP. Import its directory into
WeChat DevTools as a Mini Game project, select a test or eligible AppID, and
follow its [README](./wechat-packaging-skeleton/README.md).

## Controls and debug entry points

- **Jump Jump:** hold and release the mouse/touch, or hold and release Space;
  after a loss, click the canvas or press Space to restart.
- **Sheep Match-3:** tap/click an uncovered tile; use
  `?level=1&seed=77&autoplay=90` to select a level, fix the random seed, and run
  solver autoplay at a 90 ms interval.
- **Tile Trio:** tap/click an uncovered tile; use `?level=1`, `?level=2`, or
  `?level=3` to start a level directly, and `?seed=20260826` (numbers or labels)
  to replay an exact deal.
- **Parking Jam:** drag a car along its own axis, or tap it to slide it to the
  stop; drag the gold car through the wall gap to finish. `Z` undo, `R` restart,
  `H` hint (behind a mock rewarded video); `#1`–`#8` opens a level directly.

## Verify

From the repository root:

```bash
./scripts/run-all-prototype-tests.sh
node --test prototypes/shared/wx-shim.test.mjs   # the platform mock itself
```

The aggregate runner requires Node 22+, npm, and Chrome/Chromium. It runs the
Jump Jump browser smoke test, all 17 Sheep Match-3 tests, the Tile Trio
real-file verifier, the 23 Parking Jam unit tests, and every
`prototypes/*/verify.js` it can find; it continues after individual failures and
returns a failing exit status if any suite fails. See the
[harness report](../.agent_workspace/round2/gpt-test-harness-report.md) for the
coverage matrix and known exclusions.

## Scope

The browser entries are mechanic probes, and the native packaging skeleton is
only an import-ready smoke target. None is a release-ready WeChat Mini Game.
Real ad fill and revenue, the 开放数据域 sub-context that actually holds friend
data, the server half of `wx.login`, payment eligibility, in-chat distribution,
版号 and real-device performance all remain outside their validated scope. The
gap matrix is in
[`opus-wx-shim-report.md`](../.agent_workspace/round2/opus-wx-shim-report.md).
Canonical package and payment facts are in
[`platform-constants.json`](../.agent_workspace/platform-constants.json).

See the [master research index](../.agent_workspace/README.md) for every report
and dataset, especially the
[core-mechanics analysis](../.agent_workspace/round1/opus-mechanics-analysis.md)
and [prototype feasibility report](../.agent_workspace/round1/opus-prototype-report.md).
