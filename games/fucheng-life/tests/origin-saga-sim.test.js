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

console.log(
  `Origin saga sim: ${story.origins.length}/10 triggered by month 24 ` +
  `(range ${Math.min(...triggerMonths)}–${Math.max(...triggerMonths)}).`
);
