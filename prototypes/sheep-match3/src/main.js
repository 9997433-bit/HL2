/**
 * Host shell: wires the pure core to a canvas, pointer input and a game loop.
 *
 * The only platform-specific parts are `resolveCanvas` and `bindInput`; porting
 * to a WeChat mini game means swapping those two for `wx.createCanvas()` and
 * `wx.onTouchStart`, and nothing in core.js or render.js changes.
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

const TWEEN_MS = 200;
const HINT_MS = 1600;

function resolveCanvas() {
  if (typeof wx !== 'undefined' && wx.createCanvas) return wx.createCanvas();
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

const BUTTONS = [
  {
    id: 'undo',
    label: (g) => `撤回 ${g.props.undo}`,
    enabled: (g) => g.props.undo > 0 && g.tray.length > 0,
    run: () => undo(game),
  },
  {
    id: 'remove',
    label: (g) => `移出 ${g.props.remove}`,
    enabled: (g) => g.props.remove > 0 && g.tray.length > 0,
    run: () => removeProp(game),
  },
  {
    id: 'shuffle',
    label: (g) => `打乱 ${g.props.shuffle}`,
    enabled: (g) => g.props.shuffle > 0,
    run: () => shuffleProp(game),
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
  if (typeof wx !== 'undefined' && wx.onTouchStart) {
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
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
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
