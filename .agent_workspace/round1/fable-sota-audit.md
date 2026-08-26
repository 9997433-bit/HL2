# Round 1 — SOTA Audit: WeChat Mini Game Ecosystem & Top-10 Replication Feasibility

> Author: fable subagent (`claude-fable-5-thinking-xhigh`) · Date: 2026-08-26
> Parent task: Research top 10 WeChat mini games and assess replication feasibility.
> Scope: SOTA standard audit & multi-dimensional review (engine/SDK/monetization/social; per-game technical audit; open-source stack comparison; WeChat-API gap analysis; replicability scoring).

---

## 0. Executive Summary

- The WeChat mini game platform is, as of mid-2026, a **500M+ MAU** ecosystem with **60+ min average daily playtime**, **500K+ registered developers**, 80+ titles above 1M DAU, and 300+ titles grossing >¥10M per quarter. It is the largest instant-gaming platform in the world by an order of magnitude.
- The technical SOTA inside the platform is a **constrained web runtime**: 4MB initial package (30MB total with subpackages for IAP-enabled games), a WebGL/(WebGPU-emerging) canvas, no DOM, no remote JS execution, and a privileged `wx.*` SDK covering identity, social graph, payments, ads, and even a free frame-sync multiplayer service.
- **Cocos Creator is the de-facto standard engine** (~41% of the top-100 grossing chart, ~61% of the top-100 most-played chart, ~87 of the top-100 mini-game companies), structurally advantaged because its runtime is baked into the WeChat client as an "engine plugin" and does not count against the 4MB initial package. Unity (via the official WebGL transform SDK / Tuanjie engine) is the #2 and rising for 3D-heavy titles; LayaAir is the long-tail alternative; Egret is legacy/declining.
- **Core gameplay of every top-10 title is replicable with open-source technology** (Cocos Creator OSS core, Phaser/PixiJS, Three/Babylon, Rapier/planck physics, Colyseus/Nakama netcode). None of the top games depends on client-side technology that generic web/mobile stacks lack.
- **What is NOT replicable generically is the platform fabric**: one-tap identity, the ambient social graph (friend leaderboards via the open-data domain), share-cards into chats/groups (30–50% of new installs for top games come from social share), one-tap WeChat Pay / (since Nov 2025) Apple-Pay-backed iOS virtual payment at a 12–17% take, a unified rewarded-video ad network, and zero-install <3s launch from inside the world's dominant chat app.
- Replicability scores (1–10, higher = easier to replicate the full experience without WeChat-specific APIs) for the blended top 10: **挪了下车 9; 羊了个羊：星球 8; 抓大鹅 8; 跳一跳 7; 赵云与阿斗 7; 向僵尸开炮 7; 我的花园世界 6; 寻道大千 6; 无尽冬日 5; 三国：冰河时代 5.**
- **Critical blockers** (detailed in §7): social-graph/friend leaderboards, chat-context share loops, distribution surfaces, payment friction & compliance (real-name/anti-addiction in CN), rewarded-video economics outside WeChat's ad network, and the managed frame-sync multiplayer backend.

---

## 1. Methodology & Sources

Rankings and platform data were taken from 2026 primary/industry sources:

- 引力引擎 / DataEye ADX monthly 微信小游戏 畅销榜 (top-grossing, IAP-weighted) and 畅玩榜 (top-played, IAA-weighted) charts, Jan–Jul 2026 — via [GameLook](http://www.gamelook.com.cn/2026/08/599222/), [36氪/DataEye](https://www.36kr.com/p/3923287949176195), [游戏客栈](http://www.gamekezhan.com/news/20260818/64711.html), [17173](http://news.17173.com/content/03032026/162010241.shtml).
- 2026 WeChat Mini Game Developer Conference (May 2026, Hangzhou) platform disclosures — via [GameLook](http://www.gamelook.com.cn/2026/05/594052/), [品玩](https://www.pingwest.com/w/314094), [36氪](https://m.36kr.com/p/3827142657888902).
- WeChat official developer documentation (packages, open-data domain, virtual payment, frame sync): [代码包](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/code-package.html), [分包加载](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/subPackage/useSubPackage.html), [关系链数据/开放数据域](https://mp.weixin.qq.com/debug/minigame/dev/guide/open-ability/open-data.html), [iOS 虚拟支付](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment/ios.html).
- Apple–Tencent Mini Apps Partner Program (Nov 2025): [GameLook](http://www.gamelook.com.cn/2025/11/582108/), [新浪财经](https://finance.sina.com.cn/jjxw/2025-11-14/doc-infxifie9520813.shtml), [Bloomberg](https://www.bloomberg.com/news/articles/2025-11-13/apple-and-tencent-agree-to-15-fee-on-wechat-mini-game-purchases).
- Engine market share: Cocos community packet-capture analysis of Feb 2025 top-100 charts ([Cocos forum](https://forum.cocos.org/t/topic/166479)), engine-selection guides ([Cinevva 2026](https://app.cinevva.com/guides/wechat-mini-game-engines)), [Cocos engine-plugin docs](https://docs.cocos.com/creator/4.0/manual/en/editor/publish/wechatgame-plugin.html).

Top-10 selection (§3.1) blends the two official chart dimensions, consistent with `PARENT_BASELINE.md`: five representatives from the 畅玩榜 (played/IAA) side and five from the 畅销榜 (grossing/IAP) side, weighted to July 2026 positions plus iconic/evergreen status.

---

## 2. SOTA Audit — WeChat Mini Game Ecosystem

### 2.1 Platform scale (May 2026 official disclosures)

| Metric | Value |
|---|---|
| Mini game MAU | **500M+** (1B+ cumulative registered users) |
| Avg. daily playtime per user | **60+ minutes** |
| Registered developers | **500K+** (>80% are teams of <30) |
| Titles with DAU > 1M (trailing year) | **80+** |
| Titles grossing >¥10M/quarter | **300+** |
| IAA (ad-monetized) segment MAU | **400M** (users +25% YoY, revenue +30% YoY; 1,400+ titles >¥1M/yr) |
| IAP (in-purchase) segment MAU | **300M** (700+ titles >1M MAU; 100+ titles >5M MAU) |
| Social-share-driven new registrations | **30–50%** of new-user volume for the overall pool |
| User social interactions in mini games | **100M+ proactive social interactions** |
| PC (WeChat Windows client) mini games | 40% of PC MAU are PC-exclusive users; PC ad spend +3x (2025) |
| Fastest-growing IAP genres (2026) | Simulation +210% YoY, merge-2 +70%, turn-based RPG +50%, squad RPG +60% |

Interpretation for replication: the platform's growth is no longer driven by novelty but by **habitual re-entry** (drop-down recents, desktop, sidebar) and **social re-acquisition**. Any replication strategy that only copies gameplay copies <50% of what makes these products work.

### 2.2 Runtime & technical constraints (the "SOTA standard" a clone must meet or beat)

| Constraint | WeChat mini game value | Notes |
|---|---|---|
| Initial ("main") package | **≤ 4 MB** | Hard limit; determines <3s time-to-play expectation |
| Total package (main + subpackages) | **≤ 20 MB**, **≤ 30 MB if virtual payment enabled** | Single normal subpackage unlimited; independent subpackage ≤4MB |
| Remote code | **Forbidden** (no remote JS execution; remote asset CDN allowed) | Kills naive code-splitting-from-CDN strategies |
| Rendering | Canvas/WebGL (WebGPU emerging in runtime), **no DOM/CSS** | Engines ship their own UI systems |
| Language | JavaScript/TypeScript (WASM supported; Unity transform compiles to WASM) | |
| Engine plugin | Cocos Creator runtime **baked into WeChat client** (since v7.0.7), zero package cost, shared/incrementally-updated across games | Structural moat for Cocos; 0.5–2s faster startup |
| Open-data domain | Isolated JS scope for friend data; **2D canvas only**, one-way main→open messaging, sharedCanvas cannot be read back (no toDataURL/getImageData) | Anti-scraping design for the social graph |
| Multiplayer | `wx.getGameServerManager()` — **managed room service + lock-step frame sync** (`lockStepOptions` in game.json) | A free, managed realtime backend; no OSS parity out of the box |
| Cloud backend | 微信云开发 (TCB): cloud functions, DB, storage, free tiers | Replaceable by Firebase/Supabase |
| Compliance | Platform-mediated real-name verification & minor anti-addiction; game license (版号) requirements handled per title | A standalone CN release must rebuild all of this |

### 2.3 Engine landscape (SOTA inside the platform)

Snapshot from packet-capture analysis of the Feb 2025 top-100 charts (Cocos community) plus 2026 guides:

| Engine | Top-100 grossing share | Top-100 played share | WeChat engine plugin (0-cost runtime) | 2D/3D | Language | Status |
|---|---|---|---|---|---|---|
| **Cocos Creator** | 41% | 61% | **Yes** (baked into client) | 2D+3D | TypeScript | De-facto standard; ~87 of top-100 mini-game companies |
| **Unity / Tuanjie (团结)** | 32% | 25% | No (official WebGL "transform SDK"; `minigame-adaptor` claims ~3x over plain WebGL) | 2D+3D | C# | #2, rising for 3D/SLG ports; Tuanjie forked from Unity 2022.4 for CN ecosystems |
| **Egret (白鹭)** | 17% | 4% | No | 2D | TS | Legacy titles only; effectively unmaintained |
| **LayaAir** | 8% | 9% | No | 2D+3D | TS | Main alternative; strong 3D/H5 heritage, open source |
| Other/unknown | 2% | 2% | — | — | — | Includes hand-rolled canvas engines (e.g., 跳一跳-class games need none) |

**Key SOTA observation:** the platform *rewards* Cocos structurally (engine plugin bypasses the 4MB budget). Any out-of-WeChat replication loses this advantage and must solve first-load size with CDN caching + service workers instead.

### 2.4 SDK surface (what `wx.*` gives a top-10 game)

- **Identity:** `wx.login` → OpenID/UnionID; silent, zero-friction, universal.
- **Social graph:** open-data domain (`wx.getFriendCloudStorage`, `wx.setUserCloudStorage`) → friend leaderboards; `wx.shareAppMessage` with `shareTicket` → **group-scoped leaderboards**; game club (游戏圈) built-in community.
- **Viral loops:** share cards with custom image/payload into 1:1 chats and groups; Moments; "分享复活/分享得道具" mechanics (subject to periodic platform rule tightening — pure "share-gate" designs have been restricted since 2019; modern designs use rewarded ads as the compliant alternative).
- **Re-engagement:** 订阅消息 (subscription messages), sidebar/掉落 re-entry, desktop shortcut, WeChat search, official-account deep links, 小游戏推荐位.
- **Monetization — IAA:** `wx.createRewardedVideoAd`, interstitial, banner, native/custom ads via 流量主; developer keeps ~50% of ad revenue (up to 70% on the first ¥2M/day for "innovative" titles).
- **Monetization — IAP:** `wx.requestVirtualPayment` — Android/HarmonyOS/Windows route to WeChat Pay (platform fee 40%; 30% for "creative" titles); **iOS routes to Apple Pay since Nov 2025** under the Apple "Mini Apps Partner Program" (Apple 12% + Tencent 5% standard = 17%; Tencent's 5% waived through 2026 → effective 12%; media headline figure 15% commission). Requires iOS 15+, WeChat 8.0.68+, min ¥1. Before this deal iOS mini games were **ad-only** (or grey-area external top-ups) — this is the single biggest ecosystem change of 2025–26.
- **Multiplayer:** managed room + lock-step frame-sync service (`wx.getGameServerManager`), plus 云开发 for lightweight async backends.
- **2026 platform incentives:** first-launch IAP titles keep 100% of the first ¥50M gross plus up to ¥20M bonus; non-first-launch new titles keep the first ¥1M — an aggressive supply-side subsidy no generic platform matches.

---

## 3. Top-10 Candidate Games — Multi-Dimensional Audit

### 3.1 Selection (blended: 5 from top-played/IAA, 5 from top-grossing/IAP; July 2026 charts + evergreen icon status)

| # | Game (EN gloss) | Chart basis (Jul 2026) | Genre | Monetization |
|---|---|---|---|---|
| 1 | 羊了个羊：星球 (Sheep a Sheep: Planet) | 畅玩榜 #2 (7+ consecutive months #1–2) | Triple-tile match puzzle | IAA |
| 2 | 抓大鹅 (Grab the Big Goose) | 畅玩榜 #4 (top-2 most of 2026) | 3D item-pile dig & triple-match | IAA |
| 3 | 赵云与阿斗 (Zhao Yun & A-Dou) | 畅玩榜 #1; 抖音畅销榜 #1 (Jun) | Chinese-character merge tower-defense + 1v1 online PvP | IAA + IAP hybrid |
| 4 | 挪了下车 (Move the Car) | 畅玩榜 #3 | Parking / unblock puzzle | IAA |
| 5 | 跳一跳 (Jump Jump) | Evergreen icon (2017 launch title; still in casual top lists) | Physics timing arcade | Light (brand boxes/ads) |
| 6 | 向僵尸开炮 (Fire on Zombies) | 畅销榜 #2 (top-5 all year) | Projectile shooter/TD + idle meta | Hybrid IAA+IAP |
| 7 | 无尽冬日 (Endless Winter / Whiteout Survival mini) | 畅销榜 #6 (multiple #1 months, e.g. Mar) | 4X SLG (survival city-builder + world map) | IAP (whale-driven) |
| 8 | 三国：冰河时代 (Three Kingdoms: Ice Age) | 畅销榜 #3 (#1 in May) | 4X SLG | IAP |
| 9 | 我的花园世界 (My Garden World) | 畅销榜 #1 (Jul) | Simulation/decoration + casual core (genre +210% YoY) | IAP |
| 10 | 寻道大千 (Nobody's Adventure Chop-Chop) | 畅销榜 #28 (Jul; era-defining 2023–24 #1) | Xianxia idle RPG | IAP + ads |

Honorable mentions (audited briefly in §3.4): 欢乐斗地主 (real-time card multiplayer benchmark), 一找一个准 (hidden-object), QQ经典农场 (farm sim revival, May #2/Jul #7), 永远的蔚蓝星球 (TD), 灵画师, 咸鱼之王, 贪吃蛇大作战.

### 3.2 Per-game technical audit matrix

Legend: Gfx = graphics complexity; Phys = physics needs; Net = networking/multiplayer; Social = depth of WeChat social integration. Scale L/M/H.

| Game | Gfx | Phys | Net | Social (share / leaderboard / friend-challenge) | Notes |
|---|---|---|---|---|---|
| 羊了个羊：星球 | L (2D sprite stacks) | None | L (async: region/friend rankings, server-issued daily levels) | **H** — province/friend rank boards, share-to-chat bragging, rewarded-ad revives; virality engineered around a difficulty cliff | Deterministic tile-DAG puzzle; server keeps level-of-the-day + pass rates |
| 抓大鹅 | M (3D bin of ~hundreds of rigid items) | **M–H** (3D rigid-body pile, raycast picking) | L (offline core; async ranks) | M — share, rank boards, ad-gated tools | The one top-IAA title with real 3D physics |
| 赵云与阿斗 | L–M (ink-wash text-as-units; particle VFX) | None (grid TD) | **M–H** (1v1 online battles <5 min; matchmaking; likely lock-step or server-relay; bots plausible at low MMR) | M — share, rank, season ladder | Merge + TD + bag/inventory management; text-only art radically cuts asset cost |
| 挪了下车 | L (2D/2.5D board) | None (grid logic; optional car-slide tween) | None (async ranks) | M — share, level-progress boards | Pure algorithmic puzzle (unblock/rush-hour family) |
| 跳一跳 | L (minimal 3D/2.5D primitives) | L (charge-power ballistic jump; landing check) | None (score submit) | **H** — friend & group leaderboards ARE the product; the canonical open-data-domain showcase | The 2017 launch title; 100M+ DAU at peak |
| 向僵尸开炮 | M (dense 2D projectile/particle VFX; hundreds of entities) | L (ballistics, knockback — fake physics fine) | M (server-validated meta, events, guild/leaderboards; core combat offline) | M — guilds, events, ranks, share | Deep meta: gear, talents, roguelike upgrades, seasonal liveops |
| 无尽冬日 | M–H (2.5D/3D city + world map, weather VFX) | None | **H** (persistent world shards, alliances, real-time rallies, chat, server-authoritative economy, anti-cheat) | M–H — alliances, cross-server events; WeChat social used for UA more than core play | Port of native hit Whiteout Survival → gameplay itself is platform-independent by construction |
| 三国：冰河时代 | M–H (same class) | None | **H** (same class) | M–H | Same SLG server template, Three-Kingdoms theme |
| 我的花园世界 | M (rich 2D scene decoration, large asset base) | None | M (server-driven economy, events, social visits) | M — visits/likes, ranks, share | Content/liveops-heavy rather than tech-heavy |
| 寻道大千 | M (2D spine-style RPG scenes) | None | M–H (server-authoritative idle economy, cross-server async PvP, guilds, events) | M — guilds, ranks, share; famously UA-driven via WeChat ad network | Peak months reportedly ~¥700M gross in 2023 era |

### 3.3 What each game *actually* depends on WeChat for

| Game | Hard WeChat dependencies | Soft (replaceable with effort) |
|---|---|---|
| 羊了个羊：星球 | Friend/region rank virality; share-to-chat loops; rewarded-ad economics | Level service, identity |
| 抓大鹅 | Rewarded-ad economics; share loops | Everything else |
| 赵云与阿斗 | Matchmaking liquidity from platform-scale DAU; ad economics | Netcode (could self-host), identity |
| 挪了下车 | Ad economics; discovery | Everything else |
| 跳一跳 | **Friend/group leaderboard (the core loop)**; zero-friction launch from chat | Gameplay trivially portable |
| 向僵尸开炮 | UA via WeChat ads; hybrid IAA+IAP rails; subscription-message re-engagement | Combat/meta all portable |
| 无尽冬日 | Almost none in gameplay (native-app port); WeChat = distribution + payment rails | Full backend must be self-built regardless |
| 三国：冰河时代 | Same | Same |
| 我的花园世界 | IAP rails + platform incentives (¥50M zero-share window); social visits | Content pipeline portable |
| 寻道大千 | WeChat ad-network UA machine; IAP rails; sidebar re-entry habits | Idle economy portable |

### 3.4 Honorable-mention audit (1-line each)

- **欢乐斗地主** (Tencent): trivial card logic (OSS Dou Dizhu engines exist), but the product = playing with your actual WeChat friends + platform matchmaking liquidity + anti-cheat at national scale. Replicability 6.
- **一找一个准**: hidden-object; trivially portable (score ~9), lives on ad economics.
- **QQ经典农场**: nostalgia IP + social visiting; mechanics portable (~7), IP not.
- **贪吃蛇大作战**: io-snake with bot-backed "multiplayer"; well-understood OSS territory (~8).
- **海盗来了** (legacy benchmark): Coin-Master-like raid loop whose *entire* design was WeChat-friend raiding — the historical maximum of social-graph coupling (~4 without WeChat).

---

## 4. SOTA Open-Source Replication Stack — Comparison

### 4.1 Engine/framework comparison for replicating each experience class

| Experience class (top-10 members) | Best OSS/generic stack | Parity verdict |
|---|---|---|
| 2D tile/grid puzzle (羊了个羊, 挪了下车, 一找一个准) | **Phaser 3/4** or **PixiJS v8** + TS; or Cocos Creator (OSS core) targeting web | **Full parity.** Days of work for core loop; deterministic logic, no physics |
| Physics arcade (跳一跳) | **Three.js** (or PlayCanvas OSS) + trivial custom ballistics; planck.js unnecessary | **Full parity** on mechanics; leaderboard fabric is the gap |
| 3D physics pile (抓大鹅) | Three.js/Babylon.js + **Rapier** (WASM) or Jolt.js; Unity+Bullet if native | **Full parity**; mobile-web perf tuning needed (sleep islands, instancing) |
| Merge-TD + light PvP (赵云与阿斗) | Phaser/Pixi + **Colyseus** (room-based, MIT) or **Nakama** (Apache-2) for 1v1; deterministic sim + lock-step or state-sync | **Parity feasible**; matchmaking liquidity & bot fallback are product work, not tech gaps |
| Projectile TD + idle meta (向僵尸开炮) | Cocos/Phaser client + Node/Go meta-server (Nakama covers inventory/leaderboards/guilds) | **Parity feasible**; the moat is content volume + liveops cadence, not tech |
| Simulation/decoration (我的花园世界) | Cocos Creator or Unity; Supabase/Firebase or Nakama backend | **Parity feasible**; asset production is the real cost |
| Idle RPG (寻道大千) | Any 2D engine + server-authoritative economy (Node/Go + Redis/Postgres) | **Parity feasible**; economy design/anti-cheat/liveops are the cost |
| 4X SLG (无尽冬日, 三国：冰河时代) | Unity/Cocos client + **custom sharded world server** (Go/Erlang/Java; no turnkey OSS covers alliance-scale SLG), Redis+Postgres, chat (e.g. Centrifugo), anti-cheat | **Technically proven portable** (both derive from native-app SLG templates) but the largest engineering program on this list: world-shard simulation, rally timing, mail/chat, economy ops, LTV-driven liveops |
| Real-time card multiplayer (欢乐斗地主) | boardgame.io / Colyseus / Nakama | Logic trivial; **social liquidity is the moat** |

### 4.2 Backend/services parity table

| WeChat capability | OSS/generic SOTA equivalent | Parity |
|---|---|---|
| 云开发 TCB (functions/DB/storage) | Firebase, **Supabase**, Cloudflare Workers+D1 | ✅ Full |
| Leaderboards (global/region) | Redis sorted sets; Nakama leaderboards | ✅ Full |
| **Friend** leaderboards (open-data domain) | Must build own social graph: OAuth + friend codes/contact import | ⚠️ Functional but cold-start; no ambient graph |
| Managed lock-step frame sync (`wx.getGameServerManager`) | Colyseus/Nakama (state sync), custom lockstep (e.g. deterministic sim + UDP-like WebRTC datachannels) | ⚠️ Self-hosted, self-operated; no free managed tier |
| Rewarded video ads (流量主) | AdMob/Unity Ads/AppLovin (native apps); AdSense **H5 Games Ads** / Poki-CrazyGames SDKs (web) | ⚠️ Works globally; **very weak inside mainland-CN web** (AdMob/AdSense unavailable; CN networks like 穿山甲/优量汇 require app or platform context) |
| `wx.requestVirtualPayment` (WeChat Pay / Apple Pay routed) | Stripe (web), StoreKit/Play Billing (native) | ⚠️ 1-tap parity only in native apps; web-payment friction in CN is high |
| Subscription messages / re-engagement | Web Push, FCM/APNs (native) | ⚠️ iOS web push adoption poor; CN Android web push effectively dead |
| Share cards into chats/groups w/ payload + `shareTicket` group rank | Web Share API, deep links, Telegram Mini Apps share | ❌ No group-context payload equivalent on generic web; Telegram MAs are the closest analog |
| Zero-install <3s launch inside chat app | PWA; Telegram Mini Apps; Discord Activities; YouTube Playables | ⚠️ Channel exists but none has WeChat's CN reach |
| Real-name/anti-addiction compliance (CN) | Must integrate 国家新闻出版署 real-name system yourself + 版号 | ❌ Heavy regulatory lift for standalone CN release |

### 4.3 Distribution analogs outside WeChat (for "mini-game-like" replication)

- **Telegram Mini Apps** — closest structural analog (chat-embedded, share loops, TON payments); the right target for a like-for-like *platform* replication study.
- **Discord Activities**, **YouTube Playables**, **TikTok/抖音小游戏** (same CN duopoly), **Facebook Instant Games** (sunset for new titles), web portals (**Poki, CrazyGames** — provide SDKs with rewarded ads & basic identity).
- Native app + instant-ish UX (App Clips / Google Play Instant) — high friction, rarely worth it for this genre set.

---

## 5. Gap Analysis — WeChat Platform APIs vs Generic Web/Mobile

Severity: 🔴 blocking for like-for-like experience · 🟡 replaceable with meaningful effort/loss · 🟢 drop-in replaceable.

| # | WeChat capability | Generic replacement | Gap severity | Impact on top-10 replication |
|---|---|---|---|---|
| G1 | Ambient identity (`wx.login`, OpenID/UnionID, silent) | OAuth (Apple/Google), Telegram initData | 🟡 | Adds first-session friction to all 10; kills "instant anonymous but persistent" onboarding |
| G2 | Friend social graph + open-data-domain friend/group leaderboards | Self-built graph (friend codes, contact import — privacy-constrained) | 🔴 | Guts 跳一跳; major loss for 羊了个羊-class virality; moderate for SLGs |
| G3 | Share cards with payload into chats/groups; `shareTicket` group ranks | Web Share API/deep links | 🔴 | Removes the 30–50%-of-installs social acquisition channel |
| G4 | Distribution surfaces (drop-down recents, search, sidebar, 游戏圈, Moments/official-account links, PC client) | App stores/web SEO/paid UA | 🔴 | Re-engagement halves without habitual surfaces; UA becomes paid-only |
| G5 | One-tap payments (WeChat Pay; Apple Pay via MAPP since 11/2025) at 12–17% effective take | Stripe/IAP (15–30% + friction) | 🟡 | IAP-heavy titles (#6–#10) lose conversion; web-Stripe路线 loses CN market entirely |
| G6 | 流量主 rewarded-video network (CN-scale fill/eCPM) | AdMob et al. (not in CN web); Poki/CrazyGames SDK (global web) | 🔴 (CN) / 🟡 (global) | IAA titles (#1–#4) are economically unviable on CN open web; viable on global web portals/Telegram at lower eCPM |
| G7 | Managed frame-sync multiplayer (`wx.getGameServerManager`) | Colyseus/Nakama self-hosted | 🟡 | 赵云与阿斗-class PvP needs owned infra + matchmaking liquidity (bots mitigate) |
| G8 | 云开发 TCB | Firebase/Supabase | 🟢 | None |
| G9 | Subscription messages / re-engagement push | Web push/FCM | 🟡 | Retention loops weaken, esp. idle/SLG event pings |
| G10 | Engine plugin (Cocos runtime pre-installed) + 4MB discipline | CDN + service-worker caching | 🟢/🟡 | First-load size must be engineered manually; achievable |
| G11 | CN compliance stack (real-name, anti-addiction, 版号) handled in-platform | Self-integration + licensing | 🔴 (CN standalone) | Any CN-market standalone clone needs a publisher partner |
| G12 | Platform subsidies (first ¥50M zero-share, ¥20M bonuses, new-game traffic) | None | 🟡 | Changes business case, not feasibility |

---

## 6. Replicability Scores (1–10, without WeChat-specific APIs)

Scoring rubric: `score ≈ 0.5·TechPortability + 0.3·(10 − SocialCoupling) + 0.2·(10 − BackendBurden)`, where TechPortability = can OSS/web stacks deliver the client+core loop at parity; SocialCoupling = how much of the product's value depends on WeChat identity/graph/share/distribution; BackendBurden = scale of server systems that must be built and operated. 10 = full experience reproducible generically with minimal loss; 1 = product is inseparable from WeChat.

| Rank | Game | Tech portability | WeChat coupling | Backend burden | **Score** | One-line verdict |
|---|---|---|---|---|---|---|
| 1 | 挪了下车 | 10 | Low (ads/discovery only) | Minimal | **9** | Pure algorithmic puzzle; clone in days; only the audience is hard |
| 2 | 羊了个羊：星球 | 10 | Med-High (share/rank virality) | Low (level service) | **8** | Mechanics trivial; the difficulty-cliff + brag-loop needs a social channel to matter |
| 3 | 抓大鹅 | 8 (3D physics on mobile web) | Medium | Low | **8** | Rapier/Jolt WASM handles the pile; perf tuning is the only real work |
| 4 | 跳一跳 | 10 | **Very high** (friend/group ranks are the game) | Minimal | **7** | A perfect tech demo, a hollow product without an ambient friend graph |
| 5 | 赵云与阿斗 | 7 (realtime 1v1 + deterministic merge-TD sim) | Medium | Medium (rooms, matchmaking, bots) | **7** | Colyseus/Nakama suffice; liquidity & CJK-text design are product risks |
| 6 | 向僵尸开炮 | 8 | Medium (UA + hybrid monetization rails) | Medium (meta, events, guilds) | **7** | Combat portable; moat = content volume + liveops cadence + ad economics |
| 7 | 我的花园世界 | 7 | Medium | Medium-High (economy, liveops, social visits) | **6** | Feasibility fine; asset production + liveops ops are the true cost |
| 8 | 寻道大千 | 6 | Medium (ad-network UA machine, IAP rails) | High (server-authoritative idle economy, cross-server PvP) | **6** | Portable but its success formula = WeChat UA arbitrage + rapid iteration |
| 9 | 无尽冬日 | 5 (client fine; world-shard SLG server is a program) | Low-Med (gameplay platform-independent — it IS a native-app port) | **Very high** | **5** | Proof that the game ports; replicating it from scratch = building a Whiteout-class SLG |
| 10 | 三国：冰河时代 | 5 | Low-Med | Very high | **5** | Same class: alliance/world-map server, anti-cheat, liveops org required |

Cross-check vs `PARENT_BASELINE.md`: consistent — baseline "Easy" set (挪了下车/羊了个羊/跳一跳-class) scores 7–9 here; "Hard" SLG/RPG set scores 5–6. This audit adds the nuance that 跳一跳's *mechanics* are the easiest of all (would be 10) but its *product* is the most social-graph-coupled of the casual set, which is why it scores below 羊了个羊-class titles on a without-WeChat basis.

---

## 7. Critical Blockers (ranked)

1. **Social graph & friend/group leaderboards (G2/G3).** The open-data domain has no generic equivalent; friend ranks and chat-group share-cards drive both virality (30–50% of installs) and retention. Mitigations: target Telegram Mini Apps (real chat graph), or design around global ladders + clans + friend codes; accept that 跳一跳-class products lose their soul.
2. **Distribution & habitual re-entry surfaces (G4).** Drop-down recents/sidebar/search/PC client create daily habit for free. Off-WeChat, every DAU must be re-bought or re-earned via push (weak on iOS web/CN Android web).
3. **CN monetization rails (G5/G6).** On the CN open web there is effectively no rewarded-video economy and no low-friction payment for anonymous users; IAA clones are only viable globally (Poki/CrazyGames/Telegram) or as native apps with AdMob-class networks. The Nov 2025 Apple–Tencent MAPP deal (12–17% effective take on iOS) further widens WeChat's in-platform advantage.
4. **CN compliance for a standalone release (G11).** Real-name verification, minor anti-addiction, and 版号 licensing are platform-absorbed inside WeChat; standalone replication for the CN market requires a licensed publisher.
5. **Managed multiplayer parity (G7).** WeChat's free frame-sync room service must be replaced by self-hosted Colyseus/Nakama plus matchmaking liquidity engineering (bots, MMR widening) for PvP titles like 赵云与阿斗.
6. **SLG server scope (backend burden, not an API gap).** 无尽冬日/三国：冰河时代 need sharded persistent worlds, alliance realtime ops, chat, anti-cheat, and a liveops organization — the blocker is an engineering program, independent of WeChat.
7. **First-load engineering (G10).** Without the client-baked Cocos engine plugin and 4MB discipline, a clone must hit <3s time-to-interactive via aggressive code-splitting, CDN, and service-worker caching to match the UX bar.

---

## 8. Recommendations for Round 2

1. **Prototype tier (validate this audit cheaply):** 挪了下车-class and 羊了个羊-class clones on Phaser/PixiJS with a Supabase leaderboard — both score ≥8 and exercise G1/G6 mitigations. (A 跳一跳 canvas prototype already exists on this branch — `round1` playable; extend it with a friend-code leaderboard to measure the G2 gap concretely.)
2. **Physics tier:** 抓大鹅-class demo with Three.js + Rapier to benchmark mobile-web 3D physics (the only genuinely interesting client-tech risk in the casual set).
3. **PvP tier (optional):** 赵云与阿斗-lite 1v1 on Colyseus with bot fallback to study matchmaking-liquidity mitigation.
4. **Do not attempt** SLG-class replication in prototype rounds; treat 无尽冬日/三国：冰河时代 as business-case studies only.
5. **Platform strategy:** for like-for-like *ecosystem* replication study, evaluate Telegram Mini Apps as the closest structural analog (chat graph, share loops, payments).
6. **IP note (echoing parent baseline):** replicate mechanics, not trade dress — all prototypes must use original art/naming.

---

*End of Round 1 SOTA audit — fable subagent.*
