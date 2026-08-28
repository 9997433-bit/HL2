# Round 1 结论简报 — O1 事件 × 出身 Mini-Saga

**分支**：`agent/fucheng-o1-origin-sagas` @ `5adc222`  
**日期**：2026-08-28  
**测试**：`./scripts/run-fucheng-life-tests.sh` → 9/9 全绿

---

## 1. 双目标达成情况

| 目标 | 状态 | 证据 |
|------|------|------|
| O1 弹窗 ≥50 手写事件，choices 迁入 story.json SSOT | ✅ | `story.json` `events[]` = 56；`fc-events.js` 无 SCRIPT 表 |
| 10 出身各 1 条 3–4 步 Mini-Saga，入城后触发 | ✅ | `pack.originSagas` = 10；sim 24 月内 10/10 触发 |

**R1 AUTO 放行线（fable-sota-gates §4 项 1–15）**：全部通过。  
**MANUAL 项 16–18（ACCEPTANCE §21–25）**：留待 Round 2。

---

## 2. 子代理分工与结论

### fable SOTA 审计
- 产出门禁文档与 18 条可执行验收项；裁定出身 id 以 story.json 为准、ORIGIN_BIAS 悬空 id 为既有债务。
- 为 R2/R3 提供反模式清单（AP-1–AP-12）与放行线定义。

### opus — O1 事件库
- 56 条 modal 事件覆盖 L1–L5；EV01–EV10 保号；风险类 9 条显式 `type: "redline"`。
- `sampleEvents` → `events`；choices 结构 `{ id, label, cost, d, result }`；delta 仅 money/health/social/rep，money ∈ [−5, +5]。
- 删除 `fc-events.js` SCRIPT 分支表；SEED 离线镜像含 choices，与 story.json 逐字对齐。

### opus — 出身 Saga
- `scripts/curated/origin-sagas.js` 10 链，与 story.json origins 双射。
- `pack.originSagas` 与随机 saga 分池；`tryStartOriginSaga` 3–18 月窗口、第 18 月保底、单局一次。

### gpt-sol — 测试门禁
- `o1-events.test.js`：schema、分层分布、红线计数、choice 完整性（由红灯转绿）。
- `origin-sagas.test.js` + `origin-saga-sim.test.js`：10/10 映射、步数、触发窗口、种子重放。
- `exports-smoke.test.js` 扩展：无 SCRIPT 索引、SEED 对齐 story.json。

### fable 架构
- `round1/fable-o1-architecture.md`（@ `ea6b1c0` 校订版）：O1 SSOT 数据流、load/pick/show 契约、SEED 镜像策略；与落地 56 条实现逐字段对齐，标注三处口径差异与 R2 真实缺口。
- `data/events-schema.json`：JSON Schema draft-07，对落地 56 条零违例。

---

## 3. 关键数字

| 指标 | 值 |
|------|-----|
| O1 modal 事件 | 56 |
| 出身 Mini-Saga | 10 链 / 40 步 |
| Ambient（既有） | 301 |
| 测试项 | 9 passed |
| 180 月 sim | 112 unique ambient，无早退 |

---

## 4. 已知债务（R2 靶向）

1. **O1 时代维度缺口**（[fable O1 架构](bc-be113d08-856a-5e07-909b-586d478f7865) §7）：21 条时代专属 + 4–6 条 `once` 里程碑；`pick()` 需 `era/months/done` 过滤与时代加权；dashboard 传参 + `recentModal` 3→8。
2. **ORIGIN_BIAS 悬空 id**：`build-gameplay-data.js` 仍引用不存在 id — 不影响 originSagas，应清理或补测试。
3. **文案抽检**：G-E9 AUTO 已绿，人工 §25 抽检未做。
4. **浏览器 MANUAL**：§21–25 全部待 R2。
5. **ambient 历史 artifact**：`E4_09`/`E3_15` 中英混杂 — R2 可顺带修。
6. **测试剩余断言**：d 幅度域、redline⇒risk、eras 校验、n-gram 防复读、pick/once 冒烟（见 `fable-o1-architecture.md` §6）。

---

## 5. Round 2 建议派单

| 代理类型 | 任务 |
|----------|------|
| **opus** | 按 `fable-o1-architecture.md` §7：时代专属 21 条 + once 里程碑；`fc-events.js` pick 过滤；`dashboard-app.js` 传参/落账 |
| **gpt-sol** | §6 剩余测试断言（pick/once 冒烟、n-gram、d 幅度域）；G-S6 单链 money 净值域 |
| **fable** | MANUAL §21–25 浏览器走查并登记；ambient artifact 清理 |
| **opus-fast** | 文案润色抽检 10 条 O1 + 2 条出身链；ORIGIN_BIAS 悬空 id 清理 |
| **gpt-sol** | life-sim fixture 改用真实 origin id |
| **fable** | 平衡实抽：pick 权重与同层占比验证 |

---

## 6. 签核

- **R1 技术目标**：达成，可进入 R2。
- **合 main**：建议 R2 MANUAL 全勾 + R3 终审后再开 PR。
