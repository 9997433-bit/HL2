# R20 体验风险清单 · 选择卡动效/玻璃底 + 闯城 Esc 对齐（playfeel）

> 作者：R20-F2（fable）。只读现码后的体验风险盘点，不改游戏代码。
> 对照代码状态：分支 `cursor/fucheng-r20-picker-motion-fa72` 快照 @ `7e531a8` ——
> O1 动效+玻璃（`518bb3c`）、O2 闯城卡键盘与收尾（`0836421`）、O3 skip（`8e0dedd`）、
> G1 测试（含 runner 挂载）、G2 §43（`221842f`，未勾）、O4 TEST_NOTES 刷新（`130acab`）、
> F1 门禁（`9915499`）、O5 skip（`7e531a8`）皆已落盘。
> 快照时 `./scripts/run-fucheng-life-tests.sh` **31 项全绿**（本机复跑确认）。
> 本文任务：对照 R19 o5-skip 点名的「`is-open`/`is-closing` 空钩子」与「闯城卡 Esc 缺口」，
> 审 R20 实际落地后的体验残留。

共 **7 条残留风险**：中 0、低-中 2（R1–R2）、低 5（R3–R7）。
**本轮没有中级风险**——O1 遵守了 o3-skip 的 180ms 前提、O2 照抄选轨卡收尾模式、
O5 用真页实测定量，工程面是近几轮里最干净的一次。
另附 5 条回归手测路径（P1–P5，与 O4 七场景、F1 十一门禁互补）、
一节「已核对无虞」、一节优先级速览。

---

## 〇、R19 两缺口 + 遗留账的回收判定（先说结论）

| 账目 | 本轮判定 |
|---|---|
| o5-skip(R19) §四.1 面板无卡片底色 | ✅ 已修：O1 给 `__panel` 补 `--fc-glass-2-bg` + 描边 + `--shadow-lift`/`--fc-glass-highlight`，`__title`/`__lede` 也有了专属规则；还超额补了 `max-height: 92vh` + `overflow: auto`——O5 实测 320×568 与横屏档由 R19 的「顶出视口滚不回来」退化为面板内滚动 |
| o5-skip(R19) §四.2 `is-open`/`is-closing` 空钩子 | ✅ 已修：整卡 opacity 0.18s + 面板 translateY/scale 归位；关闭态时长压 0.18s ≤ JS 的 180ms（o3-skip 给 O1 的前提被逐字遵守，无「淡出中途被摘节点」）。残留：reduce 下关闭仍是无动画的 180ms 真空（本文 R5）、`opacity: 0` 基态带来的新失败模式（R4） |
| o5-skip(R19) §四.3 双卡合并一轮 + 给可取消态留专属修饰类 | ◐ 半修：合并轮成立（共用 class 一次改双份，本轮就是那一轮）；但**可取消态专属修饰类 / ×角标一字未落**——两张卡如今观感逐帧同款，关闭语义照旧分家（本文 R2） |
| R19-R3 闯城卡无 onKey / 无 trap / 焦点可逃 | ✅ 主体已修：O2 补 Esc 吞掉（`preventDefault` 后直接 return，够不到 `finish` 的 `goals[0]` 兜底）、Tab 交 `FC.overlay.trap`、`panel.focus()`、push 守卫、`is-closing` + 180ms 收尾。**残留两角**：初始 Shift+Tab 仍泄漏（R1）、吞 Esc 零反馈（R2） |
| R19-R6 关闭 180ms 真空 | ✅ 常规路径已被动效接住；reduce 路径续档（R5） |
| R19-R4 boot 兜底日志「你选择了」 / R19-R5 toast 死按钮 | ✗ 未动，派工外续档（R3 收编前者并加一条新观察；后者原样，见「已核对」注记） |

R19 收尾已另行销掉 R19-R1（`migrateContract` 仅在 `picked == null` 时回填，`a385256` + 测试）
与 R19-R2（`applyTrack` 不再清零 level/kpi），本文不再占名额。

---

## 一、键盘与焦点（R1）

### R1 开卡后第一下 Shift+Tab 就把焦点漏出卡外：trap 管不到 panel 自身 ⚠ 低-中（本轮最大漏点）
- **现象**：`FC.overlay.trap`（`fc-events.js:120`）只在 `activeElement` 恰为面板内**首/末**
  可聚焦元素时才 `preventDefault` 回绕。开卡后焦点在 `.fc-career-pick__panel`
  （`tabindex="-1"`，O2 落的 `panel.focus()`）——它不在 items 名单里。此时按 Tab，
  浏览器默认把焦点送进面板内第一张卡，没事；但按 **Shift+Tab**，浏览器默认向前走，
  host 又是 `body` 最后一个孩子，焦点直接落到**背后仪表盘最后一个可聚焦控件**，
  继续 Shift+Tab 可一路走遍工具区。遮罩只拦鼠标、`fc-scroll-lock` 只锁滚动，
  键盘 Enter 是真操作：闯城卡下按到 `tickBtn`（boot 链开始前 `:1809` 就已启用）
  会打「还有 N 点行动点」系统日志——无害但足以定罪；按到「重开人生」则会再弹确认框。
  三张卡同病：选轨卡、合约卡与闯城卡都是 `panel.focus()` + 同一个 trap。
- **与条文的冲突**：§43 写「按 Tab 或 Shift+Tab 时，焦点保持在卡内循环」，F1 门禁 G-5
  的通过标准是「焦点**永不**落到卡后面的仪表盘按钮」——这一步上两处都不成立。
  G1 的 vm harness 只断言 Tab 分支转发给了 trap，泄漏发生在浏览器默认行为里，测不到；
  O4 场景 5 的手测从正向 Tab 开始，恰好绕过这一角。
- **建议护栏**：修在 `FC.overlay.trap` 一处，三张卡同吃——`activeElement` 不在 items
  里（含等于 rootEl 自身）时 `preventDefault` 并按方向送 first/last。`fc-events.js`
  本轮不在任何 lane 可写名单，建议 wrap-up 收，或下轮开卷；不修则 G-5/§43 措辞收窄成
  「进入卡内后循环成立」+ KNOWN 落字。

---

## 二、语义与反馈（R2–R3）

### R2 吞 Esc 零反馈：视觉越对齐，语义分家越难猜 ⚠ 低-中
- **现象**：O1 之后两张卡逐帧同款（同玻璃、同淡入、同归位），但 Esc 一张能关、
  一张装死。boot 链上闯城卡常常紧跟在选轨卡后面弹出——玩家上一张卡刚体验过
  「Esc 有反应」，下一张同皮的卡就完全不响应，没有任何视觉线索解释为什么。
  这是 R19-R5「死按键」观感的翻版，落在一张必选卡上；R19-R3 记录的
  「同一张皮多种 Esc 语义」没有随视觉对齐收敛，反而更难分辨（手动选轨=取消、
  boot 选轨=签推荐、闯城=装死，旁边合约卡还有第四种「跳过本月」）。
- **建议护栏**：便宜的两选一——吞 Esc 时给 panel 加一个一次性 shake/pulse 修饰类
  （纯 CSS + O2 的 onKey 一行，reduce 下退化为无动画）；或闯城卡 lede 补半句
  「这张卡必须选定才继续」。o5-skip(R19) §二早说过「玩家需要知道的是关掉会发生什么」，
  这半句账到本轮已经两轮了。至少 KNOWN 落一条家族语义现状。

### R3 选轨日志印的是轨道 id slug；boot 兜底措辞两轮续档 ⚠ 低
- **现象**：`dashboard-app.js:1121` 写日志用的是 `"你选择了「" + id + "」轨道作为起点。"`
  ——`id` 是 `showPicker` resolve 的 `data-track`，即 `gameplay-pack.json` 里的
  `"staff"` 这类英文 slug（`careerTracks` 的 `id`/`name` 分离，「职员线」在 `name` 里）。
  玩家日志里会出现「你选择了「staff」轨道」。对照组：本轮 O2 的闯城卡日志正确地
  查了 `def.name`（「主目标定为「落户上岸」」），同一屏两行日志一中一英。
  另外 R19-R4 点过的 boot 流 Esc 兜底仍写「你选择了」未分叉，一并续档。
- **建议护栏**：一行查表（`renderTabsExtra`（`dashboard-app.js:713`）里就有现成的
  id→name 写法）+ 兜底路径措辞分叉，建议下轮顺手；本轮派工外，不该夹带。

---

## 三、动效结构（R4–R6）

### R4 `opacity: 0` 基态把失败模式从「难看但可用」翻成「隐形拦点击」 ⚠ 低（结构性，落字即可）
- **现象**：R19 之前这张卡最坏是「瞬现瞬没、压在遮罩上难看」；O1 之后
  `.fc-career-pick { opacity: 0 }`，可见性**单点依赖** JS 的 rAF 把 `is-open` 加上。
  O4 场景 3 已写了 Console 核对与「弹出后切页」的 rAF 边界，补两个它没列的面：
  ① **后台标签页开局**——Ctrl/Cmd 点开 dashboard 挂在后台，boot 链在不可见状态跑完，
  闯城卡以 opacity 0 挂着（rAF 被暂停）直到玩家切回来才浮现。可恢复，不算死锁，
  但「切回来的一瞬卡才凭空出现」值得手测确认一次（P3）；
  ② 淡入动画的成立其实靠 `panel.focus()` 在 `appendChild` 与 rAF 之间**强制了一次
  layout**（初始 opacity 0 被采样，过渡才有起点）。两处 JS（`fc-career.js:109`、
  `dashboard-app.js:1186`）谁要是把 focus() 挪到 rAF 之后或删掉，淡入会静默退化成
  瞬现——G1 断言只看类名与规则，拦不住，只有 F1 G-1 的肉眼手测能发现。
- **建议护栏**：附议 O4 刷新版点名的 reduce 硬化，并给个具体形状——reduce 块补一行
  `.fc-career-pick:not(.is-closing) { opacity: 1 }`，让 reduce 下可见性不依赖 rAF，
  关闭语义不受影响；常规路径保持现状 + KNOWN 一行「focus() 对开场动画是载荷代码」。

### R5 reduce 下关闭仍是 180ms「看不见但拦点击」真空（续档 O3→O4） ⚠ 低
- **现象**：`fc-contract.js`/`fc-events.js` 都有 `reduced()` 的 soft 短路
  （`if (soft) done()` 跳过等待），`fc-career.js` 与 O2 的闯城卡都没有。
  reduce 下点完目标：`is-closing` 让整卡瞬间 opacity 0（transition: none），
  然后**隐形地**拦 180ms 点击才卸 DOM。o3-skip 已记录留给 O4，O4 场景 3 把它
  按预期落字了——账是清的，但这是 R19-R6 的最后一角，两处各三行照抄 contract
  的短路即可，留给下轮或 wrap-up。

### R6 闯城卡选定后 180ms 未落盘窗口：刷新会「选了又让我选」 ⚠ 低
- **现象**：O2 的 `finish` 里 `pickChallengeGoal` + `pushLog` 立刻改内存，但
  `FC.write` 藏在 180ms 后的 `render(true)`（`dashboard-app.js:836`）里。窗口内
  刷新/杀页：`run.goal` 与那行「主目标定为…」都没存上，重进后卡再弹。行为自洽
  （`needsChallengeGoal` 只看 `run.goal`，不会出半截账），只是「明明选了又弹」的
  一次性观感。选轨卡不同构：它的账在 resolve **之后**才记，没有这个窗口。
- **建议护栏**：真要修是一行（`pickChallengeGoal` 后立刻 `FC.write({ run: run })`）；
  不修则 TEST_NOTES 场景 2 的「HUD/日志迟 180ms 属预期」旁边补半句存档口径即可。

---

## 四、窄屏定调（R7，回复 o5-skip §四.2 的点名）

### R7 320×568 闯城卡 82px 切口：本轮维持现状，下轮并入密度档 ⚠ 低
- **定调**：O5 问「压卡片密度还是截断 blurb」——**都先不动**。理由：
  ① 切口落在第四张卡正中（O5 截图确认），「下面还有东西」的暗示可读，内滚可达，
  不构成软锁；② 受影响档位（320×568、640×360 横屏）是边缘设备；③ 两种修法里
  截断 blurb 伤害更大——那是一句 60 个月赌注的说明文字，不该在最小屏上省字；
  压密度则不该全局压，应做成 `≤360px` 专档。
- **建议**：下轮若开 O5 §四.1 提议的「全站弹窗视口单位统一 `dvh`」轮次，把
  `≤360px` 的 `.fc-career-card` 密度档一并带上，一次收两账；本轮 §43 收口
  不受此条阻塞。

---

## 五、回归手测路径（P1–P5）

> 与 O4 `R20_TEST_NOTES.md` 七场景、F1 门禁 G-1～G-11 互补：那两份验「功能对不对」，
> 这份专打上文风险点。环境同 TEST_NOTES（`python3 -m http.server 8000`，清站点数据）。

- **P1 焦点泄漏定罪（R1，合入前必测）**：选轨卡、闯城卡、合约卡各开一次，
  开卡后**第一个动作**按 Shift+Tab → Console 看 `document.activeElement` 是否已在
  卡外；再按一次 Enter，记录背后控件是否真触发（闯城卡下能按到 `tickBtn`：
  AP > 0 时只打一条系统日志，无害但足以证明穿透）。结果给 G-5/§43 拍板用。
- **P2 Esc 语义横评（R2）**：boot 链连续过「选轨卡（Esc=签推荐）→ 闯城卡
  （Esc=装死）」，主观记一笔第二张卡的困惑度；再开合约卡对照第三种（Esc=跳过）。
  这是 R19-P5 的复测，预期从「有一张卡连 trap 都没有」改善为「都锁焦点但语义仍靠猜」。
- **P3 后台标签页开局（R4）**：Ctrl/Cmd 点击从入口页后台打开 dashboard（闯城档），
  等 3 秒切回——卡应立即浮现且可点；顺带跑 O4 场景 3 的
  `getComputedStyle(...).opacity` 核对，必须是 `1`。
- **P4 选定瞬间刷新（R6）**：点目标后 180ms 内 F5（手速或 DevTools Performance
  放慢），重进后预期：卡再弹、日志无「主目标定为…」残行、无半截账。
- **P5 窄屏找第四张卡（R7）**：320×568 与 640×360 各开一次闯城卡，不提示地让
  测试人找到「攒够首付」，记录发现面板内滚的耗时——作为下轮密度档取舍的依据。

---

## 六、已核对无虞（不占风险名额，防重复排查）

1. **关闭时序对齐成立**：`.is-closing` 的 opacity 0.18s 与面板 `transition-duration:
   0.18s` 都 ≤ JS 180ms（o3-skip 的前提被 O1 遵守）；开场 0.22s 不参与摘节点竞态。
   `setTimeout` 与过渡终点间只差最后一两帧，不可感。
2. **双卡不叠**：闯城卡 `finish` 先摘 DOM、`pop`，`resolve(true)` 最后——boot 链
   下一张合约卡 push 时栈已清，撞不出「modal is already open」；选轨卡同构（O3 已核）。
3. **push 守卫补上了**：O2 落了 `if (FC.overlay.push(...))` 才挂 onKey，R19 观察的
   「裸设 top().onKey 会截胡别人键盘」收掉。残留纯理论：push 失败时卡仍可见可点、
   Esc 会落到底下那张卡——boot 链串行到不了，不占名额。
4. **玻璃 token 全部有定义**：`--fc-glass-2-bg`/`--fc-glass-highlight`/`--shadow-lift`/
   `--r-lg`/`--ease-out` 都在 `fc-tokens.css`，不会静默 transparent；F1 G-2 的探针可锁。
5. **reduce 双保险在位**：`screens.css` 全局 0.05ms + `fc-gameplay.css` 专项 none；
   `is-open` 由 JS 无条件加，正常路径 reduce 下面板可见（R4 只是要求把依赖再降一格）。
6. **守卫未被动效破坏**：`settled`/`picker` 双闸原样；G1 的 vm harness 真跑了
   `maybeOfferChallengeGoal` 的 Esc 吞掉、trap 转发、遮罩落空、`is-closing` → 180ms →
   pop → resolve 全序（比正则强一档）；31 项全绿为本机复跑结果。
7. **Esc 吞得干净**：`preventDefault` 后直接 return，够不到 `finish` 的
   `id || goals[0].id` 兜底，不外泄给页面其他 handler；关卡后 `FC.overlay.pop` 的
   returnFocus 回位路径在。
8. **O5 的三条观察成立且账目清晰**（`z-index: 320` 死声明、`vh`/`dvh` 口径差、dock
   压不到卡的 elementFromPoint 实测），本文不重复记账。
9. **R19 顶级风险确已销案**：`migrateContract` 只在 `picked == null` 回填（有测试锁）、
   `applyTrack` 保留晚选进度——「取消后再选」这条玩法本轮复核仍成立。

---

## 七、优先级速览（给 Orchestrator 合入时的盯防顺序）

1. **P1 手测先行**：R1 焦点泄漏——结果决定 §43 与 F1 G-5 是照勾（措辞收窄 + KNOWN）
   还是 wrap-up 顺手修 `FC.overlay.trap`（一处修三卡，约五行）。
2. **便宜且该做**：R2 的 shake 反馈或 lede 半句（O2 文件一行 + 可选纯 CSS）；
   R4 的 reduce 块 `:not(.is-closing) { opacity: 1 }` 一行硬化（O4 刷新版已点名方向）。
3. **一句话的事**：R6 在 TEST_NOTES 场景 2 补存档口径；或 `pickChallengeGoal` 后
   补一行 `FC.write`。
4. **下轮顺手**：R3 日志查表 + boot 兜底措辞分叉；R5 reduce 短路照抄 contract。
5. **定调已给**：R7 维持现状，随 `dvh` 轮次带 `≤360px` 密度档。

---

model slug: claude-fable-5-thinking-xhigh
