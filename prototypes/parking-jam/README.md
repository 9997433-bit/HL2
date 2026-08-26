# 错位车库 · Gridlock Garage

A playable prototype of the parking-jam sliding mechanic that **《挪了下车》** has
used to hold #3 on WeChat's 畅玩榜 through 2026, alongside its cohort of
reskins (《挪车真有趣》, 《挪了个挪》).

Vanilla HTML5 Canvas and JavaScript. No build step, no dependencies, no engine,
no imported art.

```
node prototypes/parking-jam/serve.js      # then open http://localhost:8080/
```

It needs a server rather than `file://` because the source is split into ES
modules, and it must be served from the **repository root** because the game
imports the shared `wx` shim from `prototypes/shared/` — which is what
`serve.js` does. Deep-link a level with a hash:

```
http://localhost:8080/prototypes/parking-jam/#8
```

## Why this game

Round 1 scored 挪了下车 at **9/10 for replicability**, the highest of the blended
top ten, and the reason is worth stating precisely: this is the one hit on the
chart whose hard problem is an *algorithm* rather than a content pipeline, a
server, or an economy. 羊了个羊 needs a solvable-deal generator, 抓大鹅 needs 3D
assets under a 4 MB cap, 无尽冬日 needs an authoritative world server. A parking
jam needs a search.

That makes it the cleanest test of a specific claim: **the difficulty in a
chart-topping puzzle is not building the game, it is producing thousands of
levels with a smooth difficulty ramp.** This prototype builds the game in
roughly 1,600 lines and then spends the rest of its effort on the ramp.

## The rules, as implemented

- A lot packed with vehicles 2 or 3 cells long, each locked to its own axis: a
  horizontal car only ever moves left and right.
- **Drag** a car along its axis, or **tap** it to send it as far as it will go.
  A tap on a car with nowhere to go bumps in place rather than doing nothing
  silently.
- The **gold car** is yours. Pull it through the gap in the wall — the one with
  the chevrons — and it leaves the lot.
- One drag is one move regardless of distance, which is the convention the
  commercial parking puzzles and Rush Hour both use.
- Every level has a **move budget**. Solve it inside par for three stars, inside
  half again for two, inside the budget for one. Spend the budget with your car
  still parked and you lose; undo and restart are always available.
- A departing car is **removed from the lot**, freeing its stalls. On level 3
  that matters: two gold cars leave through two different walls, and the first
  departure opens the lane for the second. Plain Rush Hour ends the instant its
  single red car escapes, so this is the parking-lot generalisation of it.

Eight levels ramp from a two-move tutorial to a 34-move finale.

## The solver is the level pipeline

The interesting engineering problem in this genre is not sliding rectangles
around; it is knowing whether a board is solvable, and how hard it is.

`solve()` is a breadth-first search over board states, keyed by a positional
fingerprint of every vehicle plus which ones have left. Because BFS explores in
move order, the first solution it reaches is a shortest one, and that length is
simultaneously four things the game needs:

| Used as | Where |
|---|---|
| Difficulty rating | Level ordering, and the accept/reject band in the generator |
| Star par | `starsFor(moves, par)` |
| Move budget | `limitForPar(par)`, roughly 1.8× par |
| Hint | `hint()` returns the first move of a current shortest solution |

The general problem is PSPACE-complete, but at 6×6 it is not close to
troublesome. Measured by `verify.js` on the shipped pack:

| # | Level | Par | Budget | States searched | Solve time |
|---|---|---:|---:|---:|---:|
| 1 | 出场 | 2 | 6 | 7 | 1 ms |
| 2 | 连环让 | 4 | 9 | 110 | 3 ms |
| 3 | 双闸口 (two gates) | 6 | 12 | 1,895 | 22 ms |
| 4 | 早高峰 | 9 | 17 | 5,784 | 55 ms |
| 5 | 交叉锁 | 12 | 22 | 3,254 | 38 ms |
| 6 | 死结 | 19 | 35 | 9,368 | 65 ms |
| 7 | 满场 | 23 | 42 | 7,295 | 46 ms |
| 8 | 地狱层 | 34 | 62 | 9,294 | 65 ms |

Under 10,000 states for the hardest board, well under 100 ms in plain Node with
no bitboards and no Zobrist hashing. **The hint button can afford to solve the
whole puzzle from scratch, on the device, every time it is pressed** — which is
what it does. Note also that par and search cost decouple: level 6 needs half
the moves of level 8 but explores the same number of states, because search
cost tracks how tangled the lot is and par tracks how long the one exit line is.

### Generation is generate-and-test, and that is where the cost went

`generateLevel(seed, spec)` scatters traffic at random, solves, and keeps the
board only if its optimal length lands in the requested band. It cannot emit an
unsolvable level, because a level is only a level once the solver has finished
it. Levels 4–8 came out of this loop; 1–3 are hand-authored to teach the slide
and then the two-gate variant.

The honest measurement is the yield curve, not the solve time:

| Target par | Boards tried before a hit |
|---|---|
| 8–9 | tens |
| 12–13 | tens |
| 17–19 | low hundreds |
| 23–26 | ~3,600 |
| ≥ 26 | ~9,000 |
| 34 | ~25,000 (≈ 4 minutes single-threaded) |

Hard boards are *rare*, not *slow*. Random placement produces easy lots
overwhelmingly often, so the shipped ramp cost far more compute at the top than
at the bottom. A production pipeline aiming at thousands of levels would replace
the tail of this curve with reverse construction — walk backwards from a solved
state — or with local search that perturbs a known-hard board. That refinement,
not the sliding, is the actual work in this genre, and it is exactly what Round 1
predicted when it called the solver mandatory rather than optional.

`par` on every shipped level is re-derived from the solver in the tests, so a
mis-rated level fails the build instead of quietly handing out wrong stars.

## Verification

Two entry points, no dependencies, nothing to install:

```
node --test prototypes/parking-jam/test/core.test.mjs   # 23 unit tests, ~0.9 s
node prototypes/parking-jam/verify.js                   # full audit, ~0.5 s
```

`core.test.mjs` covers the ASCII level parser and its rejections, slide limits
against walls and cars, move immutability, the exit rule (only targets, only on
a matching wall, only with a clear run), solver optimality and its two failure
modes (exhausted vs. node cap), the generator's band and determinism, star
thresholds, and the loss condition.

`verify.js` goes further and boots the **shipped module graph** — `index.html`'s
real `main.js` and `render.js`, and the shared `wx` shim — against a stub DOM,
then completes all eight levels by synthesising pointer drags through the real
event handlers, with a virtual clock driving the animations. So the checks cover
input handling, the HUD, the win and loss overlays, undo, sharing, and the
rewarded-video gate on the hint (watched through grants it, skipped denies it),
not just the core. It also fuzzes ~4,000 random legal moves and asserts no car
ever overlaps another or leaves the lot.

Writing that harness immediately caught one bug that unit tests on the core
could not have: the best-score readout refreshed before the win was recorded, so
a new personal best appeared one level late.

## What is replicated, and what is not

### Fully replicated — this is all just a browser

Axis-constrained sliding with occupancy-grid collision, wall-gap exits with
multiple targets and multiple gates, drag and tap input with overshoot-to-exit,
optimal-solution search, difficulty-banded level generation, par-based stars,
move budgets with a real loss state, undo, on-device hints, animation, local
best scores, and DPR-aware Canvas rendering.

**The game part of a top-3 WeChat parking puzzle is about 1,600 lines of vanilla
JavaScript**, of which the breadth-first search that makes the entire content
pipeline possible is **49**, comments included.

### Not replicable on the open web — needs WeChat APIs

Rather than inventing private stubs, the platform calls go through the shared
mock in [`prototypes/shared/`](../shared). `installWxShim()` publishes a
`globalThis.wx` and **steps aside if a real WeChat host is present**, so the
calls in `src/main.js` are literally the calls a mini-game build makes.

| Capability | WeChat API | How it behaves here | Why the web can't match it |
|---|---|---|---|
| Rewarded video for a hint | `wx.createRewardedVideoAd` | Real gate: pressing 提示 shows a 3-second player, and the hint only appears if you watch it through. Skipping denies it; no ad fill grants it anyway | No equivalent ad inventory. This is the genre's entire IAA revenue line |
| Share card | `wx.shareAppMessage` | Fires with the level in `query`; the shim simulates a friend opening the card | `navigator.share` cannot target a chat thread or carry board state, and share-into-chat is 30–50% of new installs for top titles |
| Best scores | `wx.setUserCloudStorage` / `getUserCloudStorage` | Bests are written to cloud KV and cached locally for the HUD, as a real mini game does | Fine on its own — but the *point* of cloud KV is the next row |
| Friend leaderboard | `wx.getFriendCloudStorage` + 开放数据域 | Not wired: there is no second player here | Friend data renders in a sandboxed sub-context the game cannot read. Reproducing it needs an account system and a backend |
| Identity | `wx.login` → `code2Session` | not used | Requires a registered 小程序 appid and an app server |
| Haptics on a bump | `wx.vibrateShort` | not used | `navigator.vibrate` is close but unsupported on iOS Safari |

The ad gate is worth dwelling on, because it is the structural difference
between this genre and the tile-matchers. A tile-matcher's monetised moment is
**分享复活** — a share, which is free inventory and viral by construction. A
step-limited parking puzzle has no revive to share; when you are stuck, you are
stuck, and the only thing to sell is the answer. So the hint *is* the business
model, and the hint is `wx.createRewardedVideoAd`. That is why this prototype
gates it for real instead of granting it silently: the gate is the product.

Porting the rest to a mini game means swapping the DOM HUD for canvas-drawn
widgets and mapping `pointerdown/move/up` onto `wx.onTouchStart/Move/End`.
`core.js` compiles unchanged — it touches no DOM, no canvas and no `wx.*`.

There are also non-API gaps that matter as much: the 4 MB main-package limit,
review and 版号 requirements for anything monetised, and the fact that
distribution *is* the product.

### Deliberately out of scope

Art and audio, the thousands of hand-tuned levels a live title ships, daily and
seasonal live-ops, the IAP economy, telemetry and A/B infrastructure. On a real
team these dwarf the mechanic in cost, which is precisely the point of the
exercise.

## Files

| File | Lines | What |
|---|---:|---|
| `src/core.js` | 508 | Rules, BFS solver, generator, level pack. No DOM, no canvas, no `wx.*` |
| `src/main.js` | 535 | Input, animation, HUD, level flow, `wx.*` adapter |
| `index.html` | 318 | Shell and styles |
| `src/render.js` | 240 | Canvas drawing. Every car is vector primitives |
| `test/core.test.mjs` | 334 | 23 unit tests |
| `verify.js` | 290 | Level audit, invariant fuzz, stub-DOM playthrough |
| `serve.js` | 39 | Static server, so the modules load |

## On IP

This is a mechanic study with original naming, art and levels. Game rules are
not copyrightable; art, name and presentation are. Nothing from 《挪了下车》 is
copied — every car here is drawn from canvas primitives at runtime, the level
pack was generated by the solver in this repository, and the sliding mechanic
itself predates all of it as Rush Hour and, before that, as the 15-puzzle family.
Do not ship a clone that borrows another game's identity.
