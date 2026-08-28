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

assert.ok(story && typeof story === "object" && !Array.isArray(story), "story.json must contain an object");
assert.ok(Array.isArray(story.eras), "story.eras must be an array");
assert.ok(Array.isArray(story.origins), "story.origins must be an array");
assert.ok(Array.isArray(story.cityLayers), "story.cityLayers must be an array");
assert.ok(Array.isArray(story.sampleEvents), "story.sampleEvents must be an array");

assert.equal(story.eras.length, 7, "story.json must define exactly 7 eras");
assert.equal(story.origins.length, 10, "story.json must define exactly 10 origins");
assert.equal(story.cityLayers.length, 5, "story.json must define exactly 5 city layers");
assert.equal(story.sampleEvents.length, 10, "story.json must define exactly 10 sample events");

exactIds(story.eras, ["E1", "E2", "E3", "E4", "E5", "E6", "E7"], "Era");
exactIds(story.cityLayers, ["L1", "L2", "L3", "L4", "L5"], "City layer");
exactIds(
  story.sampleEvents,
  ["EV01", "EV02", "EV03", "EV04", "EV05", "EV06", "EV07", "EV08", "EV09", "EV10"],
  "Event"
);

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
for (const [index, event] of story.sampleEvents.entries()) {
  const label = `sampleEvents[${index}]`;
  nonEmptyString(event.title, `${label}.title`);
  nonEmptyString(event.category, `${label}.category`);
  nonEmptyString(event.text, `${label}.text`);
  assert.ok(layerIds.has(event.layerId), `${label}.layerId must reference a defined city layer`);
}

console.log("Story schema: 7 eras, 10 origins, 5 layers, and 10 events passed.");
