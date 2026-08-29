# R23 派工 · is-leaving 窗口锁单（事件卡 + 信纸）

基线：`main` @ `de1efc5`（已合 R22 #24）

## 确认
是 **R23**。R22 合入后按约定处理最大残留：`is-leaving` 200ms 半透明窗可重入换单（R22-F2 R1）。`vh→dvh` **不进本轮**。

## 目标
1. **锁单**：`answer()` 在已有 `answered` 时直接 return（挡鼠标二次点击 + Enter 重入）。事件 modal 与信纸各一处。
2. **指针**：`.is-leaving` 加 `pointer-events: none`（事件问面 + 信纸读面）。
3. **可选加固**：进入 leaving 时把该面选项/处置按钮 `disabled=true`（或 `tabindex=-1`），避免 Tab 停在透明钮上。
4. 测试 + §46。reduce/`soft` 即时 swap 路径不得回归。

## 十路
| 别名 | model | 可写 |
|------|-------|------|
| F1 | claude-fable-5-thinking-xhigh | round23/fable-r23-sota-gates.md |
| F2 | claude-fable-5-thinking-xhigh | round23/fable-r23-playfeel.md |
| F3 | claude-fable-5-thinking-xhigh | round23/fable-r23-acceptance-draft.md |
| O1 | claude-opus-5-thinking-high-fast | `css/fc-events.css`：两处 `.is-leaving` + pointer-events |
| O2 | claude-opus-5-thinking-high-fast | `js/fc-events.js` 仅 modal `answer()`：answered 早退 + 可选 disable 选项 |
| O3 | claude-opus-5-thinking-high-fast | `js/fc-events.js` 仅 letter `answer()`：同上对称 |
| O4 | claude-opus-5-thinking-high-fast | 若 O2/O3 已够：`o4-skip.md`；否则补 onKey 数字键在 answered 后的行为核对笔记 |
| O5 | claude-opus-5-thinking-high-fast | reduce/soft 路径零回归核对或 `o5-skip.md` |
| G1 | gpt-5.6-sol-xhigh | tests/r23-*.test.js + runner |
| G2 | gpt-5.6-sol-xhigh | ACCEPTANCE §46 |

## 分支
`cursor/fucheng-r23-leaving-lock-fa72`

## 冲突纪律
- O2/O3 同文件不同函数（modal vs letter 的 `answer`），禁止互改。
- O1 只动 CSS；勿改 JS。
