# R20-O5 · ≤640px 选择卡可见性核对（CSS SKIP）

- Lane: R20-O5（opus-fast），可写路径「390px 可见性 skip 或微调」
- 结论：**本轮不改 CSS**。≤640px 下 `.fc-career-pick` 既没有溢出视口，也没有被底部 dock 遮挡。
- 审计基准：`518bb3c feat(r20): career-pick open/close motion and glass`（O1 已落盘，含 `max-height: 92vh; overflow: auto`）
- 方法：headless Chrome 真页实测 `screens/dashboard.html`。选轨卡用开局自动弹出的那一张（走完整
  `showPicker` + `FC.overlay.push`），闯城卡按 `dashboard-app.js:1136` 的 markup 复刻后同样 `push`。
  逐视口量 `getBoundingClientRect` + `elementFromPoint` 命中测试。

## 一、量出来的数（portrait，除最后一行）

面板内容高在 ≤640px 各宽度上是常数 **523px**（选轨）/ **523px**（闯城，blurb 两行），
卡片不会因为更窄而多折行，所以「宽度」这一维基本不参与溢出判定，**决定一切的是视口高度**。

| 视口 | 面板盒高 | `92vh` 上限 | 视口裁切 上/下/左/右 | 面板内滚动隐藏 | dock 遮挡 |
|---|---|---|---|---|---|
| 640×900 | 525.3 | 828 | 0 / 0 / 0 / 0 | 0 | 否 |
| 430×932 | 525.3 | 857 | 0 / 0 / 0 / 0 | 0 | 否 |
| 414×896 | 525.3 | 824 | 0 / 0 / 0 / 0 | 0 | 否 |
| 390×844 | 525.3 | 776 | 0 / 0 / 0 / 0 | 0 | 否 |
| 375×667 | 525.3 | 614 | 0 / 0 / 0 / 0 | 0 | 否 |
| 360×640 | 525.3 | 589 | 0 / 0 / 0 / 0 | 0 | 否 |
| 320×568 | 522.5 | 522.6 | 0 / 0 / 0 / 0 | 24（选轨）· 82（闯城） | 否 |
| 640×360 横屏 | 331.2 | 331.2 | 0 / 0 / 0 / 0 | 194（选轨）· 172（闯城） | 否 |

- **横向**：`__panel` 是 `width: min(520px, 100%)`，装在 `padding: 16px` 的 host 里，320px 上量到
  288px，`clipLeft/clipRight` 全程 0。卡片自身 `padding: 14px 16px`，最窄处内容宽 246px，中文不出血。
- **纵向**：390px 档位面板上下各留 159px 余量，离「顶到边」还很远。真正吃满 `92vh` 的只有
  320×568 和横屏两档，而那正是 O1 这轮加的 `max-height + overflow: auto` 接住的场景——
  R19 基线（无 max-height）在这两档会直接把卡片顶出视口且滚不回来，现在退化成面板内滚动。

## 二、dock 没挡，而且挡不了

| 事实 | 出处 |
|---|---|
| dock 是 `position: fixed; bottom: 0; z-index: 90`，≤640px 下高 116.7px | `fc-gameplay.css:590-602` |
| picker host 被 `FC.overlay.push("modal", host)` 写上 **inline `z-index: 300`** | `fc-events.js:102` |
| 打开任一 overlay 时 `body.fc-scroll-lock { overflow: hidden }` | `fc-events.js:103` + `fc-events.css:17` |

命中测试佐证：在 dock 几何中心 `elementFromPoint`，640/430/414/390/375 档拿到
`fc-career-pick__scrim`，360 档拿到 `fc-career-pick__panel`，320 与横屏档拿到 `fc-career-card`
——**没有任何一档拿到 `fc-dock*`**。也就是说 dock 不但没盖住面板，反过来它整条都在遮罩之下、
点不到，这正是 modal 该有的样子（玩家在选轨时不该还能点「上班」）。

顺带确认 `body` 已被 scroll-lock，面板内滚动不会把背后的仪表盘一起带着走，
所以 `overscroll-behavior: contain` 这一条**不需要**补。

## 三、为什么不顺手改一行

考虑过三个「就一行」的改动，逐个否掉：

| 想法 | 否掉理由 |
|---|---|
| host `padding` 补 `var(--safe-b)` | 390×844 上面板底边离屏幕底 159px，横屏档也有 14px + 遮罩，今天没有任何一档会压到 home indicator。加了只是让「本来就够」的余量更大，属于无症状改动。 |
| `__panel` 补 `overscroll-behavior: contain` | 上面第二节：`fc-scroll-lock` 已经把 `body` 锁死，没有可被牵连的滚动容器。 |
| `.fc-career-pick` 的 `z-index: 320` 改回 300 对齐合约卡 | 见下面第四节第 3 条——这条声明本来就是死的，改它是纯 no-op。 |

另外这三处全都落在 O1 刚写完的 `.fc-career-pick` / `__panel` 块里。即便 O1 已合入本分支，
在同一轮同一段里塞无症状改动，只会让 F3 的验收 diff 变噪音。

## 四、留给后续 lane 的观察（本轮不动手）

1. **`vh` 在移动端量的是「工具栏收起」的大视口，`position: fixed` 量的是小视口——这对不齐。**
   iOS Safari / Chrome Android 的 `vh` 不随地址栏收放变化，而 `.fc-career-pick` 是 fixed，
   它的可视高度会随工具栏缩水。构造一次实测（可视高 454px，`92vh` 仍按 568px 算 = 522.56px）：
   面板变成 522.5px 高，被 `place-items: center` 居中后**上下各被切掉 34.3px**，
   顶部的 `CAREER TRACK` 眉标和底部最后一张卡同时缺角，而且**滚不回来**——
   面板自己的 `overflow: auto` 只能滚它内部的内容，救不了它自身被顶出屏幕的上下边。
   横屏档（可视 300px / `vh` 按 360px 算）同样切掉 15.6px。
   验证过的修法是 `max-height: calc(100dvh - 32px)`（`dvh` 跟随工具栏），实测两档裁切都归零。
   **但这不是 R20 引入的，也不是选轨卡独有的**：`fc-contract.css:201` 同款 `92vh`，
   `fc-events.css:87/604/1009`、`fc-ledger.css:34/189`、`fc-gameplay.css:445/731` 全是 `vh`，
   全仓一个 `dvh` 都没有。只给选轨卡换单位，等于让它和另外七处弹窗的口径不一致。
   建议开一个「全站弹窗视口单位统一到 `dvh`」的独立轮次，一次性换掉并补一条回归断言，
   而不是由本轮 O5 顺手改一张卡。
   触发门槛也要说清楚：需要「内容高 > 工具栏收起后的可视高」，即可视高 < 约 525px。
   390×844 的 Safari 收起工具栏后可视约 745px，够宽裕；真正会中招的是 320×568 一类的老机型和横屏。

2. **320×568 上闯城卡藏了 82px，是所有档位里最大的一处。** 82px 差不多正好是第四张卡
   「攒够首付」的 blurb 加半张卡身——玩家看到的是一张被切一半的卡，靠它自己当滚动提示。
   截图确认过：切口在卡的正中，读得出「还有东西」，不算无提示，但也谈不上好。
   真要抬，杠杆不在 `__panel`（它已经在 `92vh` 顶格了），而在 ≤640px 下把
   `.fc-career-card` 的 `padding: 14px 16px` 和 `span` 的行高压一档，或者把 blurb 在窄屏截断。
   这属于「改文案密度」而不是「修溢出」，应由 F2 的 playfeel 定调后再动。

3. **`.fc-career-pick { z-index: 320 }` 是条死声明。** 两个调用点
   （`fc-career.js:107`、`dashboard-app.js:1151`）都走 `FC.overlay.push`，而 push 无条件写
   inline `el.style.zIndex = 300`，行内样式永远压过样式表。所以实际层级是 300，
   和 `.fc-contract-pick` 完全同级——本来想要的「选轨卡比合约卡高 20 层」并不存在。
   目前没有两张卡同时开的路径（`showPicker` 开头就挡了 `FC.events.isOpen()`），
   所以这是审计噪音不是 bug；哪天真要靠 CSS 分层，得先让 `push` 别写死 300。
