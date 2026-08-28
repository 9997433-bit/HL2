#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const dashboardHtml = fs.readFileSync(path.join(gameRoot, "screens/dashboard.html"), "utf8");
const simSrc = fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8");

function functionSection(src, name) {
  const start = src.indexOf("function " + name + "(");
  const end = src.indexOf("\n  function ", start + 1);
  assert.ok(start >= 0, name + " must be declared");
  assert.ok(end > start, name + " source section must be bounded");
  return src.slice(start, end);
}

const sandbox = {
  FC: { gameplay: pack },
  console,
  localStorage: { getItem() { return null; }, setItem() {} }
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(simSrc, context, { filename: "js/fc-sim.js" });

const Sim = context.FC.Sim;
Sim.install(pack);
const era = {
  id: "E7", startYear: 2021, yearAnchor: 2021,
  stats: { opportunity: 70, threshold: 50, volatility: 50 }
};
const origin = {
  id: "O01", name: "测试", layer: 2,
  mods: { money: 40, health: 70, social: 50, edu: 50 },
  start: "¥ 8000"
};

/* 危机 / O1 卡先落一个可序列化的待办，玩家确认入账后再销账。 */
const run = Sim.freshRun(era, origin);
assert.equal(run.pendingModal, null, "new runs must initialize pendingModal");
assert.equal(typeof Sim.setPendingModal, "function", "Sim.setPendingModal must be public");
assert.equal(typeof Sim.clearPendingModal, "function", "Sim.clearPendingModal must be public");
assert.equal(typeof Sim.hasPendingModal, "function", "Sim.hasPendingModal must be public");

const crisisPayload = {
  id: "crisis_replay_fixture",
  type: "bill",
  category: "本月危机",
  presentation: "modal",
  title: "刷新前的敲门",
  body: "这张卡在玩家确认前必须能跨刷新补弹。",
  choices: [
    { id: "answer", label: "应门", d: { health: -1 }, result: "账已落下。" }
  ]
};
Sim.setPendingModal(run, { kind: "crisis", event: crisisPayload });
assert.doesNotThrow(
  () => JSON.stringify(run.pendingModal),
  "pendingModal must remain serializable for FC.write"
);
assert.equal(run.pendingModal.kind, "crisis", "setPendingModal must retain the replay kind");
assert.equal(run.pendingModal.event.id, crisisPayload.id,
  "setPendingModal must retain the event payload");
assert.equal(Sim.hasPendingModal(run), true, "hasPendingModal must detect a saved event");
Sim.clearPendingModal(run);
assert.equal(run.pendingModal, null, "clearPendingModal must retire the replay after confirmation");
assert.equal(Sim.hasPendingModal(run), false, "hasPendingModal must clear with the payload");

const migrated = Sim.freshRun(era, origin);
delete migrated.pendingModal;
Sim.migrate(migrated, era, origin);
assert.equal(migrated.pendingModal, null, "saved runs without pendingModal must migrate to null");

/* Dashboard：openEvent 负责待办生命周期，boot 在合约补弹后补危机 / O1。 */
const openEventSrc = functionSection(dashSrc, "openEvent");
assert.match(openEventSrc, /pendingModal/, "openEvent must participate in pendingModal persistence");
assert.match(openEventSrc, /FC\.events\.show/, "openEvent must still present events through FC.events");
assert.match(openEventSrc, /FC\.write/, "openEvent must persist the pending or cleared state");

const replaySrc = functionSection(dashSrc, "replayPendingModal");
assert.match(replaySrc, /pendingModal/, "replayPendingModal must read the saved payload");
assert.match(replaySrc, /openEvent\s*\(/, "replayPendingModal must replay through the normal event path");

const contractReplayCall = dashSrc.lastIndexOf("replayContractResolution()");
const modalReplayCall = dashSrc.lastIndexOf("replayPendingModal()");
assert.ok(contractReplayCall >= 0, "boot must retain contract-resolution replay");
assert.ok(modalReplayCall > contractReplayCall,
  "boot must replay pending crisis/O1 after contract resolution");

const monthModalSrc = functionSection(dashSrc, "monthModal");
assert.match(monthModalSrc, /openEvent\s*\(\s*ev/,
  "monthModal must send the selected crisis/O1 through the pending-aware openEvent path");

/* 快进必须走应用内 Promise confirm，不能再调用阻塞式 window.confirm。 */
const startFastForwardSrc = functionSection(dashSrc, "startFastForward");
assert.match(startFastForwardSrc, /FC\.confirm\s*\(/,
  "fast-forward must call the shared in-app FC.confirm");
assert.doesNotMatch(startFastForwardSrc, /window\.confirm\s*\(/,
  "fast-forward must not use window.confirm");
assert.match(startFastForwardSrc, /\.then\s*\(/,
  "fast-forward must wait for the asynchronous confirm result");

/* FC.confirm 的实现必须由 dashboard 实际加载，而不只是留一段死代码。 */
const dashboardScripts = [...dashboardHtml.matchAll(/<script\s+src=["']\.\.\/([^"']+)["']/g)]
  .map((match) => match[1]);
const confirmModule = dashboardScripts.find((relativePath) => {
  const source = fs.readFileSync(path.join(gameRoot, relativePath), "utf8");
  return /\bFC\.confirm\s*=/.test(source);
});
assert.ok(confirmModule, "dashboard must load the module that publishes FC.confirm");

const confirmDocument = {
  activeElement: null,
  addEventListener() {},
  body: { appendChild() {}, classList: { add() {}, remove() {} } },
  createElement() {
    return {
      classList: { add() {}, remove() {} },
      focus() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      style: {}
    };
  }
};
const confirmSandbox = {
  FC: {
    overlay: {
      pop() { return true; },
      push() { return true; },
      top() { return {}; },
      trap() {}
    }
  },
  console,
  document: confirmDocument,
  matchMedia() { return { matches: true }; },
  requestAnimationFrame(callback) { callback(); },
  setTimeout
};
confirmSandbox.window = confirmSandbox;
const confirmContext = vm.createContext(confirmSandbox);
vm.runInContext(
  fs.readFileSync(path.join(gameRoot, confirmModule), "utf8"),
  confirmContext,
  { filename: confirmModule }
);
assert.equal(typeof confirmContext.FC.confirm, "function", "FC.confirm must be a function");

console.log("R16 crisis modal replay and in-app confirm wiring passed.");
