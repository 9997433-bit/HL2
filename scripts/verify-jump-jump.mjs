#!/usr/bin/env node

import assert from 'node:assert/strict';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pagePath = resolve(scriptDir, '../prototypes/jump-jump/index.html');
const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function executable(path) {
  if (!path) return false;
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findBrowser() {
  const names = [
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);
  const pathDirs = (process.env.PATH || '').split(delimiter);

  for (const name of names) {
    if (name.includes('/') && await executable(name)) return name;
    for (const pathDir of pathDirs) {
      const candidate = join(pathDir, name);
      if (await executable(candidate)) return candidate;
    }
  }
  throw new Error(
    'No Chrome/Chromium executable found; set CHROME_PATH to run the browser smoke test'
  );
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const { port } = server.address();
  await new Promise((resolveClose, reject) => server.close((error) => {
    if (error) reject(error);
    else resolveClose();
  }));
  return port;
}

async function findPageTarget(port, browser, getLaunchError) {
  const deadline = Date.now() + 10_000;
  let lastError;

  while (Date.now() < deadline) {
    if (getLaunchError()) throw getLaunchError();
    if (browser.exitCode !== null) {
      throw new Error(`Chrome exited before CDP became ready (exit ${browser.exitCode})`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
        signal: AbortSignal.timeout(500),
      });
      if (!response.ok) throw new Error(`CDP target list returned HTTP ${response.status}`);
      const targets = await response.json();
      const target = targets.find(({ type, url }) =>
        type === 'page' && url.includes('/prototypes/jump-jump/index.html')
      );
      if (target?.webSocketDebuggerUrl) return target;
    } catch (error) {
      lastError = error;
    }
    await wait(100);
  }

  throw new Error(`Timed out waiting for the jump-jump page target: ${lastError || 'not found'}`);
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async connect() {
    if (typeof WebSocket === 'undefined') {
      throw new Error('This verifier requires Node.js 22+ with the built-in WebSocket client');
    }
    this.socket = new WebSocket(this.url);
    await new Promise((resolveOpen, reject) => {
      const fail = (event) => reject(new Error(`CDP WebSocket failed: ${event.message || event.type}`));
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', fail, { once: true });
    });
    this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
    this.socket.addEventListener('close', () => {
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(new Error('CDP WebSocket closed before the command completed'));
      }
      this.pending.clear();
    });
  }

  handleMessage(raw) {
    const message = JSON.parse(String(raw));
    if (message.id) {
      const request = this.pending.get(message.id);
      if (!request) return;
      clearTimeout(request.timer);
      this.pending.delete(message.id);
      if (message.error) {
        request.reject(new Error(`${request.method}: ${message.error.message}`));
      } else {
        request.resolve(message.result);
      }
      return;
    }
    for (const handler of this.handlers.get(message.method) || []) handler(message.params);
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  send(method, params = {}) {
    if (!this.socket || this.socket.readyState !== 1) {
      return Promise.reject(new Error(`Cannot send ${method}: CDP WebSocket is not open`));
    }
    const id = this.nextId++;
    return new Promise((resolveCommand, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 5_000);
      this.pending.set(id, { method, resolve: resolveCommand, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.socket?.readyState < 2) this.socket.close();
  }
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) {
    const detail = response.exceptionDetails.exception?.description
      || response.exceptionDetails.text
      || 'unknown evaluation error';
    throw new Error(detail);
  }
  return response.result.value;
}

async function stopBrowser(browser) {
  if (!browser || browser.exitCode !== null) return;
  browser.kill('SIGTERM');
  for (let attempt = 0; attempt < 20 && browser.exitCode === null; attempt++) await wait(50);
  if (browser.exitCode === null) browser.kill('SIGKILL');
}

let checks = 0;

/** Run one named assertion group so a failure says which behaviour broke. */
function check(label, assertions) {
  assertions();
  checks++;
  console.log(`ok    ${label}`);
}

const strictlyIncreasing = (values) => values.every((v, i) => i === 0 || v > values[i - 1]);

let browser;
let cdp;
let profileDir;
let browserStderr = '';

try {
  const browserPath = await findBrowser();
  const port = await reservePort();
  profileDir = await mkdtemp(join(tmpdir(), 'jump-jump-cdp-'));
  const pageUrl = pathToFileURL(pagePath).href;
  let launchError;

  browser = spawn(browserPath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    pageUrl,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  browser.once('error', (error) => {
    launchError = error;
  });
  browser.stderr.setEncoding('utf8');
  browser.stderr.on('data', (chunk) => {
    browserStderr = (browserStderr + chunk).slice(-8_000);
  });

  const target = await findPageTarget(port, browser, () => launchError);
  cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.connect();

  const runtimeExceptions = [];
  const consoleErrors = [];
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    runtimeExceptions.push(exceptionDetails.exception?.description || exceptionDetails.text);
  });
  cdp.on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type === 'error') consoleErrors.push(args.map((arg) => arg.value || arg.description).join(' '));
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.bringToFront');

  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate(cdp, 'document.readyState === "complete"')) break;
    await wait(100);
  }

  /* ---- boot ------------------------------------------------------------ */

  const initial = await evaluate(cdp, `(() => ({
    readyState: document.readyState,
    title: document.title,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    imageBytes: canvas.toDataURL('image/png').length,
    hasTestApi: typeof window.__jj === 'object',
    ...__jj.snapshot()
  }))()`);

  check('page boots, renders a frame and exposes the test surface', () => {
    assert.equal(initial.readyState, 'complete');
    assert.equal(initial.title, '跳一跳 — 复刻原型');
    assert.deepEqual([initial.canvasWidth, initial.canvasHeight], [400, 600]);
    assert.ok(initial.imageBytes > 100, 'canvas did not produce a rendered frame');
    assert.equal(initial.hasTestApi, true, 'window.__jj is missing');
    assert.equal(initial.score, 0);
    assert.equal(initial.scoreText, '0');
    assert.equal(initial.alive, true);
    assert.equal(initial.platformIndex, 0);
    assert.ok(Number.isFinite(initial.x) && Number.isFinite(initial.y));
  });

  /* ---- G-JJ5: seeded, reproducible world ------------------------------- */

  const determinism = await evaluate(cdp, `(() => {
    __jj.setDriven(true);
    __jj.restart(1234);
    const first = __jj.fingerprint(9);
    __jj.restart(1234);
    const again = __jj.fingerprint(9);
    __jj.restart(987654321);
    const other = __jj.fingerprint(9);
    return { first, again, other, seed: __jj.snapshot().seed };
  })()`);

  check('seeded generation replays exactly and differs across seeds (G-JJ5)', () => {
    assert.equal(determinism.first, determinism.again, 'same seed produced a different world');
    assert.notEqual(determinism.first, determinism.other, 'different seeds produced the same world');
    assert.equal(determinism.seed, 987654321);
  });

  /* ---- G-JJ1: the world never runs out --------------------------------- */

  const endless = await evaluate(cdp, `(() => {
    __jj.restart(2468);
    const booted = __jj.snapshot();
    const jumps = __jj.autoPlay(60);
    const state = __jj.snapshot();
    return {
      bootedGenerated: booted.generated,
      jumps: jumps.length,
      everyJumpAdvancedOne: jumps.every((j) => j.landing && j.landing.advanced === 1),
      alive: state.alive,
      score: state.score,
      combo: state.combo,
      platformIndex: state.platformIndex,
      generated: state.generated,
      platformCount: state.platformCount,
      lastX: state.x
    };
  })()`);

  check('platforms are generated endlessly and pruned behind the jumper (G-JJ1)', () => {
    assert.equal(endless.bootedGenerated, 9, 'boot should prepare CFG.ahead + 1 platforms');
    assert.equal(endless.jumps, 60);
    assert.equal(endless.everyJumpAdvancedOne, true, 'a perfect jump did not reach the next block');
    assert.equal(endless.alive, true);
    assert.equal(endless.platformIndex, 60);
    assert.ok(endless.generated >= 69, `only ${endless.generated} platforms were ever generated`);
    assert.ok(
      endless.platformCount <= 13,
      `the live platform list grew to ${endless.platformCount}; pruning is not keeping it bounded`
    );
    assert.ok(endless.lastX > 6000, 'the jumper barely travelled across 60 platforms');
  });

  /* ---- generation fairness: every gap is clearable ---------------------- */

  const fairness = await evaluate(cdp, `(() => {
    const seeds = 200;
    const jumps = 25;
    let deaths = 0;
    let maxCharge = 0;
    let minCharge = Infinity;
    let hardest = null;
    for (let s = 1; s <= seeds; s++) {
      __jj.restart(s * 7919);
      for (let j = 0; j < jumps; j++) {
        const r = __jj.perfect();
        if (!r || !r.alive || !r.landing || r.landing.advanced !== 1) { deaths++; break; }
        if (r.charge > maxCharge) { maxCharge = r.charge; hardest = { seed: s * 7919, jump: j }; }
        if (r.charge < minCharge) minCharge = r.charge;
      }
    }
    return { seeds, jumps, deaths, maxCharge, minCharge, hardest, cap: __jj.CFG.maxCharge };
  })()`);

  check(`${fairness.seeds} seeded worlds x ${fairness.jumps} jumps are all clearable`, () => {
    assert.equal(fairness.deaths, 0, `${fairness.deaths} seeded worlds contained an unreachable block`);
    assert.ok(
      fairness.maxCharge < fairness.cap,
      `the hardest gap needs the full ${fairness.cap}s charge, leaving no timing margin`
    );
    assert.ok(fairness.minCharge > 0.2, 'some gap is clearable with an idle tap');
  });
  console.log(
    `      perfect play held ${fairness.minCharge.toFixed(3)}s–${fairness.maxCharge.toFixed(3)}s`
    + ` of the ${fairness.cap}s cap`
  );

  /* ---- G-JJ4: the combo is the score system ---------------------------- */

  const scoring = await evaluate(cdp, `(() => {
    __jj.restart(31415);
    const centred = [];
    for (let i = 0; i < 6; i++) {
      const r = __jj.perfect();
      centred.push({ points: r.landing.points, score: r.score, combo: r.combo, offset: r.landing.offset });
    }
    const target = __jj.next();
    const off = __jj.aim(-(target.w / 2 - 6));
    return {
      centred,
      maxOffset: Math.max(...centred.map((c) => Math.abs(c.offset))),
      offCentre: { points: off.landing.points, score: off.score, combo: off.combo, offset: off.landing.offset },
      tolerance: __jj.CFG.centerTolerance,
      scoreText: off.scoreText
    };
  })()`);

  check('centre landings multiply the score 2/4/8/16/32 and a miss resets it (G-JJ4)', () => {
    assert.ok(scoring.maxOffset < 1e-6, `perfect aim landed ${scoring.maxOffset}px off centre`);
    assert.deepEqual(scoring.centred.map((c) => c.points), [2, 4, 8, 16, 32, 32]);
    assert.deepEqual(scoring.centred.map((c) => c.score), [2, 6, 14, 30, 62, 94]);
    assert.deepEqual(scoring.centred.map((c) => c.combo), [1, 2, 3, 4, 5, 6]);
    assert.ok(
      Math.abs(scoring.offCentre.offset) > scoring.tolerance,
      'the off-centre jump was still inside the combo window'
    );
    assert.equal(scoring.offCentre.points, 1, 'an off-centre landing must score a bare point');
    assert.equal(scoring.offCentre.combo, 0, 'an off-centre landing must break the combo');
    assert.equal(scoring.offCentre.score, 95);
    assert.equal(scoring.scoreText, '95');
  });

  /* ---- G-JJ3: charge alone decides the distance ------------------------ */

  const charging = await evaluate(cdp, `(() => {
    const charges = [0.1, 0.3, 0.5, 0.7, 0.9, 1.1, 1.2, 1.6];
    __jj.restart(555);
    const flights = charges.map((c) => __jj.freeFlight(c));
    const analytic = charges.map((c) => __jj.rangeFor(c, 0));
    __jj.restart(999999);
    const otherWorld = charges.map((c) => __jj.freeFlight(c));

    // Aim at the next block, then repeat the same charge one world later:
    // an auto-aiming jump would change its horizontal speed, this one cannot.
    __jj.restart(4242);
    const aimed = __jj.aim(0);
    __jj.restart(4242);
    const replay = __jj.jump(aimed.charge);
    return {
      charges,
      flights,
      analytic,
      otherWorld,
      modelError: Math.max(...flights.map((f, i) => Math.abs(f - analytic[i]))),
      aimedCharge: aimed.charge,
      aimedX: aimed.x,
      replayX: replay.x,
      capped: [__jj.freeFlight(1.2), __jj.freeFlight(4)],
      tap: __jj.freeFlight(0),
      full: __jj.freeFlight(__jj.CFG.maxCharge),
      gap: __jj.CFG.gap,
      widestBlock: __jj.CFG.platformWidth[1]
    };
  })()`);

  check('hold time governs distance, and nothing auto-aims (G-JJ3)', () => {
    assert.ok(
      strictlyIncreasing(charging.flights.slice(0, 7)),
      `distance is not monotonic in charge: ${charging.flights.join(', ')}`
    );
    assert.ok(charging.modelError < 1e-6, `integrator drifts from the model by ${charging.modelError}px`);
    assert.deepEqual(
      charging.flights,
      charging.otherWorld,
      'the same charge flew a different distance in another world — the jump is aim-assisted'
    );
    assert.equal(charging.capped[0], charging.capped[1], 'charge is not capped at CFG.maxCharge');
    assert.ok(charging.aimedCharge > 0.1 && charging.aimedCharge < 1.2);
    assert.equal(charging.replayX, charging.aimedX, 'replaying the same charge landed elsewhere');
    assert.ok(
      charging.tap < charging.gap[0] - charging.widestBlock / 2,
      `a bare tap flies ${charging.tap}px, far enough to reach the next block by accident`
    );
    assert.ok(
      charging.full > charging.gap[1],
      `a full charge flies ${charging.full}px and cannot clear the widest gap`
    );
  });

  /* ---- G-JJ2: frame rate cannot change the outcome --------------------- */

  const frameRates = await evaluate(cdp, `(() => {
    const run = (dt) => {
      __jj.restart(20180101);
      __jj.launch(0.72);
      const steps = Math.round(3 / dt);
      for (let i = 0; i < steps; i++) __jj.advance(dt);
      const s = __jj.snapshot();
      return { x: s.x, y: s.y, score: s.score, combo: s.combo, index: s.platformIndex, alive: s.alive, jumping: s.jumping };
    };
    return { hz30: run(1 / 30), hz60: run(1 / 60), hz120: run(1 / 120), hz240: run(1 / 240) };
  })()`);

  check('30/60/120/240 Hz produce an identical landing (G-JJ2)', () => {
    assert.equal(frameRates.hz60.jumping, false, 'the test jump never resolved');
    assert.deepEqual(frameRates.hz30, frameRates.hz60, '30 Hz and 60 Hz disagree');
    assert.deepEqual(frameRates.hz120, frameRates.hz60, '120 Hz and 60 Hz disagree');
    assert.deepEqual(frameRates.hz240, frameRates.hz60, '240 Hz and 60 Hz disagree');
  });

  /* ---- missing is a real outcome, and it ends the run ------------------ */

  const death = await evaluate(cdp, `(() => {
    __jj.restart(864213);
    __jj.autoPlay(3);
    const before = __jj.snapshot();
    const missed = __jj.fallShort();
    return {
      scoreBefore: before.score,
      indexBefore: before.platformIndex,
      alive: missed.alive,
      score: missed.score,
      index: missed.platformIndex,
      y: missed.y,
      panel: __jj.panelVisible(),
      board: __jj.board(),
      reviveShown: document.getElementById('btnRevive').style.display !== 'none',
      cloudWrites: __jj.calls('wx.setUserCloudStorage'),
      cloudValue: __jj.shim.selfCloudData('score'),
      gameOverShown: document.getElementById('gameOver').style.display === 'block'
    };
  })()`);

  check('landing in the gap kills the run and opens the WeChat game-over surface (G-JJ5)', () => {
    assert.equal(death.scoreBefore, 14, 'three perfect jumps should score 2+4+8');
    assert.equal(death.alive, false, 'falling into the gap did not end the run');
    assert.equal(death.index, death.indexBefore, 'a missed jump must not advance the block index');
    assert.equal(death.score, 14, 'the score changed on a miss');
    assert.ok(death.y > 700, 'the jumper never fell past the death line');
    assert.equal(death.gameOverShown, true);
    assert.equal(death.panel, true, 'the wx panel stayed hidden after game over');
    assert.equal(death.reviveShown, true);
    assert.ok(death.cloudWrites >= 1, 'the score was never written to wx.setUserCloudStorage');
    assert.equal(JSON.parse(death.cloudValue).wxgame.score, 14);
    assert.match(death.board, /好友榜/, 'the friend leaderboard was not rendered');
    assert.match(death.board, /第 \d+\/\d+ 名/, 'the friend leaderboard has no rank line');
  });

  /* ---- share and rewarded-video revive, through the shared shim -------- */

  const share = await evaluate(cdp, `(() => {
    const before = __jj.calls('wx.shareAppMessage');
    window.__shareReturn = null;
    __jj.shim.once('share:success', (info) => { window.__shareReturn = info; });
    document.getElementById('btnShareScore').click();
    return {
      before,
      after: __jj.calls('wx.shareAppMessage'),
      title: __jj.shim.lastShare.title,
      query: __jj.shim.lastShare.query,
      note: document.getElementById('wxNote').textContent,
      returnedImmediately: window.__shareReturn !== null
    };
  })()`);

  // The card only "succeeds" when a friend opens it, shareReturnMs later.
  await wait(1600);
  const shareReturn = await evaluate(cdp, `({
    scene: window.__shareReturn && window.__shareReturn.scene,
    simulated: window.__shareReturn && window.__shareReturn.simulated,
    note: document.getElementById('wxNote').textContent
  })`);

  check('sharing the score goes through wx.shareAppMessage', () => {
    assert.equal(share.after, share.before + 1);
    assert.match(share.title, /我跳了 14 分/);
    assert.equal(share.query, 'from=score');
    assert.match(share.note, /wx\.shareAppMessage 已调用/);
    assert.equal(share.returnedImmediately, false, 'the share must not report success synchronously');
    assert.equal(shareReturn.simulated, true, 'the simulated share return never arrived');
    assert.equal(shareReturn.scene, 1044, 'the return trip should carry a group-card scene value');
    assert.match(shareReturn.note, /好友通过分享卡进入/, 'the share return was not reported');
  });

  const reviveFlow = await evaluate(cdp, `(() => {
    const dead = __jj.snapshot();
    document.getElementById('btnRevive').click();
    const adVisible = __jj.adVisible();
    const closed = __jj.completeAd();
    const back = __jj.snapshot();
    const home = __jj.platforms().find((p) => p.index === back.platformIndex);
    return {
      deadScore: dead.score,
      adVisible,
      closed,
      adHidden: !__jj.adVisible(),
      alive: back.alive,
      revived: back.revived,
      score: back.score,
      combo: back.combo,
      panel: __jj.panelVisible(),
      onBlock: Math.abs(back.x - home.x) < 1e-9 && Math.abs(back.y - home.y) < 1e-9,
      adCalls: __jj.calls('rewardedAd.show')
    };
  })()`);

  check('a rewarded video revives the run on the block it fell from', () => {
    assert.equal(reviveFlow.adVisible, true, 'the mock ad never went full screen');
    assert.equal(reviveFlow.closed, true, 'completing the ad did not close it');
    assert.equal(reviveFlow.adHidden, true, 'the ad overlay stayed on screen');
    assert.equal(reviveFlow.alive, true, 'watching the ad did not revive the run');
    assert.equal(reviveFlow.revived, true);
    assert.equal(reviveFlow.score, reviveFlow.deadScore, 'the revive lost the score');
    assert.equal(reviveFlow.combo, 0, 'the revive should not keep the combo');
    assert.equal(reviveFlow.panel, false);
    assert.equal(reviveFlow.onBlock, true, 'the jumper was not put back on its block');
    assert.ok(reviveFlow.adCalls >= 1);
  });

  const afterRevive = await evaluate(cdp, `(() => {
    const r = __jj.perfect();
    return { alive: r.alive, score: r.score, points: r.landing.points, index: r.platformIndex };
  })()`);

  check('play resumes normally after the revive', () => {
    assert.equal(afterRevive.alive, true);
    assert.equal(afterRevive.points, 2, 'the combo did not restart from the base bonus');
    assert.equal(afterRevive.score, 16);
    assert.equal(afterRevive.index, 4);
  });

  /* ---- the real input path still drives the same physics --------------- */

  await evaluate(cdp, '(() => { __jj.restart(777); __jj.setDriven(false); return true; })()');
  const startX = await evaluate(cdp, '__jj.snapshot().x');

  const key = {
    key: ' ',
    code: 'Space',
    windowsVirtualKeyCode: 32,
    nativeVirtualKeyCode: 32,
  };
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ' ', ...key });
  await wait(300);
  const charging2 = await evaluate(cdp, `({
    charging: __jj.snapshot().charging,
    bar: parseFloat(document.getElementById('chargeFill').style.width)
  })`);

  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
  const released = await evaluate(cdp, '__jj.snapshot()');
  await wait(1200);
  const settled = await evaluate(cdp, '__jj.snapshot()');

  check('space charges and releases a jump through the live rAF loop', () => {
    assert.equal(charging2.charging, true, 'Space did not begin charging');
    assert.ok(charging2.bar > 5, `the charge meter did not fill (${charging2.bar}%)`);
    assert.equal(released.charging, false);
    assert.equal(released.jumping, true, 'Space release did not start a jump');
    assert.ok(released.vy < 0, 'the jump did not begin with upward velocity');
    assert.ok(released.vx > 0, 'the jump has no horizontal velocity');
    assert.equal(settled.jumping, false, 'the jump never resolved in the live loop');
    assert.ok(settled.x > startX, 'the jumper did not move');
    assert.ok(
      settled.score > 0 || settled.alive === false,
      'the live jump neither scored nor ended the run'
    );
  });

  const restored = await evaluate(cdp, `(() => {
    __jj.setDriven(false);
    reset();
    return __jj.snapshot();
  })()`);

  check('reset returns the game to a playable start', () => {
    assert.equal(restored.score, 0);
    assert.equal(restored.scoreText, '0');
    assert.equal(restored.comboText, '');
    assert.equal(restored.alive, true);
    assert.equal(restored.jumping, false);
    assert.equal(restored.platformIndex, 0);
    assert.equal(restored.generated, 9);
  });

  check('no exceptions or console errors during the whole run', () => {
    assert.deepEqual(runtimeExceptions, [], `browser exceptions: ${runtimeExceptions.join('; ')}`);
    assert.deepEqual(consoleErrors, [], `browser console errors: ${consoleErrors.join('; ')}`);
  });

  console.log(`\njump-jump: ${checks} checks passed in real Chrome (headless)`);
} catch (error) {
  console.error(`jump-jump verification failed: ${error.stack || error}`);
  if (browserStderr) console.error(`Chrome stderr:\n${browserStderr}`);
  process.exitCode = 1;
} finally {
  cdp?.close();
  await stopBrowser(browser);
  if (profileDir) await rm(profileDir, { recursive: true, force: true });
}
