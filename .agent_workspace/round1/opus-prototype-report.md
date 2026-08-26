# Round 1 — Prototype Feasibility Report

**Agent:** opus-fast (`claude-opus-5-thinking-high-fast`)
**Role:** core implementation & prototype
**Branch:** `agent/wechat-minigames-research`
**Deliverable:** `prototypes/tile-trio/` — a playable HTML5 Canvas prototype

---

## 1. Which game, and why

**Chosen: 《羊了个羊：星球》 — the layered three-tile matching mechanic.**
Prototype shipped as `prototypes/tile-trio/` ("叠叠消 · Tile Trio"), an original
re-implementation of the mechanic with its own naming, symbols and levels.

The 2025–2026 WeChat charts split cleanly in two, and the split decides what is
worth prototyping:

- **畅销榜 (revenue)** is stable and dominated by 《向僵尸开炮》, 《三国：冰河时代》
  and 《无尽冬日》. 向僵尸开炮 held the #1 spot for seven consecutive months in
  2025 and was still top-three in March 2026. These are carried by
  meta-progression, live-ops and server-side economies. Their *mechanics* are not
  the hard part and a prototype of one would misrepresent the product.
- **畅玩榜 (DAU/IAA)** has been headed by **《羊了个羊：星球》 in essentially every
  month measured** — September, October and November 2025 and March 2026 all show
  it at #1, with the near-identical 《猪了个猪》 and 《抓大鹅》 immediately behind.

羊了个羊 is the one game at the top of a chart where the entire product *is* the
mechanic. That makes it both the most replicable target and the most informative
one: it isolates the question "how much of a hit WeChat mini game is the game,
and how much is the platform?"

Note on the brief: 跳一跳 was listed as a candidate, but it is a 2017 legacy title
and no longer charts. A sibling agent is covering it in `prototypes/jump-jump/`;
this report deliberately takes the currently-charting target instead so Round 1
covers both the historical and the live case.

## 2. What was built

Single file, vanilla JS and HTML5 Canvas, no dependencies or build step.

- **Layer occlusion.** Tiles sit on stacked layers; a tile is locked while any
  higher-layer tile overlaps its rect. Locked tiles are shaded rather than
  blanked, so pile depth stays readable.
- **Seven-slot tray** with same-symbol grouping, three-of-a-kind clearing, and
  loss when the tray fills with no match.
- **Three levels** — 30, 57 and 96 tiles. The last includes an eleven-deep
  single-column stack, the prototype's version of the 羊了个羊 level-2 wall where
  only the top tile is ever visible.
- **Three props** — 洗牌 / 移出 / 撤销, one use each, each routed through the ad
  shim because that is how the original gates them.
- Touch and mouse input, DPR-aware rendering, `?level=N` deep links.

### The part that was actually hard

Not rendering — **guaranteeing a random board is finishable.** The generator
works backwards from a solution:

1. Peel the board top-down, repeatedly taking a random uncovered tile. The
   "covers" relation is a DAG, so this always consumes every tile and yields a
   legal removal order by construction.
2. Paint symbols onto that order six positions at a time, splitting each block of
   six into two triples chosen for spatial proximity.

Painting triples onto a legal removal order guarantees at least one winning line
exists. Blocks of six bound the tray at four tiles on that line; the proximity
split keeps matching symbols near each other so a human can find them.

This was corrected during the round. The first implementation assigned triples to
strictly *consecutive* positions, which is also provably solvable but plays
badly — the three matching tiles scatter across the board. A headless solver put
the naive-greedy clear rate at 37% on the mid level and 9% on the largest. After
switching to proximity-split blocks of six those became ~88% and ~55%.

The shuffle prop re-runs the same procedure on the remaining board and completes
the groups already in the tray first, so shuffling cannot strand the player.

## 3. Verification

`node prototypes/tile-trio/verify.js` loads `index.html`'s script into a stubbed
DOM, so the checks exercise the shipped code rather than a copy.

| Level | Tiles | Intended line winnable | Peak tray | Greedy solver clears |
|-------|-------|------------------------|-----------|----------------------|
| 1 · 入门 | 30 | 300/300 | 4 of 7 | ~98–100% |
| 2 · 地狱 | 57 | 300/300 | 4 of 7 | ~85–92% |
| 3 · 深渊 | 96 | 300/300 | 4 of 7 | ~50–60% |

Also asserted: tile count conserved across undo/shuffle/pull-out, no unreachable
tiles on any level, and no JS errors when driven through a real Chrome pointer
pipeline into both the win and lose states.

The difficulty curve is intentional. A machine failing roughly half its runs on
level 3 mirrors the original, whose level-2 spike is the reason it went viral.

## 4. Replication gap

### Replicated in full

Layer occlusion and hit-testing, the seven-slot tray with grouping,
guaranteed-solvable deal generation, all three props, win/lose resolution, the
difficulty curve, input handling, DPR rendering.

**The finding: the game part of a chart-topping WeChat casual puzzle is a few
hundred lines of vanilla JavaScript.** No engine, no server, no asset pipeline.
The mechanic is not the moat.

### Requires WeChat APIs — cannot be matched on the open web

All routed through the `WX` shim at the top of `index.html`, so the dependency is
visible in source rather than hidden.

| Capability | API | Why the web can't match it |
|---|---|---|
| Rewarded video for props | `wx.createRewardedVideoAd` | No equivalent ad inventory; this is the genre's entire IAA revenue line |
| Share-to-revive | `wx.shareAppMessage` | The viral loop itself. `navigator.share` cannot target a chat thread or carry game state |
| Friend leaderboard | `wx.setUserCloudStorage` + 开放数据域 | Friend data renders in a sandboxed sub-context the game cannot read; reproducing needs accounts and a backend |
| Identity | `wx.login` → `code2Session` | Needs a registered appid and app server |
| Banner / interstitial | `wx.createBannerAd` | Same as rewarded video |
| Haptics | `wx.vibrateShort` | `navigator.vibrate` is close, unsupported on iOS Safari |
| Retention hooks | `wx.requestSubscribeMessage`, `getGameClubButton` | No web analogue; these drive D1/D7 |

Non-API gaps that matter as much: the 4MB main-package limit forcing
subpackaging, 版号 and review requirements for anything monetised, and the fact
that **distribution is the product** — a mini game is discovered inside a chat,
which no URL reproduces.

### Out of scope by choice

Art and audio, hundreds of tuned levels, live-ops, the IAP economy, telemetry and
A/B infrastructure, anti-cheat. On a real team these dwarf the mechanic in cost,
which is the point.

## 5. Conclusion for the parent

The parent baseline's replicability ranking holds up, with one sharpening worth
carrying into Round 2:

**Mechanic replicability and product replicability are not the same axis, and the
top-charting casual puzzles are the extreme case.** 羊了个羊's mechanic was
reproduced to a verified, playable standard in a single file. Its *product* —
rewarded-video props, share-to-revive, friend leaderboards, in-chat discovery — is
almost entirely WeChat platform surface and is the part that cannot be lifted.
For the SLG revenue leaders the ratio inverts: the mechanic is reproducible in
principle but the server economy and live-ops make it impractical, so they are
hard for a completely different reason.

Any Round 2 feasibility scoring should rate these two dimensions separately
rather than collapsing them into one "replicability" column.

### Demo

```
open prototypes/tile-trio/index.html          # or ?level=3 for the hard one
node prototypes/tile-trio/verify.js           # headless checks
```
