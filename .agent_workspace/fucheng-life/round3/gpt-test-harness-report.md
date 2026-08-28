Model slug: gpt-5.6-sol

# 《浮城人生》Round 3 自动化测试链报告

## 交付

- `scripts/run-fucheng-life-tests.sh`
  - 顺序执行全部测试并汇总结果。
  - 任一测试失败即最终返回非零；仅在全部通过时返回 0。
  - 无第三方依赖，只要求 Node.js。
- `games/fucheng-life/tests/js-syntax.test.js`
  - 递归发现游戏目录内的 JavaScript，并逐个执行 `node --check`。
- `games/fucheng-life/tests/story-schema.test.js`
  - 校验 `story.json` 的核心字段、类型、唯一 ID 和跨表层级引用。
  - 固定断言 7 个年代、10 种出身、5 个城市层级、10 个事件。
- `games/fucheng-life/tests/html-links.test.js`
  - 递归扫描 HTML 的本地 `href` / `src` 等资源引用。
  - 校验目标文件、目录入口和 HTML fragment 均存在，并阻止路径逃出仓库。
- `games/fucheng-life/tests/exports-smoke.test.js`
  - 在 Node VM 的最小浏览器环境中加载真实 `fc-motion.js` 与 `fc-events.js`。
  - 校验 `FCMotion`、`FC.motion`、`FC.overlay`、`FC.events` 公共 API，并冒烟执行格式化、count-up、stagger、事件归一化、事件装载和抽取。
- `.github/workflows/fucheng-life-tests.yml`
  - Node.js 22 上运行同一测试入口。
  - push / pull request 修改 `games/fucheng-life/**`、测试入口或工作流自身时触发。

## 本地验收

执行：

```bash
./scripts/run-fucheng-life-tests.sh
```

结果：

```text
JavaScript syntax: 11 file(s) passed node --check.
Story schema: 7 eras, 10 origins, 5 layers, and 10 events passed.
HTML link integrity: 88 local link(s) resolved.
Browser exports smoke test: FCMotion, FC.overlay, and FC.events passed.
浮城人生 test summary: 4 passed, 0 failed
```

结论：自动化测试链本地全绿，退出码为 0。

## 提交

测试链实现提交：`970cec0`（`test: add fucheng life automated test gate`）。
