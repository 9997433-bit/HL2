# R22 体验风险清单 · trap 可见过滤 + 选轨/闯城 ARIA（playfeel）

> 作者：R22-F2（fable）。只读现码后的体验风险盘点，不改游戏代码。
> 对照代码状态：分支 `cursor/fucheng-r22-trap-visible-fa72` 快照 @ `d40b807` ——
> O1 trap 可见过滤（`55567ba`）、O2 选轨 ARIA（`ee55552`）、O3 闯城 ARIA（`28bcbb9`）、
> G1 测试（`c458244`）、G2 §45（`cab8bbb`）、O4 skip（`d40b807`）皆已落盘，
> O5 skip 落字在工作区（审计时尚未提交，判据已读）。
> 快照时 `./scripts/run-fucheng-life-tests.sh` **33 项全绿**（本机复跑确认）。
> 本文任务：对照 round21/fable-r21-playfeel.md 的 R1/R2 做销案判定，
> 审可见过滤与 ARIA 落地后的体验残留，并核对 R22_RESEARCH 里「不学」项有无被误扩。

共 **6 条残留风险**：中 0、低-中 1（R1）、低 5（R2–R6）。
R21 的 R1/R2 两案**全部销掉**，trap 名单口径的两只漏角（回执面泄焦 + 红线空名单放行）
一次修法双收，与 R21 建议的「修在 trap 一处」逐字吻合。
本轮最大残留是 O4/O5 skip 时登记的 **`is-leaving` 200ms 半透明窗口**（本文 R1）——
它恰好是「可见过滤」管不到的那种不可见（opacity 归零但不 display:none），
且本文补了一条 O4/O5 判据里标记为「已挡住」实则没挡住的键盘重入路径。
「不学」项核查结论：**无误扩**（详见第二节）。

---

## 〇、R21 R1/R2 销案判定（先说结论）

| 账目 | 本轮判定 |
|---|---|
| R21-R1 事件卡回执面 Shift+Tab 泄焦 + Tab 死键（隐藏面按钮占名单） | ✅ **销**：O1 在 `FC.overlay.trap`（`fc-events.js:120`）把候选逐个过 `el.closest("[hidden]")` 与 `offsetParent === null`（自身 `position:fixed` 豁免）。`swap()` 把 `askFace.hidden = true` 之后，每颗 `.fc-choice` 都能上溯到 `[hidden]` 问面被筛掉，环里只剩「记入日志，继续 ▸」——它既是 first 也是 last，Shift+Tab 命中 `first` 分支、Tab 命中 `last` 分支，双向都 `preventDefault` 后原地自绕，**不泄焦、无死键**。红线信纸回执面同构同愈（`.fc-letter__act` 挂在 `[hidden]` 读面下，O5 skip 判据与我独立复核一致）。G1 的 harness 锁了「hidden-first/hidden-last 被跳过、隐藏项零 focus」四个方向 |
| R21-R2 红线三秒冷却窗全员 disabled、空名单直接放行 | ✅ **销**：冷却期按钮 `disabled` 被选择器 `button:not([disabled])` 挡在候选之外，`items` 为空时新分支 `{ e.preventDefault(); return; }`（`fc-events.js:140`）把 Tab 整个吞掉，焦点钉在 `card` 上（tabindex=-1，有 `aria-labelledby`，读屏有名可读）；三秒到点 `buttons[0].focus()` 收口不变。信纸红线同一条兜底。G1 用「过滤后为空」的 hiddenOnlyRoot 锁了行为、又用源码正则锁了 `preventDefault` 的写法，双保险 |

R21 建议的修法是「items 过滤不可见 + 空名单也吞 Tab，两角一行半收掉」——O1 的落地
与此完全一致，且 O4/O5 正确判定了「swap() 里补 disable 是纯冗余」而 skip，没有画蛇添足。

---

## 一、本轮残留风险（R1–R6）

### R1 `is-leaving` 200ms 窗口：透明按钮仍在环里、仍可点可按，`answer()` 可被重入 ⚠ 低-中（本轮最大残留，O4/O5 已登记，本文补键盘路径）
- **现象**：非 reduce 下答题不是立刻 `swap()`，而是 `askFace.classList.add("is-leaving")`
  再 `setTimeout(swap, 200)`（`fc-events.js:611`）。这 200ms 里问面 `opacity:0、translateY(-8px)`，
  但 CSS（`fc-events.css:190`）**没写 `pointer-events:none`、也没 `hidden`**——按钮不在
  `[hidden]` 子树里、`offsetParent` 也非空，trap 的两道判定全部放行。后果两层：
  1. **焦点观感**：窗口内 Tab 会停在一颗完全透明的选项上——正是 O1 注释里描述要消灭的
     「焦点凭空消失一拍」，只是换了个成因（opacity 而非 display）；
  2. **结算重入**：`answer()` 只挡 `settled || cooling`，不挡 `answered`（`fc-events.js:583`）。
     窗口内点第二颗（透明）选项会整个重跑 `answer()`：`answered` 被覆写、回执面重建、
     再排一个 `swap` 定时器（`rollDeltas` 数字重滚一拍）。玩家看到的回执与最终结算
     是第二次选择的——账面自洽，但**选择在无提示下被换单**。
- **键盘路径补正**：O4/O5 skip 判据写「键盘路径有 `if (answered || cooling) return;` 挡着」
  ——那条只挡**数字快捷键**（`onKey` 的 `parseInt` 分支）。窗口内 Shift+Tab 落到透明按钮后
  按 **Enter**，走的是原生 click 事件、不经 `onKey`，同样重入。所以这不是纯鼠标洞。
- **定性**：窗口仅 200ms、需快手，reduce 下 `soft` 直接 `swap()` 无窗口；结算无腐坏
  （resolve 用的是最终 `answered`，与屏上回执一致）。但含真实选择覆写，不止观感，给低-中。
  **§45 星号**：G2 写的「不把 `[hidden]` 分段或其他不可见项纳入回绕」在这 200ms 内
  字面不成立——「其他不可见项」恰好漏了 opacity 这种。勾选 §45 时建议补一行 KNOWN
  或把表述收窄到「`[hidden]` 与 display:none」。
- **建议护栏**：O4/O5 给了两个候选，我推荐 JS 版——在 `answer()` 里
  `classList.add("is-leaving")` 之前把 `buttons` 全部 `disabled`（信纸同步）：一处改动
  同时封死 Tab 停靠（选择器筛掉）、鼠标重入、Enter 重入三条路，不用给 trap 加
  opacity/visibility 判定的复杂度。CSS `pointer-events:none` 版只封鼠标，封不了 Enter。
  单独一路、十行以内，下轮或 wrap-up 收。

### R2 可见性判定的家族缺口：`visibility:hidden` / `opacity:0` / class 级 display:none 一律无感 ⚠ 低（KNOWN 落字）
- **现象**：过滤只认两个信号——`[hidden]` 祖先与 `offsetParent === null`。
  `visibility:hidden` 与 `opacity:0` 的元素两个信号都探不到（R1 是现库唯一实例）；
  class 级 `display:none` 能被 `offsetParent` 兜住，**除非**该元素自身 `position:fixed`
  ——那会走进豁免分支（`getComputedStyle(el).position === "fixed"` 即保留），被藏住的
  fixed 按钮误留在环里，`focus()` 静默失败、Tab 死一拍。核过现库：overlay 宿主是 fixed
  但**卡内没有任何自身 fixed 的可聚焦项**，各面的藏匿全走 `[hidden]` 属性，此形状今天不存在。
- **定性**：防御性登记。业界通行做法（如 focus-trap 库）是再叠一层
  `getComputedStyle(el).visibility !== "hidden"`，但为不存在的形状加判定不值当。
- **建议护栏**：KNOWN 落字 + 一条口径约定：**今后各壳藏分段一律用 `hidden` 属性**
  （现有四壳全合规），谁改用 class 藏谁负责补 trap 判定。R1 修掉后本条降为纯档案。

### R3 ARIA 尾账：二级合约 picker 仍是无名 dialog，主合约缺 describedby ⚠ 低
- **现象**：O2/O3 落地后盘点全库 `role="dialog"`：事件卡（fcEvTitle/fcEvBody）、
  信纸（fcLtTitle/fcLtBody）、确认框（seq id、alertdialog）、选轨（fcCareerTitle/Lede）、
  闯城（fcChallengeTitle/Lede）、主合约（fcContractTitle，**无 describedby**）都有名了；
  探区 sheet 与账本用 `aria-label`（合规）。唯一漏网：**二级合约 picker**
  （`fc-contract.js:359`）`role="dialog" aria-modal="true"` 后面什么名都没有——
  读屏进卡只听到「对话框」。主合约的 lede 载着关键规则（三张只能签一张、推荐排序说明），
  值得一并补 describedby。
- **定性**：二级合约触发频率低（主线达成后六个月窗口），但它是本轮对齐口径后
  最后一个无名对话框，留着就是下一轮的 R21-R1 式「更大的洞盖小洞」。
- **建议护栏**：下轮一行级——`fcContract2Title`（+lede id）照 O2/O3 的模式补齐，
  id 约定沿用「fc + 域名 + Title/Lede」。

### R4 describedby 的 id 对应关系没有测试锁：悬空引用会静默漂移 ⚠ 低
- **现象**：G1 的 `assertPickerLabel` 只锁 `aria-labelledby` 与 `<h2 id>` 的对应；
  `aria-describedby="fcCareerLede/fcChallengeLede"` 与 lede 的 `id` **没有断言**。
  谁下轮重构 lede（改 id、拆段）都不会有红灯——describedby 悬空对明眼人零症状，
  读屏那头 Description 直接消失，恰好把闯城 lede 里「必须选定一张才能往下走。」
  这条 R21-R2 销案的语义通道悄悄拔掉。
- **建议护栏**：`assertPickerLabel` 加两条 match（describedby 引用 + lede id 定义），
  十行以内，G1 家族下轮顺手。

### R5 红线冷却三秒：Tab 从「泄焦」改为「全静默」，键盘侧只剩 badge 单通道 ⚠ 低
- **现象**：空名单 `preventDefault` 后，冷却窗内 Tab/Shift+Tab 无任何反馈；Esc 同样
  在 `if (cooling) return` 提前吞掉（连 deny shake 都不给，`fc-events.js:619/568`）。
  视觉侧有 badge 倒计时（红线 · 3→2→1）扛着，观感成立——「什么都别按」本来就是
  冷却的语义；但读屏侧开卡听完 title/body 后，这三秒内任何按键都是纯沉默，
  倒计时数字的变化也不播报（badge 无 aria-live）。
- **定性**：比 R21-R2 的「泄焦到仪表盘」是纯改善，方向对；对照 R21 闯城 Esc pulse
  立的「吞键要有回音」双通道标准，这里键盘侧欠半格。频率低（仅红线卡 × 3 秒）。
- **建议护栏**：与 R21-R5 同族——若开无障碍轮，给卡挂一个 `aria-live="polite"`
  隐藏节点，冷却启动时播一句「红线事件，三秒后可选」；不单独开轮。

### R6 续档账打包：R21 的 R3–R7 与 R20 的 R5/R6 本轮未派未动，防丢登记 ⚠ 低
- **明细**：① R21-R6 boot 选轨 Esc 兜底日志仍「你选择了」——**第四轮挂账**
  （R19-R4 起），仍是 resolve 不带兜底标记的一行级修法，账龄最长，建议下轮必收；
  ② R21-R3（开场 0.22s 抢 Esc 双跳）、R21-R4（长按 Esc 连拍）、R21-R5（reduce 下
  吞 Esc 零回音——本轮 describedby 让读屏**开卡时**多听一遍「必须选定」，底线略抬，
  但逐击回音仍缺，账不销）；③ R21-R7/R20-R7（320px 切口）：本轮 lede 零增字，
  账面数字不变；④ R20-R5/R6（reduce 关闭 180ms 隐形拦点击 / 落盘窗口）。
- **判定依据**：R22 的 games/ 全量 diff 只有 6 个文件（trap 函数体、两处 ARIA 属性、
  两个测试、§45），上述各面一行未碰，全部原样续档，无回潮亦无改善。

---

## 二、「不学」项误扩核查（对照 R22_RESEARCH「明确不学 / 延后」）

| 不学项 | 核查方式 | 结论 |
|---|---|---|
| 原生 `<dialog>.showModal()` | 全库 grep `showModal|<dialog` | **零命中**，自定义 overlay 栈原样 ✅ |
| `inert` 整页 | grep `\binert\b` | **零命中**，仍走 `fc-scroll-lock` + trap ✅ |
| `vh→dvh`（安全区基建轮） | grep `dvh` | **零命中**，派工「不动」遵守 ✅ |
| Esc 家族扩 scope（调研明说「本轮先修 trap」） | 全量 diff 审阅 | 三处 `Escape` 分支（事件/信纸/闯城）一字未动 ✅ |
| 玩法数值 / 天赋十连抽 / 自动播放 | 全量 diff 审阅 | diff 内无任何数值、文案、玩法改动（新增只有 ARIA 属性与 id）✅ |

另核了「学什么」表里的动作边界：O1 没有顺手去动 `swap()` 或 Esc（守住了「O1 独占 trap」
的冲突纪律）；O4/O5 对「若 O1 不够」前提的否定判断，我按 DOM 形状独立推演后结论一致
（问面/读面都是 `[hidden]` 祖先可上溯，红线走 disabled 选择器路），skip 正当。
一处纪律尾巴：派工要求 ARIA id 约定「写进 commit message」，`ee55552`/`28bcbb9` 的
message 只有一行标题没提 id——id 本身与派工逐字一致、未撞名，记流程账不记风险。

---

## 三、回归手测路径（P1–P5）

> 与 G1 的 vm 断言、§45 的验收句互补：那两份验代码形状，这份专打运行时手感。
> 环境：`python3 -m http.server 8000`，清站点数据，键盘全程不碰鼠标（P3 除外）。

- **P1 回执面销案定谳（R21-R1 用）**：答一道 modal 事件题，回执面上按 **Shift+Tab**
  → Console 看 `document.activeElement`，应**原地留在「记入日志，继续 ▸」**（自绕，
  不再泄到仪表盘）；再按 Tab → 仍在原地，**无死键**；Enter 应关卡记日志。
  红线信纸答完后在「归档，继续 ▸」上同测一轮。两处全过即 R21-R1 正式定谳。
- **P2 红线冷却窗（R21-R2 用）**：触发红线卡（风险类事件），倒计时三秒内连按
  Tab/Shift+Tab → `activeElement` 应始终钉在 `.fc-event__card` 上不动（对照 R21-P3
  当时预期「会泄」的存证，方向已反转）；数完三秒 → 焦点自动落第一颗选项。
  信纸红线同测。顺手录一段读屏（可选）：冷却三秒内的按键应无任何播报（R5 存证）。
- **P3 200ms 窗口定罪（R1 用，允许碰鼠标）**：鼠标版——点选项 1 后立即（200ms 内）
  点选项 2 的原位置（此刻透明）→ 看回执面是否变成选项 2 的结果（换单存证）；
  键盘版——答题后立刻 Shift+Tab + Enter → 同样重入则键盘路径定罪成立。
  DevTools 打开 Rendering → prefers-reduced-motion: reduce 复测 → 窗口应不存在
  （soft 直接 swap）。结果决定 R1 是下轮单独派还是 wrap-up 顺手收。
- **P4 ARIA 落地验证（销案 O2/O3 用）**：DevTools → Elements → Accessibility 面板，
  选轨卡 panel 的 **Name** 应是「第一份工，你打算走哪条线？」、**Description** 是轨道
  lede；闯城卡 Name「这六十个月，你赌哪一张牌？」、Description 含「必须选定一张才能
  往下走。」。有条件上 NVDA/VoiceOver 听开卡播报应为「名 + dialog + 描述」。
  顺手看一眼二级合约卡（主线达成后）——Name 应为空（R3 存证）。
- **P5 回归抽查（过滤没伤正常环）**：选轨、闯城、合约三卡开卡**首击** Shift+Tab
  仍应停卡内末项（R21-P1 口径复测，确认新过滤没把可见项误杀）；卡内中间项 Tab
  顺序导航照旧；闯城卡 Esc pulse 仍在（R21 面未回潮）；`./scripts/run-fucheng-life-tests.sh`
  33 项全绿收尾。

---

## 四、已核对无虞（不占风险名额，防重复排查）

1. **静态 ARIA id 不会同屏撞名**：`FC.overlay.push` 按 kind 去重（`fc-events.js:96`），
   同刻只有一个 modal——fcEv*/fcLt*/fcCareer*/fcChallenge* 互斥出场；确认框自成
   `confirm` kind 可叠在 modal 上，但它用 seq id（`fcConfirmTitle1…`），无撞名面。
   选轨与闯城 id 分名（fcCareer* vs fcChallenge*），即便未来叠层也不冲突。
2. **trap 新过滤的 ES5/沙箱兼容**：`el.closest` 有存在性守卫（老宿主退化为
   offsetParent 单判，display:none 仍筛得掉）；`getComputedStyle` 有守卫（缺席时
   fixed 豁免不生效，宁可误杀不误留）；vm 沙箱的假元素 `offsetParent` 是 `undefined`
   （`!== null`）不会被误筛——33 绿佐证，R20/R21 老测试未被新过滤打挂。
3. **正常卡内循环无回归**：过滤只剔除、不重排，中间项 Tab 依旧走浏览器默认；
   R21 加的「panel 自身兜底」分支现在用的是过滤后的 first/last，两轮改动无干涉。
4. **r21 测试那 2 行 diff 不是弱化**：只是 lede 正则从精确匹配放宽为容纳 id 属性
   （`(?:\s[^>]*)?`），「必须选定」四字断言与其余全部原样。
5. **空名单吞键后的焦点落点安全**：冷却时焦点在 card（tabindex=-1、有名），
   不会落到 body 上让下一击 Tab 从页首重扫。
6. **O3 的 HTML 属性拼接换行无害**：`dashboard-app.js:1144` 的字符串分两段拼，
   属性间空格在引号内，产出 HTML 合法（页面 boot 测试 12 脚本全过佐证）。

---

## 五、优先级速览（给 Orchestrator 合入时的盯防顺序）

1. **P3 手测先行**：R1 的 200ms 窗口——鼠标换单 + Enter 重入双路存证后，
   建议按「answer() 前置 disable」单开一路收掉（十行内，事件卡 + 信纸两处）；
   勾 §45 时按结果补 KNOWN 或收窄「其他不可见项」表述。
2. **本轮可直接收口的**：R21 R1/R2 双销、33 绿、O4/O5 skip 判据成立、「不学」项零误扩
   ——调研立的「可见性过滤 = 业界标配」缺口已补上；按 R22_RESEARCH 停手关系，
   若 R1 按上条收掉且无新中级，焦点家族可以正式暂停、让位产品轮。
3. **下轮顺手**：R3 二级合约补名 + 主合约 describedby（一行级）；R4 describedby
   测试锁（十行级）；R21-R6 兜底措辞（第四轮挂账，别再滚了）。
4. **落字即可**：R2 家族缺口 KNOWN + 「藏分段一律用 hidden 属性」口径约定；
   R5 并入无障碍轮的 aria-live 既定账。

---

model slug: claude-fable-5-thinking-xhigh
