#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const story = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));

const sandbox = {
  console,
  FC: {},
  localStorage: {
    _m: new Map(),
    getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
    setItem(k, v) { this._m.set(k, String(v)); },
    removeItem(k) { this._m.delete(k); }
  },
  window: null
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8"), context, { filename: "fc-sim.js" });
context.FC.Sim.install(pack);

const era = { id: "E7", startYear: 2020, stats: { opportunity: 80 } };
const origin = {
  id: "O01", name: "测试", start: "¥3000", layer: 2,
  mods: { edu: 50, social: 50, health: 70 }
};

const run = context.FC.Sim.freshRun(era, origin);
assert.equal(run.version, 4, "fresh run must be v4");
assert.equal(run.career.picked, false, "career track must await player pick");
assert.ok(Array.isArray(run.talents), "talents must be an array");
assert.ok(pack.secondaryContracts && pack.secondaryContracts.length === 3,
  "pack must ship 3 secondary contracts");
assert.ok(pack.assetCatalog && pack.assetCatalog.length >= 3,
  "pack must ship asset catalog");

run.career.picked = true;
run.contract = { id: "hukou", status: "won", settledMonth: 10, progress: 100, target: 100 };
run.months = 12;
assert.ok(context.FC.Sim.canPickSecondary(run), "won primary contract opens secondary window");

run.money = 50000;
run.assets = { property: null, vehicle: null, sideFund: 0, owned: [] };
const bought = context.FC.Sim.buyAsset(run, "ebike", era, origin);
assert.ok(bought, "ebike purchase must succeed with enough cash");
assert.equal(run.assets.vehicle, "二手电动车");

run.npcs = context.FC.Sim.freshNpcs();
run.npcs.forEach((n) => { if (n.id === "chenjie") n.balance = -4; });
const debtor = context.FC.Sim.debtNpc(run);
assert.equal(debtor.id, "chenjie", "debtNpc must surface worst debtor");

const debtEvents = story.events.filter((e) =>
  e.requires && e.requires.npc && e.requires.maxBalance <= -3);
assert.ok(debtEvents.length >= 5, "need 5+ debt collection events, got " + debtEvents.length);

const careerEvents = story.events.filter((e) => ["EV98", "EV99", "EV100"].includes(e.id));
assert.equal(careerEvents.length, 3, "career transfer/review events must exist");

console.log("R6 system: v4 run, secondary contracts, assets, debt NPC, career events passed.");
