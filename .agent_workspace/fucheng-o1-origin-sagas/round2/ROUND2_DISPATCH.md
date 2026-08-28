# Round 2 派单 — O1 时代维度 + 验收 + 打磨

**分支**：`agent/fucheng-o1-origin-sagas`（所有子代理在此分支 commit + push，rebase 优先）  
**基线**：R1 complete，`./scripts/run-fucheng-life-tests.sh` 9/9 全绿  
**输入文档**：
- `.agent_workspace/fucheng-o1-origin-sagas/round1/ROUND1_CONCLUSION_BRIEF.md`
- `.agent_workspace/fucheng-o1-origin-sagas/round1/fable-o1-architecture.md`（§3/§5/§6/§7）
- `.agent_workspace/fucheng-o1-origin-sagas/round1/fable-sota-gates.md`
- `games/fucheng-life/ACCEPTANCE.md` §21–25

## Round 2 目标

1. **引擎**：O1 `pick()` 支持 `era/months/done` 过滤 + 时代 ×2 加权；`once` 落账；`recentModal` 3→8
2. **内容**：补 21 条时代专属（E1–E7 各 3）+ 4–6 条 `once` 里程碑（EV57+）
3. **测试**：§6 剩余 AUTO 断言全绿
4. **验收**：ACCEPTANCE §21–25 浏览器走查登记
5. **打磨**：文案抽检润色、ambient artifact 清理、平衡实抽报告

## 六子代理分工

| # | 模型 | 任务 | 主要文件 |
|---|------|------|----------|
| R2-A | opus | §7 全栈：story.json 时代事件 + fc-events pick 过滤 + dashboard 传参/落账 | story.json, fc-events.js, dashboard-app.js |
| R2-B | gpt-sol | §6 剩余测试：pick/once 冒烟、n-gram、d 幅度域、redline⇒risk、G-S6 money 净值 | tests/o1-events.test.js, origin-sagas.test.js, exports-smoke |
| R2-C | fable | 浏览器 MANUAL §21–25 走查，结果写入 `round2/MANUAL_ACCEPTANCE.md` | ACCEPTANCE.md, 浏览器 |
| R2-D | opus-fast | 文案润色 10 条 O1 + 2 条出身链；修 ambient E4_09/E3_15 中英混杂 | story.json, origin-sagas.js, curated/ambient |
| R2-E | gpt-sol | life-sim.test.js fixture 改用真实 origin id；负向回归探针 | tests/life-sim.test.js |
| R2-F | fable | pick 权重实抽报告（L1–L5 各 20000 次）+ era 过滤生效验证 | round2/pick-balance-report.md |

## 红线（全员遵守）

- 不改 `MODAL_ODDS` / redline 3 秒冷却 / `weightOf` 层距曲线
- 不动 overlay DOM/交互契约
- `saga_` 前缀不入 O1 deck
- ambient 池除 artifact 修复外零结构性改动
- ES5、零构建、`games/fucheng-life/` 路径
- commit + push 前跑 `./scripts/run-fucheng-life-tests.sh` 全绿

## 放行线（R2 结束）

- AUTO：测试套件全绿（含新增断言）
- MANUAL：ACCEPTANCE §21–25 全勾或登记已知缺陷
- 事件总数 ≥ 77（56 + 21 时代专属，once 另计）
- pick({era, months, done}) 过滤有测试覆盖

## 签核

- 主调度：Round 2 启动 @ 2026-08-28
- 子代理回执：各代理 commit message 含 `(R2-<letter>)` 标签
