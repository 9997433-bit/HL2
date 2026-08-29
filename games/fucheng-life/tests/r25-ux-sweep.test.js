#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const gameRoot = path.resolve(__dirname, "..");
const careerSrc = fs.readFileSync(path.join(gameRoot, "js/fc-career.js"), "utf8");
const contractSrc = fs.readFileSync(path.join(gameRoot, "js/fc-contract.js"), "utf8");
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const css = fs.readFileSync(path.join(gameRoot, "css/fc-gameplay.css"), "utf8");

function section(src, name) {
  const start = src.indexOf("function " + name);
  assert.ok(start >= 0, name + " must exist");
  const next = src.indexOf("\n  function ", start + 10);
  return src.slice(start, next > start ? next : undefined);
}

/* Career: soft close + fallback resolve shape */
assert.match(careerSrc, /prefers-reduced-motion:\s*reduce/,
  "career picker must detect reduced motion");
assert.match(careerSrc, /if\s*\(\s*soft\s*\)\s*done\(\s*\)/,
  "career close must skip the 180ms wait under reduced motion");
assert.match(careerSrc, /fallback:\s*!!\(meta\s*&&\s*meta\.fallback\)/,
  "career picker must expose fallback metadata on resolve");
assert.match(careerSrc, /finish\(\s*hint\s*,\s*true\s*\)/,
  "non-cancelable dismiss must mark the recommended track as fallback");

/* Dashboard unwrap + wording fork + challenge persist */
const offer = section(dashSrc, "maybeOfferCareerTrack");
assert.match(offer, /未点选，系统按推荐轨/,
  "fallback career log must not pretend the player chose");
assert.match(offer, /你选择了「/,
  "explicit career pick log must remain");

const challenge = section(dashSrc, "maybeOfferChallengeGoal");
assert.match(challenge,
  /pickChallengeGoal[\s\S]{0,120}FC\.write\(\s*\{\s*run\s*:\s*run\s*\}\s*\)/,
  "challenge goal must persist before the close animation finishes");
assert.match(challenge, /fcChallengeLive/,
  "challenge picker must expose an aria-live region for Esc feedback");
assert.match(challenge, /if\s*\(\s*softClose\s*\)\s*done\(\s*\)/,
  "challenge close must skip delay under reduced motion");

/* Contract ARIA completeness */
assert.match(contractSrc, /aria-describedby="fcContractLede"/,
  "primary contract picker must describe via lede id");
assert.match(contractSrc, /id="fcContractLede"/,
  "primary contract lede id must exist");
assert.match(contractSrc, /aria-labelledby="fcContract2Title"/,
  "secondary contract picker must be labelled");
assert.match(contractSrc, /aria-describedby="fcContract2Lede"/,
  "secondary contract picker must be described");
assert.match(contractSrc, /id="fcContract2Title"/,
  "secondary contract title id must exist");

/* Narrow phone density */
assert.match(css, /@media\s*\(\s*max-width:\s*360px\s*\)/,
  "career picker must define a ≤360px density band");
assert.match(css, /\.fc-career-pick\s+\.fc-sr/,
  "career-pick screen-reader utility must exist for live region");

console.log("R25 UX sweep guards passed.");
