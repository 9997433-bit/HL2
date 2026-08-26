// Loads index.html's script into a stubbed DOM and auto-plays it, so the checks
// exercise the shipped game code rather than a copy of it.
//
//   node prototypes/tile-trio/verify.js
//
// Asserts: every level's tile count is divisible by three, a greedy solver can
// clear each level, tiles are conserved across undo/shuffle/pull-out, no tile is
// unreachable, and the wx-shim platform loop (rewarded video -> prop, share
// return -> revive, cloud storage -> friend board) actually fires.
const fs = require('fs'), vm = require('vm'), path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('no <script> found');
const shimSrc = fs.readFileSync(path.join(__dirname, '..', 'shared', 'wx-shim.js'), 'utf8');

const noop = () => {};
const ctxStub = new Proxy({}, {
  get(t, k) {
    if (k in t) return t[k];
    if (k === 'createLinearGradient') return () => ({ addColorStop: noop });
    if (k === 'measureText') return () => ({ width: 10 });
    return noop;                      // any drawing call is a no-op
  },
  set(t, k, v) { t[k] = v; return true; }
});

const els = {};
function el(id) {
  if (!els[id]) els[id] = {
    id, textContent: '', innerHTML: '', dataset: {},
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, contains(c){return this._s.has(c);} },
    // Listeners are kept so the checks can press the shim-driven buttons.
    _h: {},
    addEventListener(type, fn) { (this._h[type] || (this._h[type] = [])).push(fn); },
    fire(type, ev) { (this._h[type] || []).forEach(fn => fn(ev || { preventDefault: noop })); },
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 820 }),
    width: 0, height: 0, style: {}
  };
  return els[id];
}

const levelButtons = [0, 1, 2].map(i => Object.assign(el('lvl' + i), { dataset: { level: String(i) } }));
let rafCb = null;
const quiet = { log: () => {}, info: () => {}, warn: console.warn, error: console.error };
const sandbox = {
  console: quiet,
  document: {
    getElementById: el,
    querySelectorAll: sel => (sel === '[data-level]' ? levelButtons : []),
    addEventListener: noop
  },
  window: { devicePixelRatio: 2 },
  navigator: { vibrate: noop },
  performance: { now: () => Date.now() },
  requestAnimationFrame: cb => { rafCb = cb; return 1; },
  setTimeout: (fn) => { fn(); return 0; },       // run deferred clears immediately
  clearTimeout: noop,
  addEventListener: noop,
  Math, Date, JSON, URLSearchParams,
  location: { search: '' }
};
sandbox.globalThis = sandbox;
sandbox.window.addEventListener = noop;

const src = m[1] + `
;globalThis.__api = {
  startLevel, sendToTray, isLocked, useShuffle, usePull, useUndo, draw, check,
  buildPositions, peelOrder, dealSymbols, overlaps, LAYER_OFFSET, TILE,
  end, revive, submitScore, watchAd, shim,
  get tiles(){return tiles;}, get tray(){return tray;}, get running(){return running;},
  get props(){return props;}, LEVELS, TRAY_SLOTS
};`;

vm.createContext(sandbox);
// The page loads the shared shim from a <script src>, so the sandbox has to as
// well — otherwise these checks would test a game that never sees wx.*.
vm.runInContext(shimSrc, sandbox, { filename: 'shared/wx-shim.js' });
vm.runInContext(src, sandbox, { filename: 'index.html<script>' });
const api = sandbox.__api;

// the render loop must survive a frame before any level is dealt
if (typeof rafCb !== 'function') throw new Error('render loop never scheduled');
rafCb(0);

function autoplay(levelIdx, useProps) {
  api.startLevel(levelIdx);
  let guard = 0;
  while (api.running && guard++ < 4000) {
    const free = api.tiles.filter(t => t.state === 'board' && !api.isLocked(t));
    if (!free.length) break;
    const cnt = {}; api.tray.forEach(t => cnt[t.type] = (cnt[t.type] || 0) + 1);
    const score = t => {
      const inTray = cnt[t.type] || 0, same = free.filter(o => o.type === t.type).length;
      if (inTray === 2) return 1000;
      if (inTray === 1 && same >= 2) return 900;
      if (same >= 3) return 800;
      if (inTray === 1 && same >= 1) return 700;
      return 100 - api.tray.length * 10 + t.layer;
    };
    const best = free.slice().sort((a, b) => score(b) - score(a))[0];
    if (useProps && score(best) < 200 && api.tray.length >= api.TRAY_SLOTS - 1) {
      if (api.props.pull > 0 && api.tray.length >= 3) { api.usePull(); continue; }
      if (api.props.shuffle > 0) { api.useShuffle(); continue; }
    }
    api.sendToTray(best);
    rafCb(guard);                                  // draw every frame; catches render crashes
  }
  return {
    win: api.tiles.every(t => t.state === 'gone'),
    left: api.tiles.filter(t => t.state !== 'gone').length,
    total: api.tiles.length
  };
}

let fail = false;

// The core claim: symbols painted onto a legal removal order mean that order is
// always winnable. Drive the shipped generator, then replay the very order it
// was built around and check nothing is ever locked and the tray never fills.
function guaranteedLine(spec) {
  const tiles = api.buildPositions(spec)
    .map((p, i) => ({ id: i, bx: p.x, by: p.y, layer: p.layer, gone: false }));
  const order = api.peelOrder(tiles);
  api.dealSymbols(order, spec.types);

  const tray = []; let peak = 0;
  for (const t of order) {
    if (tiles.some(o => !o.gone && o.layer > t.layer && api.overlaps(o, t)))
      return { ok: false, why: 'locked tile in the intended order' };
    t.gone = true;
    let at = -1;
    for (let i = tray.length - 1; i >= 0; i--) if (tray[i].type === t.type) { at = i; break; }
    if (at >= 0) tray.splice(at + 1, 0, t); else tray.push(t);
    const same = tray.filter(x => x.type === t.type);
    if (same.length >= 3) same.slice(0, 3).forEach(x => tray.splice(tray.indexOf(x), 1));
    peak = Math.max(peak, tray.length);
    if (tray.length >= api.TRAY_SLOTS) return { ok: false, why: 'tray overflowed at ' + tray.length };
  }
  return { ok: tray.length === 0, peak, why: tray.length ? 'tray not empty at the end' : '' };
}

for (const spec of api.LEVELS) {
  const N = 300; let ok = 0, peak = 0, why = '';
  for (let k = 0; k < N; k++) {
    const r = guaranteedLine(spec);
    if (r.ok) ok++; else why = r.why;
    peak = Math.max(peak, r.peak || 0);
  }
  console.log(`${spec.name}: intended line winnable ${ok}/${N}, peak tray ${peak}/${api.TRAY_SLOTS}` +
              (ok < N ? '  !! ' + why : ''));
  if (ok < N) fail = true;
}

for (let i = 0; i < api.LEVELS.length; i++) {
  const N = 60; let wins = 0, clearedPct = 0;
  for (let k = 0; k < N; k++) {
    const r = autoplay(i, true);
    if (r.win) wins++;
    clearedPct += (r.total - r.left) / r.total;
  }
  const total = api.tiles.length;
  console.log(`${api.LEVELS[i].name}: ${total} tiles, solver cleared ${wins}/${N} runs, ` +
              `avg board cleared ${(clearedPct / N * 100).toFixed(0)}%`);
  if (total % 3 !== 0) { console.log('  !! tile count not divisible by 3'); fail = true; }
  if (wins === 0) { console.log('  !! solver never cleared this level'); fail = true; }
}

// props must not corrupt state
api.startLevel(1);
const before = api.tiles.length;
api.sendToTray(api.tiles.filter(t => t.state === 'board' && !api.isLocked(t))[0]);
api.sendToTray(api.tiles.filter(t => t.state === 'board' && !api.isLocked(t))[0]);
api.useUndo();
api.useShuffle();
api.usePull();
rafCb(0);
const boardPlusTray = api.tiles.filter(t => t.state === 'board').length + api.tray.length;
const gone = api.tiles.filter(t => t.state === 'gone').length;
console.log(`props: total ${before}, board+tray ${boardPlusTray}, gone ${gone} -> ${boardPlusTray + gone === before ? 'conserved' : 'LEAK'}`);
if (boardPlusTray + gone !== before) fail = true;

// every tile must be reachable: peel the whole board with no matching rule
api.startLevel(2);
let peeled = 0, g = 0;
while (g++ < 500) {
  const free = api.tiles.filter(t => t.state === 'board' && !api.isLocked(t));
  if (!free.length) break;
  free[0].state = 'gone'; peeled++;
}
console.log(`reachability: peeled ${peeled}/${api.tiles.length} tiles ${peeled === api.tiles.length ? '(no unreachable tiles)' : '!! UNREACHABLE TILES'}`);
if (peeled !== api.tiles.length) fail = true;

/* ---------------------------------------------------------------------------
   wx-shim platform loop. These four checks are the product half of the game:
   without them the prototype is a mechanic demo with no monetisation, no viral
   loop and no social proof. */
const shim = api.shim;
function check(label, ok, detail) {
  console.log(`${label}: ${detail}${ok ? '' : '  !! FAILED'}`);
  if (!ok) fail = true;
}

// 1. one free use per prop, then a rewarded video pays for the next one
api.startLevel(0);
const showsBefore = shim.calls('rewardedAd.show').length;
api.useShuffle();                                   // free
const freeLeft = api.props.shuffle;
api.useShuffle();                                   // must open an ad
const shows = shim.calls('rewardedAd.show').length - showsBefore;
check('rewarded video',
  freeLeft === 0 && shows === 1 && shim.currentAd === null,
  `first use free (${freeLeft} left), second use opened ${shows} ad, ` +
  `player watched it through and the ad closed: ${shim.currentAd === null}`);

// 2. a win writes the score to cloud storage and reads the friend board back
let won = false;
for (let attempt = 0; attempt < 20 && !won; attempt++) won = autoplay(0, true).win;
const wrote = won && shim.calls('wx.setUserCloudStorage').length > 0;
const boardRows = (els.board.innerHTML.match(/class="row/g) || []).length;
check('friend leaderboard',
  wrote && boardRows === shim.friends.length + 1,
  `setUserCloudStorage ${wrote ? 'called' : 'NOT called'}, board rendered ${boardRows} rows ` +
  `(self + ${shim.friends.length} mock friends)`);

// 3. share-to-revive: the revive hangs off the simulated return trip, not off
//    the share call, because the real wx.shareAppMessage never reports success
api.startLevel(1);
while (api.tray.length < 3) {
  const free = api.tiles.filter(t => t.state === 'board' && !api.isLocked(t));
  if (!free.length) break;
  api.sendToTray(free[0]);
}
const trayBefore = api.tray.length;
api.end(false);
els.btnShareRevive.fire('click');
check('share revive',
  api.running && api.tray.length === trayBefore - 3 && shim.calls('wx.shareAppMessage').length > 0,
  `shared, friend opened the card, tray ${trayBefore} -> ${api.tray.length}, running ${api.running}`);

// 4. ad revive goes through the same rewarded unit
while (api.tray.length < 3) {
  const free = api.tiles.filter(t => t.state === 'board' && !api.isLocked(t));
  if (!free.length) break;
  api.sendToTray(free[0]);
}
const showsBeforeRevive = shim.calls('rewardedAd.show').length;
const trayBeforeRevive = api.tray.length;
api.end(false);
els.btnAdRevive.fire('click');
check('ad revive',
  shim.calls('rewardedAd.show').length === showsBeforeRevive + 1 &&
  api.tray.length === trayBeforeRevive - 3 && api.running,
  `rewarded video watched, tray ${trayBeforeRevive} -> ${api.tray.length}, running ${api.running}`);

console.log(fail ? '\nREAL-FILE CHECKS FAILED' : '\nREAL-FILE CHECKS PASSED');
process.exit(fail ? 1 : 0);
