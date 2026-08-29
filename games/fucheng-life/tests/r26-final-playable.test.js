#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const simSrc = fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8");
const originHtml = fs.readFileSync(path.join(gameRoot, "screens/origin-select.html"), "utf8");
const guideSrc = fs.readFileSync(path.join(gameRoot, "js/fc-guide.js"), "utf8");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));

function section(src, name) {
  const start = src.indexOf("function " + name);
  assert.ok(start >= 0, name + " must exist");
  const next = src.indexOf("\n  function ", start + 10);
  return src.slice(start, next > start ? next : undefined);
}

/* Reset must confirm and re-run boot offers (career → challenge → contract). */
assert.match(dashSrc, /function restartRun\s*\(/, "restartRun helper must exist");
assert.match(dashSrc, /function startBootOffers\s*\(/, "startBootOffers helper must exist");
assert.match(
  section(dashSrc, "restartRun"),
  /startBootOffers\(\s*true\s*\)/,
  "reset must start the full boot offer chain"
);
assert.match(dashSrc, /重开这一局/, "reset must ask for confirmation");

/* Ending must resolve true so month flow stops. */
assert.match(
  section(dashSrc, "checkEnding"),
  /return true/,
  "checkEnding promise must resolve true after showing the ending"
);
assert.match(
  section(dashSrc, "tick"),
  /if\s*\(\s*run\.ended\s*\)\s*return/,
  "tick must no-op after the run has ended"
);

/* Health bailout once; second critical drop can end. */
assert.match(dashSrc, /healthBailed/, "health bailout must be tracked");
assert.match(
  simSrc,
  /healthBailed[\s\S]{0,80}return\s*["']health["']/,
  "checkEnd must honor a second health crisis as an ending"
);

/* Retire pacing playable with fast-forward (~10 years). */
assert.equal(pack.balance.minMonthsBeforeRetire, 120,
  "retire should unlock around 10 in-city years");
assert.match(simSrc, /minMonthsBeforeRetire/, "checkEnd must read retire months from balance");

/* Debt collection before random crisis. */
const drawSrc = section(dashSrc, "drawModalEvent");
const debtIdx = drawSrc.indexOf("debtNpc");
const crisisIdx = drawSrc.indexOf("pickMonthCrisis");
assert.ok(debtIdx >= 0 && crisisIdx > debtIdx,
  "debt collection must be attempted before month crisis");

/* Origin CTA must not clear aria-disabled on select. */
assert.doesNotMatch(
  originHtml,
  /loadAlloc\(\);\s*next\.removeAttribute\(\s*["']aria-disabled["']\s*\)/,
  "selecting an origin must not force-enable the CTA before points are spent"
);

/* Guide copy matches bailout rule. */
assert.match(guideSrc, /急救一次/, "guide must explain the one-time health bailout");

/* Challenge soft open. */
assert.match(
  section(dashSrc, "maybeOfferChallengeGoal"),
  /if\s*\(\s*softClose\s*\)\s*host\.classList\.add\(\s*["']is-open["']\s*\)/,
  "challenge picker must open immediately under reduced motion"
);

console.log("R26 final playable gates passed.");
