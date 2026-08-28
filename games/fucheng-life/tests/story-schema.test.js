#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const storyPath = path.resolve(__dirname, "../data/story.json");
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));

function nonEmptyString(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.ok(value.trim(), `${label} must not be empty`);
}

function finiteNumber(value, label) {
  assert.equal(typeof value, "number", `${label} must be a number`);
  assert.ok(Number.isFinite(value), `${label} must be finite`);
}

function exactIds(items, expected, label) {
  const ids = items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
  assert.deepEqual(ids.slice().sort(), expected.slice().sort(), `${label} IDs differ from the expected set`);
}

const MIN_EVENTS = 50;
const EVENT_CATEGORIES = new Set([
  "职场", "金钱", "生计", "人情", "关系", "机会", "风险", "居住", "教育"
]);
const DELTA_STATS = new Set(["money", "health", "social", "rep"]);

assert.ok(story && typeof story === "object" && !Array.isArray(story), "story.json must contain an object");
assert.ok(Array.isArray(story.eras), "story.eras must be an array");
assert.ok(Array.isArray(story.origins), "story.origins must be an array");
assert.ok(Array.isArray(story.cityLayers), "story.cityLayers must be an array");
assert.ok(Array.isArray(story.events), "story.events must be an array");

assert.equal(story.eras.length, 7, "story.json must define exactly 7 eras");
assert.equal(story.origins.length, 10, "story.json must define exactly 10 origins");
assert.equal(story.cityLayers.length, 5, "story.json must define exactly 5 city layers");
assert.ok(story.events.length >= MIN_EVENTS,
  `story.json must define at least ${MIN_EVENTS} modal events (found ${story.events.length})`);

exactIds(story.eras, ["E1", "E2", "E3", "E4", "E5", "E6", "E7"], "Era");
exactIds(story.cityLayers, ["L1", "L2", "L3", "L4", "L5"], "City layer");

const eventIds = story.events.map((event) => event.id);
assert.equal(new Set(eventIds).size, eventIds.length, "Event IDs must be unique");

for (const [index, era] of story.eras.entries()) {
  const label = `eras[${index}]`;
  nonEmptyString(era.name, `${label}.name`);
  nonEmptyString(era.tagline, `${label}.tagline`);
  nonEmptyString(era.yearLabel, `${label}.yearLabel`);
  finiteNumber(era.yearAnchor, `${label}.yearAnchor`);
  finiteNumber(era.simulationStartYear, `${label}.simulationStartYear`);
  assert.ok(Array.isArray(era.tags) && era.tags.length > 0, `${label}.tags must be a non-empty array`);
  assert.ok(era.stats && typeof era.stats === "object", `${label}.stats must be an object`);
  for (const stat of ["opportunity", "threshold", "volatility"]) {
    finiteNumber(era.stats[stat], `${label}.stats.${stat}`);
  }
  assert.ok(era.start && typeof era.start === "object", `${label}.start must be an object`);
  assert.ok(Number.isInteger(era.start.layer) && era.start.layer >= 1 && era.start.layer <= 5,
    `${label}.start.layer must reference L1-L5`);
  finiteNumber(era.start.money, `${label}.start.money`);
}

for (const [index, origin] of story.origins.entries()) {
  const label = `origins[${index}]`;
  nonEmptyString(origin.id, `${label}.id`);
  nonEmptyString(origin.name, `${label}.name`);
  nonEmptyString(origin.description, `${label}.description`);
  assert.ok(Number.isInteger(origin.layer) && origin.layer >= 1 && origin.layer <= 5,
    `${label}.layer must reference L1-L5`);
  finiteNumber(origin.startMoney, `${label}.startMoney`);
  assert.ok(Array.isArray(origin.tags) && origin.tags.length > 0, `${label}.tags must be a non-empty array`);
  assert.ok(origin.statModifiers && typeof origin.statModifiers === "object",
    `${label}.statModifiers must be an object`);
  for (const stat of ["money", "education", "connections", "stability", "resilience"]) {
    finiteNumber(origin.statModifiers[stat], `${label}.statModifiers.${stat}`);
  }
}

for (const [index, layer] of story.cityLayers.entries()) {
  const label = `cityLayers[${index}]`;
  nonEmptyString(layer.name, `${label}.name`);
  nonEmptyString(layer.description, `${label}.description`);
  assert.ok(Number.isInteger(layer.unlockLevel) && layer.unlockLevel > 0,
    `${label}.unlockLevel must be a positive integer`);
  assert.match(layer.color, /^#[\da-f]{6}$/i, `${label}.color must be a six-digit hex color`);
}

const layerIds = new Set(story.cityLayers.map((layer) => layer.id));
const coveredLayers = new Set();

for (const [index, event] of story.events.entries()) {
  const label = `events[${index}]`;
  nonEmptyString(event.id, `${label}.id`);
  nonEmptyString(event.title, `${label}.title`);
  nonEmptyString(event.category, `${label}.category`);
  nonEmptyString(event.body, `${label}.body`);
  assert.ok(EVENT_CATEGORIES.has(event.category),
    `${label}.category must be one of ${[...EVENT_CATEGORIES].join("/")}`);
  assert.ok(layerIds.has(event.layerId), `${label}.layerId must reference a defined city layer`);
  coveredLayers.add(event.layerId);
  finiteNumber(event.weight, `${label}.weight`);
  assert.ok(event.weight > 0, `${label}.weight must be positive`);
  if (event.type !== undefined) {
    assert.ok(["opportunity", "bill", "relation", "redline"].includes(event.type),
      `${label}.type must be a known overlay type`);
  }
  if (event.category === "风险") {
    assert.equal(event.type, "redline", `${label} is a 风险 event and must declare type "redline"`);
  }

  assert.ok(Array.isArray(event.choices), `${label}.choices must be an array`);
  assert.ok(event.choices.length >= 2 && event.choices.length <= 3,
    `${label}.choices must offer 2-3 options (found ${event.choices.length})`);

  const choiceIds = new Set();
  for (const [choiceIndex, choice] of event.choices.entries()) {
    const choiceLabel = `${label}.choices[${choiceIndex}]`;
    nonEmptyString(choice.id, `${choiceLabel}.id`);
    assert.ok(!choiceIds.has(choice.id), `${choiceLabel}.id must be unique within the event`);
    choiceIds.add(choice.id);
    nonEmptyString(choice.label, `${choiceLabel}.label`);
    nonEmptyString(choice.result, `${choiceLabel}.result`);

    const deltas = choice.d || choice.deltas;
    assert.ok(deltas && typeof deltas === "object" && !Array.isArray(deltas),
      `${choiceLabel} must carry a d/deltas object`);
    const stats = Object.keys(deltas);
    assert.ok(stats.length > 0, `${choiceLabel} must move at least one stat`);
    for (const stat of stats) {
      assert.ok(DELTA_STATS.has(stat), `${choiceLabel}.d.${stat} is not a known stat`);
      finiteNumber(deltas[stat], `${choiceLabel}.d.${stat}`);
      assert.ok(deltas[stat] !== 0, `${choiceLabel}.d.${stat} must not be zero`);
    }
  }
}

assert.equal(coveredLayers.size, layerIds.size, "story.events must cover every city layer");

console.log(
  `Story schema: 7 eras, 10 origins, 5 layers, and ${story.events.length} events passed.`
);
