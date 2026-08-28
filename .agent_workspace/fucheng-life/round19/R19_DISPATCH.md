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

## Agent IDs
- F1: bc-774a2eca-66af-5bd7-a356-c2f4b18f1a99
- F2: bc-676a5bef-0d0d-59ad-bf1c-48e4b335de5f
- F3: bc-1eee7b7b-287d-517e-89f6-4f0a8e13941e
- O1: bc-9e9f5120-4ed0-56f6-8dc3-41d2dab174cf
- O2: bc-b489b4fe-b1d0-5f7d-9aea-34f4c53cbc5f
- O3: bc-1b13e442-2f54-55f8-a2ca-fed8bd9294fa
- O4: bc-142e075b-bc1b-5317-bc9b-ec47c8313bd1
- O5: bc-c9f3472d-5d48-5a13-83ed-2b5d8a1e859a
- G1: bc-9f7031a9-5f10-5f0f-95a8-2ffb0a1f6dff
- G2: bc-23daf7f2-4c55-5b1e-99a2-48b1466d5ff9
