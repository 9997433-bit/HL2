#!/usr/bin/env node
"use strict";

/** Headless probe: every canonical origin must start its own mini-saga by month 24. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const story = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const originSagaIds = new Set((pack.originSagas || []).map((saga) => saga.id));
const probePack = Object.assign({}, pack, {
  balance: Object.assign({}, pack.balance),
  // Keep this probe focused on origin chains rather than unrelated random sagas.
  sagas: (pack.sagas || []).filter((saga) => originSagaIds.has(saga.id))
});
const deterministicMath = Object.create(Math);
deterministicMath.random = () => 0;

const sandbox = {
  FC: { story, gameplay: probePack },
  window: {},
  Math: deterministicMath,
  localStorage: {
    _m: {},
    getItem(key) { return this._m[key] || null; },
    setItem(key, value) { this._m[key] = value; }
  }
};
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8"),
  ctx,
  { filename: "js/fc-sim.js" }
);

const FC = sandbox.FC;
FC.Sim.install(probePack);
const eraSource = story.eras[story.eras.length - 1];
const era = {
  id: eraSource.id,
  startYear: eraSource.simulationStartYear || eraSource.yearAnchor,
  yearAnchor: eraSource.yearAnchor,
  stats: eraSource.stats
};
const triggerMonths = [];

for (const source of story.origins) {
  const expected = (pack.originSagas || []).find((saga) => saga.originId === source.id);
  assert.ok(expected, `missing origin saga for ${source.id}`);
  const uiStats = source.uiStats || {};
  const origin = {
    id: source.legacyId || source.id,
    storyId: source.id,
    name: source.name,
    layer: source.layer,
    mods: {
      money: uiStats.money == null ? 50 : uiStats.money,
      health: uiStats.health == null ? 50 : uiStats.health,
      social: uiStats.social == null ? 50 : uiStats.social,
      edu: uiStats.education == null ? 50 : uiStats.education
    },
    start: `¥ ${source.startMoney}`
  };
  const run = FC.Sim.freshRun(era, origin);
  let triggeredAt = null;

  for (let month = 1; month <= 24; month++) {
    run.months = month;
    run.age = 22 + Math.floor(month / 12);
    if (typeof FC.Sim.tryStartOriginSaga === "function") {
      FC.Sim.tryStartOriginSaga(run, origin);
    } else {
      FC.Sim.tryStartRandomSaga(run, era, origin);
    }
    if (!run.saga) continue;
    assert.equal(run.saga.id, expected.id,
      `${source.id} started another origin's saga at month ${month}`);
    triggeredAt = month;
    break;
  }

  assert.ok(triggeredAt, `${source.id} origin saga did not trigger within 24 months`);
  triggerMonths.push(triggeredAt);

  let resolvedSteps = 0;
  while (run.saga) {
    const step = FC.Sim.sagaStep(run);
    assert.ok(step, `${expected.id} must expose its current step`);
    const result = FC.Sim.advanceSaga(run, 0, FC.Sim.income(run, era, origin));
    assert.ok(result, `${expected.id} step ${resolvedSteps} must be resolvable`);
    resolvedSteps++;
    assert.ok(resolvedSteps <= expected.steps.length,
      `${expected.id} did not finish after its declared steps`);
  }
  assert.equal(resolvedSteps, expected.steps.length,
    `${expected.id} must execute every declared step`);

  run.months = triggeredAt + 1;
  const restarted = typeof FC.Sim.tryStartOriginSaga === "function"
    ? FC.Sim.tryStartOriginSaga(run, origin)
    : FC.Sim.tryStartRandomSaga(run, era, origin);
  assert.equal(restarted, false,
    `${expected.id} must not restart after completion`);
  assert.equal(run.saga, null, `${expected.id} must remain completed`);
}

/* The trigger month itself is random: replay each origin under a seeded roll and
   assert the chain still lands inside the declared months 3–18 window. */
const window = {
  min: probePack.balance.originSagaMinMonths,
  max: probePack.balance.originSagaMaxMonths
};
let seed = 20260828;
deterministicMath.random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

const seededMonths = [];
for (const source of story.origins) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const origin = {
      id: source.legacyId || source.id,
      storyId: source.id,
      layer: source.layer,
      mods: { money: 50, health: 60, social: 55, edu: 60 },
      start: `¥ ${source.startMoney}`
    };
    const run = FC.Sim.freshRun(era, origin);
    let triggeredAt = null;
    for (let month = 1; month <= 36 && !triggeredAt; month++) {
      run.months = month;
      if (FC.Sim.tryStartOriginSaga(run, origin)) triggeredAt = month;
    }
    assert.ok(triggeredAt, `${source.id} origin saga never fired under seeded rolls`);
    assert.ok(triggeredAt >= window.min && triggeredAt <= window.max,
      `${source.id} fired at month ${triggeredAt}, outside months ${window.min}–${window.max}`);
    seededMonths.push(triggeredAt);
  }
}

console.log(
  `Origin saga sim: ${story.origins.length}/10 triggered by month 24 ` +
  `(range ${Math.min(...triggerMonths)}–${Math.max(...triggerMonths)}), ` +
  `seeded replays land in months ${Math.min(...seededMonths)}–${Math.max(...seededMonths)}.`
);
