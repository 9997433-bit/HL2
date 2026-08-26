import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LEVELS,
  TILE_STATE,
  assignSolvableTypes,
  buildCoverGraph,
  buildPositions,
  createGame,
  freeTiles,
  hint,
  mulberry32,
  pick,
  progress,
  removeProp,
  shuffleProp,
  solve,
  undo,
} from '../src/core.js';

test('mulberry32 is deterministic for a given seed', () => {
  const a = mulberry32(1234);
  const b = mulberry32(1234);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('board size is always a multiple of three', () => {
  for (const level of LEVELS) {
    for (let seed = 0; seed < 20; seed++) {
      const positions = buildPositions(level.layers, mulberry32(seed));
      assert.equal(positions.length % 3, 0, `${level.name} seed ${seed}`);
    }
  }
});

test('cover graph only points upward and only at overlapping tiles', () => {
  const positions = buildPositions(LEVELS[1].layers, mulberry32(7));
  const graph = buildCoverGraph(positions);
  graph.forEach((coverers, id) => {
    for (const cov of coverers) {
      assert.ok(positions[cov].layer > positions[id].layer);
      const a = positions[id];
      const b = positions[cov];
      assert.ok(a.hx < b.hx + 2 && b.hx < a.hx + 2);
      assert.ok(a.hy < b.hy + 2 && b.hy < a.hy + 2);
    }
  });
});

test('the top layer is never covered and the board always opens with a legal move', () => {
  const game = createGame(1, 99);
  const top = Math.max(...game.tiles.map((t) => t.layer));
  for (const tile of game.tiles) {
    if (tile.layer === top) assert.equal(game.coverGraph[tile.id].length, 0);
  }
  assert.ok(freeTiles(game).length > 0);
});

test('constructed type assignment never needs more than three tray slots', () => {
  const positions = buildPositions(LEVELS[2].layers, mulberry32(5));
  const graph = buildCoverGraph(positions);
  const { types, order } = assignSolvableTypes(graph, 8, mulberry32(5));

  const removed = new Array(positions.length).fill(false);
  const counts = new Map();
  let peak = 0;

  for (const id of order) {
    assert.ok(graph[id].every((c) => removed[c]), 'picked a covered tile');
    removed[id] = true;
    counts.set(types[id], (counts.get(types[id]) || 0) + 1);
    let tray = 0;
    for (const c of counts.values()) tray += c % 3;
    peak = Math.max(peak, tray);
  }
  assert.ok(peak <= 3, `peak tray was ${peak}`);
});

test('every generated level is solvable within the slot limit', () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex++) {
    for (let seed = 1; seed <= 6; seed++) {
      const game = createGame(levelIndex, seed * 1013);
      const types = game.tiles.map((t) => t.type);
      const result = solve(types, game.coverGraph, game.solverOptions);
      assert.ok(result, `${game.level.name} seed ${seed} unsolvable`);
      assert.equal(result.order.length, game.tiles.length);
    }
  }
});

test('replaying the solver order wins the game', () => {
  const game = createGame(1, 4242);
  const plan = solve(
    game.tiles.map((t) => t.type),
    game.coverGraph,
    game.solverOptions
  );
  for (const id of plan.order) {
    const res = pick(game, id);
    assert.ok(res.ok, `pick ${id} rejected: ${res.reason}`);
  }
  assert.equal(game.status, 'won');
  assert.equal(progress(game).ratio, 1);
  assert.equal(game.tray.length, 0);
});

test('covered tiles cannot be picked until uncovered', () => {
  const game = createGame(1, 31337);
  const covered = game.tiles.find((t) => game.coverGraph[t.id].length > 0);
  assert.equal(pick(game, covered.id).ok, false);

  for (const cov of game.coverGraph[covered.id]) {
    game.tiles[cov].state = TILE_STATE.CLEARED;
  }
  assert.equal(pick(game, covered.id).ok, true);
});

test('three of a kind clear and a full tray loses', () => {
  const game = createGame(0, 11);
  // Force a known board: three free tiles of one type, the rest distinct.
  const free = freeTiles(game).slice(0, 3);
  free.forEach((t) => {
    t.type = 0;
  });
  for (const res of free.map((t) => pick(game, t.id))) assert.ok(res.ok);
  assert.equal(game.tray.length, 0);
  assert.equal(progress(game).done, 3);

  const rest = freeTiles(game).slice(0, game.level.slots);
  rest.forEach((t, i) => {
    t.type = 100 + i;
  });
  for (const t of rest) pick(game, t.id);
  assert.equal(game.status, 'lost');
});

test('undo returns the last tray tile to the board and clears a loss', () => {
  const game = createGame(0, 55);
  const tile = freeTiles(game)[0];
  pick(game, tile.id);
  assert.equal(tile.state, TILE_STATE.TRAY);

  assert.equal(undo(game), true);
  assert.equal(tile.state, TILE_STATE.BOARD);
  assert.equal(game.tray.length, 0);
  assert.equal(game.props.undo, 2);
});

test('the remove prop empties up to three tray slots back onto the board', () => {
  const game = createGame(1, 808);
  const free = freeTiles(game).slice(0, 4);
  free.forEach((t, i) => {
    t.type = 200 + i;
  });
  free.forEach((t) => pick(game, t.id));
  assert.equal(game.tray.length, 4);

  assert.equal(removeProp(game), true);
  assert.equal(game.tray.length, 1);
  assert.equal(free.slice(0, 3).every((t) => t.state === TILE_STATE.BOARD), true);
});

test('shuffle preserves the multiset of board types', () => {
  const game = createGame(2, 616);
  const before = game.tiles
    .filter((t) => t.state === TILE_STATE.BOARD)
    .map((t) => t.type)
    .sort((a, b) => a - b);

  assert.equal(shuffleProp(game), true);

  const after = game.tiles
    .filter((t) => t.state === TILE_STATE.BOARD)
    .map((t) => t.type)
    .sort((a, b) => a - b);
  assert.deepEqual(after, before);
});

test('hint proposes a legal move from mid-game positions', () => {
  const game = createGame(1, 2026);
  for (let i = 0; i < 6 && game.status === 'playing'; i++) {
    const id = hint(game);
    assert.notEqual(id, null, 'no hint available on a solvable board');
    assert.ok(pick(game, id).ok);
  }
  assert.equal(game.status, 'playing');
});

test('scrambling makes the hard level genuinely harder than the tutorial', () => {
  const easy = createGame(0, 77);
  const hard = createGame(1, 77);
  assert.ok(hard.tiles.length > easy.tiles.length);
  assert.ok(hard.level.typeCount > easy.level.typeCount);
});
