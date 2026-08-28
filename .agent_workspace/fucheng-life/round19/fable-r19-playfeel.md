# R19 体验风险清单 · 选轨关闭语义 + §40 dismiss 措辞（playfeel）

> 作者：R19-F2（fable）。只读现码后的体验风险盘点，不改游戏代码。
> 对照代码状态：分支 `cursor/fucheng-r19-career-dismiss-fa72` 快照 @ `d27b676` ——
> O1 cancelable（`4013780`）、O2 manual 路径 + null 早退（`355f048`）、
> O3 §40 措辞（`2dde8c0`）、§42 条文（`00c1a55`）、O5 CSS skip（`55befc0`）、
> G1 测试（`918b54b` + 边界修 `ffae095`）、TEST_NOTES（`d27b676`）。
> **KNOWN 未见新增条目**；F1 门禁 / F3 条文草稿在快照时尚未落盘。
> 快照时 `./scripts/run-fucheng-life-tests.sh` **30 项全绿**（本机复跑确认）。

共 **9 条残留风险**：中 2（R1–R2）、低-中 2（R3、R7）、低 5（R4–R6、R8–R9）。
另附 5 条回归手测路径（P1–P5，与 G2 TEST_NOTES 六场景互补）、
一节「已核对无虞」、一节优先级速览。

---

## 〇、R18 遗留三账的回收判定（先说结论）

| R18 风险 | 本轮判定 |
|---|---|
| R18-R2 点遮罩 / Esc = 自动签下推荐轨（手动入口） | ✅ 主体已修：`fc-career.js` 的 `dismiss()` 按 `opts.cancelable` 分流——手动入口（`maybeOfferCareerTrack({ manual: true })` 传 `cancelable: true`）Esc/遮罩 `close(null)`，调用侧 `if (!id) return false` 不落轨、不写日志、按钮保留；boot 自动流保持 `finish(hint)` 兜底，与派工一致。**但「取消」的承诺有两个后门**：刷新会静默收回（本轮 R1）、晚选会清零职级（R2） |
| R18-R3 守卫 resolve(null) → 日志印「你选择了「null」」 | ✅ 已修：`dashboard-app.js:1117` 的 null 早退把两条可达路径（toast 在屏点按钮、双击双开）从「静默落轨 + null 日志」降级为「无事发生」。残留是降级后的新观感问题——死按钮无反馈（R5） |
| R18-R9 §40「已完成补弹」措辞（两轮欠账） | ✅ 落字了：§40 改为「开局若**发生过**合约结算或 `pendingModal` 补弹（**含被关闭/dismiss**）」，与 `replayPendingModal` 开卡即 `.then(return true)` 的实际行为一致；全库已搜不到「已完成……补弹」残留，G1 对 §40 有措辞断言。三轮欠账**销案** |

顺带记录：R18-R1（`hidden` 被 `.fc-btn` 压掉）已在 R18 收尾修掉并随 #20 合入；
R18-R4（漂移销卡）已由 `d3946c0` 收窄为「仅结算/失效才销」，§41 补注「进度窗口
漂移仍补弹」。本轮三个目标的工程面判定：①手动取消 ✅（残留 R1/R2/R5/R6）、
②boot 语义保持 ✅（残留 R3/R4/R7）、③§40 措辞 ✅（残留 R8/R9 皆为外围）。

---

## 一、「取消」承诺的两个后门（R1–R2）

### R1 取消在刷新后被静默收回：`migrateContract` 对 `months > 0` 强推 `picked = true` ⚠ 中（本轮最大漏点，拍板或落字）
- **现象**：`fc-sim.js:525` 的 `migrateContract`（每次读档都跑）里有一行
  R6 时代的老回填：`if ((run.months || 0) > 0) run.career.picked = true;`。
  它和 R19 的「关掉就当没发生过」正面相撞。有机可达路径全程不需要 Console：
  **「重开人生」**（`dashboard-app.js:1741`）造出 `picked: false` 的新档后只调
  `maybeOfferContract()`、不触发自动选轨——工具区的「选择职业轨道」按钮
  因此**有机地**亮着（这是该按钮组织玩法里真正的入口，不只是造档产物）。
  玩家点开、按 Esc 取消（R19 承诺「下次再选」）→ 推进一个月 → 刷新
  → `months > 0` 强推 `picked = true` → 按钮消失、选轨面板永不再弹、
  **没有任何日志**——推荐轨（`freshRun` 在 `fc-sim.js:466` 预填的
  `pickTrack(origin)`）就此静默锁定，这一局日志里永远不会出现
  「你选择了…」。§42 写的「手动入口继续保留」与 TEST_NOTES 场景 1 的
  「刷新后仍停在未选轨状态」都**只在 `months === 0` 时为真**，两处都没写这个前提。
- **建议护栏**：拍板二选一。收窄：该回填的本意是给缺 `picked` 字段的旧档
  兜底，改成仅在 `run.career.picked == null` 时才按 months 推断（一行改动，
  R19 后 `picked: false` 是合法持久状态，不该被覆写）；落字：§42/KNOWN 写明
  「取消状态仅在当月内有效，推进后刷新视同接受推荐轨」，并在强推时补一条
  sysLog（否则玩家丢了选择权且毫无痕迹）。

### R2 晚选轨清零职级进度：`applyTrack` 无条件 `level = 0; kpi = 48` ⚠ 中
- **现象**：R19 把「先取消、玩几个月、想清楚再选」变成受鼓励的模式，但
  未选轨的月份里模拟照常在预填的推荐轨上跑：KPI 随行动/事件浮动
  （`fc-sim.js:1216`、`dashboard-app.js:1077`），KPI ≥ 82 会真实晋升
  （`fc-sim.js:1042`，`level++`），`careerBonus = 1 + level*0.12 + (kpi-50)/200`
  还吃进月收入（`fc-sim.js:954`）。玩家攒了几个月 KPI、甚至升了一级之后
  终于点开面板选轨——`applyTrack`（`fc-career.js:32-35`）无条件重置
  `level = 0; kpi = 48`，**选的就是推荐轨本身也照样清零**。工资倒扣、
  EV97（promote 门禁，进度 kpi/70×45）的合约进度跟着塌方。R18 时该窗口
  也存在但极窄（关面板即落轨）；R19 的可取消把窗口拓宽成常态玩法。
- **建议护栏**：小修——`applyTrack` 对 `trackId === run.career.track`
  （或手动晚选场景）保留现有 level/kpi，只置 `picked = true`；不修则
  面板 lede 或 KNOWN 落字「选定轨道时职级与 KPI 按新轨重算」。与 R1 同一次
  拍板：这两条合起来决定「取消后再选」到底是不是一个真实存在的玩法。

---

## 二、语义不对称与措辞（R3–R4）

### R3 同一张皮三种 Esc 语义：`.fc-career-pick` 家族的关闭结果全靠猜 ⚠ 低-中
- **现象**：三张视觉上同款的全屏选卡，Esc/点遮罩的结果互不相同——
  手动选轨：**取消**（R19 新增）；boot 选轨：**签下推荐轨**；闯城主目标卡
  （`dashboard-app.js:1137` 起，整套复用 `fc-career-pick` 类名）：**毫无反应**
  ——它 `push("modal", host)` 后没挂 `onKey`（`fc-events.js:132` 的全局
  keydown 只派发给 `top.onKey`），scrim 也没有 click 监听，连 Tab trap 都没有
  （焦点可以跑出面板）。旁边不同皮的合约选卡 Esc 又是第四种：`finish(null)`
  记 `contractSkipped` 跳过本月。玩家没有任何视觉线索区分「这张能不能关、
  关了算什么」。O5 驳回给共用 scrim 加 `cursor: pointer` 的理由（闯城卡
  真的关不掉，加了等于撒谎）恰好证明了这套皮的语义已经分裂。
- **建议护栏**：本轮至少落字（KNOWN 一条：「选卡家族关闭语义不统一，
  闯城卡不可关、boot 选轨关闭即接受推荐」）；下轮做 O5 建议的
  「选卡视觉对齐」轮次时给可取消态一个专属修饰类 + 「×」角标，
  顺手给闯城卡补 Tab trap。R18-R2 建议的「推荐角标副文案」半句未执行，续档在此。

### R4 boot 流 Esc 后日志仍写「你选择了」：玩家分明是关掉了卡 ⚠ 低
- **现象**：boot 自动流 Esc/遮罩 `finish(hint)` 兜底后，`maybeOfferCareerTrack`
  拿到的 id 非空，照写「你选择了「hint」轨道作为起点。」——账面把系统兜底
  记成了玩家的主动选择。R18 就这样，但当时全体关闭都落轨，措辞至少一致；
  R19 之后手动流关掉真的「没选」，boot 流这行「你选择了」就从含糊变成说谎。
  TEST_NOTES 场景 4 只验「日志写入对应轨道名（不是 null）」，不打措辞。
- **建议护栏**：一行文案分叉——picker resolve 时带上 `viaDismiss` 之类的旗子，
  兜底路径日志改「未作选择，按推荐落在「hint」轨。」量级；或 KNOWN 落字。

---

## 三、反馈与手感（R5–R6）

### R5 toast 在屏时点选轨按钮 = 4 秒死按钮：守卫早退无任何反馈 ⚠ 低
- **现象**：`showPicker` 的守卫 `FC.events.isOpen()`（`fc-career.js:43`）对
  toast 也为真——toast 占用 `current`（`fc-events.js:718`）但不进 overlay、
  不锁滚动、页面完全可点。toast 在屏的 4 秒里点「选择职业轨道」：守卫
  `resolve(null)` → 调用侧早退 `false` → **无事发生**，没有提示、没有排队、
  没有重试。这是 R18-R3 灾难路径（静默落轨 + null 日志）修复后的残留观感：
  从「按错账」降级成「按不动」，方向对，但玩家会当按钮坏了。双击路径同理
  （`picker` 守卫），只是窗口只有 180ms，可忽略。
- **建议护栏**：低优先。要么守卫命中时 sysLog 一句「先处理屏上的通知」，
  要么 `isOpen` 区分 toast（`current.kind === "toast"` 时放行——toast 本来
  就不抢焦点）；不修落字即可。

### R6 关闭动画 180ms 真空 + `is-open/is-closing` 空钩子：随手关的手感缺口 ⚠ 低（O5 已记录，续档）
- **现象**：`close()` 等 180ms 才置 `picker = null` 并 resolve，期间再点按钮
  走 `picker` 守卫静默早退（行为安全，TEST_NOTES 场景 3 有覆盖）；而
  `is-open`/`is-closing` 在 CSS 里**零规则**（o5-skip.md §四已记录），面板
  出现是瞬跳、关闭是原样杵满 180ms 再消失。R19 让「点开看看→随手关」变成
  高频动作后，这段既无动画又不响应的真空更容易被摸到。
- **建议护栏**：跟 O5 的方案走——留给「选卡视觉对齐」独立 CSS 轮次
  （`__panel` 过渡 + `prefers-reduced-motion` 分支），本轮不动。

---

## 四、测试与流程（R7–R9）

### R7 G1 只锁了 cancelable 的一半：boot 默认语义（§42 第二行）没有断言 ⚠ 低-中
- **现象**：`r19-career-dismiss.test.js` 的 vm harness 是真跑 `fc-career.js` 的
  （比 R18 纯正则前进一大步，R18-R10 的方向落地了），但两个用例都只测
  `{ cancelable: true }` 的 Esc/遮罩 resolve null；**「不带 cancelable 时
  Esc → 推荐轨」没有任何断言**。将来有人把 dismiss 默认翻转成可取消
  （或删掉 `finish(hint)` 兜底），30 项测试照样全绿，而 §42 第二行
  「boot 自动流保持原语义」失守——唯一防线是 TEST_NOTES 场景 4 的手测。
- **建议护栏**：harness 现成，补三行——`showPicker({})` 后触发 Esc，断言
  resolve 为 `"staff"`。顺手可把 null 早退从源码正则升级为 vm 断言。

### R8 TEST_NOTES 造档口径缺 `months = 0` 前提：照笔记搭场景会搭不起来 ⚠ 低（流程性）
- **现象**：场景 1–3 要求「`needsPick` 为真 + 已写入 `pendingModal`」的存档，
  但 R1 那行 `migrateContract` 回填意味着：拿真实中期档（months > 0）改出
  `pendingModal` 再刷新进门，`picked` 会被强推为 true，按钮根本不出现，
  三个 cancel 场景全部空转；测试人若不明就里会误报「按钮丢失」。必须
  `run.months = 0` 的合成档（或改内存不刷新）才能搭起来。场景 1 的
  「刷新后仍停在未选轨状态」预期同样只在 months = 0 时成立（见 R1）。
- **建议护栏**：TEST_NOTES 造档段补一句「合成档需保持 `run.months = 0`，
  否则读档迁移会强制完成选轨」；R1 拍板后如收窄回填，这句可删。

### R9 fc-guide 两处旧文案第二轮原样续档；KNOWN 本轮零落字 ⚠ 低（续档）
- **现象**：R18-R7 点过的两处一字未动——`fc-guide.js:9` 的 KEY 旁注释仍是
  「v7：带『合约』标签的城市事件也挂账，确认前刷新会**原样补弹**」
  （无条件承诺，与 §41 的销账语义不符），第③步的无条件补弹句照旧。
  R19 派工确实只圈了 §40，属派工外，但这是第二轮续欠；且 O4 的可写路径
  「KNOWN / TEST_NOTES 落字或 skip」只交付了 TEST_NOTES，本轮 R1–R5 里
  该落 KNOWN 的账（取消被刷新收回、晚选清零、三种 Esc 语义）一条都还没有着落。
- **建议护栏**：注释一行改掉是半分钟的事，别攒到 R20；KNOWN 至少收 R1/R2
  的拍板结论。

---

## 五、回归手测路径（P1–P5）

> 与 G2 `R19_TEST_NOTES.md` 六场景互补：那份验「功能对不对」，这份专打上文风险点。
> 环境：`python3 -m http.server 8000`，清站点数据，开 Console；移动端 390px 设备模式。

- **P1 取消被刷新收回（R1，合入前必测）**：进任意档 → 点「重开人生」→
  确认工具区出现「选择职业轨道」→ 点开面板按 Esc 取消 → 推进一个月 →
  刷新。中招判据：按钮消失、`run.career.picked === true`、日志无任何选轨
  记录——玩家的「下次再选」被静默没收。把结果截图给 R1 拍板用。
- **P2 晚选清零（R2）**：重开人生 → 取消选轨 → 连推 6 个月并做几次「上班/加班」
  把 KPI 抬过 60（Console 看 `run.career.kpi`）→ 点按钮选**推荐那条轨** →
  对比选前选后的 `kpi/level` 与月收入。中招判据：kpi 回 48、level 回 0、
  工资跳水。
- **P3 死按钮观感（R5）**：等一条 toast 在屏（推进月份触发小插曲）→ 4 秒内
  点「选择职业轨道」→ 应无反应（不落轨、无 null 日志——这是 R18-R3 修复的
  验证面），主观记一笔「按钮坏了？」的观感；toast 收走后再点应正常弹出。
- **P4 boot 兜底措辞（R4）**：months = 0 的未选轨档直接刷新进门（无 pending）→
  选轨卡自动弹出 → 按 Esc → 核对日志那行「你选择了…」与实际按键动作的落差；
  顺带核对落下的轨道与面板「推荐」角标一致（TEST_NOTES 场景 4 的最后一条）。
- **P5 选卡家族语义横评（R3）**：同一局里依次触发闯城主目标卡（闯城档开局）、
  boot 选轨卡、手动选轨卡，各按一次 Esc、点一次遮罩、按几次 Tab。逐张记录
  「能不能关 / 关了算什么 / 焦点跑没跑出面板」，产出给下轮视觉对齐轮次的对表。

---

## 六、已核对无虞（不占风险名额，防重复排查）

1. **未选轨月份模拟不裸奔**：`freshRun` 预填 `pickTrack(origin)`，职级名称、
   KPI 结算、晋升查表、收入加成都有轨可用；`picked: false` 只影响 `needsPick`
   与按钮显隐，不会出现 null title / NaN。
2. **取消不落盘、不写日志**：`close(null)` → 早退路径上没有 `FC.write` /
   `pushLog` 调用，「当没发生过」在存档面成立（months = 0 前提下，见 R1）。
3. **双开双账防线成立**：`settled` 旗 + `picker` 槽双保险；180ms 关闭窗口内
   连点按钮走守卫早退，取消/选定都只结一次账，TEST_NOTES 场景 3 的边界预期
   与实现一致。
4. **boot 链旧断言与新签名兼容**：r17 测试锁的裸调 `maybeOfferCareerTrack()`
   仍在 init（boot 侧未误传 manual），r18 测试的 click 接线正则也匹配
   `{ manual: true }`；30 项全绿为本机复跑结果。
5. **§40 措辞与行为逐字对得上**：`replayPendingModal` 开卡即
   `.then(return true)`（dismiss 也算「发生过」），唯一 false 分支是过期销账
   （§41 语义，本轮未动）；G1 的 §40 正则断言能挡住措辞回退。
6. **§42 保持 `[ ]` 未勾**：R18-R9 的教训（O 系列没齐就勾）被吸收，
   收尾时再按 F 系列门禁勾。
7. **G1 的 `functionSection` 终段边界已修**（`ffae095`，`end < 0` 回退文件尾），
   TEST_NOTES 里记录的那盏红灯已消，`init` 作为最后一个顶层函数可被正确切片。
8. **O5 的 skip 判断成立**：cancelable 是纯控制流，无新节点无新类；其对
   「共用皮不能加 cursor: pointer」的驳回与本文 R3 相互印证，遗留观察
   （面板无底色、空动画钩子）已被本文 R6 接账。

---

## 七、优先级速览（给 Orchestrator 合入时的盯防顺序）

1. **拍板**：R1——`migrateContract` 的 `picked` 强推是收窄成
   「仅 `picked == null` 时回填」还是落字认账；这决定 R19 的「取消」承诺
   是真的还是只活到下一次刷新。P1 手测证据先行。
2. **同一次拍板**：R2——`applyTrack` 晚选清零是保留进度还是落字
   「选定即重算」；R1+R2 合起来定义「取消后再选」这条玩法是否成立。
3. **便宜且该做**：R7——G1 harness 补三行 boot 默认语义断言，把 §42 第二行
   从手测防线升级成自动化防线。
4. **一句话的事**：R8——TEST_NOTES 补 `months = 0` 造档前提，防止验收空转。
5. **落字**：R3（选卡家族关闭语义不统一进 KNOWN）、R4（boot 兜底日志措辞）。
6. **低成本顺手**：R9（fc-guide 注释一行，两轮欠账）；R5/R6 续档给下轮
   视觉对齐轮次。

---

model slug: claude-fable-5-thinking-xhigh
