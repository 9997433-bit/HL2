#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const gameplayCss = fs.readFileSync(path.join(gameRoot, "css/fc-gameplay.css"), "utf8");
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const careerSrc = fs.readFileSync(path.join(gameRoot, "js/fc-career.js"), "utf8");

function functionSection(src, name) {
  const start = src.indexOf("function " + name + "(");
  const end = src.indexOf("\n  function ", start + 1);
  assert.ok(start >= 0, name + " must be declared");
  assert.ok(end > start, name + " source section must be bounded");
  return src.slice(start, end);
}

function cssRule(src, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = src.match(new RegExp("(?:^|\\n)\\s*" + escaped + "\\s*\\{([^}]*)\\}", "m"));
  assert.ok(match, selector + " must have a CSS rule");
  return match[1];
}

/* Career and challenge pickers share one animated, glass-backed surface. */
const pickerStart = gameplayCss.indexOf(".fc-career-pick {");
const pickerEnd = gameplayCss.indexOf(".fc-asset-shop", pickerStart);
assert.ok(pickerStart >= 0 && pickerEnd > pickerStart,
  "fc-gameplay.css must contain a bounded career-picker section");
const pickerCss = gameplayCss.slice(pickerStart, pickerEnd);

assert.match(cssRule(pickerCss, ".fc-career-pick"), /opacity\s*:\s*0\b/,
  "career picker must start transparent");
assert.match(cssRule(pickerCss, ".fc-career-pick"), /transition\s*:[^;]*opacity/,
  "career picker must animate opacity");
assert.match(cssRule(pickerCss, ".fc-career-pick.is-open"), /opacity\s*:\s*1\b/,
  "is-open must reveal the career picker");
assert.match(cssRule(pickerCss, ".fc-career-pick.is-closing"), /opacity\s*:\s*0\b/,
  "is-closing must fade out the career picker");

const scrimRule = cssRule(pickerCss, ".fc-career-pick__scrim");
assert.match(scrimRule, /background\s*:/, "career picker scrim must dim the dashboard");
assert.match(scrimRule, /backdrop-filter\s*:\s*blur\(/,
  "career picker scrim must provide glass blur");

const panelRule = cssRule(pickerCss, ".fc-career-pick__panel");
assert.match(panelRule, /background\s*:\s*var\(--fc-glass-/,
  "career picker panel must use the shared glass surface");
assert.match(panelRule, /border\s*:/, "career picker glass must retain its edge");
assert.match(panelRule, /box-shadow\s*:/, "career picker glass must retain depth");
assert.match(panelRule, /transform\s*:/, "career picker panel must have an entrance pose");
assert.match(panelRule, /transition\s*:[^;]*transform/,
  "career picker panel must animate its pose");
assert.match(
  cssRule(pickerCss, ".fc-career-pick.is-open .fc-career-pick__panel"),
  /transform\s*:\s*none/,
  "is-open must settle the career picker panel"
);
const closingPanelRule = cssRule(
  pickerCss,
  ".fc-career-pick.is-closing .fc-career-pick__panel"
);
assert.match(closingPanelRule, /transform\s*:/,
  "is-closing must provide a panel exit pose");
assert.match(closingPanelRule, /transition-duration\s*:\s*(?:0?\.18s|180ms)/,
  "panel exit motion must fit the 180ms DOM-removal window");

const reducedMatch = pickerCss.match(
  /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*)\}\s*$/
);
assert.ok(reducedMatch, "career picker must define a prefers-reduced-motion fallback");
assert.match(reducedMatch[1], /\.fc-career-pick(?:\s*,|\s*\{)/,
  "reduced-motion fallback must include the picker");
assert.match(reducedMatch[1], /\.fc-career-pick__panel/,
  "reduced-motion fallback must include the panel");
assert.match(reducedMatch[1], /transition\s*:\s*none/,
  "reduced-motion fallback must remove transitions");
assert.match(reducedMatch[1], /transform\s*:\s*none/,
  "reduced-motion fallback must remove panel transforms");

/* The career module must leave its shared exit class mounted for the same 180ms. */
const closeStart = careerSrc.indexOf("function close(value)");
const closeEnd = careerSrc.indexOf("\n        function finish(", closeStart);
assert.ok(closeStart >= 0 && closeEnd > closeStart, "career picker close helper must be bounded");
const careerCloseSrc = careerSrc.slice(closeStart, closeEnd);
assert.match(careerCloseSrc, /classList\.add\(\s*["']is-closing["']\s*\)/,
  "career picker close must enter is-closing");
assert.match(careerCloseSrc, /setTimeout\(\s*done\s*,\s*180\s*\)/,
  "career picker must stay mounted for its 180ms exit");

/* Execute the challenge picker in a small DOM harness so Esc cannot settle it. */
async function testChallengePicker() {
  const challengeSrc = functionSection(dashSrc, "maybeOfferChallengeGoal");
  const state = {
    classes: [],
    handlers: {},
    raf: [],
    timers: [],
    traps: [],
    picks: [],
    logs: [],
    pops: [],
    renders: [],
    renderLogs: 0,
    focused: false,
    host: null,
    overlayTop: null
  };

  const panel = {
    focus() {
      state.focused = true;
    }
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
      const host = {
        className: "",
        innerHTML: "",
        parentNode: null,
        classList: {
          add(name) {
            state.classes.push(name);
          }
        },
        querySelector(selector) {
          return selector === ".fc-career-pick__panel" ? panel : null;
        },
        addEventListener(type, handler) {
          state.handlers[type] = handler;
        }
      };
      state.host = host;
      return host;
    }
  };
  const run = { goal: null };
  const goals = [
    { id: "rise", name: "向上爬一层", blurb: "测试上升目标" },
    { id: "debtfree", name: "还清负债", blurb: "测试清债目标" }
  ];
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
        push(kind, host) {
          state.overlayTop = {};
          state.pushed = { kind, host };
          return true;
        },
        top() {
          return state.overlayTop;
        },
        trap(targetPanel, event) {
          state.traps.push({ panel: targetPanel, event });
        },
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
    renderLog() {
      state.renderLogs += 1;
    },
    requestAnimationFrame(callback) {
      state.raf.push(callback);
      return state.raf.length;
    },
    setTimeout(callback, delay) {
      state.timers.push({ callback, delay });
      return state.timers.length;
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
  assert.equal(state.host.parentNode, body, "challenge picker must mount before interaction");
  assert.equal(state.focused, true, "challenge picker must focus its dialog panel");
  assert.equal(typeof state.overlayTop.onKey, "function",
    "challenge picker must register keyboard handling on the overlay stack");
  assert.equal(state.raf.length, 1, "challenge picker must schedule its opening frame");
  state.raf[0]();
  assert.ok(state.classes.includes("is-open"),
    "challenge picker must enter is-open on the next frame");

  let escapePrevented = false;
  state.overlayTop.onKey({
    key: "Escape",
    preventDefault() {
      escapePrevented = true;
    }
  });
  assert.equal(escapePrevented, true, "challenge picker must consume Escape");
  assert.equal(state.picks.length, 0, "Escape must not choose a fallback challenge goal");
  assert.equal(state.logs.length, 0, "Escape must not log a challenge goal");
  assert.equal(state.timers.length, 0, "Escape must not start the finish path");
  assert.equal(state.host.parentNode, body, "Escape must leave the required picker mounted");
  assert.equal(state.classes.includes("is-closing"), false,
    "Escape must not put the required picker into its closing state");

  const tabEvent = { key: "Tab" };
  state.overlayTop.onKey(tabEvent);
  assert.equal(state.traps.length, 1, "Tab must invoke the shared focus trap");
  assert.equal(state.traps[0].panel, panel, "focus trap must target the challenge panel");
  assert.equal(state.traps[0].event, tabEvent, "focus trap must receive the keyboard event");

  state.handlers.click({
    target: {
      closest() {
        return null;
      }
    }
  });
  assert.equal(state.picks.length, 0, "scrim clicks must not silently choose a goal");

  state.handlers.click({
    target: {
      closest(selector) {
        if (selector !== "[data-goal]") return null;
        return {
          getAttribute(name) {
            return name === "data-goal" ? "debtfree" : null;
          }
        };
      }
    }
  });
  assert.deepEqual(state.picks, ["debtfree"], "goal clicks must finish with the selected id");
  assert.ok(state.classes.includes("is-closing"),
    "a completed challenge choice must enter is-closing");
  assert.equal(state.timers.length, 1, "completed challenge choice must schedule DOM removal");
  assert.equal(state.timers[0].delay, 180, "challenge picker exit must remain mounted for 180ms");
  assert.equal(state.host.parentNode, body, "challenge picker must remain mounted during exit motion");
  assert.equal(state.pops.length, 0, "overlay must remain stacked during exit motion");

  state.timers[0].callback();
  assert.equal(await offer, true, "challenge picker must resolve after its close delay");
  assert.equal(state.host.parentNode, null, "challenge picker must unmount after exit motion");
  assert.deepEqual(state.pops, [state.host], "challenge picker must pop its overlay after exit");
  assert.deepEqual(state.renders, [true], "challenge choice must refresh dashboard state");
  assert.equal(state.renderLogs, 1, "challenge choice must refresh its log");
}

testChallengePicker().then(() => {
  console.log("R20 career-pick motion and challenge Escape guards passed.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
