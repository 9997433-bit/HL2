# R17 · ACCEPTANCE §40 条文草稿（F3）

> 交付物：可直接粘贴进 `games/fucheng-life/ACCEPTANCE.md` 的第 40 条整段条文。
> 落地由 R17-G2 执行；本文件只是草稿，**不改 ACCEPTANCE.md 本体**。
> 风格对齐现有 §37–39：条目一行标题 + 若干行可勾验的行为描述 + 测试命令全绿收尾。
> 写稿时 G2 已把 §40 落进 ACCEPTANCE.md（`2c57bcc`）并把 §39 勾成 `[x]`；
> 下方条文与已落文本**逐字一致**，G2 无需回改。唯一格式差异见「三、对齐说明」
> 末条（行尾硬换行空格），属排版细节，不改也不影响验收语义。

---

## 一、粘贴进 ACCEPTANCE.md 的整段条文

```markdown
40. [ ] **R17 · 合约 O1 刷新补弹 + 开局连弹收敛**
    带 `contract` 字段的合约门禁 O1 也会写入 `pendingModal` 并可在刷新后补弹；仅显式 `{ pending: false }` 的合约结算卡与 `resolutionEvent` 产物不挂起，确认结果只入账一次。
    开局若已完成合约结算或 `pendingModal` 补弹，当次推迟自动选轨、签约与聚光灯教学；闯城档缺少主目标时仍会询问，手动教学入口继续可用。
    本月危机池新增写实二选一，并继续遵守概率闸、近期去重与每月一个强弹窗上限。
    `node games/fucheng-life/tests/r17-pending-contract.test.js` 与 `./scripts/run-fucheng-life-tests.sh` 全绿。
```

---

## 二、逐条人工检查步骤（供 G2 / 验收人参考，不必粘贴）

从仓库根目录 `python3 -m http.server 8000`，Chrome 打开
<http://127.0.0.1:8000/games/fucheng-life/>，先清站点数据并开 Console；
移动端项目用 DevTools 设备模式，视口 `390px`。
场景编号与 `round17/R17_TEST_NOTES.md` 的 1–6 对应。

### 40-a 合约门禁 O1 刷新补弹（对应 R16 误排除修复）

1. 新局签下人生合约（落户积分 / 攒首付 / 升职任一），推进月份直到弹出对应的
   合约门禁 O1——库里共 5 张：`EV93 积分窗口`、`EV94 在职学位的报名页`（落户）、
   `EV95 三年定期`、`EV96 家里凑的那一笔`（首付）、`EV97 晋升答辩`（升职）；
   这些卡只在对应合约激活时才会被抽中。
2. **不点选项**，直接刷新页面。刷新前 Console 查 `FC.read().run.pendingModal`，
   应为 `{ kind: "contract", event }` 形状且 `event.id` 为 EV93–97 之一
   （R16 时这里是 `null`——带 `ev.contract` 的卡被 `tracksPending` 一刀切排除，
   刷掉即永久丢失，这正是本条要堵的洞）。
3. 重进仪表盘：同一张卡补弹（同 id、同选项）；确认前现金、KPI、合约进度、
   日志均未入账。用 dismiss / 关闭退出再刷新：待办仍在，dismiss 不销账。
4. 确认一个选项：后果（含 `kpi` / `contractProgress` 等合约侧付账）只结算一次；
   `FC.Sim.hasPendingModal(FC.read().run)` 由 `true` 变 `false`；再刷新不再补弹。

### 40-b 合约结算卡照旧排除（两类都不挂 `pendingModal`）

1. 推进至主合约判定成功 / 失败，弹出结算卡（id 形如 `contract_<id>_<status>`、
   category「合约」，由 `FC.contract.resolutionEvent(run)` 生成，openEvent 时
   显式传 `{ pending: false }`）。结算卡弹出期间 Console 查
   `FC.read().run.pendingModal`，应保持 `null`。
2. 确认前刷新：结算卡仍会补弹，但走的是它自己的 `resolutionPending` 通道
   （`replayContractResolution()`，§38-d 语义），不占 `pendingModal`；
   确认后奖惩只入账一次。
3. 回归确认：普通合约 O1（40-a）不因带 `contract` 字段被这条排除逻辑误伤——
   排除判定现在只认「`contract_` 前缀 + category 合约」的结算卡与显式
   `pending: false`。

### 40-c 开局连弹收敛（boot 不再 4–6 连弹）

1. 准备一份「尚未选轨 / 尚未签约 / 尚未看教学」且挂着 `pendingModal`
   （或合约结算未领取）的存档，重进仪表盘。
2. 预期：本次进门只补弹欠账的那 1–2 张卡（结算先于危机/O1，次序同 §39-c），
   自动选轨、签约要约与聚光灯教学**当次全部顺延**，不出现连环弹窗。
3. 处理完待办后再刷新一次（此时无待办）：被顺延的选轨 / 签约 / 教学恢复正常
   弹出，没有被永久跳过。
4. 「新手教学」按钮在补弹收敛的那次进门里仍可手动打开（教学键 R17 升至
   `fucheng.guide.v7`，dismiss / reset 兼容回填 v3–v6 旧键，老玩家不会被
   强制重看）。

### 40-d 闯城主目标防软锁（收敛的唯一例外）

1. 用缺少主目标的闯城档（`FC.Sim.needsChallengeGoal(run)` 为 `true`）触发
   40-c 的开局补弹路径。
2. 预期：即使本次发生补弹，主目标四选一**仍然弹出**——没有目标这一局无法计分，
   `maybeOfferChallengeGoal()` 在 init 链中不受 `replayed` 分流限制。

### 40-e 危机池扩容与既有护栏

1. 危机池由 6 条扩至 9 条，Console 查
   `FC.Sim.MONTH_CRISES.map(c => c.id)` 应含新增的
   `checkup_arrow`（体检报告上的箭头，健康 < 46 才入池）、
   `family_call`（老家来的电话）、`wage_delay`（工资晚了十天）；
   三条均为写实二选一、追加在池尾，不改既有抽取顺序。
2. 连续推进多组月份抽查：新危机文案无占位符 / 系统腔，选项因果自洽；
   触发仍经概率闸，`recentCrisis` 近期去重生效，且不突破每月一个
   强弹窗上限（§37 帽）。

### 40-f 自动化门禁

```bash
node games/fucheng-life/tests/r17-pending-contract.test.js
./scripts/run-fucheng-life-tests.sh
```

两条命令退出码均为 `0`，全部 suite 通过，其中 R17 专项断言包含：
`tracksPending` 不再按 `ev.contract` 一刀切排除、显式 `opts.pending` 仍受尊重、
`pendingKindOf` 对带 `contract` 的卡先归 `contract` 再看 `requires`（不误标 npc）、
init 链消费两次补弹结果并以共享状态分流自动选轨 / 签约 / 教学、
闯城主目标询问与顺延后的签约 / 教学路径均保留、`MONTH_CRISES` ≥ 8。

### 桌面 + 390px 回归（并入 13 号门禁口径）

桌面与 `390px` 各走一次「开局补弹 → 确认事件 → 推进月份 → 触发危机 →
手动重开教学」：弹窗无叠层、无横向溢出，Console 无 error、
未处理 Promise rejection 或 404。

---

## 三、与现码的对齐说明（写给 G2 / 合入责任人）

写稿时分支 `cursor/fucheng-r17-pending-contract-fa72` 十路已全部落码
（HEAD `d48b10b`），`./scripts/run-fucheng-life-tests.sh` 实测 **28 passed / 0 failed**，
两条 40-f 命令退出码均为 `0`：

- **O1 已落**（`467134e` + `d48b10b`，`dashboard-app.js`）：
  `tracksPending` 收窄为「显式 `opts.pending` 优先，其余只排除
  `isContractResolutionEvent`（`contract_` 前缀 + category 合约）」；
  init 链用 `replayed` 标志合并 `replayContractResolution()` 与
  `replayPendingModal()` 的命中，命中后当次跳过 `maybeOfferCareerTrack` /
  `maybeOfferContract` / `guide.show`，`maybeOfferChallengeGoal()` 不受分流；
  `pendingKindOf` 新增 `contract` 分支且排在 `requires`（npc）之前。
- **kind 兼容性**：`fc-sim.js` 的 `setPendingModal`（R16）对 `kind` 只做
  字符串校验、不设白名单，新 kind `"contract"` 可直接落存档；
  R16 老存档里已挂成 `"npc"` 的合约卡补弹时原样透传 kind，不需迁移。
- **O2 已落**（`38c16d6`，`fc-sim.js`）：`MONTH_CRISES` 6 → 9，
  新增 `checkup_arrow` / `family_call` / `wage_delay` 追加在池尾
  （等权抽取时不动既有顺序，末位 `wage_delay` 无属性门槛、兼作兜底）；
  概率闸 / `recentCrisis` / 单月帽逻辑未动。
- **O3 已落**（`a0968b0`，`fc-guide.js`）：教学键升 `fucheng.guide.v7`，
  第④步补一句「打合约标签的城市事件没确认就刷新，下次进门原样再弹」；
  dismiss / reset 回填 v3–v6 旧键。
- **O4 已落**（`296c1b9`）：`round17/o4-contract-o1-audit.md` 抽核
  EV93–EV97 载荷齐 id / choices，可安全进 `pendingModal`，无需补
  `presentation: modal`，`data/story.json` 零改动。
- **O5 已落**（`a70817c`）：boot 收敛后无需新增 CSS，
  `round17/o5-skip.md` 说明跳过。
- **G1 已落**（`3803117`，后随实现两次收敛：`7555be4` 接受 helper 式
  分流状态、`d48b10b` 增加 `pendingKindOf` 次序断言）：断言范围见 40-f 括注；
  若后续重构改变 init 链形状，G1 的源码切片断言（`functionSection`）
  可能需要同步，条文主体不动。
- **G2 已落**（`2c57bcc`）：§40 已粘贴至 §39 之后并留 `[ ]`，§39 已勾 `[x]`
  （R16 已合 main）；`round17/R17_TEST_NOTES.md` 场景 1–6 与本稿
  40-a…40-e 及回归段对得上。
- **排版备注（不强求）**：已落的 §40 各行行尾没有 markdown 硬换行的两个空格，
  §37–39 每行行尾有——渲染时 §40 四行会折成一段而非分行。若 G2 后续有回改
  机会可顺手补齐行尾双空格；本稿条文按「与已落文本逐字一致」原则同样未加。
- **勾选时机**：40-f 两条命令全绿、按本稿 40-a…40-e 手工走查通过后，
  人工把 §40 勾成 `[x]`。

---

model slug: `claude-fable-5-thinking-xhigh`
