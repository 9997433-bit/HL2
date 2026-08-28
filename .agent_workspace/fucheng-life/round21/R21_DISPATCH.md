# R21 派工 · 焦点 trap 闭合 + 闯城 Esc 反馈

基线：`main` @ `039a831`（已合 R20 #22）

## 停手标准（本轮写给编排）
清掉 R20-F2 的两处**低-中**残留（R1 泄焦、R2 Esc 零反馈），并顺手修 R3 选轨日志中文名。  
`vh→dvh` / ≤360 密度 **不在本轮**（独立基建轮）。  
本轮合入且全绿后，焦点键盘家族可视为闭合，可暂停功能轮，除非用户点名继续。

## 目标
1. **`FC.overlay.trap` 闭合**：`activeElement` 等于 `rootEl` 或不在 items 内时，Shift+Tab → last、Tab → first；三张卡同吃。
2. **闯城 Esc 弱反馈**：吞 Esc 时 panel 一次性 shake/pulse（CSS 修饰类）；lede 补半句「必须选定才继续」；`prefers-reduced-motion` 下无动画但 lede 仍在。
3. **选轨日志中文名**：`"你选择了「" + name + "」轨道"`，查 `careerTracks` 的 `name`，勿印 slug。
4. 测试 + §44。

## 十路
| 别名 | model | 可写 |
|------|-------|------|
| F1 | claude-fable-5-thinking-xhigh | round21/fable-r21-sota-gates.md |
| F2 | claude-fable-5-thinking-xhigh | round21/fable-r21-playfeel.md |
| F3 | claude-fable-5-thinking-xhigh | round21/fable-r21-acceptance-draft.md |
| O1 | claude-opus-5-thinking-high-fast | `js/fc-events.js` 仅 `FC.overlay.trap` |
| O2 | claude-opus-5-thinking-high-fast | `js/dashboard-app.js` 仅 `maybeOfferChallengeGoal`（Esc 反馈 + lede） |
| O3 | claude-opus-5-thinking-high-fast | `css/fc-gameplay.css` shake/pulse + reduce |
| O4 | claude-opus-5-thinking-high-fast | `js/dashboard-app.js` 仅选轨日志中文名（`maybeOfferCareerTrack` 一带） |
| O5 | claude-opus-5-thinking-high-fast | reduce 下 `.fc-career-pick:not(.is-closing){opacity:1}` 硬化（css）或 skip 笔记 |
| G1 | gpt-5.6-sol-xhigh | tests/r21-*.test.js + runner |
| G2 | gpt-5.6-sol-xhigh | ACCEPTANCE §44 |

## 分支
`cursor/fucheng-r21-focus-trap-fa72`

## 冲突纪律
- O2 / O4 同文件不同函数区：禁止互相改对方函数。
- O3 / O5 同 CSS：O3 写 shake；O5 只动 reduce 块或写 `o5-skip.md`。
- 未授权路径禁止改 `games/`。

## Agent IDs
- F1: bc-334692a6-c7f8-5933-8d6e-01815ee63a01
- F2: bc-156e2ca9-4aaa-54e2-a763-ca0b4c5d60e0
- F3: bc-3ada258b-4412-5a45-aa93-214ed3cd35c0
- O1: bc-3670a970-ffdc-5e53-9131-a499ab0f584a
- O2: bc-fe3da298-e2ab-574a-a456-94a7ec5ef1a2
- O3: bc-49e21c45-0760-5b5f-b132-6bd07f9fd68e
- O4: bc-6073f89a-7e51-5d16-be77-13d433e0184b
- O5: bc-f1197d2b-eda0-5c31-abe3-48685d934575
- G1: bc-62fa2fb0-f0b1-534a-b1c4-bccdbdd06738
- G2: bc-5dedad8f-7c07-5a1b-9fbe-47c504b1f37c
