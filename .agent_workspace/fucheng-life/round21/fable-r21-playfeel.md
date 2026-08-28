# R21 体验风险清单 · 焦点 trap 闭合 + 闯城 Esc 反馈（playfeel）

> 作者：R21-F2（fable）。只读现码后的体验风险盘点，不改游戏代码。
> 对照代码状态：分支 `cursor/fucheng-r21-focus-trap-fa72` 快照 @ `a2a199d` ——
> O5 reduce 硬化（`ee90bb7`）、O4 选轨日志中文名（`bb40db0`）、O3 pulse 动效（`04f15cb`）、
> O2 Esc 回音 + lede（`2b627f3`，`96d467b` 补丁）、O1 trap 闭合（`12d7a13`）、
> G2 §44（`5a8d81c`，未勾）、G1 测试 + runner（`1a46b58`）、F1 门禁（`a2a199d`）皆已落盘。
> 快照时 `./scripts/run-fucheng-life-tests.sh` **32 项全绿**（本机复跑确认）。
> 本文任务：对照 round20/fable-r20-playfeel.md 的 R1–R3 做销案判定，
> 审 trap 是否还有漏角、Esc shake 吵/弱、lede 是否够、选轨日志中文是否到位。

共 **7 条残留风险**：中 0、低-中 1（R1）、低 6（R2–R7）。
R20 的 R1–R3 三案**全部销掉**，本轮无中级风险。但把 panel 泄焦修干净之后，
「trap 闭合」家族暴露出两处相邻漏角（本文 R1/R2）——都不是本轮改动的回归，
是老的 items 名单口径问题第一次没有更大的洞盖着它们。
另记一件审计期间的现场事：套件一度 31 过 1 挂（详见「已核对无虞」第 1 条），当轮已收。

---

## 〇、R20 R1–R3 销案判定（先说结论）

| 账目 | 本轮判定 |
|---|---|
| R20-R1 开卡首击 Shift+Tab 泄焦（trap 管不到 panel） | ✅ **销**：O1 在 `FC.overlay.trap`（`fc-events.js:128`）加了兜底分支——`activeElement` 不在 items 里（含 panel 自身、含已泄到卡外）一律 `preventDefault`，Shift+Tab 送 last、Tab 送 first。一处修改，三张卡 + zone sheet + ledger + guide + 确认框全部同吃；还白得一个自愈性质：焦点已泄出时下一击 Tab 会被拽回卡内。G1 的 vm 测试锁了六个分支（root/卡外/首末项 × 双方向），R20 测不到的那一角这次测到了 |
| R20-R2 闯城卡吞 Esc 零反馈 | ✅ **销**：O2/O3 落了双通道——吞 Esc 时 panel 加 `is-esc-pulse`，0.2s 阻尼横向 shake（-5px/+4px/-2px，沿用 fc-deny 手感，不发光不换色）；lede 补「必须选定一张才能往下走。」。reduce 下动画置 none、lede 静态保留，与派工逐字一致。G1 断言 Esc 不放行、不签兜底、不打日志、pulse 类挂上又按时摘掉 |
| R20-R3 选轨日志印英文 slug | ✅ **销**：O4 在 `maybeOfferCareerTrack`（`dashboard-app.js:1119`）查 `FC.Sim.pack.careerTracks` 的 `name`，查不到才回落 id。运行时前提核过：`FC.Sim.pack` 真实存在（`fc-sim.js:106/111`，pack 装载时赋值），与 `renderTabsExtra:715` 同口径。G1 用正则锁「不得再拼 bare id」。**半账续档**：boot 流 Esc 兜底措辞未分叉（本文 R6） |

R20 派工外的顺手账：R20-R4 的 reduce 硬化 `.fc-career-pick:not(.is-closing){opacity:1}`
已被 O5 按 R20 建议的原样落掉（`ee90bb7`）——reduce 下可见性不再依赖 rAF。
R20-R5（reduce 关闭 180ms 隐形拦点击）与 R20-R6（选定后 180ms 未落盘窗口）本轮未派未动，照旧续档。

---

## 一、trap 还剩的两只漏角（R1–R2）

### R1 事件卡回执面 Shift+Tab 仍向后泄焦：藏起来的按钮还占着 trap 名单 ⚠ 低-中（本轮最大残留）
- **现象**：答完一道 modal 事件题，`swap()`（`fc-events.js:586`）只把问题面 `askFace.hidden = true`
  ——按钮**没有 disable**，仍匹配 trap 的 `button:not([disabled])` 选择器。此时 items =
  [隐形选项按钮们, 「记入日志，继续」]，焦点在「继续」上（`go.focus()`，恰是名单末项）。
  按 **Shift+Tab**：`go !== first`，三个分支全不命中 → 浏览器默认向后走 → 隐形按钮不可聚焦被跳过、
  card 是 `tabindex="-1"` 不进序 → 焦点落到**卡后面仪表盘的最后一个可聚焦控件**，Enter 是真操作。
  泄出后再按 Tab：新兜底分支命中 → `first.focus()`——但 first 是 `[hidden]` 面里的按钮
  （核过 CSS：`.fc-event__face--ask` 没有自设 display，UA 的 `[hidden]{display:none}` 生效），
  focus() 静默失败 → **Tab 变死键**，焦点钉在卡外；再按 Shift+Tab 才经 `last.focus()` 回到「继续」。
  红线信纸（`fc-events.js:846` 起的 sheet 变体）同构同病。
- **定性**：不是本轮回归——R20 的 trap 在这里同样漏，只是当时「开卡首击就泄」的更大洞
  盖住了它。§44 写的「开卡后的首击 Shift+Tab 不泄焦」字面仍成立（回执面不是开卡首击），
  但「事件、选轨与闯城三张卡的焦点保持闭合」这句家族级表述在事件卡最常用的回执面上有此星号。
  玩家触发概率低（回执面上惯性是点「继续」），且 Shift+Tab 可自行回收，故不给中级。
- **建议护栏**：修在 trap 一处——items 过滤不可见项（`closest("[hidden]")` 或
  `offsetParent !== null`），过滤后为空时也 `preventDefault` 把 Tab 吞掉；
  或便宜版：`swap()` 里顺手把问题面按钮 disable（信纸同步）。下轮或 wrap-up 收，
  本轮不该为它重开 O1 卷。

### R2 红线三秒冷却窗口：全员 disabled，trap 拿到空名单直接放行 ⚠ 低
- **现象**：红线事件开卡即冷却（`fc-events.js:636`）：所有选项按钮 `disabled = true`、
  焦点给 `card.focus()`（tabindex=-1）。此时 items 为**空**，trap 在
  `if (!items.length) return;` 提前退出——R1 的新兜底分支根本没跑到，Tab/Shift+Tab
  走浏览器默认，冷却的三秒内焦点可泄到仪表盘。窗口一关，`buttons[0].focus()`（`:653`）
  把焦点强制收回卡内，自愈。
- **定性**：仅红线卡、三秒窗口、自动回收，且冷却本意就是「什么都别按」；
  但严格说这三秒里 Enter 按到背后控件是真操作，与 R1 同源（items 名单口径）。
- **建议护栏**：与 R1 同一处修——items 为空时 `e.preventDefault()` 再 return（一行）。
  修 R1 时捎带即可。

---

## 二、Esc 回音的手感与边界（R3–R5）

先回答派工问的「吵还是弱」：**偏弱，但方向对**。5px 阻尼 shake 在 ~560px 宽的面板上
约 1% 位移、0.2s 单拍、无色无光——单看动画容易漏看，但配合 lede 的
「必须选定一张才能往下走。」双通道，语义是完整的；比照 fc-deny 家族手感统一，
不建议加码（加色/加幅会把「温和拒绝」做成「报错」，反而吵）。
lede 文案判定：**够用**。三句话各管一件事（做什么/怎么计分/能不能跑），
「必须选定」四字被 G1 正则锁死，措辞不会静默回退。以下是三条边界残留：

### R3 开场 0.22s 内抢按 Esc：pulse 动画与开场过渡抢 transform ⚠ 低
- **现象**：shake 的 keyframes 直接写 panel 的 `transform`，而开场 0.22s 里 panel 正在
  translateY/scale 归位过渡。CSS 动画优先级高于过渡：这个窗口内按 Esc，面板会瞬间跳到
  keyframe 位置抖一下，0.2s 动画结束后再弹回过渡中间值——一次可见的双跳。
  窗口窄（0.22s）、需要玩家开卡瞬间抢按，实害为零。
- **建议护栏**：不值得为它改结构。真要修是把 shake 挪到 panel 的内层包装元素
  （transform 不同层，互不抢）；本轮 KNOWN 落字即可。

### R4 长按 Esc 自动重复：持续抖动 + 每击一次强制回流 ⚠ 低（落字即可）
- **现象**：按住 Esc，keydown 以 ~30Hz 重复，`pulseEsc` 每击摘类→`void panel.offsetWidth`
  强制回流→补类→重开一个 320ms 定时器。视觉上动画反复从头起拍，面板呈持续小抖——
  观感其实成立（读作「一直在拒绝」）；`96d467b` 的 gen 比对让旧回调自作废，
  堆积的定时器全是空转，泄漏无虞。回流成本在这棵小子树上不可感。
- **建议护栏**：无需动作。若下轮有人想「优化」成 clearTimeout 版，提醒 vm 沙箱教训
  （见「已核对」第 1 条）。

### R5 reduce 下吞 Esc 零回音：动画没了，lede 是唯一通道 ⚠ 低（KNOWN）
- **现象**：reduce 专块把 pulse 动画置 none（合规、派工原文如此），类名照挂但无视觉；
  也没有 `aria-live` 播报——读屏用户开卡时听过一遍 lede，之后按 Esc 得到的是纯沉默。
  与 R20-R2 的「装死」相比多了 lede 兜底，算达标下限。
- **建议护栏**：下轮若碰无障碍，在卡内挂一个 `aria-live="polite"` 的视觉隐藏节点、
  吞 Esc 时写一句「这张卡必须选定才能继续」；本轮 KNOWN 落字防误判回归。

---

## 三、文案与日志（R6–R7）

### R6 boot 选轨 Esc 兜底日志措辞仍「你选择了」：R19-R4 尾账三轮续档 ⚠ 低
- **现象**：boot 流选轨卡按 Esc → `dismiss()` → `finish(hint)`（`fc-career.js:88-91`）
  自动签**推荐轨**，随后走同一条 resolve 链打出「你选择了「职员线」轨道作为起点。」——
  玩家明明按了取消，日志说他「选择了」。本轮修掉的是 slug（现在至少是中文名），
  措辞分叉派工原文没点名，不算失职，但这半句账从 R19-R4 起已挂三轮。
- **建议护栏**：resolve 时带上「是否兜底」的标记（或比对 `id === hint` 不可靠，改
  showPicker resolve 对象），兜底路径措辞换「已按推荐签入「职员线」轨道。」。
  下轮一行级顺手账。

### R7 lede 加长 11 字：320px 档的切口略深一线 ⚠ 低（续档 R20-R7）
- **现象**：「必须选定一张才能往下走。」在 clamp 后的最窄字号下约多占一行，
  R20-R7 记录的 320×568 第四张卡 82px 切口会再深一点。lede 这 11 字是 R2 销案的
  代价，不该省；面板内滚可达的结论不变，不构成新档。
- **建议护栏**：并入既定的 `dvh` + `≤360px` 密度专轮，本文只更新账面数字的预期。

---

## 四、回归手测路径（P1–P5）

> 与 G1 的 vm 断言、F1 门禁互补：那两份验「代码形状对不对」，这份专打运行时手感。
> 环境：`python3 -m http.server 8000`，清站点数据，键盘全程不碰鼠标。

- **P1 trap 闭合复测（销案 R20-R1 用）**：选轨卡、闯城卡、合约卡各开一次，
  开卡**首击** Shift+Tab → Console 看 `document.activeElement`，应停在卡内末项；
  再首击 Tab 应进首项；进卡内后 Tab 循环照旧。三卡全过即 R20-R1 正式定谳。
- **P2 回执面定罪（R1，合入前建议跑一次）**：答一道 modal 事件题，回执面上按
  Shift+Tab → 看焦点是否已在卡外；再按 Tab → 确认是死键（activeElement 不动）；
  再按 Shift+Tab → 应回到「记入日志，继续」。红线信纸回执面同测一轮。
  结果决定 R1 是 wrap-up 顺手修还是 KNOWN 落字。
- **P3 红线冷却窗口（R2）**：触发一张红线卡，倒计时三秒内连按 Tab →
  记录焦点去向（预期：会泄，定罪用）；数完三秒确认焦点被 `buttons[0]` 收回。
- **P4 Esc 回音手感（R3/R4/R5）**：闯城卡单击 Esc，正常距离下确认 shake 可感；
  开卡瞬间抢按 Esc 看一次双跳（R3 定级用）；按住 Esc 一秒看持续抖动是否可接受；
  DevTools 模拟 `prefers-reduced-motion: reduce` 后按 Esc → 应无动画、无报错、
  lede 半句仍在屏上。
- **P5 选轨日志（R6 + 销案 R20-R3 用）**：新开局 boot 链正常点选一条轨 →
  日志应是「你选择了「职员线」轨道作为起点。」（中文名，无 slug）；
  重开一局在 boot 选轨卡上按 Esc → 自动签推荐，记录日志措辞（R6 存证）；
  手动开选轨卡按 Esc → 关卡且**无**日志行。

---

## 五、已核对无虞（不占风险名额，防重复排查）

1. **审计期间的套件红灯已当轮收掉**：O2 首版 `pulseEsc` 用了 `clearTimeout`，
   而 `r20-picker-motion.test.js` 的 vm 沙箱只喂了 `setTimeout` ——R21 改动一度把
   R20 测试打挂（31 过 1 挂，ReferenceError）。`96d467b` 改成 gen 计数自作废，
   不再依赖全局，终态 32 全绿（本机两次复跑确认）。教训值得留档：同文件双 lane
   时代，往既有函数里引新全局要先查老测试沙箱的白名单。
2. **trap 新分支无副作用**：焦点在卡内**中间项**时 `indexOf >= 0`、三分支全不命中，
   浏览器默认顺序导航照旧——新兜底没有吞掉正常的卡内 Tab。
3. **pulse 类的生命周期干净**：`settled` 后 `pulseEsc` 直接 return；关卡后残留的
   320ms 回调最多对已摘除节点做一次 classList.remove，无害。gen 比对保证连按时
   旧回调不会提前摘掉新一拍的类。
4. **CSS 双挂点约定成立**：O3 同时写了 `.fc-career-pick__panel.is-esc-pulse` 与
   host 兜底选择器，O2 实际挂 panel——主契约命中；reduce 覆盖块在动画规则之后、
   同特异度靠后者胜，顺序正确。`--ease-out` 有 fallback `ease`，token 缺席不哑火。
5. **选轨卡与闯城卡不需要 pulse 的判定正确**：选轨卡 Esc 是有响应的（手动=关卡、
   boot=签推荐），不存在「吞掉没回音」；本轮只给真吞键的闯城卡装回音，边界没画错。
6. **§44 除 R1 星号外可支撑**：首击 Shift+Tab 不泄焦、Esc 不放行有回音、reduce 提示
   保留、日志中文名、`r21-focus-trap.test.js` 已挂 runner 且全绿——五句里四句半成立。
   建议 wrap-up 勾选时在 R1 上按 P2 结果补一行 KNOWN 或收窄「事件卡」表述。
7. **R20 已核对清单复核未回潮**：关闭时序 ≤180ms、双卡不叠、push 守卫、
   玻璃 token、reduce 双保险——本轮 diff 未触碰这些面，抽查通过。

---

## 六、优先级速览（给 Orchestrator 合入时的盯防顺序）

1. **P2 手测先行**：R1 回执面泄焦——结果决定 wrap-up 是顺手修 trap 的可见性过滤
   （连带 R2 的空名单吞键，两角一行半收掉）还是 §44 补 KNOWN。
2. **本轮可直接收口的**：R20 的 R1–R3 三案全销、套件 32 绿、§44 除 R1 星号外成立——
   焦点键盘家族按派工标准可视为闭合，「暂停功能轮」的停手条件已满足。
3. **下轮顺手**：R6 兜底措辞分叉（一行级）；R5 的 aria-live 若开无障碍轮一并带上。
4. **落字即可**：R3/R4 两条 Esc 边界 KNOWN；R7 并入 dvh/密度轮的既定账。

---

model slug: claude-fable-5-thinking-xhigh
