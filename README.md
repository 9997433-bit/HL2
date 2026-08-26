# 微信小游戏 Top 10 复刻可行性研究

对 2025–2026 微信小游戏市场的多轮多代理研究：分开审计**畅销榜（IAP）**与
**畅玩榜（IAA）**两张 Top 10 榜单，用 **22 款游戏的机制/产品双轴评分**和
**4 个可运行、可自动化验证的浏览器原型**回答一个问题——**这些游戏能被复刻吗？**

## 最终结论（一句话版）

**机制可复刻，产品不可平移。** 畅玩榜头部的核心玩法用几百到一千多行原生
JavaScript 即可完整复刻并通过无头测试验证（本仓库已构造性证明）；但其商业
价值——激励视频广告、分享复活、好友排行、聊天内分发——是微信平台织物，
没有站外等价物。完整论证见
**[全局终审报告 `.agent_workspace/GLOBAL_FINAL_REPORT.md`](./.agent_workspace/GLOBAL_FINAL_REPORT.md)**。

| 关键结论 | 出处 |
|---------|------|
| 双榜几乎不重叠，必须分开审计，不可合并成单一总榜 | [`rankings.json`](./.agent_workspace/round1/rankings.json)（2026-07 快照，9 信源） |
| 22 款游戏 M（机制）/P（产品）双轴评分：M 用满上区间，P 全部落在 2–5 | [`dual-axis-scores.json`](./.agent_workspace/round2/dual-axis-scores.json) |
| 最佳独立落地目标：挪了下车家族（M10/P5）；机制矿：跳一跳（M10/P2）、羊了个羊（M10/P3） | [双轴评分报告](./.agent_workspace/round2/fable-dual-axis-scoring.md) |
| 玩法不受著作权保护（有直接判例），美术/名称/关卡必须原创；IAA 免版号是小团队唯一快速通道 | [全局规划报告 §6](./.agent_workspace/round1/fable-global-planning.md) |

## 快速开始

### 玩原型

零依赖、零构建。从仓库根目录起任意静态服务器：

```bash
python3 -m http.server 8080
```

| 原型 | 对标玩法 | 地址 |
|------|---------|------|
| [`prototypes/tile-trio/`](./prototypes/tile-trio/) | 羊了个羊 · 层叠三消（单文件，含广告门控道具与好友榜） | `http://localhost:8080/prototypes/tile-trio/` |
| [`prototypes/sheep-match3/`](./prototypes/sheep-match3/) | 羊了个羊 · 模块化实现（可解性生成器 + 求解器提示） | `http://localhost:8080/prototypes/sheep-match3/` |
| [`prototypes/parking-jam/`](./prototypes/parking-jam/) | 挪了下车 · 停车解谜（BFS 求解器即关卡管线，8 关） | `http://localhost:8080/prototypes/parking-jam/` |
| [`prototypes/jump-jump/`](./prototypes/jump-jump/) | 跳一跳 · 蓄力跳跃 | `http://localhost:8080/prototypes/jump-jump/` |

`tile-trio` 与 `jump-jump` 也可直接双击打开；`sheep-match3` 与 `parking-jam`
使用 ES 模块，需经 HTTP 访问。操作说明与调试入口见
[`prototypes/README.md`](./prototypes/README.md)。

### 一键验证全部证据

```bash
./scripts/run-all-prototype-tests.sh          # 5 个测试套件（需 Node 22+、npm、Chrome/Chromium）
node --test prototypes/shared/wx-shim.test.mjs # 平台 mock 自身的 19 项测试
python3 scripts/collect_rankings.py --check    # 校验榜单数据快照
```

聚合测试链覆盖：jump-jump 的 Chrome/CDP 冒烟、sheep-match3 的 17 项单测、
tile-trio 的种子化真实文件验证器、parking-jam 的 23 项单测 + 8 关全通关验证
器。同一命令由 CI（GitHub Actions）在每次 push/PR 时执行。

## 仓库结构

- [`.agent_workspace/GLOBAL_FINAL_REPORT.md`](./.agent_workspace/GLOBAL_FINAL_REPORT.md) — **全局终审报告**（双榜 Top 10、双轴评分、原型证明、开发者建议、法律摘要）
- [`.agent_workspace/README.md`](./.agent_workspace/README.md) — 全部研究报告与数据集的主索引（Round 1–3）
- [`prototypes/`](./prototypes/) — 4 个可玩原型 + 共享 `wx.*` mock（`shared/wx-shim.js`）+ 原生打包骨架（`wechat-packaging-skeleton/`）
- [`.agent_workspace/platform-constants.json`](./.agent_workspace/platform-constants.json) — 微信平台常量正典（2026-08-26 官方文档核对，逐条验证标签）
- [`scripts/`](./scripts/) — 聚合测试链、CDP 冒烟测试、榜单数据校验器；CI 门禁见 [`.github/workflows/prototype-tests.yml`](./.github/workflows/prototype-tests.yml)

## 范围与免责声明

这些是研究性机制探针，不是可发布的微信小游戏包。它们不验证登录、真实广告
填充、支付、开放数据域好友榜、聊天分享、审核资格或真机性能（Linux 环境无
官方开发者工具）。「复刻」在全仓库中的含义是**对玩法模式的原创实现**——
代码、命名、美术、关卡、文本、音频全部原创，不复用任何原作资产或授权 IP。
法律相关内容为研究性规划参考，不构成法律意见。
