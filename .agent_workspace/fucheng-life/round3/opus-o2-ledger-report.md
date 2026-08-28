Model slug: claude-opus-5

# O2 账单抽屉 — 实现报告（Round 3）

> Agent: opus-r3-o2-ledger · Branch: `agent/fucheng-life-ui`
> 依据：[`round2/fable-overlay-spec.md`](../round2/fable-overlay-spec.md) §2 / §3.3 / §6.3 / §6.4 ·
> [`round3/ROUND3_CONTEXT.md`](ROUND3_CONTEXT.md) · [`round2/fable-gap-matrix.md`](../round2/fable-gap-matrix.md) §4.2 O2 ·
> 前置：[`round2/opus-event-overlay-report.md`](../round2/opus-event-overlay-report.md) §5「给 O2 账单抽屉的接口」

---

## 1. 交付物

| 文件 | 内容 | 行数 |
|------|------|------|
| `games/fucheng-life/js/fc-ledger.js` | `FC.ledger.show/close/isOpen`，复用 `FC.overlay` 栈 | ~200 |
| `games/fucheng-life/css/fc-ledger.css` | `.fc-sheet*` / `.fc-ledger*` 全套样式、滑入与逐行划账动效 | ~200 |
| `games/fucheng-life/screens/dashboard.html` | `<link>` + `<script>` 两处引入、`buildLedgerPayload()` / `maybeShowLedger()`、`tick(silent)` 集成、`#ledgerBtn` 手动入口 | +60 |

新增两个独立文件而不是扩写 `fc-events.*`：本轮 `opus-r3-p1-polish` 在同一工作区改
`fc-events.css` 附近的 `screens.css` 与 `dashboard.html`，抽屉自成一对文件可以零冲突落地，
也和 `fc-ledger*` 类名前缀对齐。类名、JS API、payload 契约全部按规格 §2/§3.3 实现。

**加载顺序是硬依赖**：`fc-ledger.js` 必须排在 `fc-events.js` 之后 —— 覆盖层栈
`FC.overlay`（滚动锁 + 焦点陷阱 + 单一 keydown 分发）由 O1 那一份提供，抽屉不重复造。
拿不到栈时模块直接 `console.warn` 并不挂载 `FC.ledger`；dashboard 三处调用点本来就带
`if (FC.ledger)` 守卫，`#ledgerBtn` 也会保持 disabled，页面不会因此报错。

---

## 2. 抽屉本身

### 2.1 结构与视觉（规格 §2.1 / §2.2）

DOM 与规格逐字对应：`.fc-sheet` → `__scrim` / `__panel`（`role="dialog"`
`aria-modal="true"` `aria-label="本月账单"`）→ `__grip` / `__head`（标题
「账单日 · 1981.03」，年月走 mono）/ `.fc-ledger` 行列表 / `.fc-ledger__total` / `__done`。

遮罩是**中性的**：`rgba(4,6,13,.6)`，没有层色 vignette。结算不属于任何一层，
它对所有人一视同仁 —— 这也是它和 O1 事件弹窗最大的观感差别。

发光预算：抽屉内**只有净流大字**带 `text-shadow`（`currentColor 40%`），
其余全部是描边与虚线分隔。同屏 ≤1 处持续发光，符合架构 §3 的守恒。

「账单比闹钟准时。」以 serif 12px 固定钉在标题下，不接受 payload 覆盖 —— 它是锚点文案，
每个月说同一句才有意义。侧栏面板里原有的那一句保留不动，两处互为呼应。

### 2.2 划账动效（规格 §2.3）

- 滑入：scrim `fc-fade-in` 200ms，panel `fc-sheet-up` 320ms `--ov-ease-out`，
  规格指定的实现原样落地。
- 逐行：`.fc-ledger__row` 复用 screens.css 既有的 `fc-rise`，
  `animation-delay: calc(var(--i) * 90ms)`，自上而下一行一行落。
- 金额：软依赖 `FC.fx.countUp` / `FCMotion.countUp` / `FCUI.countUp`，
  取到就 400ms 滚到位，**每个数字在自己那一行落地的瞬间起滚**（延迟同 `--i * 90ms`），
  取不到就是静态文本。真实金额在 HTML 生成时就已经写进 DOM，滚动只是给一个已经正确的
  数字加动效 —— 定时器被清掉也不会留下半截数。
- 总计：延迟 `行数 × 90ms + 120ms`，同时 `fc-flash` 闪一次。
  flash 挂在 `.fc-ledger__total-value` 而不是规格写的总计行上 —— 行本身已经有
  `fc-rise`，两个 `animation` 简写在同优先级下会互相覆盖，挂到子元素才真的会闪。
- 关闭：`.is-closing` → panel `fc-sheet-down` 240ms ease-in + scrim 淡出 200ms，
  监听 `animationend`（校验 `animationName`，避免入场动画的事件提前拆掉节点）
  并配 260ms `setTimeout` 兜底。
- 手势下滑关闭：按规格**不做**。关闭途径 = 按钮 / ESC / 点遮罩。

### 2.3 a11y（规格 §2.5）

打开即焦点落在 `tabindex="-1"` 的 panel 上；Tab 走 `FC.overlay.trap`，抽屉里唯一可聚焦的
「结清，继续 ▸」被循环锁住，跑不出去。ESC / 遮罩 / 按钮三条路都关闭并 resolve，
关闭后 `FC.overlay.pop` 归还焦点（tick 触发 → 回 `#tickBtn`；手动触发 → 回 `#ledgerBtn`）。
总计行 `aria-live="polite"`，金额行是纯文本，读屏天然可读。
负号统一 U+2212「−」，与 HUD、事件卡一致。

### 2.4 reduced-motion

screens.css 的全局规则已经把动画压到 0.001ms，`fc-ledger.css` 另加一段显式
`animation: none` 兜底（抽屉直接就位、每行 opacity 1）。JS 侧独立判断
`prefers-reduced-motion`：跳过 count-up 与 flash，直接落值；关闭时同步拆节点，
不等 240ms 动画。整条流程照常可走通。

---

## 3. payload 与数据

```js
FC.ledger.show({
  ym: "1981.03",
  rows: [{ label: "房租", note: "合租主卧", amount: -1500 }, …],  // 支出为负
  income: 4406,
  net: 1083
})  // → Promise<void>，抽屉关闭时 resolve
```

格式化统一 `(v<0?"−":"+") + "¥" + Math.abs(v).toLocaleString("zh-CN")`。
`income` 由模块自己补成 `--income` 变体行（`--ok` 绿、`+¥`），调用方不用自己拼。
`amount` 为 0 的行会被丢掉 —— 债还清之后「还贷 −¥0」不是这个月的一行。

dashboard 侧 `buildLedgerPayload()` 直接读既有的 `bills()` / `income()` / `run.income`，
**没有第二套算法**：抽屉里的每个数字都和右侧「本月账单」面板、HUD 的月净流同源，
自动化断言里逐项比对过（§5）。

`note` 只给真的能多说一句的两行：

- **房租** → 随 `layerOf()` 走：城中村单间 / 合租主卧 / 一室一厅 / 江景两居 / 临时落脚。
  同一笔房租在不同高度买到的东西不一样，这是抽屉里唯一会随人生变化的说明。
- **还贷** → 「月供利息」。

通勤、伙食、人情、杂费不编注解 —— 现有模型并不知道这个月的人情花在哪，
写「婚宴红包」就是造事实。宁可留白。

`FC.ledger` 与 O1 一样是**纯 UI**：不读 `run`，不写 localStorage，不改任何状态。

---

## 4. dashboard 集成（规格 §6.3 / §6.4）

### 4.1 触发规则

```js
function maybeShowLedger(silent) {
  if (silent || !FC.ledger) return;
  if (run.months === 1 || run.income < 0 || run.month === 12) {
    FC.ledger.show(buildLedgerPayload());
  }
}
```

三种月份值得一次仪式：**入城首月**（教学性展示）、**净流为负的月份**（氧气告警）、
**每年 12 月**（年度结算）。其余月份账单安静地待在侧栏里，抽屉不打扰。

`tick(silent)` 的调用点按规格 §6.2 分两路：没抽到弹窗事件 → 直接
`maybeShowLedger(silent)`；抽到了 → 在 `openEvent()` 的 `.then` 里、
`render()`/`renderLog()` 之后再开抽屉。**弹窗永远先于抽屉**，
两者不会同屏（真同屏时 z-index 300 > 200，modal 也压在上面）。

### 4.2 快进半年

快进的中间月 `silent=true`，第 6 个月 `silent=false` —— 抽屉不会在快进途中连弹五次。
被事件打断时，那一个月就是玩家实际停在的月份，所以打断分支里补一次
`maybeShowLedger(false)`，把 silent 扣下的那次仪式还回去（实测：11 月起步快进、
第一个月被弹窗打断，关掉弹窗后 1981.12 的抽屉照常滑出）。

### 4.3 手动入口

「本月账单」面板底部加了 `#ledgerBtn`（`.fc-btn.fc-btn--ghost`，全宽）
「查看结算单」，随时可看。init 之前 disabled，`FC.ledger` 缺席时保持 disabled。

「重开人生」原有的 `if (FC.ledger) FC.ledger.close();` 软钩子现在真的接上了，
强关走同步路径，pending Promise 立刻 resolve，不会污染新档。

---

## 5. 验收

### 5.1 自动化（Chrome 148 headless + puppeteer-core，`python3 -m http.server`）

两份脚本共 **53 条断言，全绿**。390×844 @2x 与 1280×900 各跑一遍，
happy path console / pageerror 均为 0。

**抽屉本体与交互（42/42）**

| 组 | 断言 |
|----|------|
| 契约 | `FC.ledger.show/close/isOpen` 就位；z-index 200；`role/aria-modal/aria-label` 正确 |
| 首月 | 推进第一个月后抽屉自动滑出；标题带年月；锚点文案在标题下 |
| 动效 | 7 行 delay 依次 0 / 90 / 180 … ms；总计行 delay = 行数×90+120 = 750ms |
| 数值 | 支出全为负；月收入行在末尾且用 `--ok` 绿；count-up 结束后每个数字精确等于 payload |
| 一致性 | 7 条行项目与 `#bills` 面板逐项相等；净流与 HUD `月净流` 文本一致 |
| 布局 | panel 贴底、x=0、宽 390、bottom=844；仅顶角 28px 圆角；`documentElement.scrollWidth === 390`（无横向溢出）；「结清，继续」356×49（≥44） |
| 焦点 | 打开焦点入 panel；Tab 只在「结清」上循环；ESC / 遮罩 / 按钮三路关闭；焦点分别归还 `#tickBtn` / `#ledgerBtn`；滚动锁开合正确 |
| 健壮性 | 连续两次 `show()` 只留一个抽屉（后者胜）；`amount:0` 的行被丢弃；「重开人生」瞬间清空抽屉与滚动锁；快进全程同屏抽屉数 ≤1 |
| reduced-motion | panel `transform:none` 直接就位；每行 opacity=1；金额直接落值、无 flash；ESC 立即移除节点；无 console error |
| 桌面 1280 | 宽 560px、水平居中、高 ≤78vh |

**触发规则（11/11）**

| 断言 | 结果 |
|------|------|
| 12 月推进 → 抽屉打开，标题 `1981.12` | ✅ |
| 普通盈余月推进 → 不打扰 | ✅（`月净流 +¥2,884`，无抽屉） |
| 净流为负的月份 → 抽屉打开、总计 `.down` 红、数值与 HUD 同为 `−¥29,147` | ✅ |
| 快进中间月静默，只在落点月份开抽屉 | ✅ |
| 无干扰快进 6 个月（6 月 → 12 月）→ 只在 1981.12 开一次 | ✅ |
| 快进被弹窗打断在 12 月 → 关掉弹窗后抽屉照常，日志有「快进被一件事打断。」 | ✅ |
| 全程无 console error | ✅ |

### 5.2 仓库测试链

`./scripts/run-fucheng-life-tests.sh` → **4 passed, 0 failed**
（JS 语法 12 文件、story.json schema、90 条本地链接、浏览器导出 smoke）。
链接检查已覆盖新增的 `fc-ledger.css` / `fc-ledger.js` 两处引用。

### 5.3 人工核对

390px 盈余月 / 赤字月、1280px 三张截图逐项对过规格 §2.4 线框：
grip、标题、锚点文案、虚线分隔、右对齐 mono 金额、月收入绿行、28px 净流大字、
全宽主按钮，位置与层级与线框一致。赤字月的 `−¥28,948` 红字与 HUD 同步。

---

## 6. 与规格的偏差

| 处 | 规格 | 实现 | 理由 |
|----|------|------|------|
| 文件 | `css/overlays.css` + `js/fc-overlay.js`（O1/O2 合并） | `css/fc-ledger.css` + `js/fc-ledger.js` | 沿用 Round 2 已定的 `fc-*` 分文件命名；本轮并行代理在改同一批文件，独立文件零冲突 |
| §2.3 总计闪光 | `fc-flash` 加在 `.fc-ledger__total` | 加在 `.fc-ledger__total-value` | 总计行自己有 `fc-rise`，同优先级的 `animation` 简写会互相覆盖，闪不出来 |
| §2.1 行说明 | 线框示意 房租/人情/还贷 三处 note | 只给 房租（随层变化）/ 还贷 | 现有经济模型不知道人情花在哪，编一句「婚宴红包」是造事实 |

---

## 7. 遗留

1. **手势下滑关闭**未做（规格 §2.3 明确本轮不做）。移动端目前靠遮罩点击关闭，
   抽屉上方留了约 20% 视口高度的可点区域。
2. **年度累计**没有：12 月的抽屉和其他月份长得一样，只是净流那一行的年终意味更重。
   真正的「年度账单」（12 个月汇总、同比）值得单开一个视图。
3. **抽屉只在 dashboard 触发**。模块本身不依赖 dashboard 任何全局，
   city-map 想用只需引两个文件 + 调 `FC.ledger.show`。
4. `file://` 直开 dashboard 目前会停在「市民档案读取失败」——
   `story-loader.js` 的同步 XHR 被 Chrome 的 file 源策略挡下，
   与本轮改动无关，属于 story-wire 的领域。抽屉在 http 下一切正常。
5. 本轮的 puppeteer 断言脚本是一次性的（`puppeteer-core` 不在仓库依赖里），
   没有并进 `games/fucheng-life/tests/`——那套 harness 刻意保持零依赖。
   如果 Round 4 要把浏览器断言纳入 CI，抽屉这 53 条可以整体搬过去。

---

*opus-r3-o2-ledger · Round 3 · 《浮城人生》URBAN LIFE SIMULATOR*
