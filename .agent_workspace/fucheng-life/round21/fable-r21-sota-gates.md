# R21 SOTA 门禁 · 焦点 trap 闭合（FC.overlay.trap 卡外回绕）+ 闯城 Esc 弱反馈 + 选轨日志中文名

> 作者：R21-F1（fable）。本文是 R21 的验收 SSOT：下列门禁**全部通过**方可合入 / 勾上 ACCEPTANCE §44。
> 对象代码：`games/fucheng-life/js/fc-events.js` 的 `FC.overlay.trap`（卡外焦点回绕，O1 可写）、
> `js/dashboard-app.js` 的 `maybeOfferChallengeGoal`（Esc 反馈 + lede，O2）与 `maybeOfferCareerTrack`
> 一带（选轨日志中文名，O4）、`css/fc-gameplay.css`（shake/pulse + reduce，O3；reduce 可见性硬化，O5）、
> §44 条文（G2）、`tests/r21-focus-trap.test.js` + runner（G1）。
> **要点**：trap 修在 `FC.overlay.trap` 一处，全站九个调用方同吃（选轨卡、闯城卡、合约卡、事件卡、
> letter、confirm、ledger、探区 sheet、guide tip）——收益共享，回归面也共享，见 G-4。
> 编写时分支快照 @ `96d467b`：十路代码/测试/条文**已全部落盘**（O1 `12d7a13`、O2 `2b627f3` + 热修
> `96d467b`、O3 `04f15cb`、O4 `bb40db0`、O5 `ee90bb7`、G1 `1a46b58`、G2 `5a8d81c`，§44 未勾），
> 本机复跑 `./scripts/run-fucheng-life-tests.sh` **32 项全绿**。
> 注意一桩已销的**近失事故**（教训入 G-9）：O2 初版 `pulseEsc` 用了 `clearTimeout`，r20 测试的 vm
> sandbox 只喂了 `setTimeout` 没喂 `clearTimeout`，`1a46b58` 时点全量 31 绿 1 红（r20 假死于
> ReferenceError）；`96d467b` 改用 gen 计数器作废旧回调后复绿。结论：`maybeOfferChallengeGoal`
> 函数体内的全局 API 词汇表被 r20/r21 两个 harness 共同锁死，后续任何轮次给它加新全局调用，
> **必须同步补两个 sandbox**，否则旧测试假红。
> 门禁按**行为**验收，不锁实现细节（shake 位移幅度 / 时长可调，时序契约与语义不可破）。
> 依据：`round21/R21_DISPATCH.md`；R20 playfeel R1（trap 泄焦）/ R2（Esc 零反馈）/ R3（日志 slug）；
> R20 门禁 G-4（Esc 吞掉）与 G-5（Tab trap）。

## 0. 验收环境准备

- 本地起服：仓库根目录 `python3 -m http.server 8000`，打开
  `http://localhost:8000/games/fucheng-life/`（file:// 直开亦须可用，见 G-11）。
- 自动化：`./scripts/run-fucheng-life-tests.sh`；R21 断言在 `tests/r21-focus-trap.test.js`（G1 落，
  runner 第 32 行已挂）。
- 常用构造（沿 R20 §0）：
  - **闯城卡场景**：控制台 `run.challengeMonths = 60; run.goal = null; FC.write({ run: run })` 后刷新；
  - **选轨卡场景**：`run.career.picked = false; FC.write({ run: run })` 后刷新；
  - **合约卡场景**：正常推月至合约弹出，或沿 r17 测试构造 `pendingContract`；
  - **reduced-motion**：DevTools → Rendering → Emulate CSS media feature
    `prefers-reduced-motion: reduce`；
  - **泄焦探针**：开卡后在 Console 敲 `document.activeElement`，配合 DevTools 的 Emulate focused page
    （或直接肉眼盯焦点环），逐击记录焦点落点。

---

## A. 焦点 trap 闭合（fc-events.js · O1）

### G-1 卡外焦点回绕：activeElement 等于 rootEl 或不在 items 内时，Tab→first、Shift+Tab→last

- **操作步骤**
  1. 闯城卡场景开卡（焦点在 `.fc-career-pick__panel`，`tabindex="-1"`，不在 items 名单里），
     **第一个动作**按 Shift+Tab → 核对焦点落到面板内**最后一张**目标卡且不出卡；
  2. 刷新重开，第一个动作按 Tab → 核对焦点落到**第一张**目标卡；
  3. 读 `FC.overlay.trap`（`fc-events.js:120` 一带）：`items.indexOf(doc.activeElement) < 0` 分支
     必须 `preventDefault()` 并按 `e.shiftKey` 分送 last / first，且排在首/末回绕两分支**之前**。
- **通过标准**
  - 开卡后首击 Shift+Tab **不再**漏到背后仪表盘（R20 playfeel R1 的定罪路径 P1 转正为负向对照：
    改动前这一步焦点直接落到仪表盘最后一个可聚焦控件）；
  - Tab / Shift+Tab 两个方向都接管：卡外或 rootEl 上的焦点一击即被收回卡内，方向语义正确
    （Shift+Tab 给 last、Tab 给 first——不许两个方向都塞 first）；
  - `items` 为空时 trap 保持早退不抛错（guide tip 等极简卡可能一个可聚焦项都没有）。

### G-2 trap 不越权：卡内中间项的浏览器默认序保留

- **操作步骤**
  1. 闯城卡内 Tab 到第二张目标卡（三张卡的中间项），再按 Tab 与 Shift+Tab 各一次；
  2. 核对焦点按 DOM 序正常走到第三张 / 第一张——**不**被 trap 抢走跳到 first/last；
  3. 读代码核对：`indexOf >= 0` 且非首末时三个分支都不命中，函数自然返回、不 `preventDefault`。
- **通过标准**
  - 焦点在 items 中间时 trap 零介入：浏览器默认 Tab 序不被劫持（新分支只许接管**卡外**焦点，
    不许把卡内正常巡航也改成瞬移）；
  - 首/末项的既有回绕（R20 G-5 验过的 Tab 末→首、Shift+Tab 首→末）逐字不变；
  - 焦点环视觉可跟：每击一格，无跳格、无闪双环。

### G-3 三卡同吃：选轨 / 闯城 / 合约首击泄焦手测各过一遍

- **操作步骤**
  1. 选轨卡、闯城卡、合约卡三个场景各开一次，每张卡重复 G-1 步骤 1–2（首击 Shift+Tab、
     刷新后首击 Tab）；
  2. 每击后 Console 查 `document.activeElement`，确认始终在卡内；
  3. 泄焦定罪补测：任一张卡内连按 Shift+Tab 六次以上，然后按 Enter——不许触发背后仪表盘
     控件（改动前闯城卡下能按到 `tickBtn` 打「还有 N 点行动点」日志，这是本 gate 的负向对照）。
- **通过标准**
  - 三张卡全部闭合：修在 trap 一处、三卡同吃是本轮立项理由，只对一两张卡生效即翻红；
  - 任意连击序列下 `document.activeElement` 永不出卡，Enter 永远只可能触发卡内按钮；
  - §43 / R20 门禁 G-5 当时收窄的措辞（「进入卡内后循环成立」）由本轮升格为无条件成立——
    §44 条文按新口径落字（G2 已写「首击 Shift+Tab 不泄焦」，与实现对齐）。

### G-4 trap 共享方零回退：其余六个调用方行为不被新分支波及

- **操作步骤**
  1. 事件卡（modal）、letter、`FC.confirm`（重开人生确认框）、ledger 账本、探区 sheet、
     guide tip 各开一次，Tab / Shift+Tab 走几圈核对循环如常；
  2. 事件卡上核对数字键 1–3 快选与 Esc 关闭仍好（onKey 的 Tab 分支 return 后数字分支不受影响）；
  3. confirm 叠在事件卡上时（R16 场景）按 Tab：焦点应被收进 confirm 的「取消/确认」两键内循环，
     不许漏回底下的事件卡。
- **通过标准**
  - 九个调用方（`dashboard-app.js:171` 探区、`:1197` 闯城、`fc-events.js:608/865/1034`、
    `fc-career.js:95`、`fc-guide.js:318`、`fc-contract.js:291/398`、`fc-ledger.js:149`）无一
    因新分支出现焦点瞬移、抢焦或报错——共享函数改一处、回归面查全场；
  - 叠层场景（confirm over modal）下 trap 以**栈顶**的 rootEl 为准收焦点，语义只会更紧不会更松；
  - 事件卡数字键、letter 签字/撕掉、ledger 关闭等既有键盘手势逐字不变。

---

## B. 闯城 Esc 弱反馈（dashboard-app.js · O2 / fc-gameplay.css · O3）

### G-5 吞 Esc 有回音：一次性 shake，连按重放，选定后不抖

- **操作步骤**
  1. 闯城卡场景开卡按 Esc 一次：面板应做一次短促阻尼横向 shake（约 0.2s）后归位；
  2. 快速连按 Esc 五次：每次都应重新起拍（JS 先摘 `is-esc-pulse` → `void offsetWidth` 强制回流 →
     再补类；旧定时回调靠 gen 计数器作废），不许出现「第一次抖完后续按键装死」；
  3. 点定一张目标卡后、180ms 关闭窗口内再按 Esc：不许再抖（`pulseEsc` 的 `settled` 早退）；
  4. 读 CSS：`@keyframes fc-career-pick-esc`（`fc-gameplay.css:1159` 一带）与
     `.is-esc-pulse` 规则（panel 挂类与 host 挂类两种写法都吃）；核对动画时长（0.2s）**小于**
     JS 摘类延迟（320ms）——抖到一半被摘类会肉眼闪断，这个时长关系是契约，改动画必须连改定时。
- **通过标准**
  - Esc 每按必有一次完整 shake，无累积位移、无残留 transform（keyframes 终点归 none）；
  - shake 只做位移不发光不换色——「弱反馈」定位，别升级成错误红闪；
  - `settled` 后零反馈零报错；关闭动画期间 Esc 不复活卡也不打断收尾；
  - 与 R20 面板动效不打架：shake 的 animation 与 panel 既有 transform 过渡并存时无跳位
    （animation 生效期覆写 transform 属预期，结束即还原）。

### G-6 Esc 语义分毫不变 + lede 明示「必须选定才继续」

- **操作步骤**
  1. 重跑 R20 G-4 全套：连按 Esc 后核对卡仍在、`FC.read().run.goal` 仍空、日志零新增、
     `preventDefault` 不外泄；
  2. 读 `onKey`（`dashboard-app.js:1195` 一带）：Escape 分支 `preventDefault(); pulseEsc(); return;`
     ——`pulseEsc` 是纯视觉旁路，`finish` 的 `id || goals[0].id` 兜底仍然够不到；
  3. 肉眼核对 lede（`:1147`）：「必须选定一张才能往下走。」在卡面可见、不被截断；
  4. 对照组：boot 流选轨卡 Esc 仍落推荐轨、手动选轨 Esc 仍取消、合约卡 Esc 仍跳过本月——
     四种 Esc 语义（R19 G-7 / R20 G-4 口径）逐字不变，本轮只给闯城卡**加反馈**不改语义。
- **通过标准**
  - Esc 任按多少次：不关卡、不落默认目标、无「主目标定为…」日志——反馈是加法，语义零改动；
  - lede 半句常驻卡面（不是 Esc 后才出现的动态提示），reduce 下同样在（见 G-7）——
    R20 playfeel R2 记的「视觉同款、语义分家无线索」两轮账就此销掉；
  - 其余三种 Esc 语义（boot 选轨 / 手动选轨 / 合约）回归手测各一遍，零漂移。

### G-7 reduced-motion：shake 归零、提示仍在、O5 可见性硬化不回退

- **操作步骤**
  1. §0 模拟 reduce 后开闯城卡按 Esc 数次：无任何动画，但卡、lede、焦点、吞键行为全部照常；
  2. 读 CSS：esc-pulse 专属 reduce 块（`fc-gameplay.css:1172` 一带）`animation: none`；
     picker 主 reduce 块（`:1213` 一带）含 O5 硬化行 `.fc-career-pick:not(.is-closing) { opacity: 1 }`
     ——reduce 下可见性不再依赖 rAF 挂 `is-open`（R20 playfeel R4 的账）；
  3. 顺手核对既有 reduce 规则三处（`.fc-drawer__sheet`、`.fc-coach__hole`、picker transition none）
     未被本轮两处新增挤掉或改序。
- **通过标准**
  - reduce 下 Esc 零动画零位移，lede「必须选定」照常可读——运动敏感玩家拿文案兜底，
    §44 条文（「无动画，提示仍保留」）与实现对齐；
  - reduce 下开卡即现（含后台标签页开局、rAF 被暂停的场景）：`:not(.is-closing)` 限定保证
    关闭渐隐语义不被硬化行误伤；
  - 全部 reduce 块（新旧五处）互不覆盖、选择器权重无回退。

---

## C. 选轨日志中文名（dashboard-app.js · O4）

### G-8 日志印 `careerTracks.name`，不再印英文 slug

- **操作步骤**
  1. 选轨卡场景选「职员线」：日志应出「你选择了「职员线」轨道作为起点。」——不是「staff」；
  2. 读代码（`dashboard-app.js:1119` 一带）：`trackName` 由 `FC.Sim.pack.careerTracks` 按
     `t.id === id` 查 `t.name`，查不到（pack 缺失 / name 为空）回退 `id` 不抛错；
  3. 三条轨道各选一次核对全部中文；同屏对照闯城日志「主目标定为「落户上岸」」——
     R20 playfeel R3 记的「同一屏一中一英」就此对齐。
- **通过标准**
  - 玩家日志永不出现 `staff` / `hustle` 这类 slug；`careerTracks` 的 `name` 是唯一显示来源；
  - `FC.Sim.pack` 未就绪或条目缺 `name` 时静默回退 id、不炸选轨链路（防御分支验一次即可）；
  - `applyTrack` / `render` / `renderLog` 的调用序不因取名改动而变；R19 手动选轨 Esc 取消路径
    （null 早退、无日志）不受波及。

---

## D. 回归与总闸

### G-9 测试全绿 32 项 + r21 断言覆盖三面 + vm 词汇表教训落地

- **操作步骤**
  1. 根目录 `./scripts/run-fucheng-life-tests.sh` 全量；单跑
     `node games/fucheng-life/tests/r21-focus-trap.test.js`；
  2. 读 r21 测试源码核对覆盖面：trap 六向断言（rootEl / 卡外 / 首项 / 末项 × 两方向）、
     闯城 Esc 的 pulse 类加摘与「不落兜底目标、不进 finish、不 pop」全套负向断言、
     lede 措辞与选轨日志 trackName 的正则；
  3. 复核近失事故已闭环：`maybeOfferChallengeGoal` 现行实现不再引用 r20/r21 两个 vm sandbox
     词汇表之外的全局（gen 计数器替代 `clearTimeout`，`96d467b`）；两个测试各自的 sandbox
     喂了什么全局，据实读一遍留档。
- **通过标准**
  - 全量 **32 项全绿**（R20 的 31 + r21），零跳过零失败；runner 第 32 行挂载在位，
    不许靠不挂 runner 放水；
  - r21 断言至少锁三面：trap 卡外回绕（含方向正确性）、Esc pulse 加类 / 定时摘类 / 语义零改动、
    lede 与日志中文名措辞——正则与 vm harness 的已知局限续档 R20 G-10 口径，行为级以本文
    A / B / C 组手测为准；
  - **词汇表约束落字**：后续轮次凡改 `maybeOfferChallengeGoal` 函数体新增全局 API 调用，
    必须同步补 r20 / r21 两个 sandbox，否则旧测试假红——本条写进轮次交接，不许口传。

### G-10 R17–R20 行为回归零断裂

- **操作步骤**
  1. 单跑四份历史测试：`node games/fucheng-life/tests/r17-pending-contract.test.js`、
     `r18-stale-contract.test.js`、`r19-career-dismiss.test.js`、`r20-picker-motion.test.js`；
  2. boot 链全程手测一遍：选轨卡 → 闯城卡 → 合约卡按 R17 顺序到场，无同屏双 modal；
     闯城卡选定后 goalHud 点亮、后续链照常放行；
  3. R20 门禁抽测三条：G-1 开合动效双卡同吃、G-4 Esc 吞掉（本轮 G-6 已含）、G-6 关闭
     `is-closing` → 180ms → pop → resolve 收尾与 `settled` 防连点。
- **通过标准**
  - r17 / r18 / r19 / r20 四份测试全绿：trap 新分支与 pulseEsc 不许惊动 boot 顺序、
    stale 合约重放、cancelable 分流、picker 动效四家的既有断言；
  - boot 链顺序与 180ms 节拍零漂移；`.fc-career-pick` 共用类下选轨卡的 DOM 结构与返回值
    语义不被 O2 的闯城改动连带（两人同文件不同函数区，diff 复核无越界）；
  - §40–§43 复查仍勾；R20 已收口的 31 项资产无一退化。

### G-11 无构建 / ES5 / file:// / 390px 四不破 + §44 收口

- **操作步骤**
  1. `file://` 直开走一遍：三卡首击泄焦（G-3 精简版）、闯城 Esc shake、选轨日志中文名，
     控制台零报错；
  2. 390px 设备模式：shake 位移（±5px）不引发横向滚动条、面板不溢出；reduce 硬化行
     在窄屏同样生效；
  3. `tests/js-syntax.test.js` 通过（`fc-events.js` / `dashboard-app.js` 改动为 ES5 风格，
     无箭头函数 / let / const 漏网）；对照 §44 条文（`5a8d81c`，现为 `[ ]`）与本文逐条核对。
- **通过标准**
  - 不引入 ES6+ 语法、不新增依赖、不动构建；file:// 与 http 行为一致（trap、shake、日志、落盘）；
  - 窄屏下 shake 无布局副作用（transform 不参与布局，出现滚动条即翻红）；
  - §44 的勾**只在** G-1～G-10 全过后打上；十路都有交代（O1 / O2 / O3 / O4 / O5 / G1 / G2 已落，
    F2 / F3 编写本文时尚欠）才收口；若实现与本文有出入，以「实现 + 测试 + 本文修订」三者
    同步为准，不允许只改条文放水。

---

**门禁总数：11 条（G-1 ～ G-11）**，分四组：焦点 trap 闭合 4、
闯城 Esc 弱反馈 3、选轨日志中文名 1、回归总闸 3。

model slug: claude-fable-5-thinking-xhigh
