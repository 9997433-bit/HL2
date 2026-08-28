#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const eventsSrc = fs.readFileSync(path.join(gameRoot, "js/fc-events.js"), "utf8");
const careerSrc = fs.readFileSync(path.join(gameRoot, "js/fc-career.js"), "utf8");
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");

function overlaySection() {
  const start = eventsSrc.indexOf("trap: function (rootEl, e)");
  const end = eventsSrc.indexOf("\n    doc.addEventListener", start);
  assert.ok(start >= 0, "FC.overlay.trap must be declared");
  assert.ok(end > start, "FC.overlay.trap source section must be bounded");
  return eventsSrc.slice(start, end);
}

function loadOverlay() {
  const overlayEnd = eventsSrc.indexOf(
    "\n  /* --------------------------------------------------------------- 数据装载"
  );
  assert.ok(overlayEnd > 0, "fc-events overlay source must be bounded");

  const document = {
    activeElement: null,
    body: {
      classList: {
        add() {},
        remove() {}
      }
    },
    addEventListener() {}
  };
  const sandbox = { FC: {}, document };
  sandbox.window = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(
    eventsSrc.slice(0, overlayEnd) + "\n})(window);",
    context,
    { filename: "js/fc-events.js#overlay" }
  );
  return { document, overlay: context.FC.overlay };
}

function testVisibleTrapSource() {
  const trapSrc = overlaySection();
  assert.match(
    trapSrc,
    /\.closest\(\s*["']\[hidden\]["']\s*\)/,
    "focus trap source must reject controls inside a hidden subtree"
  );
  assert.match(
    trapSrc,
    /if\s*\(\s*!items\.length\s*\)\s*\{\s*e\.preventDefault\(\)\s*;\s*return\s*;/,
    "focus trap source must prevent Tab when no visible items remain"
  );
}

function testVisibleTrapHarness() {
  const harness = loadOverlay();
  const focused = [];

  function focusable(name, hidden) {
    return {
      offsetParent: {},
      closest(selector) {
        assert.equal(selector, "[hidden]");
        return hidden ? this : null;
      },
      focus() {
        focused.push(name);
        harness.document.activeElement = this;
      }
    };
  }

  const hiddenFirst = focusable("hidden-first", true);
  const first = focusable("first", false);
  const last = focusable("last", false);
  const hiddenLast = focusable("hidden-last", true);
  const root = {
    querySelectorAll() {
      return [hiddenFirst, first, last, hiddenLast];
    }
  };

  function trap(activeElement, shiftKey, trapRoot = root) {
    harness.document.activeElement = activeElement;
    let prevented = 0;
    harness.overlay.trap(trapRoot, {
      key: "Tab",
      shiftKey,
      preventDefault() {
        prevented += 1;
      }
    });
    return prevented;
  }

  assert.equal(trap(last, false), 1, "Tab at the last visible item must wrap");
  assert.equal(focused.pop(), "first",
    "forward wrapping must skip a hidden control after the last visible item");
  assert.equal(trap(first, true), 1, "Shift+Tab at the first visible item must wrap");
  assert.equal(focused.pop(), "last",
    "reverse wrapping must skip a hidden control before the first visible item");
  assert.deepEqual(focused, [], "hidden controls must never receive focus");

  const hiddenOnlyRoot = {
    querySelectorAll() {
      return [hiddenFirst, hiddenLast];
    }
  };
  assert.equal(
    trap(hiddenOnlyRoot, false, hiddenOnlyRoot),
    1,
    "Tab must still be prevented when filtering leaves an empty item list"
  );
  assert.deepEqual(focused, [], "an empty visible item list must not focus hidden controls");
}

function assertPickerLabel(source, titleId, label) {
  assert.match(
    source,
    new RegExp(
      "fc-career-pick__panel[\\s\\S]{0,220}aria-labelledby=[\"']" + titleId + "[\"']"
    ),
    label + " panel must reference its agreed title id"
  );
  assert.match(
    source,
    new RegExp("<h2[^>]*\\bid=[\"']" + titleId + "[\"']"),
    label + " template must define the referenced title id"
  );
}

function testPickerAriaLabels() {
  assertPickerLabel(careerSrc, "fcCareerTitle", "career picker");
  assertPickerLabel(dashSrc, "fcChallengeTitle", "challenge picker");
}

testVisibleTrapSource();
testVisibleTrapHarness();
testPickerAriaLabels();
console.log("R22 visible focus trap and picker ARIA labels passed.");
