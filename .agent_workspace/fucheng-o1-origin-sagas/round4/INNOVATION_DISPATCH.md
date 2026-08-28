# 玩法创新 Round（R4）— 子代理派单

**分支**：`cursor/fucheng-o1-origin-sagas-fa72`（commit + push，rebase 优先）  
**用户诉求**：弹窗三选一重复腻，玩不下去。不是加事件数量，是换玩法骨架。

## 三大交付（必须全部落地）

### R4-A · NPC 关系账本
- **5 个具名 NPC**：老周（同事）、陈姐（房东）、阿敏（同乡）、王总（饭局人脉）、小余（快递/邻里）
- 每人有 `balance`（−5..+5 人情账）、`flags[]`（如 `owe_dinner`, `helped_move`）
- **10 条联动 O1 事件**（EV83+）：choices 带 `npcEffects: { id, balance, flag }`，选「让对方结账」不是抽象 +social，而是 `陈姐.balance -= 2, flag: owe_dinner`
- 后续事件 `requires: { npc: "landlady", flag: "owe_dinner" }` 或 `balanceMax: -1` 才触发
- UI：关系 Tab 显示五人人名 + 人情条 + 最近一笔账；日志 tag 用 NPC 名
- 引擎：`fc-sim.js` applyNpcEffects；`fc-events.js` pick 过滤 requires；`openEvent` 落账

### R4-B · 中期人生合约（三选一）
- 入城后第 1–3 月弹一次 **合约选择**（非 O1 池）：落户 / 首付 / 升职，各带 deadline（36/48/24 月）与 progress 0–100
- 进度来源：行动（进修+edu→落户）、存钱（money 阈值→首付）、KPI/level（→升职）
- 仪表盘 HUD 常驻进度条 + 剩余月数；完成弹庆祝 + 属性奖励；失败弹代价
- 3–5 条合约专属事件写入 story.json，与合约 id 绑定

### R4-C · 降弹窗 + 抬 Saga
- `MODAL_ODDS` 从 `[0,0,0.45,0.65,1]` 降至约 `[0,0,0.28,0.42,0.72]`（可微调，目标：平均 2–3 月才弹一次 O1）
- `sagaMonthlyOdds` 从 0.045 提至 **0.09**；originSaga 不变
- Saga 进行中：仪表盘顶栏显示「链式事件 · 第 N 步」badge；Saga 步优先于 O1 弹窗（已有 tick 顺序，确认并加强 UI）
- 至少 **2 条新通用 Saga**（4 步，有 choices）写入 curated + rebuild pack

### R4-D · 测试（gpt-sol）
- `tests/npc-ledger.test.js`：NPC schema、10 事件 requires、applyNpcEffects
- `tests/contract.test.js`：三合约 progress 计算、deadline
- `tests/pacing.test.js`：MODAL_ODDS 蒙特卡洛平均间隔 ≥ 2 月；saga 触发率上升
- 全 suite 9+ 项绿

### R4-E · 体验报告（fable）
- 30 月 headless/浏览器走一局，写 `round4/play-feel-report.md`：O1 次数、Saga 次数、合约进度、NPC 联动是否可感知

## 红线
- ES5、零构建、不改 overlay DOM 契约
- 存档 migrate：version 2→3 补 npcs/contract 默认值
- 现有 82 条 O1 不删改 id；新事件 EV83+
- `./scripts/run-fucheng-life-tests.sh` 全绿才能 push

## 签核
- R4 完成 = 三系统可玩 + 测试绿 + play-feel 报告
