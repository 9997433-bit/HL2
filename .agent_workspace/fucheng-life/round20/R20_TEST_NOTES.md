# R20 测试入口与预期

覆盖本轮四件事：选轨/闯城选择卡的开合动效与玻璃底、`prefers-reduced-motion` 兜底、
闯城主目标的 Esc 不可取消与 Tab trap、390px 下两张卡的可见性。

## 落字时的树状态

- **O2 已落**（`0836421`）：`maybeOfferChallengeGoal` 改成先建节点再 `appendChild`，
  `FC.overlay.push` 成功后挂 `onKey`（Escape 只 `preventDefault` 不关卡，Tab 交
  `FC.overlay.trap(panel, e)`），聚焦 `.fc-career-pick__panel`，下一帧加 `is-open`；
  `finish` 里先写日志，再加 `is-closing`，等 180ms 才摘 DOM、`pop`、`render`。
- **O1 已落**（`518bb3c`）：`.fc-career-pick` 基态 `opacity: 0` + `0.18s var(--ease-out)`
  过渡，`is-open` 归 1、`is-closing` 回 0；面板 `translateY(14px) scale(0.98)` 起手，
  `0.22s` 归位，关闭时改用 `0.18s` 落到 `translateY(8px) scale(0.99)`；玻璃底走
  `--fc-glass-2-bg` + `--shadow-lift` + `--fc-glass-highlight`，并补了 `max-height: 92vh`
  与 `overflow: auto`。用到的六个 token 都在 `fc-tokens.css` 里，且 `dashboard.html`
  第一条就 link 了它 —— 任何一个 token 掉了，过渡会静默退化成瞬切、底色会变透明，
  这是场景 1 首先要看的东西。
- 两张卡共用同一套 class，O1 的 CSS 一次覆盖选轨与闯城两处。
- **G1 已落**（`27723c5`）：`tests/r20-picker-motion.test.js` 进了 runner，全量
  `./scripts/run-fucheng-life-tests.sh` 复跑为 `31 passed, 0 failed`。静态断言只能守住
  类名与时序这类形状，动效手感、reduce 兜底与 390px 仍要靠下面的手工场景。

## 自动化入口

从仓库根目录执行：

```bash
node games/fucheng-life/tests/r20-picker-motion.test.js
./scripts/run-fucheng-life-tests.sh
```

预期：R20 专项断言通过；全量汇总为 `0 failed`，两条命令退出码均为 `0`。

## 手工入口

从仓库根目录启动静态服务：

```bash
python3 -m http.server 8000
```

用最新版桌面 Chrome 打开 <http://127.0.0.1:8000/games/fucheng-life/>，清除站点数据，
打开 DevTools Console。移动端回归用设备模式，视口 `390 × 844`。

两张卡的到达路径：

- **选轨卡**：新档进仪表盘且当次没有补弹 → boot 自动弹（不可取消）；或存档里
  `needsPick` 为真时点工具区「选择职业轨道」(`careerPickBtn`) → 手动弹（R19 起可取消）。
- **闯城卡**：出身页把玩法切到「闯城 60 月」再建档 → 进仪表盘自动弹。它是 boot 链里
  唯一不被补弹推迟的一张（没主目标这局没法计分）。想反复弹，清站点数据，或在 Console
  里把 `fucheng.save.v1` 存档中的 `run.goal` 删掉后刷新。

## 场景与预期

1. **选轨卡开合动效**
   - 盯 DevTools Elements 里 `.fc-career-pick` 的 class 序列：`appendChild` 时无
     `is-open`，下一帧加上；关闭时加 `is-closing`，180ms 后整个节点才消失。
     动效细节用 Animations 面板 25% 慢放看。
   - 预期：打开是遮罩淡入 + 面板从下方约 14px、0.98 缩放归位；关闭是反向淡出，
     **节点必须在淡出结束之后才被摘掉**。CSS 过渡时长要 ≤ JS 那 180ms，写长了会被中途
     摘节点，表现为淡到一半突然闪断。
   - 玻璃底：`.fc-career-pick__panel` 的计算样式 `background` 不能是 `transparent`，
     背后仪表盘的数字与日志不得透过来压在卡的正文上。
   - 三条关闭路径（选中轨道 / Escape / 点遮罩，后两条限手动入口）都要走同一段收尾动画，
     不能有一条直接闪断。
   - 动画期间连点：R19 的 `settled` 守卫仍在，180ms 内连点不应弹出第二张卡，
     也不应产生第二条日志或第二次入账。

2. **闯城卡与选轨卡手感一致**
   - 两张卡共用 `.fc-career-pick` 系列 class，淡入、归位、淡出应当逐帧一致；
     并排录两段慢放对比，任何一边单独快半拍都算没对齐。
   - 时序上有一处是预期而非掉帧：主目标的系统日志在动画**开始前**就写进 `run.log`，
     但 `render` / `renderLog` 排在 180ms 之后，所以目标 HUD 与日志行是等卡淡完才出现的。
   - Console 不应出现 `FC.overlay: modal is already open`。选轨卡的 Promise 在
     `FC.overlay.pop` 之后才 resolve，闯城卡要等它彻底退栈再 push，两张卡不能叠在一起。

3. **reduced-motion 兜底**
   - DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`
     （或直接改系统设置），两张卡各弹一次。
   - 预期：卡片直接到位，没有淡入、没有位移与缩放；关闭仍要等 180ms（`setTimeout` 不看
     媒体查询），这段时间遮罩已经不可见但还在拦点击，连点不应弹出第二张卡、不应多写日志。
   - **最要紧的一条**：reduce 下面板必须可见。O1 的 reduce 块只关掉了 `transition` 与
     `transform`，没有强写 `opacity: 1` —— 可见性仍然依赖 rAF 把 `is-open` 加上。核对
     方式是弹卡后在 Console 跑
     `getComputedStyle(document.querySelector(".fc-career-pick")).opacity`，必须是 `1`；
     若读到 `0`，卡就是「看不见但拦点击」的死锁，得让 reduce 块直接兜住 opacity。
   - `screens.css` 的全局 reduce 规则已把 `transition-duration` 压到 `0.05ms !important`，
     `fc-gameplay.css` 里 career-pick 自己的兜底是二重保险，两层都要在。
   - rAF 边界：卡弹出的瞬间切到别的标签页停几秒再切回来（rAF 被节流），
     回来后面板必须可见可点，不能停在透明态。

4. **闯城主目标 Escape 不关**
   - 卡弹出后连按 Escape 数次，再长按连击一次。预期：卡纹丝不动，不加 `is-closing`，
     不淡出，不选中任何目标。
   - 核对没有落目标：`JSON.parse(localStorage.getItem("fucheng.save.v1")).run.goal`
     仍为空，顶部目标 HUD 不出现，系统日志没有「主目标定为「…」」那行。
   - Escape 被 `preventDefault` 吞掉，不应穿透到背后触发别的关闭行为。
   - 点遮罩同样不落目标也不关卡（点击只认 `[data-goal]`）。
   - 刷新页面，这张卡照旧补弹（`needsChallengeGoal` 只看 `run.goal`）。
   - 对照回归：选轨卡语义本轮不动 —— boot 自动流按 Escape 仍落推荐轨，手动入口按
     Escape 取消且不入账（R19 / §42），不能被本轮改动带走。

5. **Tab trap**
   - 闯城卡弹出时焦点在 `.fc-career-pick__panel`（`tabindex="-1"`）。按 Tab 依次进四张
     目标卡，走到最后一张再按 Tab 应回到第一张；Shift+Tab 从第一张回到最后一张。
   - 全程用 `document.activeElement` 核对焦点，不得落到背后仪表盘的按钮，也不得跳去
     浏览器地址栏。`FC.overlay.trap` 只在首/末元素上 `preventDefault`，中间几次 Tab 走
     浏览器默认顺序是正常的，只要不出卡即可。
   - 焦点停在某张目标卡上按 Enter 或 Space，应等价于点击（原生 `button`），走正常
     `finish` 流程。
   - 选轨卡把同样两条再走一遍（它的 trap 从 R6 就有，本轮只是别弄丢）。
   - 关闭后焦点回到打开前的元素（`FC.overlay.pop` 的 `returnFocus`）：手动入口关掉后，
     焦点应回到「选择职业轨道」按钮上。

6. **390px 可见性**
   - 设备模式 `390 × 844`，两张卡各看一遍：面板宽度 `min(520px, 100%)` 减掉外层 16px
     内距后不贴边、不横向溢出，四张目标卡的名称与说明不截断。
   - 高度是本档的真风险点：`.fc-career-pick` 用 `place-items: center` 居中，内容一旦比
     视口高就会同时溢出上下两端，而 body 又被 `fc-scroll-lock` 锁住，玩家够不到最后一张
     目标即软锁。O1 已给面板加 `max-height: 92vh` + `overflow: auto`，要验的是它真的
     生效：横屏 `844 × 390` 下闯城卡应当在面板**内部**出现滚动条、四张目标卡都能滚到并
     点中，背后页面不跟着滚。
   - 遮罩仍要点得到（选轨手动入口靠它取消）；闯城卡点遮罩不关是预期行为，不算 bug。
   - 关卡后布局不跳；目标 HUD 出现时不把行动区挤出屏。

7. **全流程回归（桌面 + 390px 各一遍）**
   - 闯城档走：开局补弹 → 选轨（先取消一次再选定）→ 闯城主目标 → 合约 → 教学 →
     推进月份 → 推进 6 月。
   - 预期：弹窗顺序与 R19 一致，Console 无 error、无未处理 Promise rejection、无 404、
     无 `FC.overlay: modal is already open`。
   - 对 §43 三条勾选条件收口：两张卡动效一致、面板玻璃底、闯城卡 Escape 不可取消且
     Tab / Shift+Tab 在卡内循环。
