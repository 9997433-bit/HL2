# 《浮城人生》UI/UX 架构设计 — Round 1

> Agent: fable-r1-ui-arch · Branch: `agent/fucheng-life-ui`
> 依据: `STORY_EXTRACT.md` · `PROGRESS.md` · `round1/ROUND1_CONTEXT.md`
> 实现路径: `games/fucheng-life/` · 本文是设计系统与屏幕架构的单一事实来源（SSOT）

---

## 0. 定位与设计原则

《浮城人生》是一个「现代都市高自由度人生引擎」。UI 的任务不是让玩家觉得自己是主角，
而是让玩家感到：**城市照常运转，你只是千万进程里的一个节点**。

五条设计原则（所有屏幕与组件的裁决标准）：

| # | 原则 | 落地含义 |
|---|------|----------|
| P1 | 城市是背景，也是主角 | 每个屏幕都有城市存在感：天际线剪影、雨幕、霓虹反光常驻底层，UI 浮在城市之上 |
| P2 | 钱是氧气 | 金钱数字永远可见（HUD 常驻）、使用等宽数字、变动必有动效与颜色语义 |
| P3 | 阶层用颜色说话 | L1–L5 五层各有专属色板；玩家当前圈层的颜色渗透进 HUD、地图、事件卡 |
| P4 | 玻璃与霓虹，但克制 | 玻璃拟态承载信息、霓虹只做强调；同屏 backdrop-filter ≤ 3 层，避免「赛博堆料」 |
| P5 | 文案冷静、诗意、现实主义 | 短句有力，避免爽文腔；serif 承载叙事，sans 承载操作，mono 承载数字 |

---

## 1. 信息架构与屏幕流

### 1.1 主流程（Screen Flow）

```
S0 Splash 启动屏
   │  (有存档 → 「继续人生」直达 S4)
   ▼
S1 Era Select 入城登记（E1–E7 年代选择）
   ▼
S2 Origin Select 出身选择（10 种出身）
   ▼
S3 City Map 城市剖面（L1–L5，首次入城落点）
   ▲▼ (双向切换，底部导航)
S4 Life Dashboard 人生仪表盘（回合推进主界面）
   │
   ├─ O1 Event Modal 事件弹窗（叙事中断，可在 S3/S4 任意触发）
   ├─ O2 Ledger Sheet 账单日底部抽屉（每月固定结算）
   ├─ O3 Relations 人情账本（全屏覆盖）
   └─ O4 Settings 设置（覆盖层）
```

- **S 前缀 = 屏幕（screen）**：互斥，同一时刻只有一个活跃屏幕。
- **O 前缀 = 覆盖层（overlay）**：压在活跃屏幕之上，走独立的 overlay 栈。
- 事件（O1）是「中断」而不是屏幕：世界不等玩家，事件砸到玩家头上。

### 1.2 状态机与路由

单页应用（SPA），hash 路由 + 屏幕栈管理器 `ScreenManager`：

| 路由 | 屏幕 | 进入条件 | 退出去向 |
|------|------|----------|----------|
| `#/splash` | S0 | 应用启动 | 无存档→`#/era`；有存档→`#/dashboard` |
| `#/era` | S1 | 新开局 | 选定年代 → `#/origin` |
| `#/origin` | S2 | 已选年代 | 确认出身 → `#/map`（入城动画） |
| `#/map` | S3 | 已建档 | 底部导航 ↔ `#/dashboard` |
| `#/dashboard` | S4 | 已建档 | 底部导航 ↔ `#/map` |

Overlay 不占路由，由 `OverlayStack.push('event', payload)` 管理；
返回键 / ESC 先弹 overlay 栈，栈空才切屏幕。
存档写 `localStorage`，键名 `fc.save.v1`，字段见 §7.3。

### 1.3 每屏一句话使命

| 屏幕 | 使命 | 情绪 |
|------|------|------|
| S0 Splash | 3 秒内建立「雨夜浮城」世界观 | 沉默、潮湿 |
| S1 入城登记 | 选年代 = 选时代红利与陷阱 | 郑重、像办手续 |
| S2 出身选择 | 起点不平等，摊开来看 | 冷静、不煽情 |
| S3 城市剖面 | 五层城市一眼看穿，阶层可视 | 敬畏、垂直感 |
| S4 人生仪表盘 | 我现在是谁、还剩多少氧气 | 掌控中的紧绷 |
| O1 事件 | 城市来敲门，选择有价格 | 压迫或机遇 |

---

## 2. 屏幕规格（Screen Specs）

### S0 · Splash 启动屏

**布局解剖**（自下而上的层）
1. 底层：三层天际线剪影视差（远 CBD / 中写字楼 / 近城中村灯牌），`transform` 缓慢横移
2. 雨幕 canvas（由 effects 代理实现，见 §8 性能预算）
3. 地面霓虹反光条（渐变 + blur）
4. 中央：游戏 Logo「浮城人生」（serif，`--fc-neon-cyan` 下缘光晕）+ 英文副标 `URBAN LIFE SIMULATOR`（micro 字号，字距 0.3em）
5. 底部：加载条样式为**地铁线路图**（一条水平线 + 站点圆点逐个点亮）
6. 加载完成后：轮播一句冷文案（如「账单比闹钟准时。」），提示「轻触入城」

**行为**：资源就绪后可点击任意处继续；有存档时出现「继续人生 / 重新入城」双按钮。
**动效**：Logo 霓虹 flicker 一次（入场 640ms），之后静止——霓虹沉默。

### S1 · Era Select 入城登记（E1–E7）

**布局**：全屏背景随年代切换色调（era hue 渐变叠加在城市剪影上）；
标题「入城登记」；水平 snap 滚动的 7 张 **EraCard**（`scroll-snap-type: x mandatory`）。

**EraCard 内容**：年代编号（E1–E7，mono 大字）、名称、年份区间、一行意象文案、
「时代红利 / 时代暗礁」各一条（chip 形式）。当前聚焦卡放大 1.06、获得 era hue 描边光。

**CTA**：底部主按钮「在此年代入城」；副链接「时代年表」（可后置到 Round 2）。
**过场**：确认后背景色收敛为该年代 hue，闸机式左右开门 wipe 进入 S2。

### S2 · Origin Select 出身选择

**布局**：标题「出身不由你选——这次除外」；2 列卡片栅格（移动端），10 张 **OriginCard**：
普通工薪 / 中产 / 体制内 / 农村进城 / 城中村 / 富商 / 寒门 / 重组家庭 / 孤儿 / 跨国家庭。

**OriginCard 内容**：出身名（title 字级）、一句冷静旁白（body，serif italic 感）、
三条起始迷你条：**家底 / 人脉 / 教育**（`fc-stat-bar` 微缩版）、初始圈层 chip（L1–L4 色）。

**交互**：点选卡片 → 卡片展开为半屏详情（起始资金 mono 数字、隐性特质、开局落点层）；
底部「确认出身」+「掷骰随机」（骰子 icon，随机出身是命运感的重要入口）。
**过场**：确认后播放「入城动画」：镜头从天际线坠向该出身对应的城市层，进入 S3。

### S3 · City Map 城市剖面（L1–L5）

核心创意：**不是俯视地图，是城市垂直剖面**。阶层即海拔。

**垂直排布（自上而下）**：
```
┌──────────────────────────┐
│ L4 资本名利   金紫 · 天际线玻璃幕墙  │  ← 顶层
│ L3 上升通道   青绿 · 学校/考场/校招  │
│ L2 工薪层     蓝灰 · 地铁/写字楼    │
│ L1 市井层     暖黄 · 城中村/早市    │  ← 街面
├══════════ 地平线 ══════════┤
│ L5 暗流       深红紫黑 · 地下      │  ← 地下层
└──────────────────────────┘
```

**LayerBand（层带）**：每层是一条可点击横带，含层名、层号 mono 编号、剪影插画背景、
2–4 个 POI 圆点（地点：如 L1 的「早市」「外卖站」）。玩家当前位置有呼吸光标记。

**锁定态**：未解锁层显示磨砂玻璃 + 门槛文案（如 L4：「入场券：可支配资产 ¥2,000,000」），
L5 的锁定文案更冷（「这扇门不收钱，收把柄。」）。

**交互**：点层带 → 层内 POI 行动面板（底部抽屉）；纵向滚动带轻视差；
HUD 常驻顶部，底部导航「剖面 / 仪表盘」双 tab。

### S4 · Life Dashboard 人生仪表盘

**布局（移动端单列，自上而下）**：
1. **HUD**（常驻，见组件 §5 O-1）：金钱 · 年月 · 当前圈层 chip · 菜单
2. **身份卡**（glass-1）：姓名/年龄/出身 chip/年代 chip/当前身份（如「合租房 · 文员」）
3. **四围 StatCluster**：金钱（净资产+现金流）/ 健康 / 人脉 / 声望，各带迷你趋势 sparkline
4. **收支速览**：本月固定支出 vs 收入，账单日倒计时（「距账单日 6 天」红字倒数）
5. **技能刻度**：横向滚动的技能条（学历、专业技能、灰色技能）
6. **人生时间线**：横向节点（年度大事），点开回看
7. **主行动按钮**：「推进一月 ▸」（全宽，primary neon）——推进即结算，可能触发 O1/O2

**规则**：金钱变动一律 mono 数字滚动 + 色语义（收入 `--fc-up` / 支出 `--fc-down`）；
当现金 < 下月固定支出时，HUD 金钱数字进入警示态（呼吸红光）——「氧气不足」。

### O1 · Event Modal 事件弹窗

**解剖**：
1. 遮罩：`glass-3` 全屏 + 该事件所属层的色晕（vignette 渗透，L5 事件红黑压迫感最强）
2. 事件卡（居中，max-width 560px）：
   - 场景 chip（层色，如 `L2 · 地铁早高峰`）+ 事件类型角标（机遇 / 账单 / 关系 / 红线）
   - 标题（serif，title-lg）
   - 正文（body-lg，行长 ≤ 22 字，冷静叙述）
   - 2–4 个 **EventChoice**：选项文案 + 代价标注（`-¥3,000` / `人情 -1` / `风险 ▲`）
3. 结算态：选择后卡片翻转为结果面——结果文案 + 属性 delta 逐条 tick 入账

**红线事件特例**：类型为「红线」时按钮全部为 danger/ghost 变体，出现 3 秒不可点冷静期
（防误触，也是叙事节奏——有些决定需要三秒）。

### O2 · Ledger Sheet 账单日抽屉

每月结算强制弹出的底部抽屉（glass-2）：逐行列出房租、通勤、饮食、债务利息……
每行 `fc-ledger-row`，右对齐 mono 金额；总计行大号数字；扣款动画自上而下逐行划账。
文案锚点：「账单比闹钟准时。」固定出现在抽屉标题下方 caption。

### O3 · Relations 人情账本 / O4 · Settings

Round 1 仅出占位骨架：O3 为全屏覆盖列表（`fc-relation-node`：人名、关系、欠/被欠人情值）；
O4 为标准设置组（音量、动效强度「完整/精简」、重开人生——二次确认用红线事件样式）。

---

## 3. 设计令牌（Design Tokens）

全部以 CSS 自定义属性交付，前缀 `--fc-`，落地文件 `games/fucheng-life/css/tokens.css`。

### 3.1 全局基色（夜之城底盘）

| Token | 值 | 用途 |
|-------|-----|------|
| `--fc-bg-void` | `#07080F` | 最深底色（splash、L5 深处） |
| `--fc-bg-city` | `#0B0E1A` | 主背景（深夜蓝黑） |
| `--fc-bg-raised` | `#121629` | 抬升面板底 / 玻璃回退色 |
| `--fc-ink-100` | `#F2F4FF` | 主文本 |
| `--fc-ink-70` | `rgba(242,244,255,.72)` | 次要文本 |
| `--fc-ink-45` | `rgba(242,244,255,.45)` | 弱化文本 / 占位 |
| `--fc-neon-cyan` | `#4FE3FF` | 主霓虹（品牌 / 主 CTA / E7） |
| `--fc-neon-magenta` | `#FF4FA3` | 副霓虹（招牌粉，点缀用） |
| `--fc-money` | `#FFD666` | 金钱数字专用暖金 |
| `--fc-up` | `#3DE8A0` | 收入 / 正向 delta |
| `--fc-down` | `#FF5C5C` | 支出 / 负向 delta / 危险 |
| `--fc-warn` | `#FFA940` | 警示（账单倒计时等） |

### 3.2 五层城市色板（L1–L5）★ 核心令牌

每层四件套：`primary`（主色）/ `deep`(深锚) / `glow`(光晕) / `tint`(表面着色) + 一条层渐变。

| 层 | 名称 · 意象 | primary | deep | glow | tint | 层渐变（180deg） |
|----|-------------|---------|------|------|------|------------------|
| **L1** | 市井层 · 城中村暖黄灯 | `#FFB454` | `#C77B2E` | `rgba(255,180,84,.45)` | `rgba(255,180,84,.08)` | `#2B1B0E → #0B0E1A` |
| **L2** | 工薪层 · 地铁蓝灰 | `#8FA8C8` | `#4C6076` | `rgba(143,168,200,.35)` | `rgba(143,168,200,.08)` | `#16202E → #0B0E1A` |
| **L3** | 上升通道 · 青绿希望 | `#3BE8B0` | `#12805F` | `rgba(59,232,176,.40)` | `rgba(59,232,176,.08)` | `#0E2A22 → #0B0E1A` |
| **L4** | 资本名利 · 金紫夜宴 | `#F0C75E` | `#8A6620` | `rgba(240,199,94,.45)` | `rgba(240,199,94,.08)` | `#251536 → #0B0E1A` |
| **L4b** | （辅）名利之紫 | `#A06BFF` | `#5B36A8` | `rgba(160,107,255,.40)` | `rgba(160,107,255,.08)` | —（与 L4 金搭配使用） |
| **L5** | 暗流 · 深红紫黑 | `#E3255F` | `#6E1030` | `rgba(227,37,95,.40)` | `rgba(227,37,95,.08)` | `#2A0716 → #050308` |

命名规范：`--fc-l1-primary`、`--fc-l1-glow`……；L4 双色：金为主 `--fc-l4-primary`，
紫为辅 `--fc-l4-alt`（用于 L4 渐变的第二停靠点与会所类 POI）。

**使用规则**
- 层色只用于：层带背景、层 chip、该层事件的场景标注与遮罩 vignette、HUD 圈层指示。
- 正文永远用 ink 系，**不用层色写正文**（保证对比度与冷静感）。
- 同屏最多出现 2 个层色系（当前层 + 目标层），避免彩虹化。

### 3.3 七时代色相（E1–E7，用于 EraCard 与 S1 背景调色）

| 时代 | 名称 | hue | 意象 |
|------|------|-----|------|
| E1 | 单位时代 | `#7E9E6B` | 军绿搪瓷、单位大院 |
| E2 | 下海 | `#FF7A45` | 港风橙红、录像厅霓虹 |
| E3 | 地产 | `#E8B93E` | 塔吊黄、混凝土 |
| E4 | 互联网 | `#3E8EF7` | 电光蓝、网吧屏幕 |
| E5 | 移动互联 | `#B267FF` | 渐变紫、玻璃屏 |
| E6 | 存量 | `#5FA8A0` | 冷青灰、过剩与收缩 |
| E7 | 当前 | `#4FE3FF` | 本作主霓虹青 |

时代色仅在 S1 与身份卡的年代 chip 中使用，进入主游戏后让位于层色系统。

### 3.4 排版（Typography）

| Token | 栈 | 用途 |
|-------|-----|------|
| `--fc-font-ui` | `"PingFang SC","HarmonyOS Sans SC","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif` | 全部操作类 UI |
| `--fc-font-display` | `"Noto Serif SC","Source Han Serif SC","STSong",serif` | Logo、事件标题、章节叙事 |
| `--fc-font-num` | `"SF Mono","JetBrains Mono","Roboto Mono",ui-monospace,monospace` | 金钱、年份、层号、倒计时 |

字阶（移动端 375 基准；数字体一律开 `font-variant-numeric: tabular-nums`）：

| 名称 | 字号/行高 | 字重 | 典型场景 |
|------|-----------|------|----------|
| display-xl | 40/48 | 700 serif | Splash Logo |
| display | 32/40 | 700 serif | 屏幕大标题（入城登记） |
| title-lg | 24/32 | 600 | 事件标题（serif）/ 卡片主标 |
| title | 20/28 | 600 | 面板标题 |
| body-lg | 16/26 | 400 | 事件正文（行长 ≤ 22 字） |
| body | 14/24 | 400 | 常规正文 |
| caption | 12/18 | 400 | 注释、账单行说明 |
| micro | 11/16 | 500 · 字距 .08em | chip、栏目眉、英文副标 |
| num-xl | 32/36 mono | 600 | HUD 金钱、账单总计 |
| num | 16/20 mono | 500 | 行内金额、属性值 |

**字体策略**：不整包引入中文 webfont（体积红线）；系统字栈兜底，
仅对 Logo 四字「浮城人生」做子集化 woff2（< 30KB），其余 serif 场景接受系统宋体降级。

### 3.5 玻璃拟态（Glassmorphism）三档

| 档位 | bg | backdrop-filter | 描边 | 用途 |
|------|-----|-----------------|------|------|
| `glass-1` | `rgba(18,22,41,.55)` | `blur(12px) saturate(140%)` | `1px rgba(255,255,255,.10)` | 卡片、面板 |
| `glass-2` | `rgba(11,14,26,.65)` | `blur(20px) saturate(140%)` | `1px rgba(255,255,255,.12)` | HUD、底部抽屉 |
| `glass-3` | `rgba(7,8,15,.72)` | `blur(28px)` | `1px rgba(255,255,255,.08)` | 模态遮罩、事件卡 |

统一附加内高光：`inset 0 1px 0 rgba(255,255,255,.08)`（玻璃上缘的光）。
**回退**：`@supports not (backdrop-filter: blur(1px))` 或 `.fc-perf-lite` 模式下，
一律退为实底 `--fc-bg-raised` @ 96% 不透明度——信息可读性优先于质感。

### 3.6 霓虹光晕（Neon Glow）

| Token | 值 | 用途 |
|-------|-----|------|
| `--fc-glow-text` | `0 0 6px currentColor, 0 0 18px var(--glow-color)` | 霓虹文字 |
| `--fc-glow-card` | `0 0 0 1px rgba(255,255,255,.06), 0 8px 32px rgba(0,0,0,.45), 0 0 24px var(--glow-color)` | 选中卡片 |
| `--fc-glow-breathe` | 同上 + `animation: fc-breathe 2.4s ease-in-out infinite` | 玩家位置标记、警示金钱 |

`--glow-color` 由使用处注入（层色 glow 或霓虹青）。
**克制条款**：静止界面上持续发光的元素 ≤ 2 个；霓虹动画只用于「入场一次」或「状态警示」。

品牌渐变（按钮/进度条）：
`--fc-grad-neon: linear-gradient(135deg,#4FE3FF 0%,#A06BFF 55%,#FF4FA3 100%)`
`--fc-grad-money: linear-gradient(135deg,#FFD666 0%,#F0C75E 100%)`

### 3.7 间距 / 圆角 / 层级 / 动效

- **间距**：4px 基（`4 8 12 16 20 24 32 40 48 64`），token `--fc-sp-1 … --fc-sp-10`
- **圆角**：`xs 6 · sm 10 · md 14 · lg 20 · xl 28 · pill 999`；卡片默认 md，抽屉顶角 xl
- **z-index 尺**：`base 0 · map-poi 10 · hud 100 · sheet 200 · modal 300 · toast 400 · transition 500`
- **动效时长**：`--fc-t-fast 120ms`（按压反馈）· `--fc-t-base 200ms`（常规过渡）·
  `--fc-t-slow 320ms`（面板出入）· `--fc-t-cine 640ms`（屏幕过场、入城动画）
- **缓动**：出场 `cubic-bezier(.22,1,.36,1)`；双向 `cubic-bezier(.65,0,.35,1)`；
  弹性（仅骰子/标记）`cubic-bezier(.34,1.56,.64,1)`
- **`prefers-reduced-motion: reduce`**：过场退化为 crossfade，雨幕/粒子停帧

---

## 4. 布局栅格与响应式

- **设计基准**：375×812 逻辑像素（移动优先；微信内嵌 WebView 是第一目标环境）
- **栅格**：4 列 flex/grid，页边距 20px，列距 12px；仪表盘卡片全宽或 1/2 宽
- **断点**：`≥600px` 出身卡 3 列、事件卡定宽 560px 居中；`≥960px`（桌面演示）
  剖面图与仪表盘并排双栏，城市背景视差幅度加大
- **安全区**：底部导航与主 CTA 处理 `env(safe-area-inset-bottom)`
- **触控**：所有可点目标 ≥ 44×44px；层带整条可点，不依赖小图标

---

## 5. 组件库规格（Component Library）

命名前缀 `fc-`，BEM 风格（`fc-btn--primary`）。按原子层级组织。

### 5.1 原子（Atoms）

| 组件 | 变体/状态 | 规格要点 |
|------|-----------|----------|
| A-1 `fc-btn` | `primary`（霓虹渐变描边+微光）/ `ghost` / `danger` / `gold`(L4 场景) · hover/active/disabled/冷静期 | 高 48px，pill 圆角；active 压暗 8% + scale .98；主按钮全屏唯一 |
| A-2 `fc-glass-card` | tier 1–3 · 可注入 `--layer-tint` | §3.5 三档玻璃 + 层着色；标题槽/正文槽/角标槽 |
| A-3 `fc-stat-bar` | 尺寸 default/mini · 阈值变色（<20% 转 `--fc-down`） | 条高 6px（mini 4px），圆头，底轨 `rgba(255,255,255,.08)`，delta 变化 320ms 补间 |
| A-4 `fc-money` | 正/负/警示 · size num/num-xl | mono + tabular；滚动计数动画；delta 浮出 `+¥1,200`（up 色，600ms 上浮消散） |
| A-5 `fc-chip` | `layer`(L1–L5 层色) / `era`(E1–E7) / `risk`(红线, down 色描边) / `neutral` | 高 22px，micro 字级，色 = 对应 token 的 primary 描边 + tint 底 |
| A-6 `fc-icon` | 24px 线性图标集，1.5px 描边 | 金钱/健康/人脉/声望/地铁/骰子/锁/菜单/关闭…（首批 16 枚，SVG sprite） |
| A-7 `fc-progress-ring` | 年龄环 / 加载环 | SVG 环，`stroke-dasharray` 驱动 |
| A-8 `fc-divider` | 默认 / 霓虹（1px 渐变线） | 分隔账单行、面板段落 |

### 5.2 分子（Molecules）

| 组件 | 组成 | 规格要点 |
|------|------|----------|
| M-1 `fc-era-card` | A-2 + A-5(era) + mono 年份 | 260×340；聚焦态 scale 1.06 + era hue 描边光；snap 滚动子项 |
| M-2 `fc-origin-card` | A-2 + 3×A-3(mini) + A-5(layer) | 点选展开半屏详情；随机骰子入口在栅格末位 |
| M-3 `fc-layer-band` | A-2(tint=层色) + POI 点 + 锁定磨砂态 | 高 96–128px；当前层 `--fc-glow-breathe` 位置标记；锁定态显示门槛文案 |
| M-4 `fc-event-choice` | A-1(ghost) + 代价标注(A-4/A-5) | 左文案右代价；风险选项加 `risk` chip；红线事件 3s 冷静期 |
| M-5 `fc-stat-cluster` | A-6 + A-4/数值 + sparkline | 仪表盘四围单元；点击进入分项详情（Round 2） |
| M-6 `fc-ledger-row` | 名目 + caption 说明 + 右对齐 A-4 | 划账动画：整行自上而下依次入账 |
| M-7 `fc-relation-node` | 头像位 + 人名 + 人情值 | 欠/被欠用 up/down 色；O3 列表项 |
| M-8 `fc-toast` | glass-2 条 + A-6 | 顶部滑入，2.4s 自动退出；同屏 1 条 |
| M-9 `fc-timeline-node` | 年份 mono + 事件短句 | 横向时间线子项，重大节点用层色点标记 |

### 5.3 有机体（Organisms）

| 组件 | 组成 | 规格要点 |
|------|------|----------|
| O-1 `fc-hud` | glass-2 通栏：A-4(金钱) · 年月 mono · A-5(当前层) · 菜单钮 | 高 56px 常驻顶部；金钱警示态呼吸红光（P2「氧气」规则） |
| O-2 `fc-city-section` | 5×M-3 垂直堆叠 + 地平线分隔 + 视差背景 | S3 主体；L5 置于地平线下方并整体压暗 |
| O-3 `fc-dashboard-grid` | 身份卡 + 4×M-5 + 收支速览 + 技能条 + 时间线 | S4 主体；滚动容器，HUD 与主 CTA 固定 |
| O-4 `fc-event-modal` | glass-3 遮罩(层色 vignette) + 事件卡 + n×M-4 | §2 O1 全解剖；结果面 delta 逐条 tick |
| O-5 `fc-ledger-sheet` | 底部抽屉 + n×M-6 + 总计行 | 上滑入场 320ms；固定文案锚「账单比闹钟准时。」 |
| O-6 `fc-bottom-nav` | 双 tab：剖面 / 仪表盘 | glass-2；活跃 tab 霓虹青下划线 |
| O-7 `fc-screen-transition` | 闸机 wipe / 坠落入城 / crossfade | z=500；由 ScreenManager 调度，reduced-motion 全部退为 crossfade |

### 5.4 特效层（与 gpt-sol-r1-effects 的接口）

雨幕 canvas、霓虹 flicker keyframes、天际线视差、粒子漂浮由 effects 代理实现，
但必须消费本文件 token 且遵守 §8 预算；接口：`fx.rain(intensity)`, `fx.parallax(bind)`,
`fx.flicker(el)`, `fx.particles(layerColor, count≤120)`。

---

## 6. 动效系统（Motion）

| 场景 | 规格 |
|------|------|
| 屏幕切换 | S1→S2 闸机 wipe（左右门板 640ms）；S2→S3 坠落入城（背景纵向位移 + 目标层带发光）；其余 crossfade 320ms |
| 卡片入场 | 列表卡片 stagger 40ms/张，位移 12px + fade，最多 8 张参与 stagger |
| 金钱变动 | 数字滚动 400ms + delta 浮出；账单划账逐行 90ms 间隔 |
| 事件弹出 | 遮罩 fade 200ms → 事件卡 scale .96→1 + fade 320ms；结果面 3D flip 可降级为 crossfade |
| 霓虹 | 只在入场 flicker 一次或警示呼吸（2.4s 循环）；禁止无意义常亮动画 |
| 骰子随机 | 弹性缓动 rotate 两圈，560ms |

---

## 7. 工程约定

### 7.1 文件结构（`games/fucheng-life/`）

```
games/fucheng-life/
├── index.html
├── css/
│   ├── tokens.css        ← 本文 §3 全量令牌（SSOT 落地）
│   ├── base.css          ← reset、字阶、玻璃/霓虹工具类
│   ├── components.css    ← §5 组件样式
│   └── screens/          ← s0-splash.css … s4-dashboard.css, overlays.css
├── js/
│   ├── main.js           ← 启动、存档判定
│   ├── screen-manager.js ← 路由 + 屏幕栈 + overlay 栈 + 过场
│   ├── store.js          ← 游戏状态、localStorage(fc.save.v1)
│   ├── ui/               ← 组件工厂（原生 JS，无框架）
│   └── fx/               ← 特效模块（effects 代理产出）
├── data/
│   └── story.json        ← 文案/事件数据（story-data 代理产出，schema 见 7.2）
└── assets/               ← 天际线 SVG、图标 sprite、Logo 子集字体
```

### 7.2 数据契约（与 gpt-sol-r1-story-data 对齐）

`story.json` 顶层键：`eras[]`（id `e1..e7`, name, years, motto, bonus, trap, hue 可省用 token）、
`origins[]`（id, name, quote, stats{wealth,network,education}, startLayer, startCash）、
`events[]`（id, layer `l1..l5`, type `opportunity|bill|relation|redline`, title, body,
choices[]{text, cost{cash?,favor?,risk?}, result{text, deltas{}}}）、`taglines[]`（splash 轮播冷文案）。
UI 按 id 消费，文案不硬编码进组件。

### 7.3 存档契约

`fc.save.v1 = { era, origin, dateYM, cash, netWorth, stats{health,network,fame},
layer, skills[], relations[], timeline[], flags{} }`——UI 只读写 store.js，不直接碰 localStorage。

### 7.4 性能预算（微信 WebView 中端安卓机为准）

- 同屏 `backdrop-filter` 表面 ≤ 3；超出自动降为实底回退
- 雨幕粒子 ≤ 120，`requestAnimationFrame` 单循环统一驱动；标签页隐藏即暂停
- 首屏资源 ≤ 300KB（gzip 前），Logo 子集字体 < 30KB，图标走单一 SVG sprite
- 动画只用 `transform/opacity`，禁止对 `filter/box-shadow` 做逐帧补间
- 提供 `.fc-perf-lite` 全局类：关雨幕、关视差、玻璃退实底（设置项「动效强度：精简」）

### 7.5 可访问性与手感

- 玻璃面板上正文对比度 ≥ 4.5:1（ink-100/ink-70 在三档玻璃上均已校验方向，实装后用工具复测）
- 焦点态：2px 霓虹青外描边（键盘/手柄演示可用）
- 触控 ≥ 44px；红线事件 3s 冷静期同时是防误触机制
- 色弱兜底：层信息永远「色 + 层号 L1–L5 + 层名」三通道并示，不单靠颜色

---

## 8. Round 1 验收清单（本架构对其他子代理的约束）

| # | 项 | 责任方 | 验收标准 |
|---|-----|--------|----------|
| 1 | `tokens.css` 与本文 §3 一致 | main-shell | 全部 `--fc-*` 命名与值一致 |
| 2 | S0/S1/S2/S3/S4 五屏可走通 | main-shell + core-screens | 按 §1.2 路由表可完整走一遍新开局 |
| 3 | 事件弹窗按 §2 O1 解剖实现 | core-screens | 场景 chip 层色正确、结算 delta 动效 |
| 4 | 文案来自 story.json | story-data | UI 无硬编码叙事文案 |
| 5 | 特效遵守 §7.4 预算 | effects | perf-lite 可一键关闭全部特效 |
| 6 | 五层色板肉眼可辨层次 | 全体 | L1 暖黄 / L2 蓝灰 / L3 青绿 / L4 金紫 / L5 红黑在剖面图上一眼分层 |

---

*fable-r1-ui-arch · Round 1 · 《浮城人生》URBAN LIFE SIMULATOR*
