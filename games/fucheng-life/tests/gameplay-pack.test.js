#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const packPath = path.resolve(__dirname, "../data/gameplay-pack.json");
const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));

assert.equal(pack.version, 1);
assert.ok(Array.isArray(pack.actions) && pack.actions.length >= 6, "actions required");
assert.ok(Array.isArray(pack.ambientEvents) && pack.ambientEvents.length >= 80,
  "ambientEvents must have 80+ entries, got " + pack.ambientEvents.length);
assert.ok(Array.isArray(pack.sagas) && pack.sagas.length >= 3, "sagas required");
assert.ok(pack.zoneEvents && typeof pack.zoneEvents === "object", "zoneEvents required");
assert.ok(Object.keys(pack.zoneEvents).length >= 20, "zone event keys required");

console.log("Gameplay pack: " + pack.ambientEvents.length + " ambient events, " +
  Object.keys(pack.zoneEvents).length + " zones, " + pack.sagas.length + " sagas.");
