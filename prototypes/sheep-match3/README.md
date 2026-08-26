# Stacked Match-3 Prototype (羊了个羊 / 抓大鹅 core loop)

A dependency-free HTML5 Canvas prototype of the stacked tile-matching loop that
underpins the most-played casual games on WeChat. It exists to answer one
question from the replication study: *how much code is actually required to get
the core loop of the simplest top-10 mini game running and provably fair?*

Answer, measured on this tree: **537 lines of game logic**, 265 lines of
rendering, 390 lines of host glue (the platform loop included), plus 275 lines
of tests.

## Run it

```bash
cd prototypes/sheep-match3
python3 -m http.server 8099
# open http://127.0.0.1:8099/index.html
```

Tests are headless and need nothing but Node 18+:

```bash
node --test 'test/*.test.mjs'
```

Debug query parameters: `?level=1&seed=77&autoplay=90` picks a level, fixes the
RNG seed, and lets the built-in solver play itself at the given millisecond
interval. That is how the loop is verified end to end without a human.

## Rules implemented

- A pyramid of tiles stacked over several layers, offset by half a cell so the
  layer below peeks out.
- A tile can only be taken when nothing on a higher layer overlaps it.
- Taken tiles go into a 7-slot tray. Any three of a kind in the tray clear.
- Filling the last slot without a clear loses the run.
- Props: undo, "move out" (return three tray tiles to the board), shuffle, hint.
  A spent prop is not gone, it is for sale: tapping it plays a rewarded video
  and grants one back, which is the genre's whole IAA loop.

## The part that matters: guaranteed-solvable generation

Naive generation — scatter random types over the stack — produces boards that
are frequently impossible, and players correctly read that as a broken game.
This prototype instead makes solvability a property of construction:

1. Build the **cover graph**: for each position, which higher-layer positions
   overlap it. This is a DAG, because edges only ever point to a higher layer.
2. Take a **random topological order** of that DAG. This is a sequence in which
   every tile is uncovered at the moment it is taken, i.e. a legal way to clear
   the whole board while ignoring tray limits.
3. Walk that order and give **each consecutive run of three positions the same
   type**. Following the order, the tray now holds at most three tiles at any
   moment, so any slot count of 3 or more wins. Solvability is proven by
   construction rather than by search.

Step 3 alone yields a board that is easy and visually clustered, so a scramble
pass swaps types between random positions and keeps a swap only if a bounded
depth-first search still finds a win. The number of accepted swaps is the
difficulty knob: level 1 uses none, level 2 attempts 140.

### The shuffle prop is generated, not permuted

The same guarantee has to survive the shuffle prop, and this is where the
obvious implementation is wrong. Permuting the types already on the board
preserves the multiset and nothing else: it can hand back a board with no
winning line, so a prop the player may have watched a rewarded video for is
what ends the run. `shuffleProp` therefore re-runs generation on what is left —
a random topological order of the remaining cover graph, the tiles the tray is
waiting on dealt first so the tray drains before it grows, then the rest in
consecutive triples — and puts each candidate deal through `solve()` before
showing it. Six candidates are tried; if none is winnable the position is dead
whatever the tiles say, so the board is left untouched and the prop unspent.

That last branch is a real state, not a defensive nicety: a tray holding six
tiles in seven slots loses to the next pick unless it completes a triple, and
`test/core.test.mjs` pins two seeds where a blind permutation strands the player
in exactly that position while the generated deal plays out to a win.

The search itself relies on one observation that collapses the state space:
**the set of picked tiles fully determines the game state.** Clearing is
automatic and immediate, so a type with `n` picked tiles has exactly `n % 3`
sitting in the tray and the rest already cleared. There is no separate tray
dimension to memoise, so a state key is just a bitset over tiles. Candidate
moves are ordered to prefer picks that complete a triple, which keeps the
node count small enough to run the solver live for the hint button.

## Porting to WeChat

`core.js` and `render.js` touch no platform API. Only `main.js` does, in two
functions that already branch on `wx`:

- `resolveCanvas()` → `wx.createCanvas()` instead of `document.getElementById`
- `bindInput()` → `wx.onTouchStart` instead of `pointerdown`
- `fitCanvas()` → `wx.getSystemInfoSync()` instead of `devicePixelRatio`

The renderer draws in a fixed 720x1280 design space and letterboxes onto
whatever canvas it is given, so no layout work is needed per device. Total
payload is well under the 4 MB main-package limit because there are no image
assets — tiles are rounded rectangles with an emoji glyph.

Everything else the platform owns goes through
[`../shared/wx-shim.js`](../shared/), which mocks `wx.*` off-device and stands
aside on a real one, so these are the calls a mini-game build would make: a
spent prop stays tappable and buys itself back with `wx.createRewardedVideoAd`,
a win writes the 排行榜模板 envelope to `wx.setUserCloudStorage` and reads
`wx.getFriendCloudStorage` for the friend board, and a loss shares a card whose
revive hangs off the friend coming back rather than off the callback-less
`wx.shareAppMessage`.

## Deliberately out of scope

The shipping games add a large amount of product surface on top of this loop.
The face-down bottom queue that hides upcoming tiles is the missing *mechanic*;
the missing *product* is everything the shim can only imitate — real ad fill and
revenue, the 开放数据域 sub-context that actually holds friend data (this
prototype reads it in the main context, which a real build cannot), the server
half of `wx.login`, daily level rotation, and a hand-authored level pipeline.
Those, not the loop, are where the real effort sits — see the effort table in
`.agent_workspace/round1/opus-mechanics-analysis.md` and the gap matrix in
`.agent_workspace/round2/opus-wx-shim-report.md`.
