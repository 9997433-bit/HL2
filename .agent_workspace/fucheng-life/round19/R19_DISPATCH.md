# R19 派工 · 选轨关闭语义 + §40 dismiss 措辞

基线：`main` @ `a9a1ec3`（已合 R18 #20）

## 目标
1. **选轨手动入口可取消**：`showPicker({ cancelable: true })` 时 Esc/遮罩 `resolve(null)`；`maybeOfferCareerTrack({ manual: true })` 对 null 不 `applyTrack`、不写「null」日志。boot 自动流保持 Esc=接受推荐轨。
2. **§40 措辞**：「已完成……补弹」改为「发生过补弹（含被关闭）」；可选补 KNOWN。
3. 测试覆盖 cancelable / null 早退 / §40 措辞。

## 十路
| 别名 | model | 可写 |
|------|-------|------|
| F1 | claude-fable-5-thinking-xhigh | round19/fable-r19-sota-gates.md |
| F2 | claude-fable-5-thinking-xhigh | round19/fable-r19-playfeel.md |
| F3 | claude-fable-5-thinking-xhigh | round19/fable-r19-acceptance-draft.md |
| O1 | claude-opus-5-thinking-high-fast | fc-career.js（cancelable） |
| O2 | claude-opus-5-thinking-high-fast | dashboard-app.js（manual 路径，勿改 career.js） |
| O3 | claude-opus-5-thinking-high-fast | ACCEPTANCE §40 措辞（勿 bump KEY） |
| O4 | claude-opus-5-thinking-high-fast | KNOWN / TEST_NOTES 落字或 skip |
| O5 | claude-opus-5-thinking-high-fast | CSS skip 或推荐角标副文案（可选） |
| G1 | gpt-5.6-sol-xhigh | tests/r19-*.test.js + runner |
| G2 | gpt-5.6-sol-xhigh | ACCEPTANCE §42 + 对齐 |

## 分支
`cursor/fucheng-r19-career-dismiss-fa72`
