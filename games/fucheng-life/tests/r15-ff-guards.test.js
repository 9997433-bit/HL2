#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const simSrc = fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8");
const contractSrc = fs.readFileSync(path.join(gameRoot, "js/fc-contract.js"), "utf8");

function functionSection(src, name, nextName) {
  const start = src.indexOf("function " + name + "(");
  const end = src.indexOf("\n  function " + nextName + "(", start);
  assert.ok(start >= 0, name + " must be declared");
  assert.ok(end > start, name + " source section must be bounded");
  return src.slice(start, end);
}

/* 快进不能替玩家探区，现金见底时应优先上班。 */
const autoSpendSrc = functionSection(dashSrc, "autoSpendAp", "sysLog");
const fastForwardSrc = functionSection(dashSrc, "fastForwardMonths", "startFastForward");
assert.match(
  autoSpendSrc,
  /suggestMonth|pickAutoAction/,
  "autoSpendAp must use guarded month advice directly or through its picker"
);
assert.match(
  dashSrc,
  /skipExplore/,
  "fast-forward auto-spending must request or enforce skipExplore"
);
assert.match(
  dashSrc,
  /preferWorkIfPoor/,
  "fast-forward auto-spending must enable the low-cash work preference"
);
assert.match(
  fastForwardSrc,
  /走了[\s\S]{0,160}月/,
  "fast-forward interruption copy must report how many months were advanced"
);

const sandbox = {
  FC: { gameplay: pack },
  console,
  localStorage: { getItem() { return null; }, setItem() {} }
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(simSrc, context, { filename: "js/fc-sim.js" });
vm.runInContext(contractSrc, context, { filename: "js/fc-contract.js" });

const Sim = context.FC.Sim;
const Contract = context.FC.contract;
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

/* suggestMonth 的 opts 必须真正改变探区与低现金建议，而不只是多一个形参。 */
assert.match(
  simSrc,
  /suggestMonth\s*:\s*function\s*\(\s*run\s*,\s*era\s*,\s*origin\s*,\s*opts\s*\)/,
  "suggestMonth must accept an opts argument"
);
const adviceRun = Sim.freshRun(era, origin);
adviceRun.career.picked = true;
adviceRun.zoneQueue = "auction";
assert.equal(
  Sim.suggestMonth(adviceRun, era, origin).actionId,
  "explore",
  "normal advice may still honor the player's zone target"
);
adviceRun.money = 0;
assert.equal(
  Sim.suggestMonth(adviceRun, era, origin, {
    skipExplore: true,
    preferWorkIfPoor: true
  }).actionId,
  "work",
  "fast-forward advice must preserve the zone target and work when cash is low"
);
assert.equal(adviceRun.zoneQueue, "auction", "advice must not consume the player's zone target");

/* 危机过冷却后也要经过概率闸：高点数跳过，低点数才命中。 */
const crisisRun = Sim.freshRun(era, origin);
crisisRun.months = 6;
crisisRun.lastCrisisMonth = 0;
crisisRun.health = 35;
vm.runInContext("Math.random = function () { return 0.99; };", context);
assert.equal(
  Sim.pickMonthCrisis(crisisRun, era, origin),
  null,
  "an eligible month crisis must still be skippable by probability"
);
vm.runInContext("Math.random = function () { return 0; };", context);
assert.ok(
  Sim.pickMonthCrisis(crisisRun, era, origin),
  "a low probability roll must still allow an eligible crisis"
);

/* 结算要留下可跨刷新补弹的 pending 状态，并可在领奖后销账。 */
const settlementRun = Sim.freshRun(era, origin);
Sim.selectContract(settlementRun, "hukou", era, origin);
settlementRun.contract.deadlineMonth = settlementRun.months;
const settlement = Sim.tickContract(settlementRun, era, origin);
assert.equal(settlement.status, "failed", "fixture must settle the contract");

const hasResolutionApi =
  typeof Sim.needsContractResolution === "function" &&
  typeof Sim.markContractResolutionDone === "function";
assert.ok(
  hasResolutionApi || Object.prototype.hasOwnProperty.call(settlementRun.contract, "resolutionPending"),
  "settled contracts must expose replay state through APIs or resolutionPending"
);
assert.ok(
  /needsContractResolution|markContractResolutionDone|resolutionPending|needsResolutionReplay/.test(contractSrc),
  "fc-contract must participate in settlement replay"
);
const resolution = Contract.resolutionEvent(settlementRun);
assert.ok(resolution && resolution.choices && resolution.choices[0],
  "settled contract must build a resolution event");
assert.ok(resolution.choices[0].d, "settlement reward or penalty must live on the resolution choice");

if (hasResolutionApi) {
  assert.equal(Sim.needsContractResolution(settlementRun), true, "fresh settlement must need replay");
  assert.equal(Sim.markContractResolutionDone(settlementRun), true, "claiming replay must clear it");
  assert.equal(Sim.needsContractResolution(settlementRun), false, "claimed settlement must not replay twice");
} else {
  assert.equal(settlementRun.contract.resolutionPending, true, "fresh settlement must be pending");
}

console.log("R15 fast-forward guards, crisis probability, and settlement replay passed.");
