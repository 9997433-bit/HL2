# WeChat Mini Games — Round 1 Feasibility Probe

Research date: 2026-08-26

## Executive verdict

The games' **core mechanics are generally portable**. Canvas/WebGL games, deterministic rules, levels, progression, and a developer-owned backend can be reproduced on the web and in mobile apps. What cannot be reproduced outside WeChat is **WeChat platform parity**: WeChat identity, the same-game friend graph, WeChat share-card distribution, Midas virtual payment, and WeChat ad inventory.

The practical split is:

- **High feasibility:** tile/logic puzzles, parking/sliding puzzles, block puzzles, hidden-object games, and timing platformers. Their offline core needs no WeChat API or authoritative server.
- **Medium feasibility:** tower defense, roguelike shooters, merge/simulation, and action-casual games. Rendering is straightforward; content volume, progression balance, live operations, anti-cheat, ads, and economy are the real work.
- **Low full-parity feasibility:** SLG and deep idle/RPG games. They are technically portable, but a production replica requires an authoritative backend, durable economy, alliance/social systems, content operations, anti-fraud, payments, and substantial original assets. The blocker is product/backend scope, not Canvas.

“Replication” should mean an original game inspired by a mechanic. Names, art, audio, levels, text, characters, and proprietary tuning must not be copied.

## Environment probe

| Probe | Result | Consequence |
|---|---|---|
| Host | Linux 6.12 | Suitable for source, backend, and browser CI |
| Node / npm | Node 22.14.0; npm 10.9.7 | Suitable for TypeScript and HTML5 prototypes |
| Python | 3.12.3 | Suitable for asset/data tooling |
| Official WeChat DevTools | Not installed; no official Linux download is listed | Cannot claim WeChat package, simulator, upload, or preview validation here |
| AppID / registered game account | Not available to this probe | Cannot exercise login, payment, ads, open-data context, or release review |
| What can be validated here | Core rules, browser rendering, backend contracts, deterministic tests, asset budgets | Use browser CI first, then a Windows/macOS and real-device release gate |

Tencent's [DevTools download page](https://developers.weixin.qq.com/miniprogram/dev/devtools/download_backup.html) lists Windows and macOS builds, not Linux. Community Linux ports are not an adequate release certification path.

## WeChat Mini Game development requirements

### Account and toolchain

1. Register a Mini Program account and select the **Game** first-level category. The official tutorial warns that this first-level category cannot later be changed.
2. Obtain an AppID. A test account can exercise most development features, but it cannot validate commercial capabilities or upload/release.
3. Install the **Stable** WeChat DevTools build on Windows or macOS, sign in by WeChat QR code, and create/import a Mini Game project.
4. Import an engine export or a native project containing at least:
   - `game.js`: executable entry point
   - `game.json`: runtime configuration
   - `project.config.json`: DevTools project configuration
   - `project.private.config.json`: local/private project configuration
5. Test in DevTools **and on physical low/mid/high-tier devices**. DevTools can bypass domain/certificate checks and does not prove real-client performance or API eligibility.
6. Configure production domains, upload a development build, assign an experience build, submit for review, and release a formal build.

Source: [official beginner tutorial](https://developers.weixin.qq.com/minigame/dev/guide/develop/start.html).

### Runtime and framework model

WeChat Mini Games are not browser pages. The runtime is effectively a full-screen Canvas/JavaScript host:

- no normal DOM, CSS, or complete BOM;
- rendering through Canvas 2D, WebGL/WebGL2/Metal capabilities exposed by the host;
- native capabilities through the `wx` API: touch, audio, network, WebSocket, storage/files, lifecycle, ads, login, sharing, payment, and open data;
- code starts from `game.js`; runtime settings live in `game.json`;
- background/foreground and memory reclamation must be handled (`wx.onHide`, `wx.onShow`, `wx.onMemoryWarning`);
- browser-oriented engines need an adapter. `weapp-adapter` is application code, not part of the base library, and its browser emulation is intentionally incomplete.

Sources: [advanced guide](https://developers.weixin.qq.com/minigame/dev/guide/develop/develop.html), [engine adaptation](https://developers.weixin.qq.com/minigame/dev/guide/game-engine/cocos-laya-egret.html), [Adapter](https://developers.weixin.qq.com/minigame/dev/guide/runtime/adapter.html), and [runtime lifecycle](https://developers.weixin.qq.com/minigame/dev/guide/runtime/operating-mechanism.html).

### Constraints that affect architecture

| Constraint | Current documented limit/requirement | Design response |
|---|---|---|
| Code packages | 30 MB total; main package ≤ 4 MB; ordinary subpackage has no individual limit within the total; independent subpackage ≤ 4 MB | Keep boot code/tiny first scene in main package; split features; put large assets on CDN |
| Key/value local storage | 10 MB per WeChat user per game | Store settings and compact saves only; synchronize important progression to backend |
| Cached + user files | 200 MB by default; eligible games may apply for 1 GB | Version and evict remote asset bundles; never assume cache permanence |
| Network | Registered domains only; production `https://` / `wss://`; no raw IP/localhost; domain requires ICP filing | Use a filed domain, valid certificate, CDN, API gateway, and reconnect/idempotency logic |
| Lifecycle | Background games may later be destroyed; memory pressure can trigger reclamation | Pause immediately, checkpoint safely, recover from cold start |
| Browser compatibility | DOM/BOM unavailable and adapter incomplete | Isolate platform calls and test every third-party library on a real client |

Sources: [subpackage loading](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/subPackage/useSubPackage.html), [local storage](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/storage.html), [file system](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/file-system.html), and [network rules](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/network.html).

## What is portable outside WeChat?

| Subsystem | Web/PWA | Native mobile | Exact WeChat parity? |
|---|---|---|---|
| Gameplay rules, physics, levels, AI | Yes | Yes | Not platform-dependent |
| Canvas/WebGL visuals and audio | Yes | Yes through engine-native export or web wrapper | Usually, subject to device/API differences |
| Offline save | IndexedDB/local storage | App storage | Functionally equivalent, not shared identity |
| Developer-owned account and cloud save | Guest/passkey/OAuth + backend | Apple/Google/custom auth + backend | Equivalent function, different identity |
| Leaderboard | Own backend | Own backend/platform services | Global leaderboard yes; WeChat friend ranking no |
| Multiplayer/alliances | HTTPS/WebSocket backend | Same | Yes functionally if developer owns the graph |
| Virtual goods | Web payment subject to local rules | Apple/Google IAP | No Midas/API or shared purchase entitlement |
| Rewarded ads | Web ad provider, often weaker coverage | Mobile ad SDK | No WeChat inventory, IDs, or policy parity |
| Invites/deep links | URL/referral codes/Web Share | Universal/App Links | No WeChat conversation targeting or identical share card |
| WeChat same-game friend graph | Unavailable | Unavailable | No; users must establish a new graph |

The reusable design is a platform-neutral game core plus interfaces such as `Identity`, `CloudSave`, `Leaderboard`, `Payments`, `Ads`, `Share`, `Storage`, and `Analytics`. Implement `wx` and web/mobile adapters separately. Never let gameplay code call `wx.*` directly.

## Category feasibility checklist

Detailed machine-readable checks are in `feasibility-checklist.json`.

| Category and baseline examples | Core MVP | Full production parity | Main reason |
|---|---:|---:|---|
| Tile match / casual logic — 羊了个羊：星球, 猪了个猪, 套住那只羊 | Easy | Medium | Rules are local; level generation, viral acquisition, ads, and analytics add scope |
| Hidden object — 抓大鹅, 一找一个准 | Easy–Medium | Medium | Asset production, hit regions, hint economy, and accessibility |
| Parking/sliding — 挪了下车 | Easy | Medium | Searchable board state is local; content pipeline and ads dominate |
| Arrow/spatial puzzle — 箭了又箭 | Easy | Medium | Deterministic logic; level authoring and validation |
| Block puzzle — 俄罗斯方块拼图 | Easy | Medium | Simple grid core; avoid copying protected presentation/assets |
| Timing/platform — 跳一跳 | Very easy | Medium | Simple input/physics; feel, anti-cheat ranking, and social loop |
| Word + tower defense — 赵云与阿斗 | Medium | Medium–Hard | Localization/content plus combat balance and meta progression |
| Tower defense / roguelike shooter — 向僵尸开炮, 永远的蔚蓝星球 | Medium | Hard | Entity performance, build synergies, content, economy, anti-cheat |
| Merge / casual — 疯狂水世界 | Medium | Hard | Merge rules are easy; event economy and content cadence are not |
| Simulation + merge — 我的花园世界 | Medium | Hard | State graph, timers, cloud save, economy, and large asset set |
| Idle/cultivation RPG — 灵画师, 寻道大千 | Medium | Hard | Data-driven combat is feasible; durable economy, events, fraud, IAP |
| Action casual — 跃动小子 | Medium | Medium–Hard | Control feel, broad device performance, asset polish |
| Deep RPG — 西游降妖记 | Hard | Very hard | Content volume, combat systems, live ops, account/economy backend |
| Persistent SLG — 三国：冰河时代, 无尽冬日 | Hard | Very hard | Authoritative world simulation, alliances, sharding, operations, security |

For every category:

- [ ] Specify an original mechanic, visual identity, levels, text, audio, and economy.
- [ ] Make core simulation deterministic and unit-testable without renderer or platform SDK.
- [ ] Choose offline/local, cloud-save, or authoritative-server trust model explicitly.
- [ ] Budget the 4 MB main package, 30 MB total code packages, remote assets, cache, memory, and cold start.
- [ ] Test touch targets, pause/resume, interrupted audio, weak network, reconnect, and cold-start recovery.
- [ ] Implement feature detection and graceful fallback for every optional `wx` API.
- [ ] Validate on real Android/iOS/HarmonyOS WeChat clients and low-memory devices.
- [ ] Verify login, payment, ads, share, privacy consent, open-data authorization, review, and analytics with a production-eligible AppID.
- [ ] Load-test and penetration-test any authoritative economy or competitive leaderboard.

## Hard blocker matrix

“Hard” means exact cross-platform parity is impossible without WeChat authorization/runtime. It does **not** mean the gameplay cannot ship with a substitute.

| Capability | Why it blocks exact parity | Outside-WeChat substitute | Core game blocked? |
|---|---|---|---:|
| WeChat login | `wx.login` issues a five-minute code that the developer server exchanges for `openid`/session data; it only exists under an AppID in WeChat | Guest account, passkey, Apple/Google/OAuth; optional account linking | No |
| WeChat friend graph/ranking | Friend cloud storage requires authorization and runs only in the open-data domain; the graph is not exportable | Developer-owned follows/friends, invite codes, global/region cohorts | No; viral/competitive parity is |
| Midas virtual payment | `wx.requestMidasPayment` requires WeChat/Midas eligibility, offer configuration, orders, and runtime | Web checkout where lawful; Apple/Google IAP; own entitlement ledger | No; revenue parity is |
| WeChat sharing/distribution | `wx.shareAppMessage`, conversation chooser, launch query, and group contexts are WeChat surfaces | Web Share, URLs, QR/referral codes, Universal/App Links | No; acquisition parity is |
| WeChat ads | Rewarded/interstitial/banner APIs require approved WeChat ad units and policy compliance | Web/mobile ad network or non-ad economy | No; IAA economics are |
| Publication and commercial approval | AppID category, identity/qualification, privacy disclosures, content review, and API permissions are platform-controlled | Publish on web/app stores under their separate rules | Only WeChat release |
| Production networking | Registered HTTPS/WSS domains and ICP filing are mandatory for ordinary production requests | Normal TLS hosting outside WeChat | Only online WeChat build |

API evidence: [`wx.login`](https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.login.html), [`wx.getFriendCloudStorage`](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getFriendCloudStorage.html), [`wx.requestMidasPayment`](https://developers.weixin.qq.com/minigame/dev/api/midas-payment/wx.requestMidasPayment.html), [`wx.shareAppMessage`](https://developers.weixin.qq.com/minigame/dev/api/share/wx.shareAppMessage.html), and [rewarded video](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.html).

## Open-source engine options

| Option | Best fit | WeChat path | Portability assessment |
|---|---|---|---|
| **Cocos / Cocos Creator** | Default for 2D/3D cross-target production | First-class WeChat export; engine handles platform adaptation and remote assets | Best overall choice when WeChat is a required target; verify the exact editor/engine version's license and supported export matrix |
| **LayaAir** | TypeScript 2D/3D teams preferring a web-first workflow | Officially adapted; build target exports a WeChat project | Credible MIT-licensed alternative; validate package/startup cost and third-party modules |
| **Phaser** | Fast 2D browser/PWA prototypes | Browser-first; no first-class path established by Tencent's supported-engine list, so custom adapter work and real-client tests are required | Best for web-only puzzle MVP; risky if WeChat release is mandatory |
| **Three.js** | Custom 3D web visualization/game rendering | Tencent says it can be adapted with `weapp-adapter`, but does not recommend that route for inexperienced teams | Renderer, not a complete game engine; team must add input abstraction, physics, UI, scenes, asset pipeline, and game tooling |

Cocos/Laya support is documented in Tencent's [engine overview](https://developers.weixin.qq.com/minigame/dev/guide/game-engine/engine-overview.html). Phaser describes itself as a browser-first, MIT-licensed 2D framework in its [official overview](https://docs.phaser.io/phaser/getting-started/what-is-phaser) and [license](https://www.phaser.io/download/license). Three.js describes itself as a web 3D library in its [fundamentals](https://threejs.org/manual/en/fundamentals.html).

## Recommended tech stack

### If WeChat is a required launch target

- **Client:** TypeScript + Cocos Creator/Cocos, with data-driven levels and platform-neutral simulation.
- **Platform boundary:** typed adapters for identity, save, leaderboard, social, payment, ads, share, storage, lifecycle, and analytics.
- **Content:** versioned remote asset bundles on a China-appropriate CDN; tiny first scene in the main package.
- **Backend for puzzle/casual:** HTTPS API, PostgreSQL, object storage/CDN; Redis only when rankings/rate limits justify it.
- **Backend for RPG/SLG:** authoritative services, PostgreSQL, Redis, queue/event pipeline, WebSocket gateway where needed, server-side economy rules, idempotent orders, audit log, anti-cheat, observability.
- **Quality gates:** browser/unit CI on Linux, DevTools export check on Windows/macOS, then physical-device matrix and production-eligible API smoke tests.

### If the objective is only a fast feasibility demo

- Use **Phaser + TypeScript** for 2D web puzzle prototypes.
- Keep mechanics in a renderer-independent package so a later Cocos/WeChat client can reuse rules and level data.
- Do not spend the first prototype on WeChat login/payment/social. Mock the interfaces and validate retention-worthy gameplay first.

### Recommendation

Build an original tile/parking/timing puzzle first. Use Cocos from day one if WeChat delivery is mandatory; otherwise use Phaser for the browser probe. Do not select SLG or deep RPG as a replication proof—their risk is server/economy/content operations and cannot be retired by proving that sprites render.
