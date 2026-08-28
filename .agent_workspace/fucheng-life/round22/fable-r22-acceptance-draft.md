# R22 · ACCEPTANCE §45 条文草稿 + 走查步骤（F3）

> 交付物：可直接粘贴进 `games/fucheng-life/ACCEPTANCE.md` 的第 45 条整段条文，
> 以及逐条人工走查步骤。落地由 R22-G2 执行；本文件只是草稿，
> **不改 ACCEPTANCE.md 本体**。
> 写稿时 G2 已把 §45 **五行全量**落进 ACCEPTANCE.md（`cab8bbb`），与 R21 同款
> 一次落齐，无需补行。下方「一」与已落文本**逐字一致**
> （行尾硬换行双空格：第 1–4 行有、末行无，五行均已核对）。
> G1 的 `r22-trap-visible.test.js` 写稿时已落地（`c458244`）、已注册进 runner
> 第 61 行且**绿灯**：HEAD `b01ae83` 实测全量 **33 passed / 0 failed**——中途
> 有过一次红灯插曲（O3 的 ARIA id 打破 R21 测试的精确正则），已由 `dae9ea2`
> 修掉，来龙去脉见 45-e，§45 末行**可以放心保留**。
> 勾选时机沿用惯例：条文落地即 `[ ]`，待十路全绿 + 本稿走查签核后另一笔
> commit 勾选（R17 的 `2c57bcc → 130a317` 起，R19 / R20 / R21 都是这么走的）。

---

## 一、粘贴进 ACCEPTANCE.md 的整段条文

```markdown
45. [ ] **R22 · 焦点 trap 可见过滤 + 选轨/闯城 ARIA**  
    焦点 trap 只循环当前可见、可聚焦的控件，不把 `[hidden]` 分段或其他不可见项纳入回绕。  
    可见控件名单为空时仍拦截 Tab，不让焦点泄漏到背后的仪表盘。  
    选轨与闯城选择卡均以 `aria-labelledby` / `aria-describedby` 关联各自标题与说明。  
    `node games/fucheng-life/tests/r22-trap-visible.test.js` 与 `./scripts/run-fucheng-life-tests.sh` 全绿。
```

- 五行与已落文本（`cab8bbb`）逐字一致：标题与前三行正文行尾均为硬换行
  双空格，末行（测试命令行）行尾**无**双空格——与 §40 / §42 / §43 / §44
  同款，**不要回改**。
- 覆盖对位：派单目标 1（trap 可见项过滤 + 空名单不泄焦）↔ 第 2、3 行；
  目标 2（选轨/闯城 ARIA）↔ 第 4 行；目标 3（测试）↔ 第 5 行。
  三个目标全部入条文，无需增删。
- 措辞校准（不强求）：第 4 行写「均以 `aria-labelledby` / `aria-describedby`」。
  派单里 describedby 是「可选」，但 O2 / O3 两路都落了，条文写实、不是超卖；
  只是 G1 的自动断言**只锁 labelledby**（引用 + `<h2 id>` 成对），describedby
  靠 45-c 的走查兜底——G2 不必改字，验收人记得手过一遍即可。
- 条目保持 `[ ]`。手工走查未做，勾选留到十路全绿 + 走查签核后另一笔
  commit。（发稿前 F2 也落了 `11301bb`——playfeel 稿判 R21 R1/R2 双销、
  另记 6 条残留——本稿落地即十路齐；测试全绿，只差走查签核。）

---

## 二、逐条人工走查（45-a…45-e，供 G2 / 验收人参考，不必粘贴）

从仓库根目录 `python3 -m http.server 8000`，Chrome 打开
<http://127.0.0.1:8000/games/fucheng-life/>，先清站点数据并开 Console；
移动端项目用 DevTools 设备模式，视口 `390 × 844`。

### 准备：随叫随到的信纸与红线卡

选轨 / 闯城两卡的召法沿 R21 稿（boot 链先选轨后闯城；重弹闯城卡用
`s.run.goal = null` 那段 Console 片段）。信纸与红线卡靠自然推月要碰运气，
Console 直召更快（`show` 的 `opts.presentation` 可临时改壳）：

```js
FC.events.load().then(function () {
  var d = FC.events.deck();
  var letter = d.filter(function (e) { return e.presentation === "letter"; })[0];
  var red = d.filter(function (e) { return e.type === "redline" && e.choices.length; })[0];
  // 45-a 信纸回执面：
  FC.events.show(letter, { moneyRef: 3000 });
  // 45-b 红线弹窗（改天换行跑，别同时开两张）：
  // FC.events.show(red, { moneyRef: 3000 });
  // 45-b 红线信纸变体（壳改道）：
  // FC.events.show(red, { moneyRef: 3000, presentation: "letter" });
});
```

story.json 里 letter 呈现 5 张、红线（`type: "redline"`）10 张，随便捞第一张
就够用；`moneyRef` 只影响代价圆点的换算，写 0 也不碍走查。

### 45-a 回执面 Shift+Tab 闭环（本轮主修，销 R21-F2 R1）

1. 召一张信纸，点「签字」类处置，等 0.2s 翻到回执面：焦点应已在
   「归档，继续 ▸」上（`swap()` 末尾 `go.focus()`），Console 用
   `document.activeElement` 核对。
2. 按 **Shift+Tab**：焦点必须**留在原地**（items 过滤后只剩这一颗按钮，
   首=末，trap `preventDefault` 后绕回它自己）；不得倒退出卡落到背后仪表盘，
   也不得跳去浏览器地址栏。改动前这一击是真泄焦：读面 `hidden` 后处置按钮
   没 `disabled`，旧 trap 照样收录它们，「归档」在旧名单里既非首也非末，
   两个绕环分支都不接管，浏览器默认反向巡航直接走出卡外。
3. 按 **Tab**：同样留在原地。改动前是「死键」——旧 trap 判「归档」为末项、
   回绕去 `[hidden]` 读面的首颗处置按钮，`focus()` 静默失败，击键被吞但
   焦点不动，看起来像键盘坏了。
4. 事件卡同构复验：推月或直召一张 modal 事件，答任意一题翻到结果面，
   「记入日志，继续 ▸」上把第 2、3 步重敲一遍（`askFace.hidden = true` 后
   `.fc-choice` 全员被 `closest("[hidden]")` 筛出环）。
5. 答题**前**顺手核对过滤不误伤：问面上 Tab 在可见选项间照常巡航、首末
   回绕方向与 R21 44-a 口径一字不变（过滤只删项不改序）。

### 45-b 红线冷却空名单不泄焦（销 R21 44-b#4 / R21-F2 R2）

1. 召红线弹窗：徽标显示「红线 · 3」倒计时，所有选项 `disabled` 加冷却条，
   焦点在卡根（`card.focus()`，`document.activeElement.className` 应为
   `fc-event__card`）。
2. 三秒窗内连按 **Tab / Shift+Tab 各三次以上**：每一击都被吞
   （`document.activeElement` 纹丝不动，仍是卡根），不得漏到背后仪表盘——
   改动前 trap 对空名单是 `if (!items.length) return;` 裸放行，Tab 走出卡后
   Enter 能按到背后的真按钮；本轮改为 `e.preventDefault()` 再 return，
   这正是条文第 3 行。R21 稿 44-b#4 记档的「约 3 秒理论泄焦窗」就此销账。
3. Esc 在冷却窗内照旧被吞（既有行为，别退化）；数完三秒选项解锁、焦点
   自动收进首选项（`buttons[0].focus()`），此后 Tab 环恢复常规巡航。
4. 红线信纸变体（`presentation: "letter"` 改道）同场景重敲第 2 步：
   两种红线壳共用同一冷却逻辑与同一个 trap，`fc-letter__sheet` 上同样不泄。
5. 极简卡抽查：guide tip 这类零可聚焦调用方开着时按 Tab，从「放行」变
   「吞键」是本轮预期收紧，验 Console 零报错即可（F1 门禁 G-2 同口径）。

### 45-c ARIA 读名：两张 picker 的 Name / Description

1. 选轨卡：Elements 选中 `.fc-career-pick__panel`，Accessibility 面板核对——
   role `dialog`，**Name**「第一份工，你打算走哪条线？」（经
   `aria-labelledby="fcCareerTitle"`），**Description** 为 lede 全文（经
   `aria-describedby="fcCareerLede"`）。改动前 Name 是空的，读屏开卡只报
   「对话框」不报事由。
2. 闯城卡：同法核对 `fcChallengeTitle` / `fcChallengeLede`——Name
   「这六十个月，你赌哪一张牌？」，Description 三句 lede 全文且仍含
   「必须选定一张才能往下走。」（R21 44-d 锁死的措辞，加 id 不许连带改字）。
3. id 唯一性：全 `js/` 目录 grep，`fcCareer*` 与 `fcChallenge*` 两组 id 各只
   定义一处；两卡虽共用 `.fc-career-pick` 类，但从不同屏共存（boot 链先选轨
   后闯城，R17 保证无同屏双 modal），id 前缀也已分家——派单约定的四个 id
   正是现码所用。
4. 对齐口径：事件卡（`fcEvTitle` / `fcEvBody`）与信纸（`fcLtTitle` /
   `fcLtBody`）早有同款，本轮补齐 picker 缺口后，五种壳的对话框读名口径
   统一。有读屏条件的加验一条：NVDA / VoiceOver 下开卡应播报标题 + 说明。
5. 文案零改动核对：两卡标题与 lede 一字未动（O2/O3 的 diff 只加属性与 id），
   45-d 的 reduce 走查顺带证明 ARIA 与动效互不相干。

### 45-d reduce 回归（`prefers-reduced-motion: reduce`）

1. DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`，把 45-a
   的信纸走查重走：reduce 下 `answer()` 走 soft 分支**立即** `swap()`（无
   200ms `is-leaving` 过渡），回执面即时亮起、焦点即时落「归档」，
   Shift+Tab / Tab 闭环结论必须与动效路径完全一致。顺带记一笔：O4/O5
   登记的 200ms 透明窗残留（见「三」）在 reduce 下**根本不存在**，它是
   纯动效路径的洞。
2. 45-b 的红线冷却在 reduce 下重敲：三秒冷却是防误触不是动效
   （overlay-spec §1.7），reduce 不豁免，Tab 吞键结论不变。
3. R21 44-e 原样复测别退化：闯城卡 Esc 不抖（`animation: none`）但键仍被吞、
   不关卡不落目标，lede 原地可读。
4. R20/R21 记档的可见性回归继续绿：reduce 下弹卡瞬间
   `getComputedStyle(document.querySelector(".fc-career-pick")).opacity`
   必须是 `"1"`（`ee90bb7` 的 `:not(.is-closing)` 兜底仍在）。
5. 本轮**零 CSS 改动**（O1/O2/O3 全是 JS 属性级，O4/O5 skip），上面四条
   全是回归项；任何一条翻红都说明有人越界动了样式，按 diff 追责。

### 45-e 自动化门禁

```bash
node games/fucheng-life/tests/r22-trap-visible.test.js
./scripts/run-fucheng-life-tests.sh
```

两条命令退出码均应为 `0`。写稿时（HEAD `b01ae83`）实测专项绿灯、全量
**33 passed / 0 failed**；runner 第 61 行已注册（标签
`R22 visible focus trap and picker ARIA labels`）。

红灯插曲（已修，留档供追溯）：O3 落 `28bcbb9` 后全量曾是 32 passed /
**1 failed**，倒下的不是 r22 而是 **r21-focus-trap**——它的
`testRequiredWordingAndCareerLogName` 用
`/<p class="fc-career-pick__lede">([^<]+)<\/p>/` 整串精确匹配取 lede，
O3 给该标签插入 `id="fcChallengeLede"` 后正则不再命中。`dae9ea2` 把形状
放宽为 `(?:\s[^>]*)?` 容忍附加属性，「必须选定」措辞断言原样保留，两侧
测试都过。教训与 R21 44-g 的 vm 词汇表同族：**老测试锁死的不只是行为，
还有模板字面形状**——凡改共享模板串（class / id / 属性序）必须全量跑套件。
残余脆弱点：捕获组仍是 `([^<]+)`，lede 一旦包进子元素（如 `<strong>`）
还会再断，后续轮动 lede 结构时记得连这条正则一起看。

G1 覆盖面：源码级双锁（`closest("[hidden]")` 谓词在位 + 空名单
`preventDefault(); return;`）、vm harness 行为级四断（正向回绕跳过末尾
hidden 项、反向回绕跳过开头 hidden 项、全 hidden 空名单吞键、hidden 项
零 `focus()` 调用）、两卡 ARIA 的 labelledby 引用与 `<h2 id>` 定义成对。
**没**覆盖的三面靠上面的手工场景兜：describedby（45-c）、
`offsetParent === null` 的 `position: fixed` 豁免分支（harness 的
`offsetParent` 恒为对象，走不进该分支）、真实浏览器的焦点走向与读屏播报。

### 桌面 + 390px 回归（别被本轮改动带走）

- §42 / §43 / §44 语义全不动：选轨 Esc 双语义、两卡开合动效与玻璃底、
  闯城 Esc pulse + 吞键、选轨日志中文名——本轮只动 trap 名单与 ARIA 属性，
  这四组出现任何漂移都算越界。
- trap 是十处调用点共用的（事件 / 信纸 / confirm / 选轨 / 闯城 / guide /
  合约 ×2 / ledger，清单见 F1 门禁 G-4），抽 confirm 叠事件卡（R16 场景）
  与 ledger 各走几圈 Tab，无瞬移无报错即可，不必十处全敲。
- 设备模式 `390 × 844` 把 45-a / 45-b 各重走一遍：小屏下回执面按钮不截断、
  红线冷却条可见，焦点环肉眼可跟。
- 全流程（闯城档「选轨 → 主目标 → 合约 → 教学 → 推进 6 月」）Console
  无 error、未处理 Promise rejection、404，也无
  `FC.overlay: modal is already open`。

---

## 三、与现码的对齐说明（写给 G2 / 合入责任人）

写稿时分支 `cursor/fucheng-r22-trap-visible-fa72` HEAD 为 `b01ae83`，
十路中 O1–O5、G1、G2、F1 已落；发稿前 F2 也落了（`11301bb`，playfeel
风险稿），本稿落地即十路齐。全量测试实测 **33 passed / 0 failed**：

- **O1 已落**（`55567ba`，`fc-events.js`）：`FC.overlay.trap` 先取候选再逐个
  筛可见——`el.closest("[hidden]")` 命中即丢；`offsetParent === null` 且
  `getComputedStyle(el).position !== "fixed"` 即丢（fixed 可见却无
  offsetParent，独享豁免）；过滤后为空从「裸 return 放行」改为
  「`preventDefault()` 再 return」。一个 trap 十处调用点全吃，条文只点名
  picker 与仪表盘，信纸 / confirm / guide / 合约 / ledger 属顺带收益。
  边界备忘：`getComputedStyle` 缺席的老宿主里 fixed 候选会被保守丢弃——
  现五种壳没有 fixed 可聚焦项，无实害。
- **O2 已落**（`ee55552`，`fc-career.js`）：选轨 panel 补
  `aria-labelledby="fcCareerTitle"` + `aria-describedby="fcCareerLede"`，
  标题与 lede 挂上对应 id；文案零改动。
- **O3 已落**（`28bcbb9` + 修补 `dae9ea2`，`dashboard-app.js`）：闯城 panel
  同款 `fcChallengeTitle` / `fcChallengeLede`。修补那笔改的是
  `tests/r21-focus-trap.test.js` 的 lede 正则（见 45-e），生产码没回退。
- **O4 skip**（`d40b807`，判定书 `o4-skip.md`）：事件卡 `swap()` 里补
  `disabled` 系纯冗余——回执面亮起时问面按钮已被 `[hidden]` 过滤出环，
  红线冷却走 `disabled` + 空名单另一条路，两条都不经过 `swap()`，
  派单前提「若 O1 不够」不成立。
- **O5 skip**（`31e417e`，判定书 `o5-skip.md`）：信纸同判，并附了一次性
  vm 探针的三段验证记录；G1 已覆盖同形状，不另加测试。
- **G1 已落且绿**（`c458244`，`tests/r22-trap-visible.test.js` + runner
  第 61 行）：覆盖面与三处缺口见 45-e。
- **G2 已落**（`cab8bbb`，ACCEPTANCE §45 五行全量）：与本稿「一」的
  代码块逐字一致，`[ ]` 状态正确；无需补行，只等十路全绿 + 走查签核后
  勾选。
- **F1 已落**（`8903046` + 勘定 `b01ae83`，`fable-r22-sota-gates.md`）：
  11 条门禁的验收 SSOT，勘定笔已把 G-8 红灯 / O5 缺口标注为双销；
  本稿走查与其 A/B 组手测口径一致，签核时两份对照着走即可。
- **备注（不强求）**：① R21 稿 44-b#4 与三节备注 ② 记档的「红线冷却
  约 3 秒理论泄焦窗」本轮销账（45-b）；② O4/O5 判定书共同揭出的
  **200ms `is-leaving` 窗口**是新登记残留——动效路径下 `answer()` 先加类
  0.2s 后才 `swap()`，期间问面/读面透明但可聚焦可点击，鼠标还能重入
  `answer()` 覆写回执（键盘路径有 `answered` 挡、鼠标没有）。修法两个候选
  （`pointer-events: none` 或把 `disabled` 提前到 `answer()` 开头）都超出
  本轮 skip 车道口径，建议记入下一轮候选池，事件卡与信纸**合并一路**统一改；
  ③ 派单要求 ARIA id 约定写进 commit message，O2/O3 的 message 只写到
  「career/challenge picker ARIA labelledby」没带 id 字面——流程小疵，
  代码与约定一致，不值得返工；④ `fc-career.js` reduce 下关闭仍空等 180ms
  （R20 稿起记档），继续不修。

---

model slug: `claude-fable-5-thinking-xhigh`
