Model slug: opus-fast (Claude Opus 5)

# Round 2 · opus-r2-visual-polish 报告

**分支** `agent/fucheng-life-ui` · **提交** `65b6d88` (主体) + `2c5fe43` (390px 修复)

Round 1 的核心屏会切换，但从来看不见"切换"这个动作。本轮加了一层共享动效模块，
让五个屏共用同一套节拍：数字滚动、卡片依次入场、屏间擦除转场、全局扫描线罩层、
统一按压反馈。

---

## 1. 交付物

| 文件 | 变更 | 说明 |
|------|------|------|
| `js/fc-motion.js` | **新增** 240 行 | `window.FCMotion` — `countUp` / `stagger` / `leaveTo` / `reduced` / `format` |
| `css/screens.css` | +330 行 | §17b 按压反馈、§19 罩层、§20 转场、`.fc-rise` 支持 `--i`、reduced-motion 扩展、390px actionbar |
| `screens/index.html` | 接线 | 四张入口卡 `--i:0..3` + 引入模块 |
| `screens/era-select.html` | 接线 | `FCMotion.stagger()` 替代内联 `animation-delay` |
| `screens/origin-select.html` | 接线 | 同上 |
| `screens/city-map.html` | 接线 | 五层 strata stagger（`--stagger:70ms`） |
| `screens/dashboard.html` | 接线 | `paintNumber()` 走 `FCMotion.countUp`；日志条目 `--i` |

模块用 `<script src="../js/fc-motion.js">` 引入，无 build step、无依赖、`file://` 可用。

---

## 2. 五项要求的落地

### 2.1 Count-up（金钱与关键属性）

`FCMotion.countUp(el, to, opts)` — rAF + `easeOutCubic`，`toLocaleString("zh-CN")` 千分位。

- **时长自适应 400–800ms**：`400 + min(1, |Δ| / max(|to|,|from|)) * 400`。
  微调 400ms，数字被改写的大月份 800ms —— 大变化在视觉上确实落得更久。
- **起点取屏幕上的当前值**（解析 `textContent`），不是内部状态，所以玩家看到的
  永远是"从我刚才看到的那个数走到新数"。
- **首帧也滚**：`render(false)` 初次进仪表盘同样从 0 数上来。
- `WeakMap` 记录在飞的 rAF，连点「快进半年」不会叠帧。
- `suffix` 支持 HTML（`<small>/100</small>`），由屏幕自己提供，不接受玩家输入。

覆盖 HUD 六项：现金、健康、人脉、声望、年龄、负债。
实测 `¥0 → ¥68,000` 采样：`4,170 / 22,445 / 39,313 / 49,679 / 58,390 / 63,781 → 68,000`。
倒扣同样平滑（`68,000 → 67,565`）。

> **归属变动**：`fc-ui.js` 原先也有一份 `countUp`，gpt-sol 的 effects-merge 代理在本轮
> 中途把它摘掉并把 dashboard 指向 `FCMotion`。现在树里只有一份实现，在 `fc-motion.js`。

### 2.2 Stagger 入场

`.fc-rise` 不再固定 delay，改为 `animation-delay: calc(var(--i, 0) * var(--stagger, 60ms))`。
`FCMotion.stagger(nodes)` 给每个节点写 `--i` 并加 `fc-rise`，`--i` 上限 12
（长列表不会越拖越慢）。

| 屏 | 节点 | 节拍 |
|----|------|------|
| era-select | 7 张年代卡 | 60ms |
| origin-select | 10 张出身卡 | 60ms |
| city-map | 5 层 strata | 70ms（`--stagger` 覆盖） |
| dashboard | 事件日志前 8 条 | 42ms |
| screens/index | 4 张入口卡 | 60ms（内联 `--i`） |

### 2.3 屏间转场

一块打了光的整幅 sheet 横扫视口，`transform: translate3d` 合成层动画（比 clip-path
更省，且前缘可以带一条霓虹光边）。

- **出场 300ms**（`cubic-bezier(.66,0,.28,1)`）→ 到时 `location.href`；
  `animationend` 与 `setTimeout(440ms)` 双保险，动画不触发也不会卡死导航。
- **入场 340ms**：`sessionStorage["fucheng.wipe"]` 记方向，落地页接着同一方向扫出去。
  **前进 = 从左往右一路走完两页**，读起来是一个动作而不是两次闪。
- **方向感知**：`index < era < origin < dashboard < city-map`；往回走 sheet 反向，
  光边从琥珀/玫红换成紫/青。
- **接入方式**：`document` 上一个委托 click，拦截同源 `a[href]`。
  自动跳过 `target=_blank`、`download`、`#锚点`、修饰键点击、`aria-disabled="true"`，
  以及任何已经 `preventDefault()` 的点击 —— 所以两个选择屏「未选就点下一步」的
  拦截逻辑照常工作，不会误跳。需要豁免的链接加 `data-no-transition`。
- `pageshow` (persisted) 清理 sheet，浏览器前进/后退回来不会留下黑幕。
- **主入口 `index.html` 未接**：它已经有 `app.js` 的 `leaveTo()` 淡出，不重复叠加。

### 2.4 全局扫描线 + 噪点罩层

`.fc-veil`（由模块注入 `<body>`，`aria-hidden`，`pointer-events:none`，`z-index:9998`，
`contain:strict`）：

- `::before` 扫描线：每 3px 一条 1px，`rgba(196,224,255,.055)` × 图层 `opacity .62`
  → **峰值 alpha ≈ 0.034**，9s 漂移一格。
- `::after` 噪点：内联 SVG `feTurbulence` 160px 平铺，**`opacity .038`**，
  `mix-blend-mode: overlay`，`steps(1)` 抖动（是闪，不是滑）。

两层都 ≤ 0.04。它盖在事件弹窗（z-index 300）之上，是刻意的 —— CRT 玻璃在最外层。

### 2.5 按压与悬停一致性

新增 §17b：所有可交互面对按压给同一个回答 —— **下沉 3%，不位移，不变色**。

- `.fc-btn` / `.fc-nav a` / `.fc-footnote a`：`scale(.97)`
- `.fc-card`：`translateY(-2px) scale(.97)`（保留 hover 的抬升）
- `.fc-zone`：`translateY(-1px) scale(.97)`
- `.fc-btn--primary`：按下时收阴影
- **禁用/锁定面不回答**（`[aria-disabled]`、`.fc-zone.is-locked` 保持不动）——
  没有反馈本身就是反馈
- 补 `:focus-visible` 描边（青色 2px），键盘与鼠标对齐
- `-webkit-tap-highlight-color: transparent` + `touch-action: manipulation`，
  移动端去掉蓝框和 300ms 延迟

---

## 3. 验收

Headless Chrome（puppeteer-core + 本机 `google-chrome`），390×844 与 1280×860 两档。

| 检查 | 结果 |
|------|------|
| 五屏 390px 横向溢出 | **0px**（`scrollWidth - clientWidth`） |
| 五屏 console error / pageerror / requestfailed | **无** |
| 罩层注入 / z-index / pointer-events | 5/5 `true` / `9998` / `none`，噪点 `opacity .038` |
| stagger 计算值 | `0s / .06s / .12s / .18s`（city-map `.07s` 步进） |
| count-up 滚动 | 首屏与 tick 均采到中间帧 |
| 转场前进 | `fc-wipe-cover-fwd` → 落地 origin-select，接 `is-in` |
| 转场返回 | `data-dir="back"` + `fc-wipe-cover-back` |
| reduced-motion | 罩层留着但不动（`animation-name: none`），`.fc-wipe` `display:none`，数字直接写值，导航直跳 |
| 存档 `fucheng.save.v1` | `eraId / originId / run` 完整，跨屏往返不丢 |

**完整闭环**（hub → 年代 → 出身 → 仪表盘 → 推进 3 月触发事件弹窗 → 城市地图）
全程零报错，存档 `E5 / O04 / months=3 / log=5`。

主入口夜景 canvas 未受影响（未改 `main.css` / `app.js`）。

---

## 4. 顺带修的

**390px 底部 actionbar 挤成一列**：标签、引文、按钮三者抢同一行，"尚未选择年代"
被压成一行一个字。760px 以下引文让位（它是气氛，不是信息），按钮吃掉释放的宽度。

---

## 5. 给后续代理的接口

```js
FCMotion.countUp(el, 12000, { prefix: "¥", suffix: "<small>/100</small>" });
FCMotion.stagger(container.querySelectorAll(".fc-card"));   // 写 --i + 加 fc-rise
FCMotion.leaveTo("dashboard.html", "fwd");                  // 手动触发转场
FCMotion.reduced();                                         // 布尔
FCMotion.format(68000);                                     // "68,000"
```

- CSS 侧：任何列表项加 `--i` 即可继承节拍；`--stagger` 可覆盖单屏步进。
- 新链接默认自动接管转场；不想要就加 `data-no-transition`。
- 新弹窗请留在 `z-index < 9998`，罩层应当盖在它上面。

## 6. 未做（留给 Round 3）

- 金钱浮字 `+¥/-¥` 飞入（P1-7，与事件弹窗的结算动画一起做更合适）
- 主入口 `index.html` 与核心屏共用同一套转场（现在各有各的离场动画）
- 地图未解锁层的磨砂锁（P1-8，属于 city-map 内容而非通用动效）
