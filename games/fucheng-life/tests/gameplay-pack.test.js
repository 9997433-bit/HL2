#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const packPath = path.resolve(__dirname, "../data/gameplay-pack.json");
const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));

assert.ok(pack.version >= 2, "gameplay pack version 2+");
assert.ok(Array.isArray(pack.actions) && pack.actions.length >= 6, "actions required");
assert.ok(Array.isArray(pack.ambientEvents) && pack.ambientEvents.length >= 300,
  "ambientEvents must have 300+ unique entries, got " + pack.ambientEvents.length);
assert.ok(Array.isArray(pack.sagas) && pack.sagas.length >= 10, "sagas required, got " + pack.sagas.length);
assert.ok(pack.zoneEvents && typeof pack.zoneEvents === "object", "zoneEvents required");

const zoneCount = Object.keys(pack.zoneEvents).length;
const zoneEvents = Object.values(pack.zoneEvents).reduce((a, b) => a + b.length, 0);
assert.ok(zoneCount >= 20, "zone event keys required");
assert.ok(zoneEvents >= 100, "zone events must be rich, got " + zoneEvents);

const ids = new Set();
pack.ambientEvents.forEach((e) => {
  assert.ok(e.id && e.text, "ambient event needs id+text: " + JSON.stringify(e).slice(0, 80));
  assert.ok(!ids.has(e.id), "duplicate ambient id " + e.id);
  ids.add(e.id);
});

console.log("Gameplay pack: " + pack.ambientEvents.length + " ambient, " +
  zoneCount + " zones / " + zoneEvents + " zone events, " + pack.sagas.length + " sagas.");
