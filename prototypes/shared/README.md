# `wx-shim` — 微信小游戏 platform mock

Round 1's conclusion was that the mechanics of the 畅玩榜 leaders are cheap to
rebuild and the *product* is not: rewarded video, share-to-revive and the friend
leaderboard all live behind `wx.*`, which does not exist on the open web. Every
prototype had therefore grown its own private stub, and each one hid the gap
differently.

`wx-shim.js` replaces those stubs with one mock of the real API. A prototype
calls `wx.createRewardedVideoAd()` by its actual name, gets the actual object
shape back, and keeps working unchanged inside a real mini game — where
`installWxShim()` detects the genuine namespace and steps aside.

> **Platform-constants note (2026-08-26):** This README documents the shim's
> delivered behavior, including its legacy blanket iOS payment failure. Current
> Mini Game payment API names and capability-gated iOS support are canonicalized
> in [`.agent_workspace/platform-constants.json`](../../.agent_workspace/platform-constants.json);
> the mock behavior is not evidence of current platform eligibility.

```
prototypes/shared/
├── wx-shim.js     UMD implementation — <script>, require(), or a vm sandbox
├── wx-shim.mjs    ESM re-export for `import { installWxShim } from ...`
├── wx-shim.d.ts   TypeScript surface (matches minigame-api-typings shapes)
└── wx-shim.test.mjs  node --test suite
```

## Loading it

```html
<!-- browser, classic script: publishes globalThis.WxShim -->
<script src="../shared/wx-shim.js"></script>
<script>
  const shim = WxShim.installWxShim({ adBehavior: 'manual' });
  // globalThis.wx now exists — write platform code as if you were on WeChat
</script>
```

```js
// ES module (browser or Node)
import { installWxShim, isRealWx } from '../shared/wx-shim.mjs';

// CommonJS / vm sandbox
const { createWxShim } = require('../shared/wx-shim.js');
```

`installWxShim()` publishes `globalThis.wx`; `createWxShim()` returns the same
object without touching any global, which is what you want in tests. Both return
a **shim handle** — the control surface — whose `.wx` property is the mocked
namespace.

## Mocked API surface

| Group | API | Fidelity | What the mock does |
|---|---|---|---|
| ads | `wx.createRewardedVideoAd` | high | singleton per `adUnitId`, self-preloading, `load()`/`show()` promises, `onClose({isEnded})`, `onError` with real 1000–1008 codes, auto-reload after close |
| ads | `wx.createInterstitialAd` | high | same lifecycle, `onClose` carries no reward flag |
| ads | `wx.createBannerAd` | partial | `style`, `show`/`hide`/`destroy`, `onResize`/`onLoad`/`onError`; no real layout box |
| share | `wx.shareAppMessage` | partial | faithfully **callback-less**; the shim adds the `share:success` event the platform never gives you |
| share | `wx.onShareAppMessage` / `offShareAppMessage` | high | provider callback, fired by `shim.tapSystemShare()` |
| share | `wx.showShareMenu` / `hideShareMenu` / `updateShareMenu` | stub | logged only |
| share | `wx.getShareInfo` | stub | fake `encryptedData`; decoding needs a server |
| cloud | `wx.setUserCloudStorage` | high | string-only KV, 1 KB per value, 128 entries per call — rejects like production |
| cloud | `wx.getUserCloudStorage` / `removeUserCloudStorage` | high | reads back what the game wrote |
| cloud | `wx.getFriendCloudStorage` | partial | seeded fake friends whose values imitate the shape you stored (plain number, or WeChat's `{"wxgame":{"score":n}}` envelope) |
| cloud | `wx.getGroupCloudStorage` | partial | subset of the friend list; no `shareTicket` validation |
| cloud | `wx.getOpenDataContext` / `getSharedCanvas` | stub | `postMessage` surfaces as an event; the sub-canvas is `null` |
| auth | `wx.login` | partial | fake `js_code`; `code2Session` still needs a server |
| auth | `wx.checkSession` / `getSetting` | stub | always valid, always authorised |
| auth | `wx.getUserInfo` / `createUserInfoButton` | partial | nickname/avatar, `__tap()` to press the button from a test |
| system | `wx.getSystemInfoSync` | high | real window dimensions, `pixelRatio`, `safeArea`, `benchmarkLevel`, `SDKVersion` |
| system | `wx.getSystemInfo` / `getWindowInfo` / `getDeviceInfo` / `getAppBaseInfo` | high | the split successors of `getSystemInfo` |
| system | `wx.getLaunchOptionsSync` / `getEnterOptionsSync` | partial | scene codes, drivable via `shim.simulateShow()` |
| system | `wx.onShow` / `onHide` | high | fired by share returns and `shim.simulateShow/Hide()` |
| system | `wx.setKeepScreenOn` / `triggerGC` | stub | logged only |
| storage | `wx.setStorage*` / `getStorage*` / `removeStorage*` / `clearStorageSync` / `getStorageInfoSync` | high | `localStorage`-backed in a browser, in-memory in Node |
| feedback | `wx.vibrateShort` / `vibrateLong` | high | maps onto `navigator.vibrate` when present |
| feedback | `wx.showToast` / `hideToast` / `showLoading` / `hideLoading` / `showModal` | partial | emitted as events for the host to draw; `showModal` always confirms |
| payment | `wx.requestMidasPayment` | partial | fails with `errCode -1` on iOS, mirroring the App Store block on 虚拟支付 |

The same table is available at runtime as `WxShim.SURFACE`, so a report or a
harness can read it instead of copying it.

## Events

`shim.on(event, cb)` returns an unsubscribe function; `'*'` receives everything
as `(payload, eventName)`.

| Event | Payload | Fires when |
|---|---|---|
| `ad:load` | `{adUnitId, kind}` | a creative finished loading |
| `ad:show` | `AdSession` (see below) | an ad went full-screen |
| `ad:close` | `{adUnitId, kind, isEnded}` | the ad closed, either way |
| `ad:complete` / `ad:skip` | `{adUnitId, kind}` | watched through / bailed out |
| `ad:error` | `{adUnitId, kind, errCode, errMsg}` | no fill or a forced failure |
| `banner:show` / `banner:hide` / `banner:destroy` | `{adUnitId}` | banner lifecycle |
| `share` | `{title, imageUrl, query, shareTicket, simulated}` | `wx.shareAppMessage` was called |
| `share:success` | `{shareTicket, scene, from, simulated}` | a simulated friend opened the card |
| `cloud:set` | `{KVDataList, openid}` | the game wrote its score |
| `cloud:friends` | `{keyList, count}` | friend data was read |
| `opendata:message` | `{message}` | `getOpenDataContext().postMessage` |
| `show` / `hide` | launch options | foreground / background |
| `vibrate`, `toast`, `loading`, `modal`, `payment` | the call's arguments | host UI hooks |
| `call` | `{api, args, at}` | every mocked call, for assertions |

## Driving an ad

In `adBehavior: 'manual'` the shim only reports that an ad is on screen — the
host draws the player, which is what lets a prototype show a fake video that
looks like the real overlay:

```js
const shim = WxShim.installWxShim({ adBehavior: 'manual' });
const ad = wx.createRewardedVideoAd({ adUnitId: 'adunit-shuffle' });

ad.onClose((res) => { if (res.isEnded) grantShuffle(); });
shim.on('ad:show', (session) => {
  showOverlay(session.adUnitId);
  countdown(5, () => session.complete());   // watched through -> reward
  onSkipTapped(() => session.skip());       // closed early  -> no reward
});
ad.show().catch(() => ad.load().then(() => ad.show()));
```

In `adBehavior: 'auto'` (the default) the shim closes the ad itself after
`adDurationMs`, which is what headless tests want. `shim.completeAd()`,
`shim.skipAd()` and `shim.failAd(1004)` work in both modes.

## Configuration

| Option | Default | Effect |
|---|---|---|
| `seed` | `20260826` | seeds friend scores, ad fill and share returns — everything replays |
| `latencyMs` | `0` | simulated round-trip; `0` keeps every callback synchronous, which is what makes the mock testable in a `vm` sandbox |
| `adBehavior` | `'auto'` | `'auto'` closes the ad itself, `'manual'` waits for the host |
| `adDurationMs` | `0` | `'auto'` only: how long the fake video runs |
| `adFillRate` | `1` | below 1, `load()` starts failing with `errCode 1004` |
| `adSkipRate` | `0` | `'auto'` only: chance the viewer bails out before the reward |
| `shareBehavior` | `'auto'` | `'auto'` simulates a friend opening the card; `'manual'`/`'none'` do not |
| `shareReturnMs` | `0` | delay before that simulated return |
| `friendCount` / `friendNames` | `7` / built-in list | the mock friend roster |
| `strictOpenDataContext` | `false` | when true, friend data is only readable inside `shim.enterOpenDataContext()`, as in production |
| `platform` | auto-detected | `'ios'` also switches `requestMidasPayment` to the App Store failure |
| `persistStorage` | `true` | back `wx.*Storage` with `localStorage` when one exists |
| `self` | `{openid, nickname, avatarUrl}` | the local player in the friend list |
| `verbose` | `false` | log every call to the console |

## Control surface

```js
shim.wx                       // the mocked namespace
shim.isMock                   // false when a real WeChat host was found
shim.calls('wx.shareAppMessage')  // logged calls, for assertions
shim.completeAd() / skipAd() / failAd(code)
shim.acceptShare()            // simulate a friend opening the card
shim.tapSystemShare()         // fire the wx.onShareAppMessage provider
shim.leaderboard('score')     // sorted rows across self + friends
shim.seedFriendData('score', [900, 820, 400])
shim.enterOpenDataContext(fn) // run fn as if it were the 开放数据域
shim.simulateShow({ scene: 1044, shareTicket: 't' })
shim.reset()                  // fresh mock, same seed
```

## What the mock cannot give you

These are platform properties, not code, and no shim closes them. They are the
gap matrix in
[`.agent_workspace/round2/opus-wx-shim-report.md`](../../.agent_workspace/round2/opus-wx-shim-report.md).

- **开放数据域** is a second JavaScript context with its own canvas. Off-platform
  there is only one context, so `getOpenDataContext().canvas` is `null` and the
  friend board has to be drawn by the game itself. Code written against the
  mock's `getFriendCloudStorage` will *not* run in the main context on a real
  device — it has to move into the sub-domain bundle.
- **Real ad revenue and fill.** eCPM, frequency caps and 审核 state decide
  whether an ad plays at all; `adFillRate` only imitates the failure shape.
- **`wx.shareAppMessage` gives no success signal.** The `share:success` event is
  the shim's invention, flagged `simulated: true`. A shipping game infers the
  same thing from a later `onShow` carrying a `shareTicket`, which is why the
  mock fires that too — wire your revive to the return trip, not to the share.
- **`wx.login`** returns a code that only means something after `code2Session`
  on a server holding the app secret.
- **iOS 虚拟支付** is blocked by Apple's policy; the mock reproduces the error,
  not a way around it.
- **版号 / 主体资格.** IAA-only games can ship without one; anything with IAP
  cannot. No API involved.
