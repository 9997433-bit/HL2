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

  const payload = context.FC.events.toPayload(story.sampleEvents[0]);
  assert.equal(payload.id, "EV01", "toPayload must preserve event IDs");
  assert.equal(payload.layer, "L1", "toPayload must normalize layer IDs");
  assert.ok(payload.choices.length > 0, "toPayload must attach scripted choices");

  const deck = await context.FC.events.load();
  assert.equal(deck.length, 10, "FC.events.load must export all 10 story events");
  assert.equal(context.FC.events.deck(), deck, "FC.events.deck must expose the loaded deck");
  assert.ok(context.FC.events.pick({ layer: 2, allowRedline: false }), "FC.events.pick must return an event");

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
