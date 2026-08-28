# 浮城人生 · O1 弹窗事件 + 出身 Mini-Saga

## Goal
1. **O1 弹窗**：50+ 手写 modal 事件，choices[] 迁入 `story.json` SSOT，`fc-events.js` 去 SCRIPT 硬编码依赖
2. **出身 Mini-Saga**：10 种出身各 1 条 3–4 步短链，按 `origin.storyId` 在入城后触发

## Branch
`agent/fucheng-o1-origin-sagas`（基于 `cursor/fucheng-life-gameplay-fa72` / 301 ambient 内容）

## 关键路径
- `games/fucheng-life/data/story.json` — sampleEvents → events SSOT
- `games/fucheng-life/js/fc-events.js` — pick/show/toPayload
- `scripts/curated/origin-sagas.js` + `scripts/build-gameplay-data.js`
- `games/fucheng-life/js/fc-sim.js` — origin saga trigger
- `games/fucheng-life/tests/` — schema + count gates

## 10 出身 id（story.json）
ordinary-worker, middle-class, public-system, rural-migrant, urban-village,
wealthy-merchant, humble-scholar, orphan, state-household, factory-youth

## Round Status
| Round | Status | Agents |
|-------|--------|--------|
| R1 | in_progress | 6× cloud |
| R2 | pending | — |
| R3 | pending | — |

## 验收门禁
- O1 events ≥ 50，每条含 choices[2–3]、layerId、category、写实文案
- originSagas = 10，每条绑定 originId，3–4 steps
- `./scripts/run-fucheng-life-tests.sh` 全绿
- 180 月 sim 无回归
