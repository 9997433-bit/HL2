# R15 · ACCEPTANCE §38 条文草稿（F3）

> 交付物：可直接粘贴进 `games/fucheng-life/ACCEPTANCE.md` 的第 38 条整段条文。
> 落地由 R15-G2 执行；本文件只是草稿，**不改 ACCEPTANCE.md 本体**。
> 风格对齐现有 §32–37：条目一行标题 + 若干行可勾验的行为描述 + 测试脚本全绿收尾。
> 另：R14 已合 main（`413a600`），G2 落地时同步把 §37 勾成 `[x]`。

---

## 一、粘贴进 ACCEPTANCE.md 的整段条文

```markdown
38. [ ] **R15 · 快进护栏 + 结算补弹 + 危机概率闸**  
    快进自动花 AP 时跳过「探区」，已设的探区目标原样保留；按钮与确认弹窗写明「不会替你探区」。  
    现金不够当月支出时自动行动优先「工作」，不拿行动点去进修 / 休息烧成负债
    （健康见底等高优建议仍压过这条护栏）。  
    快进被打断时日志写明「快进走了 k/3 月」；走满第 3 月不再说「剩下的月份没走」。  
    合约结算的奖惩挂在结算卡选项上；刷新 / 重进时若已 won/failed 但结算未领取，
    进仪表盘先补弹该结算卡，确认后落账并销账，再次进入不重复弹、不重复入账。  
    「本月危机」冷却满足后按概率触发（拖得越久概率越高），不再每 3 月准点必出；
    仍守近窗去重与单月一弹。  
    `./scripts/run-fucheng-life-tests.sh` 全绿。
```

---

## 二、逐条人工检查步骤（供 G2 / 验收人参考，不必粘贴）

从仓库根目录 `python3 -m http.server 8000`，Chrome 打开
<http://127.0.0.1:8000/games/fucheng-life/>，先清站点数据并开 Console。

### 38-a 快进不替你探区

1. 仪表盘「快进三月 ▸▸」按钮悬停可见提示「自动花 AP，但不会替你探区」
   （≤640px 在「更多」抽屉内，抽屉底部另有一行同义说明）。
2. 点击后确认弹窗分行写明：不会自动去探区、现金紧时优先上班、遇到大事会停下。
3. 先设一个探区目标再快进：自动花 AP 不点「探区」，快进结束后探区目标 chip 仍在、
   `run.zoneQueue` 未被清除或改写；不设探区目标重复一次，同样不擅自探区。
4. Console 快验：`FC.Sim.suggestMonth(run, era, origin, { skipExplore: true })`
   在 `run.zoneQueue` 已设时不返回 `actionId === "explore"`。

### 38-b 低现金行动护栏

1. 把现金压到低于当月账单合计并保留可用 AP，触发快进：自动行动优先「工作」，
   不先执行会继续烧钱的「进修 / 休息」；行动、现金、日志只结算一次。
2. 健康见底（低位）时护栏让位：自动行动仍先「休息」，不硬顶着上班。
3. Console 快验：`FC.Sim.suggestMonth(run, era, origin, { preferWorkIfPoor: true })`
   在现金撑不过一个月流水时返回 `actionId === "work"`、`urgency === "high"`。

### 38-c 快进打断进度文案

1. 分别在第 1、2、3 个月制造强弹窗（合约结算 / 危机 / O1）或终局：
   - 第 1、2 月被打断：日志出现「快进走了 k/3 月，被一件事打断，剩下的月份没走。」；
   - 第 3 月走满：日志「快进走了 3/3 月，被一件事打断。」——**不再**出现「剩下的月份没走」。
2. AP 花不完（如只剩探区可点）时中止文案写明已走月数与剩余 AP，
   并提示「快进不会替你去探区，探区请自己点」。

### 38-d 合约结算补弹与幂等

1. 把合约推进到 `won` 或 `failed`，在结算卡弹出后**不确认**直接刷新页面：
   重进仪表盘时补弹同一张结算卡（排在选轨 / 选目标 / 签约之前），
   确认唯一选项后奖惩落账。
2. 再刷新一次：不再补弹，现金、属性、日志均不重复入账
   （`resolutionPending` 已销账）。
3. 老存档（合约无 `resolutionPending` 字段）载入不报错，字段被迁移补齐。
4. Console 快验：`FC.Sim.needsContractResolution(run)` 在结算未领取时为 `true`，
   `FC.Sim.markContractResolutionDone(run)` 销账后再查为 `false`。

### 38-e 危机概率闸

1. 满足危机冷却的状态下连续推进多组月份：危机不在每个冷却到期月准点必出
   （确定性边界以 R15 自动化用例为准，勿以单次手测判定）。
2. 命中危机的月份仍遵守：近窗不复读同一危机 id（`recentCrisis` 尾窗 4）、
   当月不再叠其他强弹窗（单月一弹帽，见 §37）。

### 38-f 自动化门禁

```bash
./scripts/run-fucheng-life-tests.sh
```

退出码 `0`，全部 suite 通过，其中应包含 R15 断言
（`games/fucheng-life/tests/r15-ff-guards.test.js`：skipExplore / preferWorkIfPoor 接线、
打断文案、结算补弹幂等、危机概率闸）。

---

## 三、与现码的对齐说明（写给 G2）

- 条文行为对应本轮实现：`dashboard-app.js` 的 `pickAutoAction` / `autoSpendAp`
  （`AUTO_SKIP.explore`、`cashTight` 护栏、`zoneQueue` 保留）、`fastForwardMonths`
  （「快进走了 k/n 月」文案）、`replayContractResolution`（boot 补弹，排在
  `maybeOfferCareerTrack` 之前）；`fc-sim.js` 的
  `suggestMonth(run, era, origin, { skipExplore, preferWorkIfPoor })`、
  `needsContractResolution` / `markContractResolutionDone`（`resolutionPending`
  由 `migrateContract` 迁移补齐）、`pickMonthCrisis` 概率闸
  （现值：冷却满足约 45% 触发，拖到 5 月以上升至约 75%——条文里只写「按概率、
  拖得越久概率越高」，数值调参不必回改条文）；`screens/dashboard.html` 的
  快进按钮 title 与抽屉说明（已合入 `e79f404`）。
- O3 的 `fc-contract.js` 补弹配合（结算卡标记已领取）落地时若函数名与
  `markResolutionDone` 有出入，仅需同步「38-d」括注，条文主体不动。
- 若 G1 测试文件断言范围有变，仅需同步「38-f」括注。
- 勾选时机：待 O1–O5 全部合入且脚本全绿后，由 G2 将本条粘贴至 §37 之后并留 `[ ]`
  待人工验收勾选；同时把 §37 勾成 `[x]`（R14 已合 main）。

---

model slug: `claude-fable-5-thinking-xhigh`
