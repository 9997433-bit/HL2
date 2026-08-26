# WeChat Mini-Game Ranking Probe — Round 1

Generated: 2026-08-26  
Scope: public 2025–2026 ranking evidence from 引力引擎, DataEye-ADX, 36氪 and cross-checks

## Result

The latest complete requested-source ranking found is the **July 2026 DataEye-ADX × 引力引擎 monthly chart**, published by 36氪 on 2026-08-03. It ranks games by their average position during the month. The bestselling list is mainly IAP-based and applies a special coefficient to new games; the most-played list is mainly IAA-based.

### Primary Top 10: WeChat Bestselling (IAP)

| Rank | Game | Monthly average | Genre / core loop | Replication |
|---:|---|---:|---|---|
| 1 | 向僵尸开炮 | 3.9 | Roguelike horde shooter + tower defense + light RPG | Medium-hard |
| 2 | 三国：冰河时代 | 4.0 | Survival city-builder + Three Kingdoms 4X SLG | Hard |
| 3 | 灵画师 | 5.3 | Chinese-fantasy idle RPG + loot-box equipment | Medium-hard |
| 4 | 疯狂水世界 | 6.7 | Ocean survival management + cards + light SLG | Hard |
| 5 | 我的花园世界 | 7.0 | Flower growing/arranging management + social | Medium |
| 6 | 跃动小子 | 7.3 | Chest-opening progression + casual RPG | Medium |
| 7 | 镇邪人 | 8.0 | Folk-horror RPG + light extraction + idle growth | Medium-hard |
| 8 | 无尽冬日 | 8.6 | Survival management + 4X SLG | Very hard |
| 9 | 永远的蔚蓝星球 | 9.2 | Random hero merge + Roguelike tower defense | Medium |
| 10 | 向往的生活 | 11.6 | Merge-2 + pastoral building/management | Medium |

Confidence is **high for all ten ranks**: each row was read directly from the first embedded chart in the 36氪/DataEye article. The article text or independent mirrors also confirm the head ordering, and 游戏客栈 independently reports the same top five. The original chart URL is recorded in `rankings.json`.

### Primary Top 10: WeChat Most Played (IAA)

| Rank | Game | Monthly average | Core loop |
|---:|---|---:|---|
| 1 | 赵云与阿斗 | 1.0 | Word-combination tower defense |
| 2 | 羊了个羊：星球 | 2.0 | Layered three-slot tile matching |
| 3 | 挪了下车 | 3.3 | Parking/sorting puzzle |
| 4 | 抓大鹅 | 3.7 | 3D hidden-object elimination |
| 5 | 一找一个准 | 5.2 | Hidden-object puzzle |
| 6 | 沙画消消 | 6.0 | Sand-art sorting/elimination |
| 7 | 躺平发育 | 7.5 | Asymmetric dorm tower defense |
| 8 | 挪了个挪 | 8.7 | Movement/sorting puzzle |
| 9 | 搬砖没我快 | 9.0 | “Ant moving” sorting/elimination |
| 10 | 打个螺丝 | 10.7 | Screw-removal/sorting puzzle |

These are better replication targets than the IAP leaders. Most can support a distinct-art Canvas/Web MVP using one puzzle mechanic and local level data. Full commercial parity still depends on ad mediation, a large level pipeline, telemetry, retention tuning and WeChat sharing/leaderboards.

## Why Other “Top 10” Lists Differ

GameLook's July 2026 series reports:

1. 我的花园世界
2. 向僵尸开炮
3. 三国：冰河时代
4. 永远的蔚蓝星球
5. 灵画师
6. 无尽冬日
7. QQ经典农场
8. 斗罗大陆：传承
9. 向往的生活
10. 浪漫餐厅

This is not a contradiction to resolve by averaging ranks. DataEye-ADX/引力引擎 explicitly says its monthly list uses average in-month positions and gives new games special weighting. GameLook publishes a separate monthly statistical series. The two agree on seven names but not on order or all members, so `rankings.json` preserves them as separate series.

## 2025–2026 Directional Evidence

- GameLook's July 2025 Top 10 was led by 向僵尸开炮, 三国：冰河时代 and 无尽冬日; seven of its ten were established IAP/RPG/SLG products.
- The December 2025 引力引擎 head remained 三国：冰河时代, 向僵尸开炮, 道友来挖宝, 无尽冬日 and 我的花园世界.
- The January 2026 ADX/引力引擎 Top 10 added 生存33天 and 传奇之业 while retaining seven recurring products.
- By July 2026, 疯狂水世界 and 镇邪人 had entered the ADX Top 10, while long-running 向僵尸开炮, 三国：冰河时代, 灵画师 and 无尽冬日 remained present.
- On the IAA side, 赵云与阿斗 ended 羊了个羊：星球's reported 11-month run at number one. Sorting/elimination variants still occupied most of the Top 10.
- QuestMobile's August 2025 MAU cross-check used a different popularity metric: 无尽冬日 50.73m, 向僵尸开炮 40.41m, 贪吃蛇大作战 36.61m, 腾讯欢乐斗地主 32.87m and 三国：冰河时代 28.94m. This supports the durable reach of several IAP leaders but should not be treated as an IAP rank.

## Replication Feasibility

Best mechanic-inspired prototypes:

1. **挪了下车 / 打个螺丝 / 搬砖没我快** — deterministic puzzle state, small runtime, no backend needed for a core demo.
2. **羊了个羊：星球** — simple tile/tray state machine; level solvability and difficulty tuning are the main product risks.
3. **永远的蔚蓝星球** — a stronger game prototype target: summoning, merging and short tower-defense rounds are tractable, though balance requires work.
4. **向僵尸开炮** — the battle slice is feasible, but a faithful product requires large progression and live-operations systems.

Poor full-replication targets:

- **三国：冰河时代 / 无尽冬日** — alliance state, timed seasons, synchronized world simulation, anti-cheat and heavy backend.
- **疯狂水世界** — three linked products in one: management, hero/card progression and alliance SLG.
- **向往的生活** — the merge core is feasible, but the original's value includes licensed 芒果TV IP and social/content operations.

“Replication” should mean a mechanic-inspired original. Reusing names, characters, art, levels, text or licensed IP would introduce copyright/trademark risk.

## Confidence and Caveats

- **High**: direct chart transcription plus textual or mirror corroboration. Used for both primary Top 10s.
- **Medium**: one credible textual report without a legible chart. Kept only in historical/context fields.
- **Low**: search snippets, inferred ordering or unclear methodology. Excluded from the primary ranks.

Important limitations:

- “Bestselling” measures monetization competition, not quality, reviews or total players.
- IAP and IAA lists answer different questions and must not be merged without a declared weighting.
- The live 引力引擎 site exposes little indexable HTML; the 36氪/DataEye article and its embedded source charts provide the auditable snapshot.
- The 36氪 July article says the comparison is to “2026年8月”; because it was published on August 3 and describes July, this is evidently a source typo. No affected month-over-month field is used here.
- Public ranking algorithms are not fully disclosed, so positions are best treated as market signals rather than audited revenue.

## Sources

1. [36氪 / DataEye — July 2026 DataEye × 引力引擎 monthly rankings](https://www.36kr.com/p/3923287949176195)
2. [网易 / DataEye mirror — July 2026 monthly rankings](https://c.m.163.com/news/a/L3DIIN7K0553OKLX.html)
3. [游戏客栈 — July 2026 six-list analysis](http://www.gamekezhan.com/news/20260818/64711.html)
4. [GameLook — July 2026 WeChat bestselling Top 100](http://www.gamelook.com.cn/2026/08/599222/)
5. [36氪 — 2025 mini-game annual review](https://36kr.com/p/3660445275988615)
6. [36氪 / QuestMobile — August 2025 MAU analysis](https://www.36kr.com/p/3518304729176969)
7. [网易 / 游戏客栈 — December 2025 six-list analysis](https://c.m.163.com/news/a/KJDVMCCQ05466ZM9.html)
8. [腾讯新闻 / DataEye — January 2026 ADX × 引力引擎 monthly rankings](https://news.qq.com/rain/a/20260203A01KOA00)
9. [GameLook — July 2025 WeChat bestselling Top 100](http://www.gamelook.com.cn/2025/08/575846/)

## Artifacts and Reproduction

- Structured data: `.agent_workspace/round1/rankings.json`
- Report: `.agent_workspace/round1/gpt-ranking-probe-report.md`
- Zero-dependency collector/probe: `scripts/collect_rankings.py`

Commands:

```bash
python3 scripts/collect_rankings.py --check
python3 scripts/collect_rankings.py --check --probe
```

The first command validates the checked-in structured snapshot. The second also fetches the live 36氪 page and verifies the expected article text and chart asset identities.
