# R18 · ACCEPTANCE §41 条文草稿（F3）

> 交付物：可直接粘贴进 `games/fucheng-life/ACCEPTANCE.md` 的第 41 条整段条文。
> 落地由 R18-G2 执行；本文件只是草稿，**不改 ACCEPTANCE.md 本体**。
> 写稿时 G2 已把 §41 落进 ACCEPTANCE.md（`e429778`），下方条文与已落文本
> **逐字一致**（含行尾硬换行双空格），G2 无需回改。
> 唯一要提请注意的是勾选时机：已落的 §41 直接是 `[x]`，与 R16/R17
> 「先 `[ ]`、十路全绿 + 手工走查后另行勾选」的惯例不同，详见「三、对齐说明」。

---

## 一、粘贴进 ACCEPTANCE.md 的整段条文

```markdown
41. [x] **R18 · 过期合约门禁销账 + 选轨手动入口 + 教学 KEY 政策**  
    带 `contract` 字段的 `pendingModal` 补弹前会重验当前合约门禁；门禁已失效时不再开卡，清除待办并写入系统日志，卡片选项后果不入账。  
    尚未选轨时，仪表盘显示「选择职业轨道」手动入口；开局补弹推迟自动选轨后，玩家仍可主动完成选轨。  
    教学增量文案默认不 bump KEY，仅结构性改版才升版；本轮文案修正继续使用 `fucheng.guide.v7`，不会强制已读玩家重看。  
    R18 专项测试与 `./scripts/run-fucheng-life-tests.sh` 全绿。
```

---

## 二、逐条人工检查步骤（供 G2 / 验收人参考，不必粘贴）

从仓库根目录 `python3 -m http.server 8000`，Chrome 打开
<http://127.0.0.1:8000/games/fucheng-life/>，先清站点数据并开 Console；
移动端项目用 DevTools 设备模式，视口 `390px`。
场景对应关系：`round18/R18_TEST_NOTES.md` 场景 1↔41-a、2↔41-b、3↔41-d、
4↔41-e、5↔回归段；41-c 是本稿补充的「销账不占额度」观察点。

### 41-a 有效合约门禁补弹回归（§40 语义不回归）

1. 新局签下人生合约（落户积分 / 攒首付 / 升职任一），推进月份直到弹出对应的
   合约门禁 O1——库里共 5 张：`EV93 积分窗口`、`EV94 在职学位的报名页`（落户
   `hukou`）、`EV95 三年定期`、`EV96 家里凑的那一笔`（首付 `home`）、
   `EV97 晋升答辩`（升职 `promote`）。
2. **不点选项**，直接刷新。Console 查 `FC.read().run.pendingModal`，
   应为 `{ kind: "contract", event }` 形状且 `event.id` 为 EV93–97 之一。
3. 合约仍在进行中（`status === "active"` 且进度在门禁区间内）时重进仪表盘：
   同一张卡照常补弹（同 id、同选项）；确认前现金、KPI、合约进度、日志均未入账，
   确认后只入账一次，`pendingModal` 清空，再刷新不再补弹。

### 41-b 过期合约门禁销账 + 系统日志（本条核心）

1. 按 41-a 挂起一张合约门禁卡（用 dismiss / 关闭退出，保持挂账），然后在
   Console 把合约弄成非 active——最省事的配方是直接判成已达成并标记结算已领取
   （避免结算补弹抢在门禁卡前面，干扰观察）：

   ```js
   var s = FC.read();
   s.run.contract.status = "won";            // 或 "failed"
   s.run.contract.settledMonth = s.run.months;
   s.run.contract.resolutionPending = false; // 结算弹窗视为已领取
   s.run.contract.resolutionDone = true;
   FC.write(s);
   location.reload();
   ```

2. 预期：过期卡**不再弹出**；`FC.read().run.pendingModal` 变为 `null`
   （`FC.Sim.hasPendingModal(run)` 为 `false`）；日志新增一条「系统」灰字：
   **「那张合约相关的通知过期了，不再补弹。」**；现金 / KPI / 合约进度 /
   人情账全部无变化——卡片选项后果一分钱不入账。
3. 再刷新一次：不再补弹，也**不重复写**系统日志（销账只发生一次）。
4. 变体：失配 / 区间外同理。`meetsContract` 要求
   `ctx.id === ev.contract && ctx.status === "active"`，并校验 `requires` 里的
   `progressMin/Max`、`monthsLeftMin/Max`——带进度区间门禁的卡在进度跑出区间后
   同样走销账路径。R17 老存档里挂成 `kind: "npc"` 的合约卡也受保护：
   销账判定只看 `ev.contract` 字段，不看 kind。

### 41-c 销账不占额度、不触发开局顺延

1. 用 41-b 的过期档且尚未选轨 / 未签约 / 未看教学，重进仪表盘：销账那一步
   `replayPendingModal` 返回 `false`、init 链的 `replayed` 不置位——
   自动选轨、签约要约与聚光灯教学**照常弹出，不被顺延**
   （§40-c 的顺延只应由真实补弹触发，销账不算敲门）。
2. 月中路径：推进月份时若挂着的合约卡已过期，同样销账 + 系统日志；
   当月不再另抽新强弹窗（与 §39「补弹占当月额度」口径一致），下月抽卡恢复正常。

### 41-d 选轨手动入口

1. 制造「自动选轨被顺延」：`needsPick` 为真的档挂一张待补弹卡（41-a 第 2 步）
   后刷新——进门先补那张卡，自动选轨顺延，工具行出现 **「选择职业轨道」**
   ghost 按钮（`#careerPickBtn`，位于「新手教学」与「打开城市地图」之间）。
   Console 判定：`FC.career.needsPick(FC.read().run)` 为 `true` 时按钮可见。
2. 点击按钮：弹出**既有**职业轨道四选一面板（复用 `FC.career.showPicker`，
   不是新 UI）；选定后职场 Tab 轨道名更新、日志出现「职场」条目
   「你选择了「…」轨道作为起点」、按钮随 `needsPick` 变 `false` 自动隐藏
   （`render → renderCareerPickBtn`）。
3. 已选轨的旧档进门：按钮保持 `hidden`，不闪现。

### 41-e 教学 KEY 政策（文案不 bump）

1. 已读玩家（`localStorage.getItem("fucheng.guide.v7") === "1"`）刷新进门：
   教学不自动重弹；`Object.keys(localStorage).filter(k => k.indexOf("fucheng.guide") === 0)`
   不含 `v8`——本轮改文案**沿用 v7**，不升版。
2. 手动点「新手教学」，看第④步「人生合约」：文案已是 R18 版——
   合约还在进行中的门禁卡没确认就刷新，下次进门原样再弹；合约已结算或失效的
   自动作废、日志留一行说明；不再有「刷不掉也丢不了」的绝对承诺。
3. `dismiss` 把 v7 连同 v1–v6 旧键一起写掉；`reset` 一起清掉，重置后可重看。
4. SOP 落字核对：`ORCHESTRATION-MODEL-SOP.md` 第 6 节「教学 KEY（`fc-guide`）政策」
   四条齐备——①增量文案默认不 bump；②bump 只留给结构性改版（步骤增减 /
   锚点换位 / 交互大改）；③bump 必须兼容回填并在该轮 `R*_DISPATCH.md` 写明理由；
   ④R15→R17 连续三轮误 bump 列为反面教材，禁止 O 路自行决定升版。

### 41-f 自动化门禁

```bash
node games/fucheng-life/tests/r18-stale-contract.test.js
./scripts/run-fucheng-life-tests.sh
```

两条命令退出码均为 `0`，全部 suite 通过（写稿时实测 **29 passed / 0 failed**）。
R18 专项断言包含：`replayPendingModal` 经 `meetsContract` + `contractCtx`
重验门禁、过期分支必走 `clearPendingModal` + `sysLog`；`careerPickBtn` 存在于
`dashboard.html`、`renderCareerPickBtn` 跟随 `needsPick(run)` 且挂进 `render()`、
init 里点击接 `maybeOfferCareerTrack`；`fc-guide` 保持 `fucheng.guide.v7` 且
无 v8、④步不再承诺无条件补弹并解释过期语义；SOP 含教学 KEY 政策
（默认不 bump / 结构性才 bump）。

### 桌面 + 390px 回归（并入 13 号门禁口径）

`≤640px` 时工具行隐藏「推进 / 快进 / 重开」（底部 dock 与抽屉接管），但保留
「新手教学」「选择职业轨道」「打开城市地图」——选轨手动入口在手机端天然可见，
无需额外 CSS。桌面与 `390px` 各走一次「过期销账 → 手动选轨 → 手动重看教学 →
推进月份」：系统日志可读、弹窗无叠层、无横向溢出，Console 无 error、
未处理 Promise rejection 或 404。

---

## 三、与现码的对齐说明（写给 G2 / 合入责任人）

写稿时分支 `cursor/fucheng-r18-stale-contract-fa72` HEAD 为 `4573094`，
除 O5 / F1 / F2 外各路已落码；`./scripts/run-fucheng-life-tests.sh` 实测
**29 passed / 0 failed**，41-f 两条命令退出码均为 `0`：

- **O1 已落**（`632494c`，`dashboard-app.js`）：新增 `pendingContractStale(ev)`
  ——只对带 `ev.contract` 的卡生效，用 `FC.events.meetsContract(FC.Sim.contractCtx(run), ev)`
  重验；`replayPendingModal` 命中过期时 `clearPendingModal()` + 系统日志
  「那张合约相关的通知过期了，不再补弹。」+ `FC.write`，并返回 `false`
  （销账不算敲门，boot 链 `replayed` 不置位）。
- **O2 已落**（`1e735fb`，`dashboard.html` + `dashboard-app.js`）：
  `#careerPickBtn`（`fc-btn--ghost`）插在「新手教学」之后；
  `renderCareerPickBtn()` 按 `FC.career.needsPick(run)` 控制 `hidden`，
  已挂进 `render()`；init 里点击直通既有 `maybeOfferCareerTrack()`。
- **O3 已落**（`0e2295d`，`fc-guide.js`）：④步合约文案改为区分
  「合约还在进行中 → 原样再弹」与「已结算或失效 → 自动作废、日志留说明」，
  删掉「刷不掉也丢不了」的绝对承诺；**KEY 保持 `fucheng.guide.v7` 不动**，
  文件头注明 R18 起文案增量不升 KEY。
- **O4 已落**（`39283e1`，`ORCHESTRATION-MODEL-SOP.md`）：新增第 6 节
  「教学 KEY（`fc-guide`）政策」四条（默认不 bump / 结构性才 bump /
  bump 须兼容回填并写明理由 / R15–R17 反面教材）。
- **O5 未落**（写稿时）：`careerPickBtn` 复用 `.fc-dash-tools .fc-btn` 既有
  窄屏样式；`fc-gameplay.css` 的 `≤640px` 隐藏名单只点名
  `#tickBtn / #tick6Btn / #resetBtn`，选轨按钮与「新手教学」同待遇、天然可见。
  预计 skip 笔记即可，无需动 CSS；`fc-contract.css` 未被触碰。
- **G1 已落**（`4573094`，`tests/r18-stale-contract.test.js` + runner 第 57 行）：
  断言范围见 41-f 括注。断言用源码切片（`functionSection`）+ 正则匹配
  helper 名（`*Contract*(ev)`），若后续重构改名或改结构需同步；条文主体不动。
- **G2 已落**（`e429778`）：§41 已粘贴至 §40 之后，行尾硬换行双空格已对齐
  §37–40（R17 排版备注已被吸收，无需回改）；`round18/R18_TEST_NOTES.md`
  场景 1–5 与本稿 41-a、41-b、41-d、41-e 及回归段对得上。
- **勾选时机（唯一提请复核项）**：已落的 §41 落地即 `[x]`，与 R16/R17 惯例
  （先 `[ ]`，十路全绿 + 手工走查后另一笔 commit 勾选，参照 `2c57bcc → 130a317`）
  不同。自动化已绿，但写稿时手工走查（41-a…41-e + 回归段）尚无人签核——
  建议合入责任人按本稿走查通过后保留 `[x]`，或先翻回 `[ ]` 再按流程勾选。
  本路只写草稿，不动 ACCEPTANCE.md。
- **命名备注（不强求）**：§41 末行「R18 专项测试」未点名命令；§39 / §40 均
  写明了 `node games/fucheng-life/tests/rXX-*.test.js`。若 G2 后续有回改机会，
  可补成 `node games/fucheng-life/tests/r18-stale-contract.test.js`
  （`R18_TEST_NOTES.md` 已写全，验收人可从那里取）。

---

model slug: `claude-fable-5-thinking-xhigh`
