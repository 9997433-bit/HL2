# Round 1 — Core Mechanics Analysis: Top WeChat Mini Games

**Agent:** opus-fast (`claude-opus-5-thinking-high-fast`)
**Scope:** business logic and algorithms. Rankings, core-loop decomposition, data
structures, MVP selection, effort estimates, and a working prototype.
**Research date:** 2026-08-26. Ranking data is from the July 2026 monthly charts,
the most recent complete month.

---

## 1. What "top 10" means here

There is no single WeChat mini-game ranking, and picking the wrong one produces
a badly wrong answer to "can we replicate this". Tencent and the third-party
trackers publish two charts that barely overlap:

- **畅销榜 (top-grossing)** — ordered by in-app purchase revenue. Dominated by
  SLG, RPG and simulation titles with years of live-ops behind them.
- **畅玩榜 (most-played)** — ordered by play volume. Dominated by free,
  ad-monetised (IAA) casual puzzles.

Only one title appears in both top 20s. The grossing chart tells you what the
market is worth; the played chart tells you what is mechanically small. This
analysis reports both and then decomposes ten games drawn from across them.

A further caveat on volatility: the July 2026 grossing top 100 had a **31%
turnover rate**, up from 26% in June, and the #1 slot changed in each of May,
June and July. Any "top 10" is a snapshot with a shelf life of roughly a month.

### 1.1 Top-grossing (畅销榜), July 2026

| # | Title | Category | Publisher / notes |
|---|---|---|---|
| 1 | 我的花园世界 | Simulation / management | 厦门麟贝互娱. Rose 12 places to take #1; first time the sim category has led |
| 2 | 向僵尸开炮 | Tower defence + roguelite shooter | 大梦龙途 / 海南盛昌 |
| 3 | 三国：冰河时代 | SLG | 欢游互动 / 在线途游. Was #1 in May |
| 4 | 永远的蔚蓝星球 | Tower defence + auto-battler merge RPG | Persistent top-5 since early 2026 |
| 5 | 灵画师 | RPG | 广州光游 |
| 6 | 无尽冬日 (Whiteout Survival) | SLG | 点点互动. The long-running category benchmark |
| 7 | QQ经典农场 | Farm simulation | Tencent. Rose 11 places |
| 8 | 斗罗大陆：传承 | Licensed IP RPG | New entry straight into the top 10 |
| 9 | 向往的生活 | Licensed simulation | Rose 11 places |
| 10 | 浪漫餐厅 | Merge + match-3 | Rose 9 places |

Six of the ten are casual-leaning, which is itself the notable structural shift
this month; the chart had previously been RPG and SLG heavy.

### 1.2 Most-played (畅玩榜), July 2026

| # | Title | Category | Confidence |
|---|---|---|---|
| 1 | 赵云与阿斗 | Chinese-character merge tower defence, 1v1 | High — explicitly reported as breaking 羊了个羊's 11-month streak |
| 2 | 羊了个羊：星球 | Stacked match-3 | High |
| 3 | 挪了下车 | Parking-jam sliding puzzle | High |
| 4 | 抓大鹅 | 3D stacked match-3 with gyroscope | High |
| 5 | 一找一个准 | Hidden-object / spot-the-item | High |
| 6–10 | 搬砖没我快, 打个螺丝, 营救小猫 (#11), 挪车真有趣 (climbed 71 places to #21), 文造兵器 (#15) | Sort-elimination, screw puzzle, rescue puzzle, parking, character-merge | Medium — sources agree these cluster around the top 10–20 but disagree on exact order |

Two live trends worth noting for anyone choosing a target: sort-elimination
reskins ("ant-move" / sand-painting / parking variants) are climbing fast, and
the character-combination genre that 赵云与阿斗 created is spawning imitators
within weeks. Both are signals that these loops are cheap to build.

### 1.3 The ten games decomposed below

Five from each chart, chosen to span the full complexity range:

赵云与阿斗 · 羊了个羊：星球 · 抓大鹅 · 打个螺丝 · 挪了下车 · 搬砖没我快 ·
向僵尸开炮 · 永远的蔚蓝星球 · 无尽冬日 · 我的花园世界

---

## 2. Per-game decomposition

Each entry lists the moment-to-moment loop, the algorithms that are actually
non-trivial, the data structures needed, and where the difficulty really lives.

### 2.1 羊了个羊：星球 — stacked match-3

**Loop.** Tap an unobstructed tile from a multi-layer stack → it moves to a
7-slot tray → any three of a kind clear → clear the whole stack to win, fill the
tray without a match to lose.

**Algorithms.**
- *Occlusion test.* Tiles sit on a half-cell offset lattice so lower layers peek
  out. A tile is pickable when no higher-layer tile overlaps its rectangle.
  Precompute a "cover graph" once; picking becomes an O(degree) check.
- *Solvable level generation.* The only genuinely interesting problem. Random
  type assignment produces impossible boards. The correct construction is to
  take a topological order of the cover graph and assign each consecutive run of
  three positions the same type — along that order the tray never exceeds three
  tiles, so the level is winnable by construction. Difficulty is then dialled in
  by swapping types and re-verifying with a bounded search.
- *Solver / hint.* The picked set alone determines the state, because clearing
  is automatic: a type with `n` picked has `n % 3` in the tray. So DFS with a
  bitset memo, ordering candidates to prefer triple-completing picks.

**Data structures.** `Tile {id, layer, hx, hy, type, state}`; cover graph as
adjacency lists; tray as an ordered array; picked set as a bitset.

**Where the difficulty is.** Not the loop. It is the *difficulty curve* — the
famous level 2 with a sub-1% clear rate is hand-tuned, not generated — plus the
share-to-revive and regional-leaderboard social layer.

### 2.2 抓大鹅 — 3D stacked match-3

**Loop.** Identical rules to 羊了个羊 (7 slots, three of a kind), rendered as a
3D pile of physical objects, with a 10-minute timer and daily attempt limits.

**Algorithms.** Everything above, plus: 3D rigid-body physics for the initial
pile settle; ray-cast picking against arbitrary meshes instead of rectangles;
and the gyroscope "wok toss" (颠锅) that shakes the pile so buried items surface
— a genuine physics impulse applied from `wx.onDeviceMotionChange`, and the
single most-discussed feature of the game.

**Data structures.** As above, but occlusion becomes a visibility query rather
than a static graph, since physics moves objects at runtime.

**Where the difficulty is.** Art volume. Each themed level is a set of modelled
3D props, and the game ships many themes. The 4 MB main-package limit forces all
of it behind subpackages and a CDN.

### 2.3 打个螺丝 — screw puzzle

**Loop.** Boards overlap and pin each other. Tap an exposed screw → it flies to
one of four coloured boxes at the top → three same-colour screws fill a box and
clear it, revealing a new colour → screws with no matching box go to a 5-slot
buffer → a full buffer loses. Unpinned boards fall away.

**Algorithms.**
- *Per-screw occlusion.* A circle-vs-rectangle test against every higher board:
  find the closest point on the rectangle to the screw centre, compare against
  the radius. Doing this per board instead of per screw is the classic
  implementation mistake — it locks two innocent screws whenever one is covered,
  and the game feels unfair.
- *Buffer backflow.* When a box refreshes to a new colour, rescan the buffer,
  fly matching screws back, compact the remainder, and **recurse** — one clear
  can cascade into a chain. This is what stops the buffer from deadlocking.
- *Anti-deadlock floor.* The shipped game unlocks a hidden fifth layer whenever
  the count of operable screws drops below a threshold. The developers have
  said publicly this was added after telemetry showed players quitting when they
  believed a level was bugged.
- *Rigid-body drop* for boards losing their last screw.

**Data structures.** `Board {rect, screwIds[]}`, `Screw {pos, colour, boardId}`,
four active box slots, a buffer array.

**Where the difficulty is.** The team behind it has stated that levels are
hand-placed, not generated, after a generated "neat grid" version failed: people
enjoy going from disorder to order and resent the reverse, so levels must start
messy and resolve tidily. That is a level-design pipeline, not an algorithm.

### 2.4 挪了下车 / 挪车真有趣 — parking jam

**Loop.** A car park packed with vehicles of varying length and orientation.
Drag a car along its own axis until it exits, or until same-colour cars line up
and clear. Clear the target within a step or time limit.

**Algorithms.**
- *Axis-constrained sliding* with occupancy-grid collision — straightforward.
- *Solvability and difficulty rating.* The hard part. This is Rush Hour, which
  is PSPACE-complete in the general case but tractable at puzzle sizes: BFS over
  board states with a Zobrist-hashed visited set gives the optimal solution
  length, which doubles as the difficulty metric. Generation is
  generate-and-test, or reverse-construction from a solved state.

**Data structures.** `Vehicle {cells, orientation, length, colour}`; an
occupancy grid; a packed board encoding for the BFS visited set.

**Where the difficulty is.** Producing thousands of levels with a smooth,
monotonic difficulty ramp. The solver is the level pipeline.

### 2.5 搬砖没我快 — sort elimination

**Loop.** A shared queue of items feeds a small number of destination slots;
group like with like; a slot completes and clears. Mechanically the same family
as sand-painting elimination and the parking variants — the industry reads these
as reskins of one loop.

**Algorithms.** Queue and slot state machine; the same "does a legal completion
sequence exist" question as above, solved with bounded DFS over the queue order.

**Where the difficulty is.** Nothing technical. This genre competes purely on
theme freshness and user-acquisition cost, which is exactly why several reskins
enter the top 100 every month.

### 2.6 赵云与阿斗 — character-merge tower defence

**Loop.** Spend 馒头 (steamed buns, the in-run currency, with an escalating
price per draw) to roll a random unit: one of four Chinese-character troop types
(刀/枪/弓/骑), a gold hero fragment, or a shovel. Place units on unlocked cells
beside the enemy path. Two same-type, same-level units merge into a higher level.
Hero fragments are single characters that are **worthless until you collect a
full general's name and lay the characters out in the correct order** — at which
point the general wakes up with a skill. Symmetric 1v1: both players defend
their own 阿斗, first to lose all lives loses.

**Algorithms.** Merge-grid mechanics; A*/fixed-path pathing; per-unit range and
attack-speed simulation; a gacha table over troop/fragment/shovel; a dictionary
constraint that validates adjacent character sequences against a list of Three
Kingdoms generals; deterministic lockstep or server-authoritative simulation for
the 1v1.

**Data structures.** Grid of cells; unit pool with type/level/range/attack-speed;
fragment inventory; a trie or hash set of valid general names; a wave table.

**Where the difficulty is.** The 1v1 real-time networking, and the economy
tuning that makes the fragment gamble tense. The signature design tension —
unmerged fragments have *zero* combat value and still occupy scarce grid space,
so hoarding for a general can collapse your defence — is a balance problem, not
a coding one. Note also that the art is literally Chinese characters and ink
wash, which is why this shipped cheaply and why imitators appeared within weeks.

### 2.7 向僵尸开炮 — tower defence + roguelite

**Loop.** Per run: kill zombies, level up, pick one of three random skill cards,
survive the wave without losing the defence line. Between runs: spend materials
on weapons, gems, a skill tree, defence-line upgrades and companion units, which
raises the ceiling of the in-run card pool.

**Algorithms.** Bullet-hell entity simulation with spatial partitioning for
collisions; a weighted card pool whose composition shifts as the run progresses;
an element-reaction matrix across seven damage types (gun/physical/fire/ice/
lightning/wind/energy) with combination rules; and a large offline progression
formula set.

**Data structures.** Entity pools; a skill graph with prerequisite edges; the
element interaction matrix; wave and boss tables (the wave-6 boss whose "soul
snatch" disables all defences for ~3 seconds is a designed difficulty gate).

**Where the difficulty is.** Balance across the meta-progression and in-run
economies simultaneously. The genre's own commentary is blunt about it: if your
account-level build has not unlocked the right cards, the in-run draws cannot
save you — that coupling is exactly what has to be tuned.

### 2.8 永远的蔚蓝星球 — tower defence + auto-battler merge

**Loop.** Stage progression with idle accrual; merge duplicate heroes to raise
star level; pick one of three roguelite skills mid-battle; feed the results into
territory, arena, co-op raid, mine and guild systems on a 7-day rotating event
cadence.

**Algorithms.** Auto-battle resolution; merge/star-up rules; gacha with pity;
matchmaking and power scoring for the arena; a scheduler for overlapping timed
events.

**Where the difficulty is.** This is a full live-service game. The battle
simulation is the small part; the event calendar, currencies and shops are the
product.

### 2.9 无尽冬日 (Whiteout Survival) / 三国：冰河时代 — SLG

**Loop.** Base building on timers, resource chains, hero gacha and levelling,
march-based PvE, alliance PvP over a shared world map, season resets.

**Algorithms.** Server-authoritative timed construction; resource production and
consumption graphs; large-world sharding; alliance/territory logic; matchmaking
and migration; anti-cheat. Combat is a numeric resolution, not a simulation.

**Where the difficulty is.** Entirely backend. This is a distributed systems and
economy-design project that happens to render in a canvas.

### 2.10 我的花园世界 / QQ经典农场 — farm simulation

**Loop.** Plant, wait on a timer, harvest, fulfil orders, decorate, unlock the
next plot; social layer of visiting and stealing from friends; guild
competitions; dress-up and pet collections; timed events.

**Algorithms.** Offline progression (compute yield from elapsed time on resume,
not by ticking), order generation weighted to current inventory, an unlock
dependency graph, and server-side anti-cheat on all timers.

**Where the difficulty is.** Content volume — art assets, orders, decoration
catalogues — plus the social backend.

---

## 3. Complexity ranking and effort estimates

Estimates are for a competent small team producing a *shippable* version, not a
demo. "Core loop LOC" is client gameplay logic only, excluding UI chrome, art
pipeline, backend and live-ops. "Full product LOC" includes client UI,
progression, monetisation hooks and the server where one is required.

| Rank | Game | Core loop LOC | Full product LOC | Team | Hardest component | Replication verdict |
|---:|---|---:|---:|---|---|---|
| 1 | 羊了个羊：星球 | 400–600 | 8k–15k | 1 dev + 1 artist | Solvable generation + hand-tuned difficulty spike | **Trivial.** Loop in days; the product is the social layer |
| 2 | 搬砖没我快 (sort elim.) | 500–800 | 8k–15k | 1 dev + 1 artist | Nothing technical; theme differentiation | **Trivial.** Genre is explicitly a reskin treadmill |
| 3 | 抓大鹅 | 800–1.2k | 15k–25k | 2 devs + 2–3 artists | 3D asset volume under the 4 MB cap; gyroscope feel | **Easy** logic, **moderate** production |
| 4 | 打个螺丝 | 1k–1.5k | 15k–25k | 2 devs + 2 artists + 1 designer | Hand-authored levels; anti-deadlock floor | **Easy** logic, **moderate** content pipeline |
| 5 | 挪了下车 | 1k–1.5k | 15k–25k | 2 devs + 1 artist + 1 designer | BFS solver as the level-generation pipeline | **Easy–moderate.** The solver is mandatory |
| 6 | 一找一个准 | 600–1k | 10k–20k | 1 dev + heavy art | Pure art throughput | **Trivial** logic, art-bound |
| 7 | 赵云与阿斗 | 3k–5k | 30k–50k | 3–4 devs + 1 designer + 1 backend | Real-time 1v1 sync; fragment/economy balance | **Moderate.** Cheap art, real netcode |
| 8 | 向僵尸开炮 | 8k–12k | 80k–150k | 8–15 | Dual-economy balance across meta and run | **Hard.** Balance is the moat |
| 9 | 永远的蔚蓝星球 / 我的花园世界 | 10k–15k | 100k–200k | 15–30 | Live-ops calendar and content volume | **Hard.** Ongoing content cost, not a one-off build |
| 10 | 无尽冬日 / 三国：冰河时代 | 15k–25k client | 300k+ | 40–100 | Server-authoritative world, alliance systems | **Impractical** to clone meaningfully |

Read the table as a cliff, not a slope. Ranks 1–6 are single-developer projects
where the code is a rounding error against art and level design. Rank 7 is where
networking enters. Ranks 8–10 are studio products where cloning the mechanics
gets you almost none of the value, because the value is in tuning, content
cadence and user acquisition.

---

## 4. MVP pick: stacked match-3

**羊了个羊：星球** is the recommended prototype target, and it is not close.

- Smallest rule set of any top-ranked title: one verb (tap), one win condition,
  one lose condition.
- No physics, no networking, no server, no 3D.
- No art dependency — the prototype below ships with zero image assets and still
  reads clearly.
- It contains exactly one algorithmically interesting problem (guaranteed
  solvability), which makes it a useful proof rather than a toy.
- Its rules are a strict subset of 抓大鹅's, so the same core transfers directly
  to the #4 most-played game, and the tray/buffer pattern generalises to 打个螺丝.

Runner-up: any sort-elimination variant, for the same reasons minus the
interesting algorithm.

### 4.1 Core loop in pseudocode

```
# --- generation, run once per level -------------------------------------
positions  = pyramid_layout(layer_specs)        # half-cell lattice, |positions| % 3 == 0
cover[p]   = { q : q.layer > p.layer and rects_overlap(p, q) }   # a DAG

order      = random_topological_order(cover)    # a legal full clearing sequence
for i in range(0, len(order), 3):               # solvable by construction:
    t = random_type()                           # following `order`, the tray
    type[order[i]]   = t                        # never holds more than 3 tiles
    type[order[i+1]] = t
    type[order[i+2]] = t

repeat scramble_attempts:                       # difficulty knob
    swap type[a], type[b]
    if not solvable(type, cover, slots): undo the swap

# --- play ----------------------------------------------------------------
on tap(tile):
    if tile.state != BOARD:            reject
    if any(c.state == BOARD for c in cover[tile]):  reject   # still covered
    tile.state = TRAY; tray.insert_next_to_same_type(tile)
    for each type with count >= 3 in tray:  clear three, mark CLEARED
    if all tiles CLEARED:      win
    elif len(tray) >= slots:   lose

# --- solver, shared by generation and the hint button --------------------
# Key insight: the picked SET determines the whole state, because clearing is
# automatic — a type with n picked tiles has exactly n % 3 sitting in the tray.
# So memoise on a bitset of picked tiles; no tray dimension is needed.
def solvable(picked):
    if all picked:                          return True
    if seen(picked) or over_budget():       return False
    for tile in free_tiles(picked) sorted by (count[type] % 3) descending:
        if tray_size(picked + tile) < slots and solvable(picked + tile):
            return True
    return False
```

---

## 5. Prototype delivered

`prototypes/sheep-match3/` — playable, tested, no dependencies.

| File | Lines | Contents |
|---|---:|---|
| `src/core.js` | 446 | Board geometry, cover graph, tray rules, solver, generator, props |
| `src/render.js` | 265 | Canvas 2D renderer in a fixed 720x1280 letterboxed design space |
| `src/main.js` | 205 | Input, tween animation, game loop, debug parameters |
| `test/core.test.mjs` | 195 | 14 headless tests |
| `index.html` | 50 | Shell |

**Verification performed.** All 14 tests pass. Beyond unit tests, the build was
driven in a real headless Chrome over the DevTools Protocol: the built-in solver
auto-played the 129-tile "hell" level to a complete 129/129 clear, and
separately, dispatched pointer events cleared three tiles and lit up the hint
highlight — so occlusion, tray matching, win detection, props and input are all
confirmed working in a browser, not just in unit tests.

Two bugs were found and fixed during that verification, both worth recording
because they are easy to repeat:

1. **Off-by-one on the slot limit.** The solver permitted a post-clear tray of
   exactly `slots` while the game ruled that a loss, so generated levels were
   declared solvable along lines the player could not actually follow. The legal
   bound is strictly below the slot count once matches resolve.
2. **First-frame geometry.** Autoplay asked the renderer for a tile position
   before the first draw had measured the board. The renderer now measures on
   demand.

The 446-line core is the concrete answer to "how much code is the loop": under
500 lines gets you correct occlusion, correct matching, provably fair levels,
a live hint solver, and three props.

---

## 6. Platform constraints that shape any replication

These apply regardless of which game is targeted and belong in any feasibility
verdict:

- **No DOM or BOM.** The runtime provides `wx` APIs only. Engines run through an
  adapter layer that emulates the slice of `window`/`document` they touch.
  Cocos, Laya and Egret ship official adapters; Unity does not.
- **4 MB main package.** Hard cap covering all code and assets, with a total of
  roughly 20–30 MB across subpackages depending on whether virtual payment is
  enabled. Everything else must be fetched from a CDN, and **remote script
  loading is forbidden** — only assets. In-package assets are loaded all at once
  before start, not on demand, so main-package size is startup latency.
- **Open data domain.** Friend and group leaderboard data is only reachable
  inside a separate, isolated execution context with its own engine instance,
  2D rendering only, and no shared assets with the main game. Budget for it as a
  second small app.
- **First `wx.createCanvas()` returns the on-screen canvas**; every later call
  returns an off-screen one. Adapters call it during initialisation, which
  routinely surprises people porting HTML5 code.
- **Regulatory.** IAP requires a Chinese publishing licence (版号). This is the
  binding constraint on cloning anything from the grossing chart, and it is why
  the played chart is where a small team can realistically operate: IAA
  monetisation needs no licence.

---

## 7. Recommendations for Round 2

1. **Harden the prototype into a vertical slice.** The loop is done; the missing
   product surface is what the shipped games actually monetise — the face-down
   bottom queue, ad-gated revive, share-to-continue, and a leaderboard through
   the open data domain.
2. **Build the level pipeline, not more levels.** For every rank 1–6 candidate
   the differentiator is the authoring and difficulty-rating tooling. For the
   parking genre specifically, the BFS solver *is* the pipeline: optimal
   solution length is the difficulty score.
3. **Port the prototype to a real WeChat mini-game build** to measure the true
   package size and startup time against the 4 MB cap. This is the one
   feasibility claim in this document that has not been empirically verified.
4. **Re-pull rankings before any final report.** At 31% monthly turnover the
   July list will be materially stale by the time Round 3 concludes.
5. **Do not scope any work against ranks 8–10.** Recommend those be assessed as
   market analysis rather than replication targets, since the mechanics are the
   cheap part and the economy tuning and live-ops cadence are not transferable.

---

## 8. Sources

Rankings cross-referenced across DataEye/ADX monthly charts (via 36Kr),
GameLook, Tencent News, 游戏客栈 and a 119-trading-day aggregation at
cy-lyx.com. Mechanics decomposed from GameLook and GameRes teardowns, a TapTap
design analysis of 赵云与阿斗, published post-mortems from the 打个螺丝 team
(陀螺科技), an engineering write-up of a 打个螺丝 reimplementation (掘金), and
implementation notes on 羊了个羊 from the WeChat open community, 阮一峰's blog and
Alibaba Cloud's developer community. Platform limits are from the official
WeChat mini-game documentation and the Cocos Creator publishing manual.
