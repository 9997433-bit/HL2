Model slug: gpt-sol-r3-pages-readme

# Round 3 Pages / README 交付报告

## 结果

完成《浮城人生》Round 3 发布文档与仓库入口收口：

- `games/fucheng-life/README.md`
  - 补充 Round 3 收官候选版状态与发布门禁
  - 写明本地预览和 `./scripts/run-fucheng-life-tests.sh` 测试命令
  - 增加从仓库入口、年代、出身、仪表盘、账单/事件到城市地图及继续存档的完整演示流
  - 更新运行时约定、完整文件地图、视觉和性能说明
  - 明确 HTTP 是发布验收路径，避免将可能受浏览器策略阻止的 `file://` 误写成可靠路径
- `games/fucheng-life/ACCEPTANCE.md`
  - 按 `ROUND2_CONCLUSION_BRIEF.md` 落地 15 项逐条可勾选手工 QA 门禁
  - 为每项补充操作方式和通过标准，并附环境签核区
- 根 `index.html`
  - 验证卡片仍直达 `games/fucheng-life/`
  - 将说明更新为实际可演示内容：7 年代、10 出身、五层地图、月度账单与事件抉择

## 验证

- 文档中的数量、路由、存档键和公开 API 已对照 Round 3 上下文及现有实现。
- 自动化结果以 `./scripts/run-fucheng-life-tests.sh` 的本分支运行记录为准。
