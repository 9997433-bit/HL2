# R20 · O3 skip — `fc-career.js` 关闭时序已对齐 180ms

结论：**skip，无需改动 `fc-career.js`。**

## 审计结果

`FC.career.showPicker` 的进出场时序已经是目标形态，三要素齐备：

| 要素 | 位置 | 现状 |
|------|------|------|
| `is-closing` 先加 class | `fc-career.js:72` | ✅ `host.classList.add("is-closing")` 在卸 DOM 之前 |
| `setTimeout(done, 180)` | `fc-career.js:79` | ✅ 180ms 后才 `removeChild` + `FC.overlay.pop` + `resolve` |
| `is-open` 走 rAF | `fc-career.js:110` | ✅ `appendChild` 之后一帧再加 class，保证起始态能被浏览器采样 |

`done` 内部顺序也正确：先摘 DOM，再 `FC.overlay.pop(host)`，再清 `picker = null`，最后 `resolve(value)`，不会出现 overlay 栈残留或重复开面板。`settled` 闸门保证 180ms 窗口内重复触发（连点卡片 / Esc 叠遮罩点击）只结算一次。

R19 的 cancelable 语义（手动入口 `close(null)`、开局强制 `finish(hint)`）原样保留，未触碰。

## 给 O1 的对齐前提（重要）

审计中发现 **`.fc-career-pick` 目前在 CSS 里完全没有 `is-open` / `is-closing` 规则**——`fc-gameplay.css:1114-1158` 只有布局，JS 加的两个 class 现在是空转。也就是说 180ms 这个数字眼下没有对应的过渡，对齐与否取决于 O1 补的动效。

O1 补规则时请把时长压在 **≤180ms**，不要照抄合约卡的数值：

- `fc-contract.css:185` 是 `opacity 0.2s`，`fc-contract.css:209` 是 `transform 0.24s`，配的是 `fc-contract.js:286` 的 `setTimeout(done, 200)`；transform 那 240ms 本身就已经超出计时器。
- `fc-career.js` 是 180ms，若 CSS 写 200/240ms，退场动画会在放完之前被 `removeChild` 砍断，出现「面板还没淡完就凭空消失」。

两条路都可以，任选其一即可，但请不要让 CSS 时长大于 180ms：

1. CSS 侧统一用 `0.18s`（opacity 与 transform 同值），JS 一行不动 —— 推荐，本轮改动面最小。
2. 若确实要沿用 0.2s/0.24s 的观感，回头知会一声，把 `fc-career.js:79` 的 180 提到 240 即可，仍属最小时序修正。

另附一条不属本轮范围的观察，留给 O4 的 reduced-motion 核对：`fc-events.js` / `fc-contract.js` 都有 `reduced()` 得到的 `soft` 短路（`if (soft) done()` 直接跳过等待），`fc-career.js` 没有，`prefers-reduced-motion` 下仍会空等 180ms。视觉上不算 bug（O1 的 reduced-motion 兜底会把过渡关掉），只是多一次无谓延迟，是否补由 O4 判断。

## 验证

`node tests/r19-career-dismiss.test.js` 通过（基线未改动，仅确认关闭路径仍能正常 resolve）。
