#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const contractSrc = fs.readFileSync(path.join(gameRoot, "js/fc-contract.js"), "utf8");
const simSrc = fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8");

function functionSection(src, name, nextName) {
  const start = src.indexOf("function " + name + "(");
  const end = src.indexOf("\n  function " + nextName + "(", start);
  assert.ok(start >= 0, name + " must be declared");
  assert.ok(end > start, name + " source section must be bounded");
  return src.slice(start, end);
}

/* 快进必须先自动花 AP；tick 报告强交互时立即停。 */
assert.match(dashSrc, /function\s+autoSpendAp\s*\(/, "dashboard must expose the AP auto-spender");
assert.match(dashSrc, /function\s+fastForwardMonths\s*\(/, "dashboard must expose month fast-forward");
const fastForwardSrc = functionSection(dashSrc, "fastForwardMonths", "maybeOfferContract");
assert.ok(
  fastForwardSrc.indexOf("autoSpendAp()") < fastForwardSrc.indexOf("tick("),
  "fast-forward must auto-spend AP before ticking the month"
);
assert.match(
  fastForwardSrc,
  /tick\([^)]*\)\.then\(function\s*\(hit\)\s*\{[\s\S]*?if\s*\(hit\)\s*\{[\s\S]*?return true;/,
  "fast-forward must stop after a strong interaction"
);

/* 月结的强弹窗链要把 hit 一路传到 drawModalEvent 之前并早退。 */
const finishMonthSrc = functionSection(dashSrc, "finishMonth", "tick");
const finalHitChain = finishMonthSrc.lastIndexOf(".then(function (hit)");
const finalHitGuard = finishMonthSrc.indexOf("if (hit)", finalHitChain);
const finalHitReturn = finishMonthSrc.indexOf("return true;", finalHitGuard);
const modalDraw = finishMonthSrc.indexOf("drawModalEvent()", finalHitReturn);
assert.ok(finalHitChain >= 0, "finishMonth must chain strong-interaction hit state");
assert.ok(finalHitGuard > finalHitChain, "finishMonth must inspect the hit state");
assert.ok(finalHitReturn > finalHitGuard, "finishMonth must return early on hit");
assert.ok(modalDraw > finalHitReturn, "finishMonth must not draw another modal after a hit");

/* 合约 picker 要有推荐态，并明确告诉玩家它匹配主目标。 */
assert.ok(
  contractSrc.includes("is-recommended") || contractSrc.includes("recommendedId"),
  "contract picker must expose a recommended-card hook"
);
assert.ok(
  contractSrc.includes("匹配主目标"),
  "contract picker must label the contract that matches the main goal"
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

const goalContracts = {
  hukou: "hukou",
  downpay: "home",
  rise: "promote",
  debtfree: null
};
assert.equal(typeof Sim.contractForGoal, "function", "sim must publish contractForGoal");
assert.equal(typeof Contract.recommendedId, "function", "contract UI must publish recommendedId");
Object.keys(goalContracts).forEach((goalId) => {
  const expected = goalContracts[goalId];
  assert.equal(Sim.contractForGoal(goalId), expected, goalId + " must map to its matching contract");
  assert.equal(
    Sim.contractForGoal({ id: goalId }),
    expected,
    goalId + " object goals must map to their matching contract"
  );
  assert.equal(
    Contract.recommendedId({ goal: { id: goalId } }),
    expected,
    goalId + " must drive the same picker recommendation"
  );
});

const era = {
  id: "E7", startYear: 2021, yearAnchor: 2021,
  stats: { opportunity: 70, threshold: 50, volatility: 50 }
};
const origin = {
  id: "O01", name: "测试", layer: 2,
  mods: { money: 40, health: 70, social: 50, edu: 50 },
  start: "¥ 8000"
};
const run = Sim.freshRun(era, origin);
assert.ok(Array.isArray(run.recentCrisis), "new runs must initialize recentCrisis");
run.months = 10;
run.lastCrisisMonth = 0;
run.health = 100;
run.social = 100;
run.debt = 0;
run.recentCrisis = ["ot_or_rest", "debt_or_cash", "dinner_or_sleep", "side_or_study"];
vm.runInContext("Math.random = function () { return 0; };", context);

const beforeFirst = run.recentCrisis.slice();
const first = Sim.pickMonthCrisis(run, era, origin);
assert.ok(first, "an eligible crisis should still be selected");
assert.ok(!beforeFirst.includes(first.id), "pickMonthCrisis must skip recently seen crisis ids");
assert.ok(run.recentCrisis.includes(first.id), "selected crisis must enter recentCrisis");
assert.ok(run.recentCrisis.length <= 4, "recentCrisis must remain a short rolling window");

const beforeSecond = run.recentCrisis.slice();
const second = Sim.pickMonthCrisis(run, era, origin);
assert.ok(second, "another eligible crisis should remain available");
assert.ok(!beforeSecond.includes(second.id), "consecutive crisis picks must not repeat the recent window");

console.log("R14 fast-forward, modal cap, goal binding, and crisis dedup passed.");
