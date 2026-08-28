# R21 · ACCEPTANCE §44 条文草稿 + 走查步骤（F3）

> 交付物：可直接粘贴进 `games/fucheng-life/ACCEPTANCE.md` 的第 44 条整段条文，
> 以及逐条人工走查步骤。落地由 R21-G2 执行；本文件只是草稿，
> **不改 ACCEPTANCE.md 本体**。
> 写稿时 G2 已把 §44 **五行全量**落进 ACCEPTANCE.md（`5a8d81c`），与 R20 只先落
> 三行不同，无需补行。下方「一」与已落文本**逐字一致**
> （行尾硬换行双空格：第 1–4 行有、末行无，五行均已核对）。
> G1 的 `r21-focus-trap.test.js` 写稿时已落地、已注册进 runner 且**绿灯**：
> HEAD `a2a199d` 实测全量 **32 passed / 0 failed**——中途有过一次红灯插曲，
> 已由 `96d467b` 修掉，来龙去脉见 44-g，§44 末行**可以放心保留**。
> 勾选时机沿用惯例：条文落地即 `[ ]`，待十路全绿 + 本稿走查签核后另一笔
> commit 勾选（参照 R17 的 `2c57bcc → 130a317`；R19 / R20 也是这么走的）。

---

## 一、粘贴进 ACCEPTANCE.md 的整段条文

```markdown
44. [ ] **R21 · 焦点 trap 闭合 + 闯城 Esc 反馈**  
    事件、选轨与闯城三张卡的焦点保持闭合：开卡后的首击 Shift+Tab 不泄焦；焦点位于卡根节点或卡内可聚焦项之外时，Shift+Tab 回到末项、Tab 进入首项。  
    闯城选择卡按 Escape 仍不可取消关闭，但面板给出一次弱反馈，lede 明示「必须选定才继续」；`prefers-reduced-motion: reduce` 下无动画，提示仍保留。  
    选轨日志使用 `careerTracks` 的中文 `name`，不再显示英文 slug。  
    `node games/fucheng-life/tests/r21-focus-trap.test.js` 与 `./scripts/run-fucheng-life-tests.sh` 全绿。
```

- 五行与已落文本（`5a8d81c`）逐字一致：标题与前三行正文行尾均为硬换行
  双空格，末行（测试命令行）行尾**无**双空格——与 §40 / §42 / §43 同款，
  **不要回改**。
- 覆盖对位：派单目标 1（trap 闭合）↔ 第 2 行；目标 2（Esc 弱反馈 + lede +
  reduce）↔ 第 3 行；目标 3（选轨中文名）↔ 第 4 行；目标 4（测试）↔ 第 5 行。
  四个目标全部入条文，无需增删。
- 措辞小疵（不强求）：第 3 行「必须选定才继续」是**转述**，实际 lede 末句为
  「必须选定一张才能往下走。」G1 的断言只要求 lede 含「必须」族关键词，
  两版都过；若 G2 想改成逐字引用可顺手带走，不值得单开一笔。
- 条目保持 `[ ]`。手工走查未做，勾选留到十路全绿 + 走查签核后另一笔
  commit。（发稿前 F2 已落 `4f2e213`，本稿落地即十路齐；测试全绿，
  只差走查签核。）

---

## 二、逐条人工走查（44-a…44-g，供 G2 / 验收人参考，不必粘贴）

从仓库根目录 `python3 -m http.server 8000`，Chrome 打开
<http://127.0.0.1:8000/games/fucheng-life/>，先清站点数据并开 Console；
移动端项目用 DevTools 设备模式，视口 `390 × 844`。

### 准备：造一张随叫随到的闯城卡

1. 出身页把玩法切到「闯城 60 月」，选出身、分配属性、开始人生。
2. 进仪表盘：boot 链先弹选轨卡（不可取消，44-b 用），选定后闯城主目标卡
   接着弹（44-a / 44-c / 44-d / 44-e 的主舞台）。
3. 想反复弹闯城卡：清站点数据重开，或 Console 里把主目标打回未选
   （R20 稿同款）：

   ```js
   var s = FC.read();
   s.run.goal = null;
   FC.write({ run: s.run });
   location.reload();
   ```

4. 事件卡（44-b）用「推进一月」触发 O1 弹窗；慢放 shake 用 DevTools →
   More tools → Animations，速度 25%。

### 44-a 闯城卡首击 Shift+Tab 不泄焦（本轮主修）

1. 卡弹出后 Console 核对 `document.activeElement.className`，应为
   `fc-career-pick__panel`——焦点在卡根（`tabindex="-1"`），**不在** trap 的
   items 集合里。这正是 R20 泄焦的起手式。
2. 首击 **Shift+Tab**：焦点必须落到**最后一张**目标卡（四张：落户上岸 /
   还清负债 / 向上爬一层 / 攒够首付，以 DOM 序末位为准），用
   `document.activeElement` 核对；不得落到背后仪表盘按钮，也不得跳去浏览器
   地址栏。R20 版 trap 只认「焦点在首/末项」两种情况，这一击会直接漏出去；
   O1 本轮补的分支是 `items.indexOf(activeElement) < 0 → preventDefault +
   (shift ? last : first)`。
3. 重弹一次卡，首击 **Tab**：焦点落到第一张目标卡。
4. 焦点已在 items 内时别过度期待：中间项的 Tab / Shift+Tab 走浏览器默认
   顺序（trap 不接管）；首项 Shift+Tab 绕回末项、末项 Tab 绕回首项——
   这两条 R20 就有，本轮只是别退化。
5. 焦点在 items 之外（非卡根）也要同吃：Console 跑
   `document.querySelector(".fc-career-pick__panel").focus()` 再按 Tab，
   仍应进首项。

### 44-b 选轨卡与事件卡同吃（「三张卡」逐张过）

1. 选轨卡：弹出时同样聚焦 panel（`fc-career.js` 打开即 `panel.focus()`），
   首击 Shift+Tab → 末轨「零工线」、首击 Tab → 首轨「职员线」。
2. 事件卡：非红线 O1 开卡即聚焦第一个选项（焦点**在** items 内），首击
   Shift+Tab 走的是旧「首项绕末项」分支，同样不泄焦。要单验新分支：
   Console 把焦点挪到卡根（`document.querySelector(".fc-event__card").focus()`）
   再按 Tab / Shift+Tab。
3. letter（账单信纸）与 confirm（快进确认）走同一个 `FC.overlay.trap`，
   O1 的改动一处生效五处；抽查一张信纸即可，Tab 环应在「签字 / 撕掉」
   之间闭合。
4. 已知残留（低，不挡门禁）：红线事件 3 秒冷静期内所有选项 `disabled`，
   trap 的 items 查询排除 disabled 按钮，集合为空时 trap 直接 return——
   这 3 秒内 Tab 理论上仍可泄焦。冷静期本就吞 Esc、禁点击，窗口极短，
   本轮不修，记档待后续轮（见「三」备注）。

### 44-c 闯城 Esc 弱反馈：吞键但有回音

1. 卡弹出后按一次 Esc：面板横向 shake 一次（0.2s，`translateX`
   −5 → +4 → −2px 阻尼收敛），不发光、不换色；卡**不关**、**不落目标**——
   `FC.read().run.goal` 仍为空，日志无「主目标定为」行，顶部目标 HUD
   不出现。
2. Elements 盯 `.fc-career-pick__panel` 的 class：Esc 瞬间 `is-esc-pulse`
   先摘、强制回流（`void panel.offsetWidth`）、再挂上；约 320ms 后被
   setTimeout 摘掉（回调靠 gen 计数自作废，见 44-g 红灯插曲）。
3. 连按猛敲 Esc：每一击都重新起拍（动画从头放），不叠加、不卡死，
   Console 全程无报错。
4. 选定目标后的 180ms 收尾窗口内再按 Esc：不再抖（`pulseEsc` 先查
   `settled`），也不得二次结算。
5. 遮罩点击照旧不落目标、不关卡（host 点击只认 `[data-goal]` 按钮）——
   §43 语义，本轮只加了键盘回音，指针路径不变。

### 44-d lede 明示「必须选定才继续」

1. lede 全句：「选一个主目标。期满按完成度与生存质量打分，不是混满月数
   就算赢。**必须选定一张才能往下走。**」末句是本轮 O2 补的——Esc 被吞时
   玩家抬眼就能看到「为什么关不掉」，shake 管「听见了」，lede 管「为什么」。
2. 与 §44 条文引文的措辞差异见「一」节备注，转述不算失配。

### 44-e `prefers-reduced-motion` 下无动画、提示仍保留

1. DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`，重弹
   闯城卡按 Esc：面板**纹丝不动**（O3 单列的 reduce 块 `animation: none`），
   但按键仍被吞——不关卡、不落目标；lede 原地可读，弱反馈的语义由文案
   兜底。这是条文第 3 行后半句的全部内容。
2. 顺手了结 R20 的记档回归项（43-e 第 2 条）：reduce 下弹卡**瞬间** Console 跑
   `getComputedStyle(document.querySelector(".fc-career-pick")).opacity`，
   必须是 `"1"`。R20 时可见性依赖 rAF 挂 `is-open`，有「看不见但拦点击」的
   软锁风险；本轮 O5（`ee90bb7`）用 `.fc-career-pick:not(.is-closing)
   { opacity: 1 }` 兜住了。卡弹出瞬间切走标签页再切回，面板也必须可见可点。
3. 关闭路径不受兜底误伤：选定目标后 `is-closing` 被 `:not()` 排除，reduce 下
   淡出即时完成，180ms 计时器窗口内连点不得二次结算（§43 回归）。

### 44-f 选轨日志中文名

1. 新局选轨（boot 自动弹或手动入口均可），选「技术线」后日志应出现
   「你选择了「技术线」轨道作为起点。」四轨对照 `gameplay-pack.json`：
   staff→职员线、tech→技术线、sales→业务线、gig→零工线——日志里**不得**
   再出现 staff / tech / sales / gig 这类英文 slug。
2. 名字查 `FC.Sim.pack.careerTracks` 的 `name`；pack 未载或 id 对不上时
   回退印 id 本身（宁可 slug 也不印 undefined）——这是兜底不是回归，
   正常路径永远走中文名。
3. 职场 Tab 标题里的轨道名与日志一致（`renderTabsExtra` 同源取名）。

### 44-g 自动化门禁

```bash
node games/fucheng-life/tests/r21-focus-trap.test.js
./scripts/run-fucheng-life-tests.sh
```

两条命令退出码均应为 `0`。写稿时（HEAD `a2a199d`）实测专项绿灯、全量
**32 passed / 0 failed**；runner 第 60 行已注册（标签
`R21 overlay focus trap and challenge Escape pulse`）。

红灯插曲（已修，留档供追溯）：`1a46b58` 时全量曾是 31 passed / **1 failed**，
倒下的不是 r21 而是 **r20-picker-motion**——O2 初版 `pulseEsc` 调了
`clearTimeout`，而 R20 测试的 vm 沙箱只注入了 `setTimeout`，纯沙箱缺桩、
浏览器无恙。O2 在 `96d467b` 改为 gen 计数器让旧回调自作废，顺带少了一个
可能炸掉整条键盘分发链的全局依赖，两侧测试都过。若后续轮再给
`maybeOfferChallengeGoal` 加定时器 API，记得同时看一眼 r20 / r21 两个
沙箱的注入清单。

G1 覆盖面：trap 六向断言（卡根 / 外部元素 / 首项 / 末项 × Tab / Shift+Tab，
全部 `preventDefault` + 落点核对）、items 选择器只吃 enabled tabbable、
challenge Esc 的 `preventDefault` + `is-esc-pulse` 挂/摘 + 正延迟定时器 +
不落目标不写日志不 pop 不 render、lede 含「必须」族关键词、选轨日志
`trackName` 插值且禁 bare id。真实浏览器的焦点走向、shake 手感与 reduce
可见性仍靠上面的手工场景。

### 桌面 + 390px 回归（别被本轮改动带走）

- §42 语义不动：boot 自动选轨按 Esc 仍落**推荐**轨；手动入口按 Esc / 点遮罩
  取消且不入账、不写 `null` 日志。
- §43 语义不动：两张卡开合动效与玻璃底照旧；闯城卡遮罩点击不关卡。
- 设备模式 `390 × 844` 把 44-a / 44-c / 44-f 各重走一遍：shake 位移小
  （±5px），小屏上也应可辨；面板不溢出、目标卡不截断。
- 全流程（闯城档「选轨 → 主目标 → 合约 → 教学 → 推进 6 月」）Console
  无 error、未处理 Promise rejection、404，也无
  `FC.overlay: modal is already open`。

---

## 三、与现码的对齐说明（写给 G2 / 合入责任人）

写稿时分支 `cursor/fucheng-r21-focus-trap-fa72` HEAD 为 `a2a199d`，
十路中 O1–O5、G1、G2、F1 已落；发稿前 F2 也落了（`4f2e213`，playfeel
风险稿），本稿落地即十路齐。全量测试实测 **32 passed / 0 failed**：

- **O1 已落**（`12d7a13`，`fc-events.js`）：`FC.overlay.trap` 新增
  「activeElement 不在 items 内」分支——`preventDefault` 后 Shift+Tab 聚末项、
  Tab 聚首项；原首/末绕环分支保留。事件 modal / letter / confirm / 选轨 /
  闯城五处共用这一个 trap，一次改动全吃（条文只点名「三张卡」，
  letter / confirm 属顺带收益）。
- **O2 已落**（`2b627f3` + 修补 `96d467b`，`dashboard-app.js`）：
  `maybeOfferChallengeGoal` 新增 `pulseEsc`（摘类 → 强制回流 → 挂类 →
  320ms 后摘，gen 计数防旧回调误摘），Esc 分支从「只 preventDefault」改为
  「preventDefault + pulseEsc」；lede 末尾补「必须选定一张才能往下走。」
  不可取消语义未动。
- **O3 已落**（`04f15cb`，`fc-gameplay.css`）：`fc-career-pick-esc`
  keyframes（0.2s 阻尼横移）+ `.is-esc-pulse` 触发规则（挂 panel 或挂 host
  都吃）+ **单列** reduce 块 `animation: none`——特意与下方 picker reduce
  规则区分开，避开 O5 的并行改动，两块 reduce 无冲突。
- **O4 已落**（`bb40db0`，`dashboard-app.js`）：`maybeOfferCareerTrack`
  的日志名从 id 改为查 `FC.Sim.pack.careerTracks` 的 `name`，查不到回退 id。
  与 O2 同文件不同函数区，实查无互踩。
- **O5 已落**（`ee90bb7`，`fc-gameplay.css`）：没走 skip，在既有 picker
  reduce 块里补了 `.fc-career-pick:not(.is-closing) { opacity: 1 }`——
  正是 R20 稿 43-e 第 2 条记档的「reduce 下面板可能透明拦点击」回归项，
  本轮销账（走查见 44-e#2）。
- **G1 已落且绿**（`1a46b58`，`tests/r21-focus-trap.test.js` + runner 第 60 行）：
  覆盖面见 44-g。R19 踩过的 `functionSection` 下界问题继续安全——
  `maybeOfferChallengeGoal` 后面还有 `renderGoalHud` 兜住 `indexOf` 下界。
  另：它的 vm 沙箱**有**注入 `clearTimeout`，红灯插曲倒下的是 R20 的沙箱，
  修法（`96d467b`）选择了改产品侧去依赖而非补 R20 桩，两个沙箱现状均过。
- **G2 已落**（`5a8d81c`，ACCEPTANCE §44 五行全量）：与本稿「一」的
  代码块逐字一致，`[ ]` 状态正确；无需补行，只等十路全绿 + 走查签核后
  勾选。
- **备注（不强求）**：① §44 第 3 行「必须选定才继续」是转述非逐字引用
  （实际 lede 见 44-d），G2 可顺手改成逐字、也可保持；② 红线冷静期
  items 空集时 trap 无接管、存在约 3 秒的理论泄焦窗（44-b#4），本轮
  范围外，建议记入下一轮候选池；③ `fc-career.js` reduce 下关闭仍空等
  180ms（R20 稿已记，无恙），继续不修。

---

model slug: `claude-fable-5-thinking-xhigh`
