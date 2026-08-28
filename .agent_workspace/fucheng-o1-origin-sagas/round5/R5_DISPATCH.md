# R5 派单 — UI 重塑 + 事件形态分化

**分支**：`cursor/fucheng-o1-origin-sagas-fa72`  
**基线**：R4 complete，12/12 tests，MASTER_PLAN.md §四  
**用户确认**：2026-08-28 ✅

## 目标
换玩家「看见和点击」的东西，解决三选一 modal 审美疲劳；**UI 优先**。

## 执行顺序
1. **R5-B** 引擎（presentation 四种壳）— 其他 UI 任务可并行但 E 依赖 B
2. **R5-A1 / R5-A2 / R5-C** 并行
3. **R5-D / R5-E** 收尾

## 子代理

| 代号 | 模型 | 任务 | 标签 |
|------|------|------|------|
| R5-B | opus | presentation 引擎 + 30 条迁移 | `(R5-B)` |
| R5-A1 | fable | 390px 仪表盘布局、HUD 折叠、sticky 行动栏、日志时间线 | `(R5-A1)` |
| R5-A2 | composer-2.5-fast | 关系 Tab NPC 卡片、合约 HUD 环形倒计时、pulsing 签约提示 | `(R5-A2)` |
| R5-C | composer-2.5-fast | 探区 chip、迷你层条、zone inline 卡片 | `(R5-C)` |
| R5-D | gpt-sol | zone 去重、originBias 补全、play-feel 30 月报告 | `(R5-D)` |
| R5-E | gpt-sol | presentation/zone-dedup/page-boot 测试 | `(R5-E)` |

## 红线
- ES5、零构建；不删 dashboard 现有 element id
- 不改 MODAL_ODDS / 终局门槛 / overlay DOM 契约
- `./scripts/run-fucheng-life-tests.sh` 全绿才能 push

## 放行
- 4 种 presentation 可触发
- 390px dashboard 无横向溢出
- 12+ 测试项全绿
- play-feel 报告：30 月 O1 ≤12 次
