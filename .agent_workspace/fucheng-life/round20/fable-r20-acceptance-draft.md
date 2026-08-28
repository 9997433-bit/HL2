# R20 · ACCEPTANCE §43 条文草稿 + 走查步骤（F3）

> 交付物：可直接粘贴进 `games/fucheng-life/ACCEPTANCE.md` 的第 43 条整段条文，
> 以及逐条人工走查步骤。落地由 R20-G2 执行；本文件只是草稿，
> **不改 ACCEPTANCE.md 本体**。
> 写稿时 G2 已把 §43 前三行落进 ACCEPTANCE.md（`221842f`），下方文本与已落内容
> **逐字一致**（含行尾硬换行双空格，三行均已核对）。
> 与 R19 不同：G1 的 `r20-picker-motion.test.js` 写稿时已经落地且**绿灯**
> （HEAD `27723c5` 实测全量 `31 passed / 0 failed`），§43 末行**可以立即粘贴**，
> 不必等修复。
> 勾选时机沿用惯例：条文落地即 `[ ]`，待十路全绿 + 本稿走查签核后另一笔
> commit 勾选（参照 R17 的 `2c57bcc → 130a317`；R19 §42 也是这么走的）。

---

## 一、粘贴进 ACCEPTANCE.md 的整段条文

```markdown
43. [ ] **R20 · 选轨/闯城选择卡开合动效 + 玻璃底**  
    选轨与闯城选择卡具备一致的开合动效，并使用玻璃底视觉。  
    闯城选择卡按 Escape 不可取消关闭；按 Tab 或 Shift+Tab 时，焦点保持在卡内循环（Tab trap）。  
    `prefers-reduced-motion: reduce` 下开合即时完成、面板保持可见，选卡与放行不受影响。  
    `node games/fucheng-life/tests/r20-picker-motion.test.js` 与 `./scripts/run-fucheng-life-tests.sh` 全绿。
```

- 前三行与已落文本（`221842f`）逐字一致，行尾均为硬换行双空格，**不要回改**。
- 第 4 行是本稿新增建议：派单目标 1 明确点名 `prefers-reduced-motion` 兜底，
  G1 已为 reduce 块写了断言，O4 场景 3 又把「reduce 下面板必须可见」列为最要紧
  的一条——值得在门禁条文里占一行。行尾带硬换行双空格。
- 第 5 行按 §39–§42 惯例点名专项命令 + 全量脚本，行尾**无**双空格
  （已核对 §40 / §42 末行同款）。测试已绿，这行不用等。
- 若 G2 想保持条目紧凑，可只补第 5 行（第 4 行可并入走查不上条文）；
  但第 5 行必须落——§30 起每条都以测试命令行收口，缺了会破格式惯例。
- 条目保持 `[ ]`。写稿时 F1 / F2 / O5 尚未落地，手工走查也未做，
  勾选留到十路全绿 + 走查签核后另一笔 commit。

---

## 二、逐条人工走查（43-a…43-f，供 G2 / 验收人参考，不必粘贴）

从仓库根目录 `python3 -m http.server 8000`，Chrome 打开
<http://127.0.0.1:8000/games/fucheng-life/>，先清站点数据并开 Console；
移动端项目用 DevTools 设备模式，视口 `390 × 844`。
场景对应关系：`round20/R20_TEST_NOTES.md` 场景 1↔43-a、2↔43-b、4↔43-c、
5↔43-d、3↔43-e、6/7↔回归段。

### 准备：一次进门看全两张卡

1. 出身页把玩法切到「闯城 60 月」，选出身、分配属性、开始人生。
2. 进仪表盘：boot 链先弹选轨卡（不可取消），选一条轨道 → 收尾动画放完 →
   闯城主目标卡接着弹。两张卡一次进门看全。选轨卡的 Promise 在
   `FC.overlay.pop` 之后才 resolve，闯城卡要等它彻底退栈再 push——
   Console 全程不应出现 `FC.overlay: modal is already open`。
3. 想反复弹闯城卡（43-b…43-e 都用得上）：清站点数据重开，或 Console 里
   把主目标打回未选：

   ```js
   var s = FC.read();
   s.run.goal = null;
   FC.write({ run: s.run });
   location.reload();
   ```

   （`needsChallengeGoal` 只看 `challengeMonths > 0 && !run.goal`；它是 boot
   链里唯一不被补弹推迟的一张卡，照弹是预期。）
4. 慢放工具：DevTools → More tools → Animations，速度调 25%。

### 43-a 选轨卡开合动效 + 玻璃底

1. Elements 面板盯 `.fc-career-pick` 的 class 序列：`appendChild` 那一刻
   **没有** `is-open`，下一帧（rAF）才加上。打开动效 = 整层 opacity 0→1
   （0.18s）+ 面板从 `translateY(14px) scale(0.98)` 归位（0.22s）。
2. 选中一条轨道关闭：先加 `is-closing`（整层淡出 0.18s，面板 0.18s 落到
   `translateY(8px) scale(0.99)`），**180ms 后节点才被摘掉**——不允许淡到
   一半闪断。CSS 收尾时长 ≤ JS 的 180ms 是 O3 skip 笔记里定的对齐前提，
   O1 已按 0.18s 落，走查确认观感即可。
3. 玻璃底：`getComputedStyle(document.querySelector(".fc-career-pick__panel")).backgroundColor`
   不能是透明（`--fc-glass-2-bg` = `rgba(11, 14, 26, 0.65)`）；背后仪表盘的
   数字与日志不得透过来压在卡的正文上。遮罩为 `rgba(2, 4, 10, 0.82)` +
   `blur(10px)`；在 Elements 里把 `.fc-career-pick__scrim` 的
   `backdrop-filter` 勾掉，正文仍应清晰可读（P0-2 同款要求）。
4. 动画期间连点：180ms 收尾窗口内连点轨道卡 / 连按 Esc，R19 的 `settled`
   闸仍在——只结算一次，不得二次日志、二次入账，也不得叠出第二张卡。
5. （可选）手动入口的 Esc / 遮罩取消路径也走同一段收尾动画：造档方法见
   `round19/fable-r19-acceptance-draft.md`「准备」节，三条关闭路径
   （选中 / Esc / 遮罩）不能有一条直接闪断。取消语义本身归 §42 回归，
   本条只看动效。

### 43-b 闯城卡与选轨卡手感一致

1. 闯城卡复用同一套 `.fc-career-pick` class（O1 一次改动双份收益）：
   淡入、归位、淡出应与选轨卡逐帧一致，Animations 面板慢放对比，
   任何一边单独快半拍都算没对齐。
2. 预期而非缺陷：主目标的系统日志在动画**开始前**就写进 `run.log`，
   但 `render` / `renderLog` 排在 180ms 之后——目标 HUD 与「主目标定为「…」」
   日志行等卡淡完才出现，不算掉帧。
3. 点中某张目标卡：`is-closing` → 180ms → 卸 DOM → HUD 与日志出现，
   顺序不得颠倒。

### 43-c 闯城卡 Escape 不可取消 + 遮罩不落目标

1. 卡弹出后连按 Escape 数次，再长按连击一次。预期：卡纹丝不动——
   不加 `is-closing`、不淡出、不选中任何目标；`FC.read().run.goal` 仍为空；
   日志没有「主目标定为」行；顶部目标 HUD 不出现。Escape 被
   `preventDefault` 吞掉，不应穿透到背后触发别的关闭行为。
2. 点遮罩：同样不落目标、不关卡（host 的点击只认 `[data-goal]` 按钮）。
   这是预期行为，不算 bug。
3. 刷新页面：这张卡照旧补弹。
4. 对照回归（别被本轮改动带走）：选轨卡语义不动——boot 自动流按 Escape
   仍落**推荐**轨；手动入口按 Escape 取消且不入账（§42，R19 语义）。

### 43-d Tab trap + 焦点归还

1. 闯城卡弹出时焦点在 `.fc-career-pick__panel`（`tabindex="-1"`）。按 Tab
   依次进四张目标卡；走到最后一张再按 Tab 应回到第一张，Shift+Tab 从
   第一张回到最后一张。全程用 `document.activeElement` 核对，不得落到
   背后仪表盘按钮，也不得跳去浏览器地址栏。`FC.overlay.trap` 只在首/末
   元素上 `preventDefault`，中间几次 Tab 走浏览器默认顺序属正常。
2. 焦点停在某张目标卡上按 Enter 或 Space，应等价于点击（原生 `button`），
   走正常 `finish` 流程。
3. 选轨卡把同样两条再走一遍（它的 trap R6 起就有，本轮只是别弄丢）。
4. 关闭后焦点回到打开前的元素（`FC.overlay.pop` 的 `returnFocus`）：
   手动入口场景下应回到「选择职业轨道」按钮。

### 43-e `prefers-reduced-motion` 兜底

1. DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`，
   两张卡各弹一次。预期：直接到位——没有淡入、没有位移与缩放。
2. **最要紧的一条**：弹卡后 Console 跑
   `getComputedStyle(document.querySelector(".fc-career-pick")).opacity`，
   必须是 `"1"`。O1 的 reduce 块只关掉 `transition` 与 `transform`，
   没有强写 `opacity: 1`，可见性仍依赖 rAF 把 `is-open` 加上；
   若读到 `0`，卡就是「看不见但拦点击」的软锁，需让 reduce 块直接兜住
   opacity——发现即记回归项，修复不在本轮范围。
3. 关闭仍等 180ms（`setTimeout` 不看媒体查询）：这段时间遮罩已不可见但
   还在拦点击，连点不得二次结算、不得弹出第二张卡。
4. rAF 节流边界：卡弹出的瞬间切到别的标签页停几秒再切回，面板必须
   可见可点，不能停在透明态。
5. 双层保险都要在：`screens.css` 的全局 reduce 规则（`transition-duration`
   压到 `0.05ms !important`）+ `fc-gameplay.css` 里 career-pick 自己的
   reduce 块。

### 43-f 自动化门禁

```bash
node games/fucheng-life/tests/r20-picker-motion.test.js
./scripts/run-fucheng-life-tests.sh
```

两条命令退出码均应为 `0`。写稿时（HEAD `27723c5`）实测专项绿灯、全量
**31 passed / 0 failed**——与 R19 不同，本轮无红灯待修，§43 末行可即刻粘贴。
G1 覆盖面：CSS 侧断言 `is-open` / `is-closing` / 玻璃 token / 收尾
`transition-duration: 0.18s` / reduce 块齐备；`fc-career.js` 的 `close`
仍走 `is-closing` + `setTimeout(done, 180)`；vm 沙箱直跑
`maybeOfferChallengeGoal` 验 Escape 吞掉不结算、Tab 进 `FC.overlay.trap`、
遮罩点击不落目标、`is-closing` 后 180ms 才卸 DOM / `pop` / resolve。
静态断言守得住类名与时序的「形状」，动效手感、reduce 可见性与 390px
仍靠上面的手工场景。

### 桌面 + 390px 回归

- 设备模式 `390 × 844`，两张卡各看一遍：面板 `min(520px, 100%)` 减外层
  16px 内距后不贴边、不横向溢出，四张目标卡名称与说明不截断。
- 高度是真风险点：`.fc-career-pick` 用 `place-items: center` 居中且 body
  被 `fc-scroll-lock` 锁住，内容超高会上下同时溢出。O1 已给面板加
  `max-height: 92vh` + `overflow: auto`，要验它真的生效：横屏 `844 × 390`
  下闯城卡应在面板**内部**出现滚动条，四张目标卡都滚得到、点得中，
  背后页面不跟着滚。
- 全流程各走一遍（桌面 + 390px）：闯城档「选轨（可先取消一次再选定）→
  闯城主目标 → 合约 → 教学 → 推进月份 → 推进 6 月」。弹窗顺序与 R19 一致；
  关卡后布局不跳，目标 HUD 出现时不把行动区挤出屏；Console 无 error、
  未处理 Promise rejection、404，也无 `FC.overlay: modal is already open`。

---

## 三、与现码的对齐说明（写给 G2 / 合入责任人）

写稿时分支 `cursor/fucheng-r20-picker-motion-fa72` HEAD 为 `27723c5`，
十路中 O1–O4、G1、G2 已落，F1 / F2 / O5 未落；全量测试实测
**31 passed / 0 failed**：

- **O1 已落**（`518bb3c`，`fc-gameplay.css`）：`.fc-career-pick` 基态
  `opacity: 0` + `0.18s var(--ease-out)`，`is-open` 归 1、`is-closing` 回 0；
  面板 `translateY(14px) scale(0.98)` 起手 `0.22s` 归位，关闭改
  `0.18s` 落到 `translateY(8px) scale(0.99)`——收尾 0.18s ≤ JS 180ms，
  遵守了 O3 定的对齐前提（开场 0.22s 不受计时器约束，无碍）。玻璃底走
  `--fc-glass-2-bg` + `--shadow-lift` + `--fc-glass-highlight`（都在
  `fc-tokens.css`），顺手补了 `max-height: 92vh` + `overflow: auto`。
  reduce 块关掉 transition 与 transform（未兜 opacity，见 43-e 第 2 条）。
- **O2 已落**（`0836421`，`dashboard-app.js`）：`maybeOfferChallengeGoal`
  改为先建节点再挂事件；`FC.overlay.push` 成功后才挂 `onKey`
  （Escape 只 `preventDefault` 不关卡、Tab 交 `FC.overlay.trap(panel, e)`）；
  聚焦 panel；rAF 加 `is-open`；`finish` 先写日志再加 `is-closing`，
  180ms 后才卸 DOM、`pop`、`render`。遮罩点击保持不落目标（只认
  `[data-goal]`）。
- **O3 已落**（`8e0dedd`，skip 笔记）：`fc-career.js` 关闭时序已是目标形态
  （`is-closing` → `setTimeout(done, 180)` → 卸 DOM/pop/resolve），无需改动；
  给 O1 定了「CSS 收尾 ≤180ms」前提（已被遵守）。附带观察：reduce 下
  `fc-career.js` 仍空等 180ms（无 `soft` 短路），视觉无碍、仅多一次延迟，
  本轮不修。
- **O4 已落**（`d2359f7`，`round20/R20_TEST_NOTES.md`）：七个场景与本稿
  43-a…43-e 及回归段对得上（映射见「二」开头）；reduce 下 opacity 可见性
  检查、rAF 节流边界、844×390 面板内滚动这三处坑均出自该笔记。
- **O5 未落**（写稿时）：390px 可见性路。O1 已把 `max-height` / `overflow`
  补进面板，O4 场景 6 已覆盖走查——O5 大概率 skip，落地后核对其结论与
  本稿回归段不冲突即可。
- **G1 已落且绿**（`27723c5`，`tests/r20-picker-motion.test.js` + runner）：
  runner 第 59 行已注册（标签 `R20 career-pick motion and challenge Escape`）。
  值得点名：R19 走查里踩过的 `functionSection` 边界 bug 这次没有复发——
  `maybeOfferChallengeGoal` 后面还有 `renderGoalHud`，`indexOf("\n  function ")`
  取得到下界，断言安全。
- **G2 已落**（`221842f`，ACCEPTANCE §43 前三行）：与本稿「一」前三行
  逐字一致，`[ ]` 勾选状态正确；按「一」补第 4–5 行即可（第 4 行行尾双空格、
  第 5 行无），测试已绿不必等。勾选留到十路全绿 + 走查签核后另一笔 commit。
- **备注（不强求）**：O2 代码注释里写「这三张牌」，实际
  `FC.Sim.CHALLENGE_GOALS` 是四张（落户上岸 / 还清负债 / 向上爬一层 /
  攒够首付），O4 笔记与本稿均按四张写。注释小疵不影响行为，
  后续轮次顺手改一个字即可，本轮不必为它动 `dashboard-app.js`。

---

model slug: `claude-fable-5-thinking-xhigh`
