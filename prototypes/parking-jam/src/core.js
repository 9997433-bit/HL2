/**
 * Gridlock Garage — parking-jam core ("挪了下车" / Rush Hour family).
 *
 * Pure logic: no canvas, no DOM, no wx API. The same module runs in Node for
 * the headless tests and in the browser for the playable build.
 *
 * Board model
 * -----------
 * A `rows x cols` occupancy grid. Every vehicle is an axis-aligned rectangle
 * 1 cell thick and `len` cells long, anchored at its top-left cell. A vehicle
 * may only slide along its own axis, so a horizontal car changes `col` and a
 * vertical car changes `row`. One slide of any distance is one move, which is
 * the move-counting convention the commercial parking puzzles use.
 *
 * Exits are gaps in the outer wall. Only vehicles flagged `isTarget` may drive
 * through one; everything else is a blocker. A target that reaches the wall
 * with a clear run leaves the lot entirely, which frees its cells for the
 * remaining traffic — that is the parking-lot twist on plain Rush Hour, where
 * the single red car ends the puzzle the moment it escapes.
 *
 * States are immutable. `applyMove` returns a new state, which is what lets the
 * BFS solver hash and revisit them safely.
 */

export const HORIZONTAL = 'h';
export const VERTICAL = 'v';

/** Wall letter used in level definitions -> exit axis and direction. */
const EXIT_SIDES = {
  L: { axis: HORIZONTAL, dir: -1 },
  R: { axis: HORIZONTAL, dir: 1 },
  T: { axis: VERTICAL, dir: -1 },
  B: { axis: VERTICAL, dir: 1 },
};

/** Deterministic PRNG so a seed always reproduces the same generated level. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Level definition -> state                                           */
/* ------------------------------------------------------------------ */

/**
 * Parse a level written as an ASCII map.
 *
 *   grid:   rows of equal-length strings, '.' for tarmac, any other
 *           character for a vehicle. Cells sharing a character form one
 *           vehicle and must be contiguous along a single axis.
 *   exits:  wall gaps as 'R2' (right wall, row 2), 'T0' (top wall, column 0),
 *           and likewise 'L' / 'B'.
 *   targets: characters that must leave the lot. Defaults to 'A'.
 */
export function parseLevel(def) {
  const grid = def.grid;
  const rows = grid.length;
  const cols = grid[0].length;
  if (grid.some((line) => line.length !== cols)) {
    throw new Error(`level "${def.name}": rows have different widths`);
  }

  const targets = def.targets ?? 'A';
  const cells = new Map();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      if (ch === '.' || ch === ' ') continue;
      if (!cells.has(ch)) cells.set(ch, []);
      cells.get(ch).push({ r, c });
    }
  }

  const vehicles = [...cells.keys()].sort().map((label) => {
    const own = cells.get(label);
    const rowsUsed = new Set(own.map((p) => p.r));
    const colsUsed = new Set(own.map((p) => p.c));
    const orient =
      rowsUsed.size === 1 ? HORIZONTAL : colsUsed.size === 1 ? VERTICAL : null;
    if (!orient) throw new Error(`level "${def.name}": vehicle ${label} is not a straight line`);
    if (own.length < 2) throw new Error(`level "${def.name}": vehicle ${label} is shorter than 2 cells`);

    const row = Math.min(...own.map((p) => p.r));
    const col = Math.min(...own.map((p) => p.c));
    const along = own.map((p) => (orient === HORIZONTAL ? p.c : p.r));
    const span = Math.max(...along) - Math.min(...along) + 1;
    if (span !== own.length) throw new Error(`level "${def.name}": vehicle ${label} has a gap`);

    return { label, row, col, len: own.length, orient, isTarget: targets.includes(label) };
  });

  if (!vehicles.some((v) => v.isTarget)) {
    throw new Error(`level "${def.name}": no target vehicle`);
  }

  const exits = (def.exits ?? []).map((code) => {
    const side = EXIT_SIDES[code[0].toUpperCase()];
    const line = Number(code.slice(1));
    if (!side || !Number.isInteger(line)) throw new Error(`level "${def.name}": bad exit "${code}"`);
    return { ...side, line, code };
  });
  if (exits.length === 0) throw new Error(`level "${def.name}": no exit`);

  return {
    name: def.name ?? 'untitled',
    rows,
    cols,
    exits,
    vehicles,
    out: vehicles.map(() => false),
    moves: 0,
    moveLimit: def.moveLimit ?? Infinity,
    par: def.par ?? null,
  };
}

/** Render the live board back to the ASCII form `parseLevel` accepts. */
export function toAscii(state) {
  const grid = Array.from({ length: state.rows }, () => Array(state.cols).fill('.'));
  state.vehicles.forEach((v, i) => {
    if (state.out[i]) return;
    for (const { r, c } of cellsOf(v)) grid[r][c] = v.label;
  });
  return grid.map((line) => line.join(''));
}

export function cellsOf(v) {
  const out = [];
  for (let i = 0; i < v.len; i++) {
    out.push(v.orient === HORIZONTAL ? { r: v.row, c: v.col + i } : { r: v.row + i, c: v.col });
  }
  return out;
}

/** Grid of vehicle indices, -1 where the tarmac is free. */
export function occupancy(state) {
  const grid = new Int16Array(state.rows * state.cols).fill(-1);
  state.vehicles.forEach((v, i) => {
    if (state.out[i]) return;
    for (const { r, c } of cellsOf(v)) grid[r * state.cols + c] = i;
  });
  return grid;
}

/* ------------------------------------------------------------------ */
/* Moves                                                               */
/* ------------------------------------------------------------------ */

/** How far vehicle `i` can slide in `dir` (-1 up/left, +1 down/right). */
export function maxSlide(state, i, dir, grid = occupancy(state)) {
  const v = state.vehicles[i];
  if (state.out[i]) return 0;
  const limit = v.orient === HORIZONTAL ? state.cols : state.rows;
  const head = v.orient === HORIZONTAL ? v.col : v.row;
  let dist = 0;
  for (;;) {
    const probe = dir < 0 ? head - dist - 1 : head + v.len + dist;
    if (probe < 0 || probe >= limit) break;
    const idx = v.orient === HORIZONTAL ? v.row * state.cols + probe : probe * state.cols + v.col;
    if (grid[idx] !== -1) break;
    dist++;
  }
  return dist;
}

/**
 * Index of the exit vehicle `i` would drive through if it kept going in `dir`
 * past the wall, or -1. Requires a clear run all the way to that wall.
 */
export function exitFor(state, i, dir, grid = occupancy(state)) {
  const v = state.vehicles[i];
  if (!v.isTarget || state.out[i]) return -1;
  const line = v.orient === HORIZONTAL ? v.row : v.col;
  const found = state.exits.findIndex((e) => e.axis === v.orient && e.dir === dir && e.line === line);
  if (found === -1) return -1;

  const span = v.orient === HORIZONTAL ? state.cols : state.rows;
  const head = v.orient === HORIZONTAL ? v.col : v.row;
  const gap = dir < 0 ? head : span - (head + v.len);
  return maxSlide(state, i, dir, grid) === gap ? found : -1;
}

/**
 * Every distinct move available. One entry per (vehicle, direction, distance),
 * plus a drive-off entry for any target with a clear run to its exit.
 */
export function legalMoves(state) {
  const grid = occupancy(state);
  const moves = [];
  for (let i = 0; i < state.vehicles.length; i++) {
    if (state.out[i]) continue;
    for (const dir of [-1, 1]) {
      const reach = maxSlide(state, i, dir, grid);
      for (let d = 1; d <= reach; d++) moves.push({ vehicle: i, dir, dist: d, exit: false });
      if (exitFor(state, i, dir, grid) !== -1) {
        moves.push({ vehicle: i, dir, dist: reach, exit: true });
      }
    }
  }
  return moves;
}

/** Apply a move, returning a new state. Does not validate — see `legalMoves`. */
export function applyMove(state, move) {
  const vehicles = state.vehicles.slice();
  const out = state.out.slice();
  const v = vehicles[move.vehicle];
  const shifted = { ...v };
  if (v.orient === HORIZONTAL) shifted.col += move.dir * move.dist;
  else shifted.row += move.dir * move.dist;
  vehicles[move.vehicle] = shifted;
  if (move.exit) out[move.vehicle] = true;
  return { ...state, vehicles, out, moves: state.moves + 1 };
}

export function isSolved(state) {
  return state.vehicles.every((v, i) => !v.isTarget || state.out[i]);
}

export function isFailed(state) {
  return !isSolved(state) && state.moves >= state.moveLimit;
}

/** Positional fingerprint used as the BFS visited key. */
export function stateKey(state) {
  let key = '';
  for (let i = 0; i < state.vehicles.length; i++) {
    if (state.out[i]) {
      key += 'x|';
    } else {
      const v = state.vehicles[i];
      key += `${v.row * state.cols + v.col}|`;
    }
  }
  return key;
}

/* ------------------------------------------------------------------ */
/* Solver                                                              */
/* ------------------------------------------------------------------ */

/**
 * Breadth-first search for the shortest solution.
 *
 * This is the piece Round 1 flagged as mandatory rather than optional: the
 * solution length is simultaneously the difficulty rating, the star par, the
 * hint source, and the accept/reject test for generated levels.
 */
export function solve(start, options = {}) {
  const nodeCap = options.nodeCap ?? 400000;
  if (isSolved(start)) return { solved: true, moves: [], length: 0, nodes: 0 };

  const rootKey = stateKey(start);
  const seen = new Map([[rootKey, null]]);
  const queue = [{ state: start, key: rootKey }];
  let head = 0;
  let nodes = 0;

  while (head < queue.length) {
    const { state, key } = queue[head++];
    nodes++;
    if (nodes > nodeCap) return { solved: false, reason: 'node-cap', nodes };

    for (const move of legalMoves(state)) {
      const next = applyMove(state, move);
      const nextKey = stateKey(next);
      if (seen.has(nextKey)) continue;
      seen.set(nextKey, { from: key, move });
      if (isSolved(next)) {
        const path = [];
        for (let k = nextKey; seen.get(k); k = seen.get(k).from) path.push(seen.get(k).move);
        path.reverse();
        return { solved: true, moves: path, length: path.length, nodes };
      }
      queue.push({ state: next, key: nextKey });
    }
  }
  return { solved: false, reason: 'exhausted', nodes };
}

/** The next move on some shortest solution, or null if there isn't one. */
export function hint(state, options) {
  const result = solve(state, options);
  return result.solved && result.moves.length ? result.moves[0] : null;
}

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

/**
 * Generate-and-test level generation: scatter traffic, solve, keep the board
 * only if its optimal length lands in the requested difficulty band. Slower
 * than reverse construction from a solved state but it cannot produce an
 * unsolvable board, and at 6x6 it converges in a handful of attempts.
 */
export function generateLevel(seed, spec = {}) {
  const {
    rows = 6,
    cols = 6,
    exitRow = 2,
    cars = 10,
    minPar = 6,
    maxPar = 14,
    attempts = 400,
    nodeCap = 200000,
  } = spec;
  const rng = mulberry32(seed);
  const pick = (n) => Math.floor(rng() * n);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
    const place = (label, r, c, len, orient) => {
      for (let i = 0; i < len; i++) {
        const rr = orient === HORIZONTAL ? r : r + i;
        const cc = orient === HORIZONTAL ? c + i : c;
        if (rr >= rows || cc >= cols || grid[rr][cc] !== '.') return false;
      }
      for (let i = 0; i < len; i++) {
        if (orient === HORIZONTAL) grid[r][c + i] = label;
        else grid[r + i][c] = label;
      }
      return true;
    };

    // 'A' is the player's car: horizontal, on the exit row, away from the wall.
    if (!place('A', exitRow, pick(Math.max(1, cols - 4)), 2, HORIZONTAL)) continue;

    const alphabet = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
    let placed = 0;
    for (let tries = 0; tries < cars * 12 && placed < cars; tries++) {
      const orient = rng() < 0.5 ? HORIZONTAL : VERTICAL;
      const len = rng() < 0.72 ? 2 : 3;
      const r = pick(rows);
      const c = pick(cols);
      // A horizontal blocker on the exit row could never be moved aside.
      if (orient === HORIZONTAL && r === exitRow) continue;
      if (place(alphabet[placed], r, c, len, orient)) placed++;
    }
    if (placed < cars - 2) continue;

    const def = { name: `seed ${seed}`, grid: grid.map((line) => line.join('')), exits: [`R${exitRow}`] };
    const state = parseLevel(def);
    const result = solve(state, { nodeCap });
    if (!result.solved) continue;
    if (result.length < minPar || result.length > maxPar) continue;
    return { def: { ...def, par: result.length, moveLimit: limitForPar(result.length) }, par: result.length, attempt };
  }
  return null;
}

/** Move budget granted for a level of the given optimal length. */
export function limitForPar(par) {
  return Math.max(par + 4, Math.ceil(par * 1.8));
}

/** 3 stars at par, 2 within half again, 1 for anything inside the budget. */
export function starsFor(moves, par) {
  if (!par) return 3;
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.5)) return 2;
  return 1;
}

/* ------------------------------------------------------------------ */
/* Level pack                                                          */
/* ------------------------------------------------------------------ */

/**
 * Levels 1-3 are hand-authored, to teach the slide and then the two-gate
 * variant; 4-8 came out of `generateLevel`, kept for their solver-reported
 * par. That `par` is the BFS optimum and the tests re-derive it, so a wrong
 * number fails the build rather than quietly mis-rating a level.
 */
export const LEVELS = [
  {
    name: '第 1 关 · 出场',
    subtitle: 'One car in the way',
    grid: [
      '..B...',
      '..B...',
      'AA..C.',
      '....C.',
      'DDD...',
      '......',
    ],
    exits: ['R2'],
    par: 2,
    moveLimit: 6,
  },
  {
    name: '第 2 关 · 连环让',
    subtitle: 'Move one to move the next',
    grid: [
      '..BB..',
      '...C..',
      'AA.C.E',
      '.....E',
      'FF.D..',
      '...DGG',
    ],
    exits: ['R2'],
    par: 4,
    moveLimit: 9,
  },
  {
    name: '第 3 关 · 双闸口',
    subtitle: 'Two cars, two gates',
    grid: [
      'C.D.EE',
      'C.D.F.',
      'AA..F.',
      '.GG.HH',
      'I..BJJ',
      'I..B..',
    ],
    exits: ['R2', 'B3'],
    targets: 'AB',
    par: 6,
    moveLimit: 12,
  },
  {
    name: '第 4 关 · 早高峰',
    subtitle: 'Rush hour',
    grid: [
      '.BEED.',
      '.B.ID.',
      '.AAIDG',
      'LF.JJG',
      'LF.CC.',
      '.KK.HH',
    ],
    exits: ['R2'],
    par: 9,
    moveLimit: 17,
  },
  {
    name: '第 5 关 · 交叉锁',
    subtitle: 'Interlock',
    grid: [
      '...CCH',
      '..FIIH',
      'AAF.JL',
      'BB.EJL',
      '.K.EJ.',
      '.KGGDD',
    ],
    exits: ['R2'],
    par: 12,
    moveLimit: 22,
  },
  {
    name: '第 6 关 · 死结',
    subtitle: 'Deadlock',
    grid: [
      'JIIFFM',
      'JHH.EM',
      'AABLEK',
      'DDBLEK',
      '...GGG',
      '..CCC.',
    ],
    exits: ['R2'],
    par: 19,
    moveLimit: 35,
  },
  {
    name: '第 7 关 · 满场',
    subtitle: 'Full house',
    grid: [
      '.FF.CJ',
      '..EMCJ',
      'AAEM.J',
      '.HEGBB',
      'IH.GLL',
      'I.DDKK',
    ],
    exits: ['R2'],
    par: 23,
    moveLimit: 42,
  },
  {
    name: '第 8 关 · 地狱层',
    subtitle: 'The hard one',
    grid: [
      '..FFDD',
      'MGG..I',
      'MAAH.I',
      'KKBHC.',
      '.EBHC.',
      '.ELLJJ',
    ],
    exits: ['R2'],
    par: 34,
    moveLimit: 62,
  },
];

export function loadLevel(index) {
  const def = LEVELS[((index % LEVELS.length) + LEVELS.length) % LEVELS.length];
  return parseLevel(def);
}
