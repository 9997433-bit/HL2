#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const careerSrc = fs.readFileSync(path.join(gameRoot, "js/fc-career.js"), "utf8");
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const acceptanceSrc = fs.readFileSync(path.join(gameRoot, "ACCEPTANCE.md"), "utf8");

function functionSection(src, name) {
  const start = src.indexOf("function " + name + "(");
  const end = src.indexOf("\n  function ", start + 1);
  assert.ok(start >= 0, name + " must be declared");
  assert.ok(end > start, name + " source section must be bounded");
  return src.slice(start, end);
}

function careerHarness() {
  const state = { host: null, overlayTop: null };

  function eventTarget(extra) {
    const handlers = {};
    return Object.assign({
      handlers,
      addEventListener(type, handler) {
        handlers[type] = handler;
      }
    }, extra);
  }

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
      const panel = { focus() {} };
      const scrim = eventTarget();
      const card = eventTarget({
        getAttribute(name) {
          return name === "data-track" ? "staff" : null;
        }
      });
      const host = {
        classList: { add() {} },
        parentNode: null,
        querySelector(selector) {
          if (selector === ".fc-career-pick__panel") return panel;
          if (selector === ".fc-career-pick__scrim") return scrim;
          return null;
        },
        querySelectorAll(selector) {
          return selector === ".fc-career-card" ? [card] : [];
        }
      };
      host.scrim = scrim;
      state.host = host;
      return host;
    }
  };

  const sandbox = {
    FC: {
      Sim: {
        pack: {
          careerTracks: [
            { id: "staff", name: "职员线", levels: ["职员", "总监"] }
          ]
        },
        suggestTrack() {
          return "staff";
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
        pop() {
          return true;
        },
        trap() {}
      }
    },
    document,
    requestAnimationFrame(callback) {
      callback();
    },
    setTimeout(callback) {
      callback();
    }
  };
  sandbox.window = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(careerSrc, context, { filename: "js/fc-career.js" });
  return { career: context.FC.career, state };
}

async function main() {
  /* 手动选轨允许反悔：Esc 与遮罩都必须明确返回 null，而非推荐轨。 */
  const harness = careerHarness();
  let prevented = false;
  const escapeResult = harness.career.showPicker({ cancelable: true });
  harness.state.overlayTop.onKey({
    key: "Escape",
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(await escapeResult, null,
    "cancelable career picker Escape must resolve null");
  assert.equal(prevented, true, "career picker Escape must prevent the browser default");

  const scrimResult = harness.career.showPicker({ cancelable: true });
  harness.state.host.scrim.handlers.click();
  assert.equal(await scrimResult, null,
    "cancelable career picker scrim click must resolve null");

  /* Dashboard 手动入口传 cancelable；取消后在 applyTrack 与日志前早退。 */
  const offerSrc = functionSection(dashSrc, "maybeOfferCareerTrack");
  assert.match(
    offerSrc,
    /if\s*\(\s*opts\.manual\s*\)[\s\S]{0,100}\bcancelable\s*=\s*true[\s\S]{0,160}\bshowPicker\s*\(\s*pick\s*\)/,
    "manual career offers must pass a cancelable picker request"
  );

  const nullGuard = offerSrc.search(/if\s*\(\s*!id\s*\)\s*(?:\{\s*)?return\s+false/);
  const applyTrack = offerSrc.search(/\bapplyTrack\s*\(/);
  assert.ok(nullGuard >= 0, "career offer must return false when the picker resolves without an id");
  assert.ok(applyTrack > nullGuard,
    "career offer must reject a missing id before applying a track or writing its log");

  const initSrc = functionSection(dashSrc, "init");
  assert.match(
    initSrc,
    /careerPickBtn[\s\S]{0,240}addEventListener\s*\(\s*["']click["'][\s\S]{0,240}maybeOfferCareerTrack\s*\(\s*\{\s*manual\s*:\s*true\s*\}\s*\)/,
    "careerPickBtn must open the manual career offer path"
  );

  /* §40 必须说明 dismiss 也算发生过补弹，避免文案退回“完成补弹”。 */
  const section40Start = acceptanceSrc.search(/^40\.\s/m);
  const section41Start = acceptanceSrc.search(/^41\.\s/m);
  assert.ok(section40Start >= 0 && section41Start > section40Start,
    "ACCEPTANCE §40 must be present and bounded by §41");
  const section40 = acceptanceSrc.slice(section40Start, section41Start);
  assert.match(
    section40,
    /(?:含|包括|包含)被关闭|被关闭[\s\S]{0,20}(?:也算|计为|视为)/,
    "ACCEPTANCE §40 must say replay includes dismissed/closed modals"
  );

  console.log("R19 cancelable career dismiss, manual dashboard path, and §40 wording passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
