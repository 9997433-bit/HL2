# 跳一跳 · Hop Along

A playable prototype of the hold-to-charge hopping loop that **《跳一跳》** — the
launch title of WeChat 小游戏 in December 2017 — used to put mini games in front
of hundreds of millions of people in a single week.

Vanilla HTML5 Canvas and JavaScript in one file. No build step, no dependencies,
no engine, no imported art.

```
open prototypes/jump-jump/index.html          # any modern browser
```

Or fix the world so a run can be replayed exactly — the same switch the
automated verifier uses:

```
prototypes/jump-jump/index.html?seed=20180101
```

Without `?seed=` each run draws a fresh seed, so the platforms differ every
time. With it, the layout, the scoring and the landing coordinates are
reproducible to the last floating-point digit.

Hold the mouse, a finger, or the space bar to charge; release to jump. The
gold mark across each block is the combo window.

## Why this game

跳一跳 is the extreme case of this study's central finding. Its mechanic is the
cheapest on either chart — one input, one arc, one landing test — while its
product is the most platform-bound of any title we looked at: the friend
leaderboard *is* the game, and it lives in WeChat's 开放数据域, a second
JavaScript context with its own canvas that has no web equivalent. Round 1
scored it M10/P2 for exactly that reason.

That makes it the right prototype to ask two separate questions of: is the
skill loop real (mechanic), and how much of the loop around it can a mock even
represent (product)?

## What the Round 2 audit found, and what changed

The gap review (`.agent_workspace/round2/fable-sota-gap-review.md` §1.4) rated
this prototype 3.4/10 and — unlike the other three — the problems were in the
game logic itself, not in its polish. All five are closed:

| ID | Round 2 defect | Now |
|---|---|---|
| **G-JJ1** | `initPlatforms()` made exactly 20 blocks and nothing ever added more, so the run hit an invisible score cap | Blocks are generated on demand, `CFG.ahead` in front of the jumper, and pruned `CFG.behind` behind it. The camera scrolls with the run, so the world is actually visible as it is built |
| **G-JJ2** | Vertical motion was dt-scaled but `player.x += player.jumpVx` was per frame — a 120 Hz phone jumped twice as far as a 60 Hz one | One fixed 1/120 s step, driven by an accumulator, integrating exact constant-acceleration kinematics. 30/60/120/240 Hz produce *identical* landings, and the verifier asserts it |
| **G-JJ3** | `jump()` looked up the next platform and set `jumpVx = dx / (power / 400)`, so the aim was automatic and distance was *inversely* related to charge | Charge maps to a launch velocity and nothing in the jump path reads the platform list. Distance is strictly increasing in hold time; landing short or long is the player's own doing |
| **G-JJ4** | `combo` counted centre landings, displayed them, and never touched the score | A centred landing pays 2, 4, 8, 16, 32 and then stays at 32; an off-centre one pays 1 and breaks the streak. The combo *is* the score system, as in the original |
| **G-JJ5** | Bare `Math.random()`, no seed, no platform mocking at all | Seeded `mulberry32` world (`?seed=`), and the WeChat loop — cloud score, friend board, rewarded-video revive, share card, best-score storage, haptics — runs through [`shared/wx-shim.js`](../shared/) |

## The mechanic, as implemented

- **Charge → velocity.** Hold time `t` is clamped to `CFG.maxCharge` (1.2 s) and
  normalised to a power `p`. The launch is `vx = 110 + 230p`, `vy = −(260 + 300p)`
  under `g = 1600 px/s²`. Both components grow with charge, so the arc gets
  longer *and* taller, and flat-ground range runs 35.8 px at a bare tap to
  238 px at a full hold.
- **No aim assist.** The launch depends on nothing but the charge. The verifier
  proves this by replaying one charge in two different worlds and asserting the
  same flight.
- **Landing.** A landing is the exact solution of the descent crossing the
  block's top surface within that fixed step, so the contact point is the true
  parabola intersection rather than a step boundary. Miss the block and you fall
  past the death line and the run ends.
- **Scoring.** Landing within `CFG.centerTolerance` (12 px) of the centre
  extends the combo and pays `2^combo`, capped at 32. Anything else pays 1 and
  resets the combo to 0.
- **Revive.** A rewarded video puts the jumper back on the block it fell from
  with the score intact and the combo reset.

## Generation is fair by construction

Each new block picks a width in [52, 88] and a centre-to-centre gap in
[112, 195], with two constraints that make the difficulty honest:

1. **A floor on the gap** — `prevW/2 + w/2 + 24` — so two blocks never touch.
   There is always bare air to fall into, which is what makes an under-charged
   hop a real failure rather than a harmless one.
2. **A ceiling on the gap and on the height step (±34 px)** such that a full
   charge always clears the worst case. Uphill at the widest gap onto the
   narrowest block, a full charge reaches 215 px against the 169 px needed.

Neither constraint helps the player *aim*; they only guarantee that every gap
can be cleared by someone who charges correctly.

### Measured

`scripts/verify-jump-jump.mjs` drives the shipped page in real headless Chrome
over CDP, takes the physics away from `requestAnimationFrame`, and steps it
itself so every run replays:

```
node scripts/verify-jump-jump.mjs        # or ./scripts/run-all-prototype-tests.sh
```

14 checks, including: seeded worlds replay exactly and differ across seeds; 200
seeded worlds × 25 perfect jumps are all clearable without ever needing the full
charge (the sweep held 0.49–1.11 s of the 1.2 s cap); 60 perfect
jumps score exactly 2+4+8+16+32+55×32 = 1822 while the live platform list stays
bounded at ≤13 entries; the four frame rates agree exactly; a jump into the gap
ends the run and opens the friend board; and the share, revive and best-score
paths go through the shim.

Difficulty, computed from the same model (flat ground):

| Gap | Block width | Hold window that lands | Hold window that combos |
|---|---|---|---|
| 112 px | 52 px | 0.32 s | 0.15 s |
| 140 px | 70 px | 0.38 s | 0.13 s |
| 195 px | 52 px | 0.24 s | 0.11 s |
| 195 px | 88 px | 0.40 s | 0.11 s |

So landing is forgiving and the combo is not — which is the shape the original
had, and the reason its scores were driven by streaks rather than by distance.
This is a tuned reconstruction, not a measurement of the original: Tencent never
published 跳一跳's constants, and nothing here is claimed to match them.

## Test surface

The page exposes `window.__jj` for the verifier. It is the same code the player
drives — no second implementation:

```js
__jj.setDriven(true);        // rAF renders, the caller steps the physics
__jj.restart(1234);          // seeded world
__jj.perfect();              // charge exactly for the next block's centre
__jj.aim(-14);               // ... or 14 px short of it
__jj.jump(0.72);             // hold for 0.72 s and settle
__jj.advance(1 / 60);        // feed the accumulator at a chosen frame rate
__jj.fallShort();            // drop into the bare air between two blocks
__jj.freeFlight(0.9);        // distance for a charge, with no platforms at all
__jj.snapshot();             // score, combo, position, HUD text, last landing
```

## What is replicated, and what is not

### Fully replicated — this is all just a browser

The charge/jump/land loop, endless generation, frame-rate-independent physics,
combo scoring, camera follow, touch/mouse/keyboard input, revive, and a seeded
replay mode the original never had.

### Not replicable on the open web — needs WeChat APIs

All of these are called by their real names and answered by the shared shim, so
the platform dependency is visible in the source instead of hidden:

| Capability | WeChat API | Why the web can't match it |
|---|---|---|
| Friend leaderboard | `wx.setUserCloudStorage` + `wx.getFriendCloudStorage` in the 开放数据域 | The sub-context is a second JS environment with its own canvas. The shim reads friend data in the main context, which a real device will not allow — that code has to move into the sub-domain bundle |
| Rewarded-video revive | `wx.createRewardedVideoAd` | No comparable ad inventory or SDK off-platform; this is the genre's whole IAA line |
| Share card into a chat | `wx.shareAppMessage` | Faithfully callback-less. The `share:success` the panel reports is the shim's invention — a real game infers it from a later `onShow` carrying a `shareTicket` |
| Best-score persistence | `wx.setStorageSync` | `localStorage` is close, but is not available to a `file://` page, which is why the shim runs in-memory here |
| Haptics on a centre landing | `wx.vibrateShort` | `navigator.vibrate` is close and unsupported on iOS Safari |

### Deliberately out of scope

The isometric 3D presentation and its art, sound, the skin shop, the bonus
targets that the original awarded extra points for (music box, manhole cover),
daily/season live-ops, telemetry, and any server-side score validation. On a
real team these dwarf the mechanic, which is the point of the exercise.

## Files

- `index.html` — the whole thing: 644 lines of game, renderer, HUD, WeChat loop
  and test surface.
- `../../scripts/verify-jump-jump.mjs` — the headless verifier. Node 22+, real
  Chrome, no dependencies.

## On IP

This is a mechanic study with original naming and presentation. Game rules are
not copyrightable; art, name and code are. Nothing from 《跳一跳》 is copied, and
a commercial build must keep its own identity.
