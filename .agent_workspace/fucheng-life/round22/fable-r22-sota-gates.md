# R22 SOTA 门禁 · trap 可见项过滤（销 R21-F2 R1/R2）+ 选轨/闯城 picker ARIA

> 作者：R22-F1（fable）。本文是 R22 的验收 SSOT：下列门禁**全部通过**方可合入 / 勾上 ACCEPTANCE §45。
> 对象代码：`games/fucheng-life/js/fc-events.js` 的 `FC.overlay.trap`（可见项过滤 + 空名单吞 Tab，O1 可写）、
> `js/fc-career.js` `showPicker` 模板（ARIA labelledby/describedby，O2）、`js/dashboard-app.js`
> `maybeOfferChallengeGoal` 模板（同款 ARIA，O3）、`tests/r22-trap-visible.test.js` + runner（G1）、
> §45 条文（G2）、O4/O5 的 skip 判定书。
> 依据：`round22/R22_RESEARCH.md`（APG「Tab 循环只扫可见项」对标）、`round22/R22_DISPATCH.md`、
> R21-F2 playfeel 的 **R1**（回执面 Shift+Tab 泄焦 + Tab 死键）与 **R2**（红线冷却窗空名单放行）。
> 编写时分支快照 @ `d40b807`：O1 `55567ba`、O2 `ee55552`、O3 `28bcbb9`、G1 `c458244`、
> G2 `cab8bbb`（§45 未勾）、O4 skip `d40b807` 已落；O5 尚欠 skip 书或改动。
> **红灯现况（写作时实测）**：`./scripts/run-fucheng-life-tests.sh` 当前 **32 过 1 挂**——
> 挂的是 `r21-focus-trap.test.js:304`：它用 `<p class="fc-career-pick__lede">` 整串正则取 lede，
> O3 给该标签插入 `id="fcChallengeLede"` 后正则不再命中。这是 R21 G-9「vm 词汇表教训」的同款重演
> （老测试锁死了模板字面形状），修法见 G-8，**不修不许合**。
> 门禁按**行为**验收，不锁实现细节（可见性判定的具体谓词可换，语义契约不可破）。

## 0. 验收环境准备

- 本地起服：仓库根目录 `python3 -m http.server 8000`，打开
  `http://localhost:8000/games/fucheng-life/`（file:// 直开亦须可用，见 G-11）。
- 自动化：`./scripts/run-fucheng-life-tests.sh`；R22 断言在 `tests/r22-trap-visible.test.js`
  （runner 第 61 行已挂）。
- 常用构造（沿 R21 §0）：
  - **回执面场景**：正常推月触发一张 modal 事件卡，答任意一题等 0.2s 换到回执面；
  - **红线冷却场景**：构造/等到红线（redline）事件，开卡即三秒冷却、全按钮 disabled；
  - **信纸回执场景**：触发 letter 呈现的事件，签一个处置等回执面；
  - **泄焦探针**：Console 逐击查 `document.activeElement`，配合肉眼盯焦点环。

---

## A. trap 可见项过滤（fc-events.js · O1）

### G-1 `[hidden]` 子树过滤：事件卡回执面 Shift+Tab 不泄焦、Tab 不再死键（销 R21-F2 R1）

- **操作步骤**
  1. 回执面场景：焦点在「记入日志，继续 ▸」上，按 **Shift+Tab** → 焦点必须留在卡内
     （回执面唯一可聚焦项即「继续」，Shift+Tab 应回绕到它自己或被吞，绝不许落到背后仪表盘）；
  2. 同一面上按 **Tab** → 同样不许出卡、不许死键（改动前 Tab 会指名 `[hidden]` 问面里的
     首按钮，`focus()` 静默失败、焦点钉在原地——R21-F2 R1 的定罪路径 P2 转为负向对照）；
  3. 读 `FC.overlay.trap`（`fc-events.js:120` 一带）：候选取出后逐个筛，
     `el.closest("[hidden]")` 命中即丢弃——问面 `askFace.hidden = true`（`:602`）后
     `.fc-choice` 全员出环，items 只剩「继续」。
- **通过标准**
  - 回执面上任意 Tab / Shift+Tab 连击序列，`document.activeElement` 永不出卡、永不指向
    不可见按钮，Enter 永远只可能触发「继续」；
  - R21 §44 的星号（「事件卡最常用的回执面上有此洞」）就此销掉——事件、选轨、闯城、合约
    的焦点闭合升格为无星号成立；
  - `closest` 不存在的老环境（`el.closest &&` 守卫）不抛错、退化为不过滤该谓词。

### G-2 空名单吞 Tab：红线冷却三秒窗不泄焦（销 R21-F2 R2），极简卡不抛错

- **操作步骤**
  1. 红线冷却场景：开卡后三秒倒计时内连按 Tab / Shift+Tab 各三次以上 →
     每击都被吞掉，焦点不得漏到仪表盘（改动前 items 为空时 trap 早退放行，Enter
     能按到背后控件——R21-F2 P3 记录的定罪路径转为负向对照）；
  2. 数完三秒核对既有自愈不回退：`buttons[0].focus()` 照旧把焦点收进卡内首选项；
  3. 读代码（`fc-events.js:138-140`）：过滤后 `if (!items.length) { e.preventDefault(); return; }`
     ——注意这是对 R21 G-1「items 为空时早退不抛错」口径的**语义升级**（早退→吞键），
     guide tip 等零可聚焦调用方按 Tab 从「放行」变「吞掉」，属预期收紧，验一遍无报错即可。
- **通过标准**
  - 冷却窗内焦点零泄漏：三秒里任何键都够不到背后仪表盘的真操作；
  - 红线信纸（sheet 变体）同场景同过——两种红线壳共用同一冷却逻辑，只对 modal 生效即翻红；
  - guide tip、空 confirm 等极简卡开着时按 Tab：吞键、零报错、控制台干净。

### G-3 可见性判定边界：`offsetParent` 谓词的 fixed 豁免 + 卡内巡航零介入

- **操作步骤**
  1. 读 `fc-events.js:131-135`：`offsetParent === null` 的项再查 `getComputedStyle(el).position`，
     `fixed` 豁免（fixed 定位可见却无 offsetParent），非 fixed 丢弃；`getComputedStyle`
     取自 `global`，缺席时（老环境）整个谓词跳过、不抛错；
  2. 事件卡内 Tab 到中间选项，再 Tab / Shift+Tab 各一次 → 浏览器默认序照走，
     trap 不许把卡内正常巡航劫持成瞬移（R21 G-2 口径复测，items 名单变了要重验）;
  3. 卡外回绕方向语义复测：开卡首击 Shift+Tab → **过滤后**名单的末项，Tab → 首项
     （R21 G-1 的 last/first 现在指「可见名单」的两端，方向不许因过滤而对调）。
- **通过标准**
  - 过滤只删项不改序：可见项之间的相对顺序与 DOM 序一致，首/末回绕与卡外接管
    三分支（`fc-events.js:141-145`）语义与 R21 验收口径逐字不变；
  - fixed 定位的可聚焦项（若未来出现）不被误杀——豁免分支有测试或代码注释兜底；
  - 焦点环视觉可跟：每击一格、无跳格、无闪双环。

### G-4 trap 共享方零回退：十处调用点全吃过滤、信纸回执面一并闭合

- **操作步骤**
  1. 十处调用点（`fc-events.js:623/880/1049`、`dashboard-app.js:171/1198`、
     `fc-career.js:95`、`fc-guide.js:318`、`fc-contract.js:291/398`、`fc-ledger.js:149`）
     各开一次，Tab / Shift+Tab 走几圈核对循环如常——共享函数改一处、回归面查全场；
  2. **信纸回执面重点验**（O5 skip 的前提）：签处置后回执面上按 Shift+Tab / Tab →
     不出卡、不死键——`.fc-letter__act` 全员是 `.fc-letter__face--read` 后代（`:796-800`），
     `swap()` 置 `readFace.hidden = true`（`:859`）后被 `[hidden]` 过滤覆盖，与事件卡同構；
  3. confirm 叠事件卡（R16 场景）按 Tab：栈顶收焦语义不变；事件卡数字键 1–3 快选、
     Esc 家族四种语义（R19 G-7 / R20 G-4 / R21 G-6 口径）逐字不变。
- **通过标准**
  - 十处调用点无一因过滤出现焦点瞬移、抢焦或报错；
  - 信纸回执面与事件卡回执面同级闭合——只修 modal 不修 letter 即翻红；
  - 既有键盘手势（数字键、letter 签字/撕掉、ledger 关闭、Esc 回音 pulse）零漂移。

---

## B. picker ARIA（fc-career.js · O2 / dashboard-app.js · O3）

### G-5 选轨卡 ARIA：`fcCareerTitle` / `fcCareerLede` 双向落地

- **操作步骤**
  1. 读 `fc-career.js:51-54`：panel 带 `role="dialog" aria-modal="true"
     aria-labelledby="fcCareerTitle" aria-describedby="fcCareerLede"`；
     `<h2 id="fcCareerTitle">` 与 `<p id="fcCareerLede">` 在同一模板内定义——
     引用与定义必须成对，缺一即断链（读屏播报空名）；
  2. DevTools Accessibility 面板开选轨卡：对话框 Name 应是「第一份工，你打算走哪条线？」、
     Description 是 lede 全文——与事件卡既有 `fcEvTitle`/`fcLtTitle` 口径对齐；
  3. id 全局唯一性：选轨卡与闯城卡共用 `.fc-career-pick` 类但 id 前缀分家
     （`fcCareer*` vs `fcChallenge*`），R17 保证无同屏双 modal，但 id 也不许撞——
     grep 全 js 目录确认两组 id 各只定义一处。
- **通过标准**
  - `aria-labelledby` / `aria-describedby` 指向的 id 在开卡瞬间即存在于 DOM
    （模板串内静态携带，不依赖后置 JS 赋 id）；
  - 标题与 lede 的**文案一字不改**——本轮只加 ARIA 通道，不许顺手改措辞；
  - boot 流与手动开卡两条路径同一模板同吃（`showPicker` 单入口，验一次代码即可）。

### G-6 闯城卡 ARIA：`fcChallengeTitle` / `fcChallengeLede` 同款 + R21 lede 契约不破

- **操作步骤**
  1. 读 `dashboard-app.js:1144-1148`：panel 的 labelledby/describedby 与
     `<h2 id="fcChallengeTitle">`、`<p id="fcChallengeLede">` 成对；
  2. 核对 lede 全文仍含「必须选定一张才能往下走。」——R21 G-6 锁死的措辞是
     Esc 弱反馈双通道的一半，加 id 时不许连带改字；
  3. DevTools Accessibility 面板：Name「这六十个月，你赌哪一张牌？」、Description 为
     三句 lede 全文；reduce 模拟下开卡复核一遍（ARIA 与动效无关，应完全一致）。
- **通过标准**
  - 闯城卡对话框 Name/Description 播报成立，与选轨卡、事件卡三家口径统一；
  - 「必须选定」四字仍被测试正则锁住（见 G-8 修复后的 r21 断言）——措辞不许静默回退；
  - Esc pulse、180ms 关闭节拍、goalHud 点亮等 R20/R21 行为与本次模板改动零互扰
    （diff 只该动模板串两行，越界即翻红）。

---

## C. skip 车道与残留登记（O4 / O5）

### G-7 skip 判定书成立性：O4 已验、O5 须落盘，200ms `is-leaving` 窗口记 KNOWN

- **操作步骤**
  1. 复核 `round22/o4-skip.md`（`d40b807`）的论证：回执面按钮被 `[hidden]` 过滤覆盖、
     红线冷却走 `disabled` + 空名单两条既有路——G-1/G-2 手测通过即为其背书；
  2. O5 收口检查：信纸回执面同构已由 G-4 步骤 2 实测覆盖，合入前 `round22/` 下必须有
     `o5-skip.md`（或 O5 的等价 `swap` 改动）——车道无交代不许收口；
  3. **KNOWN 落字**：o4-skip.md 揭出的 200ms `is-leaving` 窗口（`answer()` 先加类
     0.2s 后才 `swap()`，期间问面透明但可聚焦可点击、鼠标可重入 `answer()`）
     超出本轮 O4/O5 口径，登记 KNOWN 交下轮，不许静默丢失。
- **通过标准**
  - 十路车道全有交代（代码、测试、条文或 skip 书），缺任何一路不勾 §45；
  - skip 书的技术论证与实测一致——若 G-1/G-4 手测翻红，skip 前提即坍塌，O4/O5 须重开；
  - 200ms 窗口残留在 §45 或轮次交接文档中留痕（一句即可），下轮排期依据在案。

---

## D. 回归与总闸

### G-8 【硬闸·当前红灯】R21 lede 正则修复：套件回到 33 项全绿

- **操作步骤**
  1. 现况定罪（编写时实测）：`node games/fucheng-life/tests/r21-focus-trap.test.js` 挂在
     `testRequiredWordingAndCareerLogName`——`:304` 的
     `/<p class="fc-career-pick__lede">([^<]+)<\/p>/` 要求 class 后紧跟 `>`，
     O3 插入 `id="fcChallengeLede"` 后不再命中，`assert.ok(lede)` 得 null；
  2. 修法（G1 或 O3 车道，一行级）：正则放宽为容忍属性（如
     `/<p class="fc-career-pick__lede"[^>]*>([^<]+)<\/p>/`）——**只许放宽形状，
     不许删「必须选定」措辞断言**；
  3. 修后全量 `./scripts/run-fucheng-life-tests.sh`：**33 项全绿**（R21 的 32 + r22），
     零跳过零失败。
- **通过标准**
  - 合入前套件全绿是绝对闸：当前 32 过 1 挂的状态**不许合、不许勾 §45**；
  - 教训续档：R21 G-9 的「vm 词汇表」条款本轮升级为「**模板字面形状**也在老测试锁定
    范围内——凡改共享模板串（class/id/属性序），必须全量跑套件并修正过时正则」，
    写进轮次交接；
  - 修复只动测试正则、不动 games/ 生产码（生产码的 id 是本轮立项交付，回退即翻红）。

### G-9 r22 断言覆盖面：源码 + harness 双层锁六面

- **操作步骤**
  1. 读 `tests/r22-trap-visible.test.js` 核对覆盖：① 源码正则锁 `closest("[hidden]")`
     谓词在位；② 源码正则锁空名单 `preventDefault(); return;`；③ vm harness 正向 wrap
     跳过末尾 hidden 项落到可见 first；④ 反向 wrap 跳过开头 hidden 项落到可见 last；
     ⑤ 全 hidden 名单 Tab 被吞且零 focus 调用；⑥ 两卡 ARIA 的 labelledby 引用与
     `<h2 id>` 定义成对（`fcCareerTitle` / `fcChallengeTitle`）；
  2. runner 挂载核对：`scripts/run-fucheng-life-tests.sh:61` 在位，不许靠不挂 runner 放水；
  3. vm harness 局限留档：mock 的 `closest` 只应答 `"[hidden]"` 选择器、`offsetParent`
     恒为对象——`position:fixed` 豁免分支（G-3）无自动化覆盖，行为级以 A 组手测为准。
- **通过标准**
  - 六面断言齐备，单跑 `node games/fucheng-life/tests/r22-trap-visible.test.js` 绿；
  - 断言是行为级（wrap 落点、吞键计数）而非纯字符串匹配——源码正则仅作辅锁；
  - harness 未覆盖面（fixed 豁免、describedby、真实 DOM 可见性）在本文留痕，防误判全覆盖。

### G-10 R17–R21 行为回归零断裂

- **操作步骤**
  1. 单跑五份历史测试：`r17-pending-contract` / `r18-stale-contract` / `r19-career-dismiss` /
     `r20-picker-motion` / `r21-focus-trap`（G-8 修复后）各自全绿；
  2. boot 链全程手测：选轨卡 → 闯城卡 → 合约卡按 R17 顺序到场、无同屏双 modal；
     闯城选定后 goalHud 点亮、后续链放行；
  3. R21 门禁抽测三条：G-1 卡外回绕方向语义（本轮 G-3 已含）、G-5 Esc pulse 加摘类、
     G-8 选轨日志中文名——trap 名单口径变了，这三条的运行前提都被触碰，必须复测。
- **通过标准**
  - 五份历史测试全绿；§40–§44 复查仍勾，R21 收口的 32 项资产无一退化；
  - boot 顺序与 180ms 节拍零漂移；`.fc-career-pick` 共用类下两卡模板各自改动不互扰
    （O2/O3 分文件，diff 复核无越界）；
  - R21-F2 的 R3–R7 低级残留不因本轮升级（抽查 R6 兜底措辞、R7 窄屏切口现状不变）。

### G-11 无构建 / ES5 / file:// / 390px 四不破 + §45 收口

- **操作步骤**
  1. `file://` 直开走一遍：回执面 Tab 闭合（G-1 精简版）、红线冷却吞键、两卡 ARIA
     面板播报，控制台零报错——`getComputedStyle` 走 `global` 引用在 file:// 下同样在；
  2. `tests/js-syntax.test.js` 通过：O1/O2/O3 改动为 ES5 风格（`var`/函数表达式，
     无箭头函数、let/const、模板串漏网）；
  3. 390px 设备模式：两卡开卡、Tab 循环、ARIA 无布局副作用（纯属性改动，出现任何
     视觉 diff 即翻红）；对照 §45 条文（`cab8bbb`，现为 `[ ]`）与本文逐条核对。
- **通过标准**
  - 不引入 ES6+ 语法、不新增依赖、不动构建；file:// 与 http 行为一致（过滤、吞键、ARIA）；
  - §45 的三句条文（可见过滤、空名单拦截、双卡 ARIA）与实现、测试、本文四方一致；
  - §45 的勾**只在** G-1～G-10 全过后打上；十路全有交代（O5 skip 书为当前唯一缺口，
    另有 G-8 红灯）才收口；实现与本文有出入时，以「实现 + 测试 + 本文修订」三者同步
    为准，不允许只改条文放水。

---

**门禁总数：11 条（G-1 ～ G-11）**，分四组：trap 可见项过滤 4、picker ARIA 2、
skip 车道与残留 1、回归总闸 4。
**合入前两件事**（写作时点）：① G-8 的 R21 正则红灯必须修绿；② O5 的 skip 书必须落盘。

model slug: claude-fable-5-thinking-xhigh
