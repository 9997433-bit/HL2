# 永久编排模型 SOP（ORCHESTRATION-MODEL-SOP）

> 状态：**永久生效**。主会话（Orchestrator）每轮派工必须遵守。  
> 适用范围：《浮城人生》及本仓库一切多代理轮次（Rn / Ox）。  
> 违反本 SOP 的子代理产出视为非正式，需按本表重派后再合入。

## 1. 固定配比（不可改）

后续**每轮**固定开 **10 路**子代理：

| 角色别名 | 数量 | Task `model` slug（准用） | 典型职责 |
|---------|------|---------------------------|----------|
| **fable** | ×3 | `claude-fable-5-thinking-xhigh` | SOTA 门禁、体验审计、验收/终局报告、规格 SSOT |
| **opus-fast** | ×5 | `claude-opus-5-thinking-high-fast` | 实现与改码（JS/CSS/HTML）、玩法接线、文案落地 |
| **gpt-sol** | ×2 | `gpt-5.6-sol-xhigh` | 测试门禁、脚本接线、ACCEPTANCE/README、回归探针 |

合计 **10**。禁止用默认 `fast` / `inherit` / `composer` 顶替上述三角色。

## 2. 派工规则

1. **一发十路**：同一轮在同一条编排消息里并行 `Task` 启动（可 `run_in_background: true`），不要串成「先 1 路再决定」。
2. **文件所有权**：派工单必须写清每路可写路径；有冲突的文件不得两路同时改——拆文件或拆函数区，或一路出补丁文档由 Orchestrator 合入。
3. **隔离实现**：多路同时改码时优先 `best-of-n-runner`（独立 worktree/分支），由 Orchestrator 合并回工作分支 `cursor/<name>-fa72`。
4. **产出落盘**：fable / 规划类必须写入 `.agent_workspace/**/roundN/`；代码进 `games/`；测试进 `games/**/tests/` + `scripts/run-*.sh`。
5. **模型字面量**：调用 Task 时 `model` 必须写上表 slug，禁止省略（省略会落到 inherit/fast）。

## 3. 角色边界

- **fable**：只审、只定门禁与体验结论；默认**不直接大改**玩法逻辑（除非派工单写明「fable 兼实现」）。
- **opus-fast**：默认实现 owner；改动须可测、可回滚，忌无关重构。
- **gpt-sol**：测试与文档门禁 owner；断言要对准本轮 API/文案，全绿脚本 `./scripts/run-fucheng-life-tests.sh`（或本项目等价入口）。

## 4. Orchestrator 自检清单

每轮结束前勾选：

- [ ] 本轮是否正好 10 路：fable3 + opus-fast5 + gpt-sol2  
- [ ] 每路 Task 的 `model` 是否为上表 slug（不是 `fast`）  
- [ ] 是否有 `R*_DISPATCH.md` 记录车道 × 模型 × 路径  
- [ ] 合入前测试是否全绿；PR 是否挂在 `cursor/*-fa72`  
- [ ] **收口三段**：对用户必须写清「改了什么 / 下一步还能做什么 / 游戏与 PR 链接」（合入前后注明 Pages 是否已更新）

## 5. 历史纠错

曾误用 Task 默认 / `fast` 做审计或实现 → **作废，按本 SOP 重派**。  
本文件是唯一模型编排 SSOT；轮次 BRIEF 不得另定配比覆盖本表。

## 6. 教学 KEY（`fc-guide`）政策

针对 `games/fucheng-life/js/fc-guide.js` 的 `fucheng.guide.vN`：

1. **文案 / 步骤增量默认不 bump**：改措辞、补一两句提醒、微调既有步骤内容，一律**保持现有 KEY**。
   新句子随玩家下次主动打开「新手教学」自然出现，不打扰回流玩家。
2. **bump 只留给结构性改版**：步骤数量增减、目标锚点（`selector` / 挂载元素）换位、
   交互流程大改——教学不重看就会指错地方时，才升 KEY。
3. **bump 必须兼容回填**：`dismiss` 要把新 KEY 连同全部旧键一起写掉、`reset` 一起清掉，
   不留半读状态；并在该轮 `R*_DISPATCH.md` 里**写明升版理由**（属于上条哪种结构性变化）。
4. **反面教材**：R15（v5）→ R16（v6）→ R17（v7）连续三轮为增量文案 bump，
   老玩家被反复强制重看整套教学。**禁止再让每轮 O 路自行决定升版**，默认走第 1 条。
