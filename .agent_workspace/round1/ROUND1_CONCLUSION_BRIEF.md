# Round 1 结论简报

> Parent Orchestrator 汇总 | 2026-08-26 | 6/6 子代理完成

> **平台常量脚注（2026-08-26）：** 本简报中的包体与支付表述属于当时快照。
> 当前小游戏口径、API 名称、适用范围与验证标签以
> [`platform-constants.json`](../platform-constants.json) 为准；如有差异，
> 后者取代本简报中的旧表述。

## 已实现功能

- **调研体系**：双榜 Top 10（畅销 IAP / 畅玩 IAA）、多源交叉验证（ADX/引力引擎/36氪/官方数据）
- **可行性矩阵**：14 品类 × 7 平台阻塞项（`feasibility-checklist.json`）
- **SOTA 审计**：引擎选型、包体限制、iOS 虚拟支付、复刻评分 1–10
- **法律/reg 框架**：玩法可借鉴、美术需原创；IAA 免版号 vs IAP 需版号+国内主体
- **可玩原型 × 3**：
  - `prototypes/jump-jump/` — 蓄力跳跃
  - `prototypes/sheep-match3/` — 层叠三消 + 可解性生成器 + 单测
  - `prototypes/tile-trio/` — 羊了个羊类完整循环 + 无头验证

## 核心共识（跨 6 代理）

1. **「Top 10」必须分榜**：畅销榜（SLG/RPG/模拟）与畅玩榜（IAA 休闲 puzzle）几乎无重叠；小团队应盯畅玩榜而非畅销榜。
2. **机制可复刻 ≠ 产品可复刻**：休闲 puzzle 核心几百行 JS 即可验证；价值在分享复活、激励视频、好友排行与聊天内分发。
3. **复刻优先级**：羊了个羊类 > 抓大鹅/挪了下车 > 跳一跳；SLG 营收头部仅作商业案例。
4. **技术栈**：Cocos Creator 3.x + TS（微信首选）；Web MVP 用 Phaser/原生 Canvas；SLG 需 PostgreSQL + Redis + 权威服。
5. **版号**：IAA 休闲可走广告变现免版号路径；IAP 需版号，是海外/小团队最大门槛。

## 遗留缺陷

- 复刻评分仍混用「机制」与「产品」两轴，需 Round 2 拆分
- `prototypes/README.md` 未收录 tile-trio
- 抓大鹅 3D 物理、挪了下车停车 puzzle 尚无原型
- 无微信真机/SDK 集成验证（Linux 环境限制）

## 性能/规模瓶颈

- 微信 4MB 首包 / 30MB 分包上限
- SLG 类：后端规模、反作弊、赛季运营 — 非代码瓶颈
- 开放数据域好友排行无法站外等价替换

## Round 2 攻坚重点

1. **双轴评分**：机制复刻分 vs 产品复刻分
2. **补齐原型**：挪了下车（9 分）或 抓大鹅 3D 物理基准
3. **WX 适配层**：统一 mock `wx.*` API shim，标注各原型缺口
4. **测试链**：扩展 headless 验证至全部原型
5. **文档对齐**：合并 9 份 round1 报告为单一 README 索引

## 子代理产出索引

| 代理 | 产出 |
|------|------|
| [fable 全局规划](bc-027d9a13-1d3a-51c7-b8dd-7b144a48d407) | `fable-global-planning.md` |
| [fable SOTA 审计](bc-05e9b606-f2f7-5c45-a5f5-fc34f07f3d99) | `fable-sota-audit.md` |
| [opus-fast 机制分析](bc-ad6b1de4-f45e-5af5-afce-60158020f712) | `opus-mechanics-analysis.md`, `sheep-match3/` |
| [opus-fast 原型实现](bc-0d9294d4-9a47-5d9b-8bdd-53b0a9bf32e8) | `opus-prototype-report.md`, `tile-trio/` |
| [gpt-sol 排名探针](bc-ae3783dd-d36f-50a3-b44d-5531dbe90dde) | `rankings.json`, `gpt-ranking-probe-report.md` |
| [gpt-sol 可行性探针](bc-74dda6f7-d26a-51ec-9f77-b27faf9c529b) | `feasibility-checklist.json`, `gpt-feasibility-probe.md` |
