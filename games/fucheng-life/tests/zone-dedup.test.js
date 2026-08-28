#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const math = Object.create(Math);
math.random = () => 0;

const sandbox = {
  FC: {
    gameplay: pack,
    read() { return {}; }
  },
  localStorage: {
    getItem() { return null; },
    setItem() {}
  },
  Math: math
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);
const source = fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8");
vm.runInContext(source, context, { filename: "js/fc-sim.js" });
context.FC.Sim.install(pack);

const era = { id: "E7", startYear: 2021, yearAnchor: 2021 };
const origin = {
  id: "O03",
  storyId: "public-system",
  layer: 2,
  mods: { money: 50, health: 60, social: 55, edu: 65 },
  start: "¥ 12000"
};
const run = context.FC.Sim.freshRun(era, origin);
const zoneKey = Object.keys(pack.zoneEvents)
  .find((key) => Array.isArray(pack.zoneEvents[key]) && pack.zoneEvents[key].length >= 5);

assert.ok(zoneKey, "zone dedup needs a zone with at least five events");
const zone = pack.zoneEvents[zoneKey];
const pickedIndexes = [];

for (let pickNumber = 0; pickNumber < 20; pickNumber++) {
  const event = context.FC.Sim.pickZoneEvent(run, zoneKey);
  const index = zone.indexOf(event);
  assert.ok(index >= 0, `pick ${pickNumber + 1} must come from zone ${zoneKey}`);
  if (pickedIndexes.length) {
    assert.notEqual(index, pickedIndexes[pickedIndexes.length - 1],
      `zone ${zoneKey} repeated index ${index} on consecutive picks`);
  }
  pickedIndexes.push(index);
}

console.log(`Zone dedup: ${zoneKey} produced 20 picks with no consecutive index repeat ` +
  `(${pickedIndexes.join(" → ")}).`);
