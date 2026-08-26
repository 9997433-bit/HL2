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

  const initial = await evaluate(cdp, `(() => ({
    readyState: document.readyState,
    title: document.title,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    imageBytes: canvas.toDataURL('image/png').length,
    platformCount: platforms.length,
    playerX: player.x,
    playerY: player.y,
    score,
    scoreText: scoreEl.textContent,
    alive
  }))()`);

  assert.equal(initial.readyState, 'complete');
  assert.equal(initial.title, '跳一跳 — 复刻原型');
  assert.deepEqual([initial.canvasWidth, initial.canvasHeight], [400, 600]);
  assert.ok(initial.imageBytes > 100, 'canvas did not produce a rendered frame');
  assert.equal(initial.platformCount, 20);
  assert.ok(Number.isFinite(initial.playerX) && Number.isFinite(initial.playerY));
  assert.equal(initial.score, 0);
  assert.equal(initial.scoreText, '0');
  assert.equal(initial.alive, true);

  const key = {
    key: ' ',
    code: 'Space',
    windowsVirtualKeyCode: 32,
    nativeVirtualKeyCode: 32,
  };
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ' ', ...key });
  await wait(300);
  assert.equal(await evaluate(cdp, 'player.charging'), true, 'Space did not begin charging');

  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
  const released = await evaluate(cdp, `({
    charging: player.charging,
    jumping: player.jumping,
    velocity: player.vy,
    jumpVx: player.jumpVx
  })`);
  assert.equal(released.charging, false);
  assert.equal(released.jumping, true, 'Space release did not start a jump');
  assert.ok(released.velocity < 0, 'jump did not begin with upward velocity');
  assert.ok(Number.isFinite(released.jumpVx), 'jump horizontal velocity is not finite');

  await wait(80);
  const moved = await evaluate(cdp, '({ x: player.x, y: player.y })');
  assert.ok(
    moved.x !== initial.playerX || moved.y !== initial.playerY,
    'animation frame did not move the player'
  );

  const resetState = await evaluate(cdp, `(() => {
    reset();
    return {
      score,
      scoreText: scoreEl.textContent,
      alive,
      jumping: player.jumping,
      platformCount: platforms.length
    };
  })()`);
  assert.deepEqual(resetState, {
    score: 0,
    scoreText: '0',
    alive: true,
    jumping: false,
    platformCount: 20,
  });
  assert.deepEqual(runtimeExceptions, [], `browser exceptions: ${runtimeExceptions.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `browser console errors: ${consoleErrors.join('; ')}`);

  console.log(
    'jump-jump: canvas rendered; 20 platforms initialized; charge, jump, animation, and reset passed'
  );
} catch (error) {
  console.error(`jump-jump verification failed: ${error.stack || error}`);
  if (browserStderr) console.error(`Chrome stderr:\n${browserStderr}`);
  process.exitCode = 1;
} finally {
  cdp?.close();
  await stopBrowser(browser);
  if (profileDir) await rm(profileDir, { recursive: true, force: true });
}
