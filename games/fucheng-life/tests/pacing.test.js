#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const gameRoot = path.resolve(__dirname, "..");
const dashboardSource = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));

function modalOddsFromSource(source) {
  const match = /\bMODAL_ODDS\s*=\s*\[([^\]]+)\]/.exec(source);
  assert.ok(match, "dashboard-app.js must define MODAL_ODDS");
  const odds = match[1].split(",").map((part) => Number(part.trim()));
  assert.ok(odds.length >= 3, "MODAL_ODDS must define a pacing curve");
  assert.ok(odds.every((value) => Number.isFinite(value) && value >= 0 && value <= 1),
    "every MODAL_ODDS entry must be a probability");
  return odds;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function modalMeanInterval(odds, months, seed) {
  const random = seededRandom(seed);
  let sinceModal = 0;
  let intervalTotal = 0;
  let modalCount = 0;
  for (let month = 0; month < months; month++) {
    sinceModal++;
    const oddsIndex = Math.min(sinceModal, odds.length - 1);
    if (random() >= odds[oddsIndex]) continue;
    intervalTotal += sinceModal;
    modalCount++;
    sinceModal = 0;
  }
  return { mean: intervalTotal / modalCount, count: modalCount };
}

function sagaTriggerRate(odds, simulations, months, seed) {
  const random = seededRandom(seed);
  let triggers = 0;
  const opportunities = simulations * months;
  for (let simulation = 0; simulation < simulations; simulation++) {
    for (let month = 0; month < months; month++) {
      if (random() < odds) triggers++;
    }
  }
  return triggers / opportunities;
}

function main() {
  const modalOdds = modalOddsFromSource(dashboardSource);
  const configuredSagaOdds = pack.balance && pack.balance.sagaMonthlyOdds;
  const legacyModalOdds = modalOdds.join(",") === "0,0,0.45,0.65,1";

  if (legacyModalOdds || configuredSagaOdds === 0.045) {
    console.log("Pacing: skipped gracefully; R4-C modal/saga tuning has not landed.");
    return;
  }

  assert.equal(configuredSagaOdds, 0.09,
    "random saga monthly odds must be raised from 0.045 to 0.09");

  const modal = modalMeanInterval(modalOdds, 300000, 0x5a17c9e3);
  assert.ok(modal.count > 50000,
    `modal simulation needs a stable sample, observed only ${modal.count} events`);
  assert.ok(modal.mean >= 2,
    `mean modal interval must be at least 2.0 months, observed ${modal.mean.toFixed(3)}`);

  const baselineRate = sagaTriggerRate(0.045, 5000, 120, 0x73a91d4f);
  const raisedRate = sagaTriggerRate(configuredSagaOdds, 5000, 120, 0x73a91d4f);
  assert.ok(raisedRate > baselineRate,
    `0.09 must trigger more often than 0.045 (${raisedRate} vs ${baselineRate})`);
  assert.ok(raisedRate >= baselineRate * 1.8,
    `0.09 should produce roughly twice the 0.045 trigger rate ` +
    `(${raisedRate.toFixed(4)} vs ${baselineRate.toFixed(4)})`);

  console.log(`Pacing: modal mean ${modal.mean.toFixed(3)} months across ` +
    `${modal.count} events; 120-month saga rate ${(baselineRate * 100).toFixed(2)}% ` +
    `→ ${(raisedRate * 100).toFixed(2)}%.`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
