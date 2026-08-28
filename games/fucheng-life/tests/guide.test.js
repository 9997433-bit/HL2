#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const dashboardHtml = fs.readFileSync(path.join(gameRoot, "screens/dashboard.html"), "utf8");
const guideSrc = fs.readFileSync(path.join(gameRoot, "js/fc-guide.js"), "utf8");

assert.ok(dashboardHtml.includes("fc-guide.js"), "dashboard must load fc-guide.js");
assert.ok(dashboardHtml.includes('id="guideBtn"'), "dashboard must expose a replay tutorial button");
assert.ok(dashboardHtml.includes("fc-career.js"), "dashboard must load fc-career.js");
assert.ok(dashboardHtml.includes("assetShop"), "assets tab must expose asset shop host");
assert.ok(guideSrc.includes("fucheng.guide.v3"), "coach guide must use v3 storage key");
assert.ok(guideSrc.includes("fc-coach"), "guide must render coach-mark UI");
assert.ok(guideSrc.includes("actionGrid"), "first teach step must target the desktop action grid");
assert.ok(guideSrc.includes("locChip"), "guide must teach the zone / explore target");
assert.ok(!guideSrc.includes('target: "mobileDock"'),
  "guide must not spotlight the mobile-only dock on first step");

const storage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); }
};

const sandbox = {
  console,
  FC: {},
  localStorage: storage,
  document: {
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
    getElementById() { return null; },
    createElement() {
      return {
        classList: { add() {}, remove() {} },
        querySelector() { return { addEventListener() {}, textContent: "", focus() {} }; },
        querySelectorAll() { return []; },
        addEventListener() {},
        className: "",
        innerHTML: "",
        style: {},
        setAttribute() {}
      };
    }
  },
  window: null,
  innerWidth: 1280,
  innerHeight: 800,
  matchMedia() { return { matches: false, addEventListener() {} }; },
  setTimeout(fn) { fn(); return 0; },
  requestAnimationFrame(fn) { fn(0); },
  addEventListener() {},
  removeEventListener() {}
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);

context.FC.overlay = {
  push() { return true; },
  pop() {},
  top() { return { onKey: null }; },
  trap() {}
};
vm.runInContext(guideSrc, context, { filename: "fc-guide.js" });

assert.ok(context.FC.guide.shouldShow(), "guide must show on first visit");
assert.equal(context.FC.guide.STEPS.length, 6, "coach guide must teach six steps including zone");
context.FC.guide.dismiss();
assert.ok(!context.FC.guide.shouldShow(), "guide must stay dismissed after dismiss");
context.FC.guide.reset();
assert.ok(context.FC.guide.shouldShow(), "reset must allow replaying the tutorial");

console.log("Guide: coach-mark tutorial (v3, 6 steps incl. zone) + replay button passed.");
