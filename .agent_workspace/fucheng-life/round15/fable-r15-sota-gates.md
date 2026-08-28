# R15 SOTA 门禁 · 快进护栏 + 结算补弹（跳过探区 / 现金护栏 / 打断文案 / 补弹 / 危机概率闸）

> 作者：R15-F1（fable）。本文是 R15 的验收 SSOT：下列门禁**全部通过**方可合入 / 勾选 ACCEPTANCE §38。
> 对象代码：`games/fucheng-life/js/dashboard-app.js`、`js/fc-sim.js`、`js/fc-contract.js`、`js/fc-guide.js`、`screens/dashboard.html`。
> 编写时对照的现码状态：O4 的按钮提示（commit `e79f404`）、O5 的教学 v5（commit `f935fad`）、G2 的 §38 条文（commit `1e4815a`）
> 已在分支上；O1 的 `pickAutoAction` / 打断文案 / 补弹接线（`dashboard-app.js`）与 O2 的
> `suggestMonth(run, era, origin, opts)` / 概率闸 / `resolutionPending` API（`fc-sim.js`）在工作区**待提交**；
> G1 的 `tests/r15-ff-guards.test.js` 为未跟踪草稿。门禁按**行为**验收，不锁实现细节与具体常数。
> 依据：`round14/fable-r14-playfeel.md` 的 R1 / R2 / R5 / R9 / R15 / R16 与 `round15/R15_DISPATCH.md` 六项目标。

## 0. 验收环境准备

- 本地起服：仓库根目录 `python3 -m http.server 8000`，浏览器打开
  `http://localhost:8000/games/fucheng-life/`（file:// 直开亦须可用，见 G-14）。
- 自动化：`./scripts/run-fucheng-life-tests.sh`；R15 新断言应落在 `tests/r15-ff-guards.test.js`（R15-G1 负责）。
- 控制台探针（仪表盘页可用）：`FC.Sim`、`FC.contract`、`FC.read().run`。改状态后触发一次渲染或重进页面。
- 常用构造：
  - 危机必判月：`run.lastCrisisMonth = run.months - 6; run.recentCrisis = []`；
  - 合约到期：`run.contract.deadlineMonth = run.months`（下次月结即结算）；
  - 低现金局：`run.money = 0`（对照 `FC.Sim.income(run, era, origin)` 与月账单）。

---

## A. 快进跳过探区（R14 风险 R1 / X1）

### G-1 快进绝不替玩家探区，`zoneQueue` 原样保留

- **操作步骤**
  1. 地图选一个高危探区（auction / broker），回仪表盘确认位置 chip 显示目标；
  2. 点「快进三月 ▸▸」确认，让快进至少走完 1 个月；
  3. 控制台读 `FC.read().run.zoneQueue`，翻日志找「行动」条目。
- **通过标准**
  - 快进期间**没有任何一条探区行动**（日志无探区回执、无次月探区余波），高危区的钱 / 健康损失为 0；
  - 快进结束后 `run.zoneQueue` 与快进前完全一致，位置 chip 不变——玩家手动点「探区」时目标仍在；
  - 自动选行动对 `explore` 是**双保险**：建议层（`suggestMonth` 收到 `skipExplore` 后不再因 `zoneQueue` 推荐 explore）
    与执行层（`autoSpendAp` / `pickAutoAction` 对 explore 一律跳过）任一失守另一层必须兜住；
  - **手动模式不受影响**：不带 opts 调 `FC.Sim.suggestMonth(run, era, origin)`，有 `zoneQueue` 时仍建议 `explore`
    （行动区的建议标签照旧引导玩家自己去探）。

### G-2 探区被跳过导致 AP 花不完时，当月即停并说明

- **操作步骤**
  1. 构造「除 explore 外无行动可点」的局面（控制台压状态使其余行动 `canAction` 为假，仅留 `zoneQueue`）；
  2. 触发快进。
- **通过标准**
  - 快进**当月即停**，不带着未花完的 AP 越月（`tick` 的 AP>0 护栏不允许被绕过）；
  - 中止日志同时含三个信息：已走月数（`k/n` 格式，见 G-6）、剩余 AP 数、
    「快进不会替你去探区」的指引（现码文案：「快进走了 i/n 月：还剩 N 点行动点花不出去。快进不会替你去探区，探区请自己点」——
    允许改措辞，三个信息缺一不可）；
  - `autoSpendAp` 死循环护栏仍在：guard 上限 + 执行一次行动后 `run.ap` 未减少即收手，任何状态下不卡死页面。

### G-3 「不替你探区」在入口处说清，不靠玩家踩坑学会

- **操作步骤**
  1. 桌面读 `#tick6Btn` 的 `title`；≤640px 打开「更多」抽屉读快进按钮 `title` 与抽屉说明行；
  2. 点快进入口，读 confirm 弹窗全文；
  3. 清教学标记（`localStorage` 清 `fucheng.guide.*`）开新局，翻到教学「③ 推进一个月」步。
- **通过标准**
  - 两个入口的 `title` 均含「不会替你探区」语义（现码：「自动花 AP，但不会替你探区」），抽屉另有一行常驻说明；
  - confirm 文案明确列出：不会自动去探区（目标保留、要自己点）、现金紧时优先上班、遇大事停下——三点齐备才允许玩家点确定；
  - 教学 v5（`fucheng.guide.v5`）在「推进一个月」步写明快进不替探区；教学 key 升版后老玩家重看一遍，
    `dismiss` / `reset` 同步处理 v4 及更早的 key，不留半读状态。

---

## B. 快进现金护栏（R14 风险 R2 / R3）

### G-4 sim 层：现金撑不过一个月时建议改推 `work`

- **操作步骤**
  1. 单测 / 控制台：造 `run.money = 0` 的档，分别调
     `FC.Sim.suggestMonth(run, era, origin)` 与 `FC.Sim.suggestMonth(run, era, origin, { preferWorkIfPoor: true })`；
  2. 再把 `run.health` 压到 30 以下重复第 1 步。
- **通过标准**
  - 带 `preferWorkIfPoor` 且现金低于约一个月收入（以 `FC.Sim.income` 为参照）时，建议为 `work`、`urgency` 为 high——
    快进不再拿 AP 去 study / network / rest 烧成负债；
  - 健康**危机级**（现码线：30 以下）仍压过现金护栏建议 `rest`——护栏救钱不救到把人救死；
    普通低健康（30–55）在低现金时不再触发「花钱躺平」（对照 R14 风险 R3）；
  - **不带 opts 时行为与 R14 完全一致**（rest 线 38、探区建议照旧）：手动模式的建议标签不因本轮改动漂移；
  - `era` / `origin` 缺失或 `income` 抛错时护栏静默退化（不抛错、退回原有建议链），不把 suggestMonth 变成新的崩溃点。

### G-5 dashboard 层：自动行动的兜底止损线

- **操作步骤**
  1. 控制台造「现金 < 当月账单合计」的档（`run.money = 0`），点快进；
  2. 再造「现金低 + 健康 < 30」与「现金低 + NPC 讨债」两个叠加局各快进一次；
  3. 全程翻「行动」日志。
- **通过标准**
  - 现金紧时自动行动落在 `work` 上（除非 high 级建议压过）：一次快进后 `run.debt` 不因自动行动的 −money 新增
    （月结账单本身的入不敷出不在此门禁范围内）；
  - high 级建议豁免生效：健康危机月自动 rest、讨债月自动 network，现金护栏不越权；
  - 两层护栏（sim 的 `preferWorkIfPoor`、dashboard 的账单比对兜底）判据可以不同（收入 vs 账单），
    但**方向必须一致**——不允许一层推 work 另一层改回烧钱行动；
  - 手动点行动完全不受影响：低现金时玩家自己选 study / rest 照常执行，护栏只管自动驾驶。

---

## C. 打断文案带月数（R14 风险 R5 / R8）

### G-6 「被打断」文案报实际走过的月数，最后一月不误报

- **操作步骤**
  1. 构造危机必判月（见 §0）+ 控制台 `Math.random = function () { return 0; }` 使概率闸必过，点快进，让第 1 或第 2 月被打断；
  2. 构造前两月安静、第 3 月才有弹窗的局面（或直接读代码分支），再快进一次；
  3. 对照两次的系统日志。
- **通过标准**
  - 打断文案带「已走 k / 共 n」两个数（现码：「快进走了 k/n 月，被一件事打断…」），k 为**实际完成**的月数；
  - k < n 时才允许出现「剩下的月份没走」语义；**k = n（第 3/3 月被打断）时该句必须消失**——
    3 个月都走完了，不再让玩家误以为损失了月份（修 R14 风险 R5）；
  - 无论哪个月被打断，`run.months` 增量与文案里的 k 一致（日志、存档、文案三方对得上账）。

### G-7 AP 花不完的中止文案只报事实、带月数

- **操作步骤**
  1. 同 G-2 构造 AP 花不完局面，分别在第 1 月与第 2 月触发中止；
  2. 读两次系统日志。
- **通过标准**
  - 文案含已走月数（`i/n`）与剩余 AP 数；
  - 不再出现「可能缺探区目标」这类**猜测性归因**（R14 风险 R8）：探区相关信息以「快进不会替你去探区」的确定性指引出现，
    而不是猜玩家为什么花不完；
  - 该文案与 G-6 的打断文案是两个分支、两种语义（花不完 vs 被弹窗打断），不允许合并成一条含混的通用文案。

---

## D. 合约结算补弹（R14 风险 R9）

### G-8 `resolutionPending` 生命周期：结算置位、领奖销账

- **操作步骤**
  1. 单测：`selectContract` 后把 `deadlineMonth` 推到当月，调 `FC.Sim.tickContract`，断言返回 `failed` 且
     `run.contract.resolutionPending === true`；
  2. 依次调 `FC.Sim.needsContractResolution(run)`、`FC.Sim.markContractResolutionDone(run)`、再各调一次。
- **通过标准**
  - `tickContract` 把合约结成 won / failed 的那次调用**同时置位** `resolutionPending`（sim 层自理，调用方无需手工记账）；
  - `needsContractResolution`：active / 无合约恒 false，pending 为 true 时 true；
  - `markContractResolutionDone`：首次调用清位并返回 true，再调返回 false——**同一笔结算不可能销账两次**（防重复入账的根）；
  - 新签合约（`selectContract`）自带 `resolutionPending: false` 初值，不带脏位。

### G-9 刷新重进补弹：奖惩恰好入账一次

- **操作步骤**
  1. 把合约推到到期月，月结弹出结算卡后**不点确认**，直接刷新页面；
  2. 重进仪表盘，观察 boot 序列；点掉补弹的结算卡，记录现金 / KPI / 房产变化；
  3. 再刷新重进一次。
- **通过标准**
  - 重进后结算卡**排在 boot 弹窗链最前**（补弹 > 选轨 > 闯城目标 > 签约 > 教学）——欠玩家的账先还；
  - 奖惩通过结算卡唯一选项落账**恰好一次**：确认后才销账（`openEvent` 的回调只在真正落账时跑，
    dismiss 掉的卡不销账、下次重进继续补）；第 3 步的第二次重进**不再弹**、数值不再变；
  - 正常月结路径同样销账：不刷新、当月点掉结算卡后 `resolutionPending` 为 false 并已随存档落盘
    （补弹标记的置位 / 销账都要走 `FC.write`，否则刷新即失忆）；
  - `resolutionEvent` 造不出卡（合约定义缺失等异常）时销账放行，不允许把 boot 链卡成每次重进都空转的死待办；
  - 补弹以静默模式打开，不与月度账本 / 教学同屏叠加（单月弹窗帽语义在 boot 链同样成立）。

### G-10 旧档迁移：宁可不补、绝不双发

- **操作步骤**
  1. 构造 R14 及更早的存档（合约对象无 `resolutionPending` 字段），分别造 active 与已 won / failed 两种状态，走 `FC.Sim.migrate`；
  2. 迁移后重进仪表盘、推进一月、快进。
- **通过标准**
  - 迁移把缺失的 `resolutionPending` 补为 **false**：旧档里已结算的合约**不补弹**——
    老存档无法区分「奖励丢了」和「已领过」，宁可承认历史损失也不允许重复发奖（该取舍记入 KNOWN_ISSUES / 测试注释，不算 bug）；
  - active 旧合约迁移后照常推进，到期结算时走 G-8 的全新生命周期；
  - 迁移后无 `undefined` 引用报错，`needsContractResolution` 对迁移档恒可安全调用。

---

## E. 危机概率闸（R14 风险 R15 / R16）

### G-11 冷却满足 ≠ 必然出事：概率闸行为

- **操作步骤**
  1. 单测：造合格危机月（`months = 6`、`lastCrisisMonth = 0`、压低健康使 eligible 非空），
     固定 `Math.random` 为 0.99 调 `FC.Sim.pickMonthCrisis`，再固定为 0 调一次；
  2. 手动：连续推进 12+ 月记录危机出现的月份间隔。
- **通过标准**
  - 冷却不足（`since < 3`）恒返回 `null`——概率闸叠在冷却**之上**，不放宽既有下限；
  - 冷却满足且 eligible 非空时，高随机点数**跳过**（返回 `null`）、低随机点数**命中**——「每 3 月准点敲门」的确定性节奏被打破，
    快进三月不再必在第 3 月被危机打断；
  - 触发概率随 `since` **单调不减**（现码：3–4 月约 45%、≥5 月约 75%）——常数允许调，方向不允许反：
    越久没出事越可能出事，不许把顺风局饿成永无危机；
  - **空手月不留痕**：概率闸跳过的那月不调 `noteCrisis`、不动 `recentCrisis`，`lastCrisisMonth` 也不更新
    （它仍由 dashboard 在危机真正弹出时设置），`since` 继续累积——跳过不重置冷却计时。

### G-12 概率闸与去重 / 弹窗帽兼容，不破 R14 门禁

- **操作步骤**
  1. 重跑 R14 的 G-11（冷却窗）、G-12（`recentCrisis` 去重与回退）、G-9（单月弹窗帽）对应断言与手测；
  2. 单测：`recentCrisis` 覆盖全部合格项时固定低随机点数调 `pickMonthCrisis`。
- **通过标准**
  - 概率闸判过之后，加权抽取、`recentCrisis` 窗口 4 去重、「近窗全占时回退完整合格池」的行为与 R14 一字不差；
  - eligible 为空、且 `since < 5` 的兜底路径仍返回 `null`，不因新增的空池判断改变语义；
  - `monthModal` 优先级（合约结算 > 要约 > 危机 / O1）与「危机不进 `recentModal`」的双轨去重不受影响；
  - 危机命中后快进照常中断（G-6 文案），处理完弹窗停在当月。

---

## F. 回归与总闸

### G-13 测试全绿

- **操作步骤**
  1. 仓库根目录执行 `./scripts/run-fucheng-life-tests.sh`。
- **通过标准**
  - 既有全部测试与 R15 新增 `tests/r15-ff-guards.test.js` 全绿，零跳过零失败，且新测试已挂进 `run-fucheng-life-tests.sh`；
  - R15 测试至少覆盖：自动行动跳过 explore 且 `zoneQueue` 保留、低现金推 work、打断文案含月数、
    概率闸双分支（高点数空手 / 低点数命中）、`resolutionPending` 置位—销账—不二次销账全链。

### G-14 无构建 / ES5 / file:// 三不破

- **操作步骤**
  1. `file://` 直开 `games/fucheng-life/index.html` 走一遍开局 → 签约 → 推进 → 快进 → 结算刷新补弹；
  2. `tests/js-syntax.test.js` 通过（含本轮改动的全部 JS 文件）。
- **通过标准**
  - 本轮改动不引入 ES6+ 语法、不新增外部依赖（保持 ES5、无构建直开的项目约定）；
  - file:// 下快进护栏、概率闸、补弹行为与 http 下一致；控制台无新增报错或未捕获 Promise 拒绝。

### G-15 验收条文闭环

- **操作步骤**
  1. 对照 `games/fucheng-life/ACCEPTANCE.md` §38 与本文档逐条核对。
- **通过标准**
  - §38 条文（不自动探区 / 现金护栏 / 打断报月数且末月不误报 / 补弹不重复入账 / 概率闸）与本文门禁一致，
    G-1～G-14 全过后方可把 §38 勾为 `[x]`；§37 保持 `[x]` 不回退；
  - 若实现与本文有出入，以「实现 + 测试 + 本文修订」三者同步为准，不允许只改条文放水。

---

**门禁总数：15 条（G-1 ～ G-15）**，分六组：跳过探区 3、现金护栏 2、打断文案 2、结算补弹 3、危机概率闸 2、回归总闸 3。

model slug: claude-fable-5-thinking-xhigh
