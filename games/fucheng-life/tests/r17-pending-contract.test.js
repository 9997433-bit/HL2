#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const story = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const simSrc = fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8");

function functionSection(src, name, endMarker) {
  const start = src.indexOf("function " + name + "(");
  const end = src.indexOf(endMarker || "\n  function ", start + 1);
  assert.ok(start >= 0, name + " must be declared");
  assert.ok(end > start, name + " source section must be bounded");
  return src.slice(start, end);
}

/* 合约门禁 O1 也属于未决事件；只有显式 pending:false 的结算卡绕开待办。 */
const tracksPendingSrc = functionSection(dashSrc, "tracksPending");
assert.doesNotMatch(
  tracksPendingSrc,
  /!\s*\(\s*ev\s*&&\s*ev\.contract\s*\)/,
  "tracksPending must not exclude every contract-tagged O1 event"
);

const contractO1 = story.events.find((event) => event && event.id && event.contract);
assert.ok(contractO1, "story must contain a contract-gated O1 fixture");
const trackingContext = vm.createContext({ event: contractO1, result: null });
vm.runInContext(
  tracksPendingSrc +
    "\nresult = {" +
    " contractO1: tracksPending(event, {})," +
    " resolution: tracksPending(event, { pending: false })" +
    " };",
  trackingContext,
  { filename: "tracksPending.fixture.js" }
);
assert.equal(trackingContext.result.contractO1, true,
  "contract-gated O1 events must enter pendingModal");
assert.equal(trackingContext.result.resolution, false,
  "contract resolution events must honor explicit pending:false");

/* boot 要合并两条补弹结果，并在自动选轨 / 签约 / 教学前留下分流。 */
const initSrc = functionSection(dashSrc, "init", "\n  FC.ready.then");
const replayStart = initSrc.lastIndexOf("replayContractResolution()");
const firstAutoOffer = initSrc.indexOf("maybeOfferCareerTrack()", replayStart);
assert.ok(replayStart >= 0, "boot must attempt contract-resolution replay");
assert.ok(initSrc.indexOf("replayPendingModal()", replayStart) > replayStart,
  "boot must attempt pending-modal replay after contract resolution");
assert.ok(firstAutoOffer > replayStart, "boot must retain the automatic career offer path");

const replayToOffers = initSrc.slice(replayStart, firstAutoOffer);
assert.match(
  replayToOffers,
  /\.then\s*\(\s*function\s*\(\s*[A-Za-z_$][\w$]*\s*\)/,
  "boot must consume replay results instead of discarding them"
);
assert.match(replayToOffers, /\|\|/,
  "boot must coalesce contract and pending-modal replay hits");
assert.match(replayToOffers, /\bif\s*\(|\?/,
  "boot must branch on replay state before automatic offers");
assert.ok(initSrc.indexOf("maybeOfferChallengeGoal()", replayStart) >= 0,
  "boot must retain the required challenge-goal prompt");
assert.ok(initSrc.indexOf("maybeOfferContract()", replayStart) >= 0,
  "boot must retain the deferred contract-offer path");
assert.match(initSrc.slice(replayStart), /FC\.guide/,
  "boot must retain a deferred guide path");

/* 扩池后仍由 Sim 公开同一 MONTH_CRISES 门面。 */
const sandbox = {
  FC: { gameplay: pack },
  console,
  localStorage: { getItem() { return null; }, setItem() {} }
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(simSrc, context, { filename: "js/fc-sim.js" });
context.FC.Sim.install(pack);
assert.ok(Array.isArray(context.FC.Sim.MONTH_CRISES), "MONTH_CRISES must remain an array");
assert.ok(context.FC.Sim.MONTH_CRISES.length >= 8,
  "R17 must provide at least eight month crises");

console.log("R17 contract O1 pending, boot coalescing, and crisis pool guards passed.");
