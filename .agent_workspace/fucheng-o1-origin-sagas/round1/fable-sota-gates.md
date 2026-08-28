# fable SOTA 门禁 — O1 事件库 × 出身 Mini-Saga（Round 1）

- 审计代理：fable SOTA 审计子代理（Parent Orchestrator Round 1）
- 基线：`agent/fucheng-o1-origin-sagas` @ `bed34d4`，`./scripts/run-fucheng-life-tests.sh` 6/6 全绿
- 本文只定标准，不写实现。每条门禁标注验证方式：**AUTO**（对应测试文件与断言点）或 **MANUAL**（对应 `ACCEPTANCE.md` §21–25）。

---

## 0. 基线事实与裁定（先读）

审计发现两处口径冲突，R1 起按以下裁定执行，所有子代理以此为准：

1. **出身 id 以 `story.json` 为唯一事实源。** story.json 实际 10 个 origin id 为：
   `ordinary-worker, middle-class, public-system, rural-migrant, urban-village, wealthy-merchant, humble-scholar, blended-family, orphan, transnational`。
   PROGRESS.md 里写的 `state-household`、`factory-youth` **不存在**，属笔误，禁止照抄；PROGRESS.md 应同步订正。
2. **`scripts/build-gameplay-data.js` 的 `ORIGIN_BIAS` 已有 4 个悬空 id**（`state-household`/`factory-youth`/`urban-white-collar`/`small-business`）。这是既有债务，R1 内容代理不必修，但新增的 originId 绑定必须有测试防止再犯（见 G-S1）。
3. **现状快照**：story.json `sampleEvents` = 10（EV01–EV10，choices 硬编码在 `fc-events.js` 的 `SCRIPT` 表）；gameplay-pack 有 301 ambient + 12 通用 saga；`story-schema.test.js` 目前断言 sampleEvents **恰好 10 条**，迁移后该断言必须同步改写，否则测试与目标互相矛盾。
4. **R1 并行落地情况（审计中途更新）**：出身链实现与测试已进分支（`15a2d6c`/`cd6a134`/`3b253c0`）——独立 `pack.originSagas` 数组、`tryStartOriginSaga` 分池触发、`origin-sagas.test.js` + `origin-saga-sim.test.js` 已绿。另有 `o1-events.test.js` 以测试先行方式落地，当前**红灯属预期**：它断言 `story.events` ≥ 50，等待 O1 内容代理交付后转绿。本文 G-S 系列已按落地设计调和口径。

---

## 1. O1 事件门禁（G-E 系列）

### G-E1 · 数量与单一数据源
- `story.json` 的事件数组（`events`，由 `sampleEvents` 迁移改名；`fc-events.js` 的 `load()` 已兼容两个键名）长度 **≥ 50**。
- 事件 id 唯一，格式 `EV` + 两位以上数字（`/^EV\d{2,}$/`），排序稳定。
- **EV01–EV10 保号**：原 10 条事件 id、title 不得改变（`SEED` 镜像与既有存档/测试引用它们）。
- 验证：AUTO — `story-schema.test.js` 改写为 `events.length >= 50`、id 唯一性、EV01–EV10 存在性断言。

### G-E2 · 字段 schema
每条事件必含且仅含合法值：
- `id`、`title`（2–12 个字符）、`text`（20–90 个字符，写实场景描写）；
- `category` ∈ {居住, 金钱, 健康, 职场, 人情, 教育, 机会, 风险, 生计, 关系}（`fc-events.js` `CATEGORY_TYPE` 可映射的集合 + 默认 opportunity 的三类：机会/教育/健康——新增 category 必须同步扩 `CATEGORY_TYPE`，禁止静默 fallback 出意料之外的 type）；
- `layerId` ∈ {L1…L5}；
- `weight` 为 1–10 的整数（缺省按 8 处理，但 SSOT 内建议显式写）。
- 验证：AUTO — schema 测试逐条断言（风格沿用 `story-schema.test.js` 的 `nonEmptyString`/`finiteNumber` 帮助函数）。

### G-E3 · choices 完整性
- **每条事件 2–3 个 choices，不允许 0 或 1 个**（无 choices 的“确认即过”事件属于 ambient，不属于 O1 弹窗池）。
- 每个 choice 必含：
  - `id`：事件内唯一的短英文 slug（日志与测试引用）；
  - `label`：2–14 个字符的动作短语；
  - `cost`：代价提示短串（如「现金 −−」「风险 ▲」），与 `d` 的方向不矛盾；
  - `d`：1–3 个键，键 ⊆ {money, health, social, rep}（`STAT_LABEL` 已映射的四维；edu/debt/gap 不进 O1 choice，避免结果面渲染出裸键名）；
  - `result`：15–70 个字符的结果文案，与选项因果自洽。
- 每条事件的 2–3 个选项之间 **delta 组合不得完全相同**（复制粘贴选项），且**至少一个选项含负向代价**（无代价全正收益违反 Reigns 式权衡）。
- `risk: true` 仅用于确有风险语义的选项；红线事件（见 G-E6）至少一个选项带 `risk: true`。
- 验证：AUTO — 事件测试逐 choice 断言结构与去重；MANUAL — §25 抽检文案因果。

### G-E4 · 金钱 delta 单位约定（全库统一）
- `d.money` 一律使用**收入单位制**：1 单位 ≈ 月收入的 1/3，换算只经 `FC.events.moneyOf(units, ref) = units × max(400, round(0.3 × ref))`，禁止任何绝对 ¥ 数字写进 `d.money`。
- 取值域：`d.money` ∈ [−5, +5] 的非零整数（现有 SCRIPT 最大 −4；±5 封顶防数值水龙头）。
- 文案里可以出现具体金额叙述，但结算展示的 ¥ 必须来自 `moneyOf`，与 HUD 入账严格一致（单一换算点）。
- 验证：AUTO — 断言 `|d.money| <= 5` 且为整数；MANUAL — §23 校验结果面 ¥ 与 HUD 差值一致、低收入时触发 ¥400/单位下限。

### G-E5 · 层级色与分布
- 每条事件 `layerId` 必须引用 `story.json.cityLayers` 已定义的 L1–L5（层级色 hex 已由 cityLayers schema 门禁保证）。
- **分布下限**：L1–L4 每层 ≥ 6 条，L5 ≥ 4 条（50 条基数下保证 `pick()` 的同层加权有池可抽）。
- 弹窗 `data-layer` 属性驱动的边框/强调色必须与 cityLayers 色一致（引擎已实现，属回归项）。
- 验证：AUTO — 分层计数断言；MANUAL — §22 视觉核对五层色。

### G-E6 · 红线冷静期
- `category: 风险`（映射 type=redline）的事件 **≥ 5 条**。
- 红线事件行为回归（引擎已有，内容变更不得破坏）：
  - 弹出后 **3 秒冷静期**，选项禁用、badge 倒数；
  - 冷静期内 ESC 与遮罩点击无效；
  - `prefers-reduced-motion: reduce` 下冷静期**保留**（误触保护语义，非动效）；
  - `pick({allowRedline: false})` 能整体排除红线池。
- 验证：AUTO — 红线计数 + exports 冒烟；MANUAL — §22 实测倒数与 ESC 拒绝。

### G-E7 · SCRIPT 去硬编码与 SEED 镜像
- `fc-events.js` 中按事件 id 索引的 `SCRIPT` choices 表**删除**；`toPayload` 只读 `raw.choices`。
- `file://` 离线镜像 `SEED` 保留，但必须**连 choices 一起镜像**至少 EV01–EV10（离线双击打开仍可完整选择），并加注释「与 story.json 同步维护」。
- 验证：AUTO — 静态断言 `fc-events.js` 源码不含 `SCRIPT[raw.id]` 式索引、SEED 每条含 choices；MANUAL — §21 Network 面板确认 choices 来自 story.json。

### G-E8 · 存档与向后兼容
- `story.json` 键名迁移（sampleEvents → events）后：出身页/年代页仍各展示 10/7 条（uiCopy 与 origins/eras 不受影响）；`SAVE_KEY` 与 O01–O10 legacyId 机制不变。
- 验证：AUTO — 现有 `exports-smoke` + `html-links` 全绿；MANUAL — 老存档载入不报错（§21 顺带覆盖）。

### G-E9 · 文案质量红线
- 禁止占位符与假文案：`TODO`、`待补`、`lorem`、`测试`、`xxx`、`占位`、连续序号式标题（「事件1/事件2」）。
- 禁止中英混杂 artifact（既有 ambient 里 `E4_09`「红包 fifty」、`E3_15`「补贴不够 parking」即此类缺陷的实例，R2 顺带修复，新内容零容忍）。
- 事件 `text` 两两不得完全相同；`result` 文案库内重复 ≤ 0（逐字重复即失败）。
- 语调对齐 301 ambient 基准：具体名词 + 克制白描 + 城市生存质感，不喊口号、不写系统腔（「你获得了 X 点声望」属违规）。
- 验证：AUTO — 占位符黑名单 regex、`[a-zA-Z]{4,}` 连续英文单词扫描（白名单：KPI、HR、App、AA、offer、N+1 等既有缩写）、文本去重；MANUAL — §25 随机抽 10 条人工评审。

---

## 2. 出身 Mini-Saga 门禁（G-S 系列）

### G-S1 · 10/10 覆盖与 originId 绑定
- 数据经 `scripts/curated/origin-sagas.js` 进入 `build-gameplay-data.js`，产出为 `gameplay-pack.json` 的**独立 `originSagas` 数组**（与随机 saga 池物理隔离，天然防串场），每条带 `originId` 字段；`run.saga` 槽位与随机链共用，但取链只走各自的池。
- **恰好 10 条** origin saga；`originId` 与 `story.json.origins[].id` 构成**双射**（每个出身 1 条，无重复、无遗漏、无悬空 id——这正是 ORIGIN_BIAS 踩过的坑）。
- saga `id` 与既有 12 条通用 saga id 及全库其他 id 不冲突；`pack.sagas` 通用池维持 ≥ 12 不缩水。
- 验证：AUTO — `origin-sagas.test.js`：`originSagas.length === 10`，originId 集合 deepEqual story.json origins id 集合。

### G-S2 · 链结构 3–4 步
- 每条链 `steps.length` ∈ [3, 4]；每步必含 `title`（2–8 字）与 `text`（15–80 字）。
- 无 choices 的步必含 `d`（自动结算）；末步应收束叙事弧（开场 → 张力 → 代价/收获 → 落点），与该出身的 description/tags 语义一致（如 `rural-migrant` 写入城落脚，`wealthy-merchant` 写家业与身份）。
- 验证：AUTO — 步数与字段断言；MANUAL — §24/§25 人工核对叙事贴合出身。

### G-S3 · 至少 1 步带 choices
- 每条链 **≥ 1 步**含 `choices`，每处 2–3 个选项；choice 结构复用 G-E3 的 `text/d` 约定（saga choice 沿用现有 `{ text, d }` 形制）。
- saga 步与 choice 的 `d` 键 ⊆ {money, health, social, rep, edu, debt, gap}（`applyDeltas` 支持集）；`d.money` 服从 G-E4 单位制与 ±5 域。
- 验证：AUTO — 逐链断言含 choices 步数 ≥ 1、delta 键白名单、money 域。

### G-S4 · 触发时机（上界确定，可测）
- 出身链按 `origin.storyId` 绑定，**入城后第 3–18 月窗口内触发第一步**；窗口内可带随机性，但**第 18 月保底强制触发**（确定性上界，headless 推进 18 个 tick 即可稳定断言，不受 `sagaMonthlyOdds` 影响）。
- 每局**至多触发一次**（`run.done.originSaga` 去重）；完成或中断后不复活。
- 出身链只从 `originSagas` 池按 originId 取，`tryStartRandomSaga` 只从 `pack.sagas` 取：既防其他出身的链串场，也防自己的链被随机重发。
- 验证：AUTO — `origin-saga-sim.test.js`：带种子重放遍历出身，断言触发月 ∈ [3, 18]、链 id 与出身对应、他链永不出现；MANUAL — §24 实玩一局验证。

### G-S5 · 全局 id 唯一
- saga id、step 无 id 但 saga id 加入全局唯一性检查：story events、ambient、zone events、sagas 四个命名空间**合并去重**，任何冲突即失败。
- 验证：AUTO — 跨文件汇总 Set 断言（gameplay-pack 测试内已有 ambient 去重，扩展为全局）。

### G-S6 · 平衡无回归
- 引入出身链后：`life-sim.test.js` 的 180 月基准继续成立（不提前终局、health > 0、unique ambient ≥ 80、age 正常推进），且出身链在 sim 中能走完（`run.saga` 最终为 null，done 标记落位）。
- 出身链净值约束：单链全步 `d.money` 之和 ∈ [−8, +6] 单位（开局链不许当提款机，也不许把新档打穿）。
- 验证：AUTO — life-sim 扩展断言 + 逐链 money 合计域检查。

---

## 3. 反模式清单（一票否决）

| # | 反模式 | 判定线索 | 拦截点 |
|---|--------|----------|--------|
| AP-1 | 假文案 / 占位符 | `TODO`/`待补`/`lorem`/`测试`/序号式标题 | AUTO 黑名单 regex（G-E9） |
| AP-2 | 中英混杂 artifact | 「红包 fifty」式生成残留 | AUTO 英文词扫描 + 白名单（G-E9） |
| AP-3 | 重复 id | 事件/saga/ambient/zone 任意跨命名空间撞号 | AUTO 全局 Set（G-S5） |
| AP-4 | 重复文案 | text/result 逐字重复；同链步文案互抄 | AUTO 去重 + MANUAL 抽检 |
| AP-5 | 一小时通关 / 数值水龙头 | `d.money` 越域、链净值超标、180 月 sim 提前终局或资产爆炸 | AUTO（G-E4/G-S6/life-sim） |
| AP-6 | 绝对金额写进 delta | `d.money: 5000` 之类 | AUTO 域检查（G-E4） |
| AP-7 | 无权衡选项 | 事件所有选项全正收益，或选项间 delta 完全相同 | AUTO（G-E3） |
| AP-8 | SEED 镜像漂移 | 离线镜像与 story.json 内容不一致/缺 choices | AUTO 静态断言（G-E7） |
| AP-9 | 改号毁档 | EV01–EV10 或 origin id 被重命名 | AUTO（G-E1/G-S1） |
| AP-10 | 悬空引用 | originId/layerId/category 指向不存在的定义 | AUTO（G-S1/G-E2/G-E5） |
| AP-11 | 系统腔文案 | 「你获得了 X 点声望」「触发事件成功」 | MANUAL §25 |
| AP-12 | 红线失守 | 风险事件绕过冷静期，或 reduced-motion 下冷静期被跳过 | MANUAL §22 |

---

## 4. 可执行验收项（18 条）

方式：AUTO = 测试文件断言（`./scripts/run-fucheng-life-tests.sh` 内）；MANUAL = ACCEPTANCE.md §21–25 手工步骤。

| # | 验收项 | 方式 | 载体 | 通过标准 |
|---|--------|------|------|----------|
| 1 | 事件总数 ≥ 50，id 唯一且合规 | AUTO | story-schema.test.js（改写） | 断言通过 |
| 2 | EV01–EV10 保号且 title 不变 | AUTO | story-schema.test.js | deepEqual 旧值 |
| 3 | 每事件字段 schema 合法（G-E2 全项） | AUTO | story-schema.test.js | 逐条断言通过 |
| 4 | 每事件 2–3 choices，choice 结构完整 | AUTO | 新 o1-events 断言组 | 逐 choice 通过 |
| 5 | choice delta 键白名单 + money ∈ [−5,5] 整数 | AUTO | 同上 | 无越域 |
| 6 | 选项间 delta 不重复、每事件至少一个负代价选项 | AUTO | 同上 | 无违例 |
| 7 | 分层分布 L1–L4 ≥ 6、L5 ≥ 4；红线事件 ≥ 5 | AUTO | 同上 | 计数达标 |
| 8 | 占位符/英文残留/重复文案扫描 | AUTO | 同上 | 黑名单零命中 |
| 9 | fc-events 无 SCRIPT 硬编码、SEED 含 choices | AUTO | exports-smoke 或静态断言 | 断言通过 |
| 10 | origin saga 恰 10 条，originId ↔ origins 双射 | AUTO | origin-sagas.test.js | deepEqual 通过 |
| 11 | 每链 3–4 步、≥1 choices 步、delta 白名单 | AUTO | 同上 | 逐链通过 |
| 12 | 单链 money 净值 ∈ [−8,+6] | AUTO | 同上 | 逐链通过 |
| 13 | 全局 id 唯一（events/ambient/zones/sagas/originSagas） | AUTO | gameplay-pack.test.js（扩展） | 合并 Set 无冲突 |
| 14 | 出身链触发月 ∈ [3,18]（18 月保底）、他链不串场 | AUTO | origin-saga-sim.test.js | 种子重放通过 |
| 15 | 180 月 sim 无回归（不提前终局、health>0、事件多样性） | AUTO | life-sim.test.js | 原断言 + 新内容全绿 |
| 16 | 50+ 事件 SSOT 与弹窗选择闭环（Network 只载 story.json） | MANUAL | ACCEPTANCE §21 | 勾选通过 |
| 17 | 五层色贯穿 + 红线 3 秒冷静期（含 reduced-motion） | MANUAL | ACCEPTANCE §22 | 勾选通过 |
| 18 | 金钱换算一致性 + 出身链实玩 + 文案抽检 | MANUAL | ACCEPTANCE §23–25 | 勾选通过 |

**放行线**：AUTO 1–15 全绿（`./scripts/run-fucheng-life-tests.sh` 退出码 0）且 MANUAL 16–18（§21–25）全勾，缺一不放行。

---

## 5. 测试落点说明（给实现代理的断言点，不含代码）

1. **o1-events.test.js**（已落地，当前红灯 = 等 50+ 事件内容）：承载 G-E1/E2/E3/E4/E5/E9 的 AUTO 项；内容交付后必须转绿。
2. **story-schema.test.js**：迁移落地时把「恰好 10 条 sampleEvents」的断言与 `events` SSOT 调和（保留 eras/origins/cityLayers 既有断言，EV01–EV10 保号断言进入 o1-events 或本文件，二选一但不得缺失）。
3. **origin-sagas.test.js / origin-saga-sim.test.js**（已落地、已绿）：承载 G-S1/S2/S3/S5 与 G-S4 的 AUTO 项；G-S6 的单链 money 净值域若未覆盖需补断言。
4. **life-sim.test.js**：origin fixture 的 `storyId: "urban-white-collar"` 是悬空 id，改用真实出身 id；180 月基准断言维持。
5. **exports-smoke.test.js**：SCRIPT 表删除后追加「源码无 SCRIPT 表索引」与「SEED 每条含 choices」静态断言（或并入 js-syntax 检查）。
6. **手工项**全部落在 `ACCEPTANCE.md` §21–25，见该文件本次追加内容。

## 6. 签核

- Round 1 审计：完成（本文件）
- 实现代理回执：Round 2 逐条对照 §4 表格自检后在 PROGRESS.md 登记
- 终审：Round 3 按放行线执行
