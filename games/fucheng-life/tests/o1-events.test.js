#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const storyPath = path.resolve(__dirname, "../data/story.json");
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
const expectedLayers = ["L1", "L2", "L3", "L4", "L5"];
assert.ok(Array.isArray(story.eras), "story.eras must be an array");
const eraIds = new Set(story.eras.map((era) => era.id));
const deltaRanges = {
  money: [-5, 5],
  debt: [-5, 5],
  health: [-8, 8],
  social: [-8, 8],
  rep: [-8, 8],
  edu: [-8, 8],
  gap: [0, 6]
};
const NGRAM_LENGTH = 10;
const narrativeGrams = new Map();

function assertUniqueNarrative(text, label) {
  const characters = Array.from(text);
  const localGrams = new Set();

  for (let index = 0; index <= characters.length - NGRAM_LENGTH; index++) {
    localGrams.add(characters.slice(index, index + NGRAM_LENGTH).join(""));
  }

  for (const gram of localGrams) {
    const firstSource = narrativeGrams.get(gram);
    assert.equal(firstSource, undefined,
      `${label} repeats ${NGRAM_LENGTH}-character phrase "${gram}" from ${firstSource}`);
    narrativeGrams.set(gram, label);
  }
}

assert.ok(Array.isArray(story.events), "story.events must be an array");
assert.ok(
  story.events.length >= 50,
  `story.events must contain at least 50 O1 events, got ${story.events.length}`
);

const eventIds = new Set();
const coveredLayers = new Set();

for (const [index, event] of story.events.entries()) {
  const label = `events[${index}]`;

  assert.ok(event && typeof event === "object" && !Array.isArray(event),
    `${label} must be an object`);
  assert.equal(typeof event.id, "string", `${label}.id must be a string`);
  assert.ok(event.id.trim(), `${label}.id must not be empty`);
  assert.ok(!eventIds.has(event.id), `duplicate O1 event id: ${event.id}`);
  eventIds.add(event.id);

  assert.equal(typeof event.body, "string", `${label}.body must be a string`);
  assertUniqueNarrative(event.body, `${event.id}.body`);

  assert.ok(expectedLayers.includes(event.layerId),
    `${label}.layerId must be one of L1-L5, got ${event.layerId}`);
  coveredLayers.add(event.layerId);

  if (event.eras !== undefined) {
    assert.ok(Array.isArray(event.eras) && event.eras.length > 0,
      `${label}.eras must be a non-empty array when present`);
    assert.equal(new Set(event.eras).size, event.eras.length,
      `${label}.eras must not contain duplicates`);
    for (const era of event.eras) {
      assert.ok(eraIds.has(era), `${label}.eras contains unknown story era: ${era}`);
    }
  }
  for (const field of ["minMonths", "maxMonths"]) {
    if (event[field] === undefined) continue;
    assert.ok(Number.isInteger(event[field]) && event[field] >= 0,
      `${label}.${field} must be a non-negative integer`);
  }
  if (event.minMonths !== undefined && event.maxMonths !== undefined) {
    assert.ok(event.minMonths <= event.maxMonths,
      `${label}.minMonths must not exceed maxMonths`);
  }

  assert.ok(Array.isArray(event.choices), `${label}.choices must be an array`);
  assert.ok(event.choices.length >= 2,
    `${label}.choices must contain at least 2 choices, got ${event.choices.length}`);

  if (event.type === "redline") {
    assert.ok(event.choices.some((choice) => choice.risk === true),
      `${label} redline events must offer at least one risk:true choice`);
  }

  for (const [choiceIndex, choice] of event.choices.entries()) {
    const choiceLabel = `${label}.choices[${choiceIndex}]`;
    const deltas = choice.d || choice.deltas;
    assert.ok(deltas && typeof deltas === "object" && !Array.isArray(deltas),
      `${choiceLabel}.d must be an object`);

    const entries = Object.entries(deltas);
    assert.ok(entries.length > 0, `${choiceLabel}.d must not be empty`);
    assert.ok(entries.filter(([, value]) => value !== 0).length <= 3,
      `${choiceLabel}.d must contain at most 3 non-zero keys`);

    for (const [stat, value] of entries) {
      assert.ok(Object.hasOwn(deltaRanges, stat),
        `${choiceLabel}.d contains unsupported stat: ${stat}`);
      assert.ok(Number.isInteger(value), `${choiceLabel}.d.${stat} must be an integer`);
      assert.notEqual(value, 0, `${choiceLabel}.d.${stat} must not be zero`);
      const [minimum, maximum] = deltaRanges[stat];
      assert.ok(value >= minimum && value <= maximum,
        `${choiceLabel}.d.${stat} must be within [${minimum}, ${maximum}], got ${value}`);
    }

    assert.equal(typeof choice.result, "string", `${choiceLabel}.result must be a string`);
    assertUniqueNarrative(choice.result, `${event.id}.${choice.id}.result`);
  }
}

assert.deepEqual(
  [...coveredLayers].sort(),
  expectedLayers,
  "O1 events must cover every city layer from L1 through L5"
);

console.log(
  `O1 event schema: ${story.events.length} events; delta bounds, redline risk, era gates, ` +
  `${NGRAM_LENGTH}-gram narrative uniqueness, and L1-L5 coverage passed.`
);
