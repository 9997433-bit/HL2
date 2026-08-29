# R22 外部对标调研（编排）

> 对照：WAI-ARIA APG Dialog、web.dev `<dialog>`、人生重开模拟器复盘、国内职场人生卡牌（职场浮生记 / 一生之选等）。  
> 只采纳**能立刻落到现码**的做法；玩法深度（构筑/精力）另开产品轮。

## 学什么（可落地）

| 来源 | 好的做法 | 我们缺口 | R22 动作 |
|------|----------|----------|----------|
| APG / WCAG 模态 | Tab 循环只扫**可见**可聚焦项；无出口时也不得泄到背后 | trap 的 `querySelectorAll` 仍收录 `[hidden]` 面内按钮 → 回执面 Shift+Tab 泄焦 + Tab 死键（R21-F2 R1） | O1：items 过滤不可见；空名单仍 `preventDefault` |
| APG / MFA11y | 必选/破坏性对话框 Esc 不裸关，但必须有**可感知出口或反馈** | 闯城已做 pulse；事件/信纸回执面键盘洞更大 | 本轮先修 trap；Esc 家族不扩 scope |
| web.dev dialog | `aria-labelledby` / `aria-describedby`；开场焦点进对话 | 事件卡已有；选轨/闯城 panel 缺 labelledby | O2/O4：career-pick 补 ARIA |
| 人生重开复盘 | 反馈要「选中有态」；减少无意义操作；移动端安全区 | 选卡 hover/focus 已有；安全区/`dvh` 仍欠 | `dvh` **不进本轮**（基建轮） |
| 职场人生卡牌 | 选项代价可视化、结算来源清晰 | 我们已有 choice dots / 日志 | 本轮不改玩法数值 |

## 明确不学 / 延后

- 原生 `<dialog>.showModal()`：现栈是自定义 overlay + ES5/`file://`，整迁风险大，记 KNOWN。
- `inert` 整页：与现 `fc-scroll-lock` 叠层，需单测移动端，延后。
- 天赋十连抽 / 自动播放年份：产品向，非本轮键盘/无障碍收口。

## 停手关系

R21 约定「焦点家族可暂停」；本轮是**对标后补洞**（可见性过滤 = 业界标配我们还没做）。合入后若无新的中级风险，再暂停。
