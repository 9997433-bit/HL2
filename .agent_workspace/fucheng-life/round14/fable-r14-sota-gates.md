# R14 SOTA 门禁 · 流程修复（快进三月 / 目标↔合约 / 单月弹窗帽 / 危机去重）

> 作者：R14-F1（fable）。本文是 R14 的验收 SSOT：下列门禁**全部通过**方可合入 / 勾选 ACCEPTANCE §37。
> 对象代码：`games/fucheng-life/js/dashboard-app.js`、`js/fc-contract.js`、`js/fc-sim.js`、`js/fc-guide.js`、`css/fc-contract.css`。
> 编写时对照的现码状态：`fc-sim.js` 已落地 `recentCrisis` / `noteCrisis` / `contractForGoal`（commit `1422dde`），
> `fc-contract.js` 已落地 `recommendedId` / 置顶 / 角标（commit `f0c11e9`），`fc-guide.js` 已升 v4（commit `8cdcb2b`），
> `dashboard-app.js` 的 `autoSpendAp` / `fastForwardMonths` / `monthModal` 改造在工作区待提交。门禁按**行为**验收，不锁实现细节。

## 0. 验收环境准备

- 本地起服：仓库根目录 `python3 -m http.server 8000`，浏览器打开
  `http://localhost:8000/games/fucheng-life/`（file:// 直开亦须可用，见 G-15）。
- 挑战档入口：出身选择页选「闯城 60 月」（等价于 `FC.read().playMode === "challenge"`）。
- 自动化：`./scripts/run-fucheng-life-tests.sh`；R14 新断言应落在 `tests/r14-flow-fixes.test.js`（R14-G1 负责）。
- 控制台探针（仪表盘页可用）：`FC.Sim`、`FC.contract`、`FC.read().run`。改状态后记得触发一次渲染或重进页面。

---

## A. 快进三月：自动花 AP

### G-1 快进前自动花完行动点

- **操作步骤**
  1. 新开一局（完整人生档即可），确认当月 AP 为 3/3；
  2. 点「快进三月 ▸▸」，confirm 弹窗点确定；
  3. 观察日志与 AP 点。
- **通过标准**
  - 快进过程中每个月都是**先自动花 AP、再月结推进**：日志里每个月至少出现对应数量的「行动」条目（tag=行动），随后才是月结/事件条目；
  - 自动选行动优先听 `FC.Sim.suggestMonth` 的 `actionId`（健康低→休息、落户合约→进修等）；建议不可执行时回退到第一个 `canAction` 为真的行动；
  - 三个月全程无强弹窗时，快进推进整 3 个月（`run.months` 增 3），期间不需要任何手动点击。

### G-2 AP 花不完立即停下并解释

- **操作步骤**
  1. 构造「花不完」局面：控制台把 `run.money` 压到 0 附近、清空 `run.zoneQueue`，使所有行动 `canAction` 为假但 AP > 0（或直接单测模拟 `autoSpendAp` 返回后 `run.ap > 0`）；
  2. 触发快进。
- **通过标准**
  - 快进**当月即停**，不带着未花完的 AP 越月（`tick` 的 AP>0 护栏不允许被绕过）；
  - 日志出现一条系统条目，写明剩余 AP 数与可能原因（现码文案：「快进中止：还剩 N 点行动点花不出去（可能缺探区目标）」——允许改文案，但必须含「快进中止」与剩余点数）；
  - `autoSpendAp` 存在死循环护栏：单次调用内若执行一次行动后 `run.ap` 未减少则立即收手（现码 `before/after` 比较 + guard 上限），任何状态下都不允许卡死页面。

### G-3 快进遇大事（强弹窗）停下

- **操作步骤**
  1. 构造必弹局面：例如控制台设 `run.lastCrisisMonth = run.months - 6`、`run.recentCrisis = []`（下月必抽危机），或把 `run.contract` 推到到期月；
  2. 触发快进三月。
- **通过标准**
  - 弹窗（合约结算 / 要约 / 危机 / O1 / 链式 Saga 抉择）出现的那个月，快进**不再继续后续月份**；玩家处理完弹窗后停在当月，需要手动再操作；
  - 日志出现系统条目说明中断（现码文案：「快进被一件事打断，剩下的月份没走」——须含「打断」语义）；
  - 走到终局（`checkEnding` 命中）时快进同样停止，不在结局页背后继续推月。

### G-4 快进防重入与入口一致性

- **操作步骤**
  1. 桌面：点「快进三月 ▸▸」按钮；≤640px 手机档：打开「更多」抽屉点「快进三月」；
  2. 在快进尚未结束（有弹窗挂着）时再次点击快进入口。
- **通过标准**
  - 两个入口（`#tick6Btn` 与抽屉 `data-drawer-tick6`）行为一致，均先 `confirm` 提示「自动花完行动点并连续推进 3 个月，遇到大事会停下」，取消则完全无副作用；
  - 快进进行中重复触发无效（现码 `fastForwarding` 标志）：不会出现两条快进链交错推月、重复扣 AP 或重复月结；
  - 快进 Promise 链异常时标志位必须复位（不能把快进按钮永久锁死），日志留一条出错说明。

---

## B. 闯城目标 ↔ 合约推荐

### G-5 映射表唯一且两层一致

- **操作步骤**
  1. 控制台断言（或单测）：
     `FC.Sim.contractForGoal("hukou") === "hukou"`、`("downpay") === "home"`、`("rise") === "promote"`、`("debtfree") === null`；
  2. 同参调 `FC.contract.recommendedId({ goal: { id: … } })`，与上一步逐项对比。
- **通过标准**
  - 目标→合约映射为：**落户上岸↔落户积分（hukou）、攒够首付↔首付（home）、向上爬一层↔升职（promote）、还清负债→无推荐（null）**；
  - `FC.Sim.contractForGoal` 与 `FC.contract.recommendedId` 对同一目标返回一致结果；传入非法 id / 空值 / 无 goal 的 run 时返回 `null` 而非抛错；
  - 两个 `GOAL_CONTRACT` 映射（sim 层与 contract 层）内容一致——若后续收敛为单一出处更好，但 R14 内至少不允许两表内容分叉。

### G-6 签约 picker：推荐卡置顶 + 角标

- **操作步骤**
  1. 闯城档开局，主目标选「攒够首付」；
  2. 进入合约签约弹窗，观察三张卡的顺序与样式；
  3. 按数字键 `1`。
- **通过标准**
  - 「首付」合约卡排在第一位，卡面带推荐标识（`.is-recommended` 类 + 「匹配主目标」角标）；其余两卡无角标；
  - 数字快捷键与视觉顺序一致：按 `1` 签下的必须是置顶的推荐卡（排序须落在数据数组上，不允许只调 DOM 顺序）；
  - 推荐卡视觉贴合现有 glass 风格（R14-O3 的 `fc-contract.css`），不是与全局风格冲突的紫色炫光；无 CSS 时角标仍可辨认（内联样式兜底）。

### G-7 推荐提示语与「不强制」

- **操作步骤**
  1. 同 G-6 进入 picker，读弹窗 lede 文案；
  2. 故意签下非推荐卡（如目标首付却签落户）；
  3. 另开一局：完整人生档（无 goal）与闯城档目标「还清负债」各进一次 picker。
- **通过标准**
  - 有推荐时 lede 追加一句点名主目标并说明置顶（现码：「你的闯城主目标是「…」，最对口的那张已经排在最前面——签别的也行…」），语气为**建议而非强制**；
  - 签非推荐卡完全可行：正常签约、正常 HUD、无报错无二次确认；「再想想」跳过逻辑不受影响；
  - 无 goal（完整人生档）或目标为 debtfree 时：三张卡顺序为 pack 原序、无任何角标、lede 无推荐句——即推荐机制完全静默。

### G-8 教学同步提到目标对齐

- **操作步骤**
  1. 清掉教学已读标记（清 `localStorage` 的 `fucheng.guide.*`）后开新局，走到教学「④ 人生合约」步；或直接点「新手教学」按钮翻到该步。
- **通过标准**
  - 合约步教学文案包含「闯城档让合约对齐主目标」的一句（现码 v4：「目标落户就签落户积分，攒首付就签攒首付，向上爬一层就签升职」）；
  - 教学存储 key 已升版（`fucheng.guide.v4`），改版前的老玩家会重新看到一遍新教学；
  - 教学锚点仍指向合约 HUD（`target: "contractHud"`），不因文案改动跑锚。

---

## C. 每月最多 1 个强弹窗

### G-9 单月弹窗帽与优先级

- **操作步骤**
  1. 构造叠加月：把 `run.contract` 推到到期（结算触发）同时令危机冷却已过（`lastCrisisMonth` 足够早）；推进一月；
  2. 单测层面：对 `finishMonth`/`monthModal` 断言「结算命中后不再调用后续弹窗源」。
- **通过标准**
  - 一个月内**强交互弹窗至多 1 个**，优先级：**合约结算 > 要约（二级合约 / 主合约签约）> 危机 / O1**；
  - 高优先级命中后，同月低优先级一律不弹（顺延到之后月份自然触发，不丢事件类别）；
  - 危机与 O1 互斥：`drawModalEvent` 单次调用要么返回危机、要么返回 O1 随机事件，绝不同月两个；
  - 结局（`checkEnding` 命中）优先于一切弹窗：终局月不再叠任何强弹窗。

### G-10 非强弹窗不占帽、不叠加干扰

- **操作步骤**
  1. 触发一个「有强弹窗 + 月结账单展示条件同时满足」的月份（如 `run.income < 0` 且合约到期）；
  2. 观察弹窗顺序。
- **通过标准**
  - 月度账本（ledger）、日志卡、人情余波/探区余波等**非强交互**内容不占用单月 1 个强弹窗的名额，但必须在强弹窗处理完后才出现或直接进日志，不与强弹窗同屏抢焦点；
  - `openEvent` 结束时的 `maybeShowLedger` 不重复弹（单月账本至多展示一次）；
  - 链式 Saga 抉择当月若又命中强弹窗源，两者按既有顺序串行（Saga 先于月结弹窗），全程无同屏双弹窗。

---

## D. 本月危机：冷却与去重

### G-11 冷却窗 ≥ 3 月

- **操作步骤**
  1. 单测：设 `run.lastCrisisMonth = m`，遍历 `run.months = m+1 / m+2` 调 `FC.Sim.pickMonthCrisis`；再设 `run.months = m+3` 起多次调用；
  2. 手动：连续推进，记录危机弹窗出现的月份间隔。
- **通过标准**
  - 距上次危机不足 3 个月时 `pickMonthCrisis` 恒返回 `null`；
  - 危机实际弹出后 `run.lastCrisisMonth` 被更新为当月（dashboard 层负责），冷却窗随之滚动；
  - 各危机自身的 `minMonths` / `gapMonths` / 状态门槛（`needHealthBelow` 等）仍然生效，冷却与门槛叠加判断。

### G-12 `recentCrisis` 短窗去重

- **操作步骤**
  1. 单测：固定 `Math.random`，设 `run.recentCrisis = ["ot_or_rest"]`，反复调 `pickMonthCrisis`，断言不返回 `ot_or_rest`；
  2. 设 `recentCrisis` 覆盖全部合格危机 id，再调一次。
- **通过标准**
  - 近窗内出现过的危机 id 不会被再次抽中（现码窗口：最近 **4** 个 id，`noteCrisis` 维护、重复 id 先去重后追加）；
  - 全部合格项都在近窗内时**回退到完整合格池**而不是返回 `null` 空手而归（不因去重把危机系统整体饿死）；
  - `pickMonthCrisis` 每次成功返回都会把该 id 记入 `recentCrisis`（`noteCrisis` 在 sim 层调用，调用方无需手工记账）。

### G-13 旧档迁移不炸

- **操作步骤**
  1. 构造 R13 及更早的存档对象（无 `recentCrisis` 字段），走 `FC.Sim.migrate`；
  2. 迁移后直接调 `pickMonthCrisis` 与快进。
- **通过标准**
  - 迁移后 `run.recentCrisis` 为 `[]`（`migrateContract` 补齐），`lastCrisisMonth` 缺省为 0；
  - 旧档载入后首月推进、快进、危机抽取均无异常（无 `undefined` 引用报错）；
  - `freshRun` 新档自带 `recentCrisis: []`。

---

## E. 回归与总闸

### G-14 测试全绿

- **操作步骤**
  1. 仓库根目录执行 `./scripts/run-fucheng-life-tests.sh`。
- **通过标准**
  - 既有全部测试（contract / pacing / r13-month-crisis / zone-dedup 等 24 个文件）与 R14 新增 `tests/r14-flow-fixes.test.js` 全绿，零跳过零失败；
  - R14 测试至少覆盖：快进护栏（AP 剩余中止 + 弹窗中断标志）、`GOAL_CONTRACT` 四项映射、picker 置顶排序函数、单月弹窗帽（结算命中后短路）、`recentCrisis` 去重与回退。

### G-15 无构建 / ES5 / file:// 三不破

- **操作步骤**
  1. 用 `file://` 直接打开 `games/fucheng-life/index.html` 走一遍开局→签约→推进→快进；
  2. `tests/js-syntax.test.js` 通过（含本轮四个改动 JS 文件）。
- **通过标准**
  - 本轮改动不引入 ES6+ 语法（保持 ES5、无构建直开的项目约定）、不新增外部依赖；
  - file:// 下推荐角标、快进、危机弹窗行为与 http 下一致；
  - 控制台无新增报错或未捕获 Promise 拒绝。

### G-16 验收条文闭环

- **操作步骤**
  1. 对照 `games/fucheng-life/ACCEPTANCE.md` §37 与本文档逐条核对。
- **通过标准**
  - §37 条文描述与本文门禁一致（快进语义、映射三对一空、弹窗帽优先级、危机去重），G-1～G-15 全过后方可把 §37 勾为 `[x]`；
  - 若实现与本文有出入，以「实现 + 测试 + 本文修订」三者同步为准，不允许只改条文放水。

---

**门禁总数：16 条（G-1 ～ G-16）**，分五组：快进 4、目标↔合约 4、弹窗帽 2、危机 3、回归总闸 3。

model slug: claude-fable-5-thinking-xhigh
