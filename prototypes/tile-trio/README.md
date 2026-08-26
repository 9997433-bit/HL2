# 叠叠消 · Tile Trio

A playable prototype of the layered three-tile-matching mechanic that
**《羊了个羊：星球》** and its follow-up **《猪了个猪》** have used to hold the top of
WeChat's 畅玩榜 (the DAU/IAA chart) in essentially every month of 2025 and 2026.

Vanilla HTML5 Canvas and JavaScript. No build step, no dependencies, no engine.

```
open prototypes/tile-trio/index.html          # any modern browser
```

Or deep-link straight into a level, which is also how the automated screenshots
are taken:

```
prototypes/tile-trio/index.html?level=2&seed=20260826
```

`seed` is optional during normal play. When present, it fixes the generator
sequence so a reported deal can be replayed exactly; numeric and named seeds are
both supported.

## Why this game

Among the games on the 2025–2026 charts this is the one where the *entire*
product is the mechanic. The revenue leaders (《向僵尸开炮》, 《三国：冰河时代》,
《无尽冬日》) are carried by meta-progression, live-ops and server-side economies
that no single-file prototype can represent honestly. 羊了个羊 is the opposite: a
tile-occlusion puzzle plus a seven-slot buffer, wrapped in a share loop. That
makes it the cleanest subject for asking "what part of a hit WeChat mini game is
actually the game, and what part is the platform?"

## The rules, as implemented

- Tiles are dealt onto stacked layers. A tile is **locked** while any tile on a
  higher layer overlaps its rectangle; locked tiles are shaded but keep their
  colour so you can still read the depth of a pile.
- Tapping a free tile moves it to the **seven-slot tray**. Matching symbols group
  together in the tray, exactly like the original.
- Three of a kind clear.
- Fill all seven slots with no match available and the run ends.
- Three props — **洗牌 shuffle**, **移出 pull out**, **撤销 undo** — one use each.
  In the real game every one of these is behind a rewarded video ad.

Three levels: a 30-tile tutorial, a 57-tile mid, and a 96-tile 深渊 that includes
an eleven-deep single-column stack. That column is the prototype's version of the
notorious 羊了个羊 level 2 wall: you can only ever see its top tile, so it has to
be unwound one tile at a time while the tray is under pressure.

## Deals are solvable by construction

The interesting engineering problem in this genre is not rendering, it is
guaranteeing that a randomly generated board can be finished at all.

The generator works backwards from a legal solution:

1. **Peel** the board top-down — repeatedly pick a random tile that nothing
   covers. Because the "covers" relation is a DAG this always consumes every
   tile, and the resulting sequence is a legal removal order by definition.
2. **Paint symbols onto that order** six positions at a time, splitting each
   block of six into two triples chosen for spatial proximity.

Painting triples onto a legal removal order means at least one winning line
always exists. Doing it in blocks of six bounds the tray at four tiles on that
line — comfortably inside the seven slots — while the proximity split keeps
matching symbols near each other so a human can actually *find* them instead of
scanning the whole board. Assigning triples to strictly consecutive positions is
also solvable but plays badly, because the three matching tiles end up scattered.

The shuffle prop re-runs the same procedure on whatever is left, and completes
the groups already sitting in the tray first, so shuffling cannot strand you.

### Measured

`verify.js` loads `index.html`'s script into a stubbed DOM and exercises the
shipped code — the real generator, the real tray, the real props:

```
node prototypes/tile-trio/verify.js '?seed=20260826'
```

It rejects an empty/missing seed, checks a four-seed regression set for stable
replays and distinct deals, drives the query-seeded generator 300 times per
level, and replays the exact order each deal was built around. It then auto-plays
60 query-seeded rounds per level with a greedy solver that has no lookahead.

| Level | Tiles | Intended line winnable | Peak tray on that line | Greedy solver clears |
|-------|-------|------------------------|------------------------|----------------------|
| 1 · 入门 | 30 | 300/300 | 4 of 7 | ~98–100% |
| 2 · 地狱 | 57 | 300/300 | 4 of 7 | ~85–92% |
| 3 · 深渊 | 96 | 300/300 | 4 of 7 | ~50–60% |

It also asserts that tile count is conserved across undo, shuffle and pull-out,
and that every tile on every level is reachable by peeling. Roughly half of a
machine's runs failing on level 3 is intentional: the original's difficulty spike
is the reason it went viral.

## What is replicated, and what is not

### Fully replicated — this is all just a browser

Layer occlusion and hit-testing, the seven-slot tray with symbol grouping,
guaranteed-solvable deal generation, the three props, win/lose resolution, the
difficulty curve, touch and mouse input, and DPR-aware Canvas rendering.

That is the honest headline: **the game part of a chart-topping WeChat casual
puzzle is a few hundred lines of vanilla JavaScript.** Nothing here needed an
engine, a server, or an asset pipeline.

### Not replicable on the open web — needs WeChat APIs

Every one of these is routed through the `WX` shim at the top of `index.html`, so
the platform dependency is visible in the source rather than hidden. On the web
the shim just grants the effect and says what would have happened.

| Capability | WeChat API | Why the web can't match it |
|---|---|---|
| Rewarded video for props | `wx.createRewardedVideoAd` | No equivalent ad inventory or SDK; this is the genre's entire IAA revenue line |
| Share-to-revive / 分享复活 | `wx.shareAppMessage` | The viral loop that made 羊了个羊 a phenomenon. `navigator.share` cannot target a chat thread or carry game state |
| Friend leaderboard | `wx.setUserCloudStorage` + 开放数据域 | WeChat renders friend data in a sandboxed sub-context the game cannot read. Reproducing it needs an account system and a backend |
| Identity | `wx.login` → `code2Session` | Requires a registered 小程序 appid and an app server |
| Banner / interstitial ads | `wx.createBannerAd`, `createInterstitialAd` | Same as rewarded video |
| Haptics | `wx.vibrateShort` | `navigator.vibrate` is close but unsupported on iOS Safari |
| Subscribe messages, 排行榜 red dots, 游戏圈 | `wx.requestSubscribeMessage`, `wx.getGameClubButton` | No web analogue; these drive D1/D7 retention |

There are also non-API gaps that matter as much: the 4MB main-package limit that
forces subpackaging, review and 版号 requirements for anything monetised, and the
fact that distribution *is* the product — a mini game is discovered inside chat,
which no URL can reproduce.

### Deliberately out of scope

Art and audio, hundreds of hand-tuned levels, daily/season live-ops, the IAP
economy, telemetry and A/B infrastructure, and anti-cheat. On a real team these
dwarf the mechanic in cost, which is precisely the point of the exercise.

## Files

- `index.html` — the whole thing: game, renderer, UI, and the WeChat shim.
- `verify.js` — headless checks against that file. Node, no dependencies.

## On IP

This is a mechanic study with original naming, symbols and levels. The rules of a
game are not copyrightable but its art, name and presentation are. Nothing from
《羊了个羊》 is copied; do not ship a clone that borrows its identity.
