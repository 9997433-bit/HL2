# 《浮城人生》· URBAN LIFE SIMULATOR

现代都市高自由度人生模拟的界面原型。纯 HTML5 + CSS3 + 原生 JS，无构建步骤、无依赖。

设定来源：`.agent_workspace/fucheng-life/STORY_EXTRACT.md`

## 目录

| 路径 | 说明 |
|------|------|
| `index.html` | **主入口**：都市夜景 + 标题 + 主菜单（本文档主要描述这一层） |
| `css/main.css` | 主入口的设计令牌与样式 |
| `js/app.js` | 都市夜景渲染引擎 + 主入口交互 |
| `routes.json` | 主菜单跳转表 |
| `screens/` | 核心界面：年代登记、出身档案、人生仪表盘、城市地图，以及界面总览 `screens/index.html` |
| `css/screens.css`、`js/screens.js` | 核心界面的样式与共享数据（`window.FC`） |
| `effects/` | 可复用特效画廊 |
| `data/story.json` | UI 文案数据 |

## 主入口

### 夜景引擎（`js/app.js`）

全屏 canvas，逐帧合成，全部程序生成，没有位图素材：

- **三层视差天际线**，各层离屏预渲染一次，之后只按视差偏移 blit；楼群按住宅 / 写字楼分型，
  决定窗格是暖黄零星还是冷白整层加班
- **竖排霓虹灯牌**（夜市、典当、中介、二十四小时……），带坏灯闪烁与雨中光柱
- **航空障碍灯、高架列车、夜航飞机、雷闪**
- **雨幕与湿地倒影**：倒影按横切片从天际线画布采样并做正弦扰动，模拟水面
- **涟漪、车灯拖影、积水反光条、胶片颗粒**
- 城市会自己呼吸：每隔一段时间随机开关几户窗灯，直接画进离屏图层

指针视差有平滑跟随；地平线锚定使得窗口高度变化（移动端地址栏收放）只做偏移，不重新生成天际线。

### 画质

| 档位 | dpr | 雨滴 | 颗粒 | 倒影切片 |
|------|-----|------|------|----------|
| 华丽 high | ≤2 | 250 | 有 | 3px |
| 均衡 medium | ≤1.5 | 130 | 无 | 5px |
| 省电 low | 1 | 55 | 无 | 10px |

用户没有手动指定时，连续 180 帧平均帧时超过 33ms 会自动降一档（降档后有 6 秒冷却）。
`prefers-reduced-motion` 与设置里的「减弱动效」都会关掉视差、闪烁与掠光。
`backdrop-filter` 不可用时玻璃面板退化为实色背景。

### 设置

存在 `localStorage` 的 `fucheng-life.settings.v1`：画质、雨幕、霓虹辉光、环境音与音量、减弱动效。
环境音由 WebAudio 程序生成（带通噪声当雨声、低通噪声当城市底噪），无音频文件，默认关闭，
需要一次用户手势才会起播。

## 接入新界面

主菜单不硬编码跳转目标，按以下顺序解析：

1. 页面里的 `window.FUCHENG_ROUTES`（在 `index.html` 里内联定义即可，`file://` 下也生效）
2. `routes.json`
3. 都没有登记时，探测 `register.html` / `origin.html` 等约定文件名
4. 仍然找不到就弹提示条，而不是把玩家丢进 404

新增界面时把相对路径写进 `routes.json`：

```json
{
  "new-game": "screens/era-select.html",
  "continue": "screens/dashboard.html"
}
```

### 存档

「继续人生」读 `fucheng.save.v1`（`js/screens.js` 写入的键），存档里带 `eraId` / `originId` /
`month` / `age` 任一字段就算有效，按钮解锁并把年代与出身显示在副标上；没有存档时按钮置灰。
旧键 `fucheng-life.save.v1` 仍然兼容。

### `window.FuchengShell`

主入口就绪后挂在 window 上，供后续界面复用：

```js
FuchengShell.toast('账单到期');   // 提示条
FuchengShell.city.setQuality('medium', false);
FuchengShell.city.stop();        // 暂停夜景渲染
FuchengShell.settings;           // 当前设置
FuchengShell.routes;             // 已解析的跳转表
```

## 设计令牌

定义在 `css/main.css` 的 `:root`：

- 夜色 `--ink-950 … --ink-600`
- 霓虹 `--neon-cyan #3ff0ff` / `--neon-magenta #ff3fa4` / `--neon-gold #ffc861` / `--neon-violet #a97bff`
- 五层城市 `--tier-l1 市井 #ffb347` · `--tier-l2 工薪 #7d9ac0` · `--tier-l3 上升通道 #34e0a1` ·
  `--tier-l4 资本名利 #c58bff` · `--tier-l5 暗流 #b3245e`
- 玻璃 `--glass-bg` / `--glass-line` / `--glass-blur`
- 字体：标题用衬线（Noto Serif SC → Songti SC → serif），西文与数字用等宽，正文用系统黑体栈；
  不加载网络字体，弱网与 WebView 下不会有字体闪烁

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://127.0.0.1:8000/games/fucheng-life/
```

`file://` 下也能开，只是 `routes.json` 读不到（改用 `window.FUCHENG_ROUTES` 内联登记）。
