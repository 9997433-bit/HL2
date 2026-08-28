#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const gameRoot = path.resolve(__dirname, "..");
const story = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));

function nonEmptyString(value, label) {
  assert.equal(typeof value, "string", label + " must be a string");
  assert.ok(value.trim(), label + " must not be empty");
}

assert.ok(Array.isArray(story.origins), "story.origins must be an array");
assert.equal(story.origins.length, 10, "the game must define exactly 10 origins");
assert.ok(Array.isArray(pack.originSagas), "gameplay pack must define originSagas");
assert.equal(pack.originSagas.length, story.origins.length,
  "originSagas must contain exactly one saga per origin");

const originIds = story.origins.map((origin) => origin.id);
const originIdSet = new Set(originIds);
const sagaIds = new Set();
const mappedOriginIds = new Set();
const allowedDeltaKeys = new Set(["money", "health", "social", "rep", "edu", "debt", "gap"]);
const sagaMoneyRanges = [];

for (const [sagaIndex, saga] of pack.originSagas.entries()) {
  const label = `originSagas[${sagaIndex}]`;
  nonEmptyString(saga.id, `${label}.id`);
  nonEmptyString(saga.originId, `${label}.originId`);
  nonEmptyString(saga.title, `${label}.title`);
  assert.ok(!sagaIds.has(saga.id), `${label}.id must be unique: ${saga.id}`);
  sagaIds.add(saga.id);
  assert.ok(originIdSet.has(saga.originId),
    `${label}.originId must reference story.origins: ${saga.originId}`);
  assert.ok(!mappedOriginIds.has(saga.originId),
    `${label}.originId must be mapped only once: ${saga.originId}`);
  mappedOriginIds.add(saga.originId);

  assert.ok(Array.isArray(saga.steps), `${label}.steps must be an array`);
  assert.ok(saga.steps.length >= 3 && saga.steps.length <= 4,
    `${label}.steps must contain 3–4 steps, got ${saga.steps.length}`);

  let moneyTotals = [0];
  for (const [stepIndex, step] of saga.steps.entries()) {
    const stepLabel = `${label}.steps[${stepIndex}]`;
    nonEmptyString(step.title, `${stepLabel}.title`);
    nonEmptyString(step.text, `${stepLabel}.text`);
    assert.ok(step.d || (Array.isArray(step.choices) && step.choices.length >= 2),
      `${stepLabel} must define deltas or at least two choices`);

    const outcomes = step.choices || [step];
    for (const [outcomeIndex, outcome] of outcomes.entries()) {
      const outcomeLabel = step.choices
        ? `${stepLabel}.choices[${outcomeIndex}]`
        : stepLabel;
      if (step.choices) nonEmptyString(outcome.text, `${outcomeLabel}.text`);
      assert.ok(outcome.d && typeof outcome.d === "object" && !Array.isArray(outcome.d),
        `${outcomeLabel}.d must be an object`);
      for (const [key, value] of Object.entries(outcome.d)) {
        assert.ok(allowedDeltaKeys.has(key), `${outcomeLabel}.d has unsupported key: ${key}`);
        assert.ok(Number.isFinite(value), `${outcomeLabel}.d.${key} must be finite`);
      }
    }
    moneyTotals = moneyTotals.flatMap((total) =>
      outcomes.map((outcome) => total + (outcome.d.money || 0)));
  }

  const moneyMin = Math.min(...moneyTotals);
  const moneyMax = Math.max(...moneyTotals);
  assert.ok(moneyMin >= -8 && moneyMax <= 6,
    `${label} possible money totals must stay within [-8, +6], got [${moneyMin}, ${moneyMax}]`);
  sagaMoneyRanges.push({ min: moneyMin, max: moneyMax });
}

assert.deepEqual(
  [...mappedOriginIds].sort(),
  originIds.slice().sort(),
  "originSagas must map every canonical story origin exactly once"
);

/* --------------------------------------------- authored-content guarantees */

const han = /[\u4e00-\u9fa5]/;

for (const [sagaIndex, saga] of pack.originSagas.entries()) {
  const label = `originSagas[${sagaIndex}]`;
  assert.equal(saga.kind, "origin", `${label}.kind must be "origin" so the UI can tag it`);
  assert.ok(han.test(saga.title), `${label}.title must be written in Chinese`);

  const choiceSteps = saga.steps.filter((step) => Array.isArray(step.choices) && step.choices.length >= 2);
  assert.ok(choiceSteps.length >= 1, `${label} must offer a decision in at least one step`);
  for (const step of choiceSteps) {
    assert.ok(step.choices.length <= 3, `${label} steps must stay at 2–3 choices`);
  }

  for (const [stepIndex, step] of saga.steps.entries()) {
    const stepLabel = `${label}.steps[${stepIndex}]`;
    assert.ok(han.test(step.title), `${stepLabel}.title must be written in Chinese`);
    assert.ok(han.test(step.text), `${stepLabel}.text must be written in Chinese`);
    assert.ok(step.text.length >= 14, `${stepLabel}.text is too thin to read as prose: ${step.text}`);
  }
}

/* Origin chains live in their own pool so the random saga roll cannot draw them. */
const randomSagaIds = new Set((pack.sagas || []).map((saga) => saga.id));
for (const saga of pack.originSagas) {
  assert.ok(!randomSagaIds.has(saga.id), `${saga.id} must stay out of the random saga pool`);
}

const balance = pack.balance || {};
assert.equal(balance.originSagaMinMonths, 3, "origin chains must wait until month 3");
assert.equal(balance.originSagaMaxMonths, 18, "origin chains must be guaranteed by month 18");
assert.ok(balance.originSagaMonthlyOdds > 0 && balance.originSagaMonthlyOdds < 1,
  "origin chain odds must leave the trigger month random inside the window");

console.log(`Origin sagas: ${pack.originSagas.length} origins mapped one-to-one, 3–4 steps each, ` +
  `${pack.originSagas.reduce((total, saga) => total + saga.steps.length, 0)} steps total; ` +
  `all money paths within [-8, +6] (observed ` +
  `${Math.min(...sagaMoneyRanges.map((range) => range.min))} to ` +
  `${Math.max(...sagaMoneyRanges.map((range) => range.max))}).`);
