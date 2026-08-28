#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const story = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));
const listeners = new Map();

const documentStub = {
  activeElement: null,
  currentScript: null,
  readyState: "loading",
  addEventListener(type, listener) {
    listeners.set(type, listener);
  }
};

const sandbox = {
  FC: { story },
  URL,
  clearInterval,
  clearTimeout,
  console,
  document: documentStub,
  location: {
    href: "https://example.test/games/fucheng-life/index.html",
    origin: "https://example.test",
    pathname: "/games/fucheng-life/index.html",
    protocol: "https:"
  },
  matchMedia() {
    return { matches: true };
  },
  requestAnimationFrame(callback) {
    callback(16);
    return 1;
  },
  cancelAnimationFrame() {},
  sessionStorage: {
    getItem() { return null; },
    removeItem() {},
    setItem() {}
  },
  setInterval,
  setTimeout
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);

function evaluate(relativePath) {
  const source = fs.readFileSync(path.join(gameRoot, relativePath), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

function assertFunctions(object, names, label) {
  assert.ok(object && typeof object === "object", `${label} must be exported`);
  for (const name of names) {
    assert.equal(typeof object[name], "function", `${label}.${name} must be a function`);
  }
}

/* An event gated on the relationship ledger needs a run whose ledger satisfies
   it, otherwise isolating it says nothing about the gate under test. */
function npcsSatisfying(requires) {
  return [].concat(requires).map((rule) => ({
    id: rule.npc,
    name: rule.npc,
    role: "同事",
    balance: rule.minBalance ?? rule.maxBalance ?? 0,
    flags: rule.flag === undefined ? [] : [].concat(rule.flag)
  }));
}

/* Same idea one rail over: an event tagged to a life contract needs a run that
   actually holds that contract, at a progress its `requires` admits. */
function contractSatisfying(event) {
  const rule = [].concat(event.requires || [{}])[0] || {};
  return {
    id: event.contract,
    status: "active",
    progress: rule.progressMin ?? rule.progressMax ?? 50,
    monthsLeft: rule.monthsLeftMax ?? rule.monthsLeftMin ?? 24
  };
}

function optionsForOnly(event, deck) {
  return {
    layer: Number(event.layerId.slice(1)),
    avoid: deck.filter((candidate) => candidate.id !== event.id).map((candidate) => candidate.id),
    era: Array.isArray(event.eras) ? event.eras[0] : story.eras[0].id,
    months: event.minMonths === undefined ? 0 : event.minMonths,
    npcs: event.requires && !event.contract ? npcsSatisfying(event.requires) : undefined,
    contract: event.contract ? contractSatisfying(event) : undefined
  };
}

function assertPickFilters(deck) {
  const eraEvents = story.events.filter((event) => Array.isArray(event.eras) && event.eras.length);
  const minMonthEvents = story.events.filter((event) => event.minMonths > 0);
  const onceEvents = story.events.filter((event) => event.once === true);
  const requiresEvents = story.events.filter((event) => event.requires && !event.contract);
  const contractEvents = story.events.filter((event) => event.contract);
  const storyEraIds = story.eras.map((era) => era.id);

  /* R2-A authors the gated events and lands the picker implementation in
     parallel. Until those authored fixtures arrive, this smoke test has no
     meaningful candidate to isolate and intentionally reports zero coverage. */
  for (const event of eraEvents) {
    const options = optionsForOnly(event, deck);
    const picked = context.FC.events.pick(options);
    assert.equal(picked && picked.id, event.id,
      `pick must admit ${event.id} in its authored era`);

    const excludedEra = storyEraIds.find((eraId) => !event.eras.includes(eraId));
    if (excludedEra) {
      assert.equal(context.FC.events.pick({ ...options, era: excludedEra }), null,
        `pick must exclude ${event.id} outside its authored eras`);
    }
  }

  for (const event of minMonthEvents) {
    const options = optionsForOnly(event, deck);
    const picked = context.FC.events.pick(options);
    assert.equal(picked && picked.id, event.id,
      `pick must admit ${event.id} at minMonths ${event.minMonths}`);
    assert.equal(context.FC.events.pick({ ...options, months: event.minMonths - 1 }), null,
      `pick must exclude ${event.id} before minMonths ${event.minMonths}`);
  }

  for (const event of requiresEvents) {
    const options = optionsForOnly(event, deck);
    const picked = context.FC.events.pick(options);
    assert.equal(picked && picked.id, event.id,
      `pick must admit ${event.id} once its NPC requirement is met`);
    assert.equal(context.FC.events.pick({ ...options, npcs: undefined }), null,
      `pick must exclude ${event.id} while its NPC requirement is unmet`);
  }

  for (const event of contractEvents) {
    const options = optionsForOnly(event, deck);
    const picked = context.FC.events.pick(options);
    assert.equal(picked && picked.id, event.id,
      `pick must admit ${event.id} while its ${event.contract} contract is running`);
    assert.equal(context.FC.events.pick({ ...options, contract: undefined }), null,
      `pick must exclude ${event.id} when no life contract is signed`);
    assert.equal(
      context.FC.events.pick({
        ...options,
        contract: { ...options.contract, status: "won" }
      }),
      null,
      `pick must exclude ${event.id} once its contract is settled`
    );
  }

  for (const event of onceEvents) {
    const options = optionsForOnly(event, deck);
    const picked = context.FC.events.pick({ ...options, done: {} });
    assert.equal(picked && picked.id, event.id,
      `pick must admit unfinished once event ${event.id}`);
    assert.equal(context.FC.events.pick({ ...options, done: { [event.id]: true } }), null,
      `pick must exclude completed once event ${event.id}`);
  }

  return {
    eras: eraEvents.length,
    minMonths: minMonthEvents.length,
    once: onceEvents.length,
    requires: requiresEvents.length,
    contract: contractEvents.length
  };
}

/* The file:// lifeboat has to answer with real choices, and it may only ever
   restate story.json — nothing in fc-events.js is allowed to author branching. */
async function assertOfflineMirror() {
  const source = fs.readFileSync(path.join(gameRoot, "js/fc-events.js"), "utf8");
  assert.ok(!/SCRIPT\s*\[/.test(source),
    "fc-events.js must not look choices up in a module-level script table");

  const offline = vm.createContext({
    ...sandbox,
    FC: {},
    document: { activeElement: null, currentScript: null, addEventListener() {} },
    window: undefined
  });
  offline.window = offline;
  vm.runInContext(source, offline, { filename: "js/fc-events.js (offline)" });

  /* The mirror is built inside the VM realm, so compare canonical shapes
     rather than object identity. */
  const canonical = (choices) => Array.from(choices, (choice) => [
    choice.id,
    choice.label,
    choice.cost,
    choice.risk === true,
    Object.keys(choice.d).sort().map((stat) => `${stat}:${choice.d[stat]}`).join(","),
    choice.result
  ].join(" | "));

  const seedDeck = await offline.FC.events.load();
  assert.ok(seedDeck.length >= 10, "the offline mirror must carry at least ten events");
  for (const [index, event] of seedDeck.entries()) {
    const authored = story.events[index];
    assert.equal(event.id, authored.id, `offline mirror entry ${index} must track story.json`);
    assert.equal(event.title, authored.title, `${event.id} title must match story.json`);
    assert.equal(event.body, authored.body, `${event.id} body must match story.json`);
    assert.deepEqual(canonical(event.choices), canonical(authored.choices),
      `${event.id} choices must match story.json`);
  }
}

async function main() {
  evaluate("js/fc-motion.js");
  assertFunctions(
    context.FCMotion,
    ["reduced", "countUp", "stagger", "leaveTo", "format"],
    "window.FCMotion"
  );
  assert.equal(context.FC.motion, context.FCMotion, "FC.motion must alias window.FCMotion");
  assert.equal(context.FCMotion.format(1234), "1,234", "FCMotion.format must format numbers");

  const countTarget = { textContent: "0", innerHTML: "" };
  context.FCMotion.countUp(countTarget, 1234, { prefix: "¥" });
  assert.equal(countTarget.textContent, "¥1,234", "countUp must paint its reduced-motion result");

  const staggered = [{
    style: { setProperty(name, value) { this[name] = value; } },
    classList: { add(name) { this.name = name; } }
  }];
  context.FCMotion.stagger(staggered);
  assert.equal(staggered[0].style["--i"], "0", "stagger must assign an index");
  assert.equal(staggered[0].classList.name, "fc-rise", "stagger must assign the entrance class");

  evaluate("js/fc-events.js");
  assertFunctions(
    context.FC.events,
    ["load", "deck", "pick", "show", "close", "isOpen", "moneyOf", "toPayload"],
    "FC.events"
  );
  assertFunctions(context.FC.overlay, ["push", "pop", "top", "trap"], "FC.overlay");
  assert.equal(context.FC.events.moneyOf(-2, 10000), -6000, "moneyOf must preserve signed deltas");

  const payload = context.FC.events.toPayload(story.events[0]);
  assert.equal(payload.id, "EV01", "toPayload must preserve event IDs");
  assert.equal(payload.layer, "L1", "toPayload must normalize layer IDs");
  assert.deepEqual(payload.choices, story.events[0].choices,
    "toPayload must prefer the choices authored in story.json");

  const deck = await context.FC.events.load();
  assert.equal(deck.length, story.events.length, "FC.events.load must export every story event");
  assert.ok(deck.length >= 50, "the modal deck must ship at least 50 events");
  assert.ok(deck.every((event) => event.choices.length >= 2),
    "every deck entry must reach the overlay with its choices");
  assert.equal(context.FC.events.deck(), deck, "FC.events.deck must expose the loaded deck");
  assert.ok(context.FC.events.pick({ layer: 2, allowRedline: false }), "FC.events.pick must return an event");
  const pickCoverage = assertPickFilters(deck);
  const gatedCount = Object.values(pickCoverage).reduce((total, count) => total + count, 0);
  console.log(gatedCount
    ? `Pick filter smoke: ${pickCoverage.eras} era, ${pickCoverage.minMonths} minMonths, ` +
      `${pickCoverage.once} once, ${pickCoverage.requires} NPC-gated, and ` +
      `${pickCoverage.contract} contract-gated fixtures passed.`
    : "Pick filter smoke: skipped gracefully; R2-A gated fixtures have not landed.");

  await assertOfflineMirror();

  const gameplay = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
  context.FC.gameplay = gameplay;

  evaluate("js/fc-sim.js");
  assert.ok(context.FC.Sim && typeof context.FC.Sim.income === "function", "FC.Sim must export income");
  assert.ok(typeof context.FC.Sim.pickAmbient === "function", "FC.Sim.pickAmbient required");

  console.log("Browser exports smoke test: FCMotion, FC.overlay, FC.events, and FC.Sim passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
