# 《浮城人生》— 游戏 UI 开发任务

## Goal
基于 Word 剧情设定，打造一个**炫酷华丽**的现代都市人生模拟游戏界面（URBAN LIFE SIMULATOR）。

## 世界观关键词
- 架空现代中国都市平行社会，霓虹、潮汐、阶层、金钱温度
- 五层城市剖面：L1市井 → L2工薪 → L3上升通道 → L4资本名利 → L5暗流
- 七个时代 E1-E7（单位时代→当前时代）
- 九大承重柱：教育、公权力、资本、家庭、媒体、职场、房产、消费、科技
- 核心体验：高自由度人生，世界不围绕玩家运行

## UI 必须体现的气质
- **华丽**：霓虹渐变、玻璃拟态、粒子/光晕、精致 typography
- **都市**：天际线、地铁线、写字楼剪影、雨夜反光
- **阶层感**：五层城市视觉分层（颜色/ elevation 区分 L1-L5）
- **人生面板**：出身档案、金钱、技能、关系、时间线

## 建议核心界面（Round 1 至少落地）
1. **主菜单 / 入城登记** — 城市夜景 + 年代选择 E1-E7
2. **出身选择** — 寒门/中产/体制内/富商等卡片
3. **人生仪表盘** — 金钱、健康、人脉、声望、当前圈层
4. **城市地图** — 五层区域可点击（L1-L5）
5. **事件弹窗** — 都市叙事风格

## Tech Stack（推荐）
- 单页或多页 HTML5 + CSS3 + 原生 JS（或轻量框架）
- 路径：`games/fucheng-life/`
- 无需后端 MVP；Mock 数据驱动

## Branch
`agent/fucheng-life-ui`

## Output Convention
子代理首行：`Model slug: <actual-slug>`

## Round Status
| Round | Status |
|-------|--------|
| Round 1 | complete — 6/6 done |
| Round 2 | complete — 6/6 done |
| Round 3 | in_progress — 0/6 dispatched |

## Subagent Status (Round 1)
| Agent | Model | Status |
|-------|-------|--------|
| [fable-r1-ui-arch](bc-e1fcf7fb-cf9f-5787-8931-17c7bd1f6395) | fable | ✅ done → `67ea417` |
| [fable-r1-sota-ui](bc-23b25f5e-5910-5a77-ab2d-5b6465eb0f01) | fable | ✅ done → `08ccc8e` |
| [opus-r1-main-shell](bc-ed2ea4bd-4931-5c4e-ac56-be6c153e7c3d) | opus-fast | ✅ done → `d3f49ab` |
| [opus-r1-core-screens](bc-17288417-4671-5100-8d00-dd6d2a791b83) | opus-fast | ✅ done → `b5a191c` |
| [gpt-sol-r1-story-data](bc-70d30f4d-83ae-5ff5-b7fb-a4ab2d3dc8b4) | gpt-sol | ✅ done → `7ed14fb` |
| [gpt-sol-r1-effects](bc-0d1ab85e-b22e-5d1c-93e0-73224a65fe87) | gpt-sol | ✅ done → `bc1c247` |

## 源文档
完整设定见 `.agent_workspace/fucheng-life/STORY_EXTRACT.md`

## Round 1 简报
见 `.agent_workspace/fucheng-life/round1/ROUND1_CONCLUSION_BRIEF.md`

## Subagent Status (Round 2)
| Agent | Model | Status |
|-------|-------|--------|
| fable-r2-gap-matrix | fable | ✅ done → `a99f0ba` |
| fable-r2-overlay-spec | fable | ✅ done → `841c768` |
| opus-r2-visual-polish | opus-fast | ✅ done → `65b6d88` |
| opus-r2-event-overlay | opus-fast | ✅ done → `29db60d` |
| gpt-sol-r2-story-wire | gpt-sol | ✅ done → `78292ca` |
| gpt-sol-r2-effects-merge | gpt-sol | ✅ done → `ac75606` |

## Round 2 简报
见 `.agent_workspace/fucheng-life/round2/ROUND2_CONCLUSION_BRIEF.md`

## Subagent Status (Round 3)
| Agent | Model | Status |
|-------|-------|--------|
| fable-r3-sota-acceptance | fable | dispatched ☁️ |
| fable-r3-final-report | fable | dispatched ☁️ |
| opus-r3-p1-polish | opus-fast | dispatched ☁️ |
| opus-r3-o2-ledger | opus-fast | dispatched |
| gpt-sol-r3-test-harness | gpt-sol | dispatched |
| gpt-sol-r3-pages-readme | gpt-sol | dispatched |

Round 3 上下文：`.agent_workspace/fucheng-life/round3/ROUND3_CONTEXT.md`
