# 《浮城人生》· URBAN LIFE SIMULATOR

现代都市高自由度人生模拟的可玩 UI 原型。纯 HTML5 + CSS3 + 原生 JavaScript，无框架、无构建步骤、无运行时依赖。

设定来源：`.agent_workspace/fucheng-life/STORY_EXTRACT.md`

## Round 3 状态

Round 3 是收官候选版：Round 1 的四个核心界面和主入口、Round 2 的统一叙事数据/动效/O1
事件弹窗已组成完整流程；本轮以 P1 视觉收口、O2 月度账单仪式、自动化测试和 15 项手工门禁作为发布契约。

当前体验覆盖：

- 程序生成的雨夜都市主入口，含三档画质、WebAudio 环境音和无障碍动效降级
- E1—E7 七个年代、10 种出身及 `localStorage` 存档
- 五层城市色彩系统、可交互地图、圈层与地点门槛
- 可按月推进的人生仪表盘：现金、健康、人脉、声望、年龄、负债、事件日志和账单
- O1 城市事件抉择、后果预览与属性入账；Round 3 月度结算抽屉及低现金/地图锁区反馈
- 页面 wipe、数字 count-up、卡片 stagger、氛围粒子，并为 `prefers-reduced-motion` 提供静态路径

发布前必须同时满足：

1. `./scripts/run-fucheng-life-tests.sh` 全绿；
2. [`ACCEPTANCE.md`](./ACCEPTANCE.md) 的 15 项手工 QA 门禁全部签核。

这是无后端的前端原型；经济、事件和存档均在浏览器本地运行，不包含账号、云存档或真实支付。

## 本地预览与测试

从仓库根目录启动静态服务器：

```bash
python3 -m http.server 8000
```

浏览：

- 原型总目录：<http://127.0.0.1:8000/>
- 《浮城人生》直达：<http://127.0.0.1:8000/games/fucheng-life/>
- 核心界面总览：<http://127.0.0.1:8000/games/fucheng-life/screens/>

运行 Round 3 自动化门禁：

```bash
./scripts/run-fucheng-life-tests.sh
```

测试链会校验 JavaScript 语法、`story.json` schema、站内静态链接和关键产品常量
（7 个年代、10 种出身、5 个城市层级及事件 API）。推荐通过 HTTP 预览；浏览器的本地文件安全策略可能阻止
`file://` 读取 `data/story.json`，因此双击 HTML 不属于发布验收路径。

## 完整演示流程

1. 打开仓库总目录，在「浮城人生 · Urban Life Simulator」卡片进入雨夜主入口。
2. 等待 FUCHENG OS 启动序列，或点击跳过；移动指针观察天际线视差。打开「设置」可切换画质、雨幕、
   霓虹、环境音和减弱动效。
3. 点击「入城登记」，从 E1—E7 中选择一个年代，确认机会/门槛/波动及起始层级，再进入下一步。
4. 从 10 份出身档案中选择起点，观察起始资金、资本/体质/人脉/学业和圈层差异，点击「开始人生」。
5. 在人生仪表盘确认年代、出身、圈层和六项 HUD；点击「推进一个月」，查看数字变化、现金浮字、
   新增日志及月度收支结算。结清账单后继续。
6. 连续推进至第 3 个月以内，处理至少一次城市事件：选择选项、查看后果入账，再「记入日志，继续」。
   「快进半年」会在事件打断时停下。
7. 打开「城市地图」，检查 L1—L5 五层剖面；点击地点查看门槛、物价、风险和未解锁区域提示。
8. 返回主入口刷新页面；「继续人生」应读取 `fucheng.save.v1`，显示所选年代/出身并回到仪表盘。
   仪表盘内「重开人生」可清空本轮运行状态并重新播种日志。

完整人工验收步骤见 [`ACCEPTANCE.md`](./ACCEPTANCE.md)。

## 文件地图

```text
games/fucheng-life/
├── index.html                  # 游戏主入口、启动序列、主菜单与设置
├── README.md                   # 运行、演示与架构说明
├── ACCEPTANCE.md               # Round 3 的 15 项手工 QA 门禁
├── routes.json                 # new-game / continue 跳转表
├── data/
│   └── story.json              # 年代、出身、层级、事件和共享文案唯一数据源
├── screens/
│   ├── index.html              # 核心界面总览
│   ├── era-select.html         # E1—E7 入城年代
│   ├── origin-select.html      # 10 种出身
│   ├── dashboard.html          # 人生 HUD、月度 tick、日志、事件与账单
│   └── city-map.html           # L1—L5 城市剖面与地点详情
├── css/
│   ├── fc-tokens.css           # 统一颜色、玻璃、字体、圆角与动效令牌
│   ├── main.css                # 主入口与程序夜景界面
│   ├── screens.css             # 核心界面、HUD、地图和响应式布局
│   ├── fc-ui.css               # 共享氛围与轻量特效
│   └── fc-events.css           # 事件弹窗及账单 overlay
├── js/
│   ├── app.js                  # 夜景渲染、设置、路由与主入口交互
│   ├── story-loader.js         # story.json 装载、归一化与 FC.ready
│   ├── screens.js              # window.FC 数据适配、存档与共享 helper
│   ├── fc-motion.js            # count-up、stagger、wipe 与动效降级
│   ├── fc-ui.js                # 粒子等共享 UI 效果
│   └── fc-events.js            # FC.overlay、FC.events 与月度账单 API
├── tests/                      # Node 驱动的语法、schema、链接与确定性断言
└── effects/                    # 可复用效果的独立展示页

scripts/run-fucheng-life-tests.sh       # 仓库级测试入口
.github/workflows/fucheng-life-tests.yml # 相关路径变更的 CI 门禁
```

## 运行时约定

### 路由

主菜单按以下顺序解析目标：

1. 页面里的 `window.FUCHENG_ROUTES`
2. `routes.json`
3. 约定文件名探测
4. 未找到时显示提示条，不跳入 404

当前路由表：

```json
{
  "new-game": "screens/era-select.html",
  "continue": "screens/dashboard.html"
}
```

### 数据与存档

- `data/story.json` 是年代、出身、城市层级和事件文案的唯一数据源；`story-loader.js` 将其发布到
  `window.FC.story`，四个核心屏等待 `FC.ready` 后渲染。
- 游戏存档键是 `fucheng.save.v1`。完成年代或出身选择后，主入口的「继续人生」解锁并显示档案摘要。
- 主入口设置保存在 `fucheng-life.settings.v1`：画质、雨幕、霓虹、环境音/音量及减弱动效。

### 主入口 API

```js
FuchengShell.toast("账单到期");
FuchengShell.city.setQuality("medium", false);
FuchengShell.city.stop();
FuchengShell.settings;
FuchengShell.routes;
```

核心屏共享 API 挂在 `window.FC`，包括 `FC.ready`、`FC.read/write`、`FC.events`、`FC.overlay`
和 Round 3 的月度账单接口。

## 视觉与性能

- `css/fc-tokens.css` 统一夜色、霓虹、三档玻璃 elevation 和 L1—L5 层级色；所有字体均为本地系统栈。
- `js/app.js` 程序生成三层天际线、窗灯、灯牌、雨幕、湿地倒影、列车、飞机、雷闪、涟漪与胶片颗粒，
  不加载位图素材。
- 高/中/低三档最高 DPR 分别为 2/1.5/1；连续 180 帧平均帧时超过 33ms 时自动降档。
- `prefers-reduced-motion` 和设置内「减弱动效」关闭视差、闪烁与掠光；不支持
  `backdrop-filter` 时玻璃面板退化为实色背景。
- 环境音由 WebAudio 合成，默认关闭，必须由用户手势启动。
