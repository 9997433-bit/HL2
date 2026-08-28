Model slug: claude-fable-5

# Round 3 — SOTA 验收报告《浮城人生》UI

> Agent: fable-r3-sota-acceptance · Date: 2026-08-28 · Branch: `agent/fucheng-life-ui`
> **验收基线**：commit `f971827`（feat: 结算金钱浮字 +¥/-¥ 飞入 HUD）— Round 3 全部代码提交后的稳定树。
> 结论先行：**15 项门禁 15 过（15 PASS / 0 PARTIAL / 0 FAIL），无合并阻塞项。**

---

## 0. 验收方法（可复现）

**静态审查**：逐文件阅读 `games/fucheng-life/` 全部 HTML/CSS/JS 与 `data/story.json`，对照
`round2/ROUND2_CONCLUSION_BRIEF.md` §4 的 15 项门禁与 `round1/fable-sota-ui-audit.md` §1/§7 的 D1–D6 rubric。

**运行时验证**（headless，本报告的数字均出自实测）：

```bash
# 服务（tmux 会话 fc-http-server）
python3 -m http.server 8321          # 于 /workspace

# 自动化测试链（Round 3 gpt-sol 产出）
bash scripts/run-fucheng-life-tests.sh

# headless 巡检：puppeteer-core + 系统 Chrome（/usr/local/bin/google-chrome, --headless=new）
# 脚本临时置于 /tmp/fc-audit（不入库），做了三轮：
#  A. 六屏逐页：390×844 视口，收集 console error/warning、pageerror、4xx/5xx、
#     document.scrollWidth 横向溢出探测
#  B. Happy path：清空 localStorage → 主入口 → 入城登记(E5) → 出身(O01) → 仪表盘
#     连续推进 9 个月，统计 O1 弹窗、O2 账单抽屉、金钱浮字、日志增量动画
#  C. prefers-reduced-motion: reduce 仿真下重跑 B 的仪表盘段 + wipe 抑制检查
#  另做 1280×800 桌面截屏（主入口/四核心屏/账单抽屉）目检 D1–D6
```

**特别说明（审计期间的并发落码）**：本验收启动时树在 `dfb2ad6`（O2/P1/测试链均未落地）；
审计过程中 Round 3 其余代理在同一工作树陆续提交 `970cec0`(测试链)、`9e1783e`(O2 账单抽屉)、
`1b2c86b`(锁定层玻璃天花板)、`280d45a`(日志增量渲染)、`48bf219`(HUD 金钱警示)、`f971827`(金钱浮字)。
中途测得的数据全部在 **`f971827` 稳定后重测过一遍**，下文引用的均为终态结果。

---

## 1. 15 项验收门禁逐项判定

| # | 门禁 | 判定 | 证据 |
|---|------|:----:|------|
| 1 | P0-1 霓虹标题/CTA 在核心屏可见 | **PASS** | 主入口 `.title__word` 三层 drop-shadow + 双色像差层（`main.css:378-418`）；核心屏 hub `fc-neon-title`（`fc-ui.css:5-41`，data-text 双伪元素错位）；四屏 `.fc-title` 光晕 + 渐变 `em`（`screens.css:309-325`）；主 CTA `.fc-btn--primary` 霓虹渐变 + 光影（`screens.css:501-511`）。桌面截屏目检确认 |
| 2 | P0-2 玻璃拟态三档 elevation | **PASS** | 三档令牌 `--fc-glass-1/2/3-*`（`fc-tokens.css:52-62`）+ 工具类 `fc-glass-panel--1/2/3`（`fc-ui.css:43-79`）+ 无 backdrop-filter 回退（`fc-ui.css:106`）。实际落屏为三档：面板 blur16（`screens.css:374`）、stat 卡 blur14、事件卡/结算抽屉 blur24 + `--shadow-lift`（`fc-events.css:84-96`）。注：工具类本身未被四屏 HTML 直接引用，档位经组件样式落地——不扣分，见 §4 nice-to-have |
| 3 | P0-3 主入口视差 + 核心屏氛围动效 | **PASS** | 主入口 pointer 视差三层天际线（`app.js` `layerOffset`/`look`，parallax 10/30/68）+ 慢漂移；核心屏各有常驻氛围：era/map CSS 雨幕、dashboard 84 粒子 canvas（`fc-ui.js initParticles`）、全屏 `fc-veil` 扫描线漂移 + 噪点步进（`screens.css:1652+`） |
| 4 | P0-4 仪表盘 count-up | **PASS** | `FCMotion.countUp`（rAF + easeOutCubic，400–800ms 按跳幅取时，`fc-motion.js:53`）；仪表盘所有 HUD 数字含首绘均走 `paintNumber`。实测：进入仪表盘现金从 ¥0 滚动至真实值 |
| 5 | P0-5 卡片 stagger + 日志增量动画 | **PASS** | stagger：era 7 卡 / origin 10 卡 / map 五层均 `FCMotion.stagger`（`--i` × 60ms，cap 12）。日志增量：`280d45a` 引入 seq 序号 + `painted` 数组，只有新条目携带 `.is-new` 播 `fc-logslide`（`dashboard.html renderLog`、`screens.css:1040/1048`）。**实测：推进 1 月后 DOM 内 13 条日志仅 1 条在动画** |
| 6 | P0-6 全局 `:active scale(.97)` | **PASS** | `screens.css:1592-1626`：btn/nav/chip/card/zone 全 `scale(0.97)`（stat 0.985），事件选项 0.98（`fc-events.css:230`），禁用/锁定元素显式 `transform:none`。注：主入口 `.mbtn:active` 为柔化的 0.995（`main.css:656`），见 §4 |
| 7 | P0-7 屏间 wipe 转场 | **PASS** | `fc-motion.js` 全局 a[href] 拦截 + 方向表（ORDER），`sessionStorage` 接力到达页续走同向 clear 动画；`fc-wipe` 双向 sheet + 霓虹前缘（`screens.css:1709+`）。实测 era→origin→dashboard 均触发。注：主入口→era 用的是 shell 自己的 `is-leaving` 暗场退场（`main.css:1197-1212`），非同一 wipe——语义等价的方向性转场，见 §4 |
| 8 | P0-8 五层色贯穿 HUD/地图/事件 | **PASS** | 单一来源 `--fc-l1..l5-*`（`fc-tokens.css:30-50`）+ 别名 `--l1..l5`；仪表盘电梯/层徽章、地图 `tint-l1..l5` 五层剖面、事件卡 `[data-layer="L1..L5"]` 场景光（`fc-events.css:34-38`）、日志左侧 tag 色全部取同一组变量 |
| 9 | O1 事件弹窗：推进 ≥3 月触发 ≥1 次 | **PASS** | 概率表 `MODAL_ODDS=[0,0,.45,.65,1]`（`dashboard.html:204`）——静默第 4 个月必中，数学上 3 月内 ≥80%。**实测 9 个月触发 3 次**（凌晨四点的灯/考场窗外/校招手环）；reduced-motion 下 5 月 2 次且可完整操作 |
| 10 | story.json 为 era/origin 唯一文案源 | **PASS** | `story-loader.js` 发布 `FC.story` → `screens.js` adaptEra/adaptOrigin；era/origin 两屏全部渲染自 `FC.ERAS/FC.ORIGINS`，页面内无内联文案。测试链 story-schema 断言 7 era / 10 origin / 5 layer / 10 event 通过。范围外事实：事件 choices 仍在 `fc-events.js` SCRIPT 表、file:// 镜像 SEED 复制了事件正文（见 §4） |
| 11 | O2 账单抽屉 OR 等效 tick 结算仪式 | **PASS** | `9e1783e`：`fc-ledger.js`（`FC.ledger.show/close/isOpen`，复用 `FC.overlay` 栈/焦点陷阱/滚动锁）+ `fc-ledger.css` 底部抽屉、逐行 90ms stagger + count-up + 净流 flash；触发规则=首月/赤字月/每年 12 月 + 手动「查看结算单」按钮（`dashboard.html:536,605-689`）。**实测：9 个月自动弹 2 次（7 行账单），手动按钮可开，390px 渲染正确（有截屏）** |
| 12 | 390px 无横向溢出 | **PASS** | 六屏 + 推进后仪表盘 + 地图实测 `documentElement.scrollWidth == innerWidth == 390`，无文档级横滚。视口外元素均为受控装饰：`.fc-rain` 固定层 39px 出血（pointer-events:none）、主入口 E1-E7 条为 `overflow-x:auto` + mask 渐隐的有意横滑条（`main.css:1287-1296`） |
| 13 | Chrome happy path 零 console error | **PASS** | 全部三轮 headless 巡检（六屏加载、9 月 happy path 含 3 事件 + 2 账单、RM 重跑、桌面截屏），console error/warning、pageerror、requestfailed、HTTP ≥400 **均为 0** |
| 14 | `prefers-reduced-motion` 降级可用 | **PASS** | CSS 全局动画压至 0.001ms + veil 停帧 + wipe `display:none`（`screens.css:1867-1899`）；JS 侧 `reduced()` 守卫：countUp 直写、moneyFloat 直接不发（实测 RM 下浮字 0 个）、事件卡/抽屉即时开合但红线 3s 冷却保留（防误触语义）。**实测 RM 下推进 5 月：2 事件 + 1 账单全可操作，0 错误** |
| 15 | `./scripts/run-fucheng-life-tests.sh` 全绿 | **PASS** | `970cec0` 落地 orchestrator + `tests/` 四件套 + CI `fucheng-life-tests.yml`。在 `f971827` 终态实跑两次：**「浮城人生 test summary: 4 passed, 0 failed」**（12 个 JS 过 node --check、schema 计数、90 个本地链接、浏览器导出 smoke） |

---

## 2. D1–D6 rubric 逐屏重评（对照 Round 1 §1/§3）

权重同 Round 1：D1/D2/D3 ×1.5，D4/D5 ×1.0，D6 ×0.5，加权满分 35。
参照锚点：ZZZ 32.0 / Cyberpunk HUD 27.0 / 崩铁 27.5 / BitLife 6.5。

| 屏 | D1 夜色 | D2 纵深 | D3 微动效 | D4 排印 | D5 编排 | D6 氛围 | **加权** |
|----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 主入口（index.html） | 5 | 5 | 4 | 5 | 4 | 5 | **32.5** |
| 入城登记（era-select） | 4 | 4 | 4 | 5 | 5 | 3 | **29.5** |
| 出身档案（origin-select） | 4 | 4 | 4 | 4 | 5 | 3 | **28.5** |
| 人生仪表盘（dashboard） | 4 | 4 | 5 | 4 | 5 | 3 | **30.0** |
| 城市地图（city-map） | 4 | 5 | 4 | 5 | 5 | 3 | **31.0** |
| 事件弹窗 + 账单抽屉（O1/O2） | 4 | 4 | 5 | 4 | 5 | 3 | **30.0** |
| **全局均值** | | | | | | | **≈30.3 / 35** |

逐屏依据：

- **主入口 32.5**——本项目最强屏，单屏已达 ZZZ 锚点带。程序化 canvas 夜城：三层视差天际线 + 预渲染霓虹灯牌（含坏灯 flicker、雨中光柱）、湿路切片倒影、车灯拖影、高架列车、闪电、雨涟漪，全部随指针视差。D3 给 4 不给 5：按压反馈 0.995 弱于全局标准，且入场后的动效密度集中在背景层而非交互层。
- **入城登记 29.5**——方舟式排印最佳实践：超大年代编号 + 年份区间 + 三轴 meter 动画填充 + 7 卡 stagger。D5 满分：radiogroup 语义、选择状态回写 actionbar、未选拦截、存档回显。D1 给 4：CSS 天际线/雨幕够氛围但无 canvas 层。
- **出身档案 28.5**——十卡四轴 meter + 层级 tint，D4 给 4：卡面信息完整但相比 era 屏少了大编号锚点；稀有度未按 人生重开 黑/蓝/紫/橙 四阶而是按起始层 L1-L5 着色（语义自洽，属设计取舍，不视为缺陷）。
- **人生仪表盘 30.0**——D3 满分屏：首绘 count-up、fc-flash、金钱浮字沿贝塞尔飞入现金卡（≤4 并发、<¥50 静音）、日志仅新条目滑入、月末抽屉逐行划账。D5 满分：六 stat + 净流语义色 + 账单侧栏 + 收支比 meter + 电梯 + 「氧气不足」呼吸红警（`screens.css:932-970`）。
- **城市地图 31.0**——D2 满分：五层剖面即 Z 轴叙事，本轮补上「玻璃天花板」：锁定地点磨砂 backdrop-blur + 四角括线夹持 + 模糊名称 hover 聚焦 + 门槛价签常亮（`screens.css:1277-1385`，实测 4 锁定区 4 价签 4 锁形图标，含 L5「不收钱 · 收把柄」的冷文案）。
- **事件弹窗/抽屉 30.0**——D5 满分：Reigns 式预览点只示维度与量级不示方向（`fc-events.js bucket/dotsHtml`）、红线 3s 冷却、ESC/scrim 拒绝语义（deny shake）、数字键 1-9、焦点陷阱、`aria-live` 结果、sr-only 影响说明。D6 给 3 是刻意克制——发光预算制下 overlay 只允许 accent 线常亮，符合「霓虹沉默」。

**定位结论**：全局 ≈30.3，落在 Cyberpunk HUD（27）与 ZZZ（32）之间、主入口单屏触及 ZZZ 带，
同时 D5 信息编排全线 4–5 分，保住了 BitLife/人生重开 的品类结构分——Round 1 提出的
「骨架取国产文字人生模拟、皮肤取都市霓虹 SOTA」合成策略在终态成立。

### Round 1 §7 验收基准对照（补充 sign-off）

| §7 条目 | 判定 |
|---------|------|
| 五界面 P0 八项全过 | ✅（本报告门禁 1–8） |
| 五层色对应剧情分区且贯穿 | ✅（门禁 8） |
| 任意静止截图仍「活着」 | ✅（veil 噪点步进 / 粒子 / strata 呼吸 / 灯牌 flicker；截屏可证） |
| 开局仪式完整 | ✅ 时代轴 → 出身卡 → wipe 入城；⚠️ 其中「属性分配霓虹刻度」(P16) 未建——出身预设 uiStats 替代，Round 2 起即为有意裁剪，记入 nice-to-have |
| 事件卡拖拽倾斜 + 预览点 | ✅ 按 §7 括注的「点击版 + 预览点」达标；拖拽倾斜属 Round 2 明确「不做」裁定 |
| reduced-motion 降级 / 中端机不掉帧 | ✅ RM 实测通过；⚠️ 60fps 未做真机计measure，但 shell 有 FPS 采样自动降档（`app.js sampleFps`），canvas 均预渲染 sprite |

---

## 3. 合并判定：Blockers vs Nice-to-haves

### Blockers（合并 `main` 前必须处理）

**无。** 15/15 门禁通过、测试链全绿、happy path 与 RM 路径零 console 错误。
`agent/fucheng-life-ui` → `main` 可以进入 PR 流程。唯一程序性条件：PR 上让
`fucheng-life-tests.yml` CI 跑绿（本地已两次验证同一脚本）。

### Nice-to-haves（不阻塞合并，建议入 backlog）

1. **story.json 事件 `choices[]` schema**：分支/结果文案仍在 `fc-events.js` SCRIPT 表（`toPayload` 已预留 `raw.choices` 优先级，schema 落地即自动切换）；file:// 镜像 SEED 与 story.json 存在人工同步义务。
2. **主入口转场一致性**：shell→era 走 `is-leaving` 暗场而非 fc-wipe（shell 未挂 `fc-motion.js`）；`.mbtn:active` 0.995 弱于全局 0.97 标准。体验连贯性小改。
3. **地图地点数据 SSOT**：`STRATA_LAYOUT`（24 个地点、门槛价签）内联在 `city-map.html`，是 era/origin 之后下一个该进 story.json 的数据块。
4. **玻璃三档工具类落屏**：`fc-glass-panel--1/2/3` 已定义未被四屏引用，档位由组件样式各自实现；建议屏侧逐步换用工具类，防止后续第四种 blur 值出现。
5. **开局属性分配仪式**（Round 1 P16）：出身卡预设数值替代了「20 点分配」互动，属被裁剪的仪式感增量。
6. **真机性能计量**：60fps 目标只有降档机制背书，无中端 Android 实测数字。
7. **电梯式换层长转场**（P22）/ 拖拽倾斜事件卡：维持 Round 2「不做」裁定，如未来立项属 P2。
8. **CI 增强**：现有 CI 为静态四件套，可追加本报告 B 轮的 headless happy-path smoke（puppeteer 一屏一断言即可）。

---

## 4. 附：实测数据快照（f971827）

```text
tests            : 4 passed, 0 failed（两次）
console errors   : 0（六屏×390px、9月 happy path、RM 重跑、桌面巡检合计）
390px 溢出       : 六屏 scrollWidth 均 = 390（推进后复测不变）
O1 弹窗          : 9 月内 3 次；RM 下 5 月内 2 次；红线冷却/键盘/焦点陷阱可用
O2 抽屉          : 自动 2 次（首月+赤字/12月规则）、手动按钮 1 次；行数 7；390px 正常
金钱浮字         : 常规模式峰值 2 个并发；RM 模式 0 个（正确抑制）
日志增量         : 推进 1 月后 13 条中仅 1 条播放入场动画
锁定层           : 4 zone 锁定，4 价签 + 4 锁形括线（含 L5「不收钱 · 收把柄」）
```

*— fable-r3-sota-acceptance，documentation only，未改动任何游戏代码。*
