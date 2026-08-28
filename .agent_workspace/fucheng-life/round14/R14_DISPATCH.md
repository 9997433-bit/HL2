# R14 DISPATCH · 流程修复（快进 / 目标合约 / 弹窗帽）

- Branch: `cursor/fucheng-r14-flow-fixes-fa72`
- Base: `main` @ R13 merged (`ae97d99`)
- SOP: `/workspace/ORCHESTRATION-MODEL-SOP.md` → **fable×3 + opus-fast×5 + gpt-sol×2**
- 线上对照：https://9997433-bit.github.io/HL2/games/fucheng-life/

## 本轮目标（P0）

1. **快进三月可用**：自动花完 AP 再推进；遇强弹窗/花不完则停。
2. **闯城目标 ↔ 合约绑定**：picker 按 goal 推荐并置顶（hukou↔hukou、downpay↔home、rise↔promote；debtfree 无强制）。
3. **每月最多 1 个强弹窗**：合约结算 > 要约 > 危机/O1；命中后不再叠。
4. **危机去重**：`recentCrisis` 避免短窗重复同一危机 id。
5. 测试 + ACCEPTANCE §37。

## 十路表

| ID | 模型 | slug | 可写路径 | 任务 |
|----|------|------|----------|------|
| R14-F1 | fable | `claude-fable-5-thinking-xhigh` | `round14/fable-r14-sota-gates.md` | SOTA 门禁：快进/绑定/弹窗帽可验收标准 | `bc-ab6ad366-4ba6-5d31-b0a7-e98385c13235` |
| R14-F2 | fable | `claude-fable-5-thinking-xhigh` | `round14/fable-r14-playfeel.md` | 对照现码读 dashboard/contract/sim，写体验风险与回归点 | `bc-37fc5a6c-f431-55e1-808e-fc85a16dbf6c` |
| R14-F3 | fable | `claude-fable-5-thinking-xhigh` | `round14/fable-r14-acceptance-draft.md` | 起草 ACCEPTANCE §37 条文（勿直接改 ACCEPTANCE.md） | `bc-e672c9de-9c05-52e9-b88a-f76062a71cee` |
| R14-O1 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `games/fucheng-life/js/dashboard-app.js` | 落地/修缮 `autoSpendAp` + `fastForwardMonths` + finishMonth 每月 1 强弹窗 | `bc-296a3825-a1b0-5fc7-95fb-759285fb0159` |
| R14-O2 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `games/fucheng-life/js/fc-contract.js` | `recommendedContractId(goal)`、排序置顶、推荐角标 HTML、lede 提示 | `bc-b838cca3-8f2f-5e76-8bd5-b03db19f2eef` |
| R14-O3 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `games/fucheng-life/css/fc-contract.css` | 推荐卡视觉（非 purple 炫光；贴合现有 glass） | `bc-4e9af554-18b3-5131-8e80-654ddec3360a` |
| R14-O4 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `games/fucheng-life/js/fc-sim.js` | `contractForGoal`/`recentCrisis`；`pickMonthCrisis` 去重；可选导出 helper | `bc-8ea91fbc-44ef-5e92-bae0-151512711cfb` |
| R14-O5 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `games/fucheng-life/js/fc-guide.js` | 闯城局教学/提示一句：主目标与合约应对齐 | `bc-c9288d86-33c7-51e3-974a-e5caea28e636` |
| R14-G1 | gpt-sol | `gpt-5.6-sol-xhigh` | `tests/r14-flow-fixes.test.js` + `scripts/run-fucheng-life-tests.sh` | R14 断言：快进符号、弹窗帽、合约推荐、危机去重 | `bc-fa761217-ad4e-50ed-abca-b3485b6eb73f` |
| R14-G2 | gpt-sol | `gpt-5.6-sol-xhigh` | `ACCEPTANCE.md`（§37）+ `round14/R14_TEST_NOTES.md` | 验收条文落地 + 跑测笔记 | `bc-f8fda0cc-55c1-5906-b719-160c80ce6edb` |

## 合入顺序（Orchestrator）

1. 等十路完成 → 先合 O4（sim）→ O2（contract js）→ O3（css）→ O1（dashboard）→ O5（guide）  
2. 再合 G1/G2；对照 F1–F3 补洞  
3. `./scripts/run-fucheng-life-tests.sh` 全绿 → commit/push → PR
