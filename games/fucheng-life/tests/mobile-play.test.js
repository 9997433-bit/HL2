#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const gameRoot = path.resolve(__dirname, "..");
const dashHtml = fs.readFileSync(path.join(gameRoot, "screens/dashboard.html"), "utf8");
const css = fs.readFileSync(path.join(gameRoot, "css/fc-gameplay.css"), "utf8");
const guideSrc = fs.readFileSync(path.join(gameRoot, "js/fc-guide.js"), "utf8");

assert.ok(dashHtml.includes("fc-loc--inline"), "zone target must sit inline in life panel");
assert.ok(dashHtml.includes('id="locChip"'), "locChip host required");
assert.ok(dashHtml.includes("fc-dash-tools"), "desktop/mobile tool row required");
assert.ok(dashHtml.includes("data-drawer-tick6"), "mobile drawer must expose fast-forward");
assert.ok(dashHtml.includes("data-drawer-reset"), "mobile drawer must expose reset");
assert.ok(dashHtml.includes('id="locPanel"') && dashHtml.includes("fc-life-main"),
  "zone picker must live inside the life main panel");

assert.ok(css.includes("#actionGrid"), "mobile CSS must hide desktop action grid");
assert.ok(css.includes("min(42vh, 340px)"), "log must scroll inside a capped viewport on mobile");
assert.ok(css.includes("#elevatorPanel"), "mobile CSS should collapse elevator panel");

assert.ok(guideSrc.includes('fallback: "mobileDock"'),
  "guide must fall back to mobile dock when desktop controls are hidden");
assert.ok(!guideSrc.includes('target: "mobileDock"'),
  "guide must not make mobile dock the primary first-step target");
assert.ok(guideSrc.includes("getBoundingClientRect"),
  "guide target resolver must use geometry for fixed dock visibility");

console.log("Mobile one-screen play wiring passed.");
