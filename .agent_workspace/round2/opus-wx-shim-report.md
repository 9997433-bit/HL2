# Round 2 · 统一 WeChat API Mock Shim（wx-shim）

> opus-r2-wx-shim | 2026-08-26 | 分支 `agent/wechat-minigames-research`
> 交付物：`prototypes/shared/wx-shim.{js,mjs,d.ts}` + `README.md` + 19 项单测；
> tile-trio / sheep-match3 / jump-jump 三个原型已接入。

> **平台常量脚注（2026-08-26）：** 本报告记录了 shim 交付时的模拟行为，
> 不是当前平台能力声明。包体、小游戏支付 API 名称及 iOS 支持条件以
> [`platform-constants.json`](../platform-constants.json) 为准；尤其是
> “iOS 一律阻断支付”现为 shim 的旧行为，不是当前小游戏平台事实。

## 1. 为什么做这一层

Round 1 的核心结论是「机制可复刻 ≠ 产品可复刻」：层叠三消的玩法核心几百行 JS
就能验证，真正的价值在**激励视频、分享复活、好友排行、聊天内分发**——它们全部
只存在于 `wx.*`。

问题是每个原型都各写了一套私有 stub：tile-trio 的 `WX` 对象直接白送道具并
`console.info` 一行字，sheep-match3 只用 `typeof wx !== 'undefined'` 判断宿主，
parking-jam 把三个调用点收进 `platform` 适配器但内部是空实现。结果是：

- **变现闭环从未被真正执行过**——没有「看完才发奖」这条分支，也就没有 `isEnded`；
- 每个原型对缺口的描述都不一样，无法横向比较；
- 无头测试覆盖不到产品侧，`verify.js` 只测机制。

`wx-shim.js` 用一份 mock 取代这些 stub：原型按真实 API 名字调用，拿到真实的对象
形状，代码在真机上原样可跑——`installWxShim()` 检测到真 `wx` 会自动让位
（`shim.isMock === false`）。

## 2. 已 mock 的 API（29 组）

保真度：`high` = 行为与真机一致到游戏能据此做判断；`partial` = 形状正确、缺少
平台侧强制行为；`stub` = 可调用、被记录，但游戏观察不到副作用。
运行时可读 `WxShim.SURFACE` 取同一张表。

| 分组 | API | 保真度 | mock 行为 |
|---|---|---|---|
| 广告 | `wx.createRewardedVideoAd` | high | 同 `adUnitId` 单例、自动预拉取、`load()`/`show()` Promise、`onClose({isEnded})`、`onError` 用真实 1000–1008 错误码、关闭后自动加载下一条 |
| 广告 | `wx.createInterstitialAd` | high | 同生命周期，`onClose` 不带奖励标记 |
| 广告 | `wx.createBannerAd` | partial | `style` / `show` / `hide` / `onResize`；没有真实布局盒 |
| 分享 | `wx.shareAppMessage` | partial | **忠实地无回调**；`share:success` 事件是 shim 补的，标记 `simulated:true` |
| 分享 | `wx.onShareAppMessage` / `off…` | high | 右上角转发的 provider 回调，由 `shim.tapSystemShare()` 触发 |
| 分享 | `wx.showShareMenu` / `hideShareMenu` / `updateShareMenu` | stub | 仅记录 |
| 分享 | `wx.getShareInfo` | stub | 返回假 `encryptedData`，解密仍需服务端 |
| 云存储 | `wx.setUserCloudStorage` | high | 强制 string KV、单值 1KB、单次 128 条，超限走 `fail` |
| 云存储 | `wx.getUserCloudStorage` / `removeUserCloudStorage` | high | 读回游戏自己写的值 |
| 云存储 | `wx.getFriendCloudStorage` | partial | 种子化假好友；值形状模仿游戏写入的形状（纯数字 / `{"wxgame":{"score":n}}` 信封） |
| 云存储 | `wx.getGroupCloudStorage` | partial | 好友子集；不校验 `shareTicket` |
| 开放数据域 | `wx.getOpenDataContext` / `getSharedCanvas` | stub | `postMessage` 变成事件；子画布为 `null` |
| 登录 | `wx.login` | partial | 返回假 `js_code`；`code2Session` 仍需服务端 |
| 登录 | `wx.checkSession` / `getSetting` | stub | 永远有效、永远已授权 |
| 登录 | `wx.getUserInfo` / `createUserInfoButton` | partial | 昵称头像 + `__tap()` 供测试点击 |
| 系统 | `wx.getSystemInfoSync` | high | 由真实 window 推导：`pixelRatio` / `safeArea` / `benchmarkLevel` / `SDKVersion` |
| 系统 | `getSystemInfo` / `getWindowInfo` / `getDeviceInfo` / `getAppBaseInfo` | high | 新版拆分接口 |
| 系统 | `getLaunchOptionsSync` / `getEnterOptionsSync` | partial | 场景值可由 `shim.simulateShow()` 驱动 |
| 系统 | `wx.onShow` / `onHide` | high | 分享回流与 `simulateShow/Hide()` 触发 |
| 系统 | `setKeepScreenOn` / `triggerGC` | stub | 仅记录 |
| 存储 | `setStorage*` / `getStorage*` / `removeStorage*` / `clearStorageSync` / `getStorageInfoSync` | high | 浏览器走 localStorage，Node 走内存 |
| 反馈 | `vibrateShort` / `vibrateLong` | high | 有 `navigator.vibrate` 时映射过去 |
| 反馈 | `showToast` / `hideToast` / `showLoading` / `hideLoading` / `showModal` | partial | 以事件抛给宿主渲染；`showModal` 恒确认 |
| 支付 | `wx.requestMidasPayment` | partial | iOS 下以 `errCode -1` 失败，对应苹果对虚拟支付的封锁 |

事件总线（`shim.on`）：`ad:load` / `ad:show` / `ad:close` / `ad:complete` /
`ad:skip` / `ad:error` / `banner:*` / `share` / `share:success` / `cloud:set` /
`cloud:friends` / `opendata:message` / `show` / `hide` / `vibrate` / `toast` /
`loading` / `modal` / `payment` / `call` / `*`。

**确定性**：所有随机（好友分数、广告填充、分享回流）走种子化 mulberry32，
`latencyMs: 0` 时全部回调同步执行——这就是它能在 `vm` 沙箱里被 `verify.js`
驱动的原因。

## 3. 各原型接入状态

| 原型 | 状态 | 激励视频 | 分享 | 好友榜 | 系统信息 / 宿主判定 | 无头验证 |
|---|---|---|---|---|---|---|
| `tile-trio/` | ✅ 完整接入 | 洗牌/移出/撤销：每关 1 次免费，之后每次一条激励视频；页面自绘 mock 播放器（`adBehavior:'manual'`），提前关闭 → `isEnded:false` → 不发奖 | 通关炫耀 + 失败分享复活 | 通关写 `setUserCloudStorage`，`getFriendCloudStorage` 读回并渲染 8 行榜单 | 由 shim 提供，`shim.isMock` 决定 HUD 文案 | `verify.js` 加载 shim 到沙箱，新增 4 项平台闭环断言 |
| `sheep-match3/` | ✅ 完整接入 | 移出/打乱 用尽后仍可点，看广告补 1 个（`adBehavior:'auto'`，1.5s 自动关闭） | 通关炫耀 + 失败分享，分享复活挂在**好友回流**上 | 通关写分数并显示「第 N/8 名 + Top3」 | 宿主判定从 `typeof wx` 改为 `isRealWx()` | 14 项 core 单测仍全绿；host shell 另经 stub-DOM 冒烟驱动 |
| `jump-jump/` | ✅ 完整接入 | 摔落后「看广告续命」，回到摔落前的台阶且不清零 | 分享成绩，回流以 `scene` + 好友昵称回显 | 摔落即写分并渲染好友榜与自己名次 | shim 提供 | stub-DOM 冒烟驱动（该原型无自带 verify） |
| `parking-jam/` | ⏳ 未接入（他人在写） | — | — | — | — | — |

`parking-jam/` 由并行的 opus-r2-parking-prototype 正在提交，为避免互相覆盖没有
动它。好消息是它已经把三个调用点收敛进 `src/main.js` 的 `platform` 适配器
（`requestHint` / `share` / `recordWin`），接入是一次局部替换：

```js
import { installWxShim } from '../../shared/wx-shim.mjs';
const shim = installWxShim({ adBehavior: 'auto', adDurationMs: 1500 });
const ad = wx.createRewardedVideoAd({ adUnitId: 'adunit-parkingjam-hint' });

const platform = {
  requestHint(compute) {                       // 提示 = 一条激励视频
    ad.onClose((res) => { if (res.isEnded) applyHint(compute()); });
    ad.show().catch(() => ad.load().then(() => ad.show()));
  },
  share(payload) { wx.shareAppMessage({ title: payload.title, query: `level=${payload.level}` }); },
  recordWin(index, moves) {                    // 最佳步数 = 好友榜
    wx.setUserCloudStorage({ KVDataList: [{ key: 'best', value: String(moves) }] });
  },
  readBest(index) { return Number(wx.getStorageSync(`best:${index}`)) || null; },
};
```

注意 `requestHint` 目前是同步返回一个 move；接广告后必须改成回调/Promise，
因为真机上奖励只有在 `onClose({isEnded:true})` 之后才成立。这是所有「同步发道具」
原型接入时都会撞到的同一个形状问题。

## 4. 缺口矩阵：mock 补不上的东西

这些是平台属性而不是代码，任何 shim 都补不上。按对复刻可行性的影响排序：

| # | 缺口 | 真机行为 | mock 能做到 | 对复刻的实际影响 |
|---|---|---|---|---|
| 1 | **开放数据域（子域）** | 好友数据只能在第二个 JS 上下文里读，并画到 `sharedCanvas` 上贴回主域 | `getFriendCloudStorage` 直接在主上下文返回数据；`getOpenDataContext().canvas` 为 `null` | **最高**。照 mock 写的排行榜代码在真机主域里跑不通，必须整体搬进子域包，UI 也要改成往子画布画。`strictOpenDataContext: true` 可以提前把这个错误暴露出来 |
| 2 | **`shareAppMessage` 无成功回调** | 调用后什么都不返回，游戏无法知道是否发出 | 补了 `share:success` 事件（`simulated: true`）并同时触发带 `shareTicket` 的 `onShow` | 高。所有「分享复活」必须挂在回流（`onShow` + `shareTicket`）而不是分享调用上；三个原型都按这个形状接的 |
| 3 | **广告填充与收益** | eCPM、频次限制、审核状态决定有没有广告 | `adFillRate` 只模拟失败形状（errCode 1004） | 高。IAA 模型的收入侧完全无法在站外估算 |
| 4 | **`wx.login` → session** | `js_code` 需要服务端 `code2Session` 换 openid/session_key | 返回假 code | 中。任何服务端存档、防作弊都从这里开始，站外无等价物 |
| 5 | **iOS 虚拟支付** | 苹果政策封锁，小游戏 iOS 端无法内购 | 以 `errCode -1` 复现失败 | 中。复现的是门槛本身，不是绕过方法 |
| 6 | **微信侧分发** | 聊天卡片、置顶、游戏圈、盒子推荐 | 无 | 高，但与 API 无关：这是渠道而非代码 |
| 7 | **版号 / 主体资格** | IAA 可免版号；含 IAP 必须版号 + 国内主体 | 无 | 最高（非技术） |
| 8 | **真机性能基线** | `benchmarkLevel`、4MB 首包 / 30MB 分包、iOS 高性能模式 | `getSystemInfoSync` 报形状正确的假值 | 中。包体与帧率必须真机验证，Linux 环境测不了 |

## 5. 验证

```
node --test prototypes/shared/wx-shim.test.mjs   # 19 项，覆盖 shim 自身语义
node prototypes/tile-trio/verify.js              # 机制 8 项 + 平台闭环 4 项
cd prototypes/sheep-match3 && node --test 'test/*.test.mjs'   # 14 项 core
```

tile-trio 的 4 项平台断言（全部通过）：

```
rewarded video: first use free (0 left), second use opened 1 ad, player watched it through and the ad closed: true
friend leaderboard: setUserCloudStorage called, board rendered 8 rows (self + 7 mock friends)
share revive: shared, friend opened the card, tray 3 -> 0, running true
ad revive: rewarded video watched, tray 3 -> 0, running true
```

shim 单测覆盖的关键分支：单例广告位、看完才发奖 / 提前关闭不发奖、
无填充 1004、分享无回调 + 回流、云存储 1KB 与非字符串校验、
开放数据域限制、种子可复现、iOS 支付封锁、`installWxShim` 不会把自己
冒充成真微信。

## 6. 给 Round 3 的建议

1. **接入 parking-jam**，顺手把 `requestHint` 改成异步——这是同步发奖代码接广告
   时的通用坑。
2. **打开 `strictOpenDataContext`** 跑一遍所有原型，把「主域读好友数据」这个真机
   会炸的写法全部逼出来，然后把排行榜渲染拆成子域包结构。
3. **补 `wx.createCanvas` / `wx.onTouchStart` 宿主适配组**（当前刻意没做，以免
   `isRealWx()` 之外的宿主判定被 mock 误导），这样 host shell 的两条分支也能
   在无头环境下测到。
4. **把 shim 的调用日志接进统一 harness**：`shim.calls()` 已经是结构化的
   `{api, args, at}`，可以直接产出「每个原型触达了哪些平台 API」的覆盖率表。
