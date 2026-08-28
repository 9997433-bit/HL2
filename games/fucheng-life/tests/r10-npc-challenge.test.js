#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const originHtml = fs.readFileSync(path.join(gameRoot, "screens/origin-select.html"), "utf8");
const dashHtml = fs.readFileSync(path.join(gameRoot, "screens/dashboard.html"), "utf8");
const dashJs = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const css = fs.readFileSync(path.join(gameRoot, "css/fc-gameplay.css"), "utf8");

assert.ok(originHtml.includes('data-play-mode="challenge"'), "origin must offer 60-month challenge mode");
assert.ok(originHtml.includes('data-play-mode="full"'), "origin must offer full life mode");
assert.ok(originHtml.includes("playMode"), "origin must persist playMode");
assert.ok(dashJs.includes("data-npc-act"), "dashboard must render NPC act buttons");
assert.ok(dashJs.includes("onNpcInteract"), "dashboard must handle NPC interact");
assert.ok(dashJs.includes("fc-log__card--receipt") || dashJs.includes("receipt"),
  "dashboard must mark zone receipts");
assert.ok(css.includes(".fc-npc-act"), "NPC act button styles required");
assert.ok(css.includes(".fc-log__card--receipt"), "zone receipt styles required");
assert.ok(dashHtml.includes('id="relList"'), "relations list host required");
assert.ok(pack.endings && pack.endings.challenge, "gameplay pack must define challenge ending");

const store = { playMode: "challenge" };
const sandbox = {
  FC: {
    gameplay: pack,
    read() { return Object.assign({}, store); },
    write(patch) { Object.assign(store, patch); return store; }
  },
  console,
  localStorage: {
    getItem() { return null; },
    setItem() {}
  }
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

const challengeRun = Sim.freshRun(era, origin);
assert.equal(challengeRun.challengeMonths, 60, "challenge playMode must set 60-month limit");
challengeRun.months = 60;
assert.equal(Sim.checkEnd(challengeRun, origin), "challenge", "month 60 must end challenge run");
assert.equal(Sim.endingMeta("challenge").title, "闯城期满", "challenge ending title required");

store.playMode = "full";
const fullRun = Sim.freshRun(era, origin);
assert.equal(fullRun.challengeMonths, 0, "full mode must not set challenge months");
fullRun.months = 60;
assert.notEqual(Sim.checkEnd(fullRun, origin), "challenge", "full mode must not challenge-end at 60");

const run = Sim.freshRun(era, origin);
run.npcs = Sim.freshNpcs();
const chen = run.npcs.find((n) => n.id === "chenjie");
chen.balance = -3;
chen.flags = ["owe_rent"];

const opts = Sim.npcInteractOptions(run, "chenjie");
assert.ok(opts.some((o) => o.id === "repay"), "debt NPC must offer repay");
assert.ok(opts.some((o) => o.id === "dine"), "NPC must offer dine");

const beforeMoney = run.money;
const beforeBal = chen.balance;
const repay = Sim.interactNpc(run, "chenjie", "repay", era, origin);
assert.ok(repay && !repay.error, "repay should succeed");
assert.ok(run.money < beforeMoney, "repay spends money");
assert.ok(chen.balance > beforeBal, "repay raises balance");
assert.ok(!chen.flags.includes("owe_rent"), "repay clears owe_rent");

const busy = Sim.interactNpc(run, "chenjie", "dine", era, origin);
assert.ok(busy && busy.error, "second interact same month must fail");

const busyOpts = Sim.npcInteractOptions(run, "chenjie");
assert.ok(busyOpts.length === 1 && busyOpts[0].disabled, "busy state must disable acts");

run.months = 1;
run.npcActMonth = {};
const laozhou = run.npcs.find((n) => n.id === "laozhou");
laozhou.balance = 2;
const ask = Sim.interactNpc(run, "laozhou", "ask", era, origin);
assert.ok(ask && !ask.error, "ask should succeed with positive balance");
assert.ok(laozhou.balance <= 0, "ask spends favor balance");

run.months = 2;
run.npcActMonth = {};
const dine = Sim.interactNpc(run, "laozhou", "dine", era, origin);
assert.ok(dine && !dine.error, "dine should succeed");

console.log("R10 NPC interact + 60-month challenge + receipt wiring passed.");
