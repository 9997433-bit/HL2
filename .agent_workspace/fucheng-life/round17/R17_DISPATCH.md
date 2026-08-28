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
| R17-F1 | fable | `claude-fable-5-thinking-xhigh` | `round17/fable-r17-sota-gates.md` | SOTA 门禁 | `bc-a4fa1090-f268-5bcf-86fb-1448585a0fe5` |
| R17-F2 | fable | `claude-fable-5-thinking-xhigh` | `round17/fable-r17-playfeel.md` | 体验风险 | `bc-aeab30e5-d624-5491-8dc7-4808b58150d9` |
| R17-F3 | fable | `claude-fable-5-thinking-xhigh` | `round17/fable-r17-acceptance-draft.md` | §40 草稿 | `bc-4a1ad9af-ab67-5439-876b-b15c4338e0cf` |
| R17-O1 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/dashboard-app.js` | tracksPending + boot 收敛 | `bc-d5d095cd-eaaf-5a70-99f2-8adb87c6134d` |
| R17-O2 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-sim.js` | MONTH_CRISES 扩池 | `bc-033806a2-4ce2-57c2-a58c-e65601c361f9` |
| R17-O3 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-guide.js` | 教学提示 | `bc-21f825d0-eac2-5261-ae48-5a74e5b85091` |
| R17-O4 | opus-fast | `claude-opus-5-thinking-high-fast` | story 审计/最小修补 | 合约 O1 载荷 | `bc-07879b87-c601-54f9-8fa1-06ec911a4905` |
| R17-O5 | opus-fast | `claude-opus-5-thinking-high-fast` | CSS 或 skip 说明 | 可选 | `bc-20daf19f-1285-5412-954a-08a1a721234d` |
| R17-G1 | gpt-sol | `gpt-5.6-sol-xhigh` | tests + runner | 断言 | `bc-8e9a7f76-eff7-546d-a554-cbaa0ba2c864` |
| R17-G2 | gpt-sol | `gpt-5.6-sol-xhigh` | ACCEPTANCE §40 | 验收 | `bc-750c0c0d-1e5b-53d6-836e-388353d8673c` |

## 合入顺序

O2 → O1 → O3 → O4/O5 → G1/G2。收口三段必交。
