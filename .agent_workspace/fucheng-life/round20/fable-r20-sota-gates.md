# R20 SOTA 门禁 · 选择卡开合动效 + 玻璃底（.fc-career-pick 双卡）+ 闯城 Esc 吞掉 / Tab trap

> 作者：R20-F1（fable）。本文是 R20 的验收 SSOT：下列门禁**全部通过**方可合入 / 勾上 ACCEPTANCE §43。
> 对象代码：`games/fucheng-life/css/fc-gameplay.css`（`.fc-career-pick` 动效 + 玻璃底 + reduced-motion，O1 可写）、
> `js/dashboard-app.js` 的 `maybeOfferChallengeGoal`（Esc 吞掉 / Tab trap / `is-closing` 收尾，O2 可写）、
> §43 条文（G2）。**要点**：选轨卡与闯城卡共用 `.fc-career-pick` 根类——`fc-career.js` 早在 R6 起就打
> `is-open` / `is-closing` 类但 CSS 无对应规则（一直是 no-op），O1 一次补规则、两张卡同吃；闯城卡则由
> O2 补上此前完全缺失的键盘接线与关闭动效。
> 编写时分支快照：O1 CSS（`518bb3c`）、O2 JS（`0836421`）、O3 skip 说明（`8e0dedd`，fc-career.js 关闭
> 时序已是 180ms 对齐、无需改）、G2 §43 条文（`221842f`，未勾）已提交；G1 r20 测试、O4 TEST_NOTES、
> O5、F2 / F3 编写本文时尚欠——当前 runner 未挂 r20 行，全量套件应仍为 R19 的 30 项绿。
> 门禁按**行为**验收，不锁实现细节（具体缓动曲线 / 数值可调，时序契约不可破）。
> 依据：`round20/R20_DISPATCH.md`；R19 门禁 G-2（is-closing 收尾一套走）与 G-7（boot 流 Esc 语义）。

## 0. 验收环境准备

- 本地起服：仓库根目录 `python3 -m http.server 8000`，打开
  `http://localhost:8000/games/fucheng-life/`（file:// 直开亦须可用，见 G-11）。
- 自动化：`./scripts/run-fucheng-life-tests.sh`；R20 断言在 `tests/r20-*.test.js`（G1 落）。
- 常用构造：
  - **闯城卡场景**：控制台 `run.challengeMonths = 60; run.goal = null; FC.write({ run: run })` 后刷新
    （`FC.Sim.needsChallengeGoal` 只看 `challengeMonths > 0 && !goal`）；需选轨已完成、无挂账，
    否则 boot 链先弹别的卡；
  - **选轨卡场景**：沿 R19 §0，`run.career.picked = false; FC.write({ run: run })` 后刷新；
  - **reduced-motion**：DevTools → Rendering → Emulate CSS media feature
    `prefers-reduced-motion: reduce`；
  - **token 探针**：`getComputedStyle(document.documentElement).getPropertyValue("--fc-glass-2-bg")`
    等，核对非空。

---

## A. 开合动效 + 玻璃底（fc-gameplay.css · O1）

### G-1 is-open / is-closing 双卡同吃，时序与 JS 180ms 契约对齐

- **操作步骤**
  1. 选轨卡场景与闯城卡场景各开一次卡，观察进场（整卡淡入 + 面板位移/缩放归位）与
     离场（反向渐隐）动效；
  2. 读 CSS：`.fc-career-pick` 初始 `opacity: 0`、`.is-open` / `.is-closing` 两态、
     `__panel` 的 transform 过渡；核对关闭过渡时长 **≤ 180ms**；
  3. 对照打开一张签约合约卡（fc-contract），肉眼比对开合手感是否同级。
- **通过标准**
  - 两张卡（选轨 + 闯城）**都**有进出场动效——共用类改一处双份收益，不许只对选轨生效；
  - 关闭过渡时长不超过 `fc-career.js` / `maybeOfferChallengeGoal` 摘节点前的 180ms 等待：
    节点**不在淡出中途被摘掉**（无半透明残影闪断）；O3 已核 JS 侧 180ms 无需动，若 CSS 想
    拉长关闭动画必须连同两处 JS 等待一起改并更新本文，不许单边改；
  - 进场用 `requestAnimationFrame` 后加 `is-open` 的既有节拍（两处 JS 均已有），CSS 初始态
    必须真的从 0 开始过渡，不许出现「先闪现再淡入」的跳帧。

### G-2 玻璃底真的糊上了：token 解析 + 面板不透底

- **操作步骤**
  1. 开卡后 Elements 面板查 `__panel` 的计算样式：`background` / `border` / `box-shadow`；
  2. §0 token 探针核对 `--fc-glass-2-bg`、`--fc-glass-highlight`、`--shadow-lift`、`--r-lg`、
     `--ease-out` 在 dashboard 页全部解析非空（`fc-tokens.css` 有定义，但 var 名打错会
     **静默失效**、面板回到透底，肉眼在深色遮罩上不易察觉）；
  3. 构造长内容（缩小视口高度）确认面板内部滚动。
- **通过标准**
  - 面板有实底玻璃观感（半透明底色 + 边线 + 提亮高光），与 `fc-contract.css` 签约卡同款
    视觉族——文字不再直接压在遮罩上；
  - 全部 var() 引用解析非空：任何一个 token 名与 `fc-tokens.css` 不符即翻红；
  - 面板 `max-height` 约束 + 内部滚动生效：小视口下三张目标卡都够得着，关闭手势不被顶出屏外。

### G-3 prefers-reduced-motion：动效全关、功能全留

- **操作步骤**
  1. §0 模拟 reduce 后重复 G-1 的开关流程（两张卡各一遍）；
  2. 读 CSS 的 `@media (prefers-reduced-motion: reduce)` 块，核对过渡与 transform 都被中和；
  3. 顺手核对既有 reduce 块（`.fc-drawer__sheet`、`.fc-coach__hole`）未被本轮改动挤掉。
- **通过标准**
  - reduce 下开卡即现、关卡即走：无淡入淡出、无位移缩放，但选中 / 关闭 / 焦点行为与
    常规完全一致（JS 仍等 180ms 再摘节点属预期，期间面板保持终态不闪烁）；
  - transform 也要归零：不许出现「过渡关了但面板停在 translateY(14px) 起始位」的半残态；
  - 既有两处 reduce 规则原样保留，无选择器覆盖顺序回退。

---

## B. 闯城卡键盘与关闭语义（dashboard-app.js · O2）

### G-4 Esc 吞掉：不关卡、不落默认目标、语义与选轨卡分家

- **操作步骤**
  1. 闯城卡场景开卡，连按数次 Esc；查卡是否仍在、`FC.read().run.goal` 是否仍空、
     日志区是否零新增；
  2. 读 `onKey`：Escape 分支 `preventDefault` 后**直接 return**，不调 `finish`；
  3. 对照组：boot 流选轨卡按 Esc 仍落推荐轨（R19 G-7 语义），确认两卡分家而非一刀切。
- **通过标准**
  - Esc 任按多少次：卡不关、`run.goal` 保持空、无「主目标定为…」日志——不可取消是
    「必须选完才放行」，**不是**「Esc = 默认给第一张」（`finish` 的 `id || goals[0].id`
    兜底不许被 Esc 路径够到）；
  - `preventDefault` 生效：Esc 不漏给页面其他 handler（无侧边抽屉 / 浏览器行为联动）；
  - 选轨卡的 Esc 语义（boot 流落推荐轨、manual 流取消）逐字不变——本轮只动闯城卡。

### G-5 Tab trap：焦点圈在卡内，开卡即获焦

- **操作步骤**
  1. 开卡后连按 Tab 直到绕圈，再 Shift+Tab 反向绕圈；观察焦点环轨迹；
  2. 读接线：`FC.overlay.push` 成功后 `top().onKey = onKey`，Tab 分支走 `FC.overlay.trap(panel, e)`；
  3. 开卡瞬间查 `document.activeElement` 是否已进面板（`panel.focus()`，tabindex="-1"）。
- **通过标准**
  - Tab 从最后一张目标卡回绕到第一张、Shift+Tab 反向——焦点**永不**落到卡后面的仪表盘
    按钮 / 工具区（改动前 onKey 整个没接，Tab 直接穿模到背景，这是本 gate 的负向对照）；
  - 开卡后焦点即在面板内，键盘玩家不用先用鼠标点一下才能操作；
  - trap 用既有 `FC.overlay.trap`，不另写第二套循环逻辑。

### G-6 关闭走 is-closing：一套收尾、连点不双落、焦点回位

- **操作步骤**
  1. 点一张目标卡，肉眼确认先渐隐再消失；关闭动画期间（约 180ms）快速连点其他目标卡；
  2. 查 `run.goal`、「闯城」日志条数、goalHud 显示；
  3. 关闭后查 DOM 无残留 `.fc-career-pick`、`document.activeElement` 回到开卡前元素
     （`FC.overlay.pop` 的 returnFocus）、页面可正常点击。
- **通过标准**
  - 收尾顺序固定：`is-closing` → 180ms → 摘 host → `FC.overlay.pop` → `render(true)` →
    `resolve(true)`——与选轨卡同一套模式，不新造第二条拆台路径；
  - `settled` 守卫扛住连点：`pickChallengeGoal` 恰跑一次、日志恰一条、`run.goal` 为**第一次**
    点的那张（动画期间的后续点击全部无效）；
  - overlay 栈收干净（`fc-scroll-lock` 解除）、焦点回位、无残留键盘钩子（关卡后按 Esc / Tab
    行为回归页面默认）。

### G-7 遮罩与面板空白：点了不落目标、不关卡

- **操作步骤**
  1. 开卡分别点 `__scrim`、面板空白处（标题 / lede 文字上）各数次；
  2. 查 `run.goal` 仍空、卡仍在、日志零新增；
  3. 读 click 接线：host 级委托 `closest("[data-goal]")`，非目标卡点击应落空。
- **通过标准**
  - 遮罩点击**不**落目标也**不**关卡——不可取消语义在鼠标手势上与 Esc 一致（对照：选轨卡
    boot 流点遮罩落推荐轨，两卡分家再核一次）；
  - 面板空白点击同样落空：只有三张 `[data-goal]` 按钮是有效手势；
  - 「点遮罩仍不落目标」是 R11 起的既有行为，本轮加了动效与键盘后不许出现回归。

### G-8 push 失败守卫与既有防御分支不炸

- **操作步骤**
  1. 读源码：`FC.overlay.push("modal", host)` 返回值被检查后才挂 onKey（与 fc-career.js 同款）；
  2. 构造冲突：先开一张 O1 事件卡（modal 已占）再控制台触发 `maybeOfferChallengeGoal` 场景，
     观察 console warn 与行为；
  3. 核对首行守卫（`needsChallengeGoal` 缺失 / 假、goals 空、`FC.overlay` 缺失）仍
     `Promise.resolve(false)` 早退。
- **通过标准**
  - push 失败（modal 已占）时不挂 onKey，不出现两张 modal 抢一个键盘的错乱；正常 boot 链
    上闯城卡弹出时刻不该有并存 modal（R17 顺序保证），此 gate 是防御性核对而非新语义；
  - 三个早退分支原样保留、都 resolve(false) 不悬挂——boot 链后续步骤照常放行；
  - 不引入「push 前 append 导致孤儿 DOM」的新软锁：若 push 失败路径可达，host 的去留
    与既有行为一致即可，按现状验收不扩权修改。

---

## C. 链路零回退

### G-9 boot 链顺序与 R19 语义不被动效波及

- **操作步骤**
  1. 闯城卡场景选定目标后，确认后续链（`maybeOfferContract` / guide 教学）仍按 R17 顺序
     跟进，不被 180ms 延迟的 resolve 吞掉；
  2. 跑 `node games/fucheng-life/tests/r11-challenge-goals.test.js`、`r17-pending-contract.test.js`、
     `r19-career-dismiss.test.js`；
  3. R19 手动选轨入口开卡 → Esc 取消一遍，确认 null 早退与按钮保留照旧。
- **通过标准**
  - `resolve(true)` 延后 180ms 只改节拍不改顺序：签约卡 / 聚光灯教学照常在闯城卡**之后**
    到场，无同屏双 modal；
  - r11 的目标计分 / goalDef、r17 的 boot 顺序、r19 的 cancelable 分流断言全绿——CSS 类名
    复用（`.fc-career-pick`）不许连带改选轨卡的 DOM 结构或返回值语义；
  - goalHud（`renderGoalHud`）在 `render(true)` 后正常点亮：目标名 / 进度条 / 剩余月数如常。

---

## D. 回归与总闸

### G-10 测试全绿 + R20 断言覆盖四面

- **操作步骤**
  1. 等 G1 落地后，根目录 `./scripts/run-fucheng-life-tests.sh` 全量；
  2. 单跑 `node games/fucheng-life/tests/r20-*.test.js`；
  3. 读 r20 测试源码核对覆盖面与 runner 挂载行。
- **通过标准**
  - 全量 **31 项全绿**（R19 的 30 + R20 专项），零跳过零失败；G1 不落地不许收口，也不许
    靠不挂 runner 放水；
  - R20 断言至少覆盖四面：CSS 侧 `is-open` / `is-closing` / reduced-motion 规则存在且
    关闭时长 ≤ 180ms；闯城 `onKey` 的 Esc 吞掉（不调 finish）与 Tab trap 接线；`finish`
    的 `is-closing` + 180ms 收尾与 `settled` 守卫；§43 条文措辞在位；
  - 已知局限续档 R18 G-11 / R19 G-9：正则断言可能假红 / 假绿，动效与键盘的**行为级**验收
    以本文 A / B 组手测与 O4 `R20_TEST_NOTES.md` 为准，不可省。

### G-11 无构建 / ES5 / file:// / 390px 四不破 + §43 收口

- **操作步骤**
  1. `file://` 直开走一遍：闯城卡开关（Esc / Tab / 选定）+ 选轨卡开关，控制台零报错；
  2. 390px 设备模式：两张卡面板不溢出、三张目标卡都点得着、玻璃底下文字可读（O5 核，
     无需改则交 `round20/o5-skip.md`，二者必居其一）；
  3. `tests/js-syntax.test.js` 通过（`dashboard-app.js` 改动为 ES5 风格）；对照 §43 条文
     （`221842f`，现为 `[ ]`）与本文逐条核对，复查 §40–§42 仍勾。
- **通过标准**
  - 不引入 ES6+ 语法、不新增依赖、不动构建；file:// 与 http 行为一致（动效、键盘、落盘）；
  - 窄屏下 `max-height` + 滚动兜底生效，遮罩模糊加重（blur 10px）后帧率无肉眼卡顿；
  - §43 的勾**只在** G-1～G-10 全过后打上；十路都有交代才收口（O1 / O2 / O3-skip / G2 已落，
    G1 / O4 / O5 / F2 / F3 编写时尚欠）；若实现与本文有出入，以「实现 + 测试 + 本文修订」
    三者同步为准，不允许只改条文放水。

---

**门禁总数：11 条（G-1 ～ G-11）**，分四组：开合动效 + 玻璃底 3、
闯城卡键盘与关闭语义 5、链路零回退 1、回归总闸 2。

model slug: claude-fable-5-thinking-xhigh
