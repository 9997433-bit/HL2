#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const dashHtml = fs.readFileSync(path.join(gameRoot, "screens/dashboard.html"), "utf8");
const endingSrc = fs.readFileSync(path.join(gameRoot, "js/fc-ending.js"), "utf8");
const dashJs = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");

assert.ok(dashHtml.includes('id="goalHud"'), "dashboard must show challenge goal HUD");
assert.ok(dashJs.includes("maybeOfferChallengeGoal"), "dashboard must offer challenge goal picker");
assert.ok(endingSrc.includes("endingMetaForRun") || endingSrc.includes("scoreChallenge"),
  "ending must surface challenge score");

const store = { playMode: "challenge" };
const sandbox = {
  FC: {
    gameplay: pack,
    read() { return Object.assign({}, store); },
    write(patch) { Object.assign(store, patch); return store; }
  },
  console,
  localStorage: { getItem() { return null; }, setItem() {} }
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8"), context, {
  filename: "js/fc-sim.js"
});
vm.runInContext(fs.readFileSync(path.join(gameRoot, "js/fc-ending.js"), "utf8"), context, {
  filename: "js/fc-ending.js"
});

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

const run = Sim.freshRun(era, origin);
assert.equal(run.challengeMonths, 60, "challenge mode sets 60 months");
assert.equal(Sim.needsChallengeGoal(run), true, "new challenge run needs a goal");

assert.ok(Sim.pickChallengeGoal(run, "rise", era, origin), "pick rise goal");
assert.equal(run.goal.id, "rise");
assert.equal(run.goal.targetLayer, 3, "L2 origin should target L3");
assert.equal(Sim.needsChallengeGoal(run), false);

let pct = Sim.goalProgress(run, era, origin);
assert.ok(pct >= 10 && pct < 100, "L2 start should be mid progress toward L3, got " + pct);

run.rep = 90;
run.money = 500000;
pct = Sim.goalProgress(run, era, origin);
assert.equal(pct, 100, "high rep/money should reach L3 goal");

const highOrigin = {
  id: "O09", name: "体制", layer: 3,
  mods: { money: 70, health: 70, social: 60, edu: 70 },
  start: "¥ 50000"
};
const highRun = Sim.freshRun(era, highOrigin);
Sim.pickChallengeGoal(highRun, "rise", era, highOrigin);
assert.equal(highRun.goal.targetLayer, 4, "L3 origin should target L4");
assert.ok(Sim.goalProgress(highRun, era, highOrigin) < 100,
  "L3 start must not instantly complete rise-to-L4");

const scored = Sim.scoreChallenge(run, era, origin);
assert.ok(scored.score >= 70, "completed goal should score well");
assert.ok(["S", "A", "B"].includes(scored.grade), "grade should be letter");

run.months = 60;
assert.equal(Sim.checkEnd(run, origin), "challenge");
const meta = Sim.endingMetaForRun("challenge", run, era, origin);
assert.ok(meta.title.indexOf(scored.grade) >= 0, "ending title includes grade");
assert.ok(meta.summary.indexOf("主目标") >= 0, "ending summary mentions goal");

const payload = context.FC.ending.buildPayload(run, era, origin, "challenge");
assert.ok(payload.stats.some((s) => s.k === "综合评分"), "payload includes score");
assert.ok(payload.stats.some((s) => s.k === "主目标"), "payload includes goal");

const debtRun = Sim.freshRun(era, origin);
Sim.pickChallengeGoal(debtRun, "debtfree", era, origin);
debtRun.debt = 0;
assert.equal(Sim.goalProgress(debtRun, era, origin), 100, "zero debt completes debtfree");

const homeRun = Sim.freshRun(era, origin);
Sim.pickChallengeGoal(homeRun, "downpay", era, origin);
assert.ok(homeRun.goal.downpayGoal > 0, "downpay stores cash target");
homeRun.money = 0;
homeRun.assets.sideFund = 0;
assert.equal(Sim.suggestMonth(homeRun, era, origin).actionId, "side",
  "downpay goal should suggest side hustle when incomplete");
homeRun.money = homeRun.goal.downpayGoal;
assert.equal(Sim.goalProgress(homeRun, era, origin), 100, "cash meeting target completes downpay");

console.log("R11 challenge goals + scoring passed.");
