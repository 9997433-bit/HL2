# R20 派工 · 选轨/闯城选择卡动效 + Esc 对齐

基线：`main` @ `3d3862a`（已合 R19 #21）

## 目标
1. **选轨面板动效**：为 `.fc-career-pick` 的 `is-open` / `is-closing` 补上与合约选择卡同级的 opacity/transform 过渡；面板玻璃底色；`prefers-reduced-motion` 兜底。两张卡共用 class，一次改双份收益。
2. **闯城主目标 Esc 对齐**：`maybeOfferChallengeGoal` 补 overlay Tab trap + Esc 吞掉（不可取消，防软锁）；关闭走 `is-closing` 再卸 DOM；点遮罩仍不落目标。
3. 测试 + §43。

## 十路
| 别名 | model | 可写 |
|------|-------|------|
| F1 | claude-fable-5-thinking-xhigh | round20/fable-r20-sota-gates.md |
| F2 | claude-fable-5-thinking-xhigh | round20/fable-r20-playfeel.md |
| F3 | claude-fable-5-thinking-xhigh | round20/fable-r20-acceptance-draft.md |
| O1 | claude-opus-5-thinking-high-fast | fc-gameplay.css（career-pick 动效/玻璃） |
| O2 | claude-opus-5-thinking-high-fast | dashboard-app.js maybeOfferChallengeGoal（Esc/trap/closing） |
| O3 | claude-opus-5-thinking-high-fast | fc-career.js 若需微调关闭时序（勿大改语义）或 skip |
| O4 | claude-opus-5-thinking-high-fast | R20_TEST_NOTES / reduced-motion 核对 |
| O5 | claude-opus-5-thinking-high-fast | 390px 可见性 skip 或微调 |
| G1 | gpt-5.6-sol-xhigh | tests/r20-*.test.js + runner |
| G2 | gpt-5.6-sol-xhigh | ACCEPTANCE §43 |

## 分支
`cursor/fucheng-r20-picker-motion-fa72`
