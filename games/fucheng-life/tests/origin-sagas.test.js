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
  }
}

assert.deepEqual(
  [...mappedOriginIds].sort(),
  originIds.slice().sort(),
  "originSagas must map every canonical story origin exactly once"
);

console.log(`Origin sagas: ${pack.originSagas.length} origins mapped one-to-one, 3–4 steps each.`);
