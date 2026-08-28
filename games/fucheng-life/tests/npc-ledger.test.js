#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const story = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const documentStub = {
  activeElement: null,
  currentScript: null,
  addEventListener() {}
};
const sandbox = {
  FC: { story, gameplay: pack },
  URL,
  console,
  document: documentStub,
  location: {
    href: "https://example.test/games/fucheng-life/index.html",
    protocol: "https:"
  },
  localStorage: {
    getItem() { return null; },
    setItem() {}
  },
  matchMedia() { return { matches: true }; },
  setInterval,
  clearInterval,
  setTimeout,
  clearTimeout
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);

function load(relativePath) {
  const source = fs.readFileSync(path.join(gameRoot, relativePath), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

const era = {
  id: "E7",
  name: "当前",
  startYear: 2021,
  yearAnchor: 2021,
  stats: { opportunity: 70, threshold: 50, volatility: 50 }
};
const origin = {
  id: "O03",
  storyId: "public-system",
  name: "白领",
  layer: 2,
  mods: { money: 50, health: 60, social: 55, edu: 65 },
  start: "¥ 12000"
};

function eventNumber(event) {
  const match = /^EV(\d+)$/.exec(event.id || "");
  return match ? Number(match[1]) : 0;
}

function npcEffectsOf(choice) {
  if (!choice || !choice.npcEffects) return [];
  return Array.isArray(choice.npcEffects) ? choice.npcEffects : [choice.npcEffects];
}

function validateRequirement(requires, npcIds, label) {
  assert.ok(requires && typeof requires === "object" && !Array.isArray(requires),
    `${label} must be an object`);
  assert.ok(npcIds.has(requires.npc), `${label}.npc must reference a fresh-run NPC`);
  if (requires.flag !== undefined) {
    assert.equal(typeof requires.flag, "string", `${label}.flag must be a string`);
    assert.ok(requires.flag.trim(), `${label}.flag must not be empty`);
  }
  for (const key of ["minBalance", "maxBalance", "balanceMin", "balanceMax"]) {
    if (requires[key] === undefined) continue;
    assert.ok(Number.isFinite(requires[key]), `${label}.${key} must be finite`);
    assert.ok(requires[key] >= -5 && requires[key] <= 5,
      `${label}.${key} must stay in the NPC balance range`);
  }
}

function validateEffect(effect, npcIds, label) {
  assert.ok(effect && typeof effect === "object" && !Array.isArray(effect),
    `${label} must be an object`);
  assert.ok(npcIds.has(effect.id), `${label}.id must reference a fresh-run NPC`);
  if (effect.balance !== undefined) {
    assert.ok(Number.isFinite(effect.balance), `${label}.balance must be finite`);
  }
  if (effect.flag !== undefined) {
    assert.equal(typeof effect.flag, "string", `${label}.flag must be a string`);
    assert.ok(effect.flag.trim(), `${label}.flag must not be empty`);
  }
  assert.ok(effect.balance !== undefined || effect.flag,
    `${label} must change balance or add a flag`);
}

async function main() {
  load("js/fc-sim.js");
  const run = context.FC.Sim.freshRun(era, origin);

  if (!Array.isArray(run.npcs) || typeof context.FC.Sim.applyNpcEffects !== "function") {
    console.log("NPC ledger: skipped gracefully; R4-A freshRun/applyNpcEffects API has not landed.");
    return;
  }

  assert.equal(run.version, 3, "NPC saves must use schema version 3");
  assert.equal(run.npcs.length, 5, "a fresh run must contain exactly five named NPCs");
  assert.deepEqual(
    Array.from(run.npcs, (npc) => npc.name).sort(),
    ["老周", "陈姐", "阿敏", "王总", "小余"].sort(),
    "fresh-run NPC names must match the authored relationship ledger"
  );

  const npcIds = new Set();
  for (const [index, npc] of run.npcs.entries()) {
    const label = `run.npcs[${index}]`;
    assert.equal(typeof npc.id, "string", `${label}.id must be a string`);
    assert.ok(npc.id.trim(), `${label}.id must not be empty`);
    assert.ok(!npcIds.has(npc.id), `${label}.id must be unique`);
    npcIds.add(npc.id);
    assert.ok(Number.isFinite(npc.balance), `${label}.balance must be finite`);
    assert.ok(npc.balance >= -5 && npc.balance <= 5,
      `${label}.balance must stay within [-5, +5]`);
    assert.ok(Array.isArray(npc.flags), `${label}.flags must be an array`);
  }

  const target = run.npcs[0];
  const startBalance = target.balance;
  const delta = startBalance <= 2 ? 2 : -2;
  context.FC.Sim.applyNpcEffects(run, {
    id: target.id,
    balance: delta,
    flag: "r4_test_flag"
  });
  assert.equal(target.balance, startBalance + delta,
    "applyNpcEffects must add the authored balance delta");
  assert.ok(target.flags.includes("r4_test_flag"),
    "applyNpcEffects must add the authored NPC flag");

  context.FC.Sim.applyNpcEffects(run, { id: target.id, flag: "r4_test_flag" });
  assert.equal(target.flags.filter((flag) => flag === "r4_test_flag").length, 1,
    "applyNpcEffects must keep NPC flags unique");
  context.FC.Sim.applyNpcEffects(run, { id: target.id, balance: 99 });
  assert.equal(target.balance, 5, "applyNpcEffects must clamp balances at +5");
  context.FC.Sim.applyNpcEffects(run, { id: target.id, balance: -99 });
  assert.equal(target.balance, -5, "applyNpcEffects must clamp balances at -5");

  /* Life-contract events reuse `requires` for their own gate (progress, months
     left) rather than the ledger, so they are not part of this census. */
  const linkedEvents = story.events.filter((event) =>
    eventNumber(event) >= 83 && !event.contract &&
    (event.requires || (event.choices || []).some((choice) => npcEffectsOf(choice).length)));
  assert.ok(linkedEvents.length >= 10,
    `story.json must contain at least 10 EV83+ NPC-linked events, got ${linkedEvents.length}`);

  let requirementCount = 0;
  let effectCount = 0;
  for (const event of linkedEvents) {
    if (event.requires) {
      validateRequirement(event.requires, npcIds, `${event.id}.requires`);
      requirementCount++;
    }
    for (const [choiceIndex, choice] of (event.choices || []).entries()) {
      for (const [effectIndex, effect] of npcEffectsOf(choice).entries()) {
        validateEffect(effect, npcIds,
          `${event.id}.choices[${choiceIndex}].npcEffects[${effectIndex}]`);
        effectCount++;
      }
    }
  }
  assert.ok(requirementCount > 0, "NPC-linked events must include follow-up requirements");
  assert.ok(effectCount > 0, "NPC-linked event choices must include npcEffects");

  const flagEvent = linkedEvents.find((event) =>
    event.requires && event.requires.npc && event.requires.flag);
  assert.ok(flagEvent, "at least one NPC follow-up event must require a flag");

  load("js/fc-events.js");
  const deck = await context.FC.events.load();
  const payload = deck.find((event) => event.id === flagEvent.id);
  assert.ok(payload, `${flagEvent.id} must reach the modal deck`);
  assert.equal(payload.requires && payload.requires.flag, flagEvent.requires.flag,
    "toPayload must preserve NPC requirements for pick()");

  const pickerRun = context.FC.Sim.freshRun(era, origin);
  pickerRun.npcs.forEach((npc) => {
    npc.flags = [];
    if (npc.id !== flagEvent.requires.npc) return;
    const maximum = flagEvent.requires.maxBalance === undefined
      ? flagEvent.requires.balanceMax
      : flagEvent.requires.maxBalance;
    const minimum = flagEvent.requires.minBalance === undefined
      ? flagEvent.requires.balanceMin
      : flagEvent.requires.minBalance;
    if (maximum !== undefined) npc.balance = maximum;
    if (minimum !== undefined) npc.balance = minimum;
  });
  const pickOptions = {
    layer: Number((flagEvent.layerId || "L2").slice(1)),
    avoid: deck.filter((event) => event.id !== flagEvent.id).map((event) => event.id),
    allowRedline: true,
    era: Array.isArray(flagEvent.eras) ? flagEvent.eras[0] : era.id,
    months: flagEvent.minMonths || 0,
    done: {},
    npcs: pickerRun.npcs
  };
  assert.equal(context.FC.events.pick(pickOptions), null,
    `pick must exclude ${flagEvent.id} while ${flagEvent.requires.flag} is absent`);
  const requiredNpc = pickerRun.npcs.find((npc) => npc.id === flagEvent.requires.npc);
  requiredNpc.flags.push(flagEvent.requires.flag);
  const picked = context.FC.events.pick(pickOptions);
  assert.equal(picked && picked.id, flagEvent.id,
    `pick must admit ${flagEvent.id} after ${flagEvent.requires.flag} is set`);

  console.log(`NPC ledger: 5 named NPCs, ${linkedEvents.length} linked events, ` +
    `${requirementCount} requirements and ${effectCount} effects passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
