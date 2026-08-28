#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const story = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));

const sandbox = {
  FC: { gameplay: pack },
  console,
  Math,
  document: { addEventListener() {}, body: { classList: { add() {}, remove() {} } } },
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
  id: "O01", storyId: "humble-scholar", name: "寒门",
  layer: 1, mods: { money: 30, health: 60, social: 40, edu: 86 },
  start: "¥ 3000"
};

/* --- 落户 pacing：每月进修也不该在 12 月内达成 --- */
const hukouRun = Sim.freshRun(era, origin);
hukouRun.edu = 86;
hukouRun.career.picked = true;
assert.ok(Sim.selectContract(hukouRun, "hukou", era, origin));
assert.ok(Sim.contractProgress(hukouRun) < 40, "elite hukou start < 40%");

for (let m = 0; m < 12; m++) {
  hukouRun.months = m + 1;
  hukouRun.edu = Math.min(100, hukouRun.edu + 6);
  Sim.creditContract(hukouRun, 0.8 + 6 * 0.12);
  Sim.tickContract(hukouRun, era, origin);
}
assert.equal(hukouRun.contract.status, "active",
  "hukou must still be active after 12 months of study spam");
assert.ok(Sim.contractProgress(hukouRun) < 95,
  "hukou progress after 12 study months must stay under 95%, got " +
    Sim.contractProgress(hukouRun));

/* --- 人情回账队列：挂 flag → 到期可 due --- */
const debtRun = Sim.freshRun(era, origin);
debtRun.career.picked = true;
debtRun.months = 5;
Sim.applyNpcEffects(debtRun, [
  { id: "chenjie", balance: -1, flag: "owe_rent" }
]);
assert.ok(debtRun.npcQueue && debtRun.npcQueue.length === 1,
  "owe_rent must enqueue EV88 followup");
assert.equal(debtRun.npcQueue[0].eventId, "EV88");
assert.ok(debtRun.npcQueue[0].dueMonth >= 7 && debtRun.npcQueue[0].dueMonth <= 9,
  "followup due window must be +2..+4 months");

debtRun.months = debtRun.npcQueue[0].dueMonth;
const due = Sim.dueNpcFollowup(debtRun);
assert.ok(due && due.eventId === "EV88", "dueNpcFollowup must surface EV88");

/* --- EV89 门禁放宽：只要求 flag --- */
const ev89 = story.events.find((e) => e.id === "EV89");
assert.ok(ev89 && ev89.requires && ev89.requires.flag === "owe_dinner");
assert.equal(ev89.requires.maxBalance, undefined,
  "EV89 must not require maxBalance after R8");

const eventsSrc = fs.readFileSync(path.join(gameRoot, "js/fc-events.js"), "utf8");
assert.ok(eventsSrc.includes("byId:"), "FC.events.byId must exist for forced followups");
assert.ok(eventsSrc.includes("w *= 5.0"), "NPC requires weight multiplier must be ×5");

console.log("R8 pacing: hukou rebalance + NPC followup queue + EV89 gate passed.");
