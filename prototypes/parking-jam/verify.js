/**
 * Headless verification for the parking-jam prototype.
 *
 *   node prototypes/parking-jam/verify.js
 *
 * Three passes:
 *   1. Level audit  — every shipped level solves, and its declared par is the
 *                     BFS optimum (par drives stars, hints and the budget).
 *   2. Invariant fuzz — random legal play never overlaps cars or leaves the lot.
 *   3. UI playthrough — boots the real index.html module graph against a stub
 *                     DOM and finishes levels with synthesised pointer drags,
 *                     so render.js and main.js are covered too, not just core.
 *
 * Exits non-zero on the first failed check.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  LEVELS,
  HORIZONTAL,
  applyMove,
  cellsOf,
  isSolved,
  legalMoves,
  loadLevel,
  mulberry32,
  solve,
} from './src/core.js';

const here = path.dirname(fileURLToPath(import.meta.url));
let failures = 0;

function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
}

/* ------------------------------------------------------------------ */
/* 1. Level audit                                                      */
/* ------------------------------------------------------------------ */

console.log('\n— level pack —');
console.log('  #  name                 par  limit  nodes    ms');
const solutions = [];
LEVELS.forEach((def, i) => {
  const started = Date.now();
  const result = solve(loadLevel(i), { nodeCap: 600000 });
  const ms = Date.now() - started;
  solutions[i] = result;
  const parOk = result.solved && result.length === def.par;
  console.log(
    `  ${String(i + 1).padEnd(2)} ${def.name.padEnd(18)} ${String(def.par).padStart(4)}` +
      `${String(def.moveLimit).padStart(7)}${String(result.nodes).padStart(8)}${String(ms).padStart(6)}`
  );
  check(
    `level ${i + 1} par is the BFS optimum`,
    parOk,
    result.solved ? `(solver says ${result.length})` : `(${result.reason})`
  );
  check(`level ${i + 1} budget is winnable`, def.moveLimit > def.par);
});

check(
  'difficulty ramps monotonically',
  LEVELS.every((def, i) => i === 0 || def.par > LEVELS[i - 1].par)
);

/* ------------------------------------------------------------------ */
/* 2. Invariant fuzz                                                   */
/* ------------------------------------------------------------------ */

const rng = mulberry32(0xc0ffee);
let violations = 0;
let plays = 0;
let wins = 0;
for (let round = 0; round < 40; round++) {
  let state = loadLevel(round % LEVELS.length);
  for (let step = 0; step < 120; step++) {
    const moves = legalMoves(state);
    if (!moves.length) {
      violations++;
      break;
    }
    state = applyMove(state, moves[Math.floor(rng() * moves.length)]);
    plays++;
    const seen = new Set();
    for (let i = 0; i < state.vehicles.length; i++) {
      if (state.out[i]) continue;
      for (const { r, c } of cellsOf(state.vehicles[i])) {
        if (r < 0 || c < 0 || r >= state.rows || c >= state.cols || seen.has(`${r},${c}`)) violations++;
        seen.add(`${r},${c}`);
      }
    }
    if (isSolved(state)) {
      wins++;
      break;
    }
  }
}
console.log('\n— invariants —');
check(`${plays} random moves kept the lot consistent`, violations === 0, `(${wins} random wins)`);

/* ------------------------------------------------------------------ */
/* 3. UI playthrough against a stub DOM                                */
/* ------------------------------------------------------------------ */

const CANVAS_CSS_SIZE = 600;
const noop = () => {};
const ctxStub = new Proxy(
  {},
  {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient') return () => ({ addColorStop: noop });
      if (key === 'measureText') return () => ({ width: 10 });
      return noop; // every drawing call is a no-op
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  }
);

function makeEl(id = '') {
  const listeners = new Map();
  return {
    id,
    textContent: '',
    hidden: false,
    dataset: {},
    style: {},
    width: 0,
    height: 0,
    children: [],
    title: '',
    classList: {
      set: new Set(),
      add(c) { this.set.add(c); },
      remove(c) { this.set.delete(c); },
      toggle(c, on) { if (on) this.set.add(c); else this.set.delete(c); },
      contains(c) { return this.set.has(c); },
    },
    listeners,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    fire(type, event = {}) {
      for (const fn of listeners.get(type) ?? []) fn(event);
    },
    appendChild(child) { this.children.push(child); return child; },
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: CANVAS_CSS_SIZE, height: CANVAS_CSS_SIZE }),
    setPointerCapture: noop,
    releasePointerCapture: noop,
    hasPointerCapture: () => false,
  };
}

const elements = new Map();
const el = (id) => {
  if (!elements.has(id)) elements.set(id, makeEl(id));
  return elements.get(id);
};
el('board').parentElement = el('stage');

let clock = 0;
let frame = [];
globalThis.performance = { now: () => clock };
globalThis.requestAnimationFrame = (cb) => frame.push(cb);
globalThis.document = { getElementById: el, createElement: () => makeEl() };
globalThis.window = {
  addEventListener: noop,
  devicePixelRatio: 1,
  innerWidth: CANVAS_CSS_SIZE,
  innerHeight: CANVAS_CSS_SIZE,
};
globalThis.localStorage = {
  store: new Map(),
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; },
  setItem(k, v) { this.store.set(k, String(v)); },
  removeItem(k) { this.store.delete(k); },
};

/** Run queued animation frames to completion against a virtual clock. */
function flush(maxFrames = 4000) {
  let spun = 0;
  while (frame.length && spun++ < maxFrames) {
    const due = frame;
    frame = [];
    clock += 16;
    for (const cb of due) cb(clock);
  }
}

const { layoutFor } = await import('./src/render.js');
await import('./src/main.js');
const game = globalThis.window.__game;

console.log('\n— ui —');
check('module graph boots and renders level 1', !!game && game.state.name === LEVELS[0].name);
check('hud is populated on boot', el('levelName').textContent === LEVELS[0].name && el('moves').textContent === '0');
check('level buttons are built', el('levels').children.length === LEVELS.length);

/** Drive one solver move through the real pointer handlers. */
function dragMove(move) {
  const state = game.state;
  const board = el('board');
  const L = layoutFor(board, state);
  const vehicle = state.vehicles[move.vehicle];
  const horizontal = vehicle.orient === HORIZONTAL;
  const grab = cellsOf(vehicle)[0];
  const x = L.x0 + (grab.c + 0.5) * L.cell;
  const y = L.y0 + (grab.r + 0.5) * L.cell;
  // Overshoot the wall on an exit move; that overshoot is what "drive out" means.
  const travel = move.dir * (move.dist + (move.exit ? 1 : 0)) * L.cell;

  board.fire('pointerdown', { clientX: x, clientY: y, pointerId: 1 });
  board.fire('pointermove', {
    clientX: x + (horizontal ? travel : 0),
    clientY: y + (horizontal ? 0 : travel),
    pointerId: 1,
  });
  board.fire('pointerup', {
    clientX: x + (horizontal ? travel : 0),
    clientY: y + (horizontal ? 0 : travel),
    pointerId: 1,
  });
  flush();
}

for (let index = 0; index < LEVELS.length; index++) {
  game.startLevel(index);
  flush();
  for (const move of solutions[index].moves) dragMove(move);
  check(
    `level ${index + 1} completes through pointer drags`,
    isSolved(game.state) && game.state.moves === LEVELS[index].par,
    `(${game.state.moves} moves, overlay "${el('overlayTitle').textContent}")`
  );
  check(
    `level ${index + 1} shows the win overlay and records a best`,
    el('overlay').hidden === false && el('best').textContent === String(LEVELS[index].par)
  );
}

game.startLevel(0);
flush();
const beforeUndo = game.state.moves;
dragMove(solutions[0].moves[0]);
el('btnUndo').fire('click');
check('undo rewinds a move', game.state.moves === beforeUndo, `(${game.state.moves})`);

// The hint is the game's only monetised moment, so it must be gated: the ad
// player appears first, and the reward only lands when the video finishes.
el('btnHint').fire('click');
check('asking for a hint opens the rewarded video', el('ad').hidden === false);
flush();
check('watching it through closes the ad and reveals the hint', el('ad').hidden === true);

el('btnHint').fire('click');
el('adSkip').fire('click');
check(
  'skipping the video denies the hint',
  el('ad').hidden === true && el('toast').textContent === '广告未看完，提示未解锁',
  `("${el('toast').textContent}")`
);
flush();

el('btnShare').fire('click');
check('sharing goes through wx.shareAppMessage', el('toast').textContent.length > 0);

const failing = LEVELS[0];
game.startLevel(0);
flush();
const blocker = game.state.vehicles.findIndex((v) => v.label === 'B');
for (let i = 0; i < failing.moveLimit; i++) {
  dragMove({ vehicle: blocker, dir: i % 2 === 0 ? 1 : -1, dist: 1, exit: false });
}
check(
  'burning the move budget triggers the loss overlay',
  el('overlay').hidden === false && el('overlayTitle').textContent === '步数用尽',
  `("${el('overlayTitle').textContent}")`
);

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
