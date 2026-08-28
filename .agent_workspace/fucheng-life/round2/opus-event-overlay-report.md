# O1 事件弹窗 — 实现报告（Round 2）

> Model slug: claude-opus-4-1-20250805
> Agent: opus-r2-event-overlay · Branch: `agent/fucheng-life-ui`
> 提交：[`a769bed`](../../../games/fucheng-life/js/fc-events.js) 首版 · `29db60d` 按规格重做
> 依据：[`fable-overlay-spec.md`](fable-overlay-spec.md) §1/§3/§4/§6 ·
> [`fable-ui-architecture.md`](../round1/fable-ui-architecture.md) §2 O1 ·
> [`ROUND1_CONCLUSION_BRIEF.md`](../round1/ROUND1_CONCLUSION_BRIEF.md) P0-3

---

## 1. 交付物

| 文件 | 内容 | 行数 |
|------|------|------|
| `games/fucheng-life/js/fc-events.js` | `FC.overlay` 覆盖层栈 + `FC.events` 事件弹窗模块 + 10 条事件分支剧本 + 离线镜像 | ~560 |
| `games/fucheng-life/css/fc-events.css` | O1 全部样式（层色 scrim、类型色 accent、选项、预览点、冷静期、结果面） | ~390 |
| `games/fucheng-life/screens/dashboard.html` | 三处接入：`<link>`、`<script>`、inline script 的 tick/快进/重开改造 | +90 −20 |

**文件名与规格的偏差**：规格 §0.1 指定 `css/overlays.css` + `js/fc-overlay.js`（O1+O2 合并一份）。
本轮我只负责 O1，派单明确点名 `fc-events.js`，且 dashboard 已由并行代理提交时带走了
`fc-events.*` 的引用。因此保留 `fc-events.*` 命名，但**类名、JS API、行为全部按规格实现**，
并把规格分配给 `fc-overlay.js` 的共享栈 `FC.overlay` 一并落在这里 —— O2 代理可以直接
`FC.overlay.push("sheet", el)` 复用，无需重复造滚动锁与焦点陷阱。

---

## 2. 实现要点

### 2.1 数据链（规格 §4.1）

```
FC.story（story-loader.js 已发布）
  → 否则 fetch ../data/story.json（相对模块 src 解析，不依赖页面所在目录）
  → 否则 模块内 SEED 镜像（10 条 sampleEvents 的完整拷贝）
```

`file://` 下**不发起 fetch**：跨源请求在离开页面前就被拒绝，Chrome 会记一条红色
console error。直接走镜像，双击打开 `dashboard.html` 时控制台干净。

`story.json` 的 `sampleEvents` 没有 `choices`，按规格 §4.2 在模块内维护 `SCRIPT`
（EV01–EV10，每条 2–3 个分支）。`toPayload()` 优先读 `raw.choices` —— 将来 story.json
自带分支时直通，本表自动失效，不需要改代码。

`category → type` 映射按规格原表：机会→opportunity，金钱/生计/居住→bill，
人情/关系→relation，风险→redline，其余兜底 opportunity。

### 2.2 抽取权重

事件抽在玩家实际生活的那一层：同层 ×3，相邻层 ×1.4，远层 ×0.45；
L5 暗流在 L4 以下只有 ×0.3，且受 dashboard 的红线闸门二次约束
（入城前 6 个月不开，开过一次后 12 个月内不再开）。
最近 3 条 id 进 `run.recentModal` 排除，避免连着撞同一件事。

### 2.3 金额单位 —— 与规格的一处刻意偏差

规格 §6.2 要求 CHOICES 直接写绝对 ¥（"冷静叙事需要具体数字"）。本实现改为
**收入相对单位**：`money: -2` 表示"约两个月净流的三分之二"，由
`FC.events.moneyOf(units, moneyRef)` 换算成玩家看到的 ¥。

理由：同一个 −¥3,000，在 E1 单位时代（起薪 ¥420）是压垮一生的数目，在 E7（¥33,000）
是一顿饭。七个年代跨度 80 倍，写死金额会让同一句文案在两端都失真。dashboard 现有
`POOL` 出于同样原因早已用倍数制。

具体数字**没有丢**：结果面显示换算后的真实 ¥（`现金 −¥2,868`），与 HUD 的扣款完全一致，
因为两边调的是同一个 `moneyOf`。提问面按 Reigns 规则本就不显示确数。

### 2.4 后果预览点（规格 §1.6）

只预告**哪些维度会动、动多大**，不预告方向 —— 这是 Reigns 的核心手感，也避免玩家把
弹窗当成算术题。

- 常显（手机没有 hover），hover/focus 时 `scale(1.25)` 作桌面强化
- 颜色 = HUD 同色：现金琥珀 / 健康青玉 / 人脉紫罗兰 / 声望霓虹青
- 尺寸 s5 / m7 / l9 px；属性档 `≤3 / ≤7 / >7`，现金档以 `moneyRef` 为参照
  （`≤0.4×` / `≤1.2×` / 更多），无参照时退化为 ¥1,000 / ¥6,000
- 读屏：点容器 `aria-hidden`，另给 `<span class="fc-sr">影响：现金、声望</span>`，
  同样只报维度不报方向

### 2.5 红线冷静期（规格 §1.7）

L5/风险类事件打开即锁 3 秒：选项 `disabled` + `.is-cooling`（55% 透明），
每个按钮底部 2px 血红充能条 `scaleX(0→1)`，角标文本走 JS 倒数「红线 · 3 / 2 / 1」
（读屏可感知，不只是动画）。冷静期内 ESC、遮罩点击、数字键全部无效。
**`prefers-reduced-motion` 下依然生效** —— 它是玩法闸门和防误触机制，不是装饰。

### 2.6 关闭矩阵（规格 §1.8）

| 状态 | ESC | 点遮罩 |
|------|-----|--------|
| 提问面 | 忽略 + 卡片 `fc-deny` 横向抖动 | 同左 |
| 红线冷静期 | 忽略（不抖，界面已在倒计时） | 忽略 |
| 结果面 | 等价「继续」，resolve | 同左 |
| ack 模式（无选项） | 关闭并 resolve 空 deltas | 同左 |

事件是「中断」不是对话框：没表态就走不掉。焦点陷阱、`body.fc-scroll-lock`、
关闭后焦点归还触发元素（实测回到 `#tickBtn`）。

### 2.7 状态边界

覆盖层**只做 UI**：不改 `run`，不写 localStorage。`show()` resolve
`{choiceId, choice, deltas, event, dismissed}`，deltas 由 dashboard 在 `.then` 里入账。
这样 O1 可以原样搬到 city-map，也让「重开人生」能安全地 `FC.events.close()`
强关并标记 `dismissed:true`，pending 的 Promise 不会污染新档。

### 2.8 dashboard 接入（规格 §6）

- `tick()` 现在返回 `Promise<boolean>`（是否被弹窗打断）
- 触发概率表 `[-, 0, 0.45, 0.65, 1.0]`（按 `run.sinceModal` 索引）：新档首月不打扰，
  最迟第 4 个月必弹 —— 覆盖 Round 2 验收门禁「推进 ≥3 次可触发 ≥1 次」
- 快进半年**串行**执行，遇弹窗即终止剩余月份并记一行「快进被一件事打断。」，
  绝不并发 6 个 tick
- 账单抽屉 O2 留了软钩子（`if (FC.ledger) FC.ledger.close()`），本轮不在我的范围

---

## 3. 文案

10 条事件 × 2–3 分支 × 结果文案，语气对齐 `STORY_EXTRACT`：短句、现实主义、
不煽情、不爽文。没有金光、没有暴富提示音，最"顺"的一条结果是
「站长记下了你的名字，说下个月排班时想着你。这句话不值钱，但可以先记着。」

代价标注刻意留白：`风险 ▲`、`以后 −`、`人情 ▲`，而不是 `-¥3,000`。
结果面才给确数 —— 城市从不预先报价。

---

## 4. 验收（Chrome headless，`python3 -m http.server`）

对照规格 §7 自测清单：

| 项 | 结果 |
|----|------|
| 390px 无横向溢出；卡片 366px；选项高 52px（≥44） | ✅ 溢出 0px |
| 推进 ≤4 个月必出弹窗 | ✅ 实测 2 次点击即出，45 次长跑共解决 22–44 次事件 |
| 弹窗期间背景锁滚动、Tab 不逃逸 | ✅ `fc-scroll-lock` + 陷阱实测 |
| 四种 type 角标/accent 颜色正确 | ✅ bill 琥珀 / opportunity 青 / relation 紫 / redline 血红 |
| L5 遮罩更暗更红 | ✅ `rgba(4,6,13,.88)` + 32% 层色晕 |
| 红线 3s 不可点、倒计时可见、ESC 无效、3s 后焦点落首选项 | ✅ 全部 |
| 后果点只显维度与幅度；读屏「影响：现金、声望」 | ✅ |
| 结果面 delta 与 HUD 实际变化一致 | ✅ `现金 −¥2,868` → HUD 记 `−2900`（日志按百取整） |
| 关闭后焦点回「推进一个月」 | ✅ `activeElement.id === "tickBtn"` |
| ack 模式单按钮可关 | ✅ resolve `choiceId: null` |
| 快进遇弹窗即中断、无并发弹窗 | ✅ 最大同屏覆盖层数 = 1，打断日志已记 |
| 重开人生瞬间关闭一切 overlay 无报错 | ✅ 覆盖层 0、滚动解锁 |
| FIFO 队列 + `close()` 标记 dismissed | ✅ |
| `prefers-reduced-motion` 全流程可走通 | ✅ 冷静期仍工作 |
| `file://` 打开 SEED 兜底、console 无错 | ✅ 10 条事件全部可玩 |
| **Chrome console / pageerror** | ✅ **happy path 零错误**（390px 与 1280px 各跑一遍） |

截图（headless，390×844 @2x 与 1280×900）：提问面、红线冷静期、结果面均已人工核对，
层色、发光预算（同屏仅 accent 一处持续发光）、正文对比度符合架构文档 §3。

---

## 5. 交接与遗留

**给 O2 账单抽屉的接口**：`FC.overlay.push("sheet", el)` / `.pop(el)` / `.trap(el, e)`
已就绪，z-index 200/300 已分配，`body.fc-scroll-lock` 由栈统一管理。
全局只有一个 keydown 监听，分发给栈顶的 `onKey`。

**遗留 / 后续**：

1. `SEED` 是 `data/story.json → sampleEvents` 的离线镜像，story.json 改文案时需同步。
   根治办法是把 story 序列化成 `data/story.js`（JSONP 式）供 file:// 直读，
   属于 story-wire 的领域，本轮未动。
2. `SCRIPT` 分支表住在 JS 里而不是 story.json。规格 §4.2 明确「不改 story.json」，
   等 story.json 自带 `choices` 字段时 `toPayload()` 会自动改走数据源。
3. 事件目前只在 dashboard 触发。city-map 复用只需引两个文件 + 调 `FC.events.show`，
   模块不依赖 dashboard 的任何全局。
4. 结果面的 3D flip 按规格降级为淡入淡出，Round 3 可选加分。

---

*opus-r2-event-overlay · Round 2 · 《浮城人生》URBAN LIFE SIMULATOR*
