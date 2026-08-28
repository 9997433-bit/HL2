# R17 SOTA 门禁 · 合约 O1 挂账收窄 + boot 连弹收敛 + 危机扩池（tracksPending / replayed 旗标 / MONTH_CRISES）

> 作者：R17-F1（fable）。本文是 R17 的验收 SSOT：下列门禁**全部通过**方可合入 / 勾选 ACCEPTANCE §40。
> 对象代码：`games/fucheng-life/js/dashboard-app.js`（`tracksPending` / `isContractResolutionEvent` / `init` boot 链）、
> `js/fc-sim.js`（`MONTH_CRISES` 扩池）、`js/fc-guide.js`（教学 v7）、`data/story.json`（EV93–EV97 合约门禁 O1）。
> 编写时对照的分支状态：O1 的收窄与 boot 收敛（commit `467134e`）、O2 的危机扩池三条（`38c16d6`）、
> G1 的 `tests/r17-pending-contract.test.js`（`3803117`，已挂 runner）、G2 的 §40 条文（`2c57bcc`）已提交；
> O3 的 `fc-guide.js` v7（key 升版 + 「④ 人生合约」补写一句）在工作区**待提交**——合入前必须落地，否则 G-11 空悬；
> O4 / O5 编写时尚无产物。门禁按**行为**验收，不锁实现细节与具体常数。
> 依据：`round16/fable-r16-playfeel.md` R1（合约门禁 O1 被 `ev.contract` 误排除，刷掉即永久丢失）
> 与 boot 进门 4–6 连弹问题；目标见 `round17/R17_DISPATCH.md`。

## 0. 验收环境准备

- 本地起服：仓库根目录 `python3 -m http.server 8000`，浏览器打开
  `http://localhost:8000/games/fucheng-life/`（file:// 直开亦须可用，见 G-13）。
- 自动化：`./scripts/run-fucheng-life-tests.sh`；R17 断言在 `tests/r17-pending-contract.test.js`
  （已核：runner 第 56 行挂上）。
- 控制台探针（仪表盘页可用）：`FC.Sim.setPendingModal / clearPendingModal / hasPendingModal`、
  `FC.read().run.pendingModal`、`FC.events.byId("EV93")`、`FC.Sim.MONTH_CRISES`。改状态后触发一次渲染或重进页面。
- 常用构造：
  - **合约门禁 O1 挂账**：签下对应合约（如落户）后，控制台
    `FC.Sim.setPendingModal(run, { kind: "o1", event: FC.events.byId("EV93") }); FC.write({ run: run })`
    再刷新——用 `byId` 拿真实载荷，不要手捏残卡；自然路径则压 `run.recentModal = []`、清 `run.done.EV93`
    后固定 `Math.random = function () { return 0; }` 推进抽卡；
  - **合约结算欠账**：`run.contract.deadlineMonth = run.months` 后推进一月，结算卡弹出**不确认**直接刷新；
  - **危机必判月**：`run.lastCrisisMonth = run.months - 6; run.recentCrisis = []` + 固定 `Math.random` 过 R15 概率闸；
  - **双欠账叠加**：以上两条同月构造（先结算卡后危机卡都不确认再刷新）。

---

## A. tracksPending 收窄（合约门禁 O1 不再被误排除，R16 风险 R1）

### G-1 收窄边界：只有「结算卡」让路，`ev.contract` 不再是排除理由

- **操作步骤**
  1. 读 `dashboard-app.js` 的 `tracksPending` 与 `isContractResolutionEvent` 源码，确认判定条件；
  2. 签合约后自然抽出（或按 §0 强构造弹出）一张带 `contract` 字段的门禁 O1（EV93–EV97 任一），
     弹出后**不作答**，控制台读 `FC.read().run.pendingModal`；
  3. 构造合约到期让 `resolutionEvent` 结算卡弹出，同样不作答，读同一字段。
- **通过标准**
  - 排除条件收窄为**两条且仅两条**：调用方显式传 `opts.pending === false`（布尔显式传入永远最高优先，
    `true` / `false` 都要被尊重），或事件是合约**结算**卡——`id` 以 `contract_` 起头**且** `category === "合约"`
    双条件同时成立（`resolutionEvent` 产物形如 `contract_<id>_<status>`，双条件防真 O1 撞前缀误伤）；
  - 第 2 步：门禁 O1 弹出即写入 `run.pendingModal` 并经 `FC.write` 落盘——`ev.contract` 字段本身
    **不再**导致跳挂账，story.json 里 EV93–EV97 的 `category` 是教育 / 金钱 / 人情 / 职场，一律照挂；
  - 第 3 步：结算卡**不写** `pendingModal`（`replayContractResolution` 与月结结算路径都显式传
    `{ pending: false }`），它的欠账语义继续由 `resolutionPending` 承载，两套标记互不代签；
  - 载荷仍走 R16 的 `setPendingModal` 校验：可序列化、含 `event.id / title / choices`，残卡置 `null` 不挂。

### G-2 合约 O1 刷新补弹全链：奖惩与合约进度恰好一次

- **操作步骤**
  1. 接 G-1 第 2 步，记下现金 / KPI / 合约进度基线，刷新重进，观察 boot 是否补弹同一张卡；
  2. 先 dismiss（Esc / 遮罩）一次、再刷新一次确认还弹，第三次点选项落账，记录数值、合约进度条与日志；
  3. 再刷新重进一次核对。
- **通过标准**
  - 刷新后 boot 的 `replayPendingModal` 用**同一张卡**（同 `id`、同选项）补弹，走 `openEvent` 正常管线：
    `applyDeltas / applyNpcEffects / applyContractChoice / FC.contract.creditDeltas` 全套只在确认那次跑
    **恰好一次**——合约进度加分不双记也不丢记，日志打「合约」标签方便追账；
  - dismiss 不落账不销账（继承 R16 G-2 / G-11）：`pendingModal` 原样保留，重进继续补，直到真答完；
  - `once` 标记（EV93–EV97 全带 `once: true`）在**抽出**那刻已写 `run.done`，补弹不重跑抽卡期记账
    （`recentModal` / `sinceModal` / `markNpcFollowupFired` 同理，继承 R16 G-12）——补弹是重演，不是重抽；
  - 第 3 步二次重进不再弹、数值与进度条不再变。

### G-3 结算卡语义零回退：双欠账仍是「合约结算 > pendingModal」

- **操作步骤**
  1. 按 §0 构造双欠账（结算卡 + 危机卡同挂）刷新重进，逐张点掉，记录顺序与数值；
  2. 只挂结算卡、只挂危机卡各重复一次；
  3. 跑 `node games/fucheng-life/tests/r16-crisis-replay.test.js` 确认 R16 断言不回退。
- **通过标准**
  - 补弹顺序不因收窄而变：`replayContractResolution` 先、`replayPendingModal` 紧随（R16 G-4 / G-5 原样成立），
    两张卡都弹、各销各账（`resolutionPending` / `pendingModal`）、各入账一次；
  - 单欠一笔时另一环节零感知；结算卡确认后 `markContractResolutionDone` 落盘，重进不再弹；
  - R16 测试全绿——收窄改的是「谁挂账」，不许动到「怎么补」的既有契约。

---

## B. boot 连弹收敛（补弹发生过，这次进门就到此为止）

### G-4 `replayed` 旗标：任一补弹命中即跳过选轨 / 签约 / 教学

- **操作步骤**
  1. 清 `localStorage` 教学键、造一个未选轨 + 未签约 + 挂 `pendingModal` 的档，刷新重进，数 boot 弹窗数；
  2. 换成只挂合约结算欠账重复第 1 步；
  3. 读 `init` 源码对照旗标写入点。
- **通过标准**
  - `replayContractResolution` 或 `replayPendingModal` 任一**真的弹了**（resolve 真值）都置位共享旗标，
    此后当次 boot **跳过** `maybeOfferCareerTrack`、`maybeOfferContract` 与 `FC.guide.show` 三个自动环节——
    进门最多「欠账卡（至多两张）+ 闯城目标（仅缺失时）」，4–6 连弹不复现；
  - 两条补弹路径共用**同一个**旗标：先结算后危机连补两张时也只算「补弹过」，不叠加惩罚也不漏判；
  - 补弹但被 dismiss 也算「弹过」——占的是玩家注意力额度，不是落账额度。

### G-5 闯城主目标例外：缺目标照问，不许软锁

- **操作步骤**
  1. 造闯城档（`playMode` 闯城）且 `needsChallengeGoal(run)` 为真，同时挂 `pendingModal`，刷新重进；
  2. 造已选目标的闯城档重复一次。
- **通过标准**
  - 补弹之后 `maybeOfferChallengeGoal` **不受旗标约束**照常弹：没主目标这局没法计分，宁多弹一张
    也不软锁（`init` 链里它是唯一不看旗标的环节）；
  - 已有目标时静默跳过，与 R11 原行为一致；顺序仍在两张补弹卡之后，不插队。

### G-6 无补弹时零感知：干净进门与 R16 一字不差

- **操作步骤**
  1. 无任何欠账的新档 / 老档各进门一次，记录弹窗序列；
  2. 对照 R16 行为：选轨 → 闯城目标（仅闯城缺失时）→ 签约 → 教学。
- **通过标准**
  - 旗标为假时四个自动环节全部照走原顺序、原条件（`needsPick` / `needsChallengeGoal` /
    `contractSkipped` 冷却 / `guide.shouldShow` 判定都不变）——收敛只在「补弹发生过」时生效；
  - 新档首进（无欠账可补）必然走完整链：教学、选轨一个不少，新手引导不被误伤。

### G-7 推迟不是取消：下次进门补上，手动入口当次可用

- **操作步骤**
  1. 接 G-4 第 1 步（选轨 / 签约 / 教学被跳过），当次点右上教学按钮、合约区「选一张合约」按钮各一次；
  2. 把欠账清干净后再刷新重进一次，观察被跳过的环节。
- **通过标准**
  - 被跳过的当次：手动入口全部可用——`guideBtn` 强制开教学（`force: true` 不受 `shouldShow` 限制）、
    `contractPickBtn` 开要约 picker；玩家想看就看，只是城市不硬塞；
  - 下次干净进门（旗标不再置位）时，未选轨则 `needsPick` 仍真自动再弹、未签约则要约照发、
    教学 `shouldShow` 仍真则照播——推迟的每一项都能自然补上，不存在「永远错过」；
  - 未选轨期间不软锁：`freshRun` 的 `career.track` 自带 `pickTrack(origin)` 默认值（`picked: false` 只管
    要不要再问），行动 / 月结 / 快进照常可用。

---

## C. 危机池扩容（写实二选一 +3，节奏闸不动）

### G-8 新三条形状合法：id 唯一、二选一、d 合法、末位兜底

- **操作步骤**
  1. 控制台读 `FC.Sim.MONTH_CRISES`，核对长度与新增三条（`checkup_arrow` / `family_call` / `wage_delay`）；
  2. 逐条检查 `choices` 结构与 `d` 的键；
  3. 确认数组**末位**那条的门槛字段。
- **通过标准**
  - 池子从 6 条扩到 **9 条**，新条目追加在数组尾部（不改既有条目的顺序与内容），id 全池唯一；
  - 每条恰好两个选项，选项带 `id / label / d / result`，`d` 只用 sim 认识的键
    （money / health / social / rep / edu / debt），文案是写实向、无属性数字直白播报；
  - 数组末位是**无属性门槛**的一条（现为 `wage_delay`，仅 `minMonths`）：`pickMonthCrisis` 的
    「久旱空池」兜底直接取末位项且**不复查门槛**，末位若挂了 `needHealthBelow` 这类硬门槛，
    兜底就可能弹出条件不成立的卡（`minMonths` 被兜底绕过属已知可接受边界，记测试注释即可）。

### G-9 门槛与去重接入：新条目吃全套既有闸

- **操作步骤**
  1. 造 `health = 60` 的档反复推进，确认 `checkup_arrow`（`needHealthBelow: 46`）不出现；压 `health = 40` 再试；
  2. 让 `family_call` 中一次后 4 个月内构造必判月，确认它不复现（`gapMonths: 4` + `recentCrisis` 去重窗）；
  3. 单测：`r17-pending-contract.test.js` 危机段全过。
- **通过标准**
  - 新条目的 `minMonths / gapMonths / needHealthBelow` 走 `pickMonthCrisis` 既有过滤，一个不漏；
  - `noteCrisis` 的近 4 次去重窗（`recentCrisis.slice(-4)`）对新条目同样生效，扩池后同一条不许
    在窗口内连中；权重规则（有健康 / 负债门槛的 +2、久旱 +1）对新条目按同一公式算，不开小灶；
  - 危机卡照常走 `crisisToEvent → openEvent`，弹出即挂 `pendingModal`（`category === "本月危机"` →
    kind `"crisis"`），刷新补弹与 A 组行为一致。

### G-10 节奏不变密：扩池只加花样，不加频率

- **操作步骤**
  1. 固定随机种子思路对照：同一档扩池前后各跑 24 个月（可用单测或控制台脚本），统计危机触发次数；
  2. 读 `pickMonthCrisis` 源码核对冷却与概率闸常数。
- **通过标准**
  - `since < 3` 硬冷却与 R15 概率闸（3 月起 45%、5 月以上 75%）原封不动——扩池改变的是**中签后抽哪张**，
    不是**中不中签**；长跑统计频率与 R16 基线同分布（允许随机波动，不允许系统性变密）；
  - 每月至多一张强弹窗（人情回账 > 危机 > 随机 O1 的优先级链）不变；危机与补弹不同月叠卡的
    R16 约束不回退。

---

## D. 教学与玩家告知（O3）

### G-11 教学 v7：合约标签事件也补弹这句话要送到玩家眼前

- **操作步骤**
  1. 确认 O3 的 `fc-guide.js` 改动已提交（编写本文时在工作区待提交——合入前这条先卡住）；
  2. 清 `localStorage` 的 `fucheng.guide.*` 开新局，翻到「④ 人生合约」步读文案；
  3. 造一个只看过 v6 的老玩家档（只设 `fucheng.guide.v6 = "1"`）重进；再各调一次 `dismiss / reset` 检查键处理。
- **通过标准**
  - 「④ 人生合约」步写明：打「合约」标签的城市事件（要不要接这单之类）与结算弹窗同款——
    没确认就刷新，进门原样再弹，刷不掉也丢不了；措辞可调，语义不许丢；
  - 若走 key 升版路线（现为 `fucheng.guide.v7`）：只看过 v6 的老玩家重看一遍新教学；
    `dismiss` 把 v7 连同 v6 及更早的键**全部**写掉、`reset` 全部清掉，不留半读状态；
    若最终决定不升版（DISPATCH 允许），则按「文案已含说明 + 旧键行为不变」验收，二选一不许都不占；
  - 教学仍可被 `guideBtn` 手动强开（含 boot 被收敛跳过的那次，接 G-7）。

---

## E. 回归与总闸

### G-12 测试全绿

- **操作步骤**
  1. 仓库根目录执行 `./scripts/run-fucheng-life-tests.sh`；
  2. 单跑 `node games/fucheng-life/tests/r17-pending-contract.test.js`。
- **通过标准**
  - 既有全部测试与 R17 新增断言全绿，零跳过零失败，新测试已挂 runner（已核：runner 第 56 行）；
  - R17 测试至少覆盖：`tracksPending` 不再按 `ev.contract` 排除且 `opts.pending` 显式布尔仍生效、
    story 里存在带 `contract` 的门禁 O1 夹具、boot 链保留 `replayContractResolution → replayPendingModal`
    顺序且有共享收敛旗标（置位点 ≥ 2 处、guide 受旗标约束、`maybeOfferChallengeGoal` 不受）、
    `MONTH_CRISES` 长度 ≥ 8 且新条目形状合法；
  - R13–R16 的既有断言（危机冷却、概率闸、`pendingModal` 生命周期、`resolutionPending`、快进内确认）不回退。

### G-13 无构建 / ES5 / file:// 三不破

- **操作步骤**
  1. `file://` 直开 `games/fucheng-life/index.html` 走一遍：开局 → 签约 → 构造门禁 O1 挂账 → 刷新补弹确认 →
     再挂危机 + 结算双欠账 → 重进看收敛（只弹欠账卡）；
  2. `tests/js-syntax.test.js` 通过（含本轮改动的全部 JS 文件）。
- **通过标准**
  - 本轮改动不引入 ES6+ 语法、不新增外部依赖（ES5、无构建直开的项目约定）；
  - file:// 下挂账、补弹、收敛、危机新卡行为与 http 下一致；控制台无新增报错或未捕获 Promise 拒绝。

### G-14 验收条文闭环：§40 与本文一致，§39 不回退

- **操作步骤**
  1. 对照 `games/fucheng-life/ACCEPTANCE.md` §40 与本文档逐条核对，§39 复查仍勾 `[x]`；
  2. 核对 §40 四句条文分别对应本文 A / B / C / E 组。
- **通过标准**
  - §40 条文（合约门禁 O1 挂账补弹且只入账一次 / 仅显式 `pending: false` 与 `resolutionEvent` 产物不挂 /
    补弹发生过则当次推迟选轨签约教学、闯城缺目标照问、手动入口可用 / 危机扩池且节奏闸不动 / 测试全绿）
    与本文门禁一致，G-1～G-13 全过后方可勾 `[x]`；§39 保持 `[x]` 不回退；
  - O3（G-11）与 O4 / O5 的产物落定前不勾 §40：O4 需交 story 门禁 O1 字段核对结论（报告或极小修正），
    O5 需交样式占位或 `round17/o5-skip.md` 跳过说明——十路都有交代，收口才算数；
  - 若实现与本文有出入，以「实现 + 测试 + 本文修订」三者同步为准，不允许只改条文放水。

---

**门禁总数：14 条（G-1 ～ G-14）**，分五组：tracksPending 收窄 3、boot 连弹收敛 4、危机扩池 3、教学告知 1、回归总闸 3。

model slug: claude-fable-5-thinking-xhigh
