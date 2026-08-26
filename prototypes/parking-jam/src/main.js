/**
 * Gridlock Garage — browser shell: input, animation, HUD, level flow.
 *
 * All rules live in core.js; this file only turns pointer gestures into legal
 * moves and draws the result. Everything the WeChat platform would own —
 * rewarded video for a hint, the share card, cloud-stored bests — goes through
 * the shared `wx.*` mock in `prototypes/shared/`, so the calls here are the
 * calls a mini-game build would make. See README.md.
 */

import {
  LEVELS,
  HORIZONTAL,
  applyMove,
  exitFor,
  hint as solveHint,
  isFailed,
  isSolved,
  loadLevel,
  maxSlide,
  occupancy,
  solve,
  starsFor,
} from './core.js';
import { draw, layoutFor } from './render.js';
import { installWxShim } from '../../shared/wx-shim.mjs';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const ui = {
  levelName: document.getElementById('levelName'),
  levelSub: document.getElementById('levelSub'),
  moves: document.getElementById('moves'),
  limit: document.getElementById('limit'),
  par: document.getElementById('par'),
  best: document.getElementById('best'),
  levels: document.getElementById('levels'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlayTitle'),
  overlayBody: document.getElementById('overlayBody'),
  overlayStars: document.getElementById('overlayStars'),
  overlayNext: document.getElementById('overlayNext'),
  overlayRetry: document.getElementById('overlayRetry'),
  toast: document.getElementById('toast'),
  ad: document.getElementById('ad'),
  adFill: document.getElementById('adFill'),
  adSkip: document.getElementById('adSkip'),
};

let levelIndex = 0;
let state = null;
let history = [];
const view = { dragging: null, animation: null, hint: null, hintPulse: 0 };

/* ------------------------------------------------------------------ */
/* Level flow                                                          */
/* ------------------------------------------------------------------ */

/** `#3` in the URL opens level 3, which makes a level linkable in a demo. */
function levelFromHash() {
  const n = Number(globalThis.location?.hash?.slice(1));
  return Number.isInteger(n) && n >= 1 && n <= LEVELS.length ? n - 1 : 0;
}

function startLevel(index) {
  levelIndex = ((index % LEVELS.length) + LEVELS.length) % LEVELS.length;
  state = loadLevel(levelIndex);
  if (globalThis.location) globalThis.location.hash = String(levelIndex + 1);
  history = [];
  view.dragging = null;
  view.animation = null;
  view.hint = null;
  hideOverlay();
  syncHud();
  render();
}

function syncHud() {
  const def = LEVELS[levelIndex];
  ui.levelName.textContent = def.name;
  ui.levelSub.textContent = def.subtitle ?? '';
  ui.moves.textContent = String(state.moves);
  ui.limit.textContent = Number.isFinite(state.moveLimit) ? String(state.moveLimit) : '∞';
  ui.par.textContent = state.par ?? '?';
  const best = platform.readBest(levelIndex);
  ui.best.textContent = best == null ? '—' : String(best);
  for (const button of ui.levels.children) {
    button.classList.toggle('active', Number(button.dataset.level) === levelIndex);
  }
}

function commit(move) {
  history.push(state);
  state = applyMove(state, move);
  view.hint = null;
  const won = isSolved(state);
  if (won) platform.recordWin(levelIndex, state.moves);
  syncHud();
  if (won) showWin();
  else if (isFailed(state)) showLose();
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

function pointerCell(event) {
  const rect = canvas.getBoundingClientRect();
  const L = layoutFor(canvas, state);
  const scale = canvas.width / rect.width;
  const x = (event.clientX - rect.left) * scale;
  const y = (event.clientY - rect.top) * scale;
  return {
    px: x,
    py: y,
    col: Math.floor((x - L.x0) / L.cell),
    row: Math.floor((y - L.y0) / L.cell),
    L,
  };
}

function vehicleAt(row, col) {
  if (row < 0 || col < 0 || row >= state.rows || col >= state.cols) return -1;
  return occupancy(state)[row * state.cols + col];
}

canvas.addEventListener('pointerdown', (event) => {
  if (view.animation || !ui.overlay.hidden) return;
  const { row, col, px, py, L } = pointerCell(event);
  const index = vehicleAt(row, col);
  if (index === -1) return;

  const grid = occupancy(state);
  canvas.setPointerCapture(event.pointerId);
  view.dragging = {
    vehicle: index,
    offset: 0,
    startPx: state.vehicles[index].orient === HORIZONTAL ? px : py,
    cell: L.cell,
    back: -maxSlide(state, index, -1, grid) * L.cell,
    forward: maxSlide(state, index, 1, grid) * L.cell,
    canExitBack: exitFor(state, index, -1, grid) !== -1,
    canExitForward: exitFor(state, index, 1, grid) !== -1,
    moved: false,
  };
  render();
});

canvas.addEventListener('pointermove', (event) => {
  const drag = view.dragging;
  if (!drag) return;
  const { px, py } = pointerCell(event);
  const raw = (state.vehicles[drag.vehicle].orient === HORIZONTAL ? px : py) - drag.startPx;
  // A target can be pulled a little past the wall; that overshoot is the
  // gesture that means "drive out".
  const overshoot = drag.cell * 0.9;
  const lo = drag.back - (drag.canExitBack ? overshoot : 0);
  const hi = drag.forward + (drag.canExitForward ? overshoot : 0);
  drag.offset = Math.max(lo, Math.min(hi, raw));
  if (Math.abs(raw) > drag.cell * 0.18) drag.moved = true;
  render();
});

function endDrag(event) {
  const drag = view.dragging;
  if (!drag) return;
  view.dragging = null;
  if (event && canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);

  if (!drag.moved) {
    tapNudge(drag.vehicle);
    return;
  }

  const exitPull = drag.cell * 0.45;
  if (drag.canExitForward && drag.offset > drag.forward + exitPull) {
    animateExit(drag.vehicle, 1, drag.forward / drag.cell, drag.offset);
    return;
  }
  if (drag.canExitBack && drag.offset < drag.back - exitPull) {
    animateExit(drag.vehicle, -1, drag.back / drag.cell, drag.offset);
    return;
  }

  const cells = Math.round(drag.offset / drag.cell);
  const clamped = Math.max(drag.back / drag.cell, Math.min(drag.forward / drag.cell, cells));
  if (clamped === 0) {
    render();
    return;
  }
  animateSlide(drag.vehicle, Math.sign(clamped), Math.abs(clamped), drag.offset);
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/** A tap with no drag: leave if you can, otherwise take the roomier direction. */
function tapNudge(index) {
  const grid = occupancy(state);
  for (const dir of [1, -1]) {
    if (exitFor(state, index, dir, grid) !== -1) {
      animateExit(index, dir, maxSlide(state, index, dir, grid), 0);
      return;
    }
  }
  const forward = maxSlide(state, index, 1, grid);
  const back = maxSlide(state, index, -1, grid);
  if (forward === 0 && back === 0) {
    bump(index);
    return;
  }
  const dir = forward >= back ? 1 : -1;
  animateSlide(index, dir, dir > 0 ? forward : back, 0);
}

/* ------------------------------------------------------------------ */
/* Animation                                                           */
/* ------------------------------------------------------------------ */

const easeOut = (t) => 1 - (1 - t) ** 3;

function animate({ vehicle, from, to, duration, fadeOut = false, onDone }) {
  const start = performance.now();
  view.animation = { vehicle, offset: from, fade: 1 };
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const k = easeOut(t);
    view.animation.offset = from + (to - from) * k;
    if (fadeOut) view.animation.fade = 1 - k;
    render();
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      view.animation = null;
      onDone();
      render();
    }
  }
  requestAnimationFrame(step);
}

function animateSlide(index, dir, dist, fromPx) {
  const cell = layoutFor(canvas, state).cell;
  animate({
    vehicle: index,
    from: fromPx,
    to: dir * dist * cell,
    duration: 60 + Math.min(140, dist * 55),
    onDone: () => commit({ vehicle: index, dir, dist, exit: false }),
  });
}

function animateExit(index, dir, dist, fromPx) {
  const cell = layoutFor(canvas, state).cell;
  animate({
    vehicle: index,
    from: fromPx,
    to: dir * (dist + 2.2) * cell,
    duration: 300,
    fadeOut: true,
    onDone: () => commit({ vehicle: index, dir, dist, exit: true }),
  });
}

function bump(index) {
  const cell = layoutFor(canvas, state).cell;
  const start = performance.now();
  view.animation = { vehicle: index, offset: 0, fade: 1 };
  function step(now) {
    const t = Math.min(1, (now - start) / 180);
    view.animation.offset = Math.sin(t * Math.PI * 3) * cell * 0.06 * (1 - t);
    render();
    if (t < 1) requestAnimationFrame(step);
    else {
      view.animation = null;
      render();
    }
  }
  requestAnimationFrame(step);
}

function render() {
  draw(ctx, canvas, state, view);
}

/* ------------------------------------------------------------------ */
/* Overlays and controls                                               */
/* ------------------------------------------------------------------ */

function showOverlay({ title, body, stars, next }) {
  ui.overlayTitle.textContent = title;
  ui.overlayBody.textContent = body;
  ui.overlayStars.textContent = stars == null ? '' : '★'.repeat(stars) + '☆'.repeat(3 - stars);
  ui.overlayNext.hidden = !next;
  ui.overlay.hidden = false;
}

function hideOverlay() {
  ui.overlay.hidden = true;
}

function showWin() {
  const stars = starsFor(state.moves, state.par);
  const last = levelIndex === LEVELS.length - 1;
  showOverlay({
    title: last ? '全部通关' : '出库成功',
    body: `${state.moves} 步完成，最优 ${state.par} 步。`,
    stars,
    next: !last,
  });
}

function showLose() {
  showOverlay({
    title: '步数用尽',
    body: `本关限 ${state.moveLimit} 步。撤销一步再想想，或者重开。`,
    stars: null,
    next: false,
  });
}

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.remove('show'), 1800);
}

function undo() {
  if (!history.length) return;
  state = history.pop();
  view.hint = null;
  hideOverlay();
  syncHud();
  render();
}

/**
 * The monetised moment. A step-limited puzzle has no share-to-revive, so the
 * hint is where the rewarded video goes — which is why it runs through the ad
 * gate here rather than just solving and flashing a car.
 */
function showHint() {
  const move = solveHint(state, { nodeCap: 250000 });
  if (!move) {
    toast('这一步已经解不开了，撤销试试');
    return;
  }
  platform.watchRewardedAd({
    onReward: () => flashHint(move),
    onSkip: () => toast('广告未看完，提示未解锁'),
    // No ad fill is not the player's fault, so grant it anyway.
    onUnavailable: () => flashHint(move),
  });
}

function flashHint(move) {
  view.hint = move.vehicle;
  const start = performance.now();
  (function pulse(now) {
    const t = (now - start) / 1400;
    if (t >= 1 || view.hint !== move.vehicle) {
      view.hint = null;
      render();
      return;
    }
    view.hintPulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 6);
    render();
    requestAnimationFrame(pulse);
  })(start);
}

document.getElementById('btnUndo').addEventListener('click', undo);
document.getElementById('btnRestart').addEventListener('click', () => startLevel(levelIndex));
document.getElementById('btnHint').addEventListener('click', showHint);
document.getElementById('btnShare').addEventListener('click', () => {
  platform.share({ title: `${LEVELS[levelIndex].name} — ${state.moves} 步`, level: levelIndex });
  toast('分享卡已发出（模拟）');
});
ui.overlayRetry.addEventListener('click', () => startLevel(levelIndex));
ui.overlayNext.addEventListener('click', () => startLevel(levelIndex + 1));

LEVELS.forEach((def, i) => {
  const button = document.createElement('button');
  button.textContent = String(i + 1);
  button.dataset.level = String(i);
  button.title = def.name;
  button.addEventListener('click', () => startLevel(i));
  ui.levels.appendChild(button);
});

/* ------------------------------------------------------------------ */
/* Platform adapter                                                    */
/* ------------------------------------------------------------------ */

/**
 * `installWxShim` publishes a mock `globalThis.wx` and steps aside if a real
 * WeChat host is present, so every call below is the call the mini-game build
 * makes. `manual` ad behaviour means the shim reports that an ad is on screen
 * and this file draws the player — which is how the real SDK behaves too.
 */
const shim = installWxShim({ adBehavior: 'manual', seed: 20260826 });
const wx = globalThis.wx;

const AD_UNIT = 'adunit-parking-hint';
const AD_SECONDS = 3;
const bestKey = (index) => `best_level_${index + 1}`;
const bests = new Map();

const hintAd = wx.createRewardedVideoAd({ adUnitId: AD_UNIT });
let adOutcome = null;

hintAd.onClose((res) => {
  closeAdOverlay();
  const done = adOutcome;
  adOutcome = null;
  if (!done) return;
  if (res.isEnded) done.onReward();
  else done.onSkip();
});
hintAd.onError(() => {
  closeAdOverlay();
  const done = adOutcome;
  adOutcome = null;
  done?.onUnavailable();
});

// The shim hands the host a session; drawing the fake player is the host's job.
shim.on('ad:show', (session) => openAdOverlay(session));

function openAdOverlay(session) {
  ui.ad.hidden = false;
  const start = performance.now();
  (function tick(now) {
    if (ui.ad.hidden) return;
    const t = Math.min(1, (now - start) / (AD_SECONDS * 1000));
    ui.adFill.style.width = `${(t * 100).toFixed(1)}%`;
    ui.adSkip.textContent = t < 1 ? `${Math.ceil((1 - t) * AD_SECONDS)} 秒后可关闭` : '关闭并领取';
    if (t < 1) requestAnimationFrame(tick);
    else session.complete();
  })(start);
}

function closeAdOverlay() {
  ui.ad.hidden = true;
  ui.adFill.style.width = '0%';
}

ui.adSkip.addEventListener('click', () => shim.skipAd());

const platform = {
  /** wx.createRewardedVideoAd — the game's only revenue surface. */
  watchRewardedAd(callbacks) {
    if (adOutcome) return;
    adOutcome = callbacks;
    hintAd
      .show()
      .catch(() => hintAd.load().then(() => hintAd.show()))
      .catch(() => {
        const pending = adOutcome;
        adOutcome = null;
        closeAdOverlay();
        pending?.onUnavailable();
      });
  },

  /** wx.shareAppMessage — callback-less on the real platform, as here. */
  share(payload) {
    wx.shareAppMessage({
      title: payload.title,
      query: `level=${payload.level + 1}`,
      imageUrl: 'wxshim://share/parking-jam',
    });
  },

  /** wx.setUserCloudStorage — what the 开放数据域 friend leaderboard reads. */
  recordWin(index, moves) {
    const key = bestKey(index);
    const previous = bests.get(key);
    if (previous != null && previous <= moves) return;
    bests.set(key, moves);
    wx.setUserCloudStorage({
      KVDataList: [{ key, value: String(moves) }],
      fail: () => bests.delete(key),
    });
  },

  readBest(index) {
    const value = bests.get(bestKey(index));
    return value == null ? null : value;
  },
};

// Bests are cached locally because the HUD reads them every frame-ish, while
// cloud storage is a round trip. Same shape a real mini game uses.
wx.getUserCloudStorage({
  keyList: LEVELS.map((_, i) => bestKey(i)),
  success: (res) => {
    for (const kv of res.KVDataList ?? []) bests.set(kv.key, Number(kv.value));
    if (state) syncHud();
  },
  fail: () => {},
});

shim.on('share:success', () => toast('好友已从分享卡进入（模拟）'));

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

function resize() {
  const box = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = Math.min(box.width, box.height);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  if (state) render();
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
  if (event.key === 'z' || event.key === 'Z') undo();
  if (event.key === 'r' || event.key === 'R') startLevel(levelIndex);
  if (event.key === 'h' || event.key === 'H') showHint();
});

resize();
startLevel(levelFromHash());
resize();

// Handy in the console: solve(state) to inspect the optimal line.
Object.assign(window, { __game: { get state() { return state; }, solve, startLevel } });
