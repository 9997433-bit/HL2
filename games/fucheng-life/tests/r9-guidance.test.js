#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const dashboardHtml = fs.readFileSync(path.join(gameRoot, "screens/dashboard.html"), "utf8");

assert.ok(dashboardHtml.includes('id="monthAdvice"'), "dashboard must show month advice host");

const sandbox = {
  FC: { gameplay: pack },
  console,
  localStorage: { getItem() { return null; }, setItem() {} }
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8"),
  context,
  { filename: "js/fc-sim.js" }
);

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
run.career.picked = true;
run.ap = 3;

assert.equal(typeof Sim.suggestMonth, "function", "suggestMonth API required");
assert.equal(Sim.suggestMonth(run, era, origin).actionId, "work",
  "default advice should be work");

run.health = 30;
assert.equal(Sim.suggestMonth(run, era, origin).actionId, "rest",
  "low health must suggest rest");
run.health = 70;

Sim.selectContract(run, "hukou", era, origin);
assert.equal(Sim.suggestMonth(run, era, origin).actionId, "study",
  "active hukou contract must suggest study");

run.contract = null;
Sim.selectContract(run, "promote", era, origin);
assert.equal(Sim.suggestMonth(run, era, origin).actionId, "work",
  "active promote contract must suggest work");

run.contract = null;
Sim.selectContract(run, "home", era, origin);
assert.equal(Sim.suggestMonth(run, era, origin).actionId, "side",
  "active home contract must suggest side hustle");

run.contract = null;
run.zoneQueue = "auction";
assert.equal(Sim.suggestMonth(run, era, origin).actionId, "explore",
  "set zone target must suggest explore");

run.zoneQueue = null;
run.npcs = Sim.freshNpcs();
run.npcs.forEach((n) => { if (n.id === "chenjie") n.balance = -4; });
assert.equal(Sim.suggestMonth(run, era, origin).actionId, "network",
  "debt NPC must suggest networking");

run.ap = 0;
assert.equal(Sim.suggestMonth(run, era, origin).urgency, "tick",
  "zero AP must urge advancing the month");

const auction = Sim.zoneBlurb("auction");
assert.ok(auction && auction.risk === "高" && auction.reward === "高",
  "auction zone must preview high risk/reward");
assert.ok(Sim.zoneBlurb("village"), "village zone blurb required");

console.log("R9 guidance: month advice priorities + zone blurbs passed.");
