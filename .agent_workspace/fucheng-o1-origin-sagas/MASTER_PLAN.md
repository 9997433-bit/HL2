# 《浮城人生》产品主计划 — 从「能跑的原型」到「玩得下去的游戏」

**版本**：2026-08-28 · 基于全库审计 + R1–R4 交付现状  
**分支**：`cursor/fucheng-o1-origin-sagas-fa72`（PR #4）  
**用户核心反馈**：弹窗三选一重复、玩不下去；**UI 界面要好**（高优先级）

---

## 一、现状快照（代码审计结论）

### 1.1 玩家完整旅程

```
index.html（雨夜主入口 + 设置）
  → era-select（7 个年代 E1–E7）
  → origin-select（10 出身 + 8 点属性分配）
  → dashboard（核心循环）
       ↔ city-map（23 区域设探区目标）
  → ending（5 种终局 + 天赋印记重开）
```

### 1.2 每月核心循环（dashboard）

| 步骤 | 机制 | 问题 |
|------|------|------|
| 花 AP（3 点/月） | 8 种行动：上班/加班/进修/饭局/副业/休息/探区/理财 | 8 按钮差异感弱，缺「这个月该干什么」的引导 |
| 推进一月 | 年龄+1月、收支结算、ambient 抽 1 条 | ambient 只进日志，无交互 |
| Saga | 14 随机链 + 10 出身链；odds 0.09/月 | 有顶栏 badge，但步间仍常夹 O1 |
| O1 弹窗 | 97 条，~2.5–3.3 月/次 | **形态 100% 相同**：标题+正文+三按钮 |
| 合约 | 落户/首付/升职三选一 + HUD 进度条 | R4 已落地，但签约后反馈仍偏数字 |
| NPC | 5 人（老周/陈姐/阿敏/王总/小余）+ 10 联动 O1 | **仅 O1 触发**，关系 Tab 多数时候静态 |
| 终局 | 48 月+ 才常见；180 月 sim 无早退 | 单局太长，重复暴露同一批事件 |

### 1.3 内容库存

| 池 | 数量 | 交互 |
|----|------|------|
| O1 modal | **97** | 全交互 2–3 选 |
| ambient | **301** | 只读日志 |
| zone | **115**（23 区×5） | 探区行动触发，**无去重** |
| saga 随机 | **14** | 多步，部分有选项 |
| origin saga | **10** | 入城 3–18 月一次 |
| 合约专属 O1 | **5** | 绑合约 id |

### 1.4 UI 架构（~4700 行 CSS）

- **优点**：`fc-tokens` 设计令牌、玻璃拟态、五层色、O1 卡片精致、动效模块 `fc-motion` 成熟
- **短板**：
  - 仪表盘信息密度高但**层级扁平**——HUD 6 格 + 日志 + 侧栏 + Tab，390px 下拥挤
  - **4 Tab 无过渡**，职场/关系/资产 Tab 几乎是「只读报表」，玩家很少点
  - **事件呈现单通道**——所有叙事都走 O1 modal，ambient 在日志里一行字
  - 地图与仪表盘**割裂**——设探区目标要跳页，缺少「本月在哪混」的空间感
  - 缺**新手引导**——合约、AP、Saga 概念无 onboarding

### 1.5 已交付的 R4（玩法创新）

| 项 | 状态 |
|----|------|
| R4-A NPC 账本 + EV83–92 | ✅ |
| R4-B 中期合约三选一 | ✅（pack.contracts×3 + fc-contract.js） |
| R4-C 降弹窗 + Saga banner + 2 新链 | ✅ |
| R4-D 测试 12/12 | ✅ |
| R4-E 体验报告 | ⏳ 待补 |

**结论**：骨架已加（NPC/合约/pacing），但**UI 未围绕新系统重做**，玩家仍「看日志 + 等弹窗」，体感改善有限。

---

## 二、产品目标（什么叫「做好」）

### 2.1 三条支柱

1. **有脸有人情** — 城市不是四维条形图，是陈姐、老周、合约 deadline
2. **有事可做** — 每月 AP 不是 8 个等价按钮，而是「追合约 / 还人情 / 保 KPI」的取舍
3. **界面即叙事** — UI 本身传达紧张、进度、关系；不是 Excel 套赛博皮肤

### 2.2 可量化验收（R5 放行线）

| 指标 | 目标 |
|------|------|
| 30 月实玩 O1 弹窗次数 | ≤ 12（已调 odds，保持） |
| 30 月内 NPC 联动事件触发 | ≥ 3 次 |
| 合约签约率 | ≥ 80% 新档（引导优化） |
| Saga 完整走完 | ≥ 1 条 / 30 月 |
| 390px 无横向滚动 | ACCEPTANCE 通过 |
| Tab「关系」月活点击 | 有意识查看 ≥ 1 次/10 月（靠 UI 推送） |
| 玩家自评「还会再开一局」 | 手工走查 3 局 |

---

## 三、总体路线图（R5–R7）

```
R5 · UI 重塑 + 事件形态分化     ← 下一批子代理（用户说「然后再开」）
R6 · 系统深度（职业/资产/地图）  
R7 · 内容精修 + 上线 + 新手引导
```

---

## 四、R5 详细计划（下一批子代理）— **UI 优先**

> 目标：不动数值底层，**换玩家看见和点击的东西**，让同一套数据「玩起来不一样」。

### R5-A · 仪表盘 UI 重构（fable + opus-fast）【P0】

**交付**：

1. **移动端优先布局**（390px 基准）
   - HUD 改为 2×3 可折叠「生命体征」条，默认只露 现金/健康/合约进度
   - 行动区 sticky 底栏：AP 点 + 4 高频行动（上班/休息/探区/饭局）+ 「更多」抽屉
   - 日志改为「时间线卡片」：ambient 用灰色细条，O1/Saga/NPC 用彩色左边框

2. **合约 HUD 视觉升级**
   - 进度条 + 倒计时环形指示（剩 N 月）
   - 未签约第 1–3 月：顶栏 pulsing 提示「城市在等你签一份合约」

3. **关系 Tab 重做**
   - 5 NPC 头像占位（首字圆形 + 层色描边）
   - 人情 balance 可视化（谁欠谁）
   - 最近一笔 flag 用一句话展示（「陈姐 · 欠一顿饭 · 第 8 月」）

4. **Tab 切换动效**：`fc-motion.stagger` 接入 Tab 内容，reduced-motion 降级

**文件**：`dashboard.html`, `screens.css`, `fc-gameplay.css`, `fc-contract.css`, `dashboard-app.js` render 部分

**红线**：不删现有 id（测试/存档依赖）；ES5；overlay 契约不变

---

### R5-B · 事件呈现分化（opus）【P0】

**问题**：97 条 O1 全是同一 modal → 腻

**交付 4 种呈现壳**（数据仍走 story.json，加 `presentation` 字段）：

| presentation | 适用 | UI |
|--------------|------|-----|
| `modal`（默认） | 重大抉择 | 现有 O1 卡 |
| `toast` | 小插曲 | 顶部 4s 通知 + 单按钮「知道了」 |
| `inline` | ambient 升级 | 插入日志流的大卡片，可点展开 |
| `letter` | 账单/合同/人事 | 信纸样式全屏，底部签字/撕毁 |

**首批迁移**（不改 id，只加 presentation + 调整 choices）：
- 15 条 ambient 升级为 `inline`（从 gameplay-pack 挑重复率最高的）
- 10 条 O1 改为 `toast`（纯通知类，如「地铁涨价」）
- 5 条改为 `letter`（风险/合同类）

**引擎**：`fc-events.js` 增加 `showToast/showLetter/showInline`；`dashboard-app.js` ambient 分支调用 inline

---

### R5-C · 地图-仪表盘一体化（opus-fast）【P1】

**交付**：

1. 仪表盘侧栏「当前位置」chip：显示已设探区 + 一键改（抽屉内嵌迷你地图，不必跳页）
2. city-map 保留完整版，但 dashboard 内嵌 **L1–L5 竖条**（复用 elevator 数据）
3. 探区行动后 zone 事件用 **inline 卡片**展示（不是 silent log）

---

### R5-D · 玩法节奏微调（gpt-sol + fable）【P1】

1. **Zone 去重**：`pickZoneEvent` 加 `recentZone` 窗口（同区 5 条轮转）
2. **Ambient 分层**：151 条缺 layerId 的补标（脚本批量 + 人工抽 20 条）
3. **originBias 补全**：ordinary-worker / middle-class / urban-village
4. **30 月 play-feel 报告**（R4-E 补交）+ R5 前后对比

---

### R5-E · 测试 + 门禁（gpt-sol）【P0】

- `tests/presentation.test.js`：4 种 presentation schema
- `tests/zone-dedup.test.js`
- `tests/page-boot.test.js`：headless 加载 dashboard 不报错（防 F-1 回归）
- 更新 `run-fucheng-life-tests.sh` → 15+ 项
- 390px 截图门禁（可选 puppeteer 单帧）

---

## 五、R6 计划预览（系统深度 — R5 后再开）

| 模块 | 内容 |
|------|------|
| **职业系统** | 入职时选 track；年中「转岗/跳槽」O1；KPI 季度考核事件 |
| **资产系统** | _vehicle_/小产权房/理财仓位可购买；影响 bills 与 ending |
| **NPC 扩展** | ambient/zone 带 `npcEffects`；关系 <-3 触发讨债链 |
| **天赋叠加** | 多印记槽（最多 3）；ending 选 1 新 + 保留 1 旧 |
| **中期目标扩展** | 合约完成后可接「二级合约」（换租/结婚/副业备案） |

---

## 六、R7 计划预览（打磨上线）

- 新手指引 3 步（AP → 合约 → 第一次 O1）
- 内容抽检 50 条删重复/改模板句
- PR #4 合 main + GitHub Pages 验证
- ACCEPTANCE 扩展 §26–30（UI/390px/引导）

---

## 七、R5 子代理派单表（待用户确认后启动）

| 代号 | 模型 | 任务 | 预估侵入 |
|------|------|------|----------|
| R5-A1 | fable | 仪表盘 mobile 布局 + HUD 折叠 | dashboard.html + css 大改 |
| R5-A2 | opus-fast | 关系 Tab NPC 卡片 + 合约 HUD 视觉 | fc-gameplay.css + render |
| R5-B | opus | 4 种 presentation + 30 条迁移 + fc-events | 引擎 + 内容 |
| R5-C | opus-fast | 探区内嵌 + zone inline | dashboard + fc-sim |
| R5-D | gpt-sol | zone 去重 + originBias + play-feel | sim + 报告 |
| R5-E | gpt-sol | presentation/boot 测试 | tests |

**执行顺序**：R5-B 引擎先行 → R5-A/C 并行 UI → R5-D/E 收尾

---

## 八、明确不做（防止 scope creep）

- ❌ 再加 100 条 O1 同质事件
- ❌ 引入 React/Vue/构建链
- ❌ 后端/账号/云存档
- ❌ 重写 fc-motion / 主入口 canvas（已足够好）
- ❌ R5 阶段改 MODAL_ODDS / 终局门槛（R6 再议）

---

## 九、签核

- [x] 用户确认 R5 范围（2026-08-28）
- [x] 启动 R5 六子代理
- [ ] R5 完成后浏览器 30 月走查 → 再开 R6
