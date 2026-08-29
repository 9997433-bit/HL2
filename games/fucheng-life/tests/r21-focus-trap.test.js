#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const eventsSrc = fs.readFileSync(path.join(gameRoot, "js/fc-events.js"), "utf8");
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");

function functionSection(src, name) {
  const start = src.indexOf("function " + name + "(");
  const end = src.indexOf("\n  function ", start + 1);
  assert.ok(start >= 0, name + " must be declared");
  assert.ok(end > start, name + " source section must be bounded");
  return src.slice(start, end);
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

function testOverlayTrap() {
  const harness = loadOverlay();
  const focused = [];

  function focusable(name) {
    return {
      focus() {
        focused.push(name);
        harness.document.activeElement = this;
      }
    };
  }

  const first = focusable("first");
  const middle = focusable("middle");
  const last = focusable("last");
  const items = [first, middle, last];
  const root = {
    querySelectorAll(selector) {
      assert.equal(
        selector,
        "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        "focus trap must query only enabled tabbable controls"
      );
      return items;
    }
  };
  const outside = {};

  function trap(activeElement, shiftKey) {
    harness.document.activeElement = activeElement;
    let prevented = 0;
    harness.overlay.trap(root, {
      key: "Tab",
      shiftKey,
      preventDefault() {
        prevented += 1;
      }
    });
    return prevented;
  }

  assert.equal(trap(root, true), 1,
    "Shift+Tab from the dialog root must prevent focus escaping");
  assert.equal(focused.pop(), "last",
    "Shift+Tab from the dialog root must focus the last item");

  assert.equal(trap(root, false), 1,
    "Tab from the dialog root must prevent focus escaping");
  assert.equal(focused.pop(), "first",
    "Tab from the dialog root must focus the first item");

  assert.equal(trap(outside, true), 1,
    "Shift+Tab from a non-item must prevent focus escaping");
  assert.equal(focused.pop(), "last",
    "Shift+Tab from a non-item must focus the last item");

  assert.equal(trap(outside, false), 1,
    "Tab from a non-item must prevent focus escaping");
  assert.equal(focused.pop(), "first",
    "Tab from a non-item must focus the first item");

  assert.equal(trap(first, true), 1,
    "Shift+Tab at the first item must keep preventing the default");
  assert.equal(focused.pop(), "last",
    "Shift+Tab at the first item must still wrap to the last item");

  assert.equal(trap(last, false), 1,
    "Tab at the last item must keep preventing the default");
  assert.equal(focused.pop(), "first",
    "Tab at the last item must still wrap to the first item");
}

async function testChallengeEscapePulse() {
  const challengeSrc = functionSection(dashSrc, "maybeOfferChallengeGoal");
  const state = {
    host: null,
    overlayTop: null,
    panelClasses: new Set(),
    panelClassOps: [],
    timers: [],
    clearedTimers: [],
    picks: [],
    logs: [],
    pops: [],
    renders: []
  };

  const panel = {
    offsetWidth: 320,
    classList: {
      add(name) {
        state.panelClasses.add(name);
        state.panelClassOps.push("add:" + name);
      },
      remove(name) {
        state.panelClasses.delete(name);
        state.panelClassOps.push("remove:" + name);
      }
    },
    focus() {}
  };
  const body = {
    appendChild(host) {
      host.parentNode = body;
    },
    removeChild(host) {
      host.parentNode = null;
    }
  };
  const document = {
    body,
    createElement() {
      const hostClasses = new Set();
      const host = {
        className: "",
        innerHTML: "",
        parentNode: null,
        classList: {
          add(name) {
            hostClasses.add(name);
          }
        },
        querySelector(selector) {
          return selector === ".fc-career-pick__panel" ? panel : null;
        },
        addEventListener(type, handler) {
          if (type === "click") state.clickHandler = handler;
        }
      };
      host.classes = hostClasses;
      state.host = host;
      return host;
    }
  };
  const goals = [
    { id: "rise", name: "向上爬一层", blurb: "测试上升目标" },
    { id: "debtfree", name: "还清负债", blurb: "测试清债目标" }
  ];
  const run = { goal: null };
  const sandbox = {
    FC: {
      Sim: {
        needsChallengeGoal() {
          return true;
        },
        challengeGoals() {
          return goals;
        },
        pickChallengeGoal(targetRun, id) {
          state.picks.push(id);
          targetRun.goal = { id };
          return true;
        },
        goalDef(id) {
          return goals.find((goal) => goal.id === id);
        }
      },
      overlay: {
        push() {
          state.overlayTop = {};
          return true;
        },
        top() {
          return state.overlayTop;
        },
        trap() {},
        pop(host) {
          state.pops.push(host);
          return true;
        }
      }
    },
    document,
    run,
    era: { id: "E7" },
    origin: { id: "O01" },
    esc(value) {
      return String(value);
    },
    ts() {
      return "test-time";
    },
    pushLog(entry) {
      state.logs.push(entry);
    },
    render(force) {
      state.renders.push(force);
    },
    renderLog() {},
    requestAnimationFrame() {
      return 1;
    },
    setTimeout(callback, delay) {
      const id = state.timers.length + 1;
      state.timers.push({ id, callback, delay });
      return id;
    },
    clearTimeout(id) {
      state.clearedTimers.push(id);
    }
  };
  sandbox.window = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(
    challengeSrc + "\nthis.offerChallengeGoal = maybeOfferChallengeGoal;",
    context,
    { filename: "js/dashboard-app.js#maybeOfferChallengeGoal" }
  );

  const offer = context.offerChallengeGoal();
  assert.equal(typeof state.overlayTop.onKey, "function",
    "challenge picker must register its overlay key handler");

  let prevented = false;
  state.overlayTop.onKey({
    key: "Escape",
    preventDefault() {
      prevented = true;
    }
  });

  assert.equal(prevented, true, "challenge Escape must prevent the browser default");
  assert.equal(state.panelClasses.has("is-esc-pulse"), true,
    "challenge Escape must add the is-esc-pulse feedback class");
  assert.ok(state.panelClassOps.includes("add:is-esc-pulse"),
    "challenge Escape must visibly pulse the picker panel");
  assert.equal(state.timers.length, 1,
    "challenge Escape must schedule removal of its pulse class");
  assert.ok(state.timers[0].delay > 0,
    "challenge Escape pulse removal must use a positive delay");

  state.timers[0].callback();
  assert.equal(state.panelClasses.has("is-esc-pulse"), false,
    "the scheduled callback must remove the Escape pulse class");
  assert.equal(state.picks.length, 0,
    "challenge Escape must not finish by selecting a fallback goal");
  assert.equal(state.logs.length, 0,
    "challenge Escape must not write a goal-selection log");
  assert.equal(state.host.parentNode, body,
    "challenge Escape must leave the required picker mounted");
  assert.equal(state.host.classes.has("is-closing"), false,
    "challenge Escape must not enter the finish path");
  assert.equal(state.pops.length, 0,
    "challenge Escape must not pop the overlay");
  assert.equal(state.renders.length, 0,
    "challenge Escape must not render a finished selection");

  void offer;
}

function testRequiredWordingAndCareerLogName() {
  const challengeSrc = functionSection(dashSrc, "maybeOfferChallengeGoal");
  const lede = challengeSrc.match(
    /<p class="fc-career-pick__lede"(?:\s[^>]*)?>([^<]+)<\/p>/
  );
  assert.ok(lede, "challenge picker must render a lede");
  assert.match(
    lede[1],
    /(?:必须|务必|一定要|需要选定|不可跳过|不得跳过)/,
    "challenge lede must explicitly say that the player has to choose"
  );

  const careerSrc = functionSection(dashSrc, "maybeOfferCareerTrack");
  assert.match(
    careerSrc,
    /careerTracks[\s\S]{0,260}\.id\s*===\s*id[\s\S]{0,120}\.name/,
    "career selection must resolve the selected track name from its id"
  );
  assert.match(
    careerSrc,
    /fallback[\s\S]{0,200}未点选|系统按推荐轨/,
    "career fallback log must use distinct wording from a manual pick"
  );
  assert.match(
    careerSrc,
    /text\s*:\s*fallback[\s\S]{0,80}["'][^"']*["']\s*:\s*["'][^"']*选择了/,
    "career selection log must branch on fallback vs explicit pick"
  );
  assert.doesNotMatch(
    careerSrc,
    /text\s*:\s*["'][^"']*选择了[^"']*["']\s*\+\s*id\s*\+/,
    "career selection log must not expose the bare track id"
  );
}

async function main() {
  testOverlayTrap();
  await testChallengeEscapePulse();
  testRequiredWordingAndCareerLogName();
  console.log("R21 overlay focus trap, challenge Escape pulse, and picker copy passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
