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
| R16-F1 | fable | `claude-fable-5-thinking-xhigh` | `round16/fable-r16-sota-gates.md` | SOTA 门禁 | `bc-7840c3c7-f7da-5ebb-a984-42cdaffaf2ff` |
| R16-F2 | fable | `claude-fable-5-thinking-xhigh` | `round16/fable-r16-playfeel.md` | 体验风险 | `bc-a2c1b69d-6f7b-591b-9b54-e7412a881edb` |
| R16-F3 | fable | `claude-fable-5-thinking-xhigh` | `round16/fable-r16-acceptance-draft.md` | §39 草稿 | `bc-95d3b572-d54d-5e15-b037-d373470c6bac` |
| R16-O1 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/dashboard-app.js` | pendingModal 写入/清除、replay、init；快进内确认 | `bc-05c5339b-a4e4-55bf-a6d1-da17f47146ff` |
| R16-O2 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-sim.js` | pendingModal helpers | `bc-82e9ed63-316e-57dc-9ac2-eac1475f4ceb` |
| R16-O3 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-events.js` | `FC.confirm` | `bc-4ad9740c-2830-526b-8597-015c47a667c2` |
| R16-O4 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `css/fc-events.css` | confirm 样式 | `bc-29c098a9-bdc8-578e-9b91-aebf1f16e9af` |
| R16-O5 | opus-fast | `claude-opus-5-thinking-high-fast` | **仅** `js/fc-guide.js` | 教学补弹提示 | `bc-94500c15-856c-5380-9d0e-fed0d5d0df17` |
| R16-G1 | gpt-sol | `gpt-5.6-sol-xhigh` | `tests/r16-*.test.js` + runner | 测试 | `bc-6e6f765d-6600-55bf-acc7-0360fbc850ab` |
| R16-G2 | gpt-sol | `gpt-5.6-sol-xhigh` | `ACCEPTANCE.md` + notes | §39 | `bc-75d0550e-e6a0-51c4-9526-5fad54828504` |

## 合入顺序

O2 → O3 → O4 → O1 → O5 → G1/G2；对照 F*。
全绿 → push → PR。收口必须三段：改了什么 / 下一步 / 链接。
