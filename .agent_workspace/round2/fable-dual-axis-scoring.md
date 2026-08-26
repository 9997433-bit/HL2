# Round 2 — Dual-Axis Replication Scoring Framework

> Author: fable subagent `fable-r2-dual-axis` (`claude-fable-5-thinking-xhigh`) · Date: 2026-08-26
> Fixes Round 1 defect #1 (see `ROUND1_CONCLUSION_BRIEF.md` 遗留缺陷): the single 1–10 "replicability" score conflated **mechanic** portability with **product** portability.
> Companion data file: [`dual-axis-scores.json`](dual-axis-scores.json) · Rankings basis: [`../round1/rankings.json`](../round1/rankings.json) (2026-07 DataEye-ADX × 引力引擎 joint monthly charts).

---

## 0. Why Two Axes

Round 1's blended score hid the most important strategic fact in this dataset. 跳一跳 scored **7** — the same as 向僵尸开炮 — yet the two games fail off-platform for *opposite* reasons: 跳一跳's mechanics are the easiest in the entire corpus (a weekend of vanilla canvas work, already proven by `prototypes/jump-jump/`) while its product value is ~100% WeChat friend-graph; 向僵尸开炮's mechanics are a real engineering effort while its product value is mostly platform-independent liveops. A single number cannot express "trivial to build, impossible to sell" vs "hard to build, plausible to sell". Round 2 therefore splits:

| Axis | Question answered | What it deliberately ignores |
|---|---|---|
| **Mechanic Score (M)**, 1–10 | Can the **core gameplay loop** — one complete, fun session — be replicated in **vanilla JS/HTML5** (Canvas 2D / WebGL / WebAudio / WASM, no game engine, no `wx.*`, no server)? | Monetization, virality, backend, content cadence, compliance |
| **Product Score (P)**, 1–10 | Can **full commercial product parity** — monetization, acquisition, social fabric, liveops, compliance — be achieved **off-platform** (outside WeChat/抖音) by a competent independent studio that is not the original IP holder? | How easy the client code is |

High = easier/fuller replication on both axes. The scales are **absolute**: P=10 would mean drop-in off-platform parity, which no game in this corpus achieves (per Round 1 gap analysis G1–G12, the platform fabric — chat-graph distribution, 流量主 ad economics, one-tap payment, compliance absorption — has no generic equivalent). P values therefore cluster in 2–5; the *relative ordering* is the signal. M uses the full upper range because the casual chart genuinely is vanilla-JS territory.

### Vanilla-JS policy for M

"Vanilla JS/HTML5" = browser-standard APIs only, no engine (no Cocos/Phaser/Three). A small OSS **WASM library** (e.g., Rapier physics) is browser-standard tech but not "vanilla authorship" — games that need one take an explicit deduction on M3 and get a separate `engine_assisted_mechanic_score` field showing what the score would be with an OSS engine stack (this keeps Round 2 comparable with Round 1's engine-agnostic tech-portability numbers).

---

## 1. Rubric

### 1.1 Mechanic Score M — sub-factors and weights

`M = round(0.35·M1 + 0.25·M2 + 0.25·M3 + 0.15·M4)`, half-up.

| # | Sub-factor | Weight | Anchors (10 → 1) |
|---|---|---|---|
| M1 | **Loop self-containment** — does one full session run offline, deterministically, with no server or other players? | 0.35 | 10 = fully offline session · 7 = core session offline but a headline mode needs server/bots · 4–5 = a meaningful slice is offline but the retention loop is online (async raids, matchmaking) · 1–2 = loop is inherently persistent/massively-multiplayer (SLG world map, alliance war) |
| M2 | **Rendering fit** — how well do raw Canvas 2D / WebGL cover the visuals without an engine? | 0.25 | 10 = 2D sprites/grid on Canvas 2D · 8–9 = particles, zoomable scenes, 2.5D layers · 6–7 = heavy VFX / hundreds of entities / skeletal-style animation needing pooling & perf work · 5 = full 3D scene in hand-rolled WebGL · ≤3 = engine-class 3D pipeline effectively required |
| M3 | **Simulation fit** — logic/physics complexity in plain JS | 0.25 | 10 = grid/turn logic with solver · 8–9 = timers, economies, cellular automata, simple ballistics · 7 = deterministic realtime combat sim (waves, merge-TD) · 4 = 3D rigid-body physics (vanilla impractical; WASM lib deduction) · ≤2 = distributed/authoritative simulation |
| M4 | **Content bootstrap** — how much original content must exist before the loop is even testable? | 0.15 | 10 = procedural · 7 = solver-generated levels · 4–5 = large authored data tables / balance matrices · 2–3 = art or content volume *is* the game (hidden-object scenes, SLG content) |

### 1.2 Product Score P — sub-factors and weights

`P = round(0.25·P1 + 0.20·P2 + 0.15·P3 + 0.25·P4 + 0.15·P5)`, half-up.

| # | Sub-factor | Weight | Anchors (10 → 1) |
|---|---|---|---|
| P1 | **Monetization parity** — do equivalent revenue rails exist off-platform? | 0.25 | Reference points: CN-web rewarded video ≈ nonexistent → pure-IAA titles cap at ~3 (global portals like Poki/CrazyGames work at lower eCPM); native-app IAP path proven → 4–5; the Nov-2025 Apple–Tencent deal (12–17% take in-platform) *widens* the in-WeChat advantage |
| P2 | **Acquisition & virality** — does growth survive without chat-graph share cards (30–50% of installs for top titles)? | 0.20 | 1 = the chat share/brag loop is the growth engine · 2–3 = paid-UA-driven, replicable with budget · 5+ = organic/brandable genre appeal |
| P3 | **Social fabric** — friend leaderboards, guilds/alliances, visits | 0.15 | 1 = friend ranking IS the core value · 2–3 = guild/alliance systems need player critical mass · 5 = light social garnish · 8+ = effectively single-player |
| P4 | **Backend & liveops burden** — server systems + content cadence + anti-cheat + operations org | 0.25 | 8 = static/minimal · 7 = level service + telemetry · 4–5 = rooms/matchmaking or a steady content pipeline · 2–3 = server-authoritative economy + seasonal liveops · 1 = sharded persistent world + liveops organization |
| P5 | **Compliance & IP attainability** | 0.15 | 4 = original IP, proven global genre analogs (CN standalone still needs 版号, but a global path is open) · 3 = CN-market/CJK-culture-bound product (localization or audience does not transfer) · 1 = central third-party IP that a replicator cannot license (e.g., 芒果TV综艺) |

### 1.3 Adjustment rule

The weighted sum may be adjusted by **at most ±1** with a documented reason, for cases where linear weights mis-price a hard cap (e.g., an unlicensable IP or a product whose entire value is one sub-factor). Only 2 of 22 games use it (跳一跳, 向往的生活); every adjustment is recorded in the JSON.

---

## 2. Scores — 畅玩榜 (IAA, most-played) Top 10, 2026-07

| # | Game | Genre | M1/M2/M3/M4 | **M** | P1/P2/P3/P4/P5 | **P** | Gap M−P |
|---|---|---|---|---|---|---|---|
| 1 | 赵云与阿斗 | 文字拼接+塔防 | 7/9/7/5 | **7** | 4/3/4/4/3 | **4** | 3 |
| 2 | 羊了个羊：星球 | 层叠式三槽消除 | 10/10/10/8 | **10** | 3/1/2/7/3 | **3** | 7 |
| 3 | 挪了下车 | 停车/排序解谜 | 10/10/10/7 | **10** | 3/3/5/8/4 | **5** | 5 |
| 4 | 抓大鹅 | 3D找物消除 | 9/5/4/7 | **6** (engine-assisted: 8) | 3/3/4/7/4 | **4** | 2 |
| 5 | 一找一个准 | 找物解谜 | 10/9/10/3 | **9** | 3/3/5/5/4 | **4** | 5 |
| 6 | 沙画消消 | 沙画排序消除 | 10/9/8/7 | **9** | 3/3/4/7/4 | **4** | 5 |
| 7 | 躺平发育 | 非对称宿舍塔防 | 5/8/7/6 | **6** | 3/2/3/4/3 | **3** | 3 |
| 8 | 挪了个挪 | 挪动/排序解谜 | 10/10/9/7 | **9** | 3/3/4/8/4 | **5** | 4 |
| 9 | 搬砖没我快 | 蚂蚁搬家式排序消除 | 10/9/8/7 | **9** | 3/3/4/7/4 | **4** | 5 |
| 10 | 打个螺丝 | 螺丝拆解/排序解谜 | 10/8/7/6 | **8** | 3/3/4/7/4 | **4** | 4 |

Notes:

- **羊了个羊：星球 M=10** is *proven on this branch*: `prototypes/sheep-match3/` and `prototypes/tile-trio/` implement the layered triple-match loop with solvability generation and headless verification in plain JS. Its P=3 is the mirror image — the product is a CN-chat social phenomenon (difficulty-cliff brag loop, region/friend boards, rewarded-ad revives) that has no off-platform equivalent.
- **抓大鹅 is the only casual title where the vanilla-JS constraint bites**: a 3D rigid-body pile of hundreds of items with raycast picking is impractical to author from scratch (M3=4, M2=5). With Three.js + Rapier (all OSS) it scores 8, matching Round 1. It is the corpus's one *client-tech* moat.
- **躺平发育** is the only IAA title with an online-coupled core loop (asymmetric raid/defense against other players' layouts), hence M=6 despite trivial rendering.

## 3. Scores — 畅销榜 (IAP, top-grossing) Top 10, 2026-07

| # | Game | Genre | M1/M2/M3/M4 | **M** | P1/P2/P3/P4/P5 | **P** | Gap M−P |
|---|---|---|---|---|---|---|---|
| 1 | 向僵尸开炮 | Roguelike割草+塔防+轻RPG | 9/6/7/6 | **7** | 5/3/4/3/3 | **4** | 3 |
| 2 | 三国：冰河时代 | 冰雪生存+三国4X SLG | 2/5/8/3 | **4** | 4/2/2/1/3 | **2** | 2 |
| 3 | 灵画师 | 修仙放置RPG+开箱养成 | 7/7/8/4 | **7** | 4/3/3/2/3 | **3** | 4 |
| 4 | 疯狂水世界 | 海上生存经营+卡牌+轻SLG | 6/7/8/3 | **6** | 4/3/2/1/3 | **3** | 3 |
| 5 | 我的花园世界 | 种花模拟经营+社交 | 9/8/9/3 | **8** | 5/3/3/3/4 | **4** | 4 |
| 6 | 跃动小子 | 开箱养成+休闲闯关 | 8/7/7/5 | **7** | 4/3/3/2/3 | **3** | 4 |
| 7 | 镇邪人 | 中式微恐RPG+搜打撤 | 8/6/8/3 | **7** | 4/3/4/3/3 | **3** | 4 |
| 8 | 无尽冬日 | 冰雪生存+4X SLG | 2/5/8/2 | **4** | 4/2/2/1/3 | **2** | 2 |
| 9 | 永远的蔚蓝星球 | 随机英雄合成+Roguelike塔防 | 9/7/8/6 | **8** | 4/3/3/3/4 | **3** | 5 |
| 10 | 向往的生活 | 二合merge-2+田园经营 | 10/9/9/5 | **9** | 4/2/3/4/1 | **2** (3.0 adj −1) | 7 |

Notes:

- **SLGs (无尽冬日, 三国：冰河时代) score M=4, not lower**, because the *client* is genuinely simple (timers + economy math + 2.5D scenes); what destroys M1 is that the retention loop — alliance war on a persistent shard — cannot exist client-side at all. P=2 reflects Round 1's verdict: replicating them means building a Whiteout-class backend and a liveops organization; gameplay is platform-independent but parity is an engineering *program*, not a project.
- **向往的生活 takes the framework's only IP adjustment**: computed P=3.0, adjusted to 2 because the product is built on a 芒果TV variety-show license a replicator cannot obtain — parity is not merely hard but structurally unattainable, while its merge-2 mechanics are among the easiest on the grossing chart (M=9).
- **向僵尸开炮 gets the grossing chart's best P1 (5)**: its own developer proved the native-app path; hybrid IAA+IAP rails exist off-platform. The moat is content volume + liveops cadence (P4=3), not technology.

## 4. Scores — Mandated evergreen additions (off current charts)

| Game | Basis | M1/M2/M3/M4 | **M** | P1/P2/P3/P4/P5 | **P** | Gap |
|---|---|---|---|---|---|---|---|
| 跳一跳 | 2017 launch icon; evergreen | 10/10/9/9 | **10** | 2/1/1/8/4 | **2** (3.45 adj −1) | 8 |
| 寻道大千 | 畅销榜 #28 (Jul 2026); era-defining 2023–24 #1 | 8/7/9/4 | **7** | 4/2/3/2/3 | **3** | 4 |

- **跳一跳 is the framework's calibration case** and the reason the dual axis exists. M=10 (working vanilla-canvas replica already sits in `prototypes/jump-jump/`; ballistic arc + landing check + procedural platforms). Its computed P of 3.45 is adjusted −1 because the weighted formula lets a trivial backend (P4=8) rescue a product whose *entire* value — friend/group leaderboards inside chat — was rated 🔴-blocking in Round 1 (gaps G2/G3). Without an ambient social graph, the clone is a tech demo. Round 1's blended 7 for this game was the single most misleading number in the corpus; it is now 10/2.
- **寻道大千**: the idle chop-chop loop itself is easy vanilla JS (timers + loot tables), but the product formula was WeChat-ad-network UA arbitrage + IAP rails + rapid liveops iteration — none of which transfers.

---

## 5. Quadrant Analysis (thresholds: M ≥ 7 high, P ≥ 4 high)

```
        P (product parity off-platform)
        2         3         4         5
M 10  跳一跳    羊了个羊              挪了下车
M  9  向往的生活           一找一个准  挪了个挪
                            沙画消消
                            搬砖没我快
M  8            永远的蔚蓝  打个螺丝
                            我的花园世界
M  7            灵画师      向僵尸开炮
                跃动小子    赵云与阿斗
                镇邪人
                寻道大千
M  6            躺平发育    抓大鹅
                疯狂水世界
M  4  无尽冬日
      三国冰河
```

| Quadrant | Games | Strategy |
|---|---|---|
| **Mechanic mine** (M≥7, P≤3) — *the parent-defined sweet spot* | 跳一跳 (10/2), 羊了个羊 (10/3), 向往的生活 (9/2), 永远的蔚蓝星球 (8/3), 灵画师 (7/3), 跃动小子 (7/3), 镇邪人 (7/3), 寻道大千 (7/3) | The mechanic is cheap to replicate and the incumbent's commercial value is **platform-locked** — nobody, including the incumbent, has product parity off-platform. Harvest the loop, re-base the product value on whatever social fabric your channel has (Telegram Mini Apps chat graph, Discord Activities, web-portal ladders). Do **not** attempt like-for-like commercial parity. |
| **Clone & commercialize** (M≥7, P≥4) | 挪了下车 (10/5), 挪了个挪 (9/5), 一找一个准 (9/4), 沙画消消 (9/4), 搬砖没我快 (9/4), 打个螺丝 (8/4), 我的花园世界 (8/4), 向僵尸开炮 (7/4), 赵云与阿斗 (7/4) | Both axes favorable: mechanics are vanilla-JS territory *and* the product survives off-platform (solver-generated content, light social coupling, global genre analogs). The 挪-family/sort-casual cluster is the best raw indie bet for an actual shipped product on global web portals. |
| **Tech moat** (M≤6, P≥4) | 抓大鹅 (6/4) | Only member. The barrier is client tech (mobile-web 3D physics), not the platform — exactly why Round 2's prototype track targets it as a benchmark. Engine-assisted M=8. |
| **Do not replicate** (M≤6, P≤3) | 躺平发育 (6/3), 疯狂水世界 (6/3), 无尽冬日 (4/2), 三国：冰河时代 (4/2) | Online-coupled loops plus heavy backend/liveops. Treat SLGs as business-case studies only (Round 1 recommendation, unchanged). |

## 6. Cross-Check Against Round 1 Single-Axis Scores

| Game | R1 blended | R2 M/P | Verdict on the split |
|---|---|---|---|
| 挪了下车 | 9 | 10/5 | R1 score ≈ M-dominated; correct but hid the P=5 ceiling (best P in corpus, still no CN-web ad economy) |
| 羊了个羊：星球 | 8 | 10/3 | R1 averaged away the virality dependence; split exposes it |
| 抓大鹅 | 8 | 6/4 | **Intentional divergence**: R1 scored engine-agnostic tech portability (Three.js+Rapier); Round 2's strict vanilla-JS axis drops M to 6 (`engine_assisted_mechanic_score: 8` preserves comparability) |
| 跳一跳 | 7 | 10/2 | The motivating case — widest gap (8) in the corpus |
| 赵云与阿斗 | 7 | 7/4 | Consistent |
| 向僵尸开炮 | 7 | 7/4 | Consistent |
| 我的花园世界 | 6 | 8/4 | Loop simpler than R1 implied; cost is content volume (M4=3), captured in P4 |
| 寻道大千 | 6 | 7/3 | Consistent |
| 无尽冬日 | 5 | 4/2 | Consistent |
| 三国：冰河时代 | 5 | 4/2 | Consistent |

No ordering inversions against Round 1; the 12 newly scored chart titles (the rest of both top-10s) fill out the corpus to 22 games.

## 7. Recommendations Feeding Round 2/3

1. **Sweet-spot answer (highest M, lowest P)**: 跳一跳 (10/2) > 羊了个羊：星球 (10/3) > 向往的生活 (9/2, IP-capped — mine the merge-2 loop only). These are pure mechanic-mining targets.
2. **Best ship-a-product indie targets** (high M *and* the corpus-max P): 挪了下车 (10/5) and 挪了个挪 (9/5) — validates the Round 2 parking-prototype track currently in flight (`opus-r2-parking-prototype`).
3. **抓大鹅 prototype should be benchmark-first**: its M=6 is the only casual score gated by client tech; a Three.js+Rapier mobile-web physics benchmark converts it to 8.
4. **The wx-shim track is the P-axis mitigation**: every P score ≤3 traces to gaps G2/G3/G6 (graph, share, ad economics); `prototypes/shared/wx-shim.js` quantifies exactly which `wx.*` calls each prototype would need.
5. **Do not spend Round 3 effort on the do-not-replicate quadrant** beyond documenting it.

*End of Round 2 dual-axis scoring — fable subagent.*
