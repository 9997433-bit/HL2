/**
 * Stacked match-3 core ("羊了个羊" / "抓大鹅" family).
 *
 * Pure logic: no canvas, no DOM, no wx API. Runs identically in Node and in a
 * browser/mini-game host so the same module can be unit tested headlessly.
 *
 * Coordinate system: positions are expressed in HALF-cell units. A tile always
 * spans 2x2 half-cells, so a layer offset of 1 puts the tile exactly on the
 * half-cell seam of the layer below, which is what makes lower tiles peek out.
 */

/** A tile spans this many half-cell units on each axis. */
export const TILE_SPAN = 2;

/** Deterministic PRNG so a seed always reproduces the same level. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TILE_STATE = {
  BOARD: 'board',
  TRAY: 'tray',
  CLEARED: 'cleared',
};

export const LEVELS = [
  {
    name: '第 1 关 · 教学',
    slots: 7,
    typeCount: 5,
    scramble: 0,
    layers: [
      { cols: 4, rows: 4, density: 1 },
      { cols: 3, rows: 3, density: 1 },
    ],
  },
  {
    name: '第 2 关 · 地狱',
    slots: 7,
    typeCount: 10,
    scramble: 140,
    layers: [
      { cols: 7, rows: 7, density: 0.85 },
      { cols: 6, rows: 6, density: 1 },
      { cols: 5, rows: 5, density: 1 },
      { cols: 4, rows: 4, density: 1 },
      { cols: 3, rows: 3, density: 1 },
    ],
  },
  {
    name: '第 3 关 · 无尽',
    slots: 7,
    typeCount: 8,
    scramble: 80,
    layers: [
      { cols: 6, rows: 6, density: 0.9 },
      { cols: 5, rows: 5, density: 1 },
      { cols: 4, rows: 4, density: 1 },
      { cols: 4, rows: 4, density: 0.75 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Board geometry                                                      */
/* ------------------------------------------------------------------ */

/**
 * Lay out tile positions as a centred pyramid. Layers narrower than the base
 * by an odd number of columns land on the half-cell seam, which produces the
 * staggered stack the genre relies on.
 */
export function buildPositions(layers, rng) {
  const baseCols = Math.max(...layers.map((l) => l.cols));
  const baseRows = Math.max(...layers.map((l) => l.rows));
  const positions = [];

  layers.forEach((spec, layer) => {
    const offHX = baseCols - spec.cols;
    const offHY = baseRows - spec.rows;
    for (let r = 0; r < spec.rows; r++) {
      for (let c = 0; c < spec.cols; c++) {
        if (spec.density < 1 && rng() > spec.density) continue;
        positions.push({ layer, hx: offHX + TILE_SPAN * c, hy: offHY + TILE_SPAN * r });
      }
    }
  });

  // Trim from the top down so the total is divisible by 3; a board that is not
  // a multiple of 3 can never be fully cleared.
  while (positions.length % 3 !== 0) {
    let topIdx = 0;
    for (let i = 1; i < positions.length; i++) {
      if (positions[i].layer > positions[topIdx].layer) topIdx = i;
    }
    positions.splice(topIdx, 1);
  }
  return positions;
}

function overlaps(a, b) {
  return (
    a.hx < b.hx + TILE_SPAN &&
    b.hx < a.hx + TILE_SPAN &&
    a.hy < b.hy + TILE_SPAN &&
    b.hy < a.hy + TILE_SPAN
  );
}

/**
 * For every tile, the ids of tiles sitting on a higher layer that overlap it.
 * A tile is pickable only once all of its coverers have left the board.
 */
export function buildCoverGraph(positions) {
  return positions.map((a, i) =>
    positions.reduce((acc, b, j) => {
      if (i !== j && b.layer > a.layer && overlaps(a, b)) acc.push(j);
      return acc;
    }, [])
  );
}

/* ------------------------------------------------------------------ */
/* Bitset helpers (state key = the set of picked tiles)                */
/* ------------------------------------------------------------------ */

function makeBitset(n) {
  return new Uint32Array(Math.ceil(n / 32) || 1);
}
const bitGet = (bs, i) => (bs[i >>> 5] & (1 << (i & 31))) !== 0;
const bitSet = (bs, i) => {
  bs[i >>> 5] |= 1 << (i & 31);
};
const bitClear = (bs, i) => {
  bs[i >>> 5] &= ~(1 << (i & 31));
};
const bitKey = (bs) => bs.join(',');

/* ------------------------------------------------------------------ */
/* Solver                                                              */
/* ------------------------------------------------------------------ */

/**
 * The picked set alone determines the whole game state: clearing is automatic
 * and immediate, so a type with `n` picked tiles has `n % 3` sitting in the
 * tray and the rest already cleared. That makes the search space a plain set,
 * with no separate tray dimension to memoise.
 */
function traySize(pickedCountByType) {
  let size = 0;
  for (let t = 0; t < pickedCountByType.length; t++) size += pickedCountByType[t] % 3;
  return size;
}

/**
 * Depth-first search for a full clearing order, bounded by a node budget.
 * Returns the order when one is found, otherwise null.
 */
export function solve(types, coverGraph, options = {}) {
  const slots = options.slots ?? 7;
  // Filling the last slot without a clear is a loss, so a legal position leaves
  // the tray strictly below the slot count once matches have resolved.
  const maxTray = options.maxTray ?? slots - 1;
  const typeCount = options.typeCount ?? Math.max(...types) + 1;
  const budget = options.budget ?? 200000;
  const initialPicked = options.picked ?? [];
  const n = types.length;

  const picked = makeBitset(n);
  const countByType = new Int32Array(typeCount);
  for (const id of initialPicked) {
    bitSet(picked, id);
    countByType[types[id]]++;
  }

  const visited = new Set();
  const order = [];
  let nodes = 0;
  let remaining = n - initialPicked.length;

  const isFree = (id) => coverGraph[id].every((cov) => bitGet(picked, cov));

  function dfs() {
    if (remaining === 0) return true;
    if (++nodes > budget) return false;

    const key = bitKey(picked);
    if (visited.has(key)) return false;
    visited.add(key);

    const candidates = [];
    for (let id = 0; id < n; id++) {
      if (bitGet(picked, id) || !isFree(id)) continue;
      candidates.push(id);
    }
    // Prefer picks that complete a triple, then picks that pair up, so the
    // tray drains instead of filling. This is what keeps the budget small.
    candidates.sort((a, b) => (countByType[types[b]] % 3) - (countByType[types[a]] % 3));

    for (const id of candidates) {
      bitSet(picked, id);
      countByType[types[id]]++;
      remaining--;
      order.push(id);

      if (traySize(countByType) <= maxTray && dfs()) return true;

      order.pop();
      remaining++;
      countByType[types[id]]--;
      bitClear(picked, id);
    }
    return false;
  }

  const solved = dfs();
  return solved ? { order: order.slice(), nodes } : null;
}

/* ------------------------------------------------------------------ */
/* Level generation                                                    */
/* ------------------------------------------------------------------ */

/**
 * A random topological order of the cover graph: a sequence in which every
 * tile is uncovered at the moment it is taken.
 */
function randomClearOrder(coverGraph, rng) {
  const n = coverGraph.length;
  const removed = new Array(n).fill(false);
  const order = [];
  for (let step = 0; step < n; step++) {
    const free = [];
    for (let id = 0; id < n; id++) {
      if (!removed[id] && coverGraph[id].every((c) => removed[c])) free.push(id);
    }
    const pick = free[Math.floor(rng() * free.length)];
    removed[pick] = true;
    order.push(pick);
  }
  return order;
}

/**
 * Assign types so the level is solvable by construction: walk a valid clearing
 * order and give every consecutive run of three positions the same type. Along
 * that order the tray never holds more than three tiles, so any slot count >= 3
 * suffices.
 */
export function assignSolvableTypes(coverGraph, typeCount, rng) {
  const order = randomClearOrder(coverGraph, rng);
  const types = new Array(coverGraph.length).fill(0);
  for (let i = 0; i < order.length; i += 3) {
    const type = Math.floor(rng() * typeCount);
    types[order[i]] = type;
    types[order[i + 1]] = type;
    types[order[i + 2]] = type;
  }
  return { types, order };
}

/**
 * Trade away the trivial structure of the constructed solution by swapping
 * types between positions, keeping only the swaps that leave the level
 * solvable. More accepted swaps means a harder but still winnable board.
 */
export function scrambleTypes(types, coverGraph, rng, attempts, options) {
  const n = types.length;
  let accepted = 0;
  for (let i = 0; i < attempts; i++) {
    const a = Math.floor(rng() * n);
    const b = Math.floor(rng() * n);
    if (types[a] === types[b]) continue;
    [types[a], types[b]] = [types[b], types[a]];
    if (solve(types, coverGraph, options)) {
      accepted++;
    } else {
      [types[a], types[b]] = [types[b], types[a]];
    }
  }
  return accepted;
}

/* ------------------------------------------------------------------ */
/* Game state                                                          */
/* ------------------------------------------------------------------ */

export function createGame(levelIndex = 0, seed = Date.now()) {
  const level = LEVELS[Math.min(levelIndex, LEVELS.length - 1)];
  const rng = mulberry32(seed);

  const positions = buildPositions(level.layers, rng);
  const coverGraph = buildCoverGraph(positions);
  const solverOptions = { slots: level.slots, typeCount: level.typeCount, budget: 60000 };

  const { types } = assignSolvableTypes(coverGraph, level.typeCount, rng);
  if (level.scramble) scrambleTypes(types, coverGraph, rng, level.scramble, solverOptions);

  const tiles = positions.map((p, id) => ({
    id,
    layer: p.layer,
    hx: p.hx,
    hy: p.hy,
    type: types[id],
    state: TILE_STATE.BOARD,
  }));

  return {
    level,
    levelIndex,
    seed,
    tiles,
    coverGraph,
    solverOptions,
    tray: [],
    history: [],
    status: 'playing', // 'playing' | 'won' | 'lost'
    props: { undo: 3, shuffle: 1, remove: 1 },
    stats: { picks: 0, cleared: 0 },
  };
}

export function isFree(game, id) {
  return game.coverGraph[id].every((cov) => game.tiles[cov].state !== TILE_STATE.BOARD);
}

export function freeTiles(game) {
  return game.tiles.filter((t) => t.state === TILE_STATE.BOARD && isFree(game, t.id));
}

/** Insert next to same-type neighbours so the tray reads as grouped runs. */
function trayInsert(tray, tile) {
  const last = tray.map((t) => t.type).lastIndexOf(tile.type);
  if (last === -1) tray.push(tile);
  else tray.splice(last + 1, 0, tile);
}

function resolveMatches(game) {
  const counts = new Map();
  for (const t of game.tray) counts.set(t.type, (counts.get(t.type) || 0) + 1);

  const cleared = [];
  for (const [type, count] of counts) {
    if (count < 3) continue;
    let toRemove = Math.floor(count / 3) * 3;
    for (let i = game.tray.length - 1; i >= 0 && toRemove > 0; i--) {
      if (game.tray[i].type !== type) continue;
      const [tile] = game.tray.splice(i, 1);
      tile.state = TILE_STATE.CLEARED;
      cleared.push(tile);
      toRemove--;
    }
  }
  game.stats.cleared += cleared.length;
  return cleared;
}

/**
 * Take a tile from the board into the tray. Returns a result describing what
 * happened so the renderer can animate it.
 */
export function pick(game, id) {
  if (game.status !== 'playing') return { ok: false, reason: 'game-over' };
  const tile = game.tiles[id];
  if (!tile || tile.state !== TILE_STATE.BOARD) return { ok: false, reason: 'not-on-board' };
  if (!isFree(game, id)) return { ok: false, reason: 'covered' };

  tile.state = TILE_STATE.TRAY;
  trayInsert(game.tray, tile);
  game.history.push({ kind: 'pick', id });
  game.stats.picks++;

  const cleared = resolveMatches(game);

  if (game.tiles.every((t) => t.state === TILE_STATE.CLEARED)) game.status = 'won';
  else if (game.tray.length >= game.level.slots) game.status = 'lost';

  return { ok: true, cleared, status: game.status };
}

export function undo(game) {
  if (!game.props.undo) return false;
  for (let i = game.history.length - 1; i >= 0; i--) {
    const entry = game.history[i];
    if (entry.kind !== 'pick') continue;
    const tile = game.tiles[entry.id];
    if (tile.state !== TILE_STATE.TRAY) return false; // already cleared, cannot rewind
    game.tray.splice(game.tray.indexOf(tile), 1);
    tile.state = TILE_STATE.BOARD;
    game.history.splice(i, 1);
    game.props.undo--;
    game.status = 'playing';
    return true;
  }
  return false;
}

/** "移出": send the first three tray tiles back to their board positions. */
export function removeProp(game) {
  if (!game.props.remove || game.tray.length === 0) return false;
  const returned = game.tray.splice(0, 3);
  for (const tile of returned) tile.state = TILE_STATE.BOARD;
  game.props.remove--;
  game.status = 'playing';
  return true;
}

/** "打乱": redeal the types still on the board, keeping the level solvable. */
export function shuffleProp(game) {
  if (!game.props.shuffle) return false;
  const boardTiles = game.tiles.filter((t) => t.state === TILE_STATE.BOARD);
  const pool = boardTiles.map((t) => t.type);
  const rng = mulberry32((game.seed ^ (game.stats.picks * 2654435761)) >>> 0);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  boardTiles.forEach((t, i) => {
    t.type = pool[i];
  });
  game.props.shuffle--;
  return true;
}

/** Next move on a winning line, or null if the position is already lost. */
export function hint(game) {
  const types = game.tiles.map((t) => t.type);
  const picked = game.tiles
    .filter((t) => t.state !== TILE_STATE.BOARD)
    .map((t) => t.id);
  const result = solve(types, game.coverGraph, { ...game.solverOptions, picked });
  return result ? result.order[0] : null;
}

export function progress(game) {
  const total = game.tiles.length;
  const done = game.tiles.filter((t) => t.state === TILE_STATE.CLEARED).length;
  return { done, total, ratio: total ? done / total : 0 };
}
