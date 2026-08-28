# R16 · ACCEPTANCE §39 条文草稿（F3）

> 交付物：可直接粘贴进 `games/fucheng-life/ACCEPTANCE.md` 的第 39 条整段条文。
> 落地由 R16-G2 执行；本文件只是草稿，**不改 ACCEPTANCE.md 本体**。
> 风格对齐现有 §32–38：条目一行标题 + 若干行可勾验的行为描述 + 测试命令全绿收尾。
> 写稿时 G2 已把 §39 落进 ACCEPTANCE.md（`de1b8f2`）并把 §38 勾成 `[x]`；
> 下方条文与已落文本**逐字一致**，G2 无需回改，仅在 O1 落地后实现有出入时同步括注。

---

## 一、粘贴进 ACCEPTANCE.md 的整段条文

```markdown
39. [ ] **R16 · 危机/O1 刷新补弹 + 快进内置确认**  
    月结抽出的危机、O1 与人情讨债强弹窗会先写入 `pendingModal`；确认后清除，关闭或刷新时保留并在重进后补弹。  
    补弹成功时占用当月强弹窗额度，不与新危机/O1 叠层；确认结果只入账一次。  
    桌面与手机端「快进三月」共用游戏内确认面板，不调用浏览器 `window.confirm`，并完整展示三条快进护栏。  
    `node games/fucheng-life/tests/r16-crisis-replay.test.js` 与 `./scripts/run-fucheng-life-tests.sh` 全绿。
```

---

## 二、逐条人工检查步骤（供 G2 / 验收人参考，不必粘贴）

从仓库根目录 `python3 -m http.server 8000`，Chrome 打开
<http://127.0.0.1:8000/games/fucheng-life/>，先清站点数据并开 Console；
移动端项目用 DevTools 设备模式，视口 `390px`。

### 39-a 危机刷新补弹与幂等

1. 新局推进月份直至弹出「本月危机」二选一；**不点选项**，直接刷新页面
   （或退回主入口再进仪表盘）。
2. 重进仪表盘：同一张危机卡补弹（同 id、同选项）。补弹前 Console 查
   `FC.read().run.pendingModal`，应为 `{ kind, event }` 形状且 `event.id`
   与该卡一致；此时现金、健康、日志均未入账。
3. 确认一个选项：后果、日志、关系变化只结算一次；
   `FC.Sim.hasPendingModal(FC.read().run)` 由 `true` 变 `false`。
4. 再刷新一次：不再补弹、不重复入账。

### 39-b 关闭 ≠ 放弃（O1 / 人情讨债）

1. 分别制造普通 O1 强弹窗与 NPC 人情讨债强弹窗（关系结余压到 ≤ −3），
   在确认前用关闭 / dismiss 入口退出。
2. 刷新或重进：待办仍补弹——dismiss 不销账，与合约结算「未落账就不销」同一语义；
   确认后奖励、惩罚及关系变化均不重复入账。

### 39-c 补弹次序与单月弹窗帽

1. 同时挂起「合约结算未领取」与 `pendingModal` 后重进仪表盘：先补合约结算卡
   （init 链 `replayContractResolution()` 在前），处理后危机/O1 待办仍在、可继续补弹。
2. 补弹成功的当月不再叠出新的危机/O1 强弹窗（补弹占用当月强弹窗额度，见 §37 单月一弹帽）；
   boot 补弹后立即推进下月的边界行为以 R16 自动化用例为准，勿以单次手测判定。

### 39-d 快进内置确认（桌面 + 抽屉同一路径）

1. 桌面操作区点「快进三月 ▸▸」（`tick6Btn`）：弹出**游戏内**确认面板，
   不出现浏览器原生 `window.confirm`；面板分行写明三条护栏：
   不会自动去探区（探区目标留着自己点）、现金紧时优先上班、遇到大事会停下。
2. `390px` 打开「更多」抽屉点「快进三月」（`data-drawer-tick6`）：同一面板、同一文案。
3. 「取消」、Escape、点遮罩均不推进月份（问句默认答案是「不」）；
   「确定」后沿用既有快进规则（§37/§38 护栏不回退）；面板关闭后焦点与滚动恢复，
   Console 无 error、无未处理 Promise rejection。
4. Console 快验：`FC.confirm({ title: "试一句", body: "两个按钮" })`
   返回 `Promise<boolean>`，确定 / 取消分别 resolve `true` / `false`。

### 39-e 老存档迁移

1. 载入不含 `pendingModal` 字段的 R15 存档：进门不报错，
   `FC.read().run.pendingModal === null`（`migrate` 补齐默认值）。
2. 合约结算补弹的优先级与幂等语义不变（§38-d 回归）。

### 39-f 自动化门禁

```bash
node games/fucheng-life/tests/r16-crisis-replay.test.js
./scripts/run-fucheng-life-tests.sh
```

两条命令退出码均为 `0`，全部 suite 通过，其中 R16 专项断言包含：
`pendingModal` 初始化 / 迁移 / 可序列化、`openEvent` 参与待办持久化、
`replayPendingModal` 走 `openEvent` 且在 `replayContractResolution()` 之后、
`startFastForward` 走 `FC.confirm` 且无 `window.confirm`、
dashboard 实际加载发布 `FC.confirm` 的模块。

---

## 三、与现码的对齐说明（写给 G2 / 合入责任人）

写稿时分支 `cursor/fucheng-r16-crisis-replay-fa72` 的落码状态：

- **O2 已落**（`fc-sim.js`）：`freshRun` / `migrate` 补 `pendingModal: null`；
  `setPendingModal(run, { kind, event })` 只收可序列化载荷且 `event.id` 必须在
  （存不下的卡一律不挂），`kind` 取 `"crisis" | "o1" | "npc"`；
  `clearPendingModal` / `hasPendingModal` 配套。
- **O3 已落**（`fc-events.js`）：`FC.confirm(opts) → Promise<boolean>`，复用
  `.fc-event` 壳（`fc-event--confirm`），overlay kind `"confirm"`、z-index 压顶，
  ESC / 遮罩一律取消，默认焦点在「确定」。未新建 `fc-confirm.js`，
  `dashboard.html` 无需加 script 标签。
- **O4 已落**（`6357535`）：confirm 面板样式。
- **O5 已落**（`145056e`，`fc-guide.js`）：教学键升 `fucheng.guide.v6`，
  推进/合约两步文案写明「确认前刷新会再弹同一张，不是漏掉也不是白捡」。
- **O1 未落**：`dashboard-app.js` 的 `startFastForward` 仍是 `window.confirm`，
  `openEvent` 未接 `pendingModal` 写入/清除，`replayPendingModal` 未建。
  因此 `node …/r16-crisis-replay.test.js` 目前红在
  `openEvent must participate in pendingModal persistence`——中场预期红，
  O1 按 G1 断言接线后应全绿。接线要点：`monthModal` 抽出的危机/O1/人情讨债
  经 `openEvent` 落 `pendingModal` 并 `FC.write`；确认（非 dismiss）后清除再写；
  init 链插在 `replayContractResolution()` 之后、`maybeOfferCareerTrack()` 之前。
- **G1 已落**（`tests/r16-crisis-replay.test.js`）：断言范围见 39-f 括注；
  若 O1 落地后函数名或断言范围有变，仅需同步「39-f」括注，条文主体不动。
- **G2 已落**（`de1b8f2`）：§39 已粘贴至 §38 之后并留 `[ ]`，§38 已勾 `[x]`
  （R15 已合 main）；`round16/R16_TEST_NOTES.md` 场景与本稿 39-a…39-f 对得上。
- 勾选时机：O1 合入且 39-f 两条命令全绿、按本稿手工走查通过后，
  人工把 §39 勾成 `[x]`。

---

model slug: `claude-fable-5-thinking-xhigh`
