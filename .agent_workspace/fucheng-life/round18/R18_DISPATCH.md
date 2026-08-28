# R18 派工 · 过期合约门禁 + 选轨手动入口 + 教学 KEY 政策

基线：`main` @ `4216a03`（已合 R17 #19）

## 目标
1. **过期合约门禁卡**：`replayPendingModal` 对 `ev.contract` 重验 `meetsContract(contractCtx)`；不合格则销账 + 系统日志，不开卡（避免承诺加分静默不入账）。同步改教学文案（**不 bump KEY**）。
2. **选轨手动入口**：`needsPick` 时仪表盘露出「选择职业轨道」按钮（复用 `fc-btn--ghost` / career picker），补弹推迟后玩家可主动选轨。
3. **教学 KEY 政策**：写入 `ORCHESTRATION-MODEL-SOP.md`——增量文案默认不 bump KEY；仅结构性改版才 bump。R18 改文案不升 v8。

## 十路

| 别名 | model | 可写路径 |
|------|-------|----------|
| F1 | claude-fable-5-thinking-xhigh | `.agent_workspace/.../round18/fable-r18-sota-gates.md` |
| F2 | claude-fable-5-thinking-xhigh | `.agent_workspace/.../round18/fable-r18-playfeel.md` |
| F3 | claude-fable-5-thinking-xhigh | `.agent_workspace/.../round18/fable-r18-acceptance-draft.md` |
| O1 | claude-opus-5-thinking-high-fast | `dashboard-app.js`：`replayPendingModal` 过期重验 + syslog |
| O2 | claude-opus-5-thinking-high-fast | `dashboard.html` + `dashboard-app.js` 选轨按钮接线（避开 O1 的 replay 区） |
| O3 | claude-opus-5-thinking-high-fast | `fc-guide.js` 文案修正（不 bump KEY） |
| O4 | claude-opus-5-thinking-high-fast | `ORCHESTRATION-MODEL-SOP.md` 教学 KEY 政策段落 |
| O5 | claude-opus-5-thinking-high-fast | CSS：选轨按钮窄屏可见（`fc-gameplay.css` / 必要时 `fc-contract.css` 不碰）或 skip 笔记 |
| G1 | gpt-5.6-sol-xhigh | `tests/r18-*.test.js` + runner |
| G2 | gpt-5.6-sol-xhigh | `ACCEPTANCE.md` §41 + TEST_NOTES |

## 分支
`cursor/fucheng-r18-stale-contract-fa72`

## Agent IDs
- F1: bc-3428cb3f-819c-5945-83ef-0c9354f092bb
- F2: bc-d7ec8404-d980-5c24-aece-b954e109e1a3
- F3: bc-dfb75e55-f63f-5f32-8d1c-4ec3fb8b3b62
- O1: bc-74a7fe73-8388-527f-91cf-3e9bc7ffce17
- O2: bc-17d98ba6-7a62-565c-b00b-b981483ff456
- O3: bc-a1d9a42f-698f-568c-acf1-bd3aceec8067
- O4: bc-5dcb704c-18d3-526c-93a3-05c3c8de079e
- O5: bc-31e5a15b-a032-5eff-bd7f-eea8f150eee7
- G1: bc-0379ce1f-9e82-50fc-a836-853b7c94ae30
- G2: bc-77f7330d-4311-58d5-a4e8-b6dfd7723bb5
