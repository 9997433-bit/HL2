# Round 1 — 华丽视觉效果探针

Model slug: `gpt-5.6-sol-xhigh-fast`

## 交付物

入口：[`games/fucheng-life/effects/demo.html`](../../../games/fucheng-life/effects/demo.html)

这是一个零依赖、无需构建的单页效果画廊。可直接双击 `demo.html`（`file://`）打开，也可由任意静态服务器托管。

| 文件 | 职责 |
|---|---|
| `effects/demo.html` | 效果画廊、可访问语义、L1–L5 交互示例 |
| `effects/effects.css` | 视觉 token、霓虹文字、玻璃拟态、转场与响应式样式 |
| `effects/effects.js` | Canvas 城市粒子雨、动态开关、键盘可用的层级切换 |

## 效果清单

### 1. Neon glow text

- `.neon-title`：主视觉大标题，使用多层 `text-shadow` 形成白芯、青色外辉光。
- `.neon-type--cyan / --gold / --danger`：可直接用于机会、资产、风险三类游戏语义。
- `data-text` 配合同内容伪元素产生局部紫/红色散；`.flicker` 提供低频灯牌闪烁。
- 所有动画仅改变 `opacity`、`transform` 或阴影，没有 DOM 重排。

### 2. Glass card component

- `.glass-panel` 与 `.glass-card` 提供统一玻璃基材：半透明渐变、细描边、内高光、`backdrop-filter`。
- 演示含现金流主卡、身份卡、限时机会通知，可映射到人生仪表盘。
- 对不支持 `backdrop-filter` 的浏览器提供高不透明度纯色回退。

### 3. Particle rain / city lights

- 单个全屏 Canvas 同时绘制三层粒子：纵深雨线、城市窗灯、紫色浮尘。
- 粒子数按视口面积自适应，设备像素比上限为 2，避免高 DPI 屏幕过度填充。
- 光标位置以缓动方式影响雨势与灯光视差；页面失焦后停止动画帧。
- 页面实时显示当前粒子总数；不依赖图片、字体或网络请求。

### 4. Layer transitions

- L1 市井、L2 工薪、L3 上升、L4 名利、L5 暗流各有独立语义色。
- 转场由五片错峰遮罩、扫描线、内容错峰入场和进度光轨组成。
- 快速连续切换使用单槽队列收束到最后一次选择，不累积过期动画。
- Tab 具备 `tablist` 语义，支持左右方向键、Home、End。

## 复用方式

1. 将 `effects.css` 的 `:root` token 和目标组件区块并入主游戏样式。
2. 玻璃组件只需添加 `.glass-panel` 或 `.glass-card`，内部布局不被基类限制。
3. 霓虹色散标题需同时设置 `data-text` 与可见文本：

   ```html
   <h1 class="neon-title" data-text="灯火有价">灯火有价</h1>
   ```

4. Canvas 逻辑可整体提取；它只依赖 `#city-rain` 与可选的 `[data-particle-count]`。
5. 层级转场以 `[data-layer-console]` 为边界，主游戏接入时可把 `applyLayer()` 中的面板切换替换为路由或状态机回调。

## 可访问性与降级

- 页面包含跳转链接、清晰焦点样式、语义化 tab/tabpanel 和状态按钮。
- 遵循 `prefers-reduced-motion`；系统要求减少动态时，Canvas 保留静态氛围帧，CSS 动画降为瞬时。
- 页头“动态开启/暂停”按钮可独立冻结 Canvas 与 CSS 动画。
- 断点覆盖桌面、平板、手机及 390px 以下窄屏；最小支持宽度为 320px。

## 验证

- `node --check games/fucheng-life/effects/effects.js`：通过。
- Google Chrome 148 直接打开 `file:///workspace/games/fucheng-life/effects/demo.html`：通过，无需服务器或构建步骤。
- 桌面 1440×1000 与手机 390×844 实际截图检查：首屏无裁切；霓虹辉光、玻璃模糊、雨线/灯火均正常渲染。
- 浏览器交互探针 12/12 通过：
  - HTML、CSS、JS 与 Canvas 全部加载，桌面粒子场生成 360 个对象。
  - 桌面和手机断点均无横向溢出。
  - L5 单次切换、`L2 → L4 → L3` 快速连续切换均收束到正确且唯一的面板。
  - 方向键从 L3 正确切换到 L4。
  - 动态暂停按钮同时更新状态与页面冻结类。
  - `prefers-reduced-motion: reduce` 下层级切换立即完成。
  - 捕获到的 JavaScript 异常与浏览器 error 日志均为 0。
- 视觉复核：首屏与层级控制台均已由浏览器成像检查，L3 色域、玻璃层次、进度光轨及内容排版正常。
