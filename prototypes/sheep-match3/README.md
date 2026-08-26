# Stacked Match-3 Prototype (羊了个羊 / 抓大鹅 core loop)

A dependency-free HTML5 Canvas prototype of the stacked tile-matching loop that
underpins the most-played casual games on WeChat. It exists to answer one
question from the replication study: *how much code is actually required to get
the core loop of the simplest top-10 mini game running and provably fair?*

Answer, measured on this tree: **446 lines of game logic**, 265 lines of
rendering, 205 lines of host glue, plus 195 lines of tests.

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

## Deliberately out of scope

The shipping games add a large amount of product surface on top of this loop:
the face-down bottom queue that hides upcoming tiles, ad-gated revives and
extra props, share-to-continue, regional leaderboards via the WeChat open data
domain, daily level rotation driven by a server, and a hand-authored level
pipeline. Those, not the loop, are where the real effort sits — see the effort
table in `.agent_workspace/round1/opus-mechanics-analysis.md`.
