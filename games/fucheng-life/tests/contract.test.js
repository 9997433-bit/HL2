#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const sandbox = {
  FC: { gameplay: pack },
  console,
  localStorage: {
    getItem() { return null; },
    setItem() {}
  }
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(gameRoot, "js/fc-sim.js"), "utf8"),
  context,
  { filename: "js/fc-sim.js" }
);

const Sim = context.FC.Sim;
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
  mods: { money: 50, health: 60, social: 55, edu: 50 },
  start: "¥ 12000"
};

function contractName(definition) {
  return String(definition.name || definition.title || definition.label || "");
}

function findContract(definitions, text) {
  return definitions.find((definition) => contractName(definition).includes(text));
}

function progressOf(run) {
  assert.ok(run.contract && typeof run.contract === "object",
    "selectContract must store the active contract on the run");
  assert.ok(Number.isFinite(run.contract.progress),
    "an active contract must expose finite progress");
  return run.contract.progress;
}

function statusOf(run, result) {
  if (run.contract && typeof run.contract.status === "string") return run.contract.status;
  if (result && typeof result.status === "string") return result.status;
  if (run.contract && run.contract.completed) return "completed";
  if (run.contract && run.contract.failed) return "failed";
  return "";
}

function setLowState(run, kind) {
  if (kind === "settlement") run.edu = 0;
  if (kind === "deposit") run.money = 0;
  if (kind === "promotion") {
    run.career.level = 0;
    run.career.kpi = 0;
  }
}

function setHighState(run, kind) {
  if (kind === "settlement") run.edu = 100;
  if (kind === "deposit") run.money = 100000000;
  if (kind === "promotion") {
    run.career.level = 4;
    run.career.kpi = 100;
  }
}

function main() {
  const definitions = Array.isArray(pack.contracts) ? pack.contracts : [];
  const selectContract = Sim.selectContract || Sim.chooseContract;
  const updateContract = Sim.updateContract || Sim.refreshContract || Sim.updateContractProgress;
  const fresh = Sim.freshRun(era, origin);

  if (definitions.length < 3 || !Object.prototype.hasOwnProperty.call(fresh, "contract") ||
      typeof selectContract !== "function" || typeof updateContract !== "function") {
    console.log("Life contracts: skipped gracefully; R4-B contract data/API has not landed.");
    return;
  }

  assert.equal(definitions.length, 3, "the choice modal must offer exactly three contract types");
  const settlement = findContract(definitions, "落户");
  const deposit = findContract(definitions, "首付");
  const promotion = findContract(definitions, "升职");
  assert.ok(settlement, "contracts must include 落户");
  assert.ok(deposit, "contracts must include 首付");
  assert.ok(promotion, "contracts must include 升职");

  for (const [definition, deadline, label] of [
    [settlement, 36, "落户"],
    [deposit, 48, "首付"],
    [promotion, 24, "升职"]
  ]) {
    assert.equal(definition.deadline, deadline, `${label} deadline must be ${deadline} months`);
    assert.equal(typeof definition.id, "string", `${label} contract must have an id`);
    assert.ok(definition.id, `${label} contract id must not be empty`);
  }

  function select(run, definition) {
    const selected = selectContract.call(Sim, run, definition.id, era, origin);
    assert.notEqual(selected, false, `${contractName(definition)} must be selectable`);
    assert.equal(run.contract && run.contract.id, definition.id,
      `selectContract must activate ${definition.id}`);
  }

  function update(run) {
    return updateContract.call(Sim, run, era, origin);
  }

  for (const [definition, kind] of [
    [settlement, "settlement"],
    [deposit, "deposit"],
    [promotion, "promotion"]
  ]) {
    const run = Sim.freshRun(era, origin);
    select(run, definition);
    setLowState(run, kind);
    update(run);
    const low = progressOf(run);
    setHighState(run, kind);
    update(run);
    const high = progressOf(run);
    assert.ok(low >= 0 && low <= 100,
      `${contractName(definition)} low-state progress must stay within 0–100`);
    assert.ok(high >= 0 && high <= 100,
      `${contractName(definition)} high-state progress must stay within 0–100`);
    assert.ok(high > low,
      `${contractName(definition)} progress must increase when its goal stat improves`);
    assert.equal(high, 100,
      `${contractName(definition)} progress must reach 100 at a clearly sufficient goal state`);
  }

  const winRun = Sim.freshRun(era, origin);
  select(winRun, settlement);
  setHighState(winRun, "settlement");
  const winResult = update(winRun);
  assert.ok(["complete", "completed", "success", "won"].includes(statusOf(winRun, winResult)),
    "a contract reaching 100 before its deadline must be detected as complete");

  const failRun = Sim.freshRun(era, origin);
  select(failRun, promotion);
  setLowState(failRun, "promotion");
  const absoluteDeadline = Number.isFinite(failRun.contract.deadlineMonth)
    ? failRun.contract.deadlineMonth
    : (failRun.contract.startMonth || 0) + promotion.deadline;
  failRun.months = absoluteDeadline + 1;
  const failResult = update(failRun);
  assert.ok(["fail", "failed", "expired"].includes(statusOf(failRun, failResult)),
    "an incomplete contract beyond its deadline must be detected as failed");

  console.log("Life contracts: 落户/首付/升职 progress math and deadline win/fail passed.");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
