# R16 DISPATCH · 危机/O1 刷新补弹 + 快进内确认

- Branch: `cursor/fucheng-r16-crisis-replay-fa72`
- Base: `main` @ R15 + wrap-up SOP (`efac5f1`)
- SOP: `ORCHESTRATION-MODEL-SOP.md` → fable×3 + opus-fast×5 + gpt-sol×2
- 依据：R15 playfeel「危机刷新吞卡」KNOWN + 快进 `window.confirm` 移动端风险

## 本轮目标

1. **pendingModal**：月结抽出危机/O1（及人情讨债强弹）后，在玩家确认落账前把可序列化事件载荷写入 `run.pendingModal` 并 `FC.write`；确认后清除；dismiss 仍保留以便重进补弹（与合约结算一致：未落账就不销）。
2. **boot 补弹**：`init` 在 `replayContractResolution` 之后（或同链）调用 `replayPendingModal`；占当月强弹窗额度的语义：补弹成功则本月不再叠新门（若当月 boot 后立即 tick 另议——本轮只保证进门补弹）。
3. **快进确认内置**：用现有 `FC.overlay`（或轻量自建 scrim）替换 `window.confirm`，文案保留 R15 三条护栏说明；桌面/手机抽屉同一路径。
4. 测试 + ACCEPTANCE §39；§38 勾 [x]。

## 十路表

| ID | 模型 | slug | 可写路径 | 任务 |
|----|------|------|----------|------|
| R16-F1 | fable | `claude-fable-5-thinking-xhigh` | `round16/fable-r16-sota-gates.md` | SOTA 门禁 |
| R16-F2 | fable | `claude-fable-5-thinking-xhigh` | `round16/fable-r16-playfeel.md` | 体验风险 |
| R16-F3 | fable | `claude-fable-5-thinking-xhigh` | `round16/fable-r16-acceptance-draft.md` | §39 草稿 |
| R16-O1 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/dashboard-app.js` | pendingModal 写入/清除、replayPendingModal、monthModal/openEvent 接线、init 链；快进走内置确认 API |
| R16-O2 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-sim.js` | freshRun/migrate：`pendingModal: null`；可选 `setPendingModal`/`clearPendingModal` 小 API |
| R16-O3 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-events.js` 或新建极小 `js/fc-confirm.js`（若新建须改 dashboard.html script 标签） | 通用 confirm overlay：`FC.confirm(opts) → Promise<boolean>` |
| R16-O4 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `css/fc-events.css` 或 `css/fc-gameplay.css` | confirm 面板样式（克制，无紫霓虹） |
| R16-O5 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-guide.js` + 必要时 `screens/dashboard.html` script | 教学一句：城市敲门刷新会补弹；若新建 fc-confirm.js 则 html 引入 |
| R16-G1 | gpt-sol | `gpt-5.6-sol-xhigh` | `tests/r16-crisis-replay.test.js` + runner | 断言 pendingModal / confirm / boot replay |
| R16-G2 | gpt-sol | `gpt-5.6-sol-xhigh` | `ACCEPTANCE.md` §38✓ §39 + `round16/R16_TEST_NOTES.md` | 验收 |

## 合入顺序

O2 → O3 → O4 → O1 → O5 → G1/G2；对照 F*。
全绿 → push → PR。收口必须三段：改了什么 / 下一步 / 链接。
