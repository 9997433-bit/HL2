# R18 SOTA 门禁 · 过期合约门禁销账 + 选轨手动入口 + 教学 KEY 政策（pendingContractStale / careerPickBtn / SOP §6）

> 作者：R18-F1（fable）。本文是 R18 的验收 SSOT：下列门禁**全部通过**方可合入 / 保持 ACCEPTANCE §41 的勾。
> 对象代码：`games/fucheng-life/js/dashboard-app.js`（`pendingContractStale` / `replayPendingModal` /
> `renderCareerPickBtn` / `init` 接线）、`screens/dashboard.html`（`careerPickBtn`）、
> `js/fc-guide.js`（④ 步文案条件化、KEY 保持 v7）、根目录 `ORCHESTRATION-MODEL-SOP.md`（§6 教学 KEY 政策）。
> 编写时对照的分支状态：O1 过期重验（`632494c`）、O2 选轨按钮（`1e735fb`）、O3 文案（`0e2295d`）、
> O4 SOP §6（`39283e1`）、G1 `tests/r18-stale-contract.test.js`（`4573094`，runner 第 57 行已挂）、
> G2 §41 + TEST_NOTES（`e429778`）均已提交；快照 `4573094` 时 `./scripts/run-fucheng-life-tests.sh`
> **29 项全绿**。O5（窄屏 CSS）与 F2 / F3 编写时尚无产物。门禁按**行为**验收，不锁实现细节与具体措辞。
> 依据：`round17/fable-r17-playfeel.md` R1（过期门禁卡照样补弹、`creditContract` 非 active 静默返 0）、
> R4/G-7（老档无轨道无手动入口）、R7（教学 KEY 三轮连 bump）、R12（教学句与 R1 修法联动）；
> 目标见 `round18/R18_DISPATCH.md`。

## 0. 验收环境准备

- 本地起服：仓库根目录 `python3 -m http.server 8000`，浏览器打开
  `http://localhost:8000/games/fucheng-life/`（file:// 直开亦须可用，见 G-12）。
- 自动化：`./scripts/run-fucheng-life-tests.sh`；R18 断言在 `tests/r18-stale-contract.test.js`
  （已核：runner 第 57 行挂上）。
- 控制台探针（仪表盘页可用）：`FC.Sim.setPendingModal / clearPendingModal / hasPendingModal`、
  `FC.read().run.pendingModal`、`FC.events.byId("EV93")`、`FC.events.meetsContract`、
  `FC.Sim.contractCtx(run)`（返回 `{ id, status, progress, monthsLeft }`）、`FC.career.needsPick(run)`。
  改状态后触发一次渲染或重进页面。
- 常用构造：
  - **合约门禁 O1 挂账**（沿 R17 §0）：签落户后控制台
    `FC.Sim.setPendingModal(run, { kind: "o1", event: FC.events.byId("EV93") }); FC.write({ run: run })`
    再刷新——用 `byId` 拿真实载荷，不要手捏残卡；
  - **过期化三式**：①自然式——`run.contract.deadlineMonth = run.months` 后推进一月，结算卡弹出并
    **确认**（`status` 离开 `active`）；②快捷式——控制台 `run.contract.status = "done"; FC.write({ run: run })`；
    ③错配式——`run.contract.id = "home"`（挂的是 hukou 卡）后落盘刷新；
  - **窗口失格式**（补充面，见 G-1）：挂 EV94（`requires.progressMin: 40`）后把进度压回门槛下
    （`contractCtx.progress` 由 `contractProgress(run)` 现算，压 `run.contract.points` / `run.edu` 即可）；
  - **未选轨档**：控制台 `run.career.picked = false; FC.write({ run: run })` 后刷新
    （`freshRun` 自带默认轨，`picked` 只管要不要再问，不软锁）。

---

## A. 过期合约门禁销账（R17-R1 收口）

### G-1 重验用同一把尺：`meetsContract(contractCtx(run), ev)`，不另写第二套门禁

- **操作步骤**
  1. 读 `dashboard-app.js` 的 `pendingContractStale` 与 `replayPendingModal` 源码，确认重验入口在开卡之前；
  2. 按 §0 分别构造四种挂账再刷新：active 且窗口满足（对照组）、已结算（快捷式）、换签错配式、
     requires 窗口失格式（EV94 进度压回 40 以下）；
  3. 挂一张**不带** `contract` 字段的危机 / 普通 O1 卡刷新对照。
- **通过标准**
  - 重验判定就是 `!FC.events.meetsContract(FC.Sim.contractCtx(run), ev)`——与 `drawModalEvent`
    抽卡入池同一把尺（id 匹配 + `status === "active"` + `progressMin / progressMax / monthsLeftMin /
    monthsLeftMax` 窗口），不另立第二套门禁逻辑，两处永不分叉；
  - 三种失格（非 active / id 不匹配 / requires 窗口不再满足）**全部**判过期走销账支；对照组正常补弹；
  - `ev.contract` 缺省的卡 `pendingContractStale` 恒 false，危机与普通 O1 的补弹零感知；
  - fail-open 护栏：`FC.events.meetsContract` 或 `FC.Sim.contractCtx` 任一不可用时按 R17 原样补弹，
    不抛错、不误销——探测缺失宁可多弹一张旧卡，不许静默丢卡。

### G-2 销账三件套 + 幂等：清账、留话、落盘，二次刷新零变化

- **操作步骤**
  1. 构造「EV93 挂账 → 合约已结算」档，记下现金 / 健康 / KPI / 人脉 / 合约进度基线，刷新重进；
  2. 读日志区与 `FC.read().run.pendingModal`，核对全部数值；
  3. 再刷新一次重看。
- **通过标准**
  - 过期卡**不开**：`clearPendingModal` 置 `null` 且经 `FC.write` 落盘；`sysLog` 恰好**一条**
    （「系统」tag，语义为「该合约通知已过期、不再补弹」，措辞可调、语义不许丢）；
  - 全部数值零变动——R17-R1 的「选项承诺 A+B 实际只给 B」静默场景从此**不可达**：卡不再开，
    `creditContract` 对非 active 返 0 的分支不再被玩家踩到，钱 / 健康 / 人脉的普通入账也一并不发生；
  - 二次刷新零变化：不再弹、系统日志不重复写、数值不再动（销账幂等）；
  - 销账支在残卡防御（R16 的载荷校验）**之后**、`openEvent` **之前**——残卡仍走 R16 静默清账路径，
    不误吃 R18 的系统日志。

### G-3 有效合约补弹零回退：R17 G-2 全链一字不差

- **操作步骤**
  1. active 合约 + EV93 挂账，刷新补弹，先 dismiss 一次、再刷新确认还弹，第三次点选项落账；
  2. 记录数值、合约进度条与日志，再刷新重进核对；
  3. 跑 `node games/fucheng-life/tests/r17-pending-contract.test.js` 确认 R17 断言不回退。
- **通过标准**
  - `meetsContract` 通过时补弹链与 R17 G-2 一字不差：同一张卡（同 `id` 同选项）走 `openEvent` 正常管线，
    `applyDeltas / applyNpcEffects / applyContractChoice / creditContract` 只在确认那次跑**恰好一次**；
  - dismiss 不落账不销账，`pendingModal` 原样保留继续挂——重验只拦「过期」，不拦「没答」；
  - 挂账期间窗口自然保持满足的卡不被误杀（EV94 的 `progressMin` 进度只升不降、EV96 的
    `monthsLeftMax` 只紧不松——正常游玩不会把它们玩成失格，失格只能靠合约真的走完）；
  - 确认后再刷新不再弹、数值与进度条不再变。

### G-4 三个调用点的 false 语义：销账不占额度、不打断、不加戏

- **操作步骤**
  1. **boot**：构造「只挂过期卡、无结算欠账」的未选轨新玩家档（清教学键）进门，数弹窗；
  2. **boot 双欠账**：过期卡 + 合约结算欠账同挂（自然式过期本来就产生结算卡），进门看链条；
  3. **月内 / 快进**：把过期卡留到月结路径（推进一月 / 快进三月中）触发销账，观察打断与当月抽卡。
- **通过标准**
  - boot：销账返回 false **不置** `replayed` 旗标——第 1 步里选轨 / 签约 / 教学自动链**照走**
    （销账没弹窗，不算「补弹发生过」，不该吃掉 R17 的注意力额度）；第 2 步结算卡真弹了则照 R17
    收敛（跳选轨 / 签约 / 教学、闯城主目标例外），R18 不给这条链加戏也不减戏；
  - 快进：销账不打断快进（`hit` 为 false 继续走月），系统日志那行照写，快进结束后可读；
  - 月内：`monthModal` 的 `hasPendingModal` 分支早退是既有结构——销账当月不再抽新危机 / O1，
    下月恢复正常抽卡，按现状验收；
  - `once` 已烧 + 销账 = 该卡本局**永久失效**：合约都结算了、专属通知作废属预期行为，
    记 KNOWN（G2 / F3 落字）不当 bug 报——这正是教学新句「自动作废」承诺的行为（见 G-9）。

---

## B. 选轨手动入口（R17 G-7「老档无轨道」极端情形销案）

### G-5 按钮可见性契约：`needsPick` 真显假隐，其余人生整局不见它

- **操作步骤**
  1. 读 `dashboard.html` 工具区与 `renderCareerPickBtn` 源码，确认默认态与挂载点；
  2. 三种档各进门一次：已选轨老档、全新开局（boot 自动弹 picker 并答完）、§0 构造的未选轨档；
  3. 未选轨档上连续行动 / 推进几个月，观察按钮持续可见。
- **通过标准**
  - 按钮在工具区 `guideBtn` 旁、复用 `fc-btn fc-btn--ghost`、`type="button"`、HTML 默认 `hidden`；
  - `renderCareerPickBtn` 挂在 `render` 主链：每次渲染按 `FC.career.needsPick(run)` 刷新——
    真则露出、假则隐藏，不需要刷新页面才生效；
  - 已选轨档与答完自动选轨的新档**整局不见**按钮（`picked: true` 恒隐）；未选轨档上它持续可见，
    跨行动、跨月结不闪没；
  - `FC.career` 缺失或按钮元素不存在时静默跳过，不抛错（防御分支已在，验收只确认不炸）。

### G-6 点击复用既有 picker：同一路径、落盘幂等、关闭语义不变

- **操作步骤**
  1. 未选轨档点按钮，核对面板与 boot 自动弹的选轨面板同款（推荐徽标、轨道卡片）；
  2. 选定一轨：查按钮是否当帧收起、职场区职级 / 日志「职场」条目、`run.career.picked`；刷新重进核对；
  3. 再造一档，点按钮后按 Esc / 点遮罩关闭，读 `run.career`。
- **通过标准**
  - 点击走 `maybeOfferCareerTrack` **同一条路径**——与 boot 自动弹共用 `FC.career.showPicker` /
    `applyTrack` / 职场日志 / `render(true)`，不另写第二套面板；
  - 选完 `picked = true` 经 `render` 内的 `FC.write` 落盘：按钮当帧收起，刷新后不复现，
    boot 也不再自动弹（自动与手动双轨不打架、不双弹）；
  - Esc / 遮罩关闭 = **选中推荐轨**是 picker 的既有语义（boot 自动弹同款），按钮路径原样继承、
    不新增「取消」分支——按现状验收，不当回归报（若 F2 认为该给手动路径留反悔，记下轮议题）；
  - picker 打开期间全屏遮罩拦截点击，快速连点不会开出第二个面板，日志无重复「职场」条目。

### G-7 与 boot 收敛闭环：被推迟的那次进门，玩家有出口

- **操作步骤**
  1. 构造未选轨 + 挂 `pendingModal`（active 合约或危机卡均可）档进门：补弹卡先弹，答掉或关掉；
  2. 同一屏找到选轨按钮点击并完成选轨；
  3. 另开一档同样构造但**不点按钮**，把欠账答完后再刷新进门一次。
- **通过标准**
  - 补弹置 `replayed` 跳过自动选轨的**当次**，按钮同屏可见（补弹 modal 关掉后即可点）——
    R17 G-7 记录的「`needsPick` 恒真但每次进门都被跳过、无手动入口」软性死循环正式销案；
  - 第 3 步：不点按钮也不吃亏——下次干净进门 `needsPick` 仍真则自动选轨照弹（R17「推迟不是取消」
    语义不回退），按钮只是提前的出口，不是唯一出口；
  - 未选轨期间不软锁：默认轨照常行动 / 月结 / 快进（`picked` 只管要不要再问）；
  - 手动入口三件套齐活：教学（`guideBtn` force）、要约（`contractPickBtn`）、选轨（`careerPickBtn`）
    ——R17 G-7 的清单从两项补成三项。

### G-8 窄屏可用（O5 范围）：390px 下看得见、点得着

- **操作步骤**
  1. 设备模式 390px 打开未选轨档，找选轨按钮；
  2. 点击走完一次选轨，观察面板与按钮收起；
  3. 查横向溢出与底部 dock 遮挡。
- **通过标准**
  - 按钮在窄屏工具区可见、可点、无横向溢出、不被 `mobileDock` 遮挡；picker 面板窄屏可完整操作
    （继承既有 `fc-career-pick` 样式，本轮不许为它另起炉灶）；
  - 若复用 `fc-btn--ghost` 既有样式已达标、无需新 CSS：O5 交 `round18/o5-skip.md` 跳过说明
    （沿 R17 惯例）；若需要改，只许动 `fc-gameplay.css`，`fc-contract.css` 不碰（DISPATCH 边界）；
  - 二者必居其一，与 G-13 的十路交代原则联动。

---

## C. 教学文案 + KEY 政策（R17-R7 / R12 收口）

### G-9 ④ 步文案条件化且为真，KEY 保持 v7 零打扰

- **操作步骤**
  1. 清 `localStorage` 的 `fucheng.guide.*` 开新档，翻到「④ 人生合约」步逐字读；
  2. 在源码全文检索旧承诺句（「刷不掉也丢不了」）与 `fucheng.guide.v8`；
  3. 造一个已读 v7 的档（只设 `fucheng.guide.v7 = "1"`）进门；再各调一次 `dismiss / reset`；
  4. 把 ④ 步的两句承诺分别对照 G-3（进行中补弹）与 G-2（过期作废 + 日志留话）的实测行为。
- **通过标准**
  - ④ 步分**两支**且都为真：合约还在进行中→没确认就刷新、下次进门原样再弹；合约已结算或失效→
    通知自动作废、日志留一行说明、不再补弹——R17-R12 要求的「改 R1 必须同步改这句」对表完成；
  - 无条件承诺句「刷不掉也丢不了」在 `fc-guide.js` **零残留**（G1 已有负向断言，手测复核一遍）；
  - `KEY` 保持 `"fucheng.guide.v7"`，全文无 v8 键读写——只改正文**不升版**，v7 已读玩家进门
    `shouldShow` 为 false 零打扰，新句随下次主动打开自然出现；
  - `dismiss` 回填 v7–v1、`reset` 全清的既有链原样不动；`guideBtn` 手动强开（`force: true`）不受影响；
  - ③ 步「城市危机/事件弹窗也要选完才算数」的 saga 过宽句属 R16-R12 旧账，本轮**不在范围**，
    续档 KNOWN 即可，不因它卡 R18。

### G-10 SOP §6 政策落地：增量不 bump 成为 SSOT，R18 自身是首个先例

- **操作步骤**
  1. 读根目录 `ORCHESTRATION-MODEL-SOP.md` §6「教学 KEY（fc-guide）政策」；
  2. 对照 R18 实际做法（O3 改文案未升版、`fc-guide.js` 头注声明）自证合规；
  3. 核对政策写进的是 SOP（编排 SSOT）而非只落在轮次笔记。
- **通过标准**
  - 政策四条齐备：①文案 / 步骤增量**默认不 bump**（新句随玩家下次主动打开自然出现）；
    ②bump 只留给**结构性改版**（步骤数量增减、目标锚点换位、交互流程大改——不重看就会指错地方）；
    ③bump 必须兼容回填（dismiss 连旧键一起写、reset 一起清）**并在该轮 DISPATCH 写明升版理由**；
    ④点名 R15→v5 / R16→v6 / R17→v7 三连反面教材，**禁止每轮 O 路自行决定**；
  - R18 自身合规作为首个先例：本轮为增量文案、KEY 沿用 v7、`fc-guide.js` 头注声明政策出处——
    下一轮任何人想升 v8，必须先过 §6 第 ② / ③ 条；
  - 政策在 SOP（「本文件是唯一模型编排 SSOT；轮次 BRIEF 不得另定配比覆盖本表」的同一文件）内，
    对后续轮次具有约束力，G1 的 SOP 断言（默认不 bump / 结构性 bump）挂在测试里防静默删改。

---

## D. 回归与总闸

### G-11 测试全绿 + R18 断言覆盖四面

- **操作步骤**
  1. 仓库根目录执行 `./scripts/run-fucheng-life-tests.sh`；
  2. 单跑 `node games/fucheng-life/tests/r18-stale-contract.test.js`；
  3. 读 r18 测试源码核对覆盖面与 runner 挂载（第 57 行）。
- **通过标准**
  - 全量 **29 项全绿**、零跳过零失败（快照 `4573094` 已核，合入前须复跑）；
  - R18 断言至少覆盖四面：`replayPendingModal` 经 `meetsContract` + `contractCtx` 重验且过期支
    走 `clearPendingModal` + `sysLog`；`careerPickBtn` 存在于 HTML、`renderCareerPickBtn` 按
    `needsPick(run)` 控 `hidden` 且挂 `render` 主链、`init` 里点击接 `maybeOfferCareerTrack`；
    guide KEY 为 v7、无 v8、④ 步无旧承诺句且含作废语义；SOP 含「默认不 bump」+「结构性才 bump」；
  - R13–R17 既有断言不回退（r16 的 replay 形状、r17 的 boot 顺序与收敛旗标尤须复跑）；
  - 已知局限照 R17-R11 续档：r18 断言仍是源码正则（重构 helper 名或把注释写进函数体可能假红 /
    假绿），过期销账的**行为级**入账断言无自动覆盖——本文 A / B 组手测与 G2 的
    `R18_TEST_NOTES.md` 场景 1–5 不可省。

### G-12 无构建 / ES5 / file:// 三不破

- **操作步骤**
  1. `file://` 直开 `games/fucheng-life/index.html` 走一遍：开局 → 签约 → 构造挂账 → 过期化 →
     刷新看销账与系统日志 → 手动选轨 → 手动重看教学 ④ 步；
  2. `tests/js-syntax.test.js` 通过（含本轮改动的 `dashboard-app.js` / `fc-guide.js`）。
- **通过标准**
  - 本轮改动不引入 ES6+ 语法、不新增外部依赖（ES5、无构建直开的项目约定；`pendingContractStale`
    的 typeof 探测与 `renderCareerPickBtn` 的 `$()` 取元均为 ES5 风格，已核）；
  - file:// 下销账、系统日志、选轨按钮、教学文案与 http 下行为一致；控制台无新增报错或
    未捕获 Promise 拒绝；中文系统日志两种协议下显示完整无乱码。

### G-13 §41 条文闭环 + 十路交代

- **操作步骤**
  1. 对照 `games/fucheng-life/ACCEPTANCE.md` §41 与本文逐条核对；复查 §39 / §40 仍勾 `[x]`；
  2. 清点十路产物：O1（`632494c`）/ O2（`1e735fb`）/ O3（`0e2295d`）/ O4（`39283e1`）/
     G1（`4573094`）/ G2（`e429778`）已落，O5 与 F2 / F3 尚欠。
- **通过标准**
  - §41 四句条文（补弹前重验、失效销账 + 系统日志 + 后果不入账 / 选轨手动入口且随 `needsPick`
    显隐 / 增量文案不 bump、沿用 v7、不强制重看 / R18 专项与全量测试全绿）与本文 A–D 组一致；
  - §41 目前已被 G2 先行勾上 `[x]`——**合入前若本文任一门禁翻红须先摘勾**，G-1～G-12 全过才许保持；
    §39 / §40 不回退；
  - 十路都有交代才收口：O5 交样式改动或 `round18/o5-skip.md`（接 G-8），F2 交 playfeel、
    F3 交条文草稿（或按轮次决定并档说明）；
  - 若实现与本文有出入，以「实现 + 测试 + 本文修订」三者同步为准，不允许只改条文放水。

---

**门禁总数：13 条（G-1 ～ G-13）**，分四组：过期合约门禁销账 4、选轨手动入口 4、
教学文案与 KEY 政策 2、回归总闸 3。

model slug: claude-fable-5-thinking-xhigh
