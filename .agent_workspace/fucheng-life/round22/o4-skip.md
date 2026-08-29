# R22-O4 · 事件卡 `swap()` 不加 `disabled`（skip）

结论：**A skip**。O1 的 `FC.overlay.trap` 可见项过滤已覆盖事件卡「问面 → 回执面」之后的泄焦，
在 `swap()` 里再补一遍 `disabled = true` 是纯冗余，不写。

## O1 落地了什么

`js/fc-events.js` 的 `FC.overlay.trap` 现在先取 DOM 里的候选，再逐个筛可见：

- `el.closest("[hidden]")` 命中就丢弃；
- `el.offsetParent === null` 且 `getComputedStyle(el).position !== "fixed"` 就丢弃；
- 过滤后为空仍 `e.preventDefault()` 再 `return`，不把 Tab 放行给背后的仪表盘。

## 为什么事件卡不用再 disable

事件 modal 的问面是 `.fc-event__face--ask`，选项按钮 `.fc-choice` 是它的后代；
`swap()` 的第一句就是 `askFace.hidden = true`。所以答完题、回执面亮起的那一刻起，
每个 `.fc-choice` 的 `closest("[hidden]")` 都能上溯到问面，trap 一律把它们筛掉，
环里只剩回执面那颗「记入日志，继续 ▸」。再置 `disabled` 不会改变这个集合。

红线冷却窗同理已经闭合，而且是走另一条路：`isRedline` 分支在开卡时就
`b.disabled = true`，trap 的选择器 `button:not([disabled])` 本来就不收它们，
过滤后列表为空 —— 靠 O1 新加的「空列表也 `preventDefault`」兜住，焦点留在卡上。

两条路都不经过 `swap()`，所以 `swap()` 里加 `disabled` 既救不了冷却窗，
也只是给回执面重复上一道已经生效的锁。派工里 O4 的前提（「若 O1 不够」）不成立。

## 一处残留（不在本路可写范围，交派工方分派）

`answer()` 非 reduced-motion 分支不是立刻 `swap()`，而是先
`askFace.classList.add("is-leaving")`、`setTimeout(swap, 200)`。这 200ms 里问面
`opacity: 0` 但既没 `hidden` 也没 `pointer-events: none`，按钮仍可聚焦、可点击：

1. Tab 会停在一颗完全透明的选项上（trap 筛不掉它 —— 它此刻既不在 `[hidden]` 子树里，
   `offsetParent` 也不为 null）；
2. 点第二颗选项会重入 `answer()`（该函数只挡 `settled || cooling`，不挡 `answered`），
   把 `answered` 和回执面内容覆盖一遍。键盘路径有 `if (answered || cooling) return;`
   挡着，鼠标路径没有。

注意这**不是**在 `swap()` 里加 `disabled` 能修的：`swap()` 恰好在这 200ms 结束时才跑，
那时问面已经 `hidden`，锁上去也晚了。真要修得动窗口的起点，两个候选：

- CSS：`.fc-event__face--ask.is-leaving { pointer-events: none; }`，配合 trap 里补一条
  `visibility`/`opacity` 或 `is-leaving` 的判定；
- JS：把 `buttons.forEach(b => b.disabled = true)` 提到 `answer()` 里
  `classList.add("is-leaving")` 之前（顺带把重入也堵死）。

两者都超出 O4 「仅 `swap()` 局部」的口径，且第一条要动 CSS、第二条要动 `answer()`，
故只登记不动手。信纸 receipt（`renderLetter` 的 `readFace` + `.fc-letter__face--read.is-leaving`）
是同一形状的残留，O5 那路可对照。
