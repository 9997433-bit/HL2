# Round 1 — Global Planning: Top 10 WeChat Mini Games & Replication Feasibility

- **Agent:** fable (global planning / architecture strategy)
- **Model slug:** claude-fable-5-thinking-xhigh
- **Date:** 2026-08-26
- **Status:** COMPLETE — research based on live web sources (Dec 2025 / Jan 2026 data)

> **Platform-constants footnote (2026-08-26):** Package and payment statements
> in this report are a historical snapshot. The current canonical Mini Game
> values, API names, scope distinctions, and verification labels are in
> [`platform-constants.json`](../platform-constants.json); where they differ,
> that file supersedes this report.

---

## 1. Ranking Sources (Authoritativeness Assessment)

There is no single "official public top 10" — WeChat's in-client charts (畅销榜/畅玩榜) are visible only inside WeChat and update daily. Industry practice is to triangulate across these sources, in descending order of authority:

| # | Source | What it provides | Authority |
|---|--------|------------------|-----------|
| 1 | **WeChat official in-client charts** — 畅销榜 (IAP grossing) & 畅玩榜 (IAA play chart) | Daily rank positions, no absolute numbers | Primary (Tencent official) |
| 2 | **微信公开课 PRO (WeChat Open Class, Jan 2026)** — platform keynote by mini game product director 李卿 | Macro platform stats: MAU 500M+, ~70 games with 1M+ DAU, 300+ games >¥10M quarterly revenue | Primary (Tencent official) |
| 3 | **QuestMobile** annual/semi-annual reports | Absolute MAU per game (e.g. 无尽冬日 50.73M MAU, Aug 2025) | High (leading third-party analytics) |
| 4 | **DataEye ADX / 引力引擎 (Gravity Engine)** monthly Top 100 | Monthly grossing/play/UA-spend rankings, rank movement | High (ad-intelligence platforms; used by 澎湃/36Kr/游戏客栈) |
| 5 | Trade media: **GameLook, 游戏客栈, 36Kr game desk, 竞核** | Editorial synthesis, developer attribution, launch dates | Medium (secondary, but corroborating) |

Key cross-checked snapshots used below:
- **Dec 2025 IAP grossing top 10** (ADX via 腾讯新闻/澎湃): 三国：冰河时代, 生存33天, 向僵尸开炮, 无尽冬日, 道友来挖宝, 遗弃之地, 跃动小子, 佣兵小镇, 我的花园世界, 神器传说.
- **Dec 2025 IAA play chart top** (引力引擎 via 网易): 羊了个羊：星球, 抓大鹅, 猪了个猪, 套住那只羊, 箭了又箭, 俄罗斯方块拼图.
- **Dec 2025 MAU top 10** (QuestMobile, all >12M MAU): 向僵尸开炮, 无尽冬日, 腾讯欢乐斗地主, 三国：冰河时代, 羊了个羊：星球, 元梦之星, 贪吃蛇大作战, 青云诀之伏魔, 天天斗地主真人版, 猪了个猪.

Platform macro context (2026 WeChat Open Class PRO): 1B+ cumulative registered users, **500M+ MAU** (QuestMobile: 571M MAU / 51.5% penetration, Aug 2025), DAU +10% YoY, 28 games with 10M+ MAU, 400K+ registered developers (~80% are teams of <30 people). 42% of users are 40+; 58% live in tier-3-and-below cities — this shapes what "replicable" means commercially.

---

## 2. Definitive Top 10 List (composite of MAU + revenue, Dec 2025 – Jan 2026)

Because "top" differs by metric, this list is a composite: engagement (MAU/DAU) weighted with revenue (grossing chart), so it covers both the IAP (in-app purchase) and IAA (in-app advertising) halves of the market.

| # | Game (CN / EN) | Genre & core mechanics | Scale | Developer / Operator |
|---|----------------|------------------------|-------|----------------------|
| 1 | **无尽冬日** / Whiteout Survival (mini game ed.) | Survival-SLG hybrid: casual chapter-based survival sim funnel into full 4X (base building, alliances, server wars) | **50.7M MAU** (Aug 2025); #1 MAU much of 2025; top-4 grossing | 点点互动 (DianDian Interactive / Century Games, 世纪华通 subsidiary) |
| 2 | **向僵尸开炮** / lit. "Fire at Zombies" | Casual roguelite auto-shooter + tower defense: drag-to-aim cannon, wave defense, deep gear/talent meta | **40.4M MAU** (Aug 2025); top-3 grossing throughout 2025 | Dev 大梦龙途; operator 海南盛昌网络 |
| 3 | **三国：冰河时代** / Three Kingdoms: Ice Age | Survival-SLG: Whiteout-style frozen-city rebuilding with Three-Kingdoms officers, county management, PvP | **28.9M MAU**; **#1 on Dec 2025 grossing chart** | 欢游互动（北京）科技有限公司 |
| 4 | **腾讯欢乐斗地主** / Tencent Happy Dou Dizhu | Card (Dou Dizhu / "Fight the Landlord"), real-time 3-player matches, social tables | **32.9M MAU**; evergreen since 2018 | Tencent |
| 5 | **贪吃蛇大作战** / Snake Off | Casual .io: snake grows by eating, kills via cut-offs; short synchronous/async matches | **36.6M MAU**; evergreen | 微派网络 (Wepie) |
| 6 | **羊了个羊：星球** / Sheep a Sheep: Planet | 3-tile match puzzle: pick tiles from stacked layers into a 7-slot tray, match-3 to clear; brutal level-2 difficulty spike drives sharing/ad revives | Top-5 MAU (>12M); **#1 on Dec 2025 IAA play chart**; original 羊了个羊 was 2022's viral phenomenon | 北京简游科技 (Simayi), backed/published by 豪腾嘉科 |
| 7 | **抓大鹅** / lit. "Catch the Big Goose" | 3D physics tile-match: items piled in a pot, pick 3 identical to clear; **gyroscope "shake the pot" (颠锅)** mechanic; goose collection meta | **Peak DAU 10M+** (2025); #2 IAA play chart | 成都蓝飞互娱 (Kunpo) |
| 8 | **生存33天** / lit. "Survive 33 Days" | Survivor-like (Vampire-Survivors-style auto-battler) + survival/base meta | Launched 2025-11-20; **#2 grossing within 3 weeks** — fastest riser of 2025 | 三七互娱 (37 Interactive, via 广州三七网络) |
| 9 | **道友来挖宝** / lit. "Daoist Friend, Come Dig Treasure" | Turn-based idle RPG (封神/Xianxia theme): stage-gated idle rewards, treasure-map digging loop; recalls 问道 IP audience | Stable top-5-to-10 grossing since May 2025 | 雷霆游戏 / 深圳雷霆信息 (G-bits 吉比特) |
| 10 | **遗弃之地** / lit. "Abandoned Land" | Tower defense with distinctive Chinese folk-horror (微恐民俗) art direction | Launched Nov 2025; top-6 grossing by Dec 2025 | 豪腾嘉科 (HaoTeng, same group as 羊了个羊) |

**Near-misses / notable:** 元梦之星 (Tencent party game, top-10 MAU), 猪了个猪 (tile-match follower, top-10 MAU), 跃动小子 (波克城市/上海堃冠 — #1 UA spend Dec 2025, ~8.1B est. impressions), 佣兵小镇 (成都天象互动, card RPG), 我的花园世界 (厦门麟贝互娱, garden sim), 神器传说 (深圳全民互动), plus 2023–24-era leaders now mid-chart: 咸鱼之王, 寻道大千, 青云诀之伏魔.

**Structural takeaway:** the market is a barbell — (a) IAP-heavy survival-SLG/RPG hybrids with tens of millions of MAU and enormous UA budgets, and (b) IAA-only viral casual puzzles that live or die on shareability. Mid-2025's biggest signal: hybrid "casual shell + mid-core meta" (无尽冬日, 向僵尸开炮, 生存33天) is the highest-revenue formula, while pure-casual 3-tile-match (羊了个羊 family, 抓大鹅) is the highest-reach / lowest-cost formula.

---

## 3. Replication Feasibility Matrix

Scored on: core-loop engineering, content volume, backend/multiplayer needs, LiveOps & meta systems, art production, and monetization machinery. "Replication" = building a legally clean game with the same core mechanics, not a clone of assets.

| Game | Core loop eng. | Content | Backend | Meta/LiveOps | Art | Overall |
|------|---------------|---------|---------|--------------|-----|---------|
| 羊了个羊：星球 (3-tile match) | Trivial (tile stack + 7-slot tray + match-3) | Low (procedural/level-gen possible) | Minimal (leaderboard, share) | Low | Low (one tile set + 2 scenes) | **EASY** |
| 抓大鹅 (3D tile match) | Low-med (3D physics pile, picking, gyroscope) | Med (400+ collectibles, themed scenes) | Minimal | Low-med (daily levels, collection) | Med (3D props) | **EASY-MEDIUM** |
| 猪了个猪 / 套住那只羊 (tile-match followers) | Trivial | Low | Minimal | Low | Low | **EASY** |
| 贪吃蛇大作战 (.io snake) | Med (real-time netcode or convincing bot-match) | Low | **High if true multiplayer**; low with bots | Med | Low | **MEDIUM** |
| 遗弃之地 (folk-horror TD) | Med (classic TD) | Med-high (levels, units, upgrades) | Low-med | Med | **High** (distinctive art is the moat) | **MEDIUM** |
| 向僵尸开炮 (roguelite TD-shooter) | Med (wave combat, roguelite draft) | High (gear, talents, chapters) | Med (progression server, events) | **High** (its revenue is the meta, not the core) | Med | **MEDIUM-HARD** |
| 生存33天 (survivor-like + survival meta) | Med (bullet-heaven combat, perf-sensitive) | High | Med | High | Med | **MEDIUM-HARD** |
| 道友来挖宝 (turn-based idle RPG) | Med | **Very high** (RPG systems, balance) | Med-high | High | Med-high | **HARD** |
| 无尽冬日 / 三国：冰河时代 (survival-SLG) | High | Very high | **Very high** (alliances, server wars, sync PvP) | Very high (weekly events, seasons) | High | **HARD** |
| 腾讯欢乐斗地主 (card) | Low (rules are simple) | Low | High (real-time matches, anti-cheat) | Med | Low | **HARD in practice** — 棋牌 category has the strictest licensing (版号 + extra 资质), Tencent network effects unassailable |

---

## 4. Recommended Replication Targets

### 🥇 Candidate 1: 羊了个羊-style 3-tile match ("Sheep-a-Sheep family") — EASY
- **Why:** smallest possible engineering surface (a competent build is a tile-stack data model, a 7-slot tray, and a solvability-aware level generator); IAA-only monetization means **no 版号 (game license) required** — just ICP filing + qualification review (official WeChat docs: IAA path ≈ 13–37 working days end-to-end, qualification review itself 1–3 days); the genre demonstrably still tops the IAA chart in Dec 2025 (羊了个羊：星球 #1, 猪了个猪 #3, 套住那只羊 #4 — the chart tolerates multiple coexisting variants, i.e., followers can win).
- **Success lever is design, not code:** the difficulty cliff (easy level 1 → brutal level 2), ad-revive loop, daily-limit scarcity, and friend/region leaderboards (WeChat open-data domain).
- **Legal:** directly de-risked by the 羊了个羊 v. 麻了个麻 judgment (see §6) — mechanics were explicitly not protected; only the art was.

### 🥈 Candidate 2: 抓大鹅-style 3D stack-and-match — EASY-MEDIUM
- **Why:** the breakout IAA hit of 2025 (peak DAU 10M+), still #2 on the play chart; one clear step up from candidate 1 (3D physics pile + gyroscope input) yet far below any IAP title in scope; the "3D pot + shake-to-shuffle" interaction plus a collection meta is a proven differentiation template — a replicator can differentiate on **theme** (regional food, seasons, festivals) the same way 抓大鹅 differentiated from 羊了个羊.
- **Adds:** modest 3D asset pipeline, physics tuning, device-motion API handling.

### 🥉 Candidate 3 (stretch, for the IAP path): 向僵尸开炮-style casual roguelite shooter/TD — MEDIUM-HARD
- **Why:** if the goal is revenue rather than reach, this is the smallest entry point into the top-grossing tier: single-player core combat (no real-time multiplayer), a well-documented meta blueprint, and 40M MAU proof of demand. But it needs a 版号, a corporate entity, months of meta/content build-out, and UA budget — recommend only as a phase-2 target after shipping candidate 1 or 2.

**Explicitly not recommended:** 无尽冬日 / 三国：冰河时代 class survival-SLG (server-war infrastructure + LiveOps org + eight-figure UA budgets; these are studio-scale bets) and 棋牌 card games (harshest licensing category + Tencent lock-in).

---

## 5. Technical Architecture Recommendation

### Engine: **Cocos Creator 3.x (TypeScript)** — clear default choice
| Option | Verdict | Rationale |
|--------|---------|-----------|
| **Cocos Creator** | ✅ **Recommended** | The Cocos runtime ships **inside the WeChat client** (as an engine plugin since WeChat 7.0.7), so it does **not** consume the 4 MB first-package budget; first-class WeChat build target; AssetBundle system maps directly onto mini-game subpackaging; handles both candidates (2D tile match and light 3D + gyroscope) |
| LayaAir | Viable alternative | Also officially adapted, but its runtime is not preinstalled in WeChat → eats into the 4 MB first package |
| Unity / 团结引擎 (Tuanjie) | Only for ports / heavy 3D | Goes through the WeChat WebGL→WASM conversion SDK; startup time and package size need aggressive optimization; overkill for our candidates |
| Raw Canvas/WebGL + adapter | Possible for candidate 1 | Minimal footprint, but you re-build tooling (atlas, audio, scene mgmt) that Cocos gives for free |

### Platform constraints to design around (from WeChat official docs)
- **First package ≤ 4 MB** (dictates: minimal splash scene, everything else in subpackages/CDN); total package limited (~20 MB with subpackages) — bulk assets served remotely via CDN.
- Aggressive texture compression (pngquant/WebP/ASTC), sprite atlases, font subsetting.
- No `window`/`document` — engine adapters handle this; all network via `wx.*` APIs.
- Performance sandbox: memory/CPU quotas on low-end devices (test on 红米-class phones via 微信云测).

### System architecture (for candidates 1–2)
```
Client (Cocos Creator 3.x, TS)
 ├─ Core gameplay module (tile-stack model / 3D pile + physics)
 ├─ Level-gen service (client-side, seeded; solvability checker)
 ├─ Ad module: wx rewarded video (激励式视频广告) — revive/booster placements
 ├─ Social module: wx.shareAppMessage, group sharing, 开放数据域
 │   (open data domain) for friend/region leaderboards
 └─ Analytics: wx reporting + custom events
Backend (thin)
 ├─ Option A: 微信云开发 (WeChat CloudBase) — serverless, fastest to ship
 └─ Option B: lightweight Node/Go API + Redis leaderboard (needed only
     for cross-region ranking, daily level distribution, remote config)
Dual-target strategy: keep gameplay core platform-agnostic → second build
target as H5 web / Douyin mini game for free extra distribution.
```

### Prototype-first plan
1. Week-0 spike: browser-playable HTML5 prototype of the 3-tile-match core (no WeChat account needed to validate the loop — a jump-jump canvas prototype already exists on this branch as precedent).
2. Port into Cocos Creator, add WeChat adapters, share/revive loop, leaderboard.
3. Only then invest in art theme + level-difficulty tuning (the actual moat).

---

## 6. Legal / IP / Licensing Risk Register

### IP risk — what is and isn't protected (Chinese law, with directly-on-point precedent)
- **Game mechanics/rules are NOT copyright-protected.** In 羊了个羊 (Simayi) v. 麻了个麻 (Beijing Internet Court, judgment publicized 2025), the court held the match-3/tile-pick *gameplay* is an unprotected abstract idea; what infringed was the **tile artwork** (16 tile faces held to be substantially similar art works → injunction + ¥26,000 damages). The name pattern "X了个X" was held **not** exclusive, and the unfair-competition claim failed.
- **Therefore:** replicating a loop is lawful **only if** all art, audio, code, characters, names, and store copy are original. Whole-game "audiovisual work" protection can still catch near-pixel clones (damages in other Chinese cases have reached tens of millions of RMB), so keep visible expression clearly distinct.
- **Trademark:** avoid names confusingly similar to 羊了个羊/抓大鹅 etc.; clear the chosen CN name before filing 软著.

### Regulatory / licensing (decisive for scope choice)
| Requirement | IAA-only game | IAP game |
|---|---|---|
| 版号 (NPPA game publication license) | **Not required** | **Required** (网络游戏出版物号核发单) — months+, needs Chinese publisher entity |
| 软著 (software copyright cert) | Only in edge cases (English in name, brand collabs) | **Required** |
| ICP filing (小程序备案) | Required (~7–20 working days) | Required |
| Entity type | Individual developer allowed | **Corporate/individual-business entity only** — individuals cannot enable virtual payment |
| End-to-end timeline (WeChat official) | ≈ 13–37 working days | ≈ 9–22 working days (after 版号 in hand) |
| Anti-addiction (未成年人防沉迷) | Required | Required (enforced popup standard as of 2026) |

- **Overseas-team caveat:** WeChat mini game registration requires a mainland-China entity (or a domestic publishing partner). If no China entity, the fallback is shipping the same Cocos build as an **H5 web game / overseas platforms**, sacrificing WeChat's distribution but eliminating the licensing burden.
- **Upside note:** WeChat's 2026 IAP incentive program offers up to ¥4M in UA-rebate incentives for first-launch titles — relevant only for the phase-2 IAP candidate.
- **Platform policy:** WeChat review rejects games it deems duplicative low-quality clones (低质仿冒) — another reason the replication must re-theme, not re-skin.

### Risk summary
| Risk | Severity | Mitigation |
|------|----------|-----------|
| Art/asset substantial similarity | High | 100% original art; document independent creation; register own 软著 + art copyrights |
| Name/trademark confusion | Medium | Distinct name; TM search before launch |
| 版号 unavailability (IAP path) | High (blocks IAP entirely) | Start IAA-only; partner with licensed publisher for phase 2 |
| Platform rejection as clone | Medium | New theme, new art direction, mechanic twist (e.g., different shuffle mechanic than 颠锅) |
| No China entity | High for WeChat launch | Domestic partner/publisher, or pivot distribution to H5/overseas |

---

## 7. Answer Summary for Orchestrator

- **Top 3 replication candidates:** ① 羊了个羊-style 3-tile match (EASY, IAA-only, no 版号, legally de-risked by precedent), ② 抓大鹅-style 3D stack-and-match with gyroscope (EASY-MEDIUM, hottest 2025 IAA genre), ③ 向僵尸开炮-style casual roguelite shooter/TD (MEDIUM-HARD, phase-2 IAP revenue play).
- **Architecture:** Cocos Creator 3.x + TypeScript targeting WeChat mini game (runtime pre-installed in WeChat = free 4 MB budget), thin serverless backend (微信云开发), open-data-domain leaderboards, rewarded-video monetization; keep core portable for H5/Douyin second target; validate loop first with a plain HTML5 prototype.
- **Hard constraint to socialize early:** IAP requires a Chinese corporate entity + 版号; IAA-only is the only fast path (≈13–37 working days) and the only path open to small/foreign teams.
