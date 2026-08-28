# Round 1 结论简报 — 《浮城人生》UI

> 汇总时间：2026-08-28 · 分支：`agent/fucheng-life-ui` · Round 1 **6/6 完成**

---

## 1. 执行摘要

Round 1 完成了「骨架 + 皮肤初稿 + 可复用特效库 + 叙事数据」四块基线：

| 维度 | 状态 | 说明 |
|------|------|------|
| 设计 SSOT | ✅ | [`fable-ui-architecture.md`](fable-ui-architecture.md) — 屏幕流 S0–S4 + 覆盖层 O1–O4、设计令牌、24 组件库 |
| SOTA 参照 | ✅ | [`fable-sota-ui-audit.md`](fable-sota-ui-audit.md) — P0/P1/P2 特效清单 + 24 参考模式 |
| 可玩界面 | ✅ | 主入口 + 4 核心屏（年代/出身/仪表盘/城市地图）可在浏览器打开 |
| 特效探针 | ✅ | [`effects/demo.html`](../../../games/fucheng-life/effects/demo.html) — 霓虹/玻璃/粒子/层级转场，12/12 探针通过 |
| 叙事数据 | ✅ | [`data/story.json`](../../../games/fucheng-life/data/story.json) — 7 时代、10 出身、5 层、10 样例事件 |
| 数据接线 | ❌ | `screens.js` 仍用内联 ERAS/ORIGINS，**未 fetch story.json** |
| 特效集成 | ❌ | `effects/` 与主游戏/核心屏**未合并**，令牌 duplicated |
| 覆盖层 | ❌ | O1 事件弹窗、O2 账单抽屉、O3 人情账本**未实现** |
| SPA 路由 | ❌ | 架构要求 hash SPA + ScreenManager；实际为**多页 HTML** |
| P0 验收 | ⚠️ 部分 | 主入口夜景强；核心屏缺 count-up、stagger、wipe 转场、扫描线等 |

**Round 2 主题：集成与华丽化** — 把 Round 1 分散产出焊成一条可演示的「入城→选出身→地图→推进一月→事件打断」闭环，并补齐 SOTA 审计 P0/P1 缺口。

---

## 2. 各子代理交付与评价

### 2.1 [fable UI 架构](bc-e1fcf7fb-cf9f-5787-8931-17c7bd1f6395) → `67ea417`

**产出**：完整 IA、五层色板、组件命名（`fc-*`）、动效系统、存档契约 `fc.save.v1`。

**价值**：后续所有 UI 工作的裁决标准；L1–L5 / E1–E7 令牌可直接映射 CSS。

**缺口**：实现侧未采用 SPA/hash 路由；组件库仅部分落地为 ad-hoc class。

### 2.2 [fable SOTA 审计](bc-23b25f5e-5910-5a77-ab2d-5b6465eb0f01) → `08ccc8e`

**产出**：「骨架取文字人生模拟、皮肤取都市霓虹 SOTA」策略；P0 八项、P1 七项清单。

**关键结论**：
- 华丽 70% = 分层纵深 + 光语义化 + 微动效节拍
- 发光预算：同屏持续发光 ≤3 处
- 重大事件必须全屏仪式化，不可 BitLife 式轻弹窗

**Round 2 必做 P0 缺口**（相对当前实现）：

| P0 项 | 主入口 | 核心屏 |
|-------|--------|--------|
| 霓虹发光标题/CTA | ✅ | 部分 |
| 玻璃拟态三档 elevation | ✅ | ✅ |
| 天际线视差 | ✅ canvas | 静态 CSS 层 |
| 数字 count-up | ❌ | ❌ |
| 卡片 stagger 入场 | ❌ | ❌ |
| 按压/悬停微反馈 | ✅ | 部分 |
| 方向性 wipe 转场 | ❌ 页间硬跳 | ❌ |
| 五层色变量贯穿 | ✅ | ✅ 已修 layer badge |

### 2.3 [gpt-sol 剧情数据](bc-70d30f4d-83ae-5ff5-b7fb-a4ab2d3dc8b4) → `7ed14fb`

**产出**：`story.json` — 稳定 ID、出身五维 modifier、样例事件 EV01–EV10、uiCopy。

**缺口**：零运行时引用；`screens.js` 重复维护一套更丰富的 inline 数据 → **Round 2 必须单一数据源**。

### 2.4 [gpt-sol 动效探针](bc-0d1ab85e-b22e-5d1c-93e0-73224a65fe87) → `bc1c247`

**产出**：零依赖画廊 — `.neon-title`、`.glass-panel`、Canvas 粒子雨、L1–L5 `applyLayer()` 转场。

**集成指引**（探针报告原文）：
1. 合并 `effects.css` `:root` token 到 `main.css` / `screens.css`
2. Canvas 依赖 `#city-rain` + 可选 `[data-particle-count]`
3. 层级转场以 `[data-layer-console]` 为边界，可替换为路由回调

### 2.5 [opus 主界面壳](bc-ed2ea4bd-4931-5c4e-ac56-be6c153e7c3d) → `d3f49ab`

**产出**：`index.html` + `app.js` 程序化夜景引擎（三层视差天际线、霓虹灯牌、雨、倒影、画质自适应）、设置模态、`FuchengShell` API、`routes.json` 路由表。

**亮点**：无位图素材；180 帧帧时自动降档；存档检测解锁「继续人生」。

### 2.6 [opus 核心界面](bc-17288417-4671-5100-8d00-dd6d2a791b83) → `b5a191c`

**产出**：`screens/*.html` + `screens.css` + `screens.js`（localStorage `fucheng.save.v1`）。

**亮点**：四屏完整、390px 无溢出、经济模拟 rebalance（账单吃 60–80% 工资）。

**已修 bug**：layer badge `currentColor` 暗底不可见；六 month 暴富失控。

**缺口**：无事件弹窗；日志 inline 追加无 typewriter；city-map 23 节点无与 story.json 联动。

---

## 3. 当前文件地图

```
games/fucheng-life/
├── index.html          # S0 级主入口（夜景+菜单）— 非架构 S0 Splash
├── css/main.css        # 主入口令牌
├── js/app.js           # 夜景引擎 + FuchengShell
├── routes.json         # new-game → era-select, continue → dashboard
├── screens/
│   ├── era-select.html
│   ├── origin-select.html
│   ├── dashboard.html  # 含简易 tick 模拟 + 事件日志
│   ├── city-map.html
│   └── index.html      # 屏hub
├── css/screens.css
├── js/screens.js       # ⚠️ inline 数据，未读 story.json
├── effects/            # ⚠️ 孤立画廊
└── data/story.json     # ⚠️ 未接线
```

---

## 4. Round 2 靶向目标（优先级）

### P0 — 必须完成

1. **story.json 单一数据源**：screens 全部改 fetch/load，删除重复 inline 集合（可保留 runtime 模拟 state）
2. **effects 令牌与组件合并**：至少 neon-title、glass 三档、扫描线罩层、count-up 工具函数进入 `screens.css`/`screens.js` 或共享 `js/fc-ui.js`
3. **O1 事件弹窗 MVP**：Reigns 式卡片（点击版即可）+ 后果预览点；dashboard tick 随机触发 `story.json` sampleEvents
4. **页间转场**：era→origin→map 至少 wipe/clip-path 300ms（可 CSS 全页 overlay，不必 SPA）
5. **P0 微动效补齐**：金钱/属性 count-up；出身卡/日志 stagger；全局 `:active scale(.97)`

### P1 — 显著加分

6. 扫描线 + 噪点全局罩层（opacity ≤0.04）
7. 金钱浮字 `+¥/-¥` 飞入
8. 地图未解锁层磨砂锁 + 门槛字
9. 仪表盘 tick 后 bill 结算抽屉（O2 简版）
10. `prefers-reduced-motion` 全路径复测

### 明确不做（Round 3）

- 完整 SPA ScreenManager + hash 路由重构（除非 Round 2 opus 评估成本低）
- WebAudio 环境音默认开启
- 拖拽倾斜事件卡（可 P1 简版点击）

---

## 5. Round 2 子代理分工

| ID | Model | 任务 |
|----|-------|------|
| fable-r2-gap-matrix | fable | 对照架构+SOTA 输出 Gap Matrix CSV/markdown，标注每项负责文件 |
| fable-r2-overlay-spec | fable | O1/O2 覆盖层 HTML/CSS/JS 规格 + 接入点 |
| opus-r2-visual-polish | opus-fast | P0 微动效 + 转场 + 扫描线，改 screens.css/js |
| opus-r2-event-overlay | opus-fast | 实现 O1 事件卡 + dashboard 触发逻辑 |
| gpt-sol-r2-story-wire | gpt-sol | story.json loader + screens 改接 |
| gpt-sol-r2-effects-merge | gpt-sol | effects→主游戏 CSS/JS 合并 + 共享 fc-ui 模块 |

**分支**：`agent/fucheng-life-ui` · 提交并 push · 首行 `Model slug: …`

**必读**：本文 + [`round2/ROUND2_CONTEXT.md`](../round2/ROUND2_CONTEXT.md) + [`STORY_EXTRACT.md`](../STORY_EXTRACT.md)

---

## 6. Round 2 验收门禁（预览）

- [ ] `python3 -m http.server` 打开完整流程：主菜单 → 新游戏 → 年代 → 出身 → 地图 → 仪表盘
- [ ] 仪表盘推进月份 ≥3 次可触发 ≥1 次事件弹窗
- [ ] 金钱变动有 count-up 动画
- [ ] story.json 为 era/origin/event 唯一文案源
- [ ] 390px 宽无横向溢出；Chrome 无 console error
- [ ] `prefers-reduced-motion` 降级可用

---

## 7. 设计令牌速查（统一用此，勿另起炉灶）

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--ink-950` | `#07080F` | 虚空背景 |
| `--neon-cyan` | `#4FE3FF` / `#3ff0ff` | 品牌强调（需统一为一个） |
| `--neon-magenta` | `#FF4FA3` | -secondary |
| `--neon-gold` | `#FFD666` | 金钱 |
| `--tier-l1…l5` | 暖琥珀→深红 | 五层城市 |

**令牌冲突**：`main.css` 与 `effects.css` 存在细微 hex 差异 — Round 2 合并时以架构文档 `#4FE3FF` 为准。
