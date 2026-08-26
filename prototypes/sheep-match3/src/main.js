/**
 * Host shell: wires the pure core to a canvas, pointer input, a game loop and
 * the WeChat platform loop.
 *
 * The only platform-specific parts are `resolveCanvas` and `bindInput`; porting
 * to a WeChat mini game means swapping those two for `wx.createCanvas()` and
 * `wx.onTouchStart`, and nothing in core.js or render.js changes. Every `wx.*`
 * call goes through `prototypes/shared/wx-shim.js`, which mocks the platform
 * off-device and stands aside on a real one — so `isRealWx()`, rather than the
 * presence of a `wx` global, is what picks the host adapter.
 */

import {
  LEVELS,
  createGame,
  hint,
  pick,
  removeProp,
  shuffleProp,
  undo,
} from './core.js';
import { DESIGN, createRenderer } from './render.js';
import { installWxShim, isRealWx } from '../../shared/wx-shim.mjs';

const TWEEN_MS = 200;
const HINT_MS = 1600;

/* Ads run in 'auto' mode here: the shim plays and closes the fake creative by
   itself and this shell only paints a caption, which is roughly what a WeChat
   build gets for free from the SDK's own full-screen overlay. */
const shim = installWxShim({
  adBehavior: 'auto',
  adDurationMs: 1500,
  shareBehavior: 'auto',
  shareReturnMs: 1200,
  seed: 424242,
});

const AD_UNIT = 'adunit-sheepmatch3-prop-71b2';
const CLOUD_KEY = 'score';

function resolveCanvas() {
  if (isRealWx() && wx.createCanvas) return wx.createCanvas();
  return document.getElementById('game');
}

/** `?level=1&seed=42&autoplay=300` drives the prototype for demos and QA. */
function debugParams() {
  if (typeof location === 'undefined') return {};
  const q = new URLSearchParams(location.search);
  const num = (k) => (q.has(k) ? Number(q.get(k)) : undefined);
  return { level: num('level'), seed: num('seed'), autoplay: num('autoplay') };
}

const params = debugParams();
const canvas = resolveCanvas();
const renderer = createRenderer(canvas);

let game = createGame(params.level ?? 0, params.seed ?? ((Math.random() * 1e9) | 0));
let tweens = [];
let shake = null;
let hintUntil = 0;
let hintId = null;
let lastStatus = 'playing';

/**
 * A prop the player has run out of is not gone, it is for sale: watching a
 * rewarded video puts one back. This is the genre's entire IAA loop, and it is
 * why the two spent props stay tappable instead of greying out.
 */
function spendOrWatch(key, reason, run) {
  if (game.props[key] > 0) return run();
  watchAd(reason, () => {
    game.props[key]++;
    run();
  });
  return true;
}

const BUTTONS = [
  {
    id: 'undo',
    label: (g) => `撤回 ${g.props.undo}`,
    enabled: (g) => g.props.undo > 0 && g.tray.length > 0,
    run: () => undo(game),
  },
  {
    id: 'remove',
    label: (g) => (g.props.remove > 0 ? `移出 ${g.props.remove}` : '移出 🎬'),
    enabled: (g) => g.tray.length > 0,
    run: () => spendOrWatch('remove', '移出槽内 3 张', () => removeProp(game)),
  },
  {
    id: 'shuffle',
    label: (g) => (g.props.shuffle > 0 ? `打乱 ${g.props.shuffle}` : '打乱 🎬'),
    enabled: () => true,
    run: () =>
      spendOrWatch('shuffle', '打乱牌面', () => {
        if (shuffleProp(game)) return true;
        // No deal of the remaining tiles wins from here, so the board is left
        // alone and the prop — possibly just paid for with a video — is not
        // spent. Scrambling the tiles anyway would only hide the dead end.
        setPanel('ad', '这一局怎么打乱都解不开了，道具已退回', 2200);
        return false;
      }),
  },
  {
    id: 'hint',
    label: () => '提示',
    enabled: (g) => g.status === 'playing',
    run: () => {
      hintId = hint(game);
      hintUntil = performance.now() + HINT_MS;
      return hintId !== null;
    },
  },
  {
    id: 'next',
    label: (g) => (g.levelIndex + 1 < LEVELS.length ? '下一关' : '换一局'),
    enabled: () => true,
    run: () => {
      const next = (game.levelIndex + 1) % LEVELS.length;
      startLevel(next);
      return true;
    },
  },
].map((btn, i, all) => {
  const w = (DESIGN.w - 40 * 2 - 12 * (all.length - 1)) / all.length;
  return { ...btn, x: 40 + i * (w + 12), y: 1140, w, h: 76 };
});

function startLevel(levelIndex, seed = (Math.random() * 1e9) | 0) {
  game = createGame(levelIndex, seed);
  tweens = [];
  shake = null;
  hintId = null;
  lastStatus = 'playing';
  setPanel('board', '');
}

/* ------------------------------------------------------------------ */
/* Platform loop: rewarded video, cloud score, friend board, share     */
/* ------------------------------------------------------------------ */

/* One instance per ad unit, created up front, so a creative is already waiting
   the first time a player taps a spent prop. */
const rewardedAd = wx.createRewardedVideoAd({ adUnitId: AD_UNIT });
let pendingReward = null;

rewardedAd.onClose((res) => {
  const grant = pendingReward;
  pendingReward = null;
  // isEnded is false when the player bailed out of the video: no reward.
  if (res && res.isEnded && grant) grant();
});

rewardedAd.onError((err) => {
  pendingReward = null;
  setPanel('ad', `广告不可用 · errCode ${err.errCode}`, 1600);
});

function watchAd(reason, grant) {
  pendingReward = grant;
  setPanel('ad', `🎬 ${reason}（模拟激励视频）`);
  rewardedAd.show().catch(() => {
    rewardedAd
      .load()
      .then(() => rewardedAd.show())
      .catch((err) => {
        pendingReward = null;
        setPanel('ad', `暂无广告库存（errCode ${err.errCode ?? 1004}），道具未发放`, 1600);
      });
  });
}

shim.on('ad:close', () => setPanel('ad', ''));

/** Fewer picks is better, so the friend board ranks skill rather than time. */
function levelScore() {
  return (game.levelIndex + 1) * 1000 + Math.max(0, 900 - game.stats.picks * 5);
}

function readScore(kvList) {
  const kv = kvList.find((k) => k.key === CLOUD_KEY);
  if (!kv) return 0;
  try {
    return Number(JSON.parse(kv.value).wxgame.score) || 0;
  } catch {
    return 0;
  }
}

/* WeChat's own 排行榜模板 reads this envelope, so the mock stores it too. */
function submitScore() {
  wx.setUserCloudStorage({
    KVDataList: [
      {
        key: CLOUD_KEY,
        value: JSON.stringify({
          wxgame: { score: levelScore(), update_time: Math.floor(Date.now() / 1000) },
        }),
      },
    ],
  });
  wx.getFriendCloudStorage({
    keyList: [CLOUD_KEY],
    success: (res) => {
      const rows = res.data
        .map((u) => ({
          name: u.nickname,
          me: u.openid === shim.config.self.openid,
          score: readScore(u.KVDataList),
        }))
        .sort((a, b) => b.score - a.score);
      const mine = rows.findIndex((r) => r.me) + 1;
      const top = rows.slice(0, 3).map((r) => `${r.name} ${r.score}`).join(' · ');
      setPanel('board', `好友榜 第 ${mine}/${rows.length} 名 · ${top}`);
    },
  });
}

/** A win is the moment the genre brags; a loss is the moment it asks for help. */
function announce(status) {
  if (status === 'won') {
    submitScore();
    wx.shareAppMessage({
      title: `${game.level.name} ${game.stats.picks} 次点击通关，来试试`,
      query: `level=${game.levelIndex}&seed=${game.seed}`,
    });
    return;
  }
  wx.shareAppMessage({
    title: `${game.level.name} 卡住了，帮我复活`,
    query: `level=${game.levelIndex}&seed=${game.seed}&from=revive`,
  });
  // The platform never confirms a send, so the revive hangs off the friend
  // coming back through the card instead.
  shim.once('share:success', () => {
    if (game.status !== 'lost') return;
    game.props.remove++;
    removeProp(game);
    setPanel('ad', '好友打开了分享卡 · 已退回槽内 3 张', 2000);
  });
}

/* These panels are the mock's stage: a real mini game has neither them nor the
   shim behind them, because WeChat draws the ad and the 开放数据域 draws the
   friend board. */
const panels =
  typeof document === 'undefined'
    ? {}
    : { ad: document.getElementById('wxad'), board: document.getElementById('wxboard') };
const panelTimers = {};

function setPanel(id, text, hideAfterMs) {
  const el = panels[id];
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('show', Boolean(text));
  clearTimeout(panelTimers[id]);
  if (text && hideAfterMs) {
    panelTimers[id] = setTimeout(() => el.classList.remove('show'), hideAfterMs);
  }
}

function tweenToTray(tile, from) {
  tweens.push({ id: tile.id, from, start: performance.now() });
}

function activeAnimations(now) {
  const anim = {};
  tweens = tweens.filter((tw) => {
    const index = game.tray.findIndex((t) => t.id === tw.id);
    if (index === -1) return false;
    const p = (now - tw.start) / TWEEN_MS;
    if (p >= 1) return false;
    const eased = 1 - (1 - p) * (1 - p);
    const to = renderer.traySlotPos(game, index);
    anim[tw.id] = {
      x: tw.from.x + (to.x - tw.from.x) * eased,
      y: tw.from.y + (to.y - tw.from.y) * eased,
    };
    return true;
  });
  return anim;
}

function handleTap(px, py) {
  const { x, y } = renderer.toDesign(px, py);

  if (game.status !== 'playing') {
    startLevel(game.levelIndex, game.seed);
    return;
  }

  for (const btn of BUTTONS) {
    if (x < btn.x || x > btn.x + btn.w || y < btn.y || y > btn.y + btn.h) continue;
    if (btn.enabled(game)) btn.run();
    return;
  }

  const tile = renderer.hitTest(game, x, y);
  if (!tile) return;

  const from = renderer.boardPos(game, tile);
  const result = pick(game, tile.id);
  if (result.ok) {
    hintId = null;
    tweenToTray(tile, from);
  } else {
    shake = { id: tile.id, until: performance.now() + 260 };
  }
}

function bindInput() {
  if (isRealWx() && wx.onTouchStart) {
    const dpr = wx.getSystemInfoSync().pixelRatio;
    wx.onTouchStart((e) => {
      const t = e.touches[0];
      handleTap(t.clientX * dpr, t.clientY * dpr);
    });
    return;
  }
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    handleTap(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height
    );
  });
}

function fitCanvas() {
  if (isRealWx() && wx.getSystemInfoSync) {
    const info = wx.getSystemInfoSync();
    renderer.resize(info.windowWidth * info.pixelRatio, info.windowHeight * info.pixelRatio);
    return;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const box = canvas.parentElement.getBoundingClientRect();
  renderer.resize(Math.round(box.width * dpr), Math.round(box.height * dpr));
}

let nextAutoplay = 0;

/** Let the solver play itself, so a demo run exercises the real move rules. */
function stepAutoplay(now) {
  if (!params.autoplay || game.status !== 'playing' || now < nextAutoplay) return;
  nextAutoplay = now + params.autoplay;
  const id = hint(game);
  if (id === null) return;
  const from = renderer.boardPos(game, game.tiles[id]);
  if (pick(game, id).ok) tweenToTray(game.tiles[id], from);
}

function frame() {
  const now = performance.now();
  if (shake && now > shake.until) shake = null;
  if (hintId !== null && now > hintUntil) hintId = null;
  stepAutoplay(now);

  if (game.status !== lastStatus) {
    lastStatus = game.status;
    if (lastStatus !== 'playing') announce(lastStatus);
  }

  renderer.draw(game, {
    anim: activeAnimations(now),
    buttons: BUTTONS,
    shakeId: shake?.id ?? null,
    hintId,
  });
  requestAnimationFrame(frame);
}

if (typeof window !== 'undefined') window.addEventListener('resize', fitCanvas);
fitCanvas();
bindInput();
frame();

/** Handles for a headless harness; the game itself never reads this. */
export const __harness = {
  shim,
  buttons: BUTTONS,
  get game() {
    return game;
  },
  startLevel,
  step: () => frame(),
};
