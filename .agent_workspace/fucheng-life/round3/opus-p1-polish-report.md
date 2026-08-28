Model slug: claude-opus-5

# Round 3 · opus-r3-p1-polish 报告

> Agent: `opus-r3-p1-polish` · Branch: `agent/fucheng-life-ui` · Code: `games/fucheng-life/`
> 任务来源：[`round3/ROUND3_CONTEXT.md`](ROUND3_CONTEXT.md) §opus-r3-p1-polish ·
> 缺口基线：[`round2/fable-gap-matrix.md`](../round2/fable-gap-matrix.md) P1-5 / P1-6 / P0-5 残留 / §4.5

## 0. 结论

四项 P1 全部落地并实测通过。四个提交（每项一个，地图与仪表盘互不牵连）：

| 提交 | 内容 |
|------|------|
| `1b2c86b` | 未解锁地点的玻璃天花板（P1-6） |
| `280d45a` | 事件日志增量渲染（P0-5 残留） |
| `48bf219` | HUD 金钱警示态「氧气不足」（§4.5） |
| `f971827` | 结算金钱浮字 `+¥/-¥` 飞入 HUD（P1-5） |

浏览器验收 390×844 Chrome headless，30 项断言全绿，仪表盘与城市地图在
加载与交互全程 **零 console error / warning / requestfailed**，无横向溢出。
仓库测试链 `./scripts/run-fucheng-life-tests.sh` 4/4 通过。

---

## 1. 金钱浮字 `+¥/-¥` 飞入 HUD（P1-5）

**问题**：`tick()` 结算后钱变了，屏幕上只有数字悄悄换成另一个数字加一下
`fc-flash` 亮度闪。玩家看不见钱「走」，只看见钱「变」。

**实现**：`FCMotion.moneyFloat(amount, opts)`（`js/fc-motion.js`），与
count-up / stagger / wipe 同住共享动效层，其他屏幕可直接复用。

```js
FCMotion.moneyFloat(-1300, { target: document.getElementById("sMoney"),
                             from: tickButton, delay: 150 });
```

- `position: fixed` 节点，Web Animations 驱动，`onfinish` 自毁，
  另有 `delay + 640 + 260ms` 的兜底 `setTimeout`（标签页切后台时
  `onfinish` 不会触发，不能只靠它）
- **同时在飞 ≤4**：`flying` 计数在生成时自增、移除时自减，超限直接丢弃
- 轨迹分四帧：先脱离源头上抬 18px 并放大到 1.06，再奔向目标，落点缩到
  0.78 并淡出。两点之间拉直线读起来像 tooltip，不像钱在走
- 无 `Element.animate` 时退回 `.fc-float--rise` 原地上浮关键帧
- `prefers-reduced-motion` 下**完全不生成节点**（不是生成后不动）

**仪表盘接线**（`screens/dashboard.html`）：`tick()` 按发生顺序收集当月
每一笔 —— 事件 delta → 月净流 → 透支医药费 —— 交给 `flyMoney()`，间隔
150ms 依次发出，最多 3 条，**绝对值 < ¥50 的零头不飞**（留在日志里）。
O1 结算走同一条路，但不给源点：那张卡已经拆了，delta 从 HUD 下方升起。

**实测**：一次结算最多两条浮字（`−¥1,300` / `+¥1,084`），1.4s 后
`document.querySelectorAll(".fc-float").length === 0`。

---

## 2. 城市地图未解锁层：磨砂 + 锁括线 + 门槛文案（P1-6）

**问题**：`.fc-zone.is-locked` 此前只有 `opacity: .42` + 一行「· 未解锁」，
读起来像渲染失败，不像阶层壁垒。架构 §2 S3 与审计 P23 要的是**可见的
玻璃天花板**。

**实现**（`css/screens.css` §14 + `screens/city-map.html`）：

| 部件 | 做法 |
|------|------|
| 磨砂罩层 | `.is-locked::before`，`backdrop-filter: blur(6px) saturate(60%)` + 118° 玻璃反光渐变 |
| 锁括线 | `.is-locked::after`，8 段 `linear-gradient` 背景画出四角 L 形夹钳（9px 臂长 / 1.5px 线重），不是完整描边框——节点要读作「被夹住」而非「被框住」 |
| 锁形字符 | `.fc-zone__lockicon`，SVG `mask` 取层色。锁定节点不再显示脉冲圆点——锁着的地方不该还在呼吸 |
| 地名失焦 | `filter: blur(.7px)` + `opacity: .74` |
| 门槛价签 | `.fc-zone__gate`，mono 10px，**始终清晰** |

**一个必须记下来的坑**：`::before` 是定位盒，绘制顺序在行内内容**之后**，
所以磨砂罩层原本盖在价签上、把价钱一起糊掉了。修法是给
`.fc-zone__stack / __lockicon / __dot` 加 `position: relative`，把内容抬回
同一绘制阶段并排在 `::before` 之后。**看得见、读得到价，就是进不去** ——
价钱糊掉的天花板只是一堵墙。

hover / focus / 选中时玻璃变淡到 0.45、地名回到焦内；但**不抬升、不发光**
（`transform: none; box-shadow: none`），沿用 Round 2 定下的「锁定面不回答」。

**门槛文案**（数据加在 `STRATA_LAYOUT` 的 `gate` 字段，缺省回落到
「准入门槛 nn / 100」）：

| 层 | 地点 | 文案 |
|----|------|------|
| L4 | CBD 顶层会所 | 入场券 ¥5,000,000 · 需引荐 |
| L4 | 江景豪宅 | 入场券 ¥2,000,000 |
| L4 | 私募办公室 | 入场券 ¥1,000,000 · 声望 86 |
| L5 | 地下钱庄 | 不收钱 · 收把柄 |

**内容改动一处**：把 L5 地下钱庄改为锁定态。架构 §2 S3 明写「L5 的锁定
文案更冷（『这扇门不收钱，收把柄。』）」，而基线上 L5 无一节点锁定，冷
文案变体没有落点。此改动只影响展示（详情面板的「状态」行），不触及任何
玩法判定。**如果验收认为不该动内容，把 `locked: true` 与 `gate` 两行删掉
即可，样式层不受影响。**

详情面板同步补了「入场券」一行，「状态」字改警示色。

**实测**：4 个锁定节点全部具备磨砂 / 8 段括线 / 锁字符 / 门槛文案；最宽
205px，390px 下无横向溢出；点击锁定节点仍可在右栏读到完整门槛。

---

## 3. HUD 金钱警示态「氧气不足」（§4.5）

架构 §2 S4：*现金 < 下月固定支出时，HUD 金钱数字进入警示态（呼吸红光）*。
基线上只有健康条和收支比会变红——钱本身，这游戏里的氧气，一声不吭。

- `render()` 以当月账单合计近似下月固定支出，低于它就给金钱卡加
  `.is-warning`，并亮出 `#moneyWarn`「氧气不足」小徽章
- **发光预算**：警示**不新增**常驻发光面。`.fc-stat__value` 本来就带一层
  tint 光晕，`.is-warning` 只是把它换成 2.4s 的红色呼吸（`fc-oxygen`），
  同屏警示面恒为 1（实测断言 `warning surface(s) === 1`）
- 卡片边框与右上角径向光一并转红，读作一张卡整体报警而不是一个字变色
- **reduced-motion**：关键帧的 `0%/100%` 就是静止暗红态，全局
  `animation-duration: 0.001ms` 钳制会落在暗红上而不是随机一帧；
  reduce 分支另有显式 `animation: none` + 静态 `text-shadow` 兜底

**实测**：现金 ¥120 / 账单约 ¥1,700 → 警示亮起、徽章可见、
`animation-name === "fc-oxygen"`；补到 ¥900,000 → 自动熄灭、徽章 `hidden`。

---

## 4. 事件日志增量渲染（P0-5 残留）

**问题**：`renderLog()` 每个月重建整个 `innerHTML`，`fc-logslide` 于是在
**全部 24 条**上同时重播。推进一个月看起来像整本日志被重写了一遍，而不是
往上添了一行。

**实现**：

1. 每条日志带单调递增的 `seq`。读档时按时间**重新编号**——上一次会话的
   计数器对这一次没有意义，重编号顺带消除跨会话的 seq 撞号
2. `pushLog()` 成为唯一写入口（tick / 透支 / O1 结算 / 系统提示 / 开局），
   顺手收编了原本散落三处的「超过 60 条截断」
3. `renderLog()` 维护一份已绘制的 seq 列表，只把高于头部 seq 的条目
   `insertAdjacentHTML("afterbegin", …)` 插到最前，其余 DOM 节点原地保留；
   仅首绘、重开、以及 DOM 与记录对不上时才走全量重建
4. 入场动画从 `.fc-log__item` 移到 `.fc-log__item.is-new`，`animationend`
   后摘除 class —— 滑入是一次通告，不是条目的固有属性

**实测**：连推 10 个月后再推一月，12 条中**仅 1 条**带 `.is-new`，此前的
11 个 DOM 节点**全部复用**（`nodes.filter(n => before.includes(n)).length === 11`）。

---

## 5. 验收

### 5.1 自动化

```
$ ./scripts/run-fucheng-life-tests.sh
JavaScript syntax: 12 file(s) passed node --check.
Story schema: 7 eras, 10 origins, 5 layers, and 10 events passed.
HTML link integrity: 90 local link(s) resolved.
Browser exports smoke test: FCMotion, FC.overlay, and FC.events passed.
浮城人生 test summary: 4 passed, 0 failed
```

**注意**：`js-syntax.test.js` 只扫 `.js` 文件，仪表盘和地图的主逻辑都在
HTML 内联 `<script>` 里，**测试链覆盖不到**。本轮所有行为验证都是在真实
Chrome 里跑的（下节），建议后续把内联块也纳入语法检查。

### 5.2 浏览器（Chrome headless，390×844，DPR 2）

一次性脚本，监听 `console` / `pageerror` / `requestfailed`：

| 断言 | 结果 |
|------|------|
| 仪表盘加载零报错 | ✅ |
| 日志首绘 | ✅ |
| 只有新条目播动画 | ✅ 12 条中 1 条带 `.is-new` |
| 旧 DOM 节点复用 | ✅ 11/11 |
| 浮字在飞 | ✅ `−¥1,300` `+¥1,084` |
| 浮字落地自毁 | ✅ 1.4s 后 0 个 |
| `.is-new` 播完摘除 | ✅ 0 个残留 |
| 现金 < 账单 → 警示亮 | ✅ 徽章可见 |
| 警示呼吸 | ✅ `fc-oxygen` |
| 发光预算 | ✅ 警示面 1 个 |
| 偿付后警示熄灭 | ✅ |
| 仪表盘 390px 无横向溢出 | ✅ 0px |
| 仪表盘交互后控制台干净 | ✅ |
| 地图加载零报错 | ✅ |
| 锁定节点 4 个 | ✅ |
| 地名磨砂 | ✅ `blur(0.7px)` |
| 磨砂罩层 | ✅ backdrop blur |
| 锁括线 8 段 | ✅ |
| 锁形字符 | ✅ |
| 门槛文案 | ✅ 4/4 |
| L5 冷文案 | ✅ 不收钱 · 收把柄 |
| 详情面板含「入场券」 | ✅ |
| 地图 390px 无横向溢出 | ✅ 0px |
| 地图交互后控制台干净 | ✅ |
| reduce：不生成浮字 | ✅ 0 个 |
| reduce：月份照常推进 | ✅ |
| reduce：控制台干净 | ✅ |
| index / era-select / origin-select 无回归 | ✅ 0px 溢出、零报错 |

交互路径包含连推 10 个月、逐次应答 O1 弹窗、关闭 O2 账单抽屉——与
`opus-r3-o2-ledger` 本轮合入的抽屉共存无冲突。

---

## 6. 遗留与建议

1. **测试链盲区**：内联 `<script>` 不过 `node --check`。建议 harness 增加
   一步：抽取 HTML 内联脚本喂 `node --check`（本轮四项功能有三项主要住在
   `dashboard.html` 内联块里）。
2. **「下月固定支出」是近似**：用的是当月账单合计。收入或圈层在下个月跳变
   时警示会滞后一个月。要精确得把 `bills()` 参数化成「按给定收入算」，
   属于经济模型改动，未在本轮做。
3. **常驻发光的历史欠账**：六张 HUD 卡的 `.fc-stat__value` 各自带一层
   26px tint 光晕，即基线上仪表盘常驻发光就有 6 处，超出架构 §3.6
   「静止界面上持续发光的元素 ≤2」。本轮警示态只是**替换**其中一处的颜色，
   没有新增；但这条欠账值得 SOTA 验收单独记一笔。
4. **L5 地下钱庄改锁定**是内容判断（见 §2），需要验收确认或回退。
5. `P1-4` 3D 倾斜卡与 `P1-7` 换代/死亡全屏仪式不在本次任务范围，仍未做。

---

*opus-r3-p1-polish · Round 3 · 《浮城人生》URBAN LIFE SIMULATOR*
