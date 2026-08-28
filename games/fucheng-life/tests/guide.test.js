#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const dashboardHtml = fs.readFileSync(path.join(gameRoot, "screens/dashboard.html"), "utf8");

assert.ok(dashboardHtml.includes("fc-guide.js"), "dashboard must load fc-guide.js");
assert.ok(dashboardHtml.includes("fc-career.js"), "dashboard must load fc-career.js");
assert.ok(dashboardHtml.includes("assetShop"), "assets tab must expose asset shop host");

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
        classList: { add() {} },
        querySelector() { return { addEventListener() {}, textContent: "", focus() {} }; },
        querySelectorAll() { return []; },
        addEventListener() {},
        className: "",
        innerHTML: ""
      };
    }
  },
  window: null,
  matchMedia() { return { matches: false, addEventListener() {} }; },
  setTimeout(fn) { fn(); return 0; },
  requestAnimationFrame(fn) { fn(0); }
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);

context.FC.overlay = {
  push() { return true; },
  pop() {},
  top() { return { onKey: null }; },
  trap() {}
};
vm.runInContext(fs.readFileSync(path.join(gameRoot, "js/fc-guide.js"), "utf8"), context, { filename: "fc-guide.js" });

assert.ok(context.FC.guide.shouldShow(), "guide must show on first visit");
context.FC.guide.dismiss();
assert.ok(!context.FC.guide.shouldShow(), "guide must stay dismissed after dismiss");

console.log("Guide: fc-guide.js wired and localStorage gate passed.");
