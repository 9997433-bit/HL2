# R22-O5 · 信纸 receipt `swap()` 不加 `disabled`（skip）

结论：**skip**，与 O4 同判。O1 的 `FC.overlay.trap` 可见项过滤（`55567ba`）已经覆盖信纸
「读面 → 回执面」之后的泄焦，在 `renderLetter` 的 `swap()` 里再补一遍 `disabled = true`
是纯冗余，不写。本路未改 `games/`。

## 判据

信纸的两个面在 `renderLetter` 的模板里是兄弟节点，处置按钮 `.fc-letter__act` 全部挂在读面下：

```
.fc-letter__sheet
  .fc-letter__face--read        ← 处置按钮 .fc-letter__act × N 在这层里
  .fc-letter__face--receipt     ← swap 之后才装 .fc-letter__done
```

`swap()` 第一句就是 `readFace.hidden = true`，于是回执面亮起的那一刻，每颗 `.fc-letter__act`
的 `closest("[hidden]")` 都能上溯到读面，trap 一律筛掉；`offsetParent` 也同时变 `null`
（读面不是 `position: fixed`，拿不到那条豁免），两道判定都指向同一个结果。
环里只剩回执面的「归档，继续 ▸」，再置 `disabled` 不会改变这个集合。

红线信纸走的是另一条路，同样已闭合：`isRedline` 分支在开信时就
`b.disabled = true`，trap 的选择器 `button:not([disabled])` 本来就不收它们，
过滤后列表为空 —— 靠 O1 新加的「空列表也 `preventDefault`」兜住，焦点留在信纸上。
两条路都不经过 `swap()`，派工里 O5 的前提（「若 O1 不够」）不成立。

## 验证

不写进仓库的一次性探针（`/tmp/o5-letter-trap-probe.js`）把 `fc-events.js` 的 overlay 段
灌进 `vm`，按上面的 DOM 形状搭了假节点（`closest` / `offsetParent` 都按 `hidden` 上溯实现），
三段断言全过：

1. 读面在时，Tab 在两颗处置按钮之间回绕，不会落到尚未显示的回执按钮；
2. `readFace.hidden = true` 之后，Tab 与 Shift+Tab 都停在「归档，继续 ▸」，
   两颗处置按钮的 `focus()` 计数不再增加；
3. 红线冷却窗（处置按钮全 `disabled`、回执面仍 `hidden`）下 Tab 仍被 `preventDefault`，
   焦点不外泄。

仓库内的 `tests/r22-trap-visible.test.js`（G1）已覆盖同一过滤的通用形状，本路不另加测试。

## 一处残留（与 O4 同形，不在本路可写范围）

`answer()` 的非 reduced-motion 分支不是立刻 `swap()`，而是先
`readFace.classList.add("is-leaving")` 再 `setTimeout(swap, 200)`。这 200ms 里读面
`opacity: 0`、`translateY(-8px)`，但既没 `hidden` 也没 `pointer-events: none`
（`fc-events.css` 的 `.fc-letter__face--read.is-leaving` 只写了 opacity / transform），
所以处置按钮此刻仍可聚焦、可点击：

1. Tab 会停在一颗完全透明的处置按钮上 —— trap 筛不掉它，它既不在 `[hidden]` 子树里，
   `offsetParent` 也不为 `null`；
2. 点第二颗处置按钮会重入 `answer()`（该函数只挡 `settled || cooling`，不挡 `answered`），
   把 `answered` 与回执面内容覆盖一遍，`go` 上还会再挂一个 `click`。键盘路径有
   `if (answered || cooling) return;` 挡着，鼠标路径没有。

这**不是** `swap()` 里加 `disabled` 能修的：`swap()` 恰好在这 200ms 结束时才跑，
那时读面已经 `hidden`，锁上去也晚了。要修得动窗口的起点，两个候选：

- CSS：`.fc-letter__face--read.is-leaving { pointer-events: none; }`，配合 trap 里补一条
  `visibility` / `opacity` 或 `is-leaving` 的判定；
- JS：把 `buttons.forEach(function (b) { b.disabled = true; })` 提到 `answer()` 里
  `classList.add("is-leaving")` 之前（顺带把重入也堵死）。

两者都超出 O5「仅 `swap()` 局部」的口径，且与事件卡那处是同一个洞（O4 已登记），
应当合并成一路统一改，故本路只登记不动手。
