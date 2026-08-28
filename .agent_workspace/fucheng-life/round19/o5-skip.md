# R19-O5 · CSS SKIP 说明

- Lane: R19-O5（opus-fast），可写路径「CSS skip 或推荐角标副文案（可选）」
- 结论：**本轮不改 CSS，也不改 `fc-career.js` 的 lede 文案**。
- 审计基准：`2aa5cc0 docs(r19): dispatch career dismiss + §40 wording`（O1 的 cancelable 尚未落盘，下面按派工书的目标语义审）

## 一、为什么 cancelable 不需要新 CSS

O1 要做的是 `showPicker({ cancelable: true })` 时 Esc/遮罩 `resolve(null)`，O2 要做的是 `maybeOfferCareerTrack({ manual: true })` 对 null 早退。两处都是控制流：

- `fc-career.js:81` 的 `onKey` 与 `:92` 的 scrim click 现在都调 `finish(hint)`，改成按 `opts.cancelable` 决定传 `hint` 还是 `null`，DOM 结构一字不动；
- `dashboard-app.js:1116` 的 `.then` 里加一条 `if (!id) return false`，同样不产生新节点。

没有新 `className`、没有新 `id`、没有需要收起的元素，现有 `.fc-career-pick*`（`fc-gameplay.css:1113-1158`）原样够用。

手动入口本身 R18 就已经画好了：`renderCareerPickBtn()`（`dashboard-app.js:539`）只切 `btn.hidden`，`fc-gameplay.css:485` 的 `.fc-dash-tools .fc-btn[hidden] { display: none !important }` 负责真收起；`:610` 的窄屏隐藏名单只有 `#tickBtn / #tick6Btn / #resetBtn`，`#careerPickBtn` 不在里面，390px 下仍可点。取消后按钮会随 `needsPick` 仍为 true 而继续显示——这正是「关掉就当没发生过」想要的效果，无需额外样式表达。

## 二、为什么不给 lede 加「点遮罩可关闭」这句

派工书把它标成可选，我建议明确否掉，理由不止「改 `fc-career.js` 会和 O1 抢文件」：

1. **同一份 lede 服务两种语义**。`showPicker` 的 lede 是写死在 JS 里的一个字符串，boot 自动流（不可取消，Esc/遮罩 = 接受推荐轨）和手动流（可取消）共用它。要加提示就得按 `opts.cancelable` 分叉文案，等于在 O1 正在改的那几行里再插一层条件，收益远小于冲突风险。
2. **玩家真正需要知道的是「关掉会发生什么」，不是「能不能关」**。自动流里关掉 = 直接采用推荐轨（有后果），手动流里关掉 = 什么都不发生。这两句话如果都要说清楚，是两行副文案，属于 F2 体验清单该先定调的事，不该由 CSS lane 顺手塞。
3. 现状不算无提示：手动流下面板是玩家自己点「选择轨道」翻开的，Esc 关面板是全局约定（`FC.overlay` 所有 modal 同款），`fc-career-pick__scrim` 也和其他弹窗一样铺满可点。

## 三、考虑过但驳回的三个 CSS 方案

| 方案 | 驳回原因 |
|---|---|
| `.fc-career-pick__scrim { cursor: pointer }` 暗示可点关闭 | **`.fc-career-pick` 这套皮是共用的**：`dashboard-app.js:1137` 的闯城主目标选择卡（`maybeOfferChallengeGoal`）直接复用了 `fc-career-pick` / `__scrim` / `__panel` / `__grid` / `fc-career-card`，而它的 click 只挂在 `[data-goal]` 上，点遮罩**没有**任何反应。加了 `cursor: pointer` 等于在一张真的关不掉的卡上撒谎。要做也得先给可取消态一个专属修饰类，那就不是纯 CSS 了。 |
| 给面板加一个「×」角标按钮 | 需要 JS 建节点 + 绑事件，落在 O1 的文件里。 |
| 推荐角标（`__rec`）补一行「按 Esc 直接选它」副文案 | 同样只在自动流成立，手动流里 Esc = 放弃，说反了。 |

## 四、留给后续 lane 的观察（本轮不动手）

1. **`.fc-career-pick__panel` 没有卡片底色**（`fc-gameplay.css:1130` 只有 `position/width/padding/border-radius`）。对照 `.fc-contract-pick__panel`（`fc-contract.css:198`）有 `--fc-glass-2-bg` + 描边 + `--shadow-lift`。选轨卡的正文是直接压在 `rgba(2,6,16,0.72)` + `blur(6px)` 的遮罩上的，读得清但和全局玻璃卡语言不一致；`__title` / `__lede` 也没有任何规则，吃的是浏览器默认 `h2` / `p` 样式（默认外边距 + 继承色）。这是 R6 起就存在的旧账，不是 R19 引入的。
2. **`is-open` / `is-closing` 是一对空钩子**。`fc-career.js:71` 加 `is-closing`、`:98` 加 `is-open`，然后 `:78` 等 180ms 才 `resolve`，但 CSS 里 `.fc-career-pick.is-open` / `.is-closing` 一条规则都没有（对比 `fc-contract.css:212` 的 `.fc-contract-pick.is-open .fc-contract-pick__panel { transform: none }`）。也就是说：面板瞬间出现，关闭时原样杵满 180ms 再消失。R19 让手动流可以随手关，这个「关不掉的 180ms」会比以前更容易被摸到。修法是纯 CSS（`__panel` 一个 `opacity/transform` 过渡 + `prefers-reduced-motion` 分支），但它会改动「关闭手感」这一格，应等 F2 的 playfeel 结论落定、并和第 1 条的卡片底色一起做，避免在语义轮里夹带视觉改动。
3. 上面两条要动，建议合并成一个「选轨/闯城选择卡视觉对齐合约卡」的独立 CSS 轮次；两张卡共用 class，一次改双份收益，也能顺手给可取消态留出专属修饰类的位置。
