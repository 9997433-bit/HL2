#!/usr/bin/env node
"use strict";

/** Headless life sim — sanity-check pacing and event pool size */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const story = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));

const sandbox = {
  FC: { story, gameplay: pack },
  window: {},
  localStorage: { _m: {}, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = v; } }
};
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(gameRoot, rel), "utf8"), ctx, { filename: rel });
}

load("js/fc-sim.js");

const era = {
  id: "E7", name: "当前", startYear: 2021, yearAnchor: 2021,
  stats: { opportunity: 70, threshold: 50, volatility: 50 }
};
const origin = {
  id: "O03", storyId: "public-system", name: "白领", layer: 2,
  mods: { money: 50, health: 60, social: 55, edu: 65 },
  start: "¥ 12000"
};

assert.ok(story.events.length >= 50,
  "story.json event pool regressed below 50 entries: " + story.events.length);
assert.ok(story.origins.some((item) => item.id === origin.storyId),
  "life-sim fixture must reference a canonical story origin: " + origin.storyId);
assert.ok((pack.originSagas || []).some((saga) => saga.originId === origin.storyId),
  "life-sim fixture must exercise a mapped origin saga: " + origin.storyId);

function spendAp(run) {
  while (run.ap > 0 && FC.Sim.canAction(run, FC.Sim.actions()[0], era, origin)) {
    FC.Sim.doAction(run, "work", era, origin);
  }
}

function monthTick(run, seen) {
  run.months++;
  run.month++;
  if (run.month > 12) { run.month = 1; run.year++; }
  if (run.months % 12 === 0) run.age++;
  FC.Sim.tryStartRandomSaga(run, era, origin);
  if (run.saga) {
    const step = FC.Sim.sagaStep(run);
    if (step) FC.Sim.advanceSaga(run, 0, FC.Sim.income(run, era, origin));
  }
  const amb = FC.Sim.pickAmbient(run, era, origin);
  if (amb) {
    seen.add(amb.id);
    FC.Sim.applyDeltas(run, amb.d || {}, FC.Sim.income(run, era, origin));
  }
  const inc = FC.Sim.income(run, era, origin);
  const out = FC.Sim.bills(run, era, origin).reduce((a, b) => a + b.v, 0);
  run.money += inc - out;
  run.health = Math.max(0, Math.min(100, run.health + 1.2 - 0.3));
  FC.Sim.resetMonthAp(run, era);
  return FC.Sim.checkEnd(run, origin);
}

const FC = sandbox.FC;
FC.Sim.install(pack);
let run = FC.Sim.freshRun(era, origin);
const seen = new Set();
let end = null;
const MONTHS = 180;

for (let m = 0; m < MONTHS && !end; m++) {
  spendAp(run);
  end = monthTick(run, seen);
}

assert.ok(run.months >= MONTHS || !end, "sim ended too early at month " + run.months + ": " + end);
assert.ok(seen.size >= 80, "expected diverse events over 180 months, saw " + seen.size);
assert.ok(run.age >= 35, "age should progress realistically, got " + run.age);
assert.ok(run.health > 0, "health should not crash in 180 months with basic play");

console.log("Life sim: " + MONTHS + " months, " + seen.size + " unique ambient events, age " +
  run.age + ", money ¥" + Math.round(run.money).toLocaleString("zh-CN") +
  (end ? ", ending=" + end : ", no early ending"));
