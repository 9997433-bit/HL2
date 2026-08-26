import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HORIZONTAL,
  LEVELS,
  VERTICAL,
  applyMove,
  cellsOf,
  exitFor,
  generateLevel,
  hint,
  isFailed,
  isSolved,
  legalMoves,
  limitForPar,
  loadLevel,
  maxSlide,
  mulberry32,
  occupancy,
  parseLevel,
  solve,
  starsFor,
  stateKey,
  toAscii,
} from '../src/core.js';

const TUTORIAL = {
  name: 'fixture',
  grid: [
    '..B...',
    '..B...',
    'AA..C.',
    '....C.',
    'DDD...',
    '......',
  ],
  exits: ['R2'],
};

/* ---------------------------------------------------------------- */
/* Parsing                                                           */
/* ---------------------------------------------------------------- */

test('parseLevel reads vehicles out of the ASCII map', () => {
  const state = parseLevel(TUTORIAL);
  assert.equal(state.rows, 6);
  assert.equal(state.cols, 6);
  assert.deepEqual(
    state.vehicles.map((v) => v.label),
    ['A', 'B', 'C', 'D']
  );

  const target = state.vehicles[0];
  assert.deepEqual(
    { ...target },
    { label: 'A', row: 2, col: 0, len: 2, orient: HORIZONTAL, isTarget: true }
  );
  assert.equal(state.vehicles[1].orient, VERTICAL);
  assert.equal(state.vehicles[3].len, 3);
  assert.equal(state.vehicles[1].isTarget, false);
});

test('parseLevel reads exits from wall codes', () => {
  const state = parseLevel({ ...TUTORIAL, exits: ['R2', 'B4', 'L0', 'T1'] });
  assert.deepEqual(state.exits, [
    { axis: HORIZONTAL, dir: 1, line: 2, code: 'R2' },
    { axis: VERTICAL, dir: 1, line: 4, code: 'B4' },
    { axis: HORIZONTAL, dir: -1, line: 0, code: 'L0' },
    { axis: VERTICAL, dir: -1, line: 1, code: 'T1' },
  ]);
});

test('parseLevel rejects malformed maps', () => {
  const bad = (patch, message) =>
    assert.throws(() => parseLevel({ ...TUTORIAL, ...patch }), new RegExp(message));

  bad({ grid: ['AA.', '..'] }, 'different widths');
  bad({ grid: ['A.A...', '......', '......'] }, 'has a gap');
  bad({ grid: ['AA....', '.A....', '......'] }, 'not a straight line');
  bad({ grid: ['A.....', '......'] }, 'shorter than 2 cells');
  bad({ grid: ['BB....', '......'] }, 'no target');
  bad({ exits: [] }, 'no exit');
  bad({ exits: ['Q2'] }, 'bad exit');
});

test('toAscii round-trips the board', () => {
  assert.deepEqual(toAscii(parseLevel(TUTORIAL)), TUTORIAL.grid);
});

/* ---------------------------------------------------------------- */
/* Sliding rules                                                     */
/* ---------------------------------------------------------------- */

test('maxSlide stops at walls and at other cars', () => {
  const state = parseLevel(TUTORIAL);
  const index = (label) => state.vehicles.findIndex((v) => v.label === label);

  assert.equal(maxSlide(state, index('A'), -1), 0, 'A is already against the left wall');
  assert.equal(maxSlide(state, index('A'), 1), 2, 'A stops beside C');
  assert.equal(maxSlide(state, index('B'), -1), 0, 'B is against the top wall');
  assert.equal(maxSlide(state, index('B'), 1), 2, 'B stops on top of D');
  assert.equal(maxSlide(state, index('D'), 1), 3, 'D slides to the right wall');
});

test('applyMove leaves the previous state untouched', () => {
  const before = parseLevel(TUTORIAL);
  const snapshot = toAscii(before);
  const after = applyMove(before, { vehicle: 0, dir: 1, dist: 2, exit: false });

  assert.deepEqual(toAscii(before), snapshot);
  assert.equal(before.moves, 0);
  assert.equal(after.moves, 1);
  assert.equal(after.vehicles[0].col, 2);
});

test('no legal move ever overlaps two cars', () => {
  const rng = mulberry32(20260826);
  let state = loadLevel(4);
  for (let step = 0; step < 400; step++) {
    const moves = legalMoves(state);
    assert.ok(moves.length > 0, 'board should never be fully frozen');
    state = applyMove(state, moves[Math.floor(rng() * moves.length)]);

    const seen = new Set();
    state.vehicles.forEach((v, i) => {
      if (state.out[i]) return;
      for (const { r, c } of cellsOf(v)) {
        assert.ok(r >= 0 && c >= 0 && r < state.rows && c < state.cols, 'car stayed on the lot');
        assert.ok(!seen.has(`${r},${c}`), 'cars did not overlap');
        seen.add(`${r},${c}`);
      }
    });
    if (isSolved(state)) state = loadLevel(4);
  }
});

test('occupancy marks exactly the cells the cars cover', () => {
  const state = parseLevel(TUTORIAL);
  const grid = occupancy(state);
  const filled = [...grid].filter((v) => v !== -1).length;
  const expected = state.vehicles.reduce((sum, v) => sum + v.len, 0);
  assert.equal(filled, expected);
  assert.equal(grid[2 * 6 + 0], 0, 'A occupies (2,0)');
  assert.equal(grid[2 * 6 + 2], -1, 'the lane beside A is clear');
});

/* ---------------------------------------------------------------- */
/* Exits                                                             */
/* ---------------------------------------------------------------- */

test('only a target with a clear run may leave', () => {
  const state = parseLevel(TUTORIAL);
  assert.equal(exitFor(state, 0, 1), -1, 'C is still parked in the lane');

  const cIndex = state.vehicles.findIndex((v) => v.label === 'C');
  const cleared = applyMove(state, { vehicle: cIndex, dir: 1, dist: 2, exit: false });
  assert.equal(exitFor(cleared, 0, 1), 0, 'lane open, A can leave');
  assert.equal(exitFor(cleared, 0, -1), -1, 'there is no gap in the left wall');
  assert.equal(exitFor(cleared, cIndex, 1), -1, 'blockers never leave');

  const gone = applyMove(cleared, { vehicle: 0, dir: 1, dist: 4, exit: true });
  assert.ok(gone.out[0]);
  assert.ok(isSolved(gone));
  assert.equal(occupancy(gone)[2 * 6 + 0], -1, 'the freed stall is reusable');
});

test('an exit only opens on the matching wall and line', () => {
  const state = parseLevel({ ...TUTORIAL, exits: ['R3'] });
  const cIndex = state.vehicles.findIndex((v) => v.label === 'C');
  const cleared = applyMove(state, { vehicle: cIndex, dir: 1, dist: 2, exit: false });
  assert.equal(exitFor(cleared, 0, 1), -1, 'the gap is one row below A');
});

test('every target must leave before the level is solved', () => {
  const state = loadLevel(2);
  const targets = state.vehicles.filter((v) => v.isTarget);
  assert.equal(targets.length, 2, 'level 3 is the two-gate level');

  const result = solve(state);
  let played = state;
  for (const move of result.moves) {
    assert.equal(isSolved(played), false, 'not solved before the final move');
    played = applyMove(played, move);
  }
  assert.ok(isSolved(played));
  assert.ok(played.out.every((gone, i) => gone === played.vehicles[i].isTarget));
});

/* ---------------------------------------------------------------- */
/* Solver                                                            */
/* ---------------------------------------------------------------- */

test('stateKey separates positions and departures', () => {
  const state = parseLevel(TUTORIAL);
  const moved = applyMove(state, { vehicle: 0, dir: 1, dist: 1, exit: false });
  const back = applyMove(moved, { vehicle: 0, dir: -1, dist: 1, exit: false });

  assert.notEqual(stateKey(state), stateKey(moved));
  assert.equal(stateKey(state), stateKey(back), 'a move and its undo are the same board');
  assert.equal(stateKey(state).split('|').length - 1, state.vehicles.length);
});

test('solve returns a shortest, replayable solution', () => {
  const state = parseLevel(TUTORIAL);
  const result = solve(state);
  assert.ok(result.solved);
  assert.equal(result.length, 2);

  let played = state;
  for (const move of result.moves) {
    const legal = legalMoves(played);
    assert.ok(
      legal.some((m) => m.vehicle === move.vehicle && m.dir === move.dir && m.dist === move.dist && m.exit === move.exit),
      'each solution move is legal in the state it is played from'
    );
    played = applyMove(played, move);
  }
  assert.ok(isSolved(played));
  assert.equal(played.moves, result.length);
});

test('solve reports an unsolvable lot rather than hanging', () => {
  const walled = solve(
    parseLevel({
      name: 'sealed',
      grid: [
        '.....B',
        '.....B',
        'AA...B',
        '.....B',
        '.....B',
        '.....B',
      ],
      exits: ['R2'],
    })
  );
  assert.equal(walled.solved, false);
  assert.equal(walled.reason, 'exhausted');

  const capped = solve(parseLevel(LEVELS[6]), { nodeCap: 50 });
  assert.equal(capped.solved, false);
  assert.equal(capped.reason, 'node-cap');
});

test('hint gives the first move of a shortest solution', () => {
  const state = parseLevel(TUTORIAL);
  const next = hint(state);
  assert.equal(state.vehicles[next.vehicle].label, 'C');
  assert.equal(solve(applyMove(state, next)).length, 1);
  assert.equal(hint(applyMove(applyMove(state, next), hint(applyMove(state, next)))), null);
});

/* ---------------------------------------------------------------- */
/* Shipped levels                                                    */
/* ---------------------------------------------------------------- */

test('every shipped level is solvable and its par is the true optimum', { timeout: 120000 }, () => {
  LEVELS.forEach((def, i) => {
    const state = loadLevel(i);
    const result = solve(state, { nodeCap: 600000 });
    assert.ok(result.solved, `${def.name} is unsolvable`);
    assert.equal(result.length, def.par, `${def.name} declares the wrong par`);
    assert.ok(def.moveLimit > def.par, `${def.name} has an unwinnable move budget`);
    assert.ok(def.moveLimit >= limitForPar(def.par) - 1, `${def.name} budget is too tight to be fun`);
  });
});

test('the level pack ramps in difficulty', () => {
  const pars = LEVELS.map((def) => def.par);
  for (let i = 1; i < pars.length; i++) {
    assert.ok(pars[i] > pars[i - 1], `level ${i + 1} is not harder than level ${i}`);
  }
  assert.ok(pars[0] <= 3, 'the first level should be a two-move tutorial');
});

test('loadLevel wraps around and returns independent states', () => {
  const first = loadLevel(0);
  assert.equal(loadLevel(LEVELS.length).name, first.name);
  assert.equal(loadLevel(-1).name, LEVELS[LEVELS.length - 1].name);

  const moved = applyMove(first, legalMoves(first)[0]);
  assert.deepEqual(toAscii(loadLevel(0)), LEVELS[0].grid);
  assert.notDeepEqual(toAscii(moved), LEVELS[0].grid);
});

/* ---------------------------------------------------------------- */
/* Generation and scoring                                            */
/* ---------------------------------------------------------------- */

test('generateLevel only emits boards inside the requested difficulty band', { timeout: 120000 }, () => {
  const spec = { cars: 10, minPar: 7, maxPar: 12, attempts: 300, nodeCap: 200000 };
  const generated = generateLevel(4242, spec);
  assert.ok(generated, 'generator found a board');
  assert.ok(generated.par >= spec.minPar && generated.par <= spec.maxPar);

  const state = parseLevel(generated.def);
  assert.equal(solve(state).length, generated.par);
  assert.equal(generated.def.moveLimit, limitForPar(generated.par));
  assert.ok(!isSolved(state), 'a generated board never starts solved');
});

test('generateLevel is deterministic for a seed', () => {
  const spec = { cars: 9, minPar: 5, maxPar: 12, attempts: 200 };
  assert.deepEqual(generateLevel(99, spec)?.def.grid, generateLevel(99, spec)?.def.grid);
});

test('generateLevel gives up instead of looping forever', () => {
  assert.equal(generateLevel(7, { cars: 10, minPar: 400, maxPar: 500, attempts: 12 }), null);
});

test('stars and the move budget bracket player performance', () => {
  assert.equal(starsFor(10, 10), 3);
  assert.equal(starsFor(9, 10), 3);
  assert.equal(starsFor(15, 10), 2);
  assert.equal(starsFor(16, 10), 1);
  assert.equal(starsFor(4, null), 3, 'levels without a par never punish');

  assert.equal(limitForPar(2), 6);
  assert.equal(limitForPar(20), 36);
});

test('running out of moves is a loss, but only while unsolved', () => {
  const state = { ...parseLevel(TUTORIAL), moveLimit: 1 };
  assert.equal(isFailed(state), false);

  const cIndex = state.vehicles.findIndex((v) => v.label === 'C');
  const spent = applyMove(state, { vehicle: cIndex, dir: 1, dist: 2, exit: false });
  assert.equal(isFailed(spent), true, 'budget spent with the target still parked');

  const won = applyMove({ ...spent, moveLimit: 2 }, { vehicle: 0, dir: 1, dist: 4, exit: true });
  assert.equal(isSolved(won), true);
  assert.equal(isFailed(won), false, 'a win on the last move is not a loss');
});
