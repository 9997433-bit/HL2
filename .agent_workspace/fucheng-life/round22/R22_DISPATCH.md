# R22 派工 · trap 可见项过滤 + career-pick ARIA（对标落地）

基线：`main` @ `7554518`（已合 R21 #23）

## 依据
见同目录 `R22_RESEARCH.md`（APG 可见焦点循环 + 人生模拟反馈惯例）与 R21-F2 R1/R2。

## 目标
1. **`FC.overlay.trap`**：items 排除不可见（`closest("[hidden]")` 或等价）；过滤后为空仍 `preventDefault`（红线冷却窗不泄焦）。
2. **选轨/闯城 panel**：补 `aria-labelledby`（+ 可选 `aria-describedby`）指向 title/lede，对齐事件卡已有口径。
3. 测试 + §45。不改玩法数值；不迁 `<dialog>`；不动 `vh→dvh`。

## 十路
| 别名 | model | 可写 |
|------|-------|------|
| F1 | claude-fable-5-thinking-xhigh | round22/fable-r22-sota-gates.md |
| F2 | claude-fable-5-thinking-xhigh | round22/fable-r22-playfeel.md |
| F3 | claude-fable-5-thinking-xhigh | round22/fable-r22-acceptance-draft.md |
| O1 | claude-opus-5-thinking-high-fast | `js/fc-events.js` 仅 `FC.overlay.trap` |
| O2 | claude-opus-5-thinking-high-fast | `js/fc-career.js` showPicker：ARIA labelledby/describedby |
| O3 | claude-opus-5-thinking-high-fast | `js/dashboard-app.js` 仅 `maybeOfferChallengeGoal`：同款 ARIA |
| O4 | claude-opus-5-thinking-high-fast | 若 O1 不够：事件 `swap()` disable 隐藏面按钮；否则 `o4-skip.md` |
| O5 | claude-opus-5-thinking-high-fast | 信纸 receipt `swap` 同 O4 或 `o5-skip.md` |
| G1 | gpt-5.6-sol-xhigh | tests/r22-*.test.js + runner |
| G2 | gpt-5.6-sol-xhigh | ACCEPTANCE §45 |

## 分支
`cursor/fucheng-r22-trap-visible-fa72`

## 冲突纪律
- O1 独占 trap；O4/O5 不得改 trap，只可改各自 swap 或 skip。
- O2/O3 分文件，ARIA id 约定：`fcCareerTitle` / `fcCareerLede`（选轨）、`fcChallengeTitle` / `fcChallengeLede`（闯城）——写进 commit message。
