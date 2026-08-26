/**
 * Headless checks for the platform mock.
 *
 *   node --test prototypes/shared/wx-shim.test.mjs
 *
 * These cover the behaviours a prototype makes decisions on: whether a reward
 * was earned, whether an ad was even available, what the friend board comes
 * back with, and which calls fail the way the real platform fails them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createWxShim, installWxShim, isRealWx, SURFACE, MOCK_FLAG } from './wx-shim.mjs';

/* ------------------------------------------------------------------ */
/* Rewarded video                                                      */
/* ------------------------------------------------------------------ */

test('a rewarded ad is a singleton per ad unit and pre-loads itself', () => {
  const shim = createWxShim();
  const a = shim.wx.createRewardedVideoAd({ adUnitId: 'adunit-x' });
  const b = shim.wx.createRewardedVideoAd({ adUnitId: 'adunit-x' });
  const c = shim.wx.createRewardedVideoAd({ adUnitId: 'adunit-x', multiton: true });

  assert.equal(a, b, 'the same ad unit must hand back the same instance');
  assert.notEqual(a, c, 'multiton:true opts out');
  assert.equal(a.__state, 'loaded');
});

test('watching to the end grants the reward, closing early does not', async () => {
  const shim = createWxShim({ adBehavior: 'manual' });
  const ad = shim.wx.createRewardedVideoAd({ adUnitId: 'adunit-prop' });
  const closes = [];
  ad.onClose((res) => closes.push(res.isEnded));

  await ad.show();
  assert.ok(shim.currentAd, 'the ad stays on screen until the host closes it');
  shim.completeAd();

  await ad.show();
  shim.skipAd();

  assert.deepEqual(closes, [true, false]);
  assert.equal(shim.currentAd, null);
});

test('auto mode closes the ad by itself, with a configurable skip rate', async () => {
  const watched = createWxShim({ adBehavior: 'auto' });
  let ended = null;
  const a = watched.wx.createRewardedVideoAd({ adUnitId: 'adunit-a' });
  a.onClose((res) => { ended = res.isEnded; });
  await a.show();
  assert.equal(ended, true);

  const bailed = createWxShim({ adBehavior: 'auto', adSkipRate: 1 });
  const b = bailed.wx.createRewardedVideoAd({ adUnitId: 'adunit-b' });
  b.onClose((res) => { ended = res.isEnded; });
  await b.show();
  assert.equal(ended, false, 'adSkipRate:1 must model the viewer bailing out');
});

test('no fill surfaces as errCode 1004 and show() refuses', async () => {
  const shim = createWxShim({ adFillRate: 0 });
  const errors = [];
  const ad = shim.wx.createRewardedVideoAd({ adUnitId: 'adunit-empty' });
  ad.onError((err) => errors.push(err.errCode));

  await assert.rejects(() => ad.load(), (err) => err.errCode === 1004);
  await assert.rejects(() => ad.show(), (err) => err.errMsg.includes('not loaded'));
  assert.ok(errors.length >= 1);
  assert.equal(errors[0], 1004);
});

test('a rewarded ad reloads itself after closing, like the real component', async () => {
  const shim = createWxShim({ adBehavior: 'manual' });
  const ad = shim.wx.createRewardedVideoAd({ adUnitId: 'adunit-reload' });
  await ad.show();
  shim.completeAd();
  assert.equal(ad.__state, 'loaded', 'the next creative must already be waiting');
});

/* ------------------------------------------------------------------ */
/* Share                                                               */
/* ------------------------------------------------------------------ */

test('shareAppMessage returns nothing, and the return trip is what a game hears', () => {
  const shim = createWxShim({ shareBehavior: 'auto' });
  const shares = [];
  const returns = [];
  const shows = [];
  shim.on('share', (p) => shares.push(p));
  shim.on('share:success', (p) => returns.push(p));
  shim.wx.onShow((res) => shows.push(res));

  const result = shim.wx.shareAppMessage({ title: '帮我复活', query: 'from=revive' });

  assert.equal(result, undefined, 'the real API has no return value and no callback');
  assert.equal(shares.length, 1);
  assert.equal(returns.length, 1);
  assert.equal(returns[0].simulated, true, 'the platform never actually tells you this');
  assert.equal(shows[0].scene, 1044, 'a friend opening the card re-enters with a shareTicket');
  assert.equal(shows[0].shareTicket, shares[0].shareTicket);
});

test('shareBehavior:manual leaves the return trip to the test', () => {
  const shim = createWxShim({ shareBehavior: 'manual' });
  const returns = [];
  shim.on('share:success', (p) => returns.push(p));

  shim.wx.shareAppMessage({ title: 'x' });
  assert.equal(returns.length, 0);

  shim.acceptShare();
  assert.equal(returns.length, 1);
  assert.ok(returns[0].from.nickname, 'the mock names the friend who opened it');
});

test('the 右上角转发 menu asks the game for its share config', () => {
  const shim = createWxShim({ shareBehavior: 'none' });
  shim.wx.onShareAppMessage(() => ({ title: '从菜单分享' }));
  shim.tapSystemShare();
  assert.equal(shim.lastShare.title, '从菜单分享');
});

/* ------------------------------------------------------------------ */
/* Cloud storage / friend leaderboard                                  */
/* ------------------------------------------------------------------ */

test('user cloud storage round-trips and enforces the platform limits', () => {
  const shim = createWxShim();
  const errors = [];

  shim.wx.setUserCloudStorage({ KVDataList: [{ key: 'score', value: '120' }] });
  shim.wx.getUserCloudStorage({
    keyList: ['score'],
    success: (res) => assert.deepEqual(res.KVDataList, [{ key: 'score', value: '120' }]),
  });

  shim.wx.setUserCloudStorage({
    KVDataList: [{ key: 'score', value: 120 }],
    fail: (err) => errors.push(err.errMsg),
  });
  shim.wx.setUserCloudStorage({
    KVDataList: [{ key: 'blob', value: 'x'.repeat(1025) }],
    fail: (err) => errors.push(err.errMsg),
  });

  assert.equal(errors.length, 2, 'non-string values and >1KB values must be rejected');
  assert.ok(errors[1].includes('1KB'));
});

test('friend data imitates the shape the game stored', () => {
  const shim = createWxShim({ friendCount: 5 });
  shim.wx.setUserCloudStorage({
    KVDataList: [{ key: 'score', value: JSON.stringify({ wxgame: { score: 800, update_time: 1 } }) }],
  });

  let rows = null;
  shim.wx.getFriendCloudStorage({ keyList: ['score'], success: (res) => { rows = res.data; } });

  assert.equal(rows.length, 6, 'self plus five friends');
  for (const row of rows) {
    const parsed = JSON.parse(row.KVDataList[0].value);
    assert.equal(typeof parsed.wxgame.score, 'number');
  }
  const board = shim.leaderboard('score');
  assert.equal(board[0].rank, 1);
  assert.ok(board[0].score >= board[board.length - 1].score, 'leaderboard comes back sorted');
  assert.equal(board.filter((r) => r.isSelf).length, 1);
});

test('strict mode reproduces the 开放数据域 restriction', () => {
  const shim = createWxShim({ strictOpenDataContext: true });
  let failed = null;
  shim.wx.getFriendCloudStorage({ keyList: ['score'], fail: (err) => { failed = err; } });
  assert.ok(failed, 'the main context cannot read friend data on a real device');

  let ok = null;
  shim.enterOpenDataContext(() => {
    shim.wx.getFriendCloudStorage({ keyList: ['score'], success: (res) => { ok = res.data; } });
  });
  assert.ok(ok.length > 0);
});

test('seeded friends are reproducible across shims', () => {
  const board = (seed) => {
    const shim = createWxShim({ seed });
    shim.wx.setUserCloudStorage({ KVDataList: [{ key: 'score', value: '500' }] });
    return shim.leaderboard('score').map((r) => `${r.nickname}:${r.score}`);
  };
  assert.deepEqual(board(7), board(7));
  assert.notDeepEqual(board(7), board(8));
});

/* ------------------------------------------------------------------ */
/* Login, system, storage, payment                                     */
/* ------------------------------------------------------------------ */

test('login hands back a code, and callbacks and promises both work', async () => {
  const shim = createWxShim();
  let viaCallback = null;
  shim.wx.login({ success: (res) => { viaCallback = res.code; } });
  assert.match(viaCallback, /^mock-js-code-/);

  const viaPromise = await shim.wx.login();
  assert.match(viaPromise.code, /^mock-js-code-/);
  assert.equal(viaPromise.errMsg, 'login:ok');
});

test('system info carries the fields a canvas layout actually reads', () => {
  const shim = createWxShim({ platform: 'ios', systemInfo: { windowWidth: 390, windowHeight: 844 } });
  const info = shim.wx.getSystemInfoSync();
  assert.equal(info.platform, 'ios');
  assert.equal(info.windowWidth, 390);
  assert.ok(info.pixelRatio > 0);
  assert.ok(info.safeArea.bottom < info.windowHeight, 'home indicator eats the bottom');
  assert.ok(info.SDKVersion);
  assert.equal(shim.wx.getWindowInfo().safeArea.top, info.safeArea.top);
});

test('storage works without a browser', () => {
  const shim = createWxShim();
  shim.wx.setStorageSync('progress', { level: 3 });
  assert.deepEqual(shim.wx.getStorageSync('progress'), { level: 3 });
  assert.ok(shim.wx.getStorageInfoSync().keys.includes('progress'));
  shim.wx.removeStorageSync('progress');
  assert.equal(shim.wx.getStorageSync('progress'), '');
});

test('iOS blocks 虚拟支付, and the mock blocks it too', () => {
  const ios = createWxShim({ platform: 'ios' });
  let err = null;
  ios.wx.requestMidasPayment({ mode: 'game', buyQuantity: 10, fail: (e) => { err = e; } });
  assert.equal(err.errCode, -1);

  const android = createWxShim({ platform: 'android' });
  let ok = null;
  android.wx.requestMidasPayment({ mode: 'game', success: (res) => { ok = res; } });
  assert.ok(ok);
});

/* ------------------------------------------------------------------ */
/* Install semantics and bookkeeping                                   */
/* ------------------------------------------------------------------ */

test('installWxShim publishes globalThis.wx and admits it is a mock', () => {
  const shim = installWxShim({ seed: 1 });
  try {
    assert.equal(globalThis.wx, shim.wx);
    assert.equal(shim.isMock, true);
    assert.equal(shim.wx[MOCK_FLAG], true);
    assert.equal(isRealWx(), false, 'the shim must never pass itself off as WeChat');
  } finally {
    delete globalThis.wx;
  }
});

test('every call is logged, and reset clears the world without changing the seed', () => {
  const shim = createWxShim();
  shim.wx.shareAppMessage({ title: 'a' });
  shim.wx.shareAppMessage({ title: 'b' });
  shim.wx.setUserCloudStorage({ KVDataList: [{ key: 'score', value: '1' }] });

  assert.equal(shim.calls('wx.shareAppMessage').length, 2);
  assert.ok(shim.calls().length >= 3);

  shim.reset();
  assert.equal(shim.calls().length, 0);
  assert.equal(shim.selfCloudData('score'), undefined);
});

test('the published surface stays in step with the implementation', () => {
  const shim = createWxShim();
  const missing = SURFACE.flatMap((entry) => entry.api.split(' / '))
    .map((api) => api.trim().replace(/^wx\./, ''))
    .map((name) => (name.endsWith('*') ? name.slice(0, -1) : name))
    .filter((name) => {
      const keys = Object.keys(shim.wx);
      return !keys.some((k) => k === name || k.startsWith(name));
    });
  assert.deepEqual(missing, [], 'SURFACE documents an API the shim does not implement');
});
