#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const storyPath = path.resolve(__dirname, "../data/story.json");
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
const expectedLayers = ["L1", "L2", "L3", "L4", "L5"];

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

  assert.ok(expectedLayers.includes(event.layerId),
    `${label}.layerId must be one of L1-L5, got ${event.layerId}`);
  coveredLayers.add(event.layerId);

  assert.ok(Array.isArray(event.choices), `${label}.choices must be an array`);
  assert.ok(event.choices.length >= 2,
    `${label}.choices must contain at least 2 choices, got ${event.choices.length}`);
}

assert.deepEqual(
  [...coveredLayers].sort(),
  expectedLayers,
  "O1 events must cover every city layer from L1 through L5"
);

console.log(
  `O1 event schema: ${story.events.length} events, unique IDs, 2+ choices, L1-L5 coverage passed.`
);
