# O1 事件弹窗 + O2 账单抽屉 — 实现规格（Round 2）

> Model slug: fable
> Agent: fable-r2-overlay-spec · Branch: `agent/fucheng-life-ui`
> 交付对象：**opus-r2-event-overlay**（按本规格实现，不需要再做设计决策）
> 依据：`round1/fable-ui-architecture.md` §2 O1/O2、§5 O-4/O-5、§6 动效 ·
> 现状代码：`games/fucheng-life/screens/dashboard.html`、`css/screens.css`、`js/screens.js`、`data/story.json`

---

## 0. 范围、文件计划与并行协调

### 0.1 新建文件（不改 screens.css / screens.js 主体）

| 文件 | 内容 | 引入位置 |
|------|------|----------|
| `games/fucheng-life/css/overlays.css` | 本文全部 O1/O2 样式 + overlay 层级令牌 | `dashboard.html` `<head>` 中，**紧跟** `screens.css` 之后 |
| `games/fucheng-life/js/fc-overlay.js` | `FC.overlay` / `FC.events` / `FC.ledger` 三个模块（挂到既有全局 `FC` 上） | `dashboard.html`，`screens.js` 之后、页内 inline script 之前 |

理由：Round 2 有两个并行代理（opus-r2-visual-polish、gpt-sol-r2-effects-merge）都会改
`screens.css`/`screens.js`。覆盖层全部收进独立文件可以零冲突合并。
`fc-overlay.js` 与代码库其余部分一致：**ES5 风格、无模块、无构建、file:// 可运行**。

### 0.2 需要改动的既有文件（仅 dashboard）

`screens/dashboard.html` 三处：
1. `<head>` 加一行 `<link rel="stylesheet" href="../css/overlays.css">`
2. `<script src="../js/fc-overlay.js"></script>`（在 `screens.js` 之后）
3. 页内 inline script 的 `tick()` / `tick6Btn` / `resetBtn` 按 §6 集成契约改造

### 0.3 令牌约定

**只消费 `screens.css` 既有令牌**（`--l1…--l5`、`--l*-deep`、`--neon-*`、`--glass`、
`--glass-hi`、`--line`、`--line-hi`、`--text*`、`--ok`、`--bad`、`--r-*`、`--ease`、
`--font*`、`--shadow-lift`），不引入架构文档的 `--fc-*` 别名（那套令牌尚未落地，
统一工作归 gpt-sol-r2-effects-merge）。`overlays.css` 顶部新增本文件私有令牌：

```css
:root {
  --z-sheet: 200;   /* O2 账单抽屉 */
  --z-modal: 300;   /* O1 事件弹窗 */
  --z-toast: 400;   /* 预留 */
  --ov-ease-out: cubic-bezier(.22, 1, .36, 1);
  --ov-t-fast: 200ms;
  --ov-t-panel: 320ms;
}
```

既有页面 z-index 都 ≤ 5（`.fc-actionbar` z=5），因此 200/300/400 安全。

---

## 1. O1 · 事件弹窗 Event Modal

### 1.1 DOM 树（完整，类名即契约）

```
body
└─ .fc-event                       ← overlay 根，position:fixed inset:0, z:var(--z-modal)
   │                                  data-layer="L1…L5"  data-type="opportunity|bill|relation|redline"
   ├─ .fc-event__scrim             ← 遮罩 + 层色 vignette（§1.3），点击行为见 §1.8
   └─ .fc-event__card              ← role="dialog" aria-modal="true"
      │                              aria-labelledby="fcEvTitle" aria-describedby="fcEvBody"
      ├─ .fc-event__accent         ← 顶部 2px 类型色条（aria-hidden="true"）
      ├─ .fc-event__head
      │  ├─ .fc-event__scene       ← 场景 chip，层色（如「L2 · 工薪层」）
      │  └─ .fc-event__badge       ← 类型角标（机遇/账单/人情/红线）
      ├─ .fc-event__face.fc-event__face--ask      ← 提问面
      │  ├─ h2.fc-event__title  #fcEvTitle        ← serif 标题
      │  ├─ p.fc-event__body    #fcEvBody         ← 正文
      │  └─ .fc-event__choices                    ← role="group" aria-label="选择"
      │     └─ button.fc-choice  × 1–4            ← §1.5
      │        ├─ .fc-choice__num                 ← 「1」…「4」mono 序号
      │        ├─ .fc-choice__label               ← 选项文案
      │        ├─ .fc-choice__cost                ← 代价标注（可省）
      │        ├─ .fc-choice__dots                ← 后果预览点（§1.6，aria-hidden）
      │        │  └─ i.fc-dot.fc-dot--{stat}.fc-dot--{s|m|l} × n
      │        ├─ span.fc-sr                      ← 「影响：现金、健康」（读屏用）
      │        └─ .fc-choice__cooling             ← 红线冷静期进度条（§1.7，仅 redline）
      └─ .fc-event__face.fc-event__face--result   ← 结果面（初始 hidden）
         ├─ p.fc-event__result                    ← 结果叙述，serif
         ├─ ul.fc-event__deltas  aria-live="polite"
         │  └─ li.fc-event__delta-row × n         ← 「现金 −¥3,000」逐条入账
         └─ button.fc-btn.fc-btn--primary.fc-event__continue  ← 「记入日志，继续 ▸」
```

最小 HTML 骨架（模块 JS 动态生成，仅示意）：

```html
<div class="fc-event" data-layer="L2" data-type="bill">
  <div class="fc-event__scrim"></div>
  <div class="fc-event__card" role="dialog" aria-modal="true"
       aria-labelledby="fcEvTitle" aria-describedby="fcEvBody">
    <i class="fc-event__accent" aria-hidden="true"></i>
    <div class="fc-event__head">
      <span class="fc-event__scene">L2 · 工薪层</span>
      <span class="fc-event__badge">账单</span>
    </div>
    <div class="fc-event__face fc-event__face--ask">
      <h2 class="fc-event__title" id="fcEvTitle">水表之后</h2>
      <p class="fc-event__body" id="fcEvBody">合租群里安静了三分钟……</p>
      <div class="fc-event__choices" role="group" aria-label="选择">
        <button class="fc-choice">
          <span class="fc-choice__num">1</span>
          <span class="fc-choice__label">平摊，把账算清</span>
          <span class="fc-choice__cost">现金 −</span>
          <span class="fc-choice__dots" aria-hidden="true"
            ><i class="fc-dot fc-dot--money fc-dot--s"></i></span>
          <span class="fc-sr">影响：现金</span>
        </button>
      </div>
    </div>
    <div class="fc-event__face fc-event__face--result" hidden>…</div>
  </div>
</div>
```

### 1.2 事件卡样式规格

| 类 | 规格 |
|----|------|
| `.fc-event` | `position:fixed; inset:0; z-index:var(--z-modal); display:grid; place-items:center; padding:16px;` 通过 `--tint` / `--tint-deep`（由 `data-layer` 对应 `.tint-l1…l5` 同款映射，直接在 JS 里 `style.setProperty` 或复用 `tint-l*` 类）注入层色；`--etint` 注入类型色（§1.4） |
| `.fc-event__card` | `width:min(560px, 100%); max-height:min(86vh, 720px); overflow-y:auto; position:relative; border-radius:var(--r-xl); padding:22px 20px 20px; background:rgba(10,15,28,.92); border:1px solid color-mix(in srgb, var(--tint) 30%, var(--line-hi)); backdrop-filter:blur(24px) saturate(140%); box-shadow:var(--shadow-lift), 0 0 60px color-mix(in srgb, var(--tint) 18%, transparent);` 390px 下实际宽 358px（16px 页边） |
| `.fc-event__accent` | `position:absolute; top:0; left:14%; right:14%; height:2px; border-radius:99px; background:linear-gradient(90deg, transparent, var(--etint), transparent); box-shadow:0 0 14px var(--etint);` 这是同屏唯一持续发光元素（发光预算 ≤3 守恒） |
| `.fc-event__scene` | 复用 `.fc-chip` 视觉：层色文字 + 层色 34% 描边 + 层色 10% 底。`font-family:var(--font-mono); font-size:11px; letter-spacing:.12em; color:var(--tint);` |
| `.fc-event__badge` | `margin-left:auto;` micro 字级 11px、`letter-spacing:.2em`、`padding:3px 10px`、pill；配色随类型（§1.4） |
| `.fc-event__title` | `font-family:var(--font-serif); font-size:24px; line-height:32px; font-weight:700; color:var(--text-hi); margin:14px 0 10px;` |
| `.fc-event__body` | `font-size:16px; line-height:26px; color:var(--text); margin:0 0 20px; max-width:36ch;`（正文用 ink 系，**不用层色写正文**） |

### 1.3 层色 vignette 遮罩

`.fc-event__scrim`：

```css
.fc-event__scrim {
  position: absolute; inset: 0;
  background:
    radial-gradient(120% 90% at 50% 108%,
      color-mix(in srgb, var(--tint) 24%, transparent), transparent 58%),
    radial-gradient(90% 60% at 50% -10%,
      color-mix(in srgb, var(--tint-deep) 55%, transparent), transparent 70%),
    rgba(4, 6, 13, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
```

- 光晕从**底部**渗入（城市在脚下），顶部用 `--tint-deep` 压暗。
- **L5 特例**（`.fc-event[data-layer="L5"] .fc-event__scrim`）：底色加深到
  `rgba(4,6,13,.88)`，第一层 radial 的 tint 占比提到 32% —— 红黑压迫感最强。
- `@supports not (backdrop-filter: blur(1px))`：去掉 blur，底色不透明度 +0.08。

### 1.4 四种事件类型样式（`data-type` 驱动）

类型色走独立自定义属性 `--etint`（与层色 `--tint` 并存：层色管场景/遮罩，类型色管角标/色条/按钮语义）：

| type | 中文角标 | `--etint` | 角标样式 | 附加行为 |
|------|---------|-----------|----------|----------|
| `opportunity` | 机遇 | `var(--neon-cyan)` | 青字 + 青 34% 描边 + 青 10% 底 | 无 |
| `bill` | 账单 | `var(--neon-amber)` | 琥珀同构 | 无 |
| `relation` | 人情 | `var(--neon-violet)` | 紫罗兰同构 | 无 |
| `redline` | 红线 | `var(--neon-blood)` | 血红同构 + `box-shadow:0 0 18px color-mix(in srgb, var(--neon-blood) 45%, transparent)` | ① 所有选项按钮转 danger/ghost 变体（§1.5）② 3s 冷静期（§1.7）③ 卡片描边改用 `--etint` 30% |

CSS 落地：`.fc-event[data-type="bill"] { --etint: var(--neon-amber); }` 四条即可，
角标/色条/冷静期全部引用 `--etint`，不写四份重复样式。

### 1.5 选项按钮 `.fc-choice`

| 属性 | 规格 |
|------|------|
| 布局 | 纵向堆叠 `display:flex; flex-direction:column; gap:10px;`（容器）；按钮内部 `display:flex; align-items:center; gap:10px; width:100%; min-height:52px; padding:12px 14px; text-align:left;`（触控 ≥44px 达标） |
| 底/描边 | `background:rgba(255,255,255,.04); border:1px solid var(--line-hi); border-radius:14px; transition:all .24s var(--ease);` |
| hover / focus-visible | `border-color:color-mix(in srgb, var(--etint) 55%, transparent); background:color-mix(in srgb, var(--etint) 10%, rgba(255,255,255,.04)); transform:translateY(-2px);` 外加 `outline:2px solid var(--neon-cyan); outline-offset:2px;`（仅 focus-visible） |
| active | `transform:scale(.98);` |
| `.fc-choice__num` | mono 11px，`width:20px; height:20px; border-radius:6px; border:1px solid var(--line-hi); display:grid; place-items:center; color:var(--text-faint); flex:none;` 对应数字键快捷键（§1.8） |
| `.fc-choice__label` | 14px/1.5，`color:var(--text-hi); flex:1; min-width:0;` |
| `.fc-choice__cost` | mono 11px，`color:var(--text-dim); flex:none;` 内容来自 payload `cost` 字符串（如 `−¥3,000` / `人情 −1` / `风险 ▲`）。风险类文案用 `color:var(--bad)` |
| redline 变体 | `.fc-event[data-type="redline"] .fc-choice { border-color:color-mix(in srgb, var(--neon-blood) 40%, transparent); }` label 色不变（正文冷静原则） |

### 1.6 后果预览点（Reigns 式）

Reigns 规则：**预告「哪些维度会动、动多大」，但不预告方向**。

- `.fc-choice__dots`：`display:flex; gap:5px; align-items:center; flex:none;`
  **常显**（移动端无 hover，不能做 hover-only）；hover/focus-visible 时
  `transform:scale(1.25)`（transition 200ms）作为桌面强化。
- 每个非零 delta 生成一枚 `i.fc-dot`，圆形填充，`opacity:.85`：

| 类 | 颜色（与 HUD `--tint` 一致） |
|----|------|
| `.fc-dot--money` | `var(--neon-amber)` |
| `.fc-dot--health` | `var(--neon-jade)` |
| `.fc-dot--social` | `var(--neon-violet)` |
| `.fc-dot--rep` | `var(--neon-cyan)` |

- 尺寸档（幅度）：`.fc-dot--s` 5px · `.fc-dot--m` 7px · `.fc-dot--l` 9px，
  `border-radius:50%; box-shadow:0 0 6px currentColor;`（用 `color:` 写点色，shadow 自动跟随）。
- **档位判定（纯函数，写进 `FC.events._bucket(stat, value, moneyRef)`）**：
  - 属性点（health/social/rep）：`|v| ≤ 3 → s`，`≤ 7 → m`，`> 7 → l`
  - 现金（¥ 绝对值）：有 `moneyRef`（调用方传入月收入）时
    `|v| ≤ 0.4·ref → s`，`≤ 1.2·ref → m`，`> → l`；无 ref 时退化为 `¥1,000 / ¥6,000` 阈值
  - payload 可用 `choice.preview:[{stat,size}]` 显式覆盖（一般不用）
- 可访问性：点容器 `aria-hidden="true"`；同 button 内追加
  `<span class="fc-sr">影响：现金、健康</span>`（仅列维度名，同样不泄露方向）。

### 1.7 红线 3 秒冷静期（仅 `data-type="redline"`）

时序（打开弹窗即开始）：

1. 所有 `.fc-choice` 加 `disabled` 属性 + `.is-cooling` 类；
   `.is-cooling { opacity:.55; cursor:not-allowed; }`（覆盖既有 `.fc-btn:disabled` 不适用，
   fc-choice 自带规则）。
2. 每个按钮内 `.fc-choice__cooling`：`position:absolute; left:0; bottom:0; height:2px;
   width:100%; background:var(--neon-blood); transform-origin:left;
   transform:scaleX(0); animation:fc-cooldown 3s linear forwards;`

```css
@keyframes fc-cooldown { to { transform: scaleX(1); } }
```

3. 卡片角标后追加倒计时文本节点 `.fc-event__badge` 内容变为「红线 · 3」，
   JS `setInterval` 每秒改成 `· 2`、`· 1`（读屏可感知；不要只做动画）。
4. 3000ms 后：移除 `disabled`/`.is-cooling`/进度条，角标复原为「红线」，
   焦点移到第一个选项按钮。
5. 冷静期内：ESC / 遮罩点击 / 数字键全部无效（§1.8 矩阵）；
   `prefers-reduced-motion`：不播 scaleX 动画，仅保留数字倒计时（冷静期是玩法与防误触机制，**不因动效偏好取消**）。

### 1.8 键盘、焦点与关闭矩阵

- 打开时：记录 `document.activeElement`（通常是 `#tickBtn`），`body` 加
  `.fc-scroll-lock { overflow:hidden; }`；焦点移到第一个可用 `.fc-choice`
  （冷静期中则移到 `.fc-event__card`，卡片带 `tabindex="-1"`）。
- **焦点陷阱**：Tab/Shift+Tab 在卡片内可聚焦元素间循环（模块内 keydown 实现，约 15 行）。
- 数字键 `1–4`：等价点击对应序号选项（disabled 时忽略）。Enter/Space：激活聚焦按钮（原生）。
- 关闭行为矩阵：

| 状态 | ESC | 点遮罩 | 说明 |
|------|-----|--------|------|
| ack 模式（无选项事件，§4.2） | 关闭=继续 | 关闭=继续 | resolve 默认结果 |
| 提问面（有选项） | 忽略 + 卡片 shake | 同左 | 事件是「中断」，必须表态 |
| 红线冷静期 | 忽略（不 shake，界面已在倒计时） | 忽略 | — |
| 结果面 | 等价「继续」 | 等价「继续」 | resolve |

shake：`@keyframes fc-deny { 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }`
240ms 一次；reduced-motion 下省略。

- 关闭时：移除节点、解锁滚动、焦点还给记录的触发元素。
- 对比度：正文 `--text` (#c8d3e8) 在 `rgba(10,15,28,.92)` 上 ≈ 10:1，达标。

### 1.9 结果面与动效

选择后（choice 点击）：

1. 提问面 `--ask` 淡出（opacity→0, translateY(-8px), 200ms），置 `hidden`；
   结果面 `--result` 取消 `hidden`，淡入（opacity 0→1, translateY(8px)→0, 240ms）。
   **不做 3D flip**（架构允许降级；flip 留作 Round 3 可选加分）。
2. `.fc-event__result`：serif 14.5px/1.8，`color:var(--text)`; 顶部加 1px 渐变分隔线（复用 `.fc-hr` 规格）。
3. `.fc-event__delta-row` 逐条入账：`animation:fc-rise .4s var(--ease) both;
   animation-delay:calc(var(--i) * 90ms);`（`--i` 由 JS 内联下标）。
   行内容 mono 12.5px：`现金 −¥3,000`，正 `color:var(--ok)` 负 `color:var(--bad)`；
   金额若存在 `FC.fx.countUp`（visual-polish/effects-merge 产出）则调用做 400ms 滚动，
   **不存在则直接落值**（软依赖，不得报错）。
4. 「记入日志，继续 ▸」按钮：复用 `.fc-btn.fc-btn--primary`，全宽，点击 resolve + 关闭。

入场动效（打开时）：scrim `opacity 0→1` 200ms；卡片
`opacity 0→1, scale(.96) translateY(12px)→none` 320ms `var(--ov-ease-out)`。
关闭：反向 200ms。

**`prefers-reduced-motion: reduce`**：screens.css 已有全局动画时长压到 0.001ms 的规则，
`overlays.css` 无需重复；只需保证 ① 冷静期倒计时走 JS 文本不受影响
② delta 行不依赖动画结束事件（用 `setTimeout` 兜底 resolve 时序）③ shake 不播。

### 1.10 ASCII 线框（390px）

提问面（bill 类型，L2 事件）：

```
┌──────────── 390px ─────────────┐
│░░ scrim: ink@78% + L2 蓝灰光晕 ░░│
│░░       自底部向上渗入        ░░│
│  ┌───────── 358px ──────────┐  │
│  │━━━━━ 琥珀色 accent 2px ━━━│  │
│  │ [L2 · 工薪层]      〔账单〕│  │
│  │                           │  │
│  │ 水表之后                  │  │ ← serif 24px
│  │                           │  │
│  │ 合租群里安静了三分钟，随后 │  │ ← 16/26
│  │ 每个人都算出自己该付的那一 │  │
│  │ 份。城市把亲密切成精确的小 │  │
│  │ 数。                      │  │
│  │                           │  │
│  │ ┌───────────────────────┐ │  │
│  │ │[1] 平摊，把账算清      │ │  │
│  │ │        −¥120      ●   │ │  │ ← 琥珀点(s)
│  │ └───────────────────────┘ │  │
│  │ ┌───────────────────────┐ │  │
│  │ │[2] 这次我请，别算了    │ │  │
│  │ │     −¥480       ● ●   │ │  │ ← 琥珀(m)+紫(s)
│  │ └───────────────────────┘ │  │
│  └───────────────────────────┘  │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────┘
```

红线冷静期（L5 事件，按钮禁用中）：

```
│  ┌───────── 358px ──────────┐  │
│  │━━━━━ 血红色 accent 2px ━━━│  │
│  │ [L5 · 暗流]     〔红线 · 2〕│ ← 倒计时在角标里
│  │ 潮汐线下的借据             │  │
│  │ 熟人介绍了一笔「稳赚」的短  │  │
│  │ 期周转，年化写在纸巾上。   │  │
│  │ ┌───────────────────────┐ │  │
│  │ │[1] 签字        ● ● ●  │ │  │ ← 55% 透明度
│  │ │▂▂▂▂▂▂▂▂░░░░░░░░░░░░░░░│ │  │ ← 2px 红条充能中
│  │ └───────────────────────┘ │  │
│  │ ┌───────────────────────┐ │  │
│  │ │[2] 把纸巾还给他   ●    │ │  │
│  │ │▂▂▂▂▂▂▂▂░░░░░░░░░░░░░░░│ │  │
│  │ └───────────────────────┘ │  │
│  └───────────────────────────┘  │
```

结果面：

```
│  ┌───────── 358px ──────────┐  │
│  │ [L2 · 工薪层]      〔账单〕│  │
│  │ ────────────────────────  │  │
│  │ 你把明细发进群里。没有人   │  │ ← serif 结果叙述
│  │ 回复，但每个人都转了账。   │  │
│  │                           │  │
│  │  现金  −¥120              │  │ ← 逐条入账 90ms 间隔
│  │  人脉  +2                 │  │
│  │ ┌───────────────────────┐ │  │
│  │ │   记入日志，继续 ▸     │ │  │ ← fc-btn--primary 全宽
│  │ └───────────────────────┘ │  │
│  └───────────────────────────┘  │
```

---

## 2. O2 · 账单抽屉 Ledger Sheet

### 2.1 DOM 树

```
body
└─ .fc-sheet                        ← fixed inset:0, z:var(--z-sheet)
   ├─ .fc-sheet__scrim              ← rgba(4,6,13,.6)，无层色 vignette（账单是中性仪式）
   └─ .fc-sheet__panel              ← role="dialog" aria-modal="true" aria-label="本月账单"
      ├─ .fc-sheet__grip            ← 36×4px 圆条把手（aria-hidden）
      ├─ header.fc-sheet__head
      │  ├─ h2.fc-sheet__title      ← 「账单日 · 2021.04」（mono 年月）
      │  └─ p.fc-sheet__caption     ← 固定锚文案「账单比闹钟准时。」serif
      ├─ ul.fc-ledger
      │  ├─ li.fc-ledger__row × n   ← 名目 + caption 说明 + 右对齐 mono 金额
      │  └─ li.fc-ledger__row.fc-ledger__row--income   ← 月收入行（正数、--ok 色）
      ├─ .fc-ledger__total          ← 「本月净流」+ num-xl mono 大数
      └─ button.fc-btn.fc-btn--primary.fc-sheet__done  ← 「结清，继续 ▸」
```

### 2.2 样式规格

| 类 | 规格 |
|----|------|
| `.fc-sheet__panel` | `position:absolute; left:0; right:0; bottom:0; margin:0 auto; max-width:560px; max-height:78vh; overflow-y:auto; border-radius:var(--r-xl) var(--r-xl) 0 0; padding:10px 20px calc(20px + env(safe-area-inset-bottom)); background:rgba(11,17,32,.9); border:1px solid var(--line-hi); border-bottom:0; backdrop-filter:blur(20px) saturate(140%); box-shadow:0 -26px 70px rgba(0,0,0,.6);` |
| `.fc-sheet__grip` | `width:36px; height:4px; border-radius:99px; background:var(--line-hi); margin:2px auto 12px;` |
| `.fc-sheet__title` | mono 部分 `font-family:var(--font-mono)`；整体 16px/700，`color:var(--text-hi)` |
| `.fc-sheet__caption` | `font-family:var(--font-serif); font-size:12px; color:var(--text-faint); margin:4px 0 14px;` 文案固定，不接受 payload 覆盖 |
| `.fc-ledger__row` | `display:flex; align-items:baseline; gap:10px; padding:9px 0; border-bottom:1px dashed rgba(140,165,214,.14); font-size:13px;` 名目 `color:var(--text)`；说明（可省）caption 11px `color:var(--text-faint)`；金额 `margin-left:auto; font-family:var(--font-mono); color:var(--bad);` 支出显示 `−¥1,234` |
| `--income` 变体 | 金额 `color:var(--ok)`，显示 `+¥…` |
| `.fc-ledger__total` | `display:flex; justify-content:space-between; align-items:baseline; padding:14px 0 16px;` 左「本月净流」11px `letter-spacing:.2em`；右 mono 28px/700，正 `--ok` 负 `--bad`，`text-shadow:0 0 26px color-mix(in srgb, currentColor 40%, transparent)` |
| `.fc-sheet__done` | 全宽 |

### 2.3 滑入动画（唯一指定实现）

```css
.fc-sheet__scrim  { animation: fc-fade-in var(--ov-t-fast) ease-out both; }
.fc-sheet__panel  { animation: fc-sheet-up var(--ov-t-panel) var(--ov-ease-out) both; }

@keyframes fc-fade-in  { from { opacity: 0; } }
@keyframes fc-sheet-up { from { transform: translateY(100%); } }
```

- 关闭：JS 加 `.is-closing`，panel `translateY(0)→100%` 240ms `ease-in`、
  scrim 淡出 200ms，`animationend`（+ `setTimeout` 260ms 兜底）后移除节点。
- **划账入场**：`.fc-ledger__row` 复用 `fc-rise`，`animation-delay:calc(var(--i)*90ms)`，
  自上而下逐行；金额有 `FC.fx.countUp` 则 400ms 滚动到位（软依赖同 §1.9）。
- 总计行 delay = 行数×90ms + 120ms，入场时 `fc-flash`（screens.css 既有）闪一次。
- reduced-motion：全局规则已把动画压平，无需额外处理。
- 手势下滑关闭：**不做**（Round 3）；关闭途径 = 按钮 / ESC / 点 scrim。

### 2.4 ASCII 线框（390px）

```
┌──────────── 390px ─────────────┐
│░░░░░░ scrim: ink@60% ░░░░░░░░░░│
│░░  （上方仪表盘被压暗可见）  ░░│
│┌───────────────────────────────┐
││            ▬▬▬▬               │ ← grip
││ 账单日 · 2021.04              │
││ 「账单比闹钟准时。」           │ ← serif caption
││ ─────────────────────────────  │
││ 房租        合租主卧   −¥2,208 │ ← 90ms 逐行划账
││ 通勤                    −¥384 │
││ 伙食                  −¥1,056 │
││ 人情        婚宴红包    −¥672 │
││ 杂费                    −¥480 │
││ 还贷        月供利息     −¥63 │
││ 月收入                +¥6,400 │ ← --ok 绿
││                               │
││ 本月净流              +¥1,537 │ ← 28px mono，flash 一次
││ ┌───────────────────────────┐ │
││ │      结清，继续 ▸          │ │
││ └───────────────────────────┘ │
│└───────────────────────────────┘ ← 贴底，顶角 30px 圆角
└─────────────────────────────────┘
```

### 2.5 O2 a11y

- `role="dialog" aria-modal="true" aria-label="本月账单"`；打开即焦点到 panel
  （`tabindex="-1"`），焦点陷阱同 O1（共用 `FC.overlay` 的 trap 工具）。
- ESC / scrim 点击 / 「结清 继续」均关闭并 resolve；关闭还焦点、解滚动锁。
- 金额行是纯文本，读屏天然可读；总计行加 `aria-live="polite"`。

---

## 3. JS API（`js/fc-overlay.js`）

全部挂在既有全局 `FC` 上（`screens.js` 已建 `window.FC`）。三个子模块：

### 3.1 `FC.overlay` — 栈管理器（内部工具，也可被后续 O3/O4 复用）

```
FC.overlay.push(kind, rootEl)   // kind: "modal"|"sheet"；设 z、锁滚动、记录还焦点目标
FC.overlay.pop(rootEl)          // 移除、栈空则解锁滚动 + 还焦点
FC.overlay.top()                // 返回栈顶 {kind, rootEl} 或 null
FC.overlay.trap(rootEl, e)      // Tab 循环工具（keydown 处理器内调用）
```

规则：
- z-index 由 kind 决定（`--z-modal`/`--z-sheet` 常量），**不做动态递增**；
  同 kind 同时只允许 1 个实例（重复 push 同 kind 视为编程错误，console.warn 并拒绝）。
- modal 永远压在 sheet 之上（300 > 200），两者可共存但本轮不出现共存场景。
- 全局 `keydown` 只有一个监听器，事件分发给栈顶 overlay。

### 3.2 `FC.events` — O1

```
FC.events.show(payload, opts?) -> Promise<result>
FC.events.close()              -> void   // 强制关闭 + 清空队列（重开人生用）
```

- **`payload` 契约**（唯一数据入口，overlay 不读 story.json、不碰 run 状态）：

```js
{
  id:    "EV03",                      // 必填，日志/去重用
  type:  "opportunity",               // 必填：opportunity|bill|relation|redline
  layer: "L2",                        // 必填：L1…L5，驱动 --tint 与场景 chip
  scene: "L2 · 末班地铁",              // 可选；缺省 = `${layer} · ${FC.LAYERS 层名}`
  title: "末班地铁",                   // 必填
  body:  "末班车关门前，你收到一句…",   // 必填
  choices: [                          // 可选；缺省/空数组 → ack 模式（§4.2）
    {
      id: "obey",                     // 必填
      label: "回一句「好」",           // 必填
      cost: "健康 −",                 // 可选，纯展示字符串
      deltas: { money: 0, health: -6, social: 0, rep: 2 },  // ¥绝对值 + 属性点
      result: "你改到凌晨两点。地铁末班车没有等你。",         // 必填（有 choices 时）
      preview: [{stat:"health",size:"m"}]   // 可选，覆盖自动档位
    }
  ]
}
```

- `opts = { moneyRef: number }`：现金档位参照（调用方传 `income()`，见 §1.6）。
- **resolve 值**：`{ choiceId, deltas, event, dismissed }`
  - 正常选择：`{ choiceId:"obey", deltas:{health:-6,rep:2}, event:payload, dismissed:false }`
    （deltas 已剔除 0 值键）
  - ack 模式关闭：`{ choiceId:null, deltas:{}, event:payload, dismissed:false }`
  - `FC.events.close()` 强关：`{ …, dismissed:true }`（调用方据此丢弃，不入日志）
- **排队**：已有事件打开时再调 `show` → 入 FIFO 队列，前一个 resolve 后自动弹下一个，
  各自的 Promise 按序 resolve。本轮 dashboard 实际不会排队（§6 保证），但 API 层面必须安全。
- **职责边界**：overlay **只做 UI**，绝不改 `run`、绝不写 localStorage；
  deltas 的入账由 dashboard 在 `.then` 里完成。这样 O1 可无痛复用到 city-map。

### 3.3 `FC.ledger` — O2

```
FC.ledger.show(payload) -> Promise<void>
FC.ledger.close()       -> void
```

```js
payload = {
  ym: "2021.04",                              // 必填，标题年月
  rows: [ { label:"房租", note:"合租主卧", amount:-2208 }, … ],  // 支出为负数
  income: 6400,                               // 必填，生成 --income 行
  net: 1537                                   // 必填，总计行（正负决定配色）
}
```

金额格式化统一 `(v<0?"−":"+") + "¥" + Math.abs(v).toLocaleString("zh-CN")`
（与 dashboard 既有 `fmt` 一致，注意负号用 U+2212「−」，跟现有 UI 对齐）。

---

## 4. story.json 适配（数据从哪来）

### 4.1 事件源与兜底链

1. 首选 `FC.story`（gpt-sol-r2-story-wire 产出的 loader）拿 `sampleEvents`；
2. loader 不存在 → `fetch("../data/story.json")`（相对 screens/ 目录）try/catch；
3. fetch 失败（file:// 跨源）→ 模块内置 `SEED`：EV02、EV03、EV09 三条的完整拷贝。

### 4.2 `category` → `type` 映射 + 无选项事件

story.json 的 `sampleEvents` 只有 `category`（中文）与叙事文本、**没有 choices**。适配规则：

| story.json `category` | O1 `type` |
|---|---|
| 机会 | `opportunity` |
| 金钱、生计、居住 | `bill` |
| 人情、关系 | `relation` |
| 风险 | `redline` |
| 职场、教育、城市及未知值 | `opportunity`（兜底） |

- `layerId` → `layer` 直通；`title/text` → `title/body`。
- **choices 补齐**：opus-r2-event-overlay 在 `fc-overlay.js` 内维护
  `CHOICES = { EV01:[…], EV02:[…], … }`（按 §3.2 choice 结构，每事件 2–3 项，
  文案冷静克制、遵循 STORY_EXTRACT 语气；EV09 为 redline 范式，参考 §1.10 线框文案）。
  不改 story.json（未来 story.json 若自带 `choices` 字段则直通、跳过本表）。
- 查无 CHOICES 的事件 → **ack 模式**：渲染单个全宽按钮「继续 ▸」
  （`.fc-choice` 样式复用，无 dots/cost），resolve 空 deltas —— 叙事氛围事件照样有仪式感。

---

## 5. 需要的属性色别名

dashboard 的 delta 键为 `money/health/social/rep`，O1 结果面行名映射沿用页内现有
`nameMap`：现金/健康/人脉/声望。`fc-overlay.js` 内自带一份该映射（模块独立可用）。

---

## 6. dashboard `tick()` 集成契约

### 6.1 触发节奏（弹窗事件 vs 日志事件）

现有 `POOL` 日志流事件**保持不动**（每月照常一条进日志）。弹窗事件是叠加的一层：

- run 状态新增 `run.sinceModal`（number，freshRun 时 = 1）、`run.lastRedline`（months 值）。
- 每次 tick 末尾：`run.sinceModal++`，然后查表掷骰：

| `min(sinceModal, 4)` | 弹窗概率 |
|---|---|
| 1 | 0（新档前 1 个月不打扰） |
| 2 | 0.45 |
| 3 | 0.65 |
| 4 | 1.0（保底，最迟第 4 个月必弹） |

命中 → 从适配后的 sampleEvents 均匀抽一条（排除 `run.recentModal` 最近 3 个 id），
`run.sinceModal = 0`。该表保证验收门禁「推进 ≥3 次可触发 ≥1 次」（3 个月内命中率 ≈ 0.81，
4 个月 100%）。

- **redline 闸门**：抽中 redline 事件时，若 `run.months < 6` 或距 `run.lastRedline`
  不足 12 个月 → 重抽一次非 redline；命中后记 `run.lastRedline = run.months`。

### 6.2 tick 改造（伪代码，函数边界即契约）

现 `tick()` 是同步函数；弹窗是异步的。拆分如下：

```js
function tick(silent) {                    // silent=true 用于快进中间月
  advanceCalendar();                       // 现有：months/month/year/age
  applyPoolEvent();                        // 现有：pick() + delta 入账 + 写日志
  settleMonth();                           // 现有：income/bills/debt/health 结算
  render(true); renderLog();

  var ev = maybePickModalEvent();          // §6.1 规则，多数月份返回 null
  if (!ev) { maybeShowLedger(silent); return Promise.resolve(false); }

  return FC.events.show(toPayload(ev), { moneyRef: income() })
    .then(function (res) {
      if (res.dismissed) return true;
      applyChoiceDeltas(res.deltas);       // money 直接 ±¥；属性 clamp 0–100
      pushModalLog(ev, res);               // 复用 run.log 结构：tag=类型中文名，
                                           // tint=var(--l*)，text=选中 choice 的 result
      render(true); renderLog();
      maybeShowLedger(silent);
      return true;                         // true = 本月弹过窗
    });
}
```

要点：
- `FC.events.show` 的 deltas 由 **dashboard** 入账（overlay 不碰状态，§3.2）。
- `applyChoiceDeltas` 里 money 是 ¥ 绝对值（不同于 POOL 的 `d.money × scale` 倍数制）——
  CHOICES 表里直接写具体金额，冷静叙事需要具体数字。
- 弹窗结算后 `FC.write({run:run})` 已含在 `render()` 内，无需另存。

### 6.3 O2 触发规则 `maybeShowLedger(silent)`

```
if (silent) return;                        // 快进中间月不弹
if (run.months === 1                       // 入城首月：教学性展示
    || run.income < 0                      // 净流为负：氧气告警月
    || run.month === 12)                   // 年末：年度仪式
  FC.ledger.show(buildLedgerPayload());    // rows 来自现有 bills()，income=income()，net=run.income
```

另在「本月账单」面板底部加一个 `.fc-btn.fc-btn--ghost`「查看结算单」手动触发
（随时可看，id `ledgerBtn`）。

### 6.4 快进（`tick6Btn`）与重开（`resetBtn`）

- 快进 6 月：**串行**执行 `tick(silent)`，一旦某月返回「弹过窗」→ **终止剩余月份**，
  并向日志插一条系统行：「快进被一件事打断。」（tag=系统，tint=`var(--text-faint)`）。
  实现：`months.reduce((p) => p.then(...), Promise.resolve())` 链式即可，禁止并发 6 个 tick。
  最后一个实际执行的月份 `silent=false`（允许它弹 ledger）。
- 重开人生：先 `FC.events.close(); FC.ledger.close();` 再走现有 freshRun 流程
  （防止 pending Promise 悬挂后污染新档）。

---

## 7. 验收清单（opus-r2-event-overlay 自测）

- [ ] 390px：O1 卡片无横向溢出；选项按钮 ≥44px 高；O2 贴底含 safe-area
- [ ] 推进 ≤4 个月必出一次弹窗；弹窗期间背景不可滚动、Tab 不逃逸
- [ ] 四种 type 角标/accent 颜色正确；L5 事件遮罩明显更暗更红
- [ ] redline：3s 内按钮不可点、倒计时数字可见、ESC 无效；3s 后焦点落第一个选项
- [ ] 后果点：只显示维度与幅度，不显示方向；读屏可听到「影响：现金、健康」
- [ ] 选择后结果面 delta 逐条入账并与 HUD 实际变化一致；关闭后焦点回「推进一个月」
- [ ] ack 模式事件（无 CHOICES 的 id）单按钮可关，ESC/遮罩也可关
- [ ] O2：滑入 320ms、逐行划账、净流总计色语义正确；「账单比闹钟准时。」在标题下
- [ ] 快进 6 月遇弹窗即中断且无并发弹窗；重开人生瞬间关闭一切 overlay 无报错
- [ ] `prefers-reduced-motion`：无位移/缩放动画，冷静期倒计时仍工作，流程可完整走通
- [ ] file:// 打开：story.json fetch 失败时 SEED 兜底，console 无未捕获错误

---

*fable-r2-overlay-spec · Round 2 · 《浮城人生》URBAN LIFE SIMULATOR*
