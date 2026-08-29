#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const cssRoot = path.resolve(__dirname, "../css");
const files = [
  "fc-events.css",
  "fc-gameplay.css",
  "fc-contract.css",
  "fc-ledger.css"
];

/** Every max-height that uses vh for overlay chrome must also declare dvh. */
const pairs = [
  [/max-height:\s*min\(86vh,\s*720px\);/, /max-height:\s*min\(86dvh,\s*720px\);/, "event card"],
  [/max-height:\s*min\(88vh,\s*760px\);/, /max-height:\s*min\(88dvh,\s*760px\);/, "letter sheet"],
  [/max-height:\s*calc\(100vh\s*-\s*20px\);/, /max-height:\s*calc\(100dvh\s*-\s*20px\);/, "letter mobile"],
  [/max-height:\s*calc\(100vh\s*-\s*24px\);/, /max-height:\s*calc\(100dvh\s*-\s*24px\);/, "event/confirm mobile"],
  [/max-height:\s*min\(80vh,\s*560px\);/, /max-height:\s*min\(80dvh,\s*560px\);/, "confirm panel"],
  [/max-height:\s*92vh;/, /max-height:\s*92dvh;/, "career/contract pick"],
  [/max-height:\s*90vh;/, /max-height:\s*90dvh;/, "ending panel"],
  [/max-height:\s*min\(42vh,\s*340px\);/, /max-height:\s*min\(42dvh,\s*340px\);/, "mobile log"],
  [/max-height:\s*78vh;/, /max-height:\s*78dvh;/, "ledger sheet"],
  [/max-height:\s*82vh;/, /max-height:\s*82dvh;/, "ledger mobile"]
];

const css = files.map(function (name) {
  return fs.readFileSync(path.join(cssRoot, name), "utf8");
}).join("\n");

pairs.forEach(function (row) {
  const vhRe = row[0];
  const dvhRe = row[1];
  const label = row[2];
  assert.match(css, vhRe, label + " must keep vh fallback");
  assert.match(css, dvhRe, label + " must add dvh override");
});

/* Prefer cascade: each vh max-height line for overlays should be followed by dvh. */
const orphanVh = css.match(/max-height:[^;]*\bvh\b[^;]*;/g) || [];
orphanVh.forEach(function (decl) {
  if (/\bdvh\b/.test(decl)) return;
  const idx = css.indexOf(decl);
  const after = css.slice(idx + decl.length, idx + decl.length + 80);
  assert.match(
    after,
    /max-height:[^;]*\bdvh\b[^;]*;/,
    "vh max-height must be followed by a dvh override nearby: " + decl
  );
});

console.log("R24 overlay max-height vh/dvh dual declarations passed.");
