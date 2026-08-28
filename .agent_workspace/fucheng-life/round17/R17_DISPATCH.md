# R17 DISPATCH · 合约系 O1 补弹 + boot 连弹收敛

- Branch: `cursor/fucheng-r17-pending-contract-fa72`
- Base: `main` @ R16 merged (`1485ef0`)
- SOP: fable×3 + opus-fast×5 + gpt-sol×2
- 依据：`round16/fable-r16-playfeel.md` R1（合约门禁 O1 被误排除）+ boot 连弹过长

## 本轮目标

1. **收窄 tracksPending**：只排除合约**结算**卡（显式 `{ pending: false }` / `resolutionEvent` 产物），**不要**因 `ev.contract` 字段排除合约门禁 O1；这类 O1 刷新后应能 `pendingModal` 补弹。
2. **boot 连弹收敛**：若本局启动已发生合约结算补弹或 pendingModal 补弹，则**跳过/推迟**自动弹出的选轨/签约/教学（保留手动按钮可开教学）；避免进门 4–6 连弹。具体：`init` 链在 replay 命中后，当次跳过 `maybeOfferCareerTrack` / `maybeOfferContract` / `guide.start`（闯城目标若缺失仍应问，否则软锁——`needsChallengeGoal` 时仍要约）。
3. **危机池扩 2–3 条**（写实二选一），避免旧池过密；保持 recentCrisis / 概率闸。
4. 测试 + ACCEPTANCE §40；§39 勾 [x]。

## 十路表

| ID | 模型 | slug | 可写路径 | 任务 |
|----|------|------|----------|------|
| R17-F1 | fable | `claude-fable-5-thinking-xhigh` | `round17/fable-r17-sota-gates.md` | SOTA 门禁 |
| R17-F2 | fable | `claude-fable-5-thinking-xhigh` | `round17/fable-r17-playfeel.md` | 体验风险 |
| R17-F3 | fable | `claude-fable-5-thinking-xhigh` | `round17/fable-r17-acceptance-draft.md` | §40 草稿 |
| R17-O1 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/dashboard-app.js` | tracksPending 收窄；init boot 收敛 |
| R17-O2 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-sim.js` | MONTH_CRISES 扩 2–3 条 |
| R17-O3 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-guide.js` | 教学一句：合约相关城市事件也会补弹；boot 若跳过教学不升版也行，升版则兼容旧键 |
| R17-O4 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `data/story.json` 抽样核对 1–2 条带 contract 的 O1 字段可被 pending（只读报告写入 round17 也可；若改 JSON 须极小且合法） | 确认门禁 O1 载荷带 id/choices；必要时补 presentation:modal |
| R17-O5 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `css/fc-gameplay.css` 或 `css/fc-events.css` | 若 boot 收敛后无需 CSS 可加极小「有未确认事件」提示样式占位；无则写 round17/o5-skip.md 说明跳过 |
| R17-G1 | gpt-sol | `gpt-5.6-sol-xhigh` | `tests/r17-pending-contract.test.js` + runner | tracksPending / boot / 危机池断言 |
| R17-G2 | gpt-sol | `gpt-5.6-sol-xhigh` | `ACCEPTANCE.md` §39✓ §40 + notes | 验收 |

## 合入顺序

O2 → O1 → O3 → O4/O5 → G1/G2。收口三段必交。
