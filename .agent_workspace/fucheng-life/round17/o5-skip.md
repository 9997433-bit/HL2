# R17-O5 · CSS SKIP 说明

- Lane: R17-O5（opus-fast），可写路径「CSS 或 skip 说明」
- 结论：**本轮不改 CSS**。R17 的两项改动（`tracksPending` 收窄、boot 连弹收敛）没有引入任何新 DOM 节点或新 class，被推迟的三个入口在现有样式里都已经是常驻可见的可交互控件。
- 审计基准：`467134e feat(r17): pending for contract O1 and coalesce boot modals`

## 为什么无需 CSS

### 1. O1 的改动是纯控制流，没有新增可样式化的结构

`git show 467134e -- games/fucheng-life/js/dashboard-app.js` 全部落在两处：

- `tracksPending()` 换成 `isContractResolutionEvent()` 判定（只排除 `contract_*` + `category === "合约"` 的结算卡）；
- `init()` 末尾的 promise 链加了一个 `replayed` 标志，命中补弹时跳过 `maybeOfferCareerTrack` / `maybeOfferContract` / `guide.show`。

没有 `createElement`、没有新 `className`、没有新 `id`。补弹出来的卡走的还是 `openEvent()` → 既有事件弹窗样式（R16 起 CSS 里就没有 pending 专属选择器，补弹卡与普通卡同一套皮）。

### 2. 被推迟的三个入口，现有 CSS 已经把它们画得够显眼

| 被推迟项 | 本局仍可见的入口 | 现有样式 |
|---|---|---|
| 签合约 | `#contractPickBtn`「签一张合约」+ `#contractPrompt`「城市在等你签一份合约」 | `fc-contract.css:19` `.fc-contract-hud.is-awaiting`（琥珀描边 + `fc-contract-pulse` 呼吸动画）、`:87` `__prompt`、`:129` `__state.is-urgent` |
| 教学 | `#guideBtn`「新手教学」常驻在 `.fc-dash-tools` | `fc-btn--ghost`，无需新样式 |
| 选轨 | 无手动入口，但 `FC.career.needsPick` 下次进门自动兜底；`run.career.track` 有默认值，本局玩法不断 | 复用 `fc-career-pick` |

`renderContract()`（`dashboard-app.js:470`）在没签约且仍在窗口期时会挂 `is-awaiting` + 显示按钮和 prompt，所以「补弹后这一局没弹签约卡」不会变成静默丢失——HUD 一直在闪。

### 3. 手机端（≤640px）也不缺入口，这是最容易漏的一格

`fc-gameplay.css:606` 的移动端隐藏名单只有 `#tickBtn / #tick6Btn / #resetBtn`（它们已由底部 dock 与「更多」抽屉承接），**`#guideBtn` 不在名单里**，仍留在 `.fc-dash-tools` 行里可点。这点很关键：`dashboard.html:274` 的「更多」抽屉只放了快进/重开，没有教学按钮；如果哪天顺手把整行 `.fc-dash-tools .fc-btn` 一起隐掉，ACCEPTANCE §40 的「手动教学入口继续可用」在手机上就会失守。

合约 HUD 同理：`fc-contract.css:170` 的窄屏分支只是改成竖排 + `__btn { width: 100% }`，没有隐藏，签约入口在 390px 下反而更大。

## 留给后续 lane 的观察（本轮不动手）

1. 选轨是唯一一个「推迟后本局无手动入口」的项。影响很小（有默认轨道、下次进门补问），但若 F2 的体验清单要求补一个入口，那是 HTML + JS 的活（职场 Tab 加一个「选择轨道」按钮），CSS 可复用 `fc-btn--ghost`，不需要新样式。
2. `.fc-contract-hud.is-awaiting` 的呼吸动画是 `infinite`。补弹推迟签约后，这个动画会比以前多挂一整局。已有 `prefers-reduced-motion` 分支（`fc-contract.css:370` 关掉动画），暂不认为需要加自动停止；若 F2 判定为持续干扰，再考虑「N 秒后降为静态描边」。
3. 补弹卡目前和普通事件卡长得一模一样，玩家分不出「这是上次没答完的」。R16 已经这样发过一轮并通过验收，本轮不追加视觉差异，避免在收敛连弹的同时又加新视觉噪声。
