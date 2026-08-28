# R15 DISPATCH · 快进护栏 + 结算补弹

- Branch: `cursor/fucheng-r15-ff-guards-fa72`
- Base: `main` @ R14 merged (`413a600`)
- SOP: `/workspace/ORCHESTRATION-MODEL-SOP.md` → fable×3 + opus-fast×5 + gpt-sol×2
- 依据：`round14/fable-r14-playfeel.md` 高优 R1/R2/R5/R9 + 危机过密

## 本轮目标

1. **快进不替你探区**：`autoSpendAp` / 快进路径跳过 `explore`，保留 `zoneQueue`
2. **快进现金护栏**：现金偏低时自动行动优先 `work`，避免 study/rest 烧成负债
3. **打断文案**：带上已走月数（「快进走了 k/n 月…」），最后一月不说「剩下的没走」
4. **合约结算补弹**：结算奖惩挂在选项上；刷新后若 `won/failed` 但奖励未入账，重进补弹
5. **危机概率闸**：冷却满足后仍以概率触发（避免每 3 月准点必出）
6. 测试 + ACCEPTANCE §38；勾选 §37（R14 已合 main）

## 十路表

| ID | 模型 | slug | 可写路径 | 任务 |
|----|------|------|----------|------|
| R15-F1 | fable | `claude-fable-5-thinking-xhigh` | `round15/fable-r15-sota-gates.md` | SOTA 门禁 |
| R15-F2 | fable | `claude-fable-5-thinking-xhigh` | `round15/fable-r15-playfeel.md` | 对照改后体验风险 |
| R15-F3 | fable | `claude-fable-5-thinking-xhigh` | `round15/fable-r15-acceptance-draft.md` | §38 条文草稿 |
| R15-O1 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/dashboard-app.js` | autoSpendAp 跳过 explore + 现金护栏接线；快进文案；boot 补弹结算 |
| R15-O2 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-sim.js` | `suggestMonth(run,era,origin,opts)`：`skipExplore`；现金低推 work；`pickMonthCrisis` 概率闸；结算 pending 字段 API |
| R15-O3 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-contract.js` | resolution 补弹：标记已领取 / `needsResolutionReplay` 协作 |
| R15-O4 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `screens/dashboard.html`（必要时极小文案）+ confirm 文案由 O1 改 JS；本路改 HTML 里快进按钮 title/aria | 快进按钮提示「不会自动探区」 |
| R15-O5 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-guide.js` | 快进相关一句教学（若合适）或合约结算「关掉前别刷新」 |
| R15-G1 | gpt-sol | `gpt-5.6-sol-xhigh` | `tests/r15-ff-guards.test.js` + `run-fucheng-life-tests.sh` | 断言护栏/概率/补弹 |
| R15-G2 | gpt-sol | `gpt-5.6-sol-xhigh` | `ACCEPTANCE.md` §37✓ §38 + `round15/R15_TEST_NOTES.md` | 验收落地 |

## 合入顺序

O2 → O3 → O1 → O4 → O5 → G1/G2；对照 F1–F3。
全绿后 commit/push → PR。
