# R19 · ACCEPTANCE §42 条文草稿 + §40 措辞修正（F3）

> 交付物：可直接粘贴进 `games/fucheng-life/ACCEPTANCE.md` 的第 42 条整段条文，
> 以及 §40 的措辞修正草案。落地由 R19-G2 / O3 执行；本文件只是草稿，
> **不改 ACCEPTANCE.md 本体**。
> 写稿时 G2 已把 §42 前四行落进 ACCEPTANCE.md（`00c1a55`），O3 已落 §40 措辞
> （`2dde8c0`），下方文本与已落内容**逐字一致**（含行尾硬换行双空格）。
> §42 目前缺末行测试命令——G1 的 `r19-career-dismiss.test.js` 写稿时还是红灯
> （原因与一行修法见 42-f 与「四、对齐说明」），测试转绿后 G2 补上末行即可。
> 勾选时机本轮做对了：§42 落地即 `[ ]`，与 R16/R17「十路全绿 + 手工走查后
> 另行勾选」的惯例一致（R18 曾直接 `[x]`，被列为提请复核项）。

---

## 一、粘贴进 ACCEPTANCE.md 的整段条文

```markdown
42. [ ] **R19 · 选轨关闭语义 + §40 dismiss 措辞对齐**  
    从仪表盘「选择职业轨道」手动入口打开选轨面板时，按 Escape 或点击遮罩可取消关闭；取消后不应用推荐轨、不写入 `null` 日志，手动入口继续保留。  
    boot 自动流打开的选轨面板保持原语义：按 Escape 仍接受并应用推荐轨。  
    §40 已对齐 dismiss 语义：发生过 `pendingModal` 补弹（含被关闭/dismiss）时，当次 boot 推迟自动选轨、签约与聚光灯教学。  
    `node games/fucheng-life/tests/r19-career-dismiss.test.js` 与 `./scripts/run-fucheng-life-tests.sh` 全绿。
```

前四行与已落文本逐字一致（第 1–4 行行尾均为硬换行双空格，G2 落地时已留好），
只差末行。末行按 §39 / §40 惯例点名专项命令（回应 R18 草稿的命名备注），
行尾**无**双空格，与 §40 / §41 末行一致。**G1 测试未转绿前不要粘末行**，
条目保持 `[ ]`，待十路全绿 + 本稿走查通过后另一笔 commit 勾选
（参照 R17 的 `2c57bcc → 130a317`）。

---

## 二、§40 措辞修正草案

派单原文：「已完成……补弹」改为「发生过补弹（含被关闭）」。修正只动 §40
第二个硬换行行，其余行不碰：

```markdown
- 开局若已完成合约结算或 `pendingModal` 补弹，当次推迟自动选轨、签约与聚光灯教学；闯城档缺少主目标时仍会询问，手动教学入口继续可用。  
+ 开局若发生过合约结算或 `pendingModal` 补弹（含被关闭/dismiss），当次推迟自动选轨、签约与聚光灯教学；闯城档缺少主目标时仍会询问，手动教学入口继续可用。  
```

修正理由：`replayPendingModal()` 只要真的开了卡就 `return true`——玩家把卡
关掉（dismiss）同样计入 `replayed`，boot 照样顺延选轨 / 签约 / 教学；
「已完成」会让验收人误以为必须点选项确认才算。新措辞与实现一致，
「（含被关闭/dismiss）」与 §40 原文既有的括注风格（`{ pending: false }`）不冲突。
**O3 已按此落地（`2dde8c0`），上方 `+` 行与现文本逐字一致，无需回改**；
§40 保持 `[x]` 不动（措辞对齐不是新验收项，新验收项在 §42 第三行体现）。
本轮不 bump 教学 KEY，仍为 `fucheng.guide.v7`（SOP 第 6 节政策，R18 落定）。

---

## 三、逐条人工走查（42-a…，供 G2 / 验收人参考，不必粘贴）

从仓库根目录 `python3 -m http.server 8000`，Chrome 打开
<http://127.0.0.1:8000/games/fucheng-life/>，先清站点数据并开 Console；
移动端项目用 DevTools 设备模式，视口 `390px`。
场景对应关系：`round19/R19_TEST_NOTES.md` 场景 1↔42-a、2↔42-b、3↔42-c、
4↔42-d、5↔42-e、6↔回归段。

### 准备：造一份「手动入口可见」的档

新局的 boot 自动流会立刻弹（不可取消的）选轨卡，所以手动入口要靠
「补弹顺延自动选轨」来露出（§40-c / §41-d 语义）：

1. 新局走完开局流程（选轨、合约、教学随意点掉），推进月份直到出现任一
   强弹窗（危机 / O1 / 合约门禁均可），**不点选项**直接刷新——
   `pendingModal` 挂账。
2. Console 把选轨状态打回未选：

   ```js
   var s = FC.read();
   s.run.career.picked = false;
   FC.write(s);
   location.reload();
   ```

3. 进门先补那张挂账卡，**把它关掉即可**（dismiss 也算发生过补弹，正是 §40
   本轮对齐的语义）——自动选轨被顺延，工具行出现「选择职业轨道」ghost 按钮
   （`#careerPickBtn`）。判定：`FC.career.needsPick(FC.read().run)` 为 `true`。
4. 42-a / 42-b / 42-c 在**同一次进门内**连续走完（挂账卡已销，刷新会回到
   自动弹轨），不必重复造档。

### 42-a 手动入口 Esc 取消

1. 点「选择职业轨道」打开四选一面板，**不点任何轨道卡**，按 Escape。
2. 预期：面板关闭（约 180ms 收尾动画）；`FC.read().run.career.picked` 仍为
   `false`、`track` 未变；日志**不新增**「职场」条目——尤其不能出现
   「你选择了「null」轨道作为起点。」（R19 前 `showPicker` 早退 `resolve(null)`
   时 `applyTrack(run, null)` 会兜底成推荐轨并把字面量 `null` 写进日志，
   O2 的 `if (!id) return false` 早退挡掉了这条路）；现金 / KPI 无变化；
   「选择职业轨道」按钮**保持可见**。
3. 刷新一次（此时已无挂账卡）：boot 自动弹选轨卡属预期（needsPick 仍真），
   按走查顺序请先别刷新，留到 42-c 之后。

### 42-b 手动入口遮罩取消

1. 再点「选择职业轨道」，点面板**外**的暗色遮罩（`.fc-career-pick__scrim`）。
2. 预期：与 42-a 完全一致——关闭、不应用、不写日志、入口保留。
3. 反向：点面板**本体**内空白处不应关闭；Tab 焦点被 `FC.overlay.trap`
   圈在面板内。

### 42-c 取消后仍可正常选定

1. 第三次点「选择职业轨道」，这次点选某条轨道卡。
2. 预期：面板关闭；职场 Tab 职级名称与 KPI 按所选轨道刷新；日志新增一条
   「职场」条目「你选择了「…」轨道作为起点」；按钮随 `needsPick` 变 `false`
   收起（`render → renderCareerPickBtn`），布局不跳。
3. 边界：收尾动画期间（~180ms）连点按钮不应叠出第二张卡（`picker` 单例闸 +
   `FC.events.isOpen()` 互斥），也不应产生第二条日志或二次入账。

### 42-d boot 自动流 Esc = 接受推荐轨（语义不变）

1. 重开新局（或用 needsPick 为真、**无**挂账卡的档）进仪表盘：选轨卡自动弹出。
   按 Escape。
2. 预期：Escape 视为接受，应用带「推荐」角标的那条轨道（`finish(hint)` 兜底）；
   `picked` 变 `true`；日志写入所选轨道（**不是** `null`）；
   「选择职业轨道」按钮不出现。落下的轨道必须与面板上标「推荐」的那张一致。
3. 变体：同一档改点遮罩关闭，同样落推荐轨——boot 流（无 `cancelable`）
   的 dismiss 走 `finish(hint)`，本轮语义不变。

### 42-e §40 措辞 + 语义核对（读文档 + 对代码，无需起服务）

1. `games/fucheng-life/ACCEPTANCE.md` §40 第二个硬换行行已是
   「开局若发生过合约结算或 `pendingModal` 补弹（含被关闭/dismiss）……」，
   不再有「已完成……补弹」。
2. 对代码：`replayPendingModal()` 开卡即 `return true`（关闭也计入
   `replayed`）；唯一 `return false` 的早退是 §41 的过期合约销账分支，
   本轮不动。措辞与实现一致。
3. 教学 KEY：`localStorage` 里仍只有 `fucheng.guide.v7`、无 v8——
   本轮纯措辞 + 交互语义修正，按 SOP 第 6 节不 bump。

### 42-f 自动化门禁

```bash
node games/fucheng-life/tests/r19-career-dismiss.test.js
./scripts/run-fucheng-life-tests.sh
```

两条命令退出码均应为 `0`。**写稿时（HEAD `d27b676`）专项用例红灯，全量
`29 passed / 1 failed`**：test 内 `functionSection` 用
`indexOf("\n  function ", start + 1)` 找区段下界并断言 `end > start`，而
`init` 是 `dashboard-app.js` 最后一个两格缩进顶层函数（1715 行起，文件共
1836 行），后面再无 `\n  function `，`end === -1` 先炸在
「init source section must be bounded」。这是 harness 取区段的边界 bug，
不是产品回归——修法照抄 R18 同名 helper 的兜底：
`return src.slice(start, end > start ? end : src.length);`（去掉 bounded
断言）。**本路已用打过该补丁的临时副本实测：R19 全部断言通过、exit 0**——
Esc/遮罩 `resolve(null)`、manual 传 `cancelable`、`!id` 早退先于
`applyTrack`、`careerPickBtn` 接 `{ manual: true }`、§40 含「含被关闭」
措辞，逐条都对得上现码。归 G1 落一行修复后，§42 末行方可粘贴。

### 桌面 + 390px 回归

`≤640px` 时「选择职业轨道」与「新手教学」同待遇、天然可见（R18 已定，
O5 本轮 skip 笔记确认无需动 CSS）。桌面与 `390px` 各走一次
「开局补弹 dismiss → 手动开选轨并取消（Esc + 遮罩各一次）→ 再开并选定 →
推进月份」：面板与遮罩窄屏不溢出、遮罩区可点到、按钮收起后布局不跳，
弹窗无叠层，Console 无 error、未处理 Promise rejection 或 404。

---

## 四、与现码的对齐说明（写给 G2 / 合入责任人）

写稿时分支 `cursor/fucheng-r19-career-dismiss-fa72` HEAD 为 `d27b676`，
十路除 F1 / F2 外均已落；`./scripts/run-fucheng-life-tests.sh` 实测
**29 passed / 1 failed**（红灯即 42-f 那条，页面代码无回归）：

- **O1 已落**（`4013780`，`fc-career.js`）：`showPicker(opts)` 新增
  `dismiss()`——`opts.cancelable` 时 `close(null)`，否则维持 `finish(hint)`；
  Esc 与遮罩点击都走 `dismiss()`，`settled` 闸防双 resolve。
  boot 流不传 `cancelable`，语义自动保持。
- **O2 已落**（`355f048`，`dashboard-app.js`，未碰 fc-career.js）：
  `maybeOfferCareerTrack(opts)` 接受 `{ manual: true }` → `pick.cancelable = true`；
  `.then` 里 `if (!id) return false` 先于 `applyTrack` 与日志——顺带修掉了
  R19 前早退路径把「null」写进日志的旧虫。init 里 `careerPickBtn` 点击改传
  `{ manual: true }`。
- **O3 已落**（`2dde8c0`，ACCEPTANCE §40）：与本稿「二」逐字一致，无需回改。
- **O4 已落**（`d27b676`，`round19/R19_TEST_NOTES.md`）：六场景与本稿
  42-a…42-e 及回归段对得上；红灯状态与修法结论一致（KNOWN 未另立条目，
  红灯属测试 harness 而非产品缺陷，笔记里已落字，够用）。
- **O5 已落**（`55befc0`，`round19/o5-skip.md`）：skip 笔记——取消语义纯 JS，
  复用 `.fc-career-pick` 既有样式，CSS 无需改动。
- **G1 已落但红**（`918b54b`，`tests/r19-career-dismiss.test.js` + runner）：
  vm 沙箱直跑 `fc-career.js` 验 Esc / 遮罩 resolve null，正则验 O2 早退与
  §40 措辞，覆盖面合格；仅 `functionSection` 边界 bug 一处，修法见 42-f
  （已验证补丁后全绿）。修好前 §42 末行与勾选都不要动。
- **G2 已落**（`00c1a55`，ACCEPTANCE §42 前四行）：与本稿「一」前四行
  逐字一致；第 3–4 行行尾双空格已留好，G1 转绿后按「一」补末行即可
  （末行无行尾双空格）。`[ ]` 勾选留到十路全绿 + 本稿走查签核后另一笔 commit。
- **备注（不强求）**：选轨日志写的是轨道 **id**（如「staff」）而非中文名
  （`"你选择了「" + id + "」轨道作为起点。"`），R6 起的历史行为，boot 与
  手动路径一致，本轮不动；若后续轮次想换成 `tr.name`，注意 §41-d 走查文案
  与 G1 正则同步。

---

model slug: `claude-fable-5-thinking-xhigh`
