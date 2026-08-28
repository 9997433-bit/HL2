#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const dashJs = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");

assert.ok(dashJs.includes("pickMonthCrisis"), "dashboard must draw month crises");
assert.ok(dashJs.includes("resolveZoneAftershock"), "dashboard must resolve zone aftershocks");
assert.ok(dashJs.includes("本月危机") || dashJs.includes("crisisToEvent"),
  "crisis wiring present");

const sandbox = {
  FC: { gameplay: pack },
  console,
  Math,
  localStorage: { getItem() { return null; }, setItem() {} }
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8"), context, {
  filename: "js/fc-sim.js"
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

assert.ok(Sim.MONTH_CRISES.length >= 5, "need a pool of month crises");
assert.equal(typeof Sim.pickMonthCrisis, "function");
assert.equal(typeof Sim.crisisToEvent, "function");

const run = Sim.freshRun(era, origin);
run.career.picked = true;
run.months = 4;
run.lastCrisisMonth = 0;
run.health = 40;
run.social = 70;
const rnd = Math.random;
Math.random = function () { return 0; };
const crisis = Sim.pickMonthCrisis(run, era, origin);
Math.random = rnd;
assert.ok(crisis, "low health after gap should allow a crisis");
assert.ok(crisis.choices && crisis.choices.length === 2, "crisis must be binary");
assert.equal(crisis.id, "ot_or_rest", "health pressure should surface overtime crisis first");

const ev = Sim.crisisToEvent(crisis, run, origin);
assert.equal(ev.category, "本月危机");
assert.equal(ev.presentation, "modal");
assert.equal(ev.choices.length, 2);

run.lastCrisisMonth = run.months;
assert.equal(Sim.pickMonthCrisis(run, era, origin), null, "crisis must cool down 3 months");

run.months = 10;
run.lastCrisisMonth = 4;
run.health = 80;
run.debt = 0;
run.social = 80;
const forced = Sim.pickMonthCrisis(run, era, origin);
assert.ok(forced, "long gap without conditions still yields a fallback crisis");

/* Zone aftershock */
run.months = 1;
Sim.queueZoneAftershock(run, "auction");
assert.ok(run.zoneAftershock && run.zoneAftershock.sting, "auction is high-risk sting");
run.months = 2;
const zRip = Sim.resolveZoneAftershock(run, era, origin);
assert.ok(zRip && zRip.text.indexOf("auction") >= 0 || zRip.text.indexOf("探区") >= 0);
assert.ok(zRip.applied.money < 0 || zRip.applied.health < 0, "sting hurts");
assert.equal(run.zoneAftershock, null, "aftershock cleared");

Sim.queueZoneAftershock(run, "school");
assert.ok(run.zoneAftershock && !run.zoneAftershock.sting, "school is soft echo");
run.months = 3;
const soft = Sim.resolveZoneAftershock(run, era, origin);
assert.ok(soft.applied.social > 0 || soft.applied.rep > 0, "soft aftershock helps");

console.log("R13 month crisis + zone aftershock passed.");
