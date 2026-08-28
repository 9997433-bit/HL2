# 《浮城人生》Round 2 Gap Matrix — 架构/SOTA 审计 vs 实际实现

> Agent: fable-r2-gap-matrix · Branch: `agent/fucheng-life-ui`
> 审计基线：commit `a792057`（Round 1 收官提交）。**所有 file:line 证据均指向该提交的文件内容。**
> 对照标准：[`fable-ui-architecture.md`](../round1/fable-ui-architecture.md)（设计 SSOT）· [`fable-sota-ui-audit.md`](../round1/fable-sota-ui-audit.md) §5 P0/P1 清单 · [`ROUND1_CONCLUSION_BRIEF.md`](../round1/ROUND1_CONCLUSION_BRIEF.md)

## 0. 阅读须知

1. **在途工作**：撰写本文时，Round 2 兄弟代理正在同一工作区并行施工（工作树已出现未提交的 `css/fc-tokens.css`、`css/fc-ui.css`、`js/story-loader.js`、`js/fc-motion.js` 及多处屏幕改动）。本矩阵刻意以 **已提交的 Round 1 基线** 为准——它是各 fix 的验收原点；已有在途覆盖的项在表中以 ⏳ 标注，验收时以合入后的实际效果为准。
2. **对 Round 1 简报的一处修正**：简报把「卡片 stagger 入场」标为核心屏 ❌。实测基线上 era/origin/city-map 三屏的卡片**已有** index 步进的 `animation-delay` stagger（见 P0-5 证据）；真正缺的是 dashboard 日志的逐条节拍与全局 count-up。
3. Owner 缩写：`opus-vp` = opus-r2-visual-polish · `opus-ev` = opus-r2-event-overlay · `gpt-story` = gpt-sol-r2-story-wire · `gpt-fx` = gpt-sol-r2-effects-merge · `fable-spec` = fable-r2-overlay-spec。

---

## 1. P0 差距矩阵（SOTA 审计 §5 P0，8 项）

| # | P0 项 | 状态 | 证据（commit `a792057`） | 建议修复 | Owner |
|---|-------|------|--------------------------|----------|-------|
| P0-1 | 霓虹发光文字/描边（三层 text-shadow + 呼吸） | **partial** | 主入口 done：`css/main.css:433`（标题光晕）、`main.css:1177`；核心屏仅单层弱光：`css/screens.css:380`（页标题）、`screens.css:956/1152/1236`（tint 光）。`effects/effects.css:351` 的 `.neon-title`（含双伪元素灯管效果）**零引用** | 把 `.neon-title` 并入共享样式，应用到各屏 `<h1>` 与 `.fc-btn--primary`；遵守同屏常驻发光 ≤3（审计 P7） | gpt-fx（移植）+ opus-vp（应用） |
| P0-2 | 玻璃拟态面板 + elevation 三档 | **done**（值未归一） | 主入口 `main.css:37–41`（`--glass-bg`/`--glass-bg-strong` 两档 + blur 变量）、`main.css:876`（blur 26 模态档）；核心屏 `screens.css:443/671/875/915`（blur 14–18 多档） | 视觉不必重做；把散落的 rgba/blur 归一到架构 §3.5 的 `--fc-glass-1/2/3` 令牌 | gpt-fx ⏳ |
| P0-3 | 城市剖面/天际线多层视差 | **partial** | 主入口 done：`js/app.js:109/130/151`（每层 `parallax` 参数）、`app.js:651–652`（drift 应用）；核心屏为静态 CSS 层：`screens.css:185` `.fc-skyline`、`:135` `.fc-atmos`、`:240` `.fc-rain`，无任何位移 | 低成本补法：给 `.fc-skyline/.fc-atmos` 加 60s+ 级缓慢 `transform` 漂移或指针微视差；`prefers-reduced-motion` 停帧。非本轮硬门禁 | opus-vp（低优先） |
| P0-4 | 数字滚动 count-up（金钱/属性/年龄） | **missing** | `screens/dashboard.html:316` `$("sMoney").textContent = "¥" + fmt(run.money)` 直接赋值；唯一反馈是亮度闪 `fc-flash`（`dashboard.html:290–294`、`screens.css:982–989`）；effects 库亦无此工具 | rAF 插值 + `toLocaleString`，400–800ms ease-out；接到 `sMoney/sDebt` 与四围数值；reduced-motion 直落终值 | opus-vp ⏳（在途 `js/fc-motion.js` 已含实现） |
| P0-5 | 卡片/列表入场 stagger | **partial** | 已有：`screens/era-select.html:85`（`i*55ms`）、`origin-select.html:95`（`i*45ms`）、`city-map.html:159`（`i*70ms`）+ `screens.css:1424` `.fc-rise`。缺口：dashboard 日志 `renderLog()` 每 tick 全量重建 innerHTML（`dashboard.html:368`），`fc-logslide`（`screens.css:1016`）在**全部 24 条**上同时重播，无逐条节拍 | `renderLog` 改为只对新条目做插入动画（或给新条目单独 class），旧条目不重播；可选 typewriter | opus-vp |
| P0-6 | 按压/悬停微反馈（≤150ms） | **partial** | 主入口有 `main.css:714` `.mbtn:active`；核心屏 hover 完整（`screens.css:558` 按钮、`:713` 卡片、`:1226` 地图节点）但 `screens.css` **全文件无一处 `:active`** | 补 `.fc-btn:active, .fc-card:active, .fc-zone:active { transform: scale(.97) }`（与既有 hover transform 合并写） | opus-vp |
| P0-7 | 方向性界面转场（wipe / scale+blur） | **missing**（壳层仅出场雾化） | 主入口离场有 `app.js` `leaveTo()`→`body.is-leaving` 520ms（`main.css:1255–1270`）；核心屏之间为裸 `<a href>` 硬跳（如 `era-select.html:53` 下一步按钮）。全库无 `clip-path` 转场 | 共享 wipe overlay（clip-path 300ms）拦截屏间导航链接；落地页播入场半程。**注意**：`screens.css:1477` 的 reduced-motion 块把 transition 钳到 0.05ms——转场须走 animation 或 JS 分支，并在 reduce 下退 crossfade | opus-vp ⏳（在途 `fc-motion.js` 已含 WIPE_OUT/WIPE_IN） |
| P0-8 | 五层色变量体系贯穿 | **done**（hex 冲突 → §2） | `main.css:24–28`（`--tier-l1..l5`）；`screens.css:33–43`（`--l1..l5` + `-deep`）；`screens.css:1258–1262` `.tint-l*` 预设贯穿卡片/电梯/日志/地图；层徽章可见性已修（commit `3b8dba4`） | 功能已达标；只需按 §2 统一 hex 与命名 | gpt-fx ⏳ |

**P0 小结**：8 项中 2 done / 4 partial / 2 missing。缺口集中在「动」的部分（count-up、转场、按压反馈、日志节拍）——正是审计所说「华丽 70% 里的微动效节拍」。

---

## 2. P1 差距矩阵（SOTA 审计 §5 P1，7 项）

| # | P1 项 | 状态 | 证据（commit `a792057`） | 建议修复 | Owner |
|---|-------|------|--------------------------|----------|-------|
| P1-1 | 全屏粒子层（上浮光尘 + 景深） | **partial** | 主入口 canvas 引擎完整（`app.js:81–84` 画质分档 rain 55–250）；核心屏只有 CSS 渐变雨（`era-select.html:15`、`city-map.html:14`）；`effects/effects.js:88–115` `Mote` 粒子类未接入 | 仪表盘背景可选单 canvas ≤120 粒、隐藏页暂停（ROUND2_CONTEXT 已列为 optional） | gpt-fx（可选） |
| P1-2 | 扫描线 + 噪点罩层（≤0.04） | **partial** | 主入口 done：`index.html:19` + `main.css:143`（`:159/:1412` 有降级）；app.js 另有 canvas grain（`app.js:996`）。核心屏无。`effects.css:149` `.noise`、`:1413` `.layer-scanline` 可直接移植 | 核心屏加全局罩层：opacity ≤0.04、`pointer-events:none`、reduce 静止 | opus-vp ⏳（在途 `fc-motion.js` 已含） |
| P1-3 | 霓虹灯牌 flicker（随机单字闪烁） | **done** | 主入口标题 `main.css:452–470`（`title__word` 双伪元素动画，`is-calm` 可关）+ canvas 灯牌闪烁 `app.js:397/668/1015` | 核心屏刻意安静符合「霓虹沉默」与发光预算，**不补** | —（保持现状） |
| P1-4 | 3D 倾斜卡 + 高光扫过 | **missing** | 全库无 `perspective/rotateX/rotateY`（rg 零命中）；卡片 hover 现为 translateY 抬升 + 泛光（`screens.css:713`） | 指针跟随 ±6° 倾斜 + 伪元素高光扫过，仅出身卡；成本中等、非闭环必需，**可顺延 Round 3** | opus-vp（可选） |
| P1-5 | 金钱浮字 `+¥/-¥` 飞入 | **missing** | `tick()`（`dashboard.html:386–455`）结算后无浮字，仅 `fc-flash` 亮度 bump | tick 后生成绝对定位 delta 元素，向 `#sMoney` 飞行 600ms 后移除；色用 `--fc-up/--fc-down` | opus-ev（与 O1 结算面共用）或 opus-vp |
| P1-6 | 未解锁层磨砂锁 + 门槛字（玻璃天花板） | **partial** | `.fc-zone.is-locked` 仅 `opacity:.42 + cursor:not-allowed`（`screens.css:1247–1255`）+「· 未解锁」小字（`city-map.html:172`）；无磨砂、无锁括线、无门槛金额。详情面板有门槛数值（`city-map.html:215`）但锁定态本体不展示 | is-locked 加 `backdrop-filter: blur(8px)` 磨砂 + 锁形角标 + 门槛 caption（架构 §2 S3 要求「入场券：¥2,000,000」式文案；L5 用冷文案变体） | opus-vp |
| P1-7 | 换代/死亡全屏暗场仪式 | **missing** | 健康崩溃「透支」只是普通日志条目（`dashboard.html:437–449`）；无全屏暗场、无大字仪式 | 依赖 O1 遮罩基建：O1 落地后为 透支/破产/红线 提供全屏 ritual 变体（审计 P20 反模式 5：重大事件不可轻量化）。若 R2 排不下则明确顺延 R3 | opus-ev（O1 之后） |

**P1 小结**：7 项中 1 done / 3 partial / 3 missing。P1-3 不需要动；P1-4/P1-7 可带条件顺延。

---

## 3. 令牌重复审计（main.css vs screens.css vs effects.css）

三份 CSS 各自维护一套 `:root`，同一语义有 **3–5 个不同 hex**（story.json 又带第 4/5 套）。以下按语义列冲突，「推荐值」一律取架构文档 §3（Round 1 简报已裁定：*合并时以架构文档为准*）。

### 3.1 品牌 / 语义色冲突

| 语义 | 架构 §3（**推荐值**） | main.css | screens.css | effects.css | 其他来源 |
|------|----------------------|----------|-------------|-------------|----------|
| 主霓虹青 | `--fc-neon-cyan` **`#4FE3FF`** | `--neon-cyan: #3ff0ff`（:16） | `--neon-cyan: #35e0ff`（:27） | `--cyan: #58f6ff`（:6） | story.json E7 `#26D9FF` —— 同一品牌色 5 个值 |
| 副霓虹品红 | `--fc-neon-magenta` **`#FF4FA3`** | `--neon-magenta: #ff3fa4`（:18） | `--neon-rose: #ff4d7e`（:26） | —（最接近 `--danger: #ff5277`） | — |
| 金钱金 | `--fc-money` **`#FFD666`** | `--neon-gold: #ffc861`（:20） | `--neon-amber: #ffb547`（:25，仪表盘金钱 tint 即用它） | `--gold: #ffcb77`（:10） | — |
| 辅紫 | `--fc-l4-alt` **`#A06BFF`** | `--neon-violet: #a97bff`（:21） | `--neon-violet: #a56bff`（:28） | `--violet: #ae72ff`（:8） | — |
| 正向/收入 | `--fc-up` **`#3DE8A0`** | 无独立令牌 | `--ok: #3fd6a0`（:46） | — | — |
| 负向/危险 | `--fc-down` **`#FF5C5C`** | 无独立令牌 | `--bad: #ff4d6a`（:48） | `--danger: #ff5277`（:12） | — |
| 警示 | `--fc-warn` **`#FFA940`** | 无 | `--warn: #ffb547`（:47，与 amber 同值挪用） | — | — |
| 最深底色 | `--fc-bg-void` **`#07080F`** | `--ink-950: #03050c`（:9） | `--ink-900: #04060d`（:11） | `--page: #080b16`（:18） | — |
| 主文本 | `--fc-ink-100` **`#F2F4FF`** | `--text-hi: #f2f6ff`（:31） | `--text-hi: #f2f6ff`（:19） | `--ink: #effcff`（:3） | — |

### 3.2 五层城市色冲突（★ 核心令牌）

| 层 | 架构 §3.2（**推荐 primary**） | main.css `--tier-l*` | screens.css `--l*` | effects.js 硬编码（:243–249） | story.json `cityLayers[].color` |
|----|------------------------------|----------------------|--------------------|-------------------------------|----------------------------------|
| L1 | **`#FFB454`** | `#ffb347` | `#ffb347` | `#ffb35a` | `#F2B45F` |
| L2 | **`#8FA8C8`** | `#7d9ac0` | `#7fa8d4` | `#58f6ff` ⚠️ 直接用了青色 | `#6686A3` |
| L3 | **`#3BE8B0`** | `#34e0a1` | `#3fd6a0` | `#63ffb0` | `#43CFA7` |
| L4 | **`#F0C75E`**（金主、`#A06BFF` 紫辅） | `#c58bff` ⚠️ 以紫为主、金缺失 | `#e8c46a` + `--l4-alt #a56bff` ✅ 结构正确 | `#d7a0ff`（紫） | `#B474E8`（紫） |
| L5 | **`#E3255F`** | `#b3245e` | `#d0325c` | `#ff5277` | `#6E1F46` |

⚠️ 两个语义级错误优先修：**main.css 把 L4 做成纯紫**（架构规定金为主紫为辅——「资本名利 · 金紫夜宴」）；**effects.js 把 L2 写成霓虹青**（应为地铁蓝灰）。另外五层色四件套（`deep/glow/tint` + 层渐变）只有 screens.css 落了 `-deep` 一件，`glow/tint` 均缺。

### 3.3 时代色三套并存

架构 §3.3（E1 `#7E9E6B` … E7 `#4FE3FF`）、`js/screens.js` 内联 ERAS 的 `tint`（E1 `#c9a227` … E7 `#ffb547`）、`story.json eras[].color`（E1 `#6F8F7A` … E7 `#26D9FF`）互不一致，甚至 E7 在 screens.js 里是**琥珀色**而非品牌青。story.json 接线后 UI 将从数据读色 → **把 story.json `eras[].color` 改为架构 §3.3 值**即可一次收敛（screens.js 内联集删除后自然消失）。

### 3.4 命名与结构问题 + 收敛建议

1. 架构规定 `--fc-` 前缀；基线上三份 CSS **无一个** `--fc-*` 令牌，且同义异名（`--tier-l1` vs `--l1` vs JS 硬编码）。
2. **推荐做法**（与在途 `css/fc-tokens.css` 方向一致，已抽查其值与架构 §3 完全吻合，予以背书）：
   - 唯一 token 文件 `css/fc-tokens.css`，全量 `--fc-*` 架构值；
   - 旧名以别名保留一轮（`--neon-cyan: var(--fc-neon-cyan)` 等），main/screens/effects 三处 `:root` 冲突定义删除；
   - `effects.js:243–249` 的硬编码色改读 CSS 变量或统一常量表；
   - `story.json` 的 `eras[].color`、`cityLayers[].color` 改为架构值（数据即将成为 SSOT，颜色也应过一致性关）。
3. 玻璃档位、字体栈三处也各写了一遍（`main.css:50–55` / `screens.css:66–70` / `effects.css:19–21`），随 token 合并一次收编（字体栈以架构 §3.4 为准，effects 的 `Arial Narrow` display 栈弃用）。

---

## 4. 架构 vs 实现差距

### 4.1 SPA 路由 / ScreenManager（架构 §1.2）

- **要求**：单页应用、hash 路由（`#/splash…#/dashboard`）、`ScreenManager` 屏幕栈 + `OverlayStack`、ESC 先弹 overlay。
- **实际**：6 个独立 HTML 多页跳转（`<a href>`）；`app.js` 仅做入口级路由（`routes.json` fetch + HEAD 探测回退，`app.js:1355–1400`）。无 overlay 栈。
- **裁定**：ROUND2_CONTEXT 已把 SPA 重构列为 non-goal → **接受偏差**。Round 2 以「wipe 转场 + localStorage 状态延续」模拟连续感；O1/O2 以页内组件实现，不做全局 OverlayStack。Round 3 再评估重构成本。
- 附带偏差：架构 §7.1 的文件结构（`tokens.css/base.css/components.css/screen-manager.js/store.js`）未采用，现为扁平 `main.css + screens.css`。可接受，但 `fc-tokens.css` 必须落地（见 §3）。

### 4.2 覆盖层 O1–O4

| 覆盖层 | 架构要求 | 基线状态 | Round 2 处置 |
|--------|----------|----------|--------------|
| O1 事件弹窗 | glass-3 遮罩 + 层色 vignette + 2–4 选项卡 + 结算翻面 + 红线 3s 冷静期（§2 O1、O-4） | **missing** — 事件在 `tick()` 内自动结算、直接进日志（`dashboard.html:392–434`），玩家无选择权。这是**玩法层最大缺口** | opus-ev 实现点击版 MVP（fable-spec 出 DOM/CSS/JS 规格先行）；数据依赖见 §4.3 ③ |
| O2 账单抽屉 | 每月结算底部抽屉、逐行划账、「账单比闹钟准时。」锚点（O-5） | **missing** — 账单是静态侧栏面板（`dashboard.html:111–118`），锚点文案在（`:117`）但无抽屉无划账动画 | 简版：tick 后可展开的结算抽屉 + 逐行 90ms 入账（Round 1 简报 P1-9） |
| O3 人情账本 | Round 1 至少占位骨架（§2） | **missing** — 连占位都没有，`fc-relation-node` 零实现 | R2 仅 fable-spec 留接口定义，不实现 |
| O4 设置 | 音量/动效强度/重开二次确认 | **partial** — 主入口有完整设置模态（`app.js` `initSettings`、`index.html #settingsModal`，含雨幕/泛光/画质/平静模式）；核心屏**无入口**；架构的 `.fc-perf-lite` 全局类未实现（主入口用 `body.is-calm` 私有机制，核心屏零降档） | 低成本：核心屏顶栏加设置入口或至少尊重主入口写入的 `fucheng-life.settings.v1`；`perf-lite` 语义并入 token/工具类合并 |

### 4.3 story.json 接线

1. **基线零引用**：`js/screens.js:10/98` 内联 ERAS/ORIGINS；`dashboard.html:210` 内联 17 条事件 POOL；`city-map.html:76` 内联 STRATA（23 节点）。story.json（7 时代/10 出身/5 层/EV01–EV10/uiCopy）纯静态资产。⏳ 在途 `js/story-loader.js` 正在解决（已抽查：normalize + `file://` 回退设计正确）。
2. **schema 漂移**：story.json 字段名与屏幕消费字段不同（`yearLabel/tagline/color/statModifiers/startMoney/uiStats` vs 屏幕的 `years/line/tint/mods/start`），loader 必须做映射层——**不要**反过来改十处消费点。
3. **⚠️ 事件数据契约缺口（阻塞 O1）**：架构 §7.2 要求 `events[].choices[]{text, cost, result{deltas}}`；实际 `sampleEvents` 只有 `{id,title,layerId,category,text}`——**没有 choices、没有 deltas**。O1 弹窗无法直接消费 story.json。需 gpt-story 扩展 sampleEvents schema（或新增 `events[]` 键），选项/代价数值可参考 dashboard POOL 的 `d:{}` 平衡值；fable-spec 的 O1 规格须同步锁定该 schema。
4. **存档键漂移**（小）：架构 `fc.save.v1` vs 实现 `fucheng.save.v1`（`screens.js:7`；`app.js:49` 探测 `['fucheng.save.v1','fucheng-life.save.v1']`）。实现侧已一致可用，**建议以实现为准**、架构文档加勘误附注，不要改键名破坏现有存档。

### 4.4 effects 集成

- `effects/` 仍是孤岛：`demo.html` 专用 DOM 钩子（`#city-rain`、`[data-layer-console]`，`effects.js:5/237`）；`.neon-title/.glass-panel/.noise/.layer-scanline` 无任何屏幕引用；第三套令牌（§3）。
- 可回收资产：`applyLayer()` 层级转场（`effects.js:264–317`，含 reduce 分支与队列）可改造为换层/入城转场回调；`Mote/RainDrop` 粒子类可直接喂仪表盘背景 canvas。
- ⏳ 在途 `fc-tokens.css` + `fc-ui.css` 正在执行合并，方向正确。

### 4.5 其他契约偏差（低阻塞，记录在案）

- HUD 金钱警示呼吸红光（架构 §2 S4「氧气不足」规则：现金 < 下月固定支出时）未实现——现只有健康条与收支比变红（`dashboard.html:324–325/344`）。
- 架构动效时长令牌（`--fc-t-fast/base/slow/cine`）未落地，各处硬编码 0.5s/0.66s/0.7s；随 token 合并顺手收编。
- `screens.css:1477` 的 reduced-motion 全局钳制（0.05ms）会连带杀死未来基于 transition 的转场——新动效实现须自带 reduce 分支（fc-motion.js 已考虑）。

---

## 5. Round 2 修复清单（优先级排序，≤15 项）

> 排序原则：数据/令牌地基 → 玩法闭环（O1）→ P0 微动效 → P1 加分。⏳ = 在途已有实现，验收即可。

| 序 | 项 | 对应缺口 | Owner | 状态 |
|----|-----|----------|-------|------|
| 1 | `fc-tokens.css` 落地为唯一令牌源（架构 §3 值 + 旧名别名），删三处 `:root` 冲突定义，修 main.css L4 紫→金、effects.js L2 青→蓝灰 | §3 全部 | gpt-fx | ⏳ |
| 2 | story.json 单一数据源：`story-loader.js` + era/origin/dashboard/map 改接，删 screens.js 内联 ERAS/ORIGINS，`file://` 回退可用 | §4.3 ①② | gpt-story | ⏳ |
| 3 | story.json 事件 schema 扩展：`sampleEvents` 补 `choices[]{text, cost, result{text, deltas}}`（架构 §7.2），色值同步架构 §3.2/3.3 | §4.3 ③、§3.3 | gpt-story + fable-spec | 未开始 |
| 4 | O1 事件弹窗 MVP：glass-3 遮罩 + 层色 vignette + 点击版选项卡 + 后果预览点；dashboard `tick()` 加权触发，替换「自动结算进日志」 | §4.2 O1 | opus-ev（fable-spec 规格先行） | 未开始 |
| 5 | 金钱/属性 count-up（rAF 400–800ms，reduce 直落） | P0-4 | opus-vp | ⏳ |
| 6 | 屏间 wipe 转场（clip-path 300ms，落地页入场半程，reduce 退 crossfade） | P0-7 | opus-vp | ⏳ |
| 7 | 全局按压反馈：`.fc-btn/.fc-card/.fc-zone:active { scale(.97) }` | P0-6 | opus-vp | 未开始 |
| 8 | 核心屏扫描线+噪点罩层（opacity ≤0.04、pointer-events:none） | P1-2 | opus-vp | ⏳ |
| 9 | dashboard 日志增量渲染：仅新条目播 `fc-logslide`，全量重播 bug 修复 | P0-5 残留 | opus-vp | 未开始 |
| 10 | 金钱浮字 `+¥/-¥` 飞入（tick 与 O1 结算共用） | P1-5 | opus-ev | 未开始 |
| 11 | O2 简版：tick 后账单结算抽屉 + 逐行 90ms 划账 | §4.2 O2 | opus-ev（fable-spec 规格） | 未开始 |
| 12 | 地图未解锁层磨砂锁 + 门槛文案（玻璃天花板可视化） | P1-6 | opus-vp | 未开始 |
| 13 | `.neon-title` / glass 工具类从 effects 移植进共享 CSS 并应用到屏标题与主 CTA | P0-1 | gpt-fx | ⏳（`fc-ui.css` 在途） |
| 14 | HUD 金钱警示态：现金 < 下月账单 → 呼吸红光（「氧气不足」） | §4.5 | opus-vp 或 opus-ev | 未开始 |
| 15 | `prefers-reduced-motion` 全路径复测（转场/count-up/罩层/O1 全部有 reduce 分支；`screens.css:1477` 钳制与新动效的相互作用） | 验收门禁 | 全体（收官时统测） | 未开始 |

**明确不做（维持 Round 1 简报裁定）**：SPA/ScreenManager 重构、WebAudio 默认开启、拖拽倾斜事件卡（P1-4 3D 倾斜与 P1-7 全屏仪式如 R2 排不下顺延 R3）。

---

*fable-r2-gap-matrix · Round 2 · 《浮城人生》URBAN LIFE SIMULATOR*
