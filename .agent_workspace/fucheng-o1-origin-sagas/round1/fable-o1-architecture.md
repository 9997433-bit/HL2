# O1 弹窗事件 SSOT 架构（Round 1 · fable）

> Model slug: claude-fable-5-thinking-xhigh
> Agent: fable-o1-architecture · Branch: `agent/fucheng-o1-origin-sagas`
> 交付对象：**opus 下轮实现代理**（按本文实现，不需要再做架构决策）
> 现状代码：`games/fucheng-life/data/story.json`、`js/fc-events.js`、`js/dashboard-app.js`、
> `js/story-loader.js`、`tests/story-schema.test.js`、`tests/exports-smoke.test.js`
> 依据：`.agent_workspace/fucheng-life/round2/fable-overlay-spec.md`（O1 DOM/交互契约，不改）

---

## 0. 结论速览（8 条决策）

| # | 决策 | 一句话理由 |
|---|------|-----------|
| D1 | SSOT 键 = `story.json` 顶层 **`events[]`**，同 commit 删除 `sampleEvents` | `story-loader.js` 与 `fc-events.js` 的读取链已写成 `raw.events \|\| raw.sampleEvents`，`events` 天然优先，零运行时改造成本 |
| D2 | 每条事件**必带** `choices[2–3]` 与显式 `type`，`category` 降级为展示/加权元数据 | 类型推断表 `CATEGORY_TYPE` 只保留兼容职责，作者意图不再靠猜 |
| D3 | `d` 金额沿用 **units 制**（1 unit = `max(¥400, 月收入×30%)`，经 `moneyOf` 换算），不写死 ¥ | 1984 与 2026 的人生量级不同，一个选择应花掉同等比例的月收入；这是已实现代码的现行约定（fc-events.js §剧本 注释） |
| D4 | `SCRIPT` 硬编码表**删除**；choices 内联进 `SEED` 十条镜像；ack 模式是唯一结构性兜底 | story.json 成为唯一数据源；SEED 只服务 file:// 降级，冻结 10 条禁止扩容 |
| D5 | `pick()` 扩展 `era / months / done` 三个过滤位，向后兼容 | 50+ 事件需要时代标签与 once 里程碑，抽取层必须能筛 |
| D6 | 总量 52 条：10 条迁移 + 42 条新写；配额矩阵见 §5 | L1–L5 × 4 类型 × 时代标签三维覆盖，避免"全是 L2 职场事件" |
| D7 | 与 ambientEvents 边界：**要表态的进 O1，只需要被看见的进 ambient**；ID 命名空间硬隔离 | 两池永不混装、永不互引；详见 §6 |
| D8 | 测试门禁重写 `story-schema.test.js` 事件段 + 更新 `exports-smoke.test.js`；schema 草案落 `data/events-schema.json` | 门禁从"恰好 10 条"翻转为"≥50 条且每条结构完整、文案不复读" |

---

## 1. 现状与迁移动机

- `story.json.sampleEvents`：10 条（EV01–EV10），只有 `id/title/layerId/category/text`，**没有 choices**。
- `fc-events.js` 内 `SCRIPT` 表：EV01–EV10 的 choices 硬编码（每条 2–3 项，units 制 d，含 `cost/risk/result`），
  `toPayload()` 里 `raw.choices || script.choices` 合成 payload。
- 文件底部 `SEED`：sampleEvents 的离线镜像（file:// 兜底），与 story.json 手工同步。
- 问题：事件文案在 story.json，分支在 JS——**同一条事件两处编辑**；扩到 50+ 时 SCRIPT 会膨胀成
  一千多行不可 diff 的硬编码，且 `story-schema.test.js` 卡死 `sampleEvents === 10`。

迁移后的数据流（唯一路径）：

```
story.json.events (SSOT, 52 条, 含 choices)
  → story-loader.js normalize()      （已支持 raw.events，无需改动）
  → FC.story.events
  → fc-events.js load() → build() → toPayload()   （choices 直通）
  → FC.events.pick({layer, avoid, era, months, done, allowRedline})
  → FC.events.show(payload, {moneyRef}) → resolve {choiceId, deltas, …}
  → dashboard-app.js openEvent() → FC.Sim.applyDeltas()   （入账仍归调用方，overlay 零状态）
```

---

## 2. story.json `events[]` schema

机器可读版见 `games/fucheng-life/data/events-schema.json`（JSON Schema draft-07）。
以下为作者视角的字段表。

### 2.1 事件字段

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|:---:|------|------|
| `id` | string | ✓ | `/^EV\d{2,3}$/`，全局唯一 | EV01–EV10 保留给迁移事件（旧档 `recentModal` 里存有这些 id，不可改名）；新事件 EV11 起顺延 |
| `title` | string | ✓ | 2–12 字 | serif 大标题，名词性短语，不带句号 |
| `body` | string | ✓ | 36–140 字 | 一个具体场景，文案守则见 §5.4 |
| `category` | string | ✓ | 枚举：生计 居住 职场 教育 机会 人情 关系 风险 金钱 健康 | 展示与加权元数据（originBias/eraTag 复用 ambient 的类目习惯）；**不再决定 type** |
| `type` | string | ✓ | `opportunity` \| `bill` \| `relation` \| `redline` | 驱动角标/accent/冷静期（overlay-spec §1.4）；显式声明，`CATEGORY_TYPE` 推断表仅作缺省兜底保留 |
| `layerId` | string | ✓ | `L1`–`L5` | 驱动层色与 `weightOf` 层距加权 |
| `weight` | int | ✓ | 1–12 | 基础权重；建议值见 §5.3 |
| `scene` | string | | ≤ 14 字 | 场景 chip 覆盖（缺省 = `"L2 · 工薪层"` 自动拼接），仅特殊事件用 |
| `eras` | string[] | | ⊆ E1–E7，≥1 项 | **缺省 = 全时代**；带此字段的事件只在对应时代入池，且加权 ×2（§3.3） |
| `once` | bool | | | 一生一次的里程碑事件；命中后记入 `run.done[id]` |
| `minMonths` / `maxMonths` | int | | ≥0，min ≤ max | 入城月数门槛（如"过桥贷"不该出现在第 2 个月） |
| `choices` | choice[] | ✓ | **长度 2–3** | 见 2.2；渲染层支持 1–4，门禁按 2–3 收 |

**不设** `minAge/maxAge`（ambient 已有年龄事件承担生命周期叙事；O1 用 `minMonths` 就够，避免两套年龄门互相打架）。

### 2.2 choice 字段

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|:---:|------|------|
| `id` | string | ✓ | `/^[a-z][a-z0-9_-]{1,15}$/`，事件内唯一 | 进日志与 resolve 值；语义化英文 token（`repay`/`stall`/`walk`） |
| `label` | string | ✓ | 4–14 字，动词开头 | 按钮文案 |
| `d` | object | ✓ | 非空；键 ⊆ `{money, debt, health, social, rep, edu, gap}`；**非零键 ≤ 3** | 结算增量。**canonical 键名是 `d`**（与 SCRIPT/ambient/saga 一致）；`toPayload` 同时接受别名 `deltas`（overlay-spec §3.2 的历史命名），但 story.json 内统一写 `d` |
| `result` | string | ✓ | 20–80 字 | 结果面叙事；写"选择之后的世界"，不复述 label |
| `cost` | string | | ≤ 10 字 | 代价标注展示串（`现金 −−` / `人情 ▲` / `风险 ▲`）；风险选项固定用 `风险 ▲` |
| `risk` | bool | | | 标 `fc-choice--risk` 视觉；**redline 事件至少 1 个 risk 选项**（schema 强制） |
| `preview` | {stat,size}[] | | stat ∈ money/health/social/rep，size ∈ s/m/l | 显式覆盖后果预览点；一般不写，交给 `_bucket()` 自动分档 |

### 2.3 `d` 的单位与幅度约定（作者必读）

| 键 | 单位 | 建议范围 | 换算 |
|----|------|---------|------|
| `money` / `debt` | **units** | −5 … +5 | 结算时 `moneyOf(units, 当月收入)` = `units × max(400, round(收入×0.3))`；±5 ≈ ±1.5 个月收入，是单事件天花板 |
| `health` / `social` / `rep` / `edu` | 属性点 | −8 … +8 | `FC.Sim.applyDeltas` clamp 0–100 |
| `gap` | 月 | 0 … +6 | 空窗期（辞职/被裁类选项用） |

- 文案里**不写死 ¥ 金额**（结果面会显示 moneyOf 换算后的具体 ¥，写死会打架）。
  现有 SCRIPT 文案已守此规矩（EV09"按纸上的数还回去"没写数字），沿用。
- 预览点每选项 ≤3 枚才可读，所以非零键 ≤3 是硬约束。
- 没有全好或全坏的选项：每条事件至少两个选项互为 trade-off（门禁不查语义，靠 review）。

### 2.4 一条完整示例（迁移后的 EV09，choices 从 SCRIPT 原样搬入）

```json
{
  "id": "EV09",
  "title": "潮汐线下的借据",
  "category": "风险",
  "type": "redline",
  "layerId": "L5",
  "weight": 8,
  "body": "江水准时退去，露出一张被雨泡软的借据。名字还清楚，承诺已经晕开。",
  "choices": [
    { "id": "repay", "label": "按纸上的数还回去", "cost": "现金 −−−−",
      "d": { "money": -4, "rep": 4 },
      "result": "你把钱转过去，对方发来一个句号。借据被撕掉，名字终于不再流通。" },
    { "id": "stall", "label": "先拖着，等对方开口", "cost": "风险 ▲", "risk": true,
      "d": { "money": 1, "rep": -5, "social": -2 },
      "result": "没有人来催。三周后，一个陌生号码开始每天固定时间响两声。" },
    { "id": "broker", "label": "找中间人重新谈", "cost": "风险 ▲", "risk": true,
      "d": { "money": -2, "social": -3, "rep": -1 },
      "result": "中间人把数字压下来一些，条件是这件事以后由他记着。" }
  ]
}
```

注意迁移细节：旧 `text` 字段更名 **`body`**（`toPayload` 里 `raw.body || raw.text` 两者都收，
但 SSOT 统一写 `body`）；`type` 按现行 `CATEGORY_TYPE` 映射显式写出（职场/教育/城市 → opportunity 兜底）。

---

## 3. fc-events.js 改造

### 3.1 `load()` — 不改

读取链 `FC.story.events || sampleEvents → fetch story.json → SEED` 已按优先级排好；
story.json 换键后自动走 `events`。唯一变化是 `build()` 输出的 deck 从 10 变 52。

### 3.2 `toPayload()` — 小改

```js
function toPayload(raw) {
  var type = raw.type || CATEGORY_TYPE[raw.category] || "opportunity";
  var layer = raw.layerId || raw.layer || "L2";
  return {
    id: raw.id,
    type: type,
    layer: layer,
    layerIndex: layerNum(layer),
    scene: raw.scene || (layer + " · " + (LAYER_NAME[layer] || "城市")),
    category: raw.category || "",
    title: raw.title,
    body: raw.body || raw.text,
    weight: raw.weight || 8,
    eras: raw.eras || null,          /* 新增：时代标签直通 */
    once: !!raw.once,                /* 新增 */
    minMonths: raw.minMonths || 0,   /* 新增 */
    maxMonths: raw.maxMonths || 0,   /* 新增，0 = 不设上限 */
    choices: normalizeChoices(raw.choices)
  };
}

function normalizeChoices(list) {
  if (!list || !list.length) return [];   /* → ack 模式，结构性兜底 */
  var out = [], i, c;
  for (i = 0; i < list.length; i++) {
    c = list[i];
    out.push({
      id: c.id, label: c.label, cost: c.cost || "",
      d: c.d || c.deltas || {},           /* deltas 别名归一到 d */
      result: c.result || "", risk: !!c.risk,
      preview: c.preview || null
    });
  }
  return out;
}
```

删除 `var script = SCRIPT[raw.id] || {}` 与 `raw.choices || script.choices` 查表。

### 3.3 `pick(opts)` — 加三个过滤位 + 时代加权

```js
/* opts: { layer, avoid, allowRedline,
           era: "E7",        新增：无 eras 字段的事件全时代通过；有则须包含 era
           months: 14,       新增：minMonths/maxMonths 门
           done: run.done }  新增：once 事件已完成表（与 ambient/saga 共用 run.done，
                             EV 前缀不会和 U/M/E*_/L*_/saga_ 冲突） */
function pick(opts) {
  ...
  for (i = 0; i < deck.length; i++) {
    var ev = deck[i];
    if (avoid.indexOf(ev.id) >= 0) continue;
    if (opts.allowRedline === false && ev.type === "redline") continue;
    if (ev.eras && (!opts.era || ev.eras.indexOf(opts.era) < 0)) continue;
    if (opts.months != null) {
      if (ev.minMonths && opts.months < ev.minMonths) continue;
      if (ev.maxMonths && opts.months > ev.maxMonths) continue;
    }
    if (ev.once && opts.done && opts.done[ev.id]) continue;
    var w = weightOf(ev, layer);
    if (ev.eras) w *= 2;   /* 每时代仅 ~3 条专属事件，×2 保证它们在 31 条通用事件里有存在感 */
    ...
  }
}
```

`weightOf` 的层距加权（同层 ×3 / 邻层 ×1.4 / 远层 ×0.45 / L5 特判）**不动**——它是
现行手感的一部分，L5 事件增多后仍被 ×0.3（低层玩家）与 redline 闸门双重限流。

### 3.4 SCRIPT 的去留（明确规则）

- **终态：删除 `SCRIPT` 表。** choices 的唯一权威在 story.json；file:// 降级由 SEED 承担。
- **SEED 冻结为 10 条**（EV01–EV10），每条**内联 choices**（从 SCRIPT 原样搬入），
  头注释改为：「离线降级牌组，仅 file:// 双击可达；禁止扩容，50+ 全量只活在 story.json」。
  SEED 里的事件走 `raw.choices` 同一条路径，SCRIPT 自然成为死代码。
- **过渡期例外**（仅当 opus 拆多个 commit 落地时）：story.json 先行、fc-events 后行的中间
  commit 允许保留 `raw.choices || SCRIPT[raw.id].choices` 的查表顺序（story 优先）；
  一旦 `story-schema.test.js` 的"每条事件 2–3 choices"门禁转绿，SCRIPT 必须在同一轮删除。
- ack 模式（choices 为空 → 单个"继续 ▸"按钮）**保留**为结构性兜底：它兜的是数据错误，
  不是数据来源。门禁保证 SSOT 内不会出现无 choices 事件。

### 3.5 触发面改造（dashboard-app.js `drawModalEvent`）

```js
var draw = {
  layer: layerOf(),
  avoid: run.recentModal || [],
  era: era.id,          /* 新增 */
  months: run.months,   /* 新增 */
  done: run.done        /* 新增 */
};
var ev = FC.events.pick(draw);
...
if (ev.once) run.done[ev.id] = true;                          /* 新增：once 落账 */
run.recentModal = (run.recentModal || []).concat(ev.id).slice(-8);  /* 3 → 8 */
```

- `recentModal` 窗口 3→8：52 条 deck 下 3 条去重窗口会明显复读；8 ≈ 两年内不重复。
  `fc-sim.js` 的 `freshRun/migrate` 已带 `recentModal`，无需迁移逻辑。
- `MODAL_ODDS`（[0,0,.45,.65,1]）、redline 12 个月冷却、`sinceModal` 节奏**全部不动**——
  供给变大不改变触发频率，只改变多样性。
- saga 步骤复用 O1 渲染（`resolveSagaStep` 合成 `saga_*` payload）不受影响；
  `saga_` 是保留 id 前缀，deck 事件禁用。

---

## 4. 与 ambientEvents（gameplay-pack）的职责边界

一句话：**需要玩家表态的叙事进 O1（story.json.events），只需要被玩家看见的叙事进
ambient（gameplay-pack.ambientEvents）。**

| 维度 | O1 弹窗事件 | ambient 环境事件 |
|------|------------|-----------------|
| SSOT | `story.json.events`（手工编辑） | `scripts/curated/*` → `build-gameplay-data.js` 生成 `gameplay-pack.json` |
| 渲染 | `FC.events.show` 模态弹窗，中断，必须表态 | 日志流一行，无交互 |
| choices | 必须 2–3 | **禁止**（管线 `normalizeEvent` 不认，出现即 bug） |
| 入账 | 调用方（dashboard）在 resolve 后 `applyDeltas(choice.d)` | `FC.Sim.pickAmbient` 命中即自动 `d` 入账 |
| 频率 | `sinceModal` 概率表，2–4 月一次 | 每月约 1 条 |
| 体量 | 52 条，全手写，每条 200+ 字 | 301 条，允许批量生产，每条 1–2 句 |
| delta 量级 | money ±5 units、≤3 键，是"人生的转折点" | 小幅轻推（多为 ±1–4），是"日子的纹理" |
| 抽取器 | `FC.events.pick`（deck 内，era/once/months 过滤） | `FC.Sim.pickAmbient`（originBias/eraTag/talent 加权） |
| ID 空间 | `EV\d+` | `U*/M*/E[1-7]_*/L[1-5]_*`（zone 事件另有 zone key） |

硬规则：

1. **两池 ID 命名空间硬隔离**，且互不引用（O1 事件不 ref ambient id，反之亦然）。
2. **同一题材不双写**：如果 ambient 已有"热水器坏了"（U001），O1 不再写热水器事件——
   O1 可以写它的"决策版上级题材"（例如整租还是续租城中村）。opus 新写事件前先
   `grep` ambient 池的关键词（对每条新事件抽 2 个名词查 `gameplay-pack.json`）。
3. `originBias`/`eraTagMul` 是 ambient 专属加权，O1 不接——O1 的出身相关叙事由
   origin mini-saga（本 orchestrator 的另一条线）承担，避免三套出身偏置叠加。
4. 里程碑类：ambient 的 `M*`（once 日志事件）继续存在；O1 的 `once` 事件是"带抉择的
   里程碑"（如首次过桥贷），两者靠"是否需要表态"分流，不靠题材分流。

---

## 5. 52 条事件分层策略

### 5.1 层 × 类型配额矩阵（含 10 条迁移件）

| | opportunity 机遇 | bill 账单 | relation 人情 | redline 红线 | 合计 |
|---|---|---|---|---|---|
| **L1 市井层** | 3 | 4 ⁽含EV01,EV10⁾ | 2 | 2 | **11** |
| **L2 工薪层** | 4 ⁽含EV03,EV05⁾ | 5 ⁽含EV02⁾ | 3 | 1 | **13** |
| **L3 上升通道** | 5 ⁽含EV04,EV06⁾ | 2 | 2 | 1 | **10** |
| **L4 资本名利** | 3 | 1 | 4 ⁽含EV07,EV08⁾ | 2 | **10** |
| **L5 暗流** | 1 | 1 | 1 | 5 ⁽含EV09⁾ | **8** |
| **合计** | **16** | **13** | **12** | **11** | **52** |

设计意图：L2 最厚（玩家最常驻层）；L5 供给虽 8 条但被层距 ×0.3 与 redline 闸门限流，
实际出场率仍最低；redline 总量 11 条中 5 条在 L5、其余分布在各层的"体面人的红线"
（刷单、阴阳合同、学历造假式），避免"红线 = 只有黑社会"。

### 5.2 时代标签配额

- **31 条通用**（无 `eras` 字段，全时代可触发）——城市的常量：房租、加班、人情、看病。
- **21 条时代专属**（`eras` 单元素为主，允许跨相邻时代如 `["E4","E5"]`），每时代 3 条：

| 时代 | 3 条题材种子（方向，非文案） |
|------|------------------------------|
| E1 单位时代 | 分房名单公示夜 · 顶职招工的家庭会议 · 车间技术比武 |
| E2 下海时代 | 停薪留职申请表 · 南下车票与铺盖卷 · 认购证队伍里的黄牛价 |
| E3 地产时代 | 房改房买断的存折 · 拆迁签约桌 · 第一张按揭表格 |
| E4 互联网时代 | 网吧包夜后的招聘帖 · 域名/网店抢注 · 门户裁员传闻 |
| E5 移动互联时代 | 补贴大战入伙邀请 · P2P 年化的下午茶 · 众包骑手的雨夜单 |
| E6 存量时代 | 教培最后一课 · 35 岁简历的已读不回 · 断供边缘的家庭会议 |
| E7 当下 | 社保断缴红点（示例 EV11）· AI 替岗后的转岗谈话 · 灵活用工合同的乙方 |

时代专属事件在 §3.3 里加权 ×2，保证每时代 3 条不会淹没在 31 条通用事件里。

### 5.3 其他配额与参数

- **once 里程碑**：4–6 条（首次过桥贷、首次买房抉择式），全部带 `minMonths`。
- **minMonths 门**：L4/L5 与大额事件建议 ≥12–18；入城前 6 个月只该遇到 L1–L3 的小事。
- **weight 建议值**：通用常驻 6–9；时代专属 5–7（有 ×2 加成，基础值放低）；
  once 里程碑 5–7；redline 4–7（低权重 + 闸门双保险）。
- **choices 数量分布**：约 2/3 的事件 3 选项、1/3 的事件 2 选项（二难更锋利，三选更自由，混着来）。

### 5.4 文案守则（写实、禁模板复读）

1. `body` 只写**一个具体场景**，不做人生总结；至少一个可触摸的实物名词
   （卷帘门、烟灰缸、App 红点、拴着链子的笔），至少一处具体时间或数字细节。
2. **禁复读**：任何 ≥10 个连续字符的短语不得在两条事件间重复（门禁 n-gram 查，§7）；
   禁以"你决定/突然/命运"开头；结尾禁感叹号；每层/每类型内句式错开
   （不允许 5 条 bill 全是"XX 到了，你付不付"骨架）。
3. `label` 动词开头、4–14 字、口语可说；选项之间互斥且都"说得出口"——没有明显的傻选项。
4. `result` 不复述 label，写**选择之后的世界**（谁回了话、什么声音停了、哪盏灯灭了），
   允许留钩子，不给道德评判。
5. 现实锚点用具体名词但避免可诉商标：写"外卖平台/短视频/网约车"，不写具体公司名。
6. `d.money` 用 units（§2.3），文案不写死 ¥ 金额。

### 5.5 三条示范事件（成品质量标尺，随迁移一并入 story.json）

**EV11 · L2 × bill × E7 · 时代专属**

```json
{
  "id": "EV11",
  "title": "断缴提醒",
  "category": "金钱",
  "type": "bill",
  "layerId": "L2",
  "weight": 7,
  "eras": ["E7"],
  "body": "离职第二个月，人社 App 弹出红点：社保断缴将影响购房资格与积分。原来自由的第一张账单，是以前公司替你付的那一半。",
  "choices": [
    { "id": "self", "label": "找代缴公司续上", "cost": "现金 −−",
      "d": { "money": -2, "rep": 1 },
      "result": "代缴公司收了服务费，承诺「和在职一样」。你的工资条消失了，缴费记录还活着。" },
    { "id": "pause", "label": "先断着，入职再说", "cost": "风险 ▲", "risk": true,
      "d": { "money": 1, "rep": -2 },
      "result": "你把 App 挪进文件夹最深处。省下的钱撑过了这个月，购房资格的钟在身后停了。" },
    { "id": "family", "label": "打电话回家周转", "cost": "人情 −",
      "d": { "money": 2, "social": -2 },
      "result": "母亲没问原因，第二天钱就到了。挂电话前她说，实在不行就回来。你说不会。" }
  ]
}
```

**EV12 · L3 × opportunity × E4/E5 · 跨时代 + minMonths**

```json
{
  "id": "EV12",
  "title": "内推截止前夜",
  "category": "机会",
  "type": "opportunity",
  "layerId": "L3",
  "weight": 6,
  "eras": ["E4", "E5"],
  "minMonths": 6,
  "body": "老同学在大厂做到第三年，说部门缺人，内推链接今晚十二点关。你的简历停在两年前，项目一栏还写着毕业设计。",
  "choices": [
    { "id": "rush", "label": "连夜改简历投出去",
      "d": { "rep": 3, "health": -3 },
      "result": "凌晨一点五十提交。三天后收到笔试链接——机会没有偏爱你，但也没有跳过你。" },
    { "id": "honest", "label": "跟他说实话，还没准备好",
      "d": { "social": 2 },
      "result": "对方回了个「行，下批我再喊你」。这句话的有效期，你们都没有细问。" },
    { "id": "embellish", "label": "把履历写得漂亮一点", "cost": "风险 ▲", "risk": true,
      "d": { "rep": 4, "social": -1 },
      "result": "面试官顺着简历问到第三层，你答得越来越慢。出门时衬衫湿透，offer 和背调一起在路上。" }
  ]
}
```

**EV13 · L5 × redline × 通用 · once + minMonths**

```json
{
  "id": "EV13",
  "title": "过桥",
  "category": "风险",
  "type": "redline",
  "layerId": "L5",
  "weight": 5,
  "once": true,
  "minMonths": 18,
  "body": "茶楼包间里，介绍人把一张写着日息的纸推过来：「就借七天，桥那头是回款。」烟灰缸里已经有三个烟头，没有一个是你的。",
  "choices": [
    { "id": "sign", "label": "签，七天就七天", "cost": "风险 ▲", "risk": true,
      "d": { "money": 4, "debt": 3, "rep": -3 },
      "result": "钱当晚到账。第八天回款没来，介绍人的电话开始比闹钟准时。" },
    { "id": "half", "label": "只借一半，留条退路", "cost": "风险 ▲", "risk": true,
      "d": { "money": 2, "debt": 1, "rep": -1 },
      "result": "对方笑你胆小，还是点了头。后来你才知道，这张桌上敢只借一半的人不多。" },
    { "id": "walk", "label": "把纸推回去，起身买单", "cost": "现金 −",
      "d": { "money": -1, "social": -2, "rep": 2 },
      "result": "介绍人送你到电梯口，说门一直开着。你按了下行，这层楼的灯在身后灭掉一半。" }
  ]
}
```

三条分别示范：时代专属 + 三方 trade-off（EV11）、跨时代 + minMonths + risk 单点（EV12）、
once 里程碑 + redline 双 risk + 全身而退有代价（EV13）。

---

## 6. 测试门禁改造

### 6.1 `tests/story-schema.test.js`（重写事件段）

```
- assert !("sampleEvents" in story)                    ← 防双源回潮
- story.events：数组，length ≥ 50
- id 唯一，/^EV\d{2,3}$/；EV01…EV10 必须在场（旧档 recentModal 兼容）
- 每条：title(2–12) / body(36–140) / category(枚举10) / type(枚举4) /
        layerId(引用 cityLayers) / weight(int 1–12)
- eras ⊆ E1..E7 且非空数组（若存在）；minMonths ≤ maxMonths（若都存在）
- choices.length ∈ [2,3]；choice.id 事件内唯一且匹配 token 格式；
  label/result 非空且 result ≠ label；d 非空、键 ⊆ {money,debt,health,social,rep,edu,gap}、
  money/debt ∈ [−5,5]、其余 ∈ [−8,8]、非零键 ≤ 3
- type === "redline" → choices 里 ≥1 个 risk:true
- 文案防复读：任意两条 event.body 之间无 ≥10 连续字符的公共子串（10-gram 集合求交）
- 统计断言：redline 总数 ≤ 12；带 eras 的事件每时代 ≥ 2（保证时代覆盖不塌）
```

### 6.2 `tests/exports-smoke.test.js`（三处更新）

```
- story.sampleEvents[0] → story.events 里查 EV01；choices 断言改为"来自 raw 而非 SCRIPT"
- deck.length === 10 → deck.length >= 50
- 新增 pick 过滤冒烟：pick({layer:2, era:"E1", months:1}) 返回的事件
  要么无 eras、要么含 "E1"，且 minMonths ≤ 1
```

### 6.3 `data/events-schema.json`

JSON Schema draft-07 草案（本轮已交付，见文件）。定位：**作者文档 + 可选机器校验**。
执行性门禁仍在 `story-schema.test.js` 的手写断言里（零依赖原则，不引 ajv）；
若 opus 想启用 schema 校验，可写 ~40 行的手撸子集校验器读该文件，不算门禁必需。

### 6.4 回归项

- `./scripts/run-fucheng-life-tests.sh` 全绿（六项）。
- `life-sim.test.js` 180 月 sim 不受影响（O1 不进 headless sim 管线），但需跑一遍确认。
- file:// 双击打开 dashboard：story-loader 同步 XHR 失败 → SEED 10 条兜底、console 无未捕获错误。
- 手测：推进 ≤4 月必弹一次；E1 存档只弹通用 + E1 专属；once 事件同一存档不二现。

---

## 7. 下轮 opus 任务清单

按依赖顺序，单 PR 内建议 commit 粒度如下：

1. **`data/story.json`**：新增顶层 `events[]` 52 条 —— EV01–EV10 迁移（`text`→`body`、
   显式 `type`、choices 从 SCRIPT 原样搬入）+ EV11–EV13 采用本文 §5.5 成品 +
   **39 条新写**（严格按 §5.1 矩阵与 §5.2 时代配额补格子，文案守则 §5.4）；
   同 commit 删除 `sampleEvents` 键。
2. **`js/fc-events.js`**：§3.2 `toPayload`/`normalizeChoices`、§3.3 `pick` 过滤与时代加权、
   §3.4 删除 SCRIPT、SEED 内联 choices 并冻结注释。
3. **`js/dashboard-app.js`**：§3.5 `drawModalEvent` 传 `era/months/done`、once 落账、
   `recentModal` 窗口 3→8。
4. **`tests/story-schema.test.js` + `tests/exports-smoke.test.js`**：按 §6.1/§6.2 重写；
   跑 `./scripts/run-fucheng-life-tests.sh` 全绿后提交。
5. **自查脚本**（不入库也行）：n-gram 复读检查、每条新事件抽 2 个名词 grep
   `gameplay-pack.json` 防题材双写（§4 规则 2）。
6. 手测清单：§6.4 四项 + 390px 无横向溢出（overlay-spec §7 既有项不回归）。

红线（做错会返工）：不改 `MODAL_ODDS`/redline 冷却/`weightOf` 层距曲线；不动 overlay-spec
的 DOM/交互契约；`saga_` 前缀不入 deck；ambient 池零改动。

---

*fable-o1-architecture · Round 1 · 《浮城人生》URBAN LIFE SIMULATOR*
