# R16 SOTA 门禁 · 危机/O1 刷新补弹 + 快进内确认（pendingModal / 补弹顺序 / 内置确认 / 不吞奖惩）

> 作者：R16-F1（fable）。本文是 R16 的验收 SSOT：下列门禁**全部通过**方可合入 / 勾选 ACCEPTANCE §39。
> 对象代码：`games/fucheng-life/js/dashboard-app.js`、`js/fc-sim.js`、`js/fc-events.js`（或独立 `js/fc-confirm.js`）、
> `css/fc-events.css`、`js/fc-guide.js`、`screens/dashboard.html`。
> 编写时对照的分支状态：O2 的 `pendingModal` sim 助手（commit `147845a`）、O4 的确认面板样式（`6357535`）、
> O5 的教学 v6（`145056e`）、G1 的 `tests/r16-crisis-replay.test.js`（`0fb9b91` + `bf4bc68`）、G2 的 §39 条文（`de1b8f2`）
> 已提交；O3 的 `FC.confirm`（`fc-events.js`）在工作区**待提交**；O1 的 `dashboard-app.js` 接线
> （`openEvent` 写销 / `replayPendingModal` / `startFastForward` 换确认）**尚未落地**。门禁按**行为**验收，不锁实现细节与具体常数。
> 依据：`round15/fable-r15-playfeel.md` 的 R17 / P8（危机刷新吞卡）与 `round16/R16_DISPATCH.md` 四项目标。

## 0. 验收环境准备

- 本地起服：仓库根目录 `python3 -m http.server 8000`，浏览器打开
  `http://localhost:8000/games/fucheng-life/`（file:// 直开亦须可用，见 G-14）。
- 自动化：`./scripts/run-fucheng-life-tests.sh`；R16 断言在 `tests/r16-crisis-replay.test.js`（已挂进 runner）。
- 控制台探针（仪表盘页可用）：`FC.Sim.setPendingModal / clearPendingModal / hasPendingModal`、
  `FC.read().run.pendingModal`、`FC.confirm`。改状态后触发一次渲染或重进页面。
- 常用构造：
  - 危机必判月：`run.lastCrisisMonth = run.months - 6; run.recentCrisis = []`，再固定
    `Math.random = function () { return 0; }` 让 R15 概率闸必过；
  - 合约到期：`run.contract.deadlineMonth = run.months`（下次月结即结算）；
  - 人情讨债强弹：构造 `FC.Sim.dueNpcFollowup(run)` 非空的回账月（压 NPC balance 后推进）。

---

## A. pendingModal 生命周期（补弹的根，R15 风险 R17 / P8）

### G-1 置位时机：卡弹出即挂账，玩家确认前先落盘

- **操作步骤**
  1. 构造危机必判月推进一月，危机卡弹出后**不作答**，控制台读 `FC.read().run.pendingModal`；
  2. 分别用 O1 随机强弹月、人情讨债强弹月重复第 1 步；
  3. 对挂上的 payload 跑 `JSON.stringify(run.pendingModal)`。
- **通过标准**
  - 月结抽出的危机 / O1 / 人情讨债强弹三类卡，在**玩家确认落账之前**就把事件载荷写进 `run.pendingModal`
    并经 `FC.write` 落盘——读的是 `FC.read()` 的持久层而不只是内存对象，否则刷新即失忆；
  - payload 可序列化（`JSON.stringify` 不抛）、含 `kind`（`"crisis" | "o1" | "npc"`，缺省允许 `null`）与
    `event`（至少 `id / title / choices`，够 `openEvent` 原样再开一次）；
  - **存不下的卡一律不挂**：`setPendingModal` 对缺 `event.id` 的残卡、循环引用等造不出快照的输入置 `null` 返回
    ——挂半张残卡比不挂更糟（sim 层已实现，dashboard 不许绕过它手写 `run.pendingModal`）；
  - 非强弹路径不受影响：toast / letter / inline 事件、链式事件、要约 picker 都不挂 `pendingModal`。

### G-2 销账时机：确认即清，dismiss 不清

- **操作步骤**
  1. 接 G-1，点卡上任一选项落账，读 `FC.read().run.pendingModal`；
  2. 再造一张挂账卡，这次按 Esc / 点遮罩把卡 dismiss 掉，读同一字段；
  3. dismiss 后刷新页面重进，观察 boot。
- **通过标准**
  - 玩家**真选了选项**（`openEvent` 的 `res.dismissed` 为假、deltas 已 apply）的那次，`pendingModal` 清为 `null`
    并随 `FC.write` 落盘——销账与入账同一笔事务，不允许「账入了、待办还挂着」；
  - dismiss（Esc / 遮罩 / `requestClose` 的 deny 路径）**不清除** `pendingModal`：未落账就不销，
    与合约结算 `resolutionPending` 的语义完全一致；
  - 第 3 步重进后同一张卡（同 `id`、同选项）补弹出来——dismiss 只是「这会儿不想看」，不是「这事没发生」。

### G-3 新档初值与旧档迁移：宁可不补、绝不造假

- **操作步骤**
  1. 单测 / 控制台：`FC.Sim.freshRun(era, origin).pendingModal` 应为 `null`；
  2. 造 R15 及更早存档（`delete run.pendingModal`）走 `FC.Sim.migrate`，读迁移结果；
  3. 迁移档重进仪表盘、推进一月、快进各一次。
- **通过标准**
  - `freshRun` 自带 `pendingModal: null`，`migrate` 给缺字段的旧档补 **`null`**——旧档里被吞过的危机
    无从追认，宁可承认历史损失也不许伪造待办双发（与 R15 G-10 同一取舍，措辞记入 KNOWN / 测试注释）；
  - 迁移后 `hasPendingModal` 恒可安全调用，无 `undefined` 引用报错；
  - `run` 为空、payload 为非对象时三个 sim API 都静默退化（返回 `null` / `false`），不成为新的崩溃点。

---

## B. boot 补弹顺序（合约结算先于危机，欠账都要还）

### G-4 补弹链排序：合约结算 > 危机/O1 补弹 > 选轨 > 闯城目标 > 签约 > 教学

- **操作步骤**
  1. 只挂 `pendingModal`（无合约欠账）刷新重进，记录 boot 弹窗顺序；
  2. 读 `init` 里的补弹链源码，对照 `replayContractResolution` 与 `replayPendingModal` 的先后。
- **通过标准**
  - `init` 的 boot 链在 `replayContractResolution` **之后**（或同一 then 链的紧邻下一环）调用
    `replayPendingModal`，两者都在 `maybeOfferCareerTrack / maybeOfferChallengeGoal / maybeOfferContract / guide`
    之前——欠玩家的账先还，再谈新生意与教学；
  - `replayPendingModal` 走 `openEvent` 正常事件路径补弹（同一张卡、同一套选项与 deltas 管线），
    不允许旁路一条只渲染不记账的「影子弹窗」；
  - 无欠账时 `replayPendingModal` 静默返回 false，boot 链其余环节行为与 R15 一字不差。

### G-5 双欠账同月：先合约后危机，两张都弹、各结各账

- **操作步骤**
  1. 构造合约到期月 + 危机必判月叠加：月结先弹结算卡，**不确认**直接刷新
     （此时 `resolutionPending` 已置位；若当月危机卡也已弹出未答，`pendingModal` 同时在挂）；
  2. 重进仪表盘，逐张点掉补弹的卡，记录顺序与数值变化；
  3. 再刷新重进一次。
- **通过标准**
  - 两笔欠账**都补**：合约结算卡先弹，确认后危机 / O1 卡接着弹——顺序固定（合约 > 危机），
    不允许其中一张被另一张顶掉；
  - 各自恰好入账一次：结算卡销 `resolutionPending`、危机卡销 `pendingModal`，两套标记互不干扰、
    互不代签；第 3 步的第二次重进**两张都不再弹**、数值不再变；
  - 只欠一笔时另一环节零感知：只挂合约走 R15 G-9 原行为，只挂危机走 G-4 行为。

### G-6 补弹占当月额度 + 静默模式 + 死待办兜底

- **操作步骤**
  1. 补弹成功后**当月内**（不推进）观察是否又叠新强弹窗；随后正常推进一月看月结；
  2. 补弹时同屏观察月度账本 / 教学是否叠加；
  3. 控制台造一张 `event` 缺 `choices` 等开不出来的残 payload 直塞 `run.pendingModal`（绕过 setPendingModal 模拟脏档）后重进。
- **通过标准**
  - 补弹成功**占用当月强弹窗额度**：boot 链内不再为同月叠新的危机 / O1 门
    （本轮只保证进门补弹；boot 后玩家立即 tick 抽出下月新卡不算违例——该边界记入 §39 措辞或 KNOWN）；
  - 补弹以静默模式（`openEvent` 的 `silent`）打开，不与月度账本 / 教学同屏叠加——R14 单月弹窗帽语义在 boot 链同样成立；
  - 残 payload 开不出卡时**清掉 `pendingModal` 放行**并落盘：boot 链不许被一条死待办卡成每次重进都空转，
    与 R15 G-9 的 `resolutionEvent` 兜底同款取舍（放行要留日志或注释痕迹，方便追账）。

---

## C. 快进内确认（替换 window.confirm，R15 移动端风险）

### G-7 `FC.confirm` 行为契约：Promise、默认答案是「不」

- **操作步骤**
  1. 控制台调 `FC.confirm({ title: "测试", body: "内容" })`，分别点「确定」「取消」、按 Esc、点遮罩四次，记录 resolve 值；
  2. 先开一张事件卡再调 `FC.confirm`，观察层级；
  3. 单测：`tests/r16-crisis-replay.test.js` 的 confirm 段全过。
- **通过标准**
  - `FC.confirm(opts)` 返回 `Promise<boolean>`：确定 `true`；取消 / Esc / 点遮罩一律 `false`——
    问「这一步撤不回来」时默认答案永远是「不」，不存在第三态或悬挂不 resolve 的 Promise；
  - 确认框自成 overlay 层（`kind: "confirm"`），能**压在**已开的事件卡 / 账本之上发问而不是被当成第二个
    modal 拒掉；关闭后焦点与按键路由还给下层窗口，Tab 被 trap 在面板内；
  - `FC.overlay.push` 失败等异常路径 resolve `false` 并自清 DOM，不留孤儿 scrim 锁死页面；
  - 该模块必须被 `dashboard.html` 实际加载（写在 `fc-events.js` 内随原 script 加载，或新建
    `fc-confirm.js` 且 html 加了 script 标签）——不许留一段没人引的死代码。

### G-8 `startFastForward` 接线：三条护栏文案原样、桌面手机同路径

- **操作步骤**
  1. 桌面点「快进三月 ▸▸」，读弹出的确认面板全文；点「取消」确认没快进，再点「确定」确认快进照跑；
  2. ≤640px 打开「更多」抽屉走同一入口重复第 1 步；
  3. 搜 `dashboard-app.js` 源码确认 `window.confirm` 调用已消失。
- **通过标准**
  - `startFastForward` 不再调用 `window.confirm`（移动端 WebView 阉割 / 阻塞主线程的风险源清除），
    改走 `FC.confirm` 的 then 链：`false` 不动一格，`true` 才进 `fastForwardMonths`；
  - 确认文案保留 R15 三条护栏说明，缺一不可：**不会自动去探区**（目标保留、要自己点）、
    **现金紧时优先上班**（不拿 AP 进修 / 休息）、**遇大事会停下**——允许改措辞，语义不许丢；
  - 桌面与手机抽屉走**同一条**确认路径、同一份文案，不许给移动端留降级分支；
  - 快进中 / 结局后再点入口仍被 `fastForwarding / run.ended` 闸住，确认框不重复叠开。

### G-9 确认面板样式与可达性

- **操作步骤**
  1. 检查 `fc-event--confirm` 面板观感与既有事件卡的层级关系；
  2. DevTools 设 `prefers-reduced-motion: reduce` 后重开一次；
  3. 390px 视口重开一次。
- **通过标准**
  - 面板借 `.fc-event` 的壳（同层色 / scrim / 开合动效）、观感克制无紫霓虹（O4 约定），
    `role="alertdialog"` + `aria-modal` + 标题 / 正文 aria 关联齐备，打开即焦点落在主按钮上；
  - reduced-motion 下开合即时完成、可正常作答；390px 无横向溢出、按钮不出屏（ACCEPTANCE §12 / §14 不回退）；
  - 关闭动画期间重复点击不双 resolve（`settled` 闸），DOM 节点关闭后移除干净。

---

## D. 不吞奖惩（恰好一次入账）

### G-10 刷新重进补弹：奖惩恰好一次

- **操作步骤**
  1. 危机卡弹出后不作答，记下现金 / 健康 / KPI 基线，刷新重进；
  2. 点掉补弹卡的选项，记录数值变化与日志条目；
  3. 再刷新重进一次，核对数值与日志。
- **通过标准**
  - 危机 / O1 / 人情讨债的奖惩通过补弹卡的选项落账**恰好一次**：确认后才销账，第 3 步的第二次重进
    不再弹、数值不再变、日志不重复——现金 / 健康 / 人情账三方与文案对得上；
  - 弹出即生效的旁路清零：不存在「抽卡时先扣一半、确认再扣一半」的分裂记账，全部 deltas 走
    `openEvent → applyDeltas / applyNpcEffects` 单一路径；
  - 不刷新的正常路径同样干净：当月直接确认后 `pendingModal` 为 `null` 且已落盘，下次重进零补弹。

### G-11 dismiss 不吞不发：欠账一直挂到还清

- **操作步骤**
  1. 危机卡 dismiss 掉（Esc / 遮罩），核对数值零变化，刷新重进让它补弹，再 dismiss、再重进，共两轮；
  2. 第三轮补弹时正常确认。
- **通过标准**
  - dismiss 的卡**不落账也不销账**：deltas 不 apply、`pendingModal` 原样保留，重进永远继续补——
    吞卡（R15 P8）与白捡都不可能发生；
  - 连续多轮 dismiss / 重进不累积副作用：payload 不被重复包裹、日志不长出「幽灵条目」、
    `FC.write` 的档不膨胀；
  - 第三轮确认后一切归零：入账一次、销账一次，后续重进不弹。

### G-12 补弹不二次记账：抽卡期账本不重跑

- **操作步骤**
  1. 危机卡挂账刷新前，控制台记下 `run.lastCrisisMonth / run.recentModal / run.recentCrisis / run.done /
     run.sinceModal` 与 NPC followup 标记；
  2. 重进补弹（先不确认）再读同一组字段；确认后再读一次。
- **通过标准**
  - `drawModalEvent` 在**抽出**那刻记的账（`lastCrisisMonth`、`recentModal` 追加、`once → run.done`、
    `markNpcFollowupFired`、`sinceModal` 清零、`noteCrisis / recentCrisis`）在补弹时**一律不重跑**——
    补弹是「重演同一张卡」，不是「又抽了一张」：冷却计时、去重窗、once 标记都不许被补弹推一格；
  - 由此危机冷却 / 概率闸（R15 G-11）与去重（R14 G-12）行为不受补弹影响：补弹月之后的危机节奏
    与不刷新的对照局一致；
  - 确认落账那刻也只销 `pendingModal`，不追加第二次抽卡记账。

---

## E. 回归与总闸

### G-13 测试全绿

- **操作步骤**
  1. 仓库根目录执行 `./scripts/run-fucheng-life-tests.sh`；
  2. 单跑 `node games/fucheng-life/tests/r16-crisis-replay.test.js`。
- **通过标准**
  - 既有全部测试与 R16 新增断言全绿，零跳过零失败，新测试已挂进 runner（已核：`0fb9b91` 挂上）；
  - R16 测试至少覆盖：`pendingModal` 置位—序列化—销账—迁移全链、`openEvent / replayPendingModal` 参与
    持久化、boot 里 `replayPendingModal` 排在 `replayContractResolution` 之后、`startFastForward` 走
    `FC.confirm` 且无 `window.confirm`、`FC.confirm` 模块被 dashboard 实际加载且可 resolve；
  - R14 / R15 的既有断言（弹窗帽、概率闸、`resolutionPending`、快进护栏）不回退。

### G-14 无构建 / ES5 / file:// 三不破

- **操作步骤**
  1. `file://` 直开 `games/fucheng-life/index.html` 走一遍：开局 → 推进抽危机 → 挂账刷新 → 补弹确认 → 快进内置确认；
  2. `tests/js-syntax.test.js` 通过（含本轮改动的全部 JS 文件）。
- **通过标准**
  - 本轮改动不引入 ES6+ 语法、不新增外部依赖（ES5、无构建直开的项目约定；`FC.confirm` 的 Promise
    用法与现有 `FC.events.show` 同款）；
  - file:// 下补弹、内置确认、销账行为与 http 下一致；控制台无新增报错或未捕获 Promise 拒绝。

### G-15 验收条文与玩家告知闭环

- **操作步骤**
  1. 对照 `games/fucheng-life/ACCEPTANCE.md` §39 与本文档逐条核对，§38 复查；
  2. 清 `localStorage` 的 `fucheng.guide.*` 开新局，翻教学「③ 推进一个月」步。
- **通过标准**
  - §39 条文（pendingModal 先写后清 / 关闭刷新保留补弹 / 补弹占当月额度 / 确认只入账一次 /
    双端内置确认三护栏 / 测试全绿）与本文门禁一致，G-1～G-14 全过后方可勾 `[x]`；§38 保持 `[x]` 不回退；
  - 教学 v6（`fucheng.guide.v6`）写明「危机 / 事件弹窗确认才算数，确认前刷新会再弹同一张」；
    key 升版后老玩家重看一遍，`dismiss / reset` 同步处理 v5 及更早 key，不留半读状态（已核：`145056e`）；
  - 若实现与本文有出入，以「实现 + 测试 + 本文修订」三者同步为准，不允许只改条文放水。

---

**门禁总数：15 条（G-1 ～ G-15）**，分五组：pendingModal 生命周期 3、boot 补弹顺序 3、快进内确认 3、不吞奖惩 3、回归总闸 3。

model slug: claude-fable-5-thinking-xhigh
