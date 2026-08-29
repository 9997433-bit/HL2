#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const gameRoot = path.resolve(__dirname, "..");
const eventsJs = fs.readFileSync(path.join(gameRoot, "js/fc-events.js"), "utf8");
const eventsCss = fs.readFileSync(path.join(gameRoot, "css/fc-events.css"), "utf8");

function sliceBetween(src, startNeedle, endNeedle) {
  const start = src.indexOf(startNeedle);
  assert.ok(start >= 0, "missing start: " + startNeedle);
  const end = src.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(end > start, "missing end after: " + startNeedle);
  return src.slice(start, end);
}

function testLeavingCss() {
  assert.match(
    eventsCss,
    /\.fc-event__face--ask\.is-leaving\s*\{[^}]*pointer-events\s*:\s*none/s,
    "ask face is-leaving must disable pointer events"
  );
  assert.match(
    eventsCss,
    /\.fc-letter__face--read\.is-leaving\s*\{[^}]*pointer-events\s*:\s*none/s,
    "letter read face is-leaving must disable pointer events"
  );
}

function testModalAnswerLock() {
  /* modal answer sits before letter answer; grab the first answer(choice) after outcome("modal" */
  const modalChunk = sliceBetween(
    eventsJs,
    'answered = outcome("modal"',
    'answered = outcome("letter"'
  );
  const guardChunk = sliceBetween(
    eventsJs,
    "function answer(choice) {",
    'answered = outcome("modal"'
  );
  assert.match(
    guardChunk,
    /if\s*\(\s*settled\s*\|\|\s*cooling\s*\|\|\s*answered\s*\)\s*return\s*;/,
    "modal answer must early-return when already answered"
  );
  assert.match(
    modalChunk,
    /askFace\.querySelectorAll\(\s*["']button["']\s*\)/,
    "modal answer must disable ask-face buttons during leave"
  );
  assert.match(
    modalChunk,
    /\.disabled\s*=\s*true/,
    "modal answer must set disabled on leaving buttons"
  );
  assert.match(
    modalChunk,
    /if\s*\(\s*soft\s*\)\s*swap\(\s*\)\s*;/,
    "soft/reduce path must still swap immediately"
  );
}

function testLetterAnswerLock() {
  const letterStart = eventsJs.indexOf('answered = outcome("letter"');
  assert.ok(letterStart > 0, "letter answer must exist");
  const letterGuardStart = eventsJs.lastIndexOf("function answer(choice) {", letterStart);
  assert.ok(letterGuardStart > 0, "letter answer function must exist");
  const letterChunk = eventsJs.slice(letterGuardStart, letterStart + 1400);
  assert.match(
    letterChunk,
    /if\s*\(\s*settled\s*\|\|\s*cooling\s*\|\|\s*answered\s*\)\s*return\s*;/,
    "letter answer must early-return when already answered"
  );
  assert.match(
    letterChunk,
    /readFace\.querySelectorAll\(\s*["']button["']\s*\)/,
    "letter answer must disable read-face buttons during leave"
  );
  assert.match(
    letterChunk,
    /if\s*\(\s*soft\s*\)\s*swap\(\s*\)\s*;/,
    "letter soft path must still swap immediately"
  );
}

function testOnKeyStillGuardsAnswered() {
  assert.match(
    eventsJs,
    /if\s*\(\s*answered\s*\|\|\s*cooling\s*\)\s*return\s*;/,
    "onKey digit shortcuts must still ignore input after answered"
  );
}

testLeavingCss();
testModalAnswerLock();
testLetterAnswerLock();
testOnKeyStillGuardsAnswered();
console.log("R23 leaving-lock guards for event and letter faces passed.");
