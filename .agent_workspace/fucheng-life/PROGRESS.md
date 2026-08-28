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
| Round 1 | in_progress |
| Round 2 | pending |
| Round 3 | pending |

## 源文档
完整设定见 `.agent_workspace/fucheng-life/STORY_EXTRACT.md`
