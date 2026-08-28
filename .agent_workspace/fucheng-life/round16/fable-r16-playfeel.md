# R16 体验风险清单 · 危机/O1 刷新补弹 + 快进内置确认（playfeel）

> 作者：R16-F2（fable）。只读现码后的体验风险盘点，不改游戏代码。
> 对照代码状态：分支 `cursor/fucheng-r16-crisis-replay-fa72` 快照 @ `42750cf` ——
> 十路已全部落地：O2 sim 助手（`147845a`）、O4 确认面板样式（`6357535`）、O5 教学 v6（`145056e`）、
> G2 §39 + TEST_NOTES（`de1b8f2`）、G1 测试（`0fb9b91`+`bf4bc68`）、O3 `FC.confirm`（`dc6da8b`）、
> **O1 dashboard 接线（`b585d4f`）**。快照时 `./scripts/run-fucheng-life-tests.sh` 27 项全绿。
> 姊妹篇：门禁见 `fable-r16-sota-gates.md`（F1，G-1～G-15），条文草稿见 `fable-r16-acceptance-draft.md`（F3）。

共 **14 条残留风险**：目标①② pendingModal + boot 补弹 6 条（R1–R6）、
目标③ 快进内置确认 4 条（R7–R10）、横切 4 条（R11–R14）。
另附 8 条回归手测路径（P1–P8）与一节「已核对无虞」。

---

## 〇、三个目标的落地判定（先说结论）

| R16 目标 | 现码判定 |
|---|---|
| ① pendingModal 挂账/销账 | ✅ `openEvent` 统一走 `tracksPending`：挂账即 `FC.write`，确认才 `clearPendingModal`，dismiss 保留。**但 `!ev.contract` 一刀切把合约门禁 O1 也排除在外**（R1） |
| ② boot 补弹 | ✅ `init` 链 `replayContractResolution → replayPendingModal → 选轨 → 闯城 → 签约 → 教学`；`monthModal` 里还多给了一层「月内先补旧账再抽新卡」 |
| ③ 快进内置确认 | ✅ `startFastForward` 走 `FC.confirm` Promise 链，桌面/抽屉同路径，三条护栏文案原样传入。**但 O3 标记与 O4 CSS 契约错位，三条护栏在面板里挤成一段**（R7） |

判定基于 `42750cf` 快照；R7 是全清单唯一「高」级，合入前必修。

---

## 一、目标①②：pendingModal 与补弹的残留风险（R1–R6）

### R1 合约系强弹窗不入补弹通道，刷新照旧吞卡 ⚠ 中（要落字）
- **现象**：`tracksPending` 的默认判定是 `!!(ev && ev.id) && !(ev && ev.contract)`。
  这一刀本意是把合约**结算**卡隔离出去（它有自己的 `resolutionPending` 通道），
  但连带把 story.json 里 `contract: "hukou"` 这类**合约门禁 O1 事件**（社区窗口通知、
  凑首付电话等，经 `drawModalEvent` 正常抽出的当月强弹窗）也排除了——这些卡挂着时
  刷新，仍是 R15-P8 的老行为：当月吞卡、无补弹。§39 写的是「危机、O1 与人情讨债……
  会先写入 pendingModal」，玩家和验收者都会把合约系 O1 算进「O1」里。
- **建议护栏**：要么 O1 把排除条件收窄成「只排除 `resolutionEvent` 产物」（结算卡
  载荷自带 `contract` 字段 + 显式 `{pending:false}` 双保险，见「已核对无虞」1，
  收窄是安全的）；要么 G2/F3 把 §39 措辞收窄为「不含合约事件」并记 KNOWN。二选一，不能都不做。

### R2 「入账→销账」不是原子块：中途抛错 = 下次补弹双入账 ⚠ 低-中（前瞻）
- **现象**：`openEvent` 确认分支的顺序是 `applyDeltas → applyNpcEffects →
  applyContractChoice → pushLog → render(true)（此时 FC.write 落盘的档里
  **账已入、待办还挂着**）→ onApplied → clearPendingModal（第二次 FC.write）`。
  同步块内玩家插不进刷新，但这段里任何一步抛异常（坏 pack 数据、未来改动），
  留下的档就是「已入账 + pendingModal 未销」——下次进门补弹再入一次账。
  本轮承诺的「恰好一次」恰好败给这种档。
- **建议护栏**：中期把销账挪进与 `applyDeltas` 同一落盘（先销后 render 一次写完）；
  本轮至少让 P2 手测覆盖「确认后立刻二刷」的幂等核对。

### R3 永不作答的挂账卡按月霸占强弹窗额度 ⚠ 中（口径要落字）
- **现象**：`monthModal` 新增 `if (hasPendingModal()) return replayPendingModal(silent)`
  ——旧账不清，**每个月的强弹窗名额都被同一张卡消费**，`drawModalEvent` 永远轮不到。
  「欠账一直敲」是设计本意（与 dismiss 保留语义一致），但副作用是：讨厌某张卡、
  次次 dismiss 的玩家会被同一张卡月月敲门，且新危机 / 新 O1 供给完全停摆——
  内容节奏从「城市每月有新事」退化成「城市只剩这一件事」。
- **建议护栏**：属设计取舍，写进 §39 口径或 KNOWN（「挂账卡按月重敲并占用当月额度，
  直到作答」），否则手测会当 bug 报；中期可给连续 3 次 dismiss 的卡降级成 letter 收进抽屉。

### R4 抽卡账挂账即焚：不答也烧掉冷却，答完节奏突变 ⚠ 低
- **现象**：`noteCrisis / lastCrisisMonth / sinceModal 清零 / recentModal / once → done /
  markNpcFollowupFired` 全在抽出那刻记账并随挂账 `FC.write` 落盘（这正是 R15-R17
  「去重回滚」的修复，方向对）。代价：挂账卡拖了 N 个月才答，答完时 `since` 已巨大，
  下个月危机概率闸直接 75%——玩家刚还完旧账就挨新的一记，体感是「补弹引来连环敲门」。
- **建议护栏**：接受现状（账实相符优先），P4 手测记录观感；若反馈太差，
  中期在销账时把 `lastCrisisMonth` 顺延到销账月。

### R5 toast 强弹的 4 秒窗口也挂账：刷新后「重放一条没注意过的通知」 ⚠ 低
- **现象**：`drawModalEvent` 抽出的卡若 `presentation: "toast"`，同样走 `openEvent`
  挂账；toast 4 秒自动落账销账，但在这 4 秒内刷新，重进会把 toast 原样重放。
  行为守恒、无重复入账，只是玩家多半没注意到第一次——「补弹」在他眼里是凭空多了一条通知。
- **建议护栏**：无需改码；R16_TEST_NOTES 手测口径注明「toast 重放属预期」，防误报。

### R6 链式事件（saga）仍无补弹待遇：R16 制造了新双标 ⚠ 中
- **现象**：R15 的双标是「合约结算补、危机不补」；R16 把危机 / O1 拉平之后，
  轮到 `resolveSagaStep` 的链式卡：它走 `FC.events.show` 直连、不过 `openEvent`，
  刷新当月消失，要等**下次 tick** 才自愈重放（`saga.step` 未推进）。
  教学 v6 说「抽到的城市危机/事件弹窗……确认前刷新的话，进门会再弹一次同一张」，
  玩家把链式卡也算「事件弹窗」，刷新后进门没补弹，体感又是「教学骗人」（R12 同源）。
- **建议护栏**：本轮落字：KNOWN 写明「链式事件不进门补弹，下月自动重放」；
  中期让 saga 卡也走 `openEvent` 挂账（choices 是纯数据，可序列化）。

---

## 二、目标③：快进内置确认的残留风险（R7–R10）

### R7 O3/O4 类名契约错位：三条护栏挤成一段 + 273 行死 CSS ⚠ 高（合入前必修）
- **现象**：O4 在 `fc-events.css` 里写明 DOM 契约 `.fc-confirm__panel / __list > __item
  （← R15 三条护栏说明）/ __acts / __btn`，并特意做了「比 .fc-event 更轻：无层色、
  无类型霓虹、无 glow」的克制处理；O3 实际渲染的却是 `.fc-event fc-event--confirm`
  借壳 + `.fc-event__card/__title/__body` + `.fc-btn`。后果三连：
  ① O4 的 273 行确认样式**整段死代码**（`.fc-confirm` 根类从未出现在 DOM）；
  ② 面板长着完整事件卡的脸（层色 accent、glow），O4 的设计意图整体未生效；
  ③ **最疼的一条**：`ffConfirmBody()` 用 `\n` 分隔三条护栏，塞进单个
  `<p class="fc-event__body">`——CSS 里没有任何 `white-space: pre-line`，
  换行符塌成空格，三条护栏在 390px 上挤成一段带「·」的连读长文。
  本轮目标③的立项理由就是移动端读得清这三条，结果换了个壳还是读不清。
  F1 的 G-8 只验「语义不丢」、G-9 顺着 O3 写「借 .fc-event 的壳」，门禁会全绿放行。
- **建议护栏**：最小修一行 CSS：`.fc-event--confirm .fc-event__body { white-space: pre-line; }`；
  正解是 O3 把 body 按 `\n` 拆进 O4 的 `__list/__item` 结构（契约本来就为此设计）。
  死 CSS 删还是留（等下轮对齐）需 Orchestrator 拍板，别不明不白留着。

### R8 FC.confirm 缺席时的回退是「直接放行」 ⚠ 低
- **现象**：`nativeConfirm` 里 `if (typeof window === "undefined" || !window.confirm)
  return true`——`FC.confirm` 没加载（旧缓存、脚本加载失败）且 WebView 又阉割了
  `window.confirm` 时，快进**一句不问直接开跑**，三条护栏一个字没露面。
  概率低（`fc-events.js` 与 dashboard 同页加载），但失败模式恰是本轮要消灭的那类。
- **建议护栏**：回退里 `!window.confirm` 时改为 `sysLog` 一条护栏说明再放行，
  或干脆 return false（没确认渠道就不快进）。一行改，不修就记 KNOWN。

### R9 默认焦点在「开始快进」，与自家「默认答案是不」的规矩打架 ⚠ 低（需拍板）
- **现象**：`confirmDialog` 里 `yes.focus()`——Enter 党零阅读成本直通快进。
  与 `window.confirm` 的 OK 默认焦点等价，不算回退；但 fc-events.js 自己的注释写着
  「问句的默认答案永远是不」（Esc/遮罩已按此实现），焦点却给了「是」。
  更要紧的是**两份文档口径相反**：F1 G-9 写「打开即焦点落在主按钮上」（现状），
  本条建议焦点给「再等等」——合入前要对齐成一个说法，别让下轮验收左右为难。
- **建议护栏**：拍板即可。倾向焦点给取消键（快进不可撤销、且面板存在的意义就是让人读完三条）。

### R10 确认面板固定 `data-type="relation"`：快进确认长着人情事件的脸 ⚠ 低
- **现象**：`confirmDialog` 缺省 `data-type: "relation"`，借壳后吃到人情琥珀 accent
  与配色；快进确认被渲染成「人情类事件」的观感，语义错位。R7 修契约时顺手就能消掉。
- **建议护栏**：与 R7 同批处理：要么专用 confirm 样式（O4 契约），要么给个中性 type。

---

## 三、横切风险（R11–R14）

### R11 教学 v6 又一次全量重看：R15-R14 复发，每轮 bump 正在成为惯例 ⚠ 中（需拍板）
- **现象**：KEY `v5 → v6`，所有老玩家（包括上轮刚被迫重看过 v5 的）再看一遍 5 步教学。
  连续两轮如此，「为两句新话重放整套教学」从个案变成模式。且 boot 链现在最长
  **6 连弹**：结算补弹 → 危机补弹 → 选轨 → 闯城目标 → 签约 → 教学——
  重度欠账档进门要点掉六层窗才摸到仪表盘。
- **建议护栏**：本轮拍板一个政策：教学增量用角标 / 只弹变更步，KEY bump 留给结构性改版。
  6 连弹本身按 P6 手测记录时长，超过忍受阈值就把教学挪出 boot 链（改首次交互触发）。

### R12 教学措辞过宽：「事件弹窗」把不补弹的类别也许诺进去了 ⚠ 低-中
- **现象**：v6 新句「抽到的城市危机/事件弹窗也要选完才算数：确认前刷新的话，
  进门会再弹一次同一张」。实际补弹范围 = 危机 + 非合约 O1 + 人情讨债（R1）；
  链式卡（R6）与合约门禁 O1（R1）都不补。教学的「事件弹窗」四个字盖过头了——
  R15-R13 教学与实现正面冲突的教训刚过一轮，这次是措辞外溢版。
- **建议护栏**：O5 把句子收窄成「危机与城市事件卡」，或 KNOWN 里把不补弹清单列全
  （链式 / 合约系 / 结局卡），G2 的 §39 口径同步（现稿「危机、O1 与人情讨债」需加「不含合约事件」）。

### R13 G1 对 dashboard 仍是源码正则，双保险与幂等没有行为级断言 ⚠ 低（流程性）
- **现象**：R15-R19 同款：sim 侧（pendingModal 三 API、迁移）是 vm 真跑的行为断言，
  dashboard 侧（`openEvent` 挂销、`replayPendingModal`、boot 顺序、`startFastForward`）
  全是 `functionSection` + 正则——函数改名假红、逻辑写反不红。本轮特有的缺口：
  「dismiss 不销账」「确认恰好一次入账」「resolution 双通道互斥」三条核心语义
  零行为覆盖（好在互斥有双保险兜着，见「已核对无虞」1）。手测 P2/P4 不可省。
- **建议护栏**：接受现状（DOM 难 mock），P 系列写进 R16_TEST_NOTES 必测项。

### R14 老账续档：危机池塌缩、日志洪水、打断不点名 ⚠ 低（不记在 R16 头上）
- **现象**：R14/R15 的三件旧账本轮零处理：顺风局危机池 2–3 张循环（R15-R16）、
  快进 20+ 条日志淹关键卡（R15-R18）、「被一件事打断」不点名（R15-R7）。
  R16 无恶化，但补弹让同一张卡的出镜率更高，池子小的问题**更显眼**了。
- **建议护栏**：续档即可；下轮优先「打断点名 + 快进月度摘要」这对低成本组合。

---

## 四、回归手测路径（P1–P8）

> 与 G2 `R16_TEST_NOTES.md` 六景、F1 G-1～G-15 互补：那两份验「功能对不对」，
> 这份专打上文风险点。环境同 G2：`python3 -m http.server 8000`，清站点数据，开 Console；
> 移动端用 390px 设备模式。

- **P1 三条护栏换行观感**：桌面与 390px 各点一次「快进三月」，逐字读确认面板：
  三条护栏是否各占一行、有无横向溢出、面板是否带层色 accent（当前预期：**挤成一段**、
  带 relation 琥珀色——修完 R7/R10 后此处应反转）。截图留档。盯防：R7、R10。
- **P2 双欠账幂等三连**：合约推到期（`run.contract.deadlineMonth = run.months`）→ tick →
  结算卡不确认 → 同月再造危机挂账（`run.lastCrisisMonth = run.months - 6;
  run.recentCrisis = []; Math.random = () => 0` 后 tick）→ 刷新 → 应先结算后危机两张都补 →
  逐张确认并记录 `run.money` → **再刷新 ×2** → 两张都不再弹、钱不再动、
  `resolutionPending === false && pendingModal === null`。盯防：R2、双通道互斥。
- **P3 合约门禁 O1 吞卡确认**：签落户 → 推进至合约事件弹出（或 Console 用
  `FC.events.pick({contract: FC.Sim.contractCtx(run), ...})` 探出一张 `contract` 事件）→
  卡挂着刷新 → 重进：预期（现状）**不补弹**，当月吞卡。与 P2 对照体验差，
  确认 §39/KNOWN 措辞覆盖。盯防：R1、R12。
- **P4 连续 dismiss 的月月敲门**：危机卡挂账 → 连续 3 轮「刷新 → 补弹 → 程序性
  `FC.events.close()`（模拟 dismiss）→ tick」→ 确认每月 monthModal 都重放同一张、
  期间无任何新危机 / O1；第 4 轮正常作答 → 记录下个月是否立刻挨新危机（`since` 巨大 →
  75% 闸）。记录「同一张卡敲 N 次门」的观感。盯防：R3、R4。
- **P5 toast 窗口刷新**：Console 把一张 `presentation:"toast"` 事件送进
  `openEvent`（或改档强抽）→ 4 秒内刷新 → 重进应重放该 toast 且账只入一次。
  确认观感是否需要 KNOWN 备注。盯防：R5。
- **P6 boot 六连弹计时**：清 `fucheng.guide.*` + 挂结算欠账 + 挂危机欠账的挑战新档
  重进 → 数弹窗层数、计从进门到可操作仪表盘的秒数；顺带确认教学 v6 对上轮 v5
  已读玩家仍全量重弹。盯防：R11。
- **P7 saga 对照实验**：链式事件卡挂着刷新 → 重进**无补弹** → tick 下月卡自愈重放；
  与 P2 的危机补弹并排记录，逐字对照教学 v6 句子，确认玩家会不会把 saga 当「事件弹窗」。
  盯防：R6、R12。
- **P8 快进确认重入与键盘路径**：快进被强弹窗打断 → 答完再点快进 → 确认面板应重新
  弹出且状态干净；面板开着时狂点「快进」按钮与狂按 Enter → 无双开、无双跑
  （`fastForwarding` 闸 + overlay `confirm` kind 拒重入）；Esc / 点遮罩 → 取消不动一格。
  盯防：R9，兼 F1 G-8 复核。

---

## 五、已核对无虞（不占风险名额，防重复排查）

1. **结算卡双通道互斥有双保险**：`monthModal` / `replayContractResolution` 两处显式
   `{pending:false}`，且 `resolutionEvent` 载荷自带 `contract` 字段会被 `tracksPending`
   的 `!ev.contract` 再拦一道——两道防线删掉任何一道都不会双发（这也解释了 R1 那刀的来历）。
2. 抽卡账（`noteCrisis` / `lastCrisisMonth` / `sinceModal` / `recentModal` / `done` /
   `markNpcFollowupFired`）挂账即随 `FC.write` 落盘，R15-R17 的「去重回滚」连带修复；
   补弹走 `openEvent` 直放**不过** `drawModalEvent`，抽卡账不会被补弹重推一格。
3. `setPendingModal` 同 id 短路幂等（monthModal 与 openEvent 双写不冲突）；
   连续 dismiss / 重进不重复包裹 payload、存档不膨胀。
4. 残 payload 兜底成立：无 `event.id` → `clearPendingModal` 放行，boot 不被死待办卡死；
   有 id 无 choices → `FC.events` 渲染成 ack 卡（「继续 ▸」），作答即销账自愈。
5. 双击快进不叠确认框：`fastForwarding / run.ended` 闸在 confirm **之前**；
   `FC.overlay.push("confirm")` 拒重入并 resolve `false`，孤儿 DOM 自清。
6. boot 补弹成功后立刻 tick 不叠新门：`sinceModal = 0`、`lastCrisisMonth = N` 已随挂账
   落盘，下月 `MODAL_ODDS[1] = 0`、危机 `since < 3`，自然让路——dispatch「另议」的边界
   实际是安全的。
7. `FC.guide.dismiss` 回填 v5→v2 全部旧 key：版本回滚不会再触发重看（R15 无此保护，本轮补上了）。
8. 快照 `42750cf` 时 `./scripts/run-fucheng-life-tests.sh` 27 项全绿，R16 测试已挂 runner；
   `js-syntax` / `page-boot` 含本轮全部改动文件。

---

## 六、优先级速览（给 Orchestrator 合入时的盯防顺序）

1. **合入前必修**：R7（三条护栏挤成一段——最小一行 CSS `white-space: pre-line`，
   正解对齐 O4 的 `__list/__item` 契约；273 行死 CSS 去留一并拍板）。
2. **需拍板**：R9（确认框默认焦点，F1 G-9 与本文口径相反，二选一）；
   R11（教学每轮全量 bump 是否继续；boot 6 连弹阈值）。
3. **落字即可**：R1（合约系事件不补弹）、R3（挂账卡月月敲门并占额度）、
   R6（链式卡不补弹）进 §39 措辞或 KNOWN_ISSUES；R12 教学句子同步收窄。
4. **低成本顺手修**：R8（confirm 缺席回退别静默放行）、R10（confirm 面板别穿 relation 的衣服）。
5. 其余中低按期排；R14 是 R14/R15 遗留老账，续档不重述。

---

model slug: claude-fable-5-thinking-xhigh
