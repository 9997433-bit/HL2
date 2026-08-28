#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const story = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const allowed = new Set(["modal", "toast", "inline", "letter"]);

function assertChoice(choice, label) {
  assert.ok(choice && typeof choice === "object" && !Array.isArray(choice),
    `${label} must be an object`);
  for (const field of ["id", "label", "result"]) {
    assert.equal(typeof choice[field], "string", `${label}.${field} must be a string`);
    assert.ok(choice[field].trim(), `${label}.${field} must not be empty`);
  }
  assert.ok(choice.d && typeof choice.d === "object" && !Array.isArray(choice.d),
    `${label}.d must be an object`);
  assert.ok(Object.keys(choice.d).length > 0, `${label}.d must not be empty`);
}

function assertInteractiveChoices(event, source) {
  const label = `${source} event ${event.id}`;
  assert.ok(Array.isArray(event.choices) && event.choices.length > 0,
    `${label} must carry at least one choice`);
  assert.equal(new Set(event.choices.map((choice) => choice.id)).size, event.choices.length,
    `${label} choice IDs must be unique`);
  event.choices.forEach((choice, index) => assertChoice(choice, `${label}.choices[${index}]`));
}

function engineContext() {
  const document = {
    activeElement: null,
    body: { classList: { add() {}, remove() {} } },
    currentScript: null,
    addEventListener() {},
    createElement() {
      return {
        classList: { add() {}, remove() {}, toggle() {} },
        style: {},
        addEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        setAttribute() {}
      };
    }
  };
  const sandbox = {
    FC: { story },
    URL,
    clearInterval,
    clearTimeout,
    console,
    document,
    location: {
      href: "https://example.test/games/fucheng-life/screens/dashboard.html",
      protocol: "https:"
    },
    matchMedia() { return { matches: true }; },
    requestAnimationFrame() { return 1; },
    setInterval,
    setTimeout
  };
  sandbox.window = sandbox;
  return vm.createContext(sandbox);
}

function main() {
  const sources = [
    ...story.events.map((event) => ({ event, source: "story" })),
    ...(pack.ambientEvents || []).map((event) => ({ event, source: "ambient" }))
  ];
  const authored = sources.filter(({ event }) => hasOwn(event, "presentation"));
  if (!authored.length) {
    console.log("Presentation: skipped gracefully; R5-B presentation fixtures have not landed.");
    return;
  }

  for (const { event, source } of authored) {
    assert.ok(allowed.has(event.presentation),
      `${source} event ${event.id} has unknown presentation ${event.presentation}`);
    if (event.presentation === "toast" || event.presentation === "letter") {
      assertInteractiveChoices(event, source);
    }
  }

  const storyCounts = story.events.reduce((counts, event) => {
    const presentation = event.presentation || "modal";
    counts[presentation] = (counts[presentation] || 0) + 1;
    return counts;
  }, {});
  const inlineCount = (pack.ambientEvents || [])
    .filter((event) => event.presentation === "inline").length;
  const defaultModalCount = story.events
    .filter((event) => !hasOwn(event, "presentation")).length;

  assert.equal(story.events.length, 105, "R6 adds 8 career/debt events on top of the 97-event O1 deck");
  assert.equal(storyCounts.toast, 10, "R5-B must migrate exactly 10 O1 events to toast");
  assert.equal(storyCounts.letter, 5, "R5-B must migrate exactly 5 O1 events to letter");
  assert.equal(defaultModalCount, 90, "82 original modal events plus 8 R6 modal events");
  assert.equal(inlineCount, 15, "R5-B must promote exactly 15 ambient events to inline");

  const covered = new Set(["modal"]);
  authored.forEach(({ event }) => covered.add(event.presentation));
  assert.deepEqual([...covered].sort(), [...allowed].sort(),
    "the authored fixtures must cover modal, toast, inline, and letter");

  const defaultEvent = story.events.find((event) => !hasOwn(event, "presentation"));
  assert.ok(defaultEvent, "at least one O1 fixture must exercise the default modal path");
  const context = engineContext();
  const source = fs.readFileSync(path.join(gameRoot, "js/fc-events.js"), "utf8");
  vm.runInContext(source, context, { filename: "js/fc-events.js" });
  assert.equal(context.FC.events.toPayload(defaultEvent).presentation, "modal",
    "FC.events.toPayload must default omitted presentation values to modal");

  console.log(`Presentation: ${storyCounts.modal} modal, ${storyCounts.toast} toast, ` +
    `${inlineCount} inline, and ${storyCounts.letter} letter fixtures passed.`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
