# R14 体验风险清单 · 快进 / 弹窗帽 / 危机去重（playfeel）

> 作者：R14-F2（fable）。只读现码后的体验风险盘点，不改游戏代码。
> 对照代码状态：`fc-sim.js` 的 `recentCrisis`/`noteCrisis`/`contractForGoal`（commit `1422dde`）、
> `fc-contract.js` 的 `recommendedId`/置顶（commit `f0c11e9`）、
> `dashboard-app.js` 的 `autoSpendAp`/`fastForwardMonths`/`startFastForward`（commit `abb6e89`）
> 以及工作区里**未提交**的 `monthModal` 弹窗帽 WIP（finishMonth 尾链拆出的新函数）。
> 姊妹篇：验收门禁见 `fable-r14-sota-gates.md`（F1），条文草稿见 `fable-r14-acceptance-draft.md`（F3）。

共 **23 条风险**：快进误花 AP 5 条（R1–R5）、软锁 4 条（R6–R9）、弹窗过载 5 条（R10–R14）、
危机重复 4 条（R15–R18）、R13 交叉风险 5 条（X1–X5）。另附 8 条回归手测路径（P1–P8）。

---

## 一、快进误花 AP（R1–R5）

### R1 快进会替玩家烧掉预设的探区目标 ⚠ 高
- **现象**：玩家先在地图上选好探区（`run.zoneQueue`），本想手动挑时机去；一点快进，
  `suggestMonth` 见 `zoneQueue` 非空就建议 `explore`，`autoSpendAp` 直接替他去了——
  高危区（auction/broker/alley）可能当场大额扣钱扣健康，还排队一条次月余波（见 X1）。
- **根因**：`autoSpendAp` 无条件采纳 `suggestMonth`；快进 confirm 文案只说「自动花完行动点」，
  没提「包括替你去探区」。
- **建议护栏**：快进期间跳过 `explore`（保留 zoneQueue 给玩家手动用），或在 confirm 文案里点名。

### R2 自动行动烧钱没有现金下限护栏 ⚠ 高
- **现象**：`study`/`network`/`rest` 的 `d.money` 都是 −1，经 `moneyOf` 折算约等于**一整月收入**。
  低现金局连点快进，一次最多自动烧 3 笔月收入；`settleMonth` 里 `money < 0` 直接转 `debt`，
  玩家回来发现凭空多了债。
- **根因**：`suggestMonth` 只看健康/合约/目标，从不看 `run.money`；`autoSpendAp` 也不设止损线。
- **建议护栏**：现金低于 1 个月收入时，自动选择退回 `work`（唯一 +money 且恒可用的行动）。

### R3 低健康区间的「花钱躺平」螺旋 ⚠ 中
- **现象**：`health < 38` 时 `suggestMonth` 恒建议 `rest`（money −1），快进一整月 3 AP 全在休息烧钱；
  健康 38–55 也会穿插 rest。健康低 + 现金低的局面，快进的自动驾驶恰好与玩家止损直觉相反，
  且与 R2 叠加成亏损螺旋。
- **回归点**：见 P4。

### R4 挑战档末段/结局月快进替玩家交卷 ⚠ 中
- **现象**：闯城 60 月按完成度评分。到期前几个月点快进，最后几手 AP 由 `autoSpendAp` 代打
  （fallback 恒为 `work`，不一定服务 `goalProgress`）；到期当月 `checkEnding` 在花完 AP **之后**触发，
  玩家无法介入影响评分的最后动作。
- **建议护栏**：`challengeMonths - months <= n`（如 3）时快进前额外提示，或干脆禁快进。

### R5 「被打断」文案在最后一月失真 ⚠ 低（易修）
- **现象**：`fastForwardMonths` 的 `step(n-1)`（第 3 月）撞上弹窗时，仍打日志
  「快进被一件事打断，剩下的月份没走」——但 3/3 个月其实都走完了，玩家误以为损失了月份。
  结合 R16（第 3 月准点危机），这条误导文案几乎**每次快进都会出现**。
- **建议护栏**：带上实际走过的月数（「快进走了 3/3 月，停在一件事上」）。

---

## 二、软锁（R6–R9）

### R6 `window.confirm` 依赖是快进入口的单点故障 ⚠ 高（移动端）
- **现象**：`startFastForward` 与抽屉入口都靠原生 `confirm`。部分 WebView / 小游戏容器
  （微信内置浏览器的某些场景、iOS 第三方壳）禁用或恒返回 false → 快进点了没反应，无任何提示。
  另外 `#tick6Btn` 在 HTML 里初始 `disabled`，靠 boot 成功后统一 enable（`init` 尾部）；
  boot 半失败时按钮永久灰、无解释。
- **建议护栏**：confirm 换成游戏内 overlay（项目已有 `FC.overlay`），或至少 feature-detect 后降级为直接执行 + 日志提示。

### R7 快进链挂起会把快进按钮「静默锁死」 ⚠ 中
- **现象**：`fastForwarding` 标志在 resolve/reject 时复位，但 `FC.events.show` 的 promise
  依赖弹窗交互回调；若弹窗 DOM 被外力移除（reset 之外的路径、极端布局崩溃），
  promise **永不 resolve**，标志恒 true，此后点快进直接 `return`，无任何反馈。
  手动「推进一个月」不共享该标志，仍可玩，属半软锁。
- **建议护栏**：快进入口在 `fastForwarding===true` 时给一条系统日志（「快进进行中」），便于排查。

### R8 「AP 花不完」中止文案与真实原因脱节 ⚠ 低（前瞻）
- **现象**：现包所有行动 1 AP 且 `work` 无前置，`autoSpendAp` 后 `run.ap > 0` 几乎不可达；
  但中止文案写死「可能缺探区目标」。将来加高 AP 行动、或给 `canAction` 加新前置时，
  这条文案会指错方向。`guard 24` + `before/after` 防死循环护栏已到位，这点是好的。
- **建议护栏**：文案只报事实（剩几点、没有可执行行动），不猜原因。

### R9 弹窗挂起期间刷新页面：当月事件被吞 ⚠ 低
- **现象**：`finishMonth` 在 `monthModal` 之前已 `render`→`FC.write` 存档；弹窗（危机/O1/结算）
  挂着时杀掉页面重进，当月事件不会重放（`drawModalEvent` 只在月结时机跑），玩家少经历一件事。
  合约**结算**弹窗被吞更疼：`tickContract` 已把 `c.status` 落成 won/failed 并存档，
  重进后 `monthModal` 不再补发 `resolutionEvent`——奖惩的 `d` 挂在弹窗选项上，等于**奖励/惩罚永久丢失**。
- **回归点**：见 P8；建议 O1 考虑「结算未确认」标记，重进补弹。

---

## 三、弹窗过载（R10–R14）

### R10 弹窗帽漏洞：picker「再想想」不占当月额度 ⚠ 高
- **现象**：`monthModal` 里 `maybeOfferContract`/`maybeOfferSecondaryContract` 只有**签了**才返回 true；
  点「再想想」返回 false，链条继续走到 `drawModalEvent` → 同一个月「要约 picker + 危机/O1」两个强弹窗。
  这与 dispatch 的「命中后不再叠」相悖——除非把「命中」定义成「弹出过」而非「签约了」。
- **建议护栏**：picker 只要**弹出过**就算当月额度用掉（无论签否）；验收口径需在 §37 定死（提请 F3/G2 对齐）。

### R11 Saga 抉择弹窗游离在帽外 ⚠ 中
- **现象**：链式/出身 saga 的抉择弹窗在 `tick` 内、`finishMonth`→`monthModal` **之前**结算，
  同月可出现「saga 弹窗 + 帽内弹窗」两连。帽子的实际语义是「月结链内最多 1 个」，
  不是字面的「每月最多 1 个」。
- **建议护栏**：saga 弹过就给 `monthModal` 传个 flag 直接走 `maybeShowLedger` 短路；至少在验收条文里写清豁免范围。

### R12 事件弹窗 + 月账 overlay 连击 ⚠ 中
- **现象**：`openEvent` 尾部会 `maybeShowLedger`（months===1 / income<0 / month===12 时开账本）。
  弹窗刚关、账本又起，两层 overlay 连击；快进最后一月 `silent=false`，恰逢 12 月或负现金时必现。
- **建议护栏**：账本不算强弹窗可以接受，但同月「弹窗→账本」建议留 300ms 以上间隔或合并入口。

### R13 快进期 picker 连环敲门 ⚠ 中
- **现象**：月 1–3 有签约窗口，`contractSkipped` 只记**当月**。开局就快进：每月 picker 弹一次、
  跳过、下月再弹——一次快进最多 3 连弹，且跳过不算 hit **不会中断快进**，
  体验像被城市连按门铃。挑战档还叠加 goal→contract 的推荐心智（R14-O2 的置顶/角标此时首次亮相）。
- **建议护栏**：快进中把 picker 弹出视为中断（配合 R10 的口径），或快进期间跳过 offer、结束后补问。

### R14 快进日志洪水淹没关键条目 ⚠ 低
- **现象**：3 个月 ≥9 条「行动」+ 月结/余波/回执/系统条，一次涌入 20+ 条日志；
  危机选择、合约结算这类关键卡被自动行动流水淹没，玩家难以复盘「钱去哪了」（与 X1 叠加）。
- **建议护栏**：快进产出的行动条打个视觉弱化标记，或每月折叠成一条摘要。

---

## 四、危机重复（R15–R18）

### R15 顺风局危机池塌缩 → 同卡循环 ⚠ 高
- **现象**：6 张危机里无条件卡只有 `side_or_study`（≥3 月）、`rent_fight`（≥5 月）、
  `city_check`（≥6 月且 gap 5）。健康>58、社交≥55、债<8000 的顺风局 eligible 恒 2–3 张；
  `recentCrisis` 窗口 4 大于池子 → `pool` 抽空 → 兜底「退回全部 eligible」→
  同一张卡约每 3 月准点复现。去重机制形同虚设的恰是最常见的稳态局。
- **建议护栏**：兜底时优先挑 `recentCrisis` 里**最老**的一张，而非整池回填；中期补无条件危机卡。

### R16 危机节奏是确定性的「每 3 月准点敲门」 ⚠ 高
- **现象**：`pickMonthCrisis` 没有概率闸——`since >= 3` 且有 eligible 就必触发。
  R13 注释写「约每 3–5 月一次」，实际是精确 3 月一次。后果：
  ① 节奏可预测，玩家学会在第 3 月屏息；② **快进三月几乎必在第 3 月被危机打断**，
  快进的「三月」名不副实（叠加 R5 的误导文案，观感更糟）。
- **建议护栏**：`since>=3` 后按 `since` 递增概率（如 0.45/0.7/1.0），把「约 3–5 月」做实。

### R17 去重状态双主体 + 「抽中即记」时机过早 ⚠ 中
- **现象**：`recentCrisis` 由 sim 在 `pickMonthCrisis` 内记（抽中即记，玩家应答前），
  `lastCrisisMonth` 却由 dashboard 在 `drawModalEvent` 里设——绕过 dashboard 的调用方
  （单测、未来其它入口）会推进去重窗却不推进间隔计时。另外弹窗挂着时刷新页面，
  内存里的 `recentCrisis`/`lastCrisisMonth` 变更未落盘（存档写于弹窗前）→ 重进后同一危机可**立即重抽**，
  体感「同一危机连续出现」。
- **建议护栏**：`lastCrisisMonth` 收进 `pickMonthCrisis`（O4 职责内一行改动），存档时机问题记入已知限制。

### R18 两套去重并存，易被后续改动误伤 ⚠ 低
- **现象**：危机事件 id 带月份后缀（`crisis_ot_or_rest_37`）且**不进** `run.recentModal`；
  O1 事件走 `recentModal` 窗 8，危机走 `recentCrisis` 窗 4。两套机制并存没有注释交叉引用，
  后续若有人把危机 id 塞进 `recentModal`，会出现双计或永不去重。
- **建议护栏**：G1 测试锁死「crisis_ 前缀不参与 recentModal」这一行为。

---

## 五、与 R13 危机 / 探区余波的交叉风险（X1–X5）

### X1 快进 × 探区余波：静默扣账三连 ⚠ 高
- **现象**：R1 的自动探区会 `queueZoneAftershock`；次月 `finishMonth` 里高危余波直接落日志
  （money −1×收入 + health −2，无弹窗，R13 设计如此）。快进静默期内
  「自动行动扣钱 + 余波扣钱 + 月结账单」三处叠加，玩家回来只看见现金跳水，
  归因线索埋在日志洪水里（R14）。
- **回归点**：见 P3。

### X2 余波单槽覆盖的潜在吞事件 ⚠ 低（前瞻）
- **现象**：`run.zoneAftershock` 是单对象，`queueZoneAftershock` 直接覆盖。当前节奏
  （每月最多一次探区、次月必结）不会丢；但快进/未来若允许同月多次探区或延迟结算，
  先排的余波会被静默吞掉。建议 G1 加一条「余波先进先出或明确覆盖」的行为断言占位。

### X3 第 3 月是信息密度峰值月，恰是快进停下的那月 ⚠ 中
- **现象**：R16 的准点危机 + 余波日志卡 + 环境事件 + 月结 + 可能的账本，全挤在同一月；
  快进把玩家从「挂机」直接拽进整局最复杂的一屏。危机弹窗还是二选一强抉择，
  玩家缺上下文（前两月是自动驾驶的）就要做决定。
- **建议护栏**：危机弹窗 body 里带一句本月状态摘要（现金/健康），降低断上下文决策的负担。

### X4 余波文案暴露英文 zone key ⚠ 低
- **现象**：`resolveZoneAftershock` 的 `name = z.zone`，日志出现「探区『broker』的余波…」。
  R13 已知瑕疵（代码注释自己承认），在快进后的密集日志里更突兀。顺手修的话在 O4 可写路径内
  （`ZONE_BLURB` 补中文名字段）。

### X5 旧档迁移：R12/R13 存档缺 R14 字段 ⚠ 中
- **现象**：旧档没有 `recentCrisis`/`lastCrisisMonth`/`zoneAftershock`。`fc-sim` 载入侧已补默认
  （`normalizeRun` 一带，511–512 行），`freshRun` 也带初值；但快进 + 危机去重是首批
  会**读写**这些字段的热路径，迁移是否完备只有真拿旧档跑过才算数。
- **回归点**：见 P7。

---

## 六、建议回归手测路径（P1–P8）

> 环境准备与控制台探针同 F1 文档 §0；以下每条按「操作 → 预期 → 盯防风险」给出。

- **P1 顺风局快进基线**：新开完整档推到月 4+（避开签约窗），确认上次危机刚发生过
  （`run.lastCrisisMonth` 就是本月）→ 点快进。预期：3 AP × 3 月全自动花完、`run.months` +3、
  第 3 月被危机停下时文案不误报月数。盯防：R5、R16。
- **P2 开局挑战档连弹链路**：闯城档 → goal picker → contract picker（验证推荐置顶 + 角标）→
  点「再想想」→ 立即快进。预期（按当前 WIP 行为记录）：每月 picker 重弹、跳过后同月可能再叠危机/O1。
  盯防：R10、R13——这条路径就是弹窗帽口径的试金石。
- **P3 预设探区后快进**：地图选高危区（auction/broker）→ 快进。预期：探区回执 + 次月余波都落日志，
  现金变化能从日志逐条对上账。盯防：R1、X1、R14。
- **P4 低健康低现金自动驾驶**：控制台 `run.health=40; run.money=<约1月收入>` → 连续快进两次。
  预期（记录现状）：连续 rest 烧钱、可能滚入负现金转债。盯防：R2、R3。
- **P5 合约到期月快进**：把 `run.contract` 推到到期（改 `startMonth` 或直接 `deadlineMonths`）→ 快进。
  预期：结算弹窗是当月唯一强弹窗、危机顺延到下月、快进停下。盯防：monthModal 优先级、R10。
- **P6 危机去重专项**：顺风局（健康/社交/债都在阈值安全侧）连推 12+ 月，记录危机 id 序列；
  另在危机弹窗挂着时刷新页面重进，看同危机是否次月复现。盯防：R15、R16、R17。
- **P7 旧档迁移**：拿 R13 合入前的存档（或手工删掉 `recentCrisis`/`zoneAftershock` 字段）载入 →
  快进 + 触发一次危机。预期：无 undefined 报错、去重从零窗口正常起步。盯防：X5。
- **P8 移动端入口与容器**：≤640px 打开抽屉「快进三月」入口 + 桌面 `#tick6Btn` 双入口对照；
  微信 WebView 里验证 confirm 可用性；快进中弹窗挂起时刷新，重进后检查合约结算是否被吞。
  盯防：R6、R7、R9。

---

## 优先级速览（给 Orchestrator 合入时的盯防顺序）

1. **口径必须先定**：R10（picker 占不占额度）直接决定 O1 的 monthModal 写法与 G1 断言，合入前定死。
2. **高危三件**：R1/X1（快进烧探区）、R15/R16（危机准点重复）、R6（confirm 单点故障）。
3. **低成本顺手修**：R5（文案带月数）、R8（文案去掉猜测）、X4（zone 中文名）。
4. 其余按中/低排期，全部收进 §37 或 KNOWN_ISSUES。

---

model slug: claude-fable-5-thinking-xhigh
