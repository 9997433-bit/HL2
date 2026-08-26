# Parent Orchestrator — Round 1 Baseline Research

> Compiled by Parent Orchestrator while subagents run (2026-08-26)

## Data Sources
- 引力引擎/ADX 微信小游戏畅销榜、畅玩榜 (2025-2026)
- 2026微信小游戏开发者大会平台数据
- GameLook, 36氪, 游戏客栈 industry reports

## Top 10 — 畅销榜维度 (Revenue/IAP, ~2026 H1)

| Rank | Game | Genre | Replicability |
|------|------|-------|---------------|
| 1 | 向僵尸开炮 | Tower defense / Roguelike shooter | Medium — complex meta-progression |
| 2 | 三国：冰河时代 | SLG / Strategy | Hard — heavy server, monetization |
| 3 | 灵画师 | Idle / RPG | Medium |
| 4 | 疯狂水世界 | Merge / Casual | Medium |
| 5 | 我的花园世界 | Simulation / Merge | Medium |
| 6 | 无尽冬日 | SLG | Hard |
| 7 | 寻道大千 | Cultivation / Idle RPG | Medium-Hard |
| 8 | 永远的蔚蓝星球 | Tower defense | Medium |
| 9 | 跃动小子 | Action / Casual | Medium |
| 10 | 西游降妖记 | RPG | Hard |

## Top 10 — 畅玩榜维度 (DAU/IAA, Popularity)

| Rank | Game | Genre | Replicability |
|------|------|-------|---------------|
| 1 | 羊了个羊：星球 | Tile matching puzzle | **Easy** — core mechanic simple |
| 2 | 抓大鹅 | Hidden object / Puzzle | Easy-Medium |
| 3 | 挪了下车 | Parking puzzle | **Easy** |
| 4 | 赵云与阿斗 | Word + Tower defense | Medium |
| 5 | 猪了个猪 | Tile matching (羊了个羊-like) | **Easy** |
| 6 | 箭了又箭 | Arrow puzzle | Easy |
| 7 | 俄罗斯方块拼图 | Tetris variant | **Easy** |
| 8 | 套住那只羊 | Casual puzzle | Easy |
| 9 | 一找一个准 | Hidden object | Easy-Medium |
| 10 | 跳一跳 (legacy hit) | Timing / Platform | **Very Easy** |

## Platform Stats (2026)
- MAU: 5亿+
- DAU 100万+: 80款
- Developers: 50万+
- IAP MAU: 3亿+; IAA MAU: 4亿+

## Replication Verdict Summary

### ✅ Highly Replicable (Web/HTML5 MVP in days)
- **跳一跳** — single mechanic, physics timing
- **羊了个羊** — tile layer matching, no server needed for MVP
- **挪了下车** — sliding block puzzle
- **俄罗斯方块拼图** — well-known mechanics

### ⚠️ Partially Replicable (weeks, needs backend for full parity)
- **抓大鹅** / **向僵尸开炮** — core loop OK, meta/IAP hard
- **灵画师** / **疯狂水世界** — merge mechanics feasible, economy hard

### ❌ Hard to Replicate (months+, strong platform dependency)
- **三国：冰河时代** / **无尽冬日** — SLG server infrastructure
- **寻道大千** / **西游降妖记** — deep RPG progression + IAP
- Social features (好友排行, 分享复活) require WeChat SDK

## Recommended Replication Targets (Top 3)
1. **羊了个羊** — viral puzzle, minimal assets, proven engagement loop
2. **跳一跳** — iconic WeChat mini game, perfect Canvas demo
3. **挪了下车** — trending IAA puzzle, clean algorithmic core

## Legal/IP Warning
Direct cloning of branded games violates copyright. Replication here means **mechanic-inspired originals** with distinct art/naming.
