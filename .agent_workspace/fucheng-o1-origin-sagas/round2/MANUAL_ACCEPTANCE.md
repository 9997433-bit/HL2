# Round 2 手工验收登记 — ACCEPTANCE §21–25（R2-C）

- 测试人：R2-C（fable 子代理，浏览器实测）
- 日期：2026-08-28
- 环境：Google Chrome 148.0.7778.96（headless，puppeteer-core 驱动真实 Chrome）· Linux · 视口 1280×900
- 服务：仓库根目录 `python3 -m http.server 8765`，页面经 `http://localhost:8765/games/fucheng-life/` 访问
- 验收基线：`agent/fucheng-o1-origin-sagas` @ `6decc61`（含本次验收期间落地的 3 个修复，见下）
- 自动化门禁：`./scripts/run-fucheng-life-tests.sh` 9/9 全绿（每次修复后复跑）
- 方法：真实 UI 走查（入口 → 年代 → 出身 8 点分配 → 仪表盘行动/推进/事件/账单 → 地图）+
  控制台定向触发（§22 分层与红线、§23 低收入档），全程采集 Network、console error、pageerror、404
- 截图：`round2/screenshots/`（s21-*、s22-*、s23-*、s24-*、s26-*）

## 结论一览

| 门禁 | 结果 | 关键证据 |
|------|------|----------|
| §21 事件 SSOT + 闭环 + 老存档 | **PASS**（需修复 F-1 后才可测） | deck 82 条与 story.json 逐字一致；EV76/EV14/EV34 全闭环入日志；O01 老存档零报错迁移 v2 |
| §22 层级色 + 红线冷静期 | **PASS**（F-3 对齐后逐字一致） | L1–L5 弹窗 tint = token = story.json；红线 3 秒倒数、ESC/遮罩拒绝，reduced-motion 下保留 |
| §23 金钱换算一致 | **PASS** | 结果面 ¥ = HUD 现金变化 = moneyOf(units, income)，常规档与 ¥286 低收入档均验证；¥400/单位下限生效 |
| §24 出身链触发与完成 | **PASS**（F-2 修复后零报错） | rural-migrant 第 6 月触发、wealthy-merchant 第 3 月触发；4 步走完、日志留痕、不复发、不串场 |
| §25 内容质量抽检 | **PASS** | 10 事件 + 2 链人工评审无红旗；全库 82 条扫描零占位符/系统腔/英文残留/重复文案 |

放行判断：**§21–25 全部通过**（以修复后的 `6decc61` 为准）。无遗留 blocker；观察项见文末。

## 验收期间发现并已修复的缺陷（均已 commit + push，标签 R2-C）

### F-1 · P0 blocker：浏览器完全无法启动（`9f7588e`）
`dbb6265`（ABC gameplay）起 `story-loader.js` 的 `FC.ready` 以 gameplay-pack 而非 story 结算，
`screens.js` 链上的 `installStory(pack)` 在 `pack.eras.map` 处抛错 → **所有页面**显示
「档案读取失败/市民档案读取失败」，era 卡片 0 张、deck 为 null。node 侧 9 个测试不启动页面，
因此一直全绿。修复：`FC.ready` 链尾把 story 透传回去（3 行）。
未修复前 §21–25 全部无法执行；这是本轮手工验收存在的最大意义。

### F-2 · P1：约半数月份的结算被 TypeError 吞掉（`6decc61`）
gameplay-pack 151/301 条 ambient 事件没写 `layerId`，`dashboard-app.js` 的 `ambientToLog`
对 `ev.layerId.replace(...)` 未做空值保护。抽中这类事件的月份在 `settleMonth` 之前抛
`TypeError: Cannot read properties of undefined (reading 'replace')`：该月不结算收支、不渲染、
不出弹窗，console 持续报错（§24 长跑 60 个月内命中 7 次）。修复：缺省按 L2（1 行）。

### F-3 · P2：story.json cityLayers.color 与实机渲染漂移（`84e6dc1`）
五层色实际渲染全部经 `fc-tokens.css` 的 `--l1..--l5`，story.json 声明的 `color` 从未参与渲染，
且五个值全部与实机不一致（最severe：L4 声明紫 `#B474E8`，实渲金 `#F0C75E`）。画面内部
（弹窗边框/HUD chip/电梯/地图）一直是一致的，但 SSOT 数据说谎。修复：story.json 五个色值
对齐 token（5 行，零视觉变化）。gates G-E5「弹窗强调色与 cityLayers 色一致」由此从字面失败转绿。

---

## §21 · 50+ 事件单一数据源（PASS）

走查路径：清站点数据 → index 入口 →「新人生」→ E6 存量时代 → 出身选卡 + 8 点分配 → 仪表盘。

- **Network 面板**：仪表盘全程只请求两个数据文件——`story.json`（O1 事件与 choices 的 SSOT）
  与 `gameplay-pack.json`（ambient/saga/行动等，非 O1 弹窗池）。无第三个叙事数据源，无 404。
- **SSOT 逐字比对**：`FC.events.deck()` 82 条，id 顺序与 story.json `events[]` 完全一致；
  每条 `choices` 与 story.json `JSON.stringify` 逐字相等（fc-events 无第二套文案，G-E7 成立）；
  82 条全部为 2–3 choices，0 违例。
- **随机触发 3 个事件闭环**（真实推进，非注入）：
  | 事件 | 月份 | 选项数 | 所选 | 结果面 → 日志 |
  |------|------|--------|------|----------------|
  | EV76 快递柜升级 | 第 3 月 | 3 | 照常取件 | ✓ 入日志 |
  | EV14 房东站在门口 | 第 5 月 | 3 | 接受涨价，续签一年（现金 −3898 / 健康 +2） | ✓ 入日志 |
  | EV34 猎头的第三通电话 | 第 10 月 | 3 | 去面，谈到最后一轮（现金 +6900 / 声望 +2 / 人脉 −4） | ✓ 入日志 |
  每次「选择 → 后果预览点 → 结果面逐行入账 → 记入日志，继续」完整可走，关闭后焦点恢复。
- **老存档**：手工构造 v1 存档（`originId: "O01"` legacy id、run 无 version/career 字段）后刷新，
  零 console error，`migrate` 落到 version 2，money/months 等字段保留，身份栏正常渲染
  （截图 s21-legacy-save）。
- console error / 未处理 rejection / 404：全程 0。

## §22 · 层级色与红线冷静期（PASS）

- **五层色**（控制台按层取 deck 事件并 `FC.events.show`，逐层截图 s22-layer-L1..L5）：
  | 层 | 弹窗 --tint（实测） | fc-tokens | story.json（F-3 对齐后） | data-layer |
  |----|--------------------|-----------|--------------------------|------------|
  | L1 | #ffb454 | ✓ | ✓ | L1 |
  | L2 | #8fa8c8 | ✓ | ✓ | L2 |
  | L3 | #3be8b0 | ✓ | ✓ | L3 |
  | L4 | #f0c75e | ✓ | ✓ | L4 |
  | L5 | #e3255f | ✓ | ✓ | L5 |
  五色两两可区分；仪表盘层级 chip（L2 工薪层）实测色 #8fa8c8 与同层 token 一致，地图/电梯同源
  （均经 `var(--lX)`）。
- **红线冷静期**（EV09 潮汐线下的借据，L5 风险）：弹出即三选项全部 disabled、badge「红线 · 3」
  倒数（截图 s22-redline-cooling）；倒数期间 ESC 与遮罩点击均无效（弹窗仍在、仍禁用）；
  3 秒后 badge 恢复「红线」、cooling 条移除、选项可用；解锁后 ESC 仍不能免答（中断必须回应），
  选择后正常走完。
- **reduced-motion**：`prefers-reduced-motion: reduce` 模拟下重测——冷静期完整保留
  （禁用 + 倒数 + ESC 无效 + 3 秒解锁，截图 s22-redline-cooling-reduced），符合「误触保护语义
  而非动效」的 G-E6 要求。

## §23 · 金钱单位换算一致（PASS）

- **常规收入档**（E6 / middle-class，事件时点 income ¥8,654）：EV39 选「签，赌一个转行」
  （d.money = −3）→ 结果面显示 **−¥7,788** = HUD 现金变化（90,832 → 83,044）=
  `moneyOf(−3, 8654) = −3 × max(400, round(0.3×8654))`，三者严格相等；countUp 结束后
  HUD 文本 ¥83,044 与存档一致（截图 s23-money-event）。
- **低收入档**（E1 / rural-migrant，构造空窗期使 income = ¥286 ≤ ¥1300）：
  `moneyOf(1, 286) = 400`（0.3×income 仅 ¥86，**¥400/单位下限生效**）；实测 EV17 选
  「请假回一趟原籍」（d.money = −2）→ 结果面 **−¥800** = HUD 变化（7,807 → 7,007）
  = −2 × 400，恰为 400 的整数倍（截图 s23-low-income-event）。
- 换算只经 `FC.events.moneyOf` 单点（fc-sim `applyDeltas` 亦复用同函数），结果面与 HUD
  不可能分叉，G-E4 成立。

## §24 · 出身链触发与完成（PASS）

两个出身各开一局全新人生（E6），真实逐月推进并处理所有弹窗：

| 出身 | 链 | 触发月 | 完成月 | 选项步 | 日志留痕 | 他链出现 | 完成后 8 月复发 |
|------|----|--------|--------|--------|----------|----------|------------------|
| rural-migrant | SAGA_O_MIGRANT《第一张汇款单》4 步 | 第 6 月 ∈ [3,18] | 第 9 月 | 第 2 步弹窗（截图 s24-saga-choice-rural-migrant） | 4 条「出身 · 第一张汇款单」 | 无 | 无 |
| wealthy-merchant | SAGA_O_MERCHANT《父亲的担保》4 步 | 第 3 月 ∈ [3,18] | 第 6 月 | 第 2 步弹窗（截图 s24-saga-choice-wealthy-merchant） | 4 条「出身 · 父亲的担保」 | 无 | 无 |

- 完成后 `run.done.originSaga === true` 且 `done["saga_<链id>"]` 落账，继续推进 8 个月不复发；
- 全程 `FC.events.show` 钩子记录：除本链 `saga_SAGA_O_*_1` 外，未出现任何其他出身链
  （wealthy-merchant 局第 18 月后出现的 `saga_SAGA_SCAM_1` 属通用随机链池，符合分池设计）；
- 链文案与出身语义贴合（汇款单写入城打工的家庭汇款，担保写家业与债务），F-2 修复后全程零 console error。

## §25 · 内容质量抽检（PASS）

抽样可复现：mulberry32 seed `20260828`，抽中
EV38/EV56/EV18/EV80/EV79/EV67/EV69/EV40/EV17/EV48（覆盖 L1–L5、6 类 category、
含 2 条 era 专属与 2 条 once 里程碑）+ 出身链 SAGA_O_ORPHAN《紧急联系人》、
SAGA_O_SCHOLAR《最后一笔学费》。

- **人工评审**：10 条事件正文均为具体名词 + 克制白描（「电梯停了，你爬到十九层」「最后一行的
  年份，你要算一下才知道那年自己多大」），选项与结果因果自洽，每事件都有真实代价的权衡
  （无全正收益组合）；两条出身链 4 步弧线完整（落脚 → 张力 → 代价 → 落点），与出身
  description 语义一致。无占位符、无系统腔（「你获得了 X 点」零命中）、无中英混杂残留。
- **机器扫描（抽检外全库 82 条 + 2 链）**：占位符黑名单 0 命中；系统腔 regex 0 命中；
  连续英文词（白名单 KPI/HR/App/AA/offer/ATM/CBD 等之外）0 命中；`text`/`result` 全库
  无逐字重复；所有 `d.money` ∈ [−5, +5] 非零整数；选项间 delta 无完全相同。
- **既知 artifact 复查**：R1 审计点名的 `E4_09`（红包 fifty）、`E3_15`（parking）已由 R2-D
  修复为纯中文（「红包五十块」「停车费」），实测确认。
- 两条抽检链无选项步 money 合计 −3 / +1，均在 G-S6 的 [−8, +6] 域内。

## 终验回归

修复全部落地后重走完整 happy path（入口 → E7 → rural-migrant 8 点分配 → 推进 6 月，
处理 2 个事件弹窗 + 1 次账单抽屉 → 城市地图 → 返回仪表盘）：console error 0、
pageerror 0、404 0，地图五层结构正常（截图 s26-dashboard-6months / s26-city-map）。

## 观察项（非 blocker，移交 R3 参考）

1. **日志金钱显示取整**：`applyDeltas` 的 `applied.money` 按 ¥100 取整用于日志行显示
   （HUD 与结果面为精确值）。日志与结果面在小额时可能差 ≤ ¥50，属显示层设计取舍，建议 R3 确认口径。
2. **ambient 缺 layerId 的数据债**：F-2 只做了消费端兜底；151 条 ambient 的 `layerId`
   建议由内容代理补齐（日志 tag 色当前统一落 L2 色）。
3. **浏览器侧冒烟缺口**：F-1 能潜伏两轮，说明 AUTO 套件缺一个「真实页面 boot 冒烟」
   （headless 打开 dashboard 断言 `FC.ERAS.length === 7 && FC.events.deck().length ≥ 50`）。
   建议 R3 补一条防回归。

## 签核

- 测试人：R2-C（fable）
- 日期：2026-08-28
- Chrome：148.0.7778.96（headless）· Linux
- 视口：1280×900 桌面
- 自动化测试：`./scripts/run-fucheng-life-tests.sh` 9/9 全绿 @ `6decc61`
- 结果：**§21–25 通过**（含验收期间落地的 F-1/F-2/F-3 修复）
