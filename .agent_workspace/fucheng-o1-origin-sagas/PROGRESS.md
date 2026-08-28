# 浮城人生 · O1 弹窗事件 + 出身 Mini-Saga

## Goal
1. **O1 弹窗**：50+ 手写 modal 事件，choices[] 迁入 `story.json` SSOT，`fc-events.js` 去 SCRIPT 硬编码依赖
2. **出身 Mini-Saga**：10 种出身各 1 条 3–4 步短链，按 `origin.storyId` 在入城后触发

## Branch
`agent/fucheng-o1-origin-sagas`（基于 `cursor/fucheng-life-gameplay-fa72` / 301 ambient 内容）

## 关键路径
- `games/fucheng-life/data/story.json` — `events[]` SSOT（56 条）
- `games/fucheng-life/js/fc-events.js` — pick/show/toPayload，无 SCRIPT 表
- `scripts/curated/origin-sagas.js` + `scripts/build-gameplay-data.js`
- `games/fucheng-life/js/fc-sim.js` — `tryStartOriginSaga` 3–18 月窗口
- `games/fucheng-life/tests/` — schema + count gates

## 10 出身 id（story.json SSOT）
ordinary-worker, middle-class, public-system, rural-migrant, urban-village,
wealthy-merchant, humble-scholar, blended-family, orphan, transnational

## Round Status
| Round | Status | Notes |
|-------|--------|-------|
| R1 | **complete** | 6 子代理交付；AUTO 1–15 全绿（9/9 tests） |
| R2 | pending | 文案抽检、平衡微调、MANUAL §21–25 |
| R3 | pending | SOTA 终审、PR 合 main |

## R1 子代理回执
| 角色 | Agent | 交付 |
|------|-------|------|
| fable SOTA 审计 | [bc-19f82905-1caf-5b8c-bce8-917e8a20ec9e](bc-19f82905-1caf-5b8c-bce8-917e8a20ec9e) | `round1/fable-sota-gates.md`、ACCEPTANCE §21–25 |
| opus O1 事件 | [bc-25c71b64-3662-5d8c-8bc7-9775ab2244e2](bc-25c71b64-3662-5d8c-8bc7-9775ab2244e2) | 56 条 events、删 SCRIPT、SEED 镜像 |
| opus 出身 Saga | [bc-dc83ce53-e4b9-5791-81aa-81e0bf754022](bc-dc83ce53-e4b9-5791-81aa-81e0bf754022) | `origin-sagas.js` 10 链 |
| gpt-sol O1 测试 | [bc-38862c67-2304-5e00-8fc1-c18686ea09a6](bc-38862c67-2304-5e00-8fc1-c18686ea09a6) | `o1-events.test.js` |
| gpt-sol Saga 探针 | [bc-62fdad0f-fdc9-5bf6-a815-d48b491f3a1e](bc-62fdad0f-fdc9-5bf6-a815-d48b491f3a1e) | `origin-sagas.test.js`、`origin-saga-sim.test.js` |
| fable 架构 | [bc-be113d08-856a-5e07-909b-586d478f7865](bc-be113d08-856a-5e07-909b-586d478f7865) | `fable-o1-architecture.md`、`events-schema.json` |

## 验收快照（@ `5adc222`）
- `./scripts/run-fucheng-life-tests.sh` → **9 passed, 0 failed**
- story.json `events.length` = **56**；`originSagas` = **10**
- G-E7 SCRIPT 已删；SEED 与 story.json 逐字对齐
- MANUAL §21–25 尚未执行（R2 目标）

## 放行线
- **R1 AUTO**：✅ 已达成
- **R2+ MANUAL**：⏳ 待浏览器走 ACCEPTANCE §21–25
