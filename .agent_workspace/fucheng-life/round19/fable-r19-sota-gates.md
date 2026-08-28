# R19 SOTA 门禁 · 选轨关闭语义分流 + §40 dismiss 措辞（showPicker cancelable / manual null 早退）

> 作者：R19-F1（fable）。本文是 R19 的验收 SSOT：下列门禁**全部通过**方可合入 / 勾上 ACCEPTANCE §42。
> 对象代码：`games/fucheng-life/js/fc-career.js`（`showPicker` 增 `cancelable`，O1 可写）、
> `js/dashboard-app.js`（`maybeOfferCareerTrack({ manual })` 与 `careerPickBtn` 接线，O2 可写，
> **不许**反过来改 career.js）、`games/fucheng-life/ACCEPTANCE.md` §40 措辞（O3）与 §42（G2）。
> 编写时分支快照：O3 §40 措辞（`2dde8c0`）、G2 §42 条文（`00c1a55`，未勾）已提交；
> runner 第 58 行已挂 `tests/r19-career-dismiss.test.js` 但 G1 测试文件尚未落——**当前全量套件必红**，
> 属预期在途状态（见 G-9）；O1 / O2 实现与 O4 KNOWN、O5 均未落或在途（O4 的
> `R19_TEST_NOTES.md` 已交）。门禁按**行为**验收，不锁实现细节与具体措辞。
> 依据：`round18/fable-r18-playfeel.md` R2（scrim/Esc = 不可逆落轨，手动入口立项理由被关闭语义收走）、
> R3（守卫分支 resolve(null) → 日志「你选择了「null」轨道」且 `applyTrack(null)` 静默兜底推荐轨）、
> R18 门禁 G-6 留档的「下轮议题」；目标见 `round19/R19_DISPATCH.md`。

## 0. 验收环境准备

- 本地起服：仓库根目录 `python3 -m http.server 8000`，打开
  `http://localhost:8000/games/fucheng-life/`（file:// 直开亦须可用，见 G-10）。
- 自动化：`./scripts/run-fucheng-life-tests.sh`；R19 断言在 `tests/r19-career-dismiss.test.js`。
- 控制台探针：`FC.career.needsPick(run)`、`FC.read().run.career`（`track / picked / level / kpi`）、
  `FC.Sim.setPendingModal / hasPendingModal`、`FC.events.byId("EV93")`。改状态后触发渲染或重进页面。
- 常用构造（沿 R18 §0）：
  - **未选轨档**：控制台 `run.career.picked = false; FC.write({ run: run })` 后刷新
    （`picked` 只管要不要再问，默认轨照常行动，不软锁）；
  - **手动入口场景**：未选轨 + 挂账——
    `FC.Sim.setPendingModal(run, { kind: "o1", event: FC.events.byId("EV93") }); FC.write({ run: run })`
    再刷新：补弹置 `replayed` 跳过自动选轨，工具区 `careerPickBtn` 可见（R18 G-7 链路）；
  - **boot 自动流场景**：未选轨 + **无**任何挂账 / 结算欠账，进门自动弹选轨卡。

---

## A. `showPicker` 关闭语义分流（fc-career.js · O1）

### G-1 cancelable 契约：手动 Esc/遮罩 resolve(null)，默认路径一字不改

- **操作步骤**
  1. 读 `fc-career.js` 源码：`finish` 如何区分「取消」与「无 id 兜底」（现状
     `resolve(id || hint)` 单条兜底路**必须**被分流，否则 null 传不出去）；
  2. 控制台分别 `FC.career.showPicker({ cancelable: true })` 与 `FC.career.showPicker({})`
     各开一次，Esc / 点遮罩 / 点轨道卡三种收法各试，用 `.then(console.log)` 看 resolve 值。
- **通过标准**
  - `cancelable: true` 时：Esc 与点遮罩 resolve **恰好 `null`**；点轨道卡 resolve 该卡
    `data-track` 的真实 id，**永不**是 null——「取消」与「选中」在返回值上可区分；
  - 不传 `cancelable`（或 falsy）时语义与 R18 逐字一致：Esc / 遮罩 resolve 推荐轨 `hint`，
    点卡 resolve 所选 id——boot 自动流零感知（见 G-7）；
  - 面板本体（`__panel`）内空白处点击**不**触发关闭，只有 `__scrim` 与 Esc 算关闭手势；
  - 守卫分支（overlay / tracks 缺失、picker 已开、`FC.events.isOpen()`）照旧 resolve(null)，
    不因本轮改动变成抛错或悬挂的 Promise。

### G-2 取消路径完整拆台：遮罩收干净、可重开、连点不叠层

- **操作步骤**
  1. cancelable 面板 Esc 取消后：查 DOM 无残留 `.fc-career-pick`、页面可点击（无隐形遮罩）、
     再调一次 `showPicker` 能正常开出；
  2. 关闭动画（约 180ms）期间快速连点 `careerPickBtn` 数面板与日志；
  3. 面板开着时按 Tab 循环焦点、按 Esc 后观察焦点不丢死。
- **通过标准**
  - 取消与选中走**同一套**收尾（`is-closing` 动画 → 移除 host → `FC.overlay.pop` →
    `picker = null`）：不新写第二条拆台路径，overlay 栈不漏、键盘钩子不残留；
  - 动画期间 `picker` 守卫仍然生效：连点开不出第二个面板、不产生第二条日志或第二次落轨；
  - Tab 焦点圈定在面板内（`FC.overlay.trap` 不回退）；取消后焦点回到页面可操作状态。

---

## B. `maybeOfferCareerTrack({ manual })` 的 null 早退（dashboard-app.js · O2）

### G-3 接线分流：按钮传 manual，boot 调用一字不改

- **操作步骤**
  1. 读 `init` 里 `careerPickBtn` 的 click handler 与 boot 链尾的 `maybeOfferCareerTrack()`
     两处调用，核对实参；
  2. 读 `maybeOfferCareerTrack` 源码，核对 `cancelable` 只在 manual 时传给 `showPicker`。
- **通过标准**
  - 按钮 click 调 `maybeOfferCareerTrack({ manual: true })`，boot 链保持无参（或 manual falsy）
    调用——`cancelable` **只**随 manual 下发，自动流拿不到取消手势；
  - 手动路径仍传 `origin`（或与 boot 同源的上下文）给 `showPicker`：推荐角标与 Esc 兜底轨
    在两条路径上指同一条轨，不因入口不同而漂移；
  - 除 null 分支外，manual 与 boot 共用同一条 `showPicker → applyTrack → 职场日志 →
    render(true)` 管线（R18 G-6 的「不另写第二套面板」不回退）。

### G-4 null 三不做：不 applyTrack、不写日志、不落盘

- **操作步骤**
  1. §0 手动入口场景，点按钮开面板，Esc 取消；记录取消前后
     `FC.read().run.career` 全字段、日志区条数、职场区职级显示；
  2. 再用点遮罩取消重复一遍；每次都刷新重进核对持久化。
- **通过标准**
  - 取消后 `run.career` 全字段（`track / picked / level / kpi`）与取消前逐字段相等——
    尤其 `level` / `kpi` 不被 `applyTrack` 的 `level = 0 / kpi = 48` 重置；
  - 日志区**零新增**：没有「你选择了…」条目，更没有 R18-R3 的
    「你选择了「null」轨道作为起点。」（负向断言，G1 必挂）；
  - `needsPick` 仍真：`careerPickBtn` 保持可见（当帧，不需刷新），刷新重进后按钮复现、
    boot 侧「推迟不是取消」语义照旧——下次干净进门自动选轨照弹；
  - null 分支返回 false（或等价 falsy），不触发 `render(true)` 强制落盘一笔无意义写。

### G-5 守卫 null 同吃早退：R18-R3 的「null 日志 + 静默落轨」双杀

- **操作步骤**
  1. 复刻 R18 playfeel R3 的两条复现路：a) 快速双击选轨按钮；b) 危机 / O1 卡开着时
     （`FC.events.isOpen()` 为真）调 `maybeOfferCareerTrack({ manual: true })`；
  2. 各查日志、`run.career.picked` 与按钮可见性；
  3. boot 自动流下人为制造守卫 null（如把 `FC.overlay` 临时置空再进门）看兜底。
- **通过标准**
  - 守卫分支的 resolve(null) 与取消的 null 走**同一个**早退：不 applyTrack、无「null」日志、
    `picked` 保持 false——R18-R3「守卫 null 被 `applyTrack(null)` 静默兜底成推荐轨 +
    打印 null 日志」两个症状一并销案；
  - 行为变化点明示验收：boot 流守卫 null 从「静默落轨」变为「本次不选、`needsPick` 仍真、
    下次进门再弹」——与「推迟不是取消」同语义，不算回归；不许出现同屏双面板；
  - `FC.career` 缺失等既有防御分支不炸（`maybeOfferCareerTrack` 首行早退原样保留）。

### G-6 取消后再选定：一次入账、按钮收起、boot 不再问

- **操作步骤**
  1. 手动入口场景取消一次后再点按钮，这次点定一条**非推荐**轨；
  2. 查职场区职级 / KPI、日志「职场」条目、`run.career`；刷新重进再核对；
  3. 快进 / 推进几个月确认无重复询问。
- **通过标准**
  - `applyTrack` 恰好跑**一次**：`track` 为所点轨道 id、`picked = true`、日志恰一条
    「职场」记录且轨道名为真实 id（非 null、非推荐轨顶包）；
  - `picked` 经 `render` 内 `FC.write` 落盘：按钮当帧收起、刷新不复现、boot 不再自动弹
    （R18 G-6「自动与手动双轨不打架」不回退）；
  - 已知取舍续档：老档中途手动选轨会把 `level / kpi` 重置为 0 / 48，是 `applyTrack`
    既有语义、非本轮引入——按现状验收，O4 / F3 视情况落 KNOWN，不当 R19 回归报。

---

## C. boot 自动流零回退

### G-7 自动弹的选轨卡 Esc / 遮罩仍 = 接受推荐轨

- **操作步骤**
  1. §0 boot 自动流场景进门，选轨卡自动弹出后按 Esc；查 `run.career.track` 与推荐角标轨道
     是否同一条、日志轨道名、按钮不出现；
  2. 重造一档改点遮罩关闭，同查；
  3. 跑 `node games/fucheng-life/tests/r17-pending-contract.test.js` 与
     `r18-stale-contract.test.js` 确认 boot 顺序 / 收敛旗标 / careerPickBtn 断言不回退。
- **通过标准**
  - boot 流 Esc / 遮罩关闭后 `picked = true`、`track` = 带「推荐」角标那条、日志写真实轨道名
    ——「开局不能留着没选轨的档」的既有取舍在自动流上一字不差；
  - `careerPickBtn` 整局不出现（`needsPick` 已假）；后续 `maybeOfferChallengeGoal /
    maybeOfferContract / guide` 链照 R17 顺序走，无新增打断；
  - 取消语义**只**存在于手动入口：全代码检索确认自动流无任何路径能拿到 `cancelable: true`。

---

## D. §40 措辞对齐（ACCEPTANCE · O3）

### G-8 「发生过补弹（含被关闭）」与 `replayed` 旗标逐字对表

- **操作步骤**
  1. 读 `ACCEPTANCE.md` §40 第二段（快照 `2dde8c0` 已改），全文检索确认「已完成」式旧措辞零残留；
  2. 对代码：`replayPendingModal` 开卡即 resolve true（dismiss 同样计入）、过期销账支
     resolve false（R18 §41 语义）；boot 链 `shown → replayed` 旗标核对；
  3. 手测：挂账档进门，补弹卡**只关不答**，确认当次选轨 / 签约 / 教学都被推迟。
- **通过标准**
  - §40 条文语义 =「发生过合约结算或 `pendingModal` 补弹（**含被关闭/dismiss**）即推迟当次
    自动选轨、签约与聚光灯教学」——与 `replayed` 置位条件（卡真的弹了，不问答没答）一致，
    「已完成」误导措辞零残留；闯城主目标例外句保留；
  - §41 的销账支（返回 false、不置 `replayed`）不被本次措辞改动波及——过期销账仍不占
    注意力额度（R18 G-4 不回退）；§40 / §41 的 `[x]` 保持；
  - 措辞改动**不 bump** 教学 KEY：全文无 `fucheng.guide.v8`，KEY 仍 v7（SOP §6 政策，
    R19 是第二个先例）；§40 本身的勾不因措辞对齐被摘。

---

## E. 回归与总闸

### G-9 测试全绿 + R19 断言覆盖四面

- **操作步骤**
  1. 等 G1 落地后，根目录 `./scripts/run-fucheng-life-tests.sh` 全量；
  2. 单跑 `node games/fucheng-life/tests/r19-career-dismiss.test.js`；
  3. 读 r19 测试源码核对覆盖面与 runner 挂载（第 58 行，已核先行挂上）。
- **通过标准**
  - 全量 **30 项全绿**（R18 的 29 + R19 专项），零跳过零失败——注意编写本文时 runner
    已挂而测试未落、套件必红，**G1 不落地不许收口**，也不许靠摘掉 runner 那行放水；
  - R19 断言至少覆盖四面：`showPicker` 的 `cancelable` 分流（含默认路径 resolve hint 不变）；
    `maybeOfferCareerTrack` 的 manual 传参与 null 早退（含「null」日志负向断言）；
    boot 调用无 cancelable；§40 措辞（「含被关闭」在、旧措辞不在）；
  - R13–R18 既有断言不回退（r17 boot 顺序、r18 careerPickBtn / needsPick 断言尤须复跑）；
  - 已知局限续档 R18 G-11：正则断言可能假红 / 假绿，取消路径的**行为级**验收以本文 A / B 组
    手测与 O4 `R19_TEST_NOTES.md` 场景 1–4 为准，不可省。

### G-10 无构建 / ES5 / file:// 三不破 + 窄屏可取消

- **操作步骤**
  1. `file://` 直开走一遍：手动入口场景 → 取消（Esc + 遮罩各一次）→ 再选定 → 推进月份；
  2. 390px 设备模式重复：确认遮罩区在窄屏点得着、面板不溢出；
  3. `tests/js-syntax.test.js` 通过（含 `fc-career.js` / `dashboard-app.js` 改动）。
- **通过标准**
  - 不引入 ES6+ 语法、不新增依赖；`cancelable` 判定与 null 早退均 ES5 风格；
  - file:// 与 http 行为一致：取消、日志、按钮显隐、落盘无差异；控制台无新增报错或
    未捕获 Promise 拒绝（`showPicker` 的 Promise 在所有分支都 resolve，不悬挂）；
  - 窄屏遮罩可点、按钮收起后工具区布局不跳（若需样式改动只许 O5 动 `fc-gameplay.css`，
    无需则交 `round19/o5-skip.md`，二者必居其一）。

### G-11 §42 条文闭环 + 十路交代

- **操作步骤**
  1. 对照 §42（`00c1a55`，现为 `[ ]` 未勾）与本文逐条核对；复查 §39–§41 仍勾；
  2. 清点十路产物：O3（`2dde8c0`）、G2（`00c1a55`）、O4（`R19_TEST_NOTES.md`）已落，
     O1 / O2 / G1 / O5 / F2 / F3 编写本文时尚欠。
- **通过标准**
  - §42 三句条文（手动入口 Esc / 遮罩可取消、不应用推荐轨、不写 null 日志、入口保留 /
    boot 自动流 Esc 仍接受推荐轨 / §40 dismiss 措辞对齐）与本文 A–D 组一致；
  - §42 的勾**只在** G-1～G-10 全过后打上——G2 先行落条文未勾是正确状态，合入前若任一
    门禁翻红保持不勾；§39–§41 不回退；
  - 十路都有交代才收口：O1 / O2 交实现、G1 交测试、O5 交样式或 skip 说明、F2 交 playfeel、
    F3 交条文草稿（或按轮次决定并档说明）；
  - 若实现与本文有出入，以「实现 + 测试 + 本文修订」三者同步为准，不允许只改条文放水。

---

**门禁总数：11 条（G-1 ～ G-11）**，分五组：showPicker 关闭语义分流 2、
manual null 早退 4、boot 自动流零回退 1、§40 措辞对齐 1、回归总闸 3。

model slug: claude-fable-5-thinking-xhigh
