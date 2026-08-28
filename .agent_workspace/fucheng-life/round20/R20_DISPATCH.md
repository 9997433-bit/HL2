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

## Agent IDs
- F1: bc-53cf3570-056f-5d36-ae5c-2db475b3ca25
- F2: bc-a4833cd1-258c-5d0c-abb0-40b8750ce5c6
- F3: bc-08e137bb-452b-5e3d-9d66-ca051968b4ae
- O1: bc-85e83de6-3302-54b3-a1f3-43f71ce61255
- O2: bc-c4177f5c-35be-594e-aa6e-012ab04919e7
- O3: bc-76eba2cc-0a23-5e85-a00b-540622812609
- O4: bc-ec505c64-0fd8-5366-9726-7dbe4d2cc9f1
- O5: bc-24b656e2-8af7-5134-a144-1cd9f65636d4
- G1: bc-7fa4bbd2-383b-5960-9a52-c154b84b9fea
- G2: bc-05f8af48-78d6-54b8-8d95-e3896533bae2
