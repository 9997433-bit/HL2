/**
 * wx-shim — a mock of the 微信小游戏 (WeChat Mini Game) `wx.*` platform APIs.
 *
 * Round 1 concluded that the *mechanics* of the 畅玩榜 leaders are a few hundred
 * lines of JavaScript, while the *product* — rewarded video, share-to-revive,
 * the friend leaderboard in the 开放数据域 — lives entirely behind `wx.*`. This
 * file mocks that surface so a prototype can be written against the real API
 * shape, driven headlessly in tests, and ported to a mini game without the call
 * sites changing.
 *
 * The shim never shadows a real host: `installWxShim()` detects a genuine `wx`
 * and steps aside, reporting `shim.isMock === false`.
 *
 * ── Browser, classic script ────────────────────────────────────────────────
 *   <script src="../shared/wx-shim.js"></script>
 *   <script>
 *     const shim = WxShim.installWxShim({ adBehavior: 'manual' });
 *     const ad = wx.createRewardedVideoAd({ adUnitId: 'adunit-shuffle' });
 *     ad.onClose((res) => { if (res.isEnded) grantProp(); });
 *     shim.on('ad:show', (session) => renderFakeVideo(session));
 *   </script>
 *
 * ── ES module (browser or Node) ────────────────────────────────────────────
 *   import { installWxShim } from '../shared/wx-shim.mjs';
 *
 * ── CommonJS / vm sandbox ──────────────────────────────────────────────────
 *   const { createWxShim } = require('../shared/wx-shim.js');
 *
 * Everything is deterministic: the mock draws from a seeded PRNG, so friend
 * lists, ad fill and share returns replay identically for a given `seed`.
 */
(function (root, factory) {
  const api = factory();
  root.WxShim = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.2.0';

  /** Marks the namespace as a mock so host-detection code can tell them apart. */
  const MOCK_FLAG = '__wxShimMock';

  /** Real 激励视频 error codes, as documented for `RewardedVideoAd.onError`. */
  const AD_ERRORS = {
    1000: '后端错误',
    1001: '参数错误',
    1002: '广告单元无效',
    1003: '内部错误',
    1004: '无适合的广告',
    1005: '广告组件审核中',
    1006: '广告组件被驳回',
    1007: '广告组件被封禁',
    1008: '广告单元已关闭',
  };

  /** 场景值: the ones that matter for the share loop. */
  const SCENE = {
    LAUNCH_FROM_LIST: 1001,
    SINGLE_CHAT_CARD: 1007,
    GROUP_CHAT_CARD: 1008,
    QR_CODE: 1011,
    GROUP_CHAT_CARD_WITH_TICKET: 1044,
    CHAT_PULL_DOWN: 1089,
  };

  const DEFAULT_FRIENDS = [
    '小明', '阿伟', '菜菜子', '老王', '芒果冰', 'Nina', '不熬夜了',
    '打工人本人', '摸鱼咸鱼', '一只柯基', '半糖去冰', '隔壁老李',
  ];

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */

  /** Deterministic PRNG, same one the prototypes use for reproducible levels. */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createEmitter() {
    const map = new Map();
    const bucket = (type) => {
      if (!map.has(type)) map.set(type, new Set());
      return map.get(type);
    };
    return {
      /** @returns {() => void} an unsubscribe function. */
      on(type, fn) {
        bucket(type).add(fn);
        return () => this.off(type, fn);
      },
      once(type, fn) {
        const wrap = (payload, evt) => {
          this.off(type, wrap);
          fn(payload, evt);
        };
        return this.on(type, wrap);
      },
      off(type, fn) {
        if (map.has(type)) map.get(type).delete(fn);
      },
      emit(type, payload) {
        const data = payload || {};
        for (const fn of Array.from(bucket(type))) fn(data, type);
        for (const fn of Array.from(bucket('*'))) fn(data, type);
        return data;
      },
      clear() {
        map.clear();
      },
    };
  }

  /** Drop callbacks and anything non-serialisable before it enters the log. */
  function sanitize(value, depth) {
    const d = depth || 0;
    if (typeof value === 'function') return '[fn]';
    if (value === null || typeof value !== 'object' || d > 2) return value;
    if (Array.isArray(value)) return value.map((v) => sanitize(v, d + 1));
    const out = {};
    for (const key of Object.keys(value)) out[key] = sanitize(value[key], d + 1);
    return out;
  }

  function byteLength(str) {
    let bytes = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.codePointAt(i);
      if (code > 0xffff) i++;
      bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    }
    return bytes;
  }

  function globalWx() {
    if (typeof globalThis !== 'undefined' && globalThis.wx) return globalThis.wx;
    return typeof wx !== 'undefined' ? wx : null; // eslint-disable-line no-undef
  }

  /** True only inside a genuine WeChat host — a shim-installed `wx` is not one. */
  function isRealWx() {
    const candidate = globalWx();
    return !!candidate && !candidate[MOCK_FLAG] && typeof candidate.getSystemInfoSync === 'function';
  }

  /* ------------------------------------------------------------------ */
  /* Shim                                                                */
  /* ------------------------------------------------------------------ */

  const DEFAULTS = {
    seed: 20260826,
    /** Simulated round-trip for async APIs. 0 keeps everything synchronous. */
    latencyMs: 0,
    /** 'auto' closes the ad by itself; 'manual' waits for the host UI. */
    adBehavior: 'auto',
    /** 'auto' mode only: how long the fake video plays. */
    adDurationMs: 0,
    /** Probability `load()` finds an ad; below 1 you get errCode 1004. */
    adFillRate: 1,
    /** 'auto' mode only: probability the viewer bails out (isEnded === false). */
    adSkipRate: 0,
    /** 'auto' simulates a friend opening the card; 'manual'/'none' do not. */
    shareBehavior: 'auto',
    shareReturnMs: 0,
    friendCount: 7,
    friendNames: DEFAULT_FRIENDS,
    /** Mirror production, where 好友数据 is readable only in the 开放数据域. */
    strictOpenDataContext: false,
    persistStorage: true,
    /** 'ios' | 'android' | 'devtools'. iOS blocks 虚拟支付, and the mock does too. */
    platform: null,
    self: null,
    systemInfo: null,
    logLimit: 500,
    verbose: false,
  };

  /**
   * Build a shim without touching any global. `shim.wx` is the mock namespace.
   */
  function createWxShim(options) {
    const config = Object.assign({}, DEFAULTS, options || {});
    config.self = Object.assign(
      { openid: 'openid-self-0001', nickname: '我（本机）', avatarUrl: 'wxshim://avatar/self' },
      options && options.self
    );

    const emitter = createEmitter();
    const log = [];
    let rng = mulberry32(config.seed);
    let seq = 0;

    /* ---- plumbing -------------------------------------------------- */

    function record(api, args) {
      const entry = { api, args: sanitize(args), at: Date.now() };
      log.push(entry);
      if (log.length > config.logLimit) log.shift();
      if (config.verbose && typeof console !== 'undefined') console.info('[wx-shim]', api, entry.args);
      emitter.emit('call', entry);
      return entry;
    }

    /** Async in spirit, synchronous when `latencyMs` is 0 so tests stay simple. */
    function defer(fn, ms) {
      const delay = ms == null ? config.latencyMs : ms;
      if (!(delay > 0) || typeof setTimeout !== 'function') {
        fn();
        return null;
      }
      return setTimeout(fn, delay);
    }

    function failure(name, message, errCode) {
      const err = new Error(message);
      err.errMsg = name + ':fail ' + message;
      if (errCode != null) err.errCode = errCode;
      return err;
    }

    /**
     * The wx callback convention: `{success, fail, complete}`, and a Promise
     * instead when the caller passes none of them.
     */
    function invoke(name, opts, worker) {
      const o = opts || {};
      record('wx.' + name, o);
      const callbackStyle =
        typeof o.success === 'function' || typeof o.fail === 'function' || typeof o.complete === 'function';
      let settle = null;
      const promise = callbackStyle ? null : new Promise((res, rej) => { settle = { res, rej }; });
      if (promise) promise.catch(() => {}); // a dropped rejection must not crash the host

      defer(() => {
        let result;
        try {
          result = worker();
        } catch (e) {
          const err = { errMsg: e.errMsg || name + ':fail ' + e.message };
          if (e.errCode != null) err.errCode = e.errCode;
          if (o.fail) o.fail(err);
          if (o.complete) o.complete(err);
          if (settle) settle.rej(err);
          return;
        }
        const res = Object.assign({ errMsg: name + ':ok' }, result);
        if (o.success) o.success(res);
        if (o.complete) o.complete(res);
        if (settle) settle.res(res);
      });

      return promise;
    }

    /* ---- device / system ------------------------------------------- */

    function detectPlatform() {
      if (config.platform) return config.platform;
      const ua = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '';
      if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
      if (/Android/i.test(ua)) return 'android';
      return 'devtools';
    }

    function buildSystemInfo() {
      const hasWindow = typeof window !== 'undefined' && window.innerWidth;
      const windowWidth = hasWindow ? Math.round(window.innerWidth) : 390;
      const windowHeight = hasWindow ? Math.round(window.innerHeight) : 844;
      const pixelRatio = hasWindow ? Math.min(window.devicePixelRatio || 2, 3) : 3;
      const platform = detectPlatform();
      const base = {
        SDKVersion: '3.5.7',
        brand: platform === 'ios' ? 'apple' : 'devtools',
        model: platform === 'ios' ? 'iPhone 15<iPhone16,1>' : 'iPhone X',
        system: platform === 'ios' ? 'iOS 18.2' : 'Android 14',
        platform,
        language: 'zh_CN',
        version: '8.0.60',
        pixelRatio,
        screenWidth: windowWidth,
        screenHeight: windowHeight,
        windowWidth,
        windowHeight,
        statusBarHeight: 47,
        // 竖屏全面屏机型的安全区，游戏 HUD 必须避开
        safeArea: {
          top: 47,
          left: 0,
          right: windowWidth,
          bottom: windowHeight - 34,
          width: windowWidth,
          height: windowHeight - 81,
        },
        benchmarkLevel: platform === 'ios' ? -1 : 20,
        fontSizeSetting: 16,
        deviceOrientation: 'portrait',
        theme: 'light',
      };
      return Object.assign(base, config.systemInfo);
    }

    /* ---- storage ---------------------------------------------------- */

    const memoryStorage = new Map();
    const localStore =
      config.persistStorage && typeof localStorage !== 'undefined' ? localStorage : null;
    const STORAGE_PREFIX = 'wxshim:';

    const storage = {
      get(key) {
        if (localStore) {
          const raw = localStore.getItem(STORAGE_PREFIX + key);
          return raw == null ? '' : JSON.parse(raw);
        }
        return memoryStorage.has(key) ? memoryStorage.get(key) : '';
      },
      set(key, data) {
        if (localStore) localStore.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
        else memoryStorage.set(key, data);
      },
      remove(key) {
        if (localStore) localStore.removeItem(STORAGE_PREFIX + key);
        else memoryStorage.delete(key);
      },
      keys() {
        if (!localStore) return Array.from(memoryStorage.keys());
        const out = [];
        for (let i = 0; i < localStore.length; i++) {
          const k = localStore.key(i);
          if (k && k.indexOf(STORAGE_PREFIX) === 0) out.push(k.slice(STORAGE_PREFIX.length));
        }
        return out;
      },
      clear() {
        if (localStore) this.keys().forEach((k) => localStore.removeItem(STORAGE_PREFIX + k));
        else memoryStorage.clear();
      },
    };

    /* ---- cloud storage & friends ------------------------------------ */

    /** openid -> Map(key -> value). The self entry is what the game writes. */
    const cloud = new Map();
    let friends = [];
    let inOpenDataContext = false;

    function kvFor(openid) {
      if (!cloud.has(openid)) cloud.set(openid, new Map());
      return cloud.get(openid);
    }

    function buildFriends() {
      friends = [];
      const names = config.friendNames.length ? config.friendNames : DEFAULT_FRIENDS;
      for (let i = 0; i < config.friendCount; i++) {
        friends.push({
          openid: 'openid-friend-' + String(i + 1).padStart(4, '0'),
          nickname: names[i % names.length],
          avatarUrl: 'wxshim://avatar/friend-' + (i + 1),
        });
      }
    }
    buildFriends();

    /**
     * Invent a friend's value for a key by imitating the shape the game itself
     * stores: a bare number, WeChat's own `{"wxgame":{"score":n}}` envelope, or
     * anything else copied verbatim.
     */
    function jitterValue(selfValue, spread) {
      const scale = () => 0.35 + rng() * 1.5;
      if (selfValue == null || selfValue === '') return String(Math.max(1, Math.round(spread * scale())));
      if (/^-?\d+(\.\d+)?$/.test(selfValue)) {
        return String(Math.max(0, Math.round(Number(selfValue) * scale())));
      }
      try {
        const parsed = JSON.parse(selfValue);
        if (parsed && parsed.wxgame && typeof parsed.wxgame.score !== 'undefined') {
          return JSON.stringify({
            wxgame: {
              score: Math.max(0, Math.round(Number(parsed.wxgame.score) * scale())),
              update_time: Math.floor(Date.now() / 1000) - Math.floor(rng() * 86400),
            },
          });
        }
      } catch (e) {
        /* not JSON — fall through and copy */
      }
      return selfValue;
    }

    function friendValue(friend, key) {
      const kv = kvFor(friend.openid);
      if (!kv.has(key)) {
        const selfValue = kvFor(config.self.openid).get(key);
        kv.set(key, jitterValue(selfValue, 20));
      }
      return kv.get(key);
    }

    function kvList(openid, keyList) {
      const kv = kvFor(openid);
      const keys = keyList && keyList.length ? keyList : Array.from(kv.keys());
      return keys
        .filter((k) => kv.has(k))
        .map((k) => ({ key: k, value: kv.get(k) }));
    }

    function requireOpenDataContext(name) {
      if (config.strictOpenDataContext && !inOpenDataContext) {
        throw failure(
          name,
          '该接口只能在开放数据域调用 (open data context only)',
          10005
        );
      }
    }

    /** Numeric leaderboard over whatever the game wrote — self included. */
    function leaderboard(key) {
      const rows = [config.self].concat(friends).map((user) => {
        const raw = user.openid === config.self.openid
          ? kvFor(config.self.openid).get(key)
          : friendValue(user, key);
        let score = Number(raw);
        if (Number.isNaN(score)) {
          try {
            score = Number(JSON.parse(raw).wxgame.score);
          } catch (e) {
            score = 0;
          }
        }
        return {
          openid: user.openid,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          isSelf: user.openid === config.self.openid,
          value: raw == null ? '' : raw,
          score: Number.isNaN(score) ? 0 : score,
        };
      });
      rows.sort((a, b) => b.score - a.score);
      rows.forEach((row, i) => { row.rank = i + 1; });
      return rows;
    }

    /* ---- ads --------------------------------------------------------- */

    const adCache = new Map(); // adUnitId -> instance, mirroring multiton:false
    let showing = null;

    function adError(code) {
      return { errCode: code, errMsg: AD_ERRORS[code] || 'unknown ad error' };
    }

    function buildFullscreenAd(kind, adUnitId) {
      const loadCbs = new Set();
      const errorCbs = new Set();
      const closeCbs = new Set();
      let state = 'idle'; // idle | loading | loaded | showing
      let loading = null;
      let destroyed = false;

      const ad = {
        adUnitId,
        /** Not part of the real API; the mock exposes it for assertions. */
        get __state() {
          return state;
        },

        load() {
          if (destroyed) return Promise.reject(adError(1003));
          if (state === 'loaded') return Promise.resolve();
          if (state === 'loading') return loading;
          state = 'loading';
          loading = new Promise((resolve, reject) => {
            defer(() => {
              if (rng() > config.adFillRate) {
                state = 'idle';
                const err = adError(1004);
                emitter.emit('ad:error', Object.assign({ adUnitId, kind }, err));
                errorCbs.forEach((cb) => cb(err));
                reject(err);
                return;
              }
              state = 'loaded';
              emitter.emit('ad:load', { adUnitId, kind });
              loadCbs.forEach((cb) => cb({}));
              resolve();
            });
          });
          loading.catch(() => {});
          return loading;
        },

        show() {
          record(kind + 'Ad.show', { adUnitId });
          if (destroyed) return Promise.reject(adError(1003));
          if (showing) {
            return Promise.reject({ errMsg: 'show:fail another ad is already on screen' });
          }
          if (state !== 'loaded') {
            // Real behaviour: show() rejects and the caller retries after load().
            return Promise.reject({ errMsg: 'show:fail ad is not loaded', errCode: 1003 });
          }
          state = 'showing';

          const session = {
            kind,
            adUnitId,
            startedAt: Date.now(),
            durationMs: config.adDurationMs,
            /** Watched to the end — the reward is granted. */
            complete: () => finish(true),
            /** Closed early — `onClose` fires with `isEnded:false`, no reward. */
            skip: () => finish(false),
            fail: (code) => {
              if (showing !== session) return false;
              showing = null;
              state = 'idle';
              const err = adError(code || 1000);
              emitter.emit('ad:error', Object.assign({ adUnitId, kind }, err));
              errorCbs.forEach((cb) => cb(err));
              return true;
            },
          };

          function finish(isEnded) {
            if (showing !== session) return false;
            showing = null;
            state = 'idle';
            emitter.emit('ad:close', { adUnitId, kind, isEnded });
            emitter.emit(isEnded ? 'ad:complete' : 'ad:skip', { adUnitId, kind });
            const res = kind === 'rewarded' ? { isEnded } : {};
            closeCbs.forEach((cb) => cb(res));
            ad.load().catch(() => {}); // real ads pull the next creative immediately
            return true;
          }

          showing = session;
          emitter.emit('ad:show', session);
          if (config.adBehavior === 'auto') {
            defer(() => {
              if (showing === session) finish(rng() >= config.adSkipRate);
            }, config.adDurationMs);
          }
          return Promise.resolve();
        },

        destroy() {
          destroyed = true;
          state = 'idle';
          adCache.delete(adUnitId);
          record(kind + 'Ad.destroy', { adUnitId });
        },

        onLoad: (cb) => loadCbs.add(cb),
        offLoad: (cb) => loadCbs.delete(cb),
        onError: (cb) => errorCbs.add(cb),
        offError: (cb) => errorCbs.delete(cb),
        onClose: (cb) => closeCbs.add(cb),
        offClose: (cb) => closeCbs.delete(cb),
      };

      // Real ad components start fetching as soon as they are created.
      ad.load().catch(() => {});
      return ad;
    }

    function createFullscreenAd(kind, opts) {
      const o = opts || {};
      const adUnitId = o.adUnitId || 'adunit-mock-' + kind;
      record('wx.create' + (kind === 'rewarded' ? 'RewardedVideo' : 'Interstitial') + 'Ad', o);
      if (!o.multiton && adCache.has(adUnitId)) return adCache.get(adUnitId);
      const ad = buildFullscreenAd(kind, adUnitId);
      if (!o.multiton) adCache.set(adUnitId, ad);
      return ad;
    }

    function createBannerAd(opts) {
      const o = opts || {};
      record('wx.createBannerAd', o);
      const resizeCbs = new Set();
      const errorCbs = new Set();
      const loadCbs = new Set();
      const style = Object.assign({ left: 0, top: 0, width: 300, height: 84, realWidth: 300, realHeight: 84 }, o.style);
      let visible = false;
      return {
        adUnitId: o.adUnitId || 'adunit-mock-banner',
        style,
        show() {
          visible = true;
          emitter.emit('banner:show', { adUnitId: o.adUnitId, style });
          record('bannerAd.show', { adUnitId: o.adUnitId });
          defer(() => {
            loadCbs.forEach((cb) => cb({}));
            resizeCbs.forEach((cb) => cb({ width: style.width, height: style.height }));
          });
          return Promise.resolve();
        },
        hide() {
          visible = false;
          emitter.emit('banner:hide', { adUnitId: o.adUnitId });
          return Promise.resolve();
        },
        destroy() {
          visible = false;
          emitter.emit('banner:destroy', { adUnitId: o.adUnitId });
        },
        get __visible() {
          return visible;
        },
        onResize: (cb) => resizeCbs.add(cb),
        offResize: (cb) => resizeCbs.delete(cb),
        onLoad: (cb) => loadCbs.add(cb),
        offLoad: (cb) => loadCbs.delete(cb),
        onError: (cb) => errorCbs.add(cb),
        offError: (cb) => errorCbs.delete(cb),
      };
    }

    /* ---- share ------------------------------------------------------- */

    const showCbs = new Set();
    const hideCbs = new Set();
    let systemShareProvider = null;
    let lastShare = null;

    function simulateShow(opts) {
      const payload = Object.assign(
        { scene: SCENE.LAUNCH_FROM_LIST, query: {}, shareTicket: undefined, referrerInfo: {} },
        opts
      );
      emitter.emit('show', payload);
      showCbs.forEach((cb) => cb(payload));
      return payload;
    }

    /**
     * `wx.shareAppMessage` is fire-and-forget: WeChat gives the game no callback
     * and no way to know whether the card was sent. Games infer it from a later
     * `onShow` carrying a shareTicket. The mock reproduces both halves and flags
     * the second one as simulated.
     */
    function shareAppMessage(opts) {
      const o = opts || {};
      record('wx.shareAppMessage', o);
      const shareTicket = 'mock-share-ticket-' + ++seq;
      lastShare = {
        title: o.title || '',
        imageUrl: o.imageUrl || '',
        query: o.query || '',
        shareTicket,
        at: Date.now(),
        /** No such signal exists on the real platform. */
        simulated: true,
      };
      emitter.emit('share', lastShare);
      if (config.shareBehavior === 'auto') {
        defer(() => acceptShare({ shareTicket }), config.shareReturnMs);
      }
      return undefined;
    }

    /** Pretend a friend opened the card: the closest thing to "share succeeded". */
    function acceptShare(info) {
      const i = info || {};
      const from = friends[Math.floor(rng() * Math.max(friends.length, 1))] || null;
      const payload = {
        shareTicket: i.shareTicket || (lastShare && lastShare.shareTicket) || 'mock-share-ticket-0',
        scene: i.scene || SCENE.GROUP_CHAT_CARD_WITH_TICKET,
        from,
        query: (lastShare && lastShare.query) || '',
        simulated: true,
      };
      emitter.emit('share:success', payload);
      simulateShow({ scene: payload.scene, shareTicket: payload.shareTicket, query: payload.query });
      return payload;
    }

    /* ---- the wx namespace ------------------------------------------- */

    const wxMock = {
      [MOCK_FLAG]: true,
      __shimVersion: VERSION,

      /* --- ads --- */
      createRewardedVideoAd: (opts) => createFullscreenAd('rewarded', opts),
      createInterstitialAd: (opts) => createFullscreenAd('interstitial', opts),
      createBannerAd,

      /* --- share --- */
      shareAppMessage,
      onShareAppMessage(cb) {
        systemShareProvider = cb;
        record('wx.onShareAppMessage', {});
      },
      offShareAppMessage() {
        systemShareProvider = null;
      },
      showShareMenu: (opts) => invoke('showShareMenu', opts, () => ({})),
      hideShareMenu: (opts) => invoke('hideShareMenu', opts, () => ({})),
      updateShareMenu: (opts) => invoke('updateShareMenu', opts, () => ({})),
      getShareInfo: (opts) =>
        invoke('getShareInfo', opts, () => ({
          encryptedData: 'mock-encrypted-data',
          iv: 'mock-iv',
          cloudID: 'mock-cloud-id',
        })),

      /* --- cloud storage / 开放数据域 --- */
      setUserCloudStorage: (opts) =>
        invoke('setUserCloudStorage', opts, () => {
          const list = (opts && opts.KVDataList) || [];
          if (!Array.isArray(list)) throw failure('setUserCloudStorage', 'KVDataList must be an array');
          if (list.length > 128) throw failure('setUserCloudStorage', 'KVDataList 最多 128 项');
          const kv = kvFor(config.self.openid);
          for (const item of list) {
            if (typeof item.key !== 'string' || typeof item.value !== 'string') {
              throw failure('setUserCloudStorage', 'key/value 必须是 string');
            }
            if (byteLength(item.value) > 1024) {
              throw failure('setUserCloudStorage', 'value 长度不能超过 1KB');
            }
            kv.set(item.key, item.value);
          }
          emitter.emit('cloud:set', { KVDataList: list.slice(), openid: config.self.openid });
          return {};
        }),

      getUserCloudStorage: (opts) =>
        invoke('getUserCloudStorage', opts, () => ({
          KVDataList: kvList(config.self.openid, opts && opts.keyList),
        })),

      removeUserCloudStorage: (opts) =>
        invoke('removeUserCloudStorage', opts, () => {
          const kv = kvFor(config.self.openid);
          ((opts && opts.keyList) || []).forEach((k) => kv.delete(k));
          return {};
        }),

      getFriendCloudStorage: (opts) =>
        invoke('getFriendCloudStorage', opts, () => {
          requireOpenDataContext('getFriendCloudStorage');
          const keyList = (opts && opts.keyList) || [];
          const rows = [config.self].concat(friends).map((user) => {
            if (user.openid !== config.self.openid) keyList.forEach((k) => friendValue(user, k));
            return {
              avatarUrl: user.avatarUrl,
              nickname: user.nickname,
              openid: user.openid,
              KVDataList: kvList(user.openid, keyList),
            };
          });
          emitter.emit('cloud:friends', { keyList, count: rows.length });
          // The real API returns friends in no particular order.
          return { data: rows };
        }),

      getGroupCloudStorage: (opts) =>
        invoke('getGroupCloudStorage', opts, () => {
          requireOpenDataContext('getGroupCloudStorage');
          const keyList = (opts && opts.keyList) || [];
          return {
            data: friends.slice(0, Math.max(2, Math.floor(friends.length / 2))).map((user) => ({
              avatarUrl: user.avatarUrl,
              nickname: user.nickname,
              openid: user.openid,
              KVDataList: kvList(user.openid, keyList),
            })),
          };
        }),

      getOpenDataContext() {
        record('wx.getOpenDataContext', {});
        return {
          canvas: null, // no sub-canvas off-platform; see README
          postMessage(message) {
            emitter.emit('opendata:message', { message });
          },
        };
      },

      getSharedCanvas() {
        record('wx.getSharedCanvas', {});
        if (!inOpenDataContext && config.strictOpenDataContext) {
          throw failure('getSharedCanvas', '只能在开放数据域调用');
        }
        return null;
      },

      /* --- login / user --- */
      login: (opts) =>
        invoke('login', opts, () => ({
          code: 'mock-js-code-' + Math.floor(rng() * 1e12).toString(36),
        })),
      checkSession: (opts) => invoke('checkSession', opts, () => ({})),
      getSetting: (opts) =>
        invoke('getSetting', opts, () => ({
          authSetting: { 'scope.userInfo': true, 'scope.WxFriendInteraction': true },
        })),
      getUserInfo: (opts) =>
        invoke('getUserInfo', opts, () => {
          const ids = (opts && opts.openIdList) || ['selfOpenId'];
          const pool = [config.self].concat(friends);
          const pick = (id) =>
            id === 'selfOpenId'
              ? config.self
              : pool.find((u) => u.openid === id) || config.self;
          const data = ids.map((id) => {
            const u = pick(id);
            return {
              openId: u.openid,
              nickName: u.nickname,
              avatarUrl: u.avatarUrl,
              gender: 0,
              language: 'zh_CN',
            };
          });
          return { data, userInfo: data[0] };
        }),
      createUserInfoButton(opts) {
        record('wx.createUserInfoButton', opts);
        const taps = new Set();
        return {
          type: (opts && opts.type) || 'text',
          style: (opts && opts.style) || {},
          show() {},
          hide() {},
          destroy() {
            taps.clear();
          },
          onTap: (cb) => taps.add(cb),
          offTap: (cb) => taps.delete(cb),
          /** Not in the real API: lets a test press the button. */
          __tap: () =>
            taps.forEach((cb) =>
              cb({ userInfo: { nickName: config.self.nickname, avatarUrl: config.self.avatarUrl } })
            ),
        };
      },

      /* --- system / lifecycle --- */
      getSystemInfoSync() {
        record('wx.getSystemInfoSync', {});
        return buildSystemInfo();
      },
      getSystemInfo: (opts) => invoke('getSystemInfo', opts, () => buildSystemInfo()),
      getWindowInfo() {
        const info = buildSystemInfo();
        record('wx.getWindowInfo', {});
        return {
          pixelRatio: info.pixelRatio,
          screenWidth: info.screenWidth,
          screenHeight: info.screenHeight,
          windowWidth: info.windowWidth,
          windowHeight: info.windowHeight,
          statusBarHeight: info.statusBarHeight,
          safeArea: info.safeArea,
        };
      },
      getDeviceInfo() {
        const info = buildSystemInfo();
        record('wx.getDeviceInfo', {});
        return {
          brand: info.brand,
          model: info.model,
          system: info.system,
          platform: info.platform,
          benchmarkLevel: info.benchmarkLevel,
        };
      },
      getAppBaseInfo() {
        const info = buildSystemInfo();
        record('wx.getAppBaseInfo', {});
        return {
          SDKVersion: info.SDKVersion,
          version: info.version,
          language: info.language,
          theme: info.theme,
        };
      },
      getLaunchOptionsSync() {
        record('wx.getLaunchOptionsSync', {});
        return { scene: SCENE.LAUNCH_FROM_LIST, query: {}, shareTicket: undefined, referrerInfo: {} };
      },
      getEnterOptionsSync() {
        return wxMock.getLaunchOptionsSync();
      },
      onShow: (cb) => showCbs.add(cb),
      offShow: (cb) => showCbs.delete(cb),
      onHide: (cb) => hideCbs.add(cb),
      offHide: (cb) => hideCbs.delete(cb),
      setKeepScreenOn: (opts) => invoke('setKeepScreenOn', opts, () => ({})),
      triggerGC() {
        record('wx.triggerGC', {});
      },

      /* --- storage --- */
      setStorageSync(key, data) {
        record('wx.setStorageSync', { key });
        storage.set(key, data);
      },
      getStorageSync(key) {
        return storage.get(key);
      },
      removeStorageSync(key) {
        storage.remove(key);
      },
      clearStorageSync() {
        storage.clear();
      },
      getStorageInfoSync() {
        const keys = storage.keys();
        return { keys, currentSize: keys.length, limitSize: 10240 };
      },
      setStorage: (opts) => invoke('setStorage', opts, () => { storage.set(opts.key, opts.data); return {}; }),
      getStorage: (opts) => invoke('getStorage', opts, () => ({ data: storage.get(opts.key) })),
      removeStorage: (opts) => invoke('removeStorage', opts, () => { storage.remove(opts.key); return {}; }),

      /* --- feedback --- */
      vibrateShort: (opts) =>
        invoke('vibrateShort', opts, () => {
          emitter.emit('vibrate', { long: false, type: (opts && opts.type) || 'medium' });
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
          return {};
        }),
      vibrateLong: (opts) =>
        invoke('vibrateLong', opts, () => {
          emitter.emit('vibrate', { long: true });
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
          return {};
        }),
      showToast: (opts) =>
        invoke('showToast', opts, () => {
          emitter.emit('toast', Object.assign({ title: '', icon: 'success', duration: 1500 }, sanitize(opts)));
          return {};
        }),
      hideToast: (opts) => invoke('hideToast', opts, () => ({})),
      showLoading: (opts) =>
        invoke('showLoading', opts, () => {
          emitter.emit('loading', { show: true, title: (opts && opts.title) || '' });
          return {};
        }),
      hideLoading: (opts) =>
        invoke('hideLoading', opts, () => {
          emitter.emit('loading', { show: false });
          return {};
        }),
      showModal: (opts) =>
        invoke('showModal', opts, () => {
          emitter.emit('modal', sanitize(opts));
          return { confirm: true, cancel: false, content: null };
        }),

      /* --- payment --- */
      requestMidasPayment: (opts) =>
        invoke('requestMidasPayment', opts, () => {
          if (detectPlatform() === 'ios') {
            // 苹果分成政策：iOS 端小游戏无法内购，这是复刻 IAP 玩法的硬门槛
            throw failure('requestMidasPayment', 'iOS 平台不支持虚拟支付', -1);
          }
          emitter.emit('payment', sanitize(opts));
          return {};
        }),
    };

    /* ---- control surface -------------------------------------------- */

    const shim = {
      VERSION,
      wx: wxMock,
      isMock: true,
      config,
      log,
      friends,
      SCENE,
      AD_ERRORS,

      on: (type, fn) => emitter.on(type, fn),
      once: (type, fn) => emitter.once(type, fn),
      off: (type, fn) => emitter.off(type, fn),
      emit: (type, payload) => emitter.emit(type, payload),

      /** Log entries for one API, e.g. `shim.calls('wx.shareAppMessage').length`. */
      calls(api) {
        return api ? log.filter((e) => e.api === api) : log.slice();
      },

      /** The ad currently on screen, or null. */
      get currentAd() {
        return showing;
      },
      /** Finish the visible ad as watched-to-the-end (grants the reward). */
      completeAd() {
        return showing ? showing.complete() : false;
      },
      /** Close the visible ad early — `onClose` reports `isEnded:false`. */
      skipAd() {
        return showing ? showing.skip() : false;
      },
      /** Blow up the visible ad with a real WeChat ad error code. */
      failAd(code) {
        return showing ? showing.fail(code) : false;
      },

      /** Simulate a friend opening the shared card. */
      acceptShare,
      /** Fire the handler registered with `wx.onShareAppMessage` (右上角转发). */
      tapSystemShare() {
        const cfg = systemShareProvider ? systemShareProvider({ from: 'menu' }) || {} : {};
        return shareAppMessage(cfg);
      },
      get lastShare() {
        return lastShare;
      },

      /** Run `fn` as if it were the 开放数据域 sub-context. */
      enterOpenDataContext(fn) {
        const prev = inOpenDataContext;
        inOpenDataContext = true;
        try {
          return fn();
        } finally {
          inOpenDataContext = prev;
        }
      },

      /** Sorted view of `key` across self + friends. See README for the caveat. */
      leaderboard,
      /** Read what the game wrote for itself, without a callback round-trip. */
      selfCloudData(key) {
        return kvFor(config.self.openid).get(key);
      },
      /** Seed friend scores before the game writes anything. */
      seedFriendData(key, values) {
        values.forEach((v, i) => {
          if (friends[i]) kvFor(friends[i].openid).set(key, String(v));
        });
      },

      simulateShow,
      simulateHide() {
        const payload = {};
        emitter.emit('hide', payload);
        hideCbs.forEach((cb) => cb(payload));
        return payload;
      },

      /** Back to a fresh mock, same seed. */
      reset() {
        log.length = 0;
        cloud.clear();
        adCache.clear();
        showing = null;
        lastShare = null;
        storage.clear();
        rng = mulberry32(config.seed);
        seq = 0;
        buildFriends();
        shim.friends = friends;
        return shim;
      },
    };

    return shim;
  }

  /**
   * Create a shim and publish it as `globalThis.wx`, so prototypes can call the
   * platform API by its real name. A genuine WeChat host is left untouched and
   * `shim.isMock` comes back false.
   */
  function installWxShim(options) {
    const shim = createWxShim(options);
    if (isRealWx()) {
      shim.isMock = false;
      shim.wx = globalWx();
      return shim;
    }
    if (typeof globalThis !== 'undefined') globalThis.wx = shim.wx;
    return shim;
  }

  /**
   * The mocked surface, with how faithful each entry is. `stub` means the call
   * exists and is logged but does nothing a game could observe; `partial` means
   * the shape is right and some platform-enforced behaviour is missing.
   */
  const SURFACE = [
    { api: 'wx.createRewardedVideoAd', group: 'ads', fidelity: 'high', note: 'singleton per adUnitId, load/show/onClose({isEnded}), 1004 no-fill, auto reload after close' },
    { api: 'wx.createInterstitialAd', group: 'ads', fidelity: 'high', note: 'same lifecycle, onClose carries no reward flag' },
    { api: 'wx.createBannerAd', group: 'ads', fidelity: 'partial', note: 'style/show/hide/onResize modelled; no real layout box' },
    { api: 'wx.shareAppMessage', group: 'share', fidelity: 'partial', note: 'faithfully callback-less; the mock adds a simulated share:success the platform never gives you' },
    { api: 'wx.onShareAppMessage', group: 'share', fidelity: 'high', note: 'provider callback, driven by shim.tapSystemShare()' },
    { api: 'wx.showShareMenu / hideShareMenu / updateShareMenu', group: 'share', fidelity: 'stub', note: 'logged only — no chat UI off-platform' },
    { api: 'wx.getShareInfo', group: 'share', fidelity: 'stub', note: 'returns fake encryptedData; needs a server to decrypt for real' },
    { api: 'wx.setUserCloudStorage', group: 'cloud', fidelity: 'high', note: 'enforces string KV, 1KB value cap, 128-entry list cap' },
    { api: 'wx.getUserCloudStorage', group: 'cloud', fidelity: 'high', note: 'reads back what the game wrote' },
    { api: 'wx.removeUserCloudStorage', group: 'cloud', fidelity: 'high', note: '' },
    { api: 'wx.getFriendCloudStorage', group: 'cloud', fidelity: 'partial', note: 'seeded fake friends that imitate the value shape; open-data-context restriction only under strictOpenDataContext' },
    { api: 'wx.getGroupCloudStorage', group: 'cloud', fidelity: 'partial', note: 'subset of the friend list; no shareTicket validation' },
    { api: 'wx.getOpenDataContext', group: 'cloud', fidelity: 'stub', note: 'postMessage is observable as an event; canvas is null — there is no second JS context off-platform' },
    { api: 'wx.getSharedCanvas', group: 'cloud', fidelity: 'stub', note: 'returns null; the shared sub-canvas cannot be reproduced' },
    { api: 'wx.login', group: 'auth', fidelity: 'partial', note: 'returns a fake js_code; exchanging it for a session needs code2Session on a server' },
    { api: 'wx.checkSession', group: 'auth', fidelity: 'stub', note: 'always valid' },
    { api: 'wx.getSetting', group: 'auth', fidelity: 'stub', note: 'always authorised' },
    { api: 'wx.getUserInfo', group: 'auth', fidelity: 'partial', note: 'nickname/avatar without encryptedData semantics' },
    { api: 'wx.createUserInfoButton', group: 'auth', fidelity: 'partial', note: 'object shape + __tap() for tests; no native button' },
    { api: 'wx.getSystemInfoSync', group: 'system', fidelity: 'high', note: 'derived from the real window, incl. safeArea/pixelRatio/benchmarkLevel' },
    { api: 'wx.getSystemInfo / getWindowInfo / getDeviceInfo / getAppBaseInfo', group: 'system', fidelity: 'high', note: 'the split successors of getSystemInfo' },
    { api: 'wx.getLaunchOptionsSync / getEnterOptionsSync', group: 'system', fidelity: 'partial', note: 'scene codes are settable via shim.simulateShow()' },
    { api: 'wx.onShow / onHide', group: 'system', fidelity: 'high', note: 'driven by share returns and shim.simulateShow/Hide()' },
    { api: 'wx.setStorage* / getStorage* / removeStorage* / clearStorageSync', group: 'storage', fidelity: 'high', note: 'localStorage-backed in a browser, in-memory in Node' },
    { api: 'wx.vibrateShort / vibrateLong', group: 'feedback', fidelity: 'high', note: 'maps to navigator.vibrate when present' },
    { api: 'wx.showToast / hideToast / showLoading / hideLoading / showModal', group: 'feedback', fidelity: 'partial', note: 'emitted as events for the host to render; showModal always confirms' },
    { api: 'wx.setKeepScreenOn / triggerGC', group: 'system', fidelity: 'stub', note: 'logged only' },
    { api: 'wx.requestMidasPayment', group: 'payment', fidelity: 'partial', note: 'fails with errCode -1 on iOS, mirroring the App Store block on 虚拟支付' },
  ];

  /** Every event a host can subscribe to with `shim.on(...)`. */
  const EVENTS = [
    'ad:load', 'ad:show', 'ad:close', 'ad:complete', 'ad:skip', 'ad:error',
    'banner:show', 'banner:hide', 'banner:destroy',
    'share', 'share:success',
    'cloud:set', 'cloud:friends', 'opendata:message',
    'show', 'hide', 'vibrate', 'toast', 'loading', 'modal', 'payment',
    'call', '*',
  ];

  return {
    VERSION,
    MOCK_FLAG,
    AD_ERRORS,
    SCENE,
    SURFACE,
    EVENTS,
    createWxShim,
    installWxShim,
    isRealWx,
    mulberry32,
  };
});
