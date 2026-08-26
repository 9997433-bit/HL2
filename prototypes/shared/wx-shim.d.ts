/**
 * Type declarations for wx-shim, the mock of the 微信小游戏 `wx.*` platform APIs.
 *
 * The `WxMock` interface below is deliberately a subset of the real `wx`
 * namespace: it declares exactly what the shim implements, so a prototype that
 * type-checks against it is a prototype that will keep working when the mock is
 * swapped for the real WeChat host (Cocos Creator / minigame TS projects can
 * point at the official `minigame-api-typings` instead and nothing changes).
 */

export declare const VERSION: string;
export declare const MOCK_FLAG: '__wxShimMock';

/* ------------------------------------------------------------------ */
/* Ads                                                                 */
/* ------------------------------------------------------------------ */

export interface AdError {
  errCode: number;
  errMsg: string;
}

export interface RewardedVideoAd {
  readonly adUnitId: string;
  /** Mock-only: 'idle' | 'loading' | 'loaded' | 'showing'. */
  readonly __state: string;
  load(): Promise<void>;
  /** Rejects when no creative is loaded — retry with `load().then(show)`. */
  show(): Promise<void>;
  destroy(): void;
  onLoad(cb: () => void): void;
  offLoad(cb: () => void): void;
  onError(cb: (err: AdError) => void): void;
  offError(cb: (err: AdError) => void): void;
  /** `isEnded` is false when the viewer bailed out: no reward. */
  onClose(cb: (res: { isEnded: boolean }) => void): void;
  offClose(cb: (res: { isEnded: boolean }) => void): void;
}

export interface InterstitialAd extends Omit<RewardedVideoAd, 'onClose' | 'offClose'> {
  onClose(cb: () => void): void;
  offClose(cb: () => void): void;
}

export interface BannerAdStyle {
  left: number;
  top: number;
  width: number;
  height: number;
  realWidth: number;
  realHeight: number;
}

export interface BannerAd {
  readonly adUnitId: string;
  style: BannerAdStyle;
  readonly __visible: boolean;
  show(): Promise<void>;
  hide(): Promise<void>;
  destroy(): void;
  onResize(cb: (size: { width: number; height: number }) => void): void;
  offResize(cb: (size: { width: number; height: number }) => void): void;
  onLoad(cb: () => void): void;
  offLoad(cb: () => void): void;
  onError(cb: (err: AdError) => void): void;
  offError(cb: (err: AdError) => void): void;
}

/** What `shim.on('ad:show')` hands you, and how to end the fake video. */
export interface AdSession {
  kind: 'rewarded' | 'interstitial';
  adUnitId: string;
  startedAt: number;
  durationMs: number;
  /** Watched to the end: `onClose({isEnded:true})`. */
  complete(): boolean;
  /** Closed early: `onClose({isEnded:false})`. */
  skip(): boolean;
  /** Abort with a WeChat ad error code (1000–1008). */
  fail(errCode?: number): boolean;
}

/* ------------------------------------------------------------------ */
/* Cloud storage                                                       */
/* ------------------------------------------------------------------ */

export interface KVData {
  key: string;
  value: string;
}

export interface FriendCloudRecord {
  avatarUrl: string;
  nickname: string;
  openid: string;
  KVDataList: KVData[];
}

export interface LeaderboardRow {
  openid: string;
  nickname: string;
  avatarUrl: string;
  isSelf: boolean;
  /** Raw cloud value, exactly as stored. */
  value: string;
  /** Numeric reading of `value`, including the `{"wxgame":{"score":n}}` shape. */
  score: number;
  rank: number;
}

/* ------------------------------------------------------------------ */
/* Callback-style options                                              */
/* ------------------------------------------------------------------ */

export interface CallbackOptions<T = Record<string, unknown>> {
  success?: (res: T & { errMsg: string }) => void;
  fail?: (err: { errMsg: string; errCode?: number }) => void;
  complete?: (res: { errMsg: string }) => void;
}

export interface SystemInfo {
  SDKVersion: string;
  brand: string;
  model: string;
  system: string;
  platform: 'ios' | 'android' | 'devtools' | string;
  language: string;
  version: string;
  pixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  statusBarHeight: number;
  safeArea: { top: number; left: number; right: number; bottom: number; width: number; height: number };
  benchmarkLevel: number;
  fontSizeSetting: number;
  deviceOrientation: string;
  theme: string;
}

export interface LaunchOptions {
  scene: number;
  query: Record<string, string>;
  shareTicket?: string;
  referrerInfo: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* The mocked wx namespace                                             */
/* ------------------------------------------------------------------ */

export interface WxMock {
  readonly __wxShimMock: true;
  readonly __shimVersion: string;

  createRewardedVideoAd(opts?: { adUnitId?: string; multiton?: boolean }): RewardedVideoAd;
  createInterstitialAd(opts?: { adUnitId?: string; multiton?: boolean }): InterstitialAd;
  createBannerAd(opts?: { adUnitId?: string; style?: Partial<BannerAdStyle>; adIntervals?: number }): BannerAd;

  /** Fire-and-forget, exactly like the platform: there is no success callback. */
  shareAppMessage(opts?: { title?: string; imageUrl?: string; query?: string; imageUrlId?: string }): void;
  onShareAppMessage(cb: (res: { from: string }) => { title?: string; imageUrl?: string; query?: string } | void): void;
  offShareAppMessage(): void;
  showShareMenu(opts?: CallbackOptions & { withShareTicket?: boolean; menus?: string[] }): Promise<unknown> | null;
  hideShareMenu(opts?: CallbackOptions): Promise<unknown> | null;
  updateShareMenu(opts?: CallbackOptions & { withShareTicket?: boolean }): Promise<unknown> | null;
  getShareInfo(opts?: CallbackOptions<{ encryptedData: string; iv: string; cloudID: string }> & { shareTicket?: string }): Promise<unknown> | null;

  setUserCloudStorage(opts?: CallbackOptions & { KVDataList: KVData[] }): Promise<unknown> | null;
  getUserCloudStorage(opts?: CallbackOptions<{ KVDataList: KVData[] }> & { keyList?: string[] }): Promise<unknown> | null;
  removeUserCloudStorage(opts?: CallbackOptions & { keyList: string[] }): Promise<unknown> | null;
  getFriendCloudStorage(opts?: CallbackOptions<{ data: FriendCloudRecord[] }> & { keyList: string[] }): Promise<unknown> | null;
  getGroupCloudStorage(opts?: CallbackOptions<{ data: FriendCloudRecord[] }> & { shareTicket?: string; keyList: string[] }): Promise<unknown> | null;
  getOpenDataContext(): { canvas: null; postMessage(message: unknown): void };
  getSharedCanvas(): null;

  login(opts?: CallbackOptions<{ code: string }>): Promise<unknown> | null;
  checkSession(opts?: CallbackOptions): Promise<unknown> | null;
  getSetting(opts?: CallbackOptions<{ authSetting: Record<string, boolean> }>): Promise<unknown> | null;
  getUserInfo(opts?: CallbackOptions<{ data: unknown[]; userInfo: unknown }> & { openIdList?: string[] }): Promise<unknown> | null;
  createUserInfoButton(opts?: Record<string, unknown>): {
    show(): void;
    hide(): void;
    destroy(): void;
    onTap(cb: (res: unknown) => void): void;
    offTap(cb: (res: unknown) => void): void;
    /** Mock-only: press the button from a test. */
    __tap(): void;
  };

  getSystemInfoSync(): SystemInfo;
  getSystemInfo(opts?: CallbackOptions<SystemInfo>): Promise<unknown> | null;
  getWindowInfo(): Pick<SystemInfo, 'pixelRatio' | 'screenWidth' | 'screenHeight' | 'windowWidth' | 'windowHeight' | 'statusBarHeight' | 'safeArea'>;
  getDeviceInfo(): Pick<SystemInfo, 'brand' | 'model' | 'system' | 'platform' | 'benchmarkLevel'>;
  getAppBaseInfo(): Pick<SystemInfo, 'SDKVersion' | 'version' | 'language' | 'theme'>;
  getLaunchOptionsSync(): LaunchOptions;
  getEnterOptionsSync(): LaunchOptions;
  onShow(cb: (res: LaunchOptions) => void): void;
  offShow(cb: (res: LaunchOptions) => void): void;
  onHide(cb: () => void): void;
  offHide(cb: () => void): void;
  setKeepScreenOn(opts?: CallbackOptions & { keepScreenOn: boolean }): Promise<unknown> | null;
  triggerGC(): void;

  setStorageSync(key: string, data: unknown): void;
  getStorageSync(key: string): unknown;
  removeStorageSync(key: string): void;
  clearStorageSync(): void;
  getStorageInfoSync(): { keys: string[]; currentSize: number; limitSize: number };
  setStorage(opts: CallbackOptions & { key: string; data: unknown }): Promise<unknown> | null;
  getStorage(opts: CallbackOptions<{ data: unknown }> & { key: string }): Promise<unknown> | null;
  removeStorage(opts: CallbackOptions & { key: string }): Promise<unknown> | null;

  vibrateShort(opts?: CallbackOptions & { type?: 'heavy' | 'medium' | 'light' }): Promise<unknown> | null;
  vibrateLong(opts?: CallbackOptions): Promise<unknown> | null;
  showToast(opts?: CallbackOptions & { title?: string; icon?: string; duration?: number }): Promise<unknown> | null;
  hideToast(opts?: CallbackOptions): Promise<unknown> | null;
  showLoading(opts?: CallbackOptions & { title?: string }): Promise<unknown> | null;
  hideLoading(opts?: CallbackOptions): Promise<unknown> | null;
  showModal(opts?: CallbackOptions<{ confirm: boolean; cancel: boolean }> & { title?: string; content?: string }): Promise<unknown> | null;

  /** Fails with errCode -1 on iOS, mirroring the App Store block on 虚拟支付. */
  requestMidasPayment(opts?: CallbackOptions & { mode?: string; buyQuantity?: number }): Promise<unknown> | null;
}

/* ------------------------------------------------------------------ */
/* Shim control surface                                                */
/* ------------------------------------------------------------------ */

export type WxShimEvent =
  | 'ad:load' | 'ad:show' | 'ad:close' | 'ad:complete' | 'ad:skip' | 'ad:error'
  | 'banner:show' | 'banner:hide' | 'banner:destroy'
  | 'share' | 'share:success'
  | 'cloud:set' | 'cloud:friends' | 'opendata:message'
  | 'show' | 'hide' | 'vibrate' | 'toast' | 'loading' | 'modal' | 'payment'
  | 'call' | '*';

export interface WxShimUser {
  openid: string;
  nickname: string;
  avatarUrl: string;
}

export interface WxShimConfig {
  /** Seeds every random decision: friend scores, ad fill, share returns. */
  seed: number;
  /** Simulated round-trip for async APIs. 0 keeps callbacks synchronous. */
  latencyMs: number;
  /** 'auto' closes the ad by itself, 'manual' waits for `complete()`/`skip()`. */
  adBehavior: 'auto' | 'manual';
  adDurationMs: number;
  /** Below 1, `load()` starts failing with errCode 1004 (无适合的广告). */
  adFillRate: number;
  /** 'auto' mode only: chance the viewer bails out before the reward. */
  adSkipRate: number;
  shareBehavior: 'auto' | 'manual' | 'none';
  shareReturnMs: number;
  friendCount: number;
  friendNames: string[];
  /** Enforce that friend data is only readable inside the 开放数据域. */
  strictOpenDataContext: boolean;
  persistStorage: boolean;
  platform: 'ios' | 'android' | 'devtools' | null;
  self: WxShimUser;
  systemInfo: Partial<SystemInfo> | null;
  logLimit: number;
  verbose: boolean;
}

export interface WxShimCall {
  api: string;
  args: unknown;
  at: number;
}

export interface WxShim {
  readonly VERSION: string;
  /** The namespace `installWxShim` publishes as `globalThis.wx`. */
  wx: WxMock;
  /** False when a real WeChat host was found and the shim stepped aside. */
  isMock: boolean;
  config: WxShimConfig;
  log: WxShimCall[];
  friends: WxShimUser[];

  on(event: 'ad:show', cb: (session: AdSession) => void): () => void;
  on(event: WxShimEvent, cb: (payload: any, type: string) => void): () => void;
  once(event: WxShimEvent, cb: (payload: any, type: string) => void): () => void;
  off(event: WxShimEvent, cb: (payload: any, type: string) => void): void;
  emit(event: string, payload?: unknown): unknown;

  calls(api?: string): WxShimCall[];

  readonly currentAd: AdSession | null;
  completeAd(): boolean;
  skipAd(): boolean;
  failAd(errCode?: number): boolean;

  acceptShare(info?: { shareTicket?: string; scene?: number }): {
    shareTicket: string;
    scene: number;
    from: WxShimUser | null;
    simulated: true;
  };
  tapSystemShare(): void;
  readonly lastShare: { title: string; imageUrl: string; query: string; shareTicket: string; at: number; simulated: true } | null;

  enterOpenDataContext<T>(fn: () => T): T;
  leaderboard(key: string): LeaderboardRow[];
  selfCloudData(key: string): string | undefined;
  seedFriendData(key: string, values: Array<string | number>): void;

  simulateShow(opts?: Partial<LaunchOptions>): LaunchOptions;
  simulateHide(): Record<string, never>;
  reset(): WxShim;
}

export interface SurfaceEntry {
  api: string;
  group: 'ads' | 'share' | 'cloud' | 'auth' | 'system' | 'storage' | 'feedback' | 'payment';
  fidelity: 'high' | 'partial' | 'stub';
  note: string;
}

export declare const AD_ERRORS: Record<number, string>;
export declare const SCENE: Record<string, number>;
export declare const SURFACE: SurfaceEntry[];
export declare const EVENTS: WxShimEvent[];

export declare function createWxShim(options?: Partial<WxShimConfig>): WxShim;
/** Creates a shim and publishes it as `globalThis.wx`, unless a real one exists. */
export declare function installWxShim(options?: Partial<WxShimConfig>): WxShim;
/** True only inside a genuine WeChat host. */
export declare function isRealWx(): boolean;
export declare function mulberry32(seed: number): () => number;

declare const _default: {
  VERSION: string;
  MOCK_FLAG: string;
  AD_ERRORS: Record<number, string>;
  SCENE: Record<string, number>;
  SURFACE: SurfaceEntry[];
  EVENTS: WxShimEvent[];
  createWxShim: typeof createWxShim;
  installWxShim: typeof installWxShim;
  isRealWx: typeof isRealWx;
  mulberry32: typeof mulberry32;
};
export default _default;

declare global {
  // eslint-disable-next-line no-var
  var WxShim: typeof _default;
  // eslint-disable-next-line no-var
  var wx: WxMock;
}
