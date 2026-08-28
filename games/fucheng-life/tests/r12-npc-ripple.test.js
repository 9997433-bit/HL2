#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const dashJs = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");

assert.ok(dashJs.includes("dueNpcRipple"), "dashboard must resolve NPC ripples on month tick");
assert.ok(dashJs.includes("人情余波"), "ripple log tag required");

const sandbox = {
  FC: { gameplay: pack },
  console,
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

const run = Sim.freshRun(era, origin);
run.npcs = Sim.freshNpcs();
run.career.picked = true;

const beforeRent = Sim.bills(run, era, origin).find((b) => b.k === "房租").v;
const chenjie = run.npcs.find((n) => n.id === "chenjie");
chenjie.flags = ["blacklist"];
const afterRent = Sim.bills(run, era, origin).find((b) => b.k === "房租").v;
assert.ok(afterRent > beforeRent, "blacklist must raise rent");

const beforeInc = Sim.income(run, era, origin);
const laozhou = run.npcs.find((n) => n.id === "laozhou");
laozhou.flags = ["drifted"];
const afterInc = Sim.income(run, era, origin);
assert.ok(afterInc < beforeInc, "drifted coworker must cut income");

laozhou.flags = [];
laozhou.balance = 1;
const dine = Sim.interactNpc(run, "laozhou", "dine", era, origin);
assert.ok(dine && !dine.error, "dine should work");
assert.ok(run.npcRipple && run.npcRipple.length >= 1, "dine must queue ripples");
assert.ok(run.npcRipple.some((q) => String(q.id).indexOf("arc_") === 0),
  "dine must queue NPC arc step");

run.months = Math.min(...run.npcRipple.map((q) => q.dueMonth));
let guard = 0;
while (guard++ < 5) {
  const due = Sim.dueNpcRipple(run);
  if (!due) break;
  const resolved = Sim.resolveNpcRipple(run, due, era, origin);
  assert.ok(resolved && resolved.text, "ripple resolve must yield text");
  assert.equal(due.fired, true, "ripple marked fired");
  if (run.months < due.dueMonth + 1) run.months = due.dueMonth;
  run.months += 1;
}

assert.ok(run.npcArc.laozhou && run.npcArc.laozhou.step >= 1,
  "dine path must advance laozhou arc");

run.months = Math.max(run.months, 4);
run.npcActMonth = {};
laozhou.balance = 2;
Sim.interactNpc(run, "laozhou", "ask", era, origin);
assert.ok(run.npcRipple.some((q) => !q.fired && (q.id === "ask_collect" || q.id === "ask_awkward")),
  "ask must queue collect/awkward ripple");

assert.ok(Sim.NPC_ARCS.chenjie && Sim.NPC_ARCS.amin && Sim.NPC_ARCS.wangzong && Sim.NPC_ARCS.xiaoyu,
  "five NPC arcs required");

console.log("R12 NPC ripples + face-turn consequences passed.");
