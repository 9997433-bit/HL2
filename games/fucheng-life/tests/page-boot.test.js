#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const gameRoot = path.resolve(__dirname, "..");
const storyData = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/story.json"), "utf8"));
const gameplayData = JSON.parse(fs.readFileSync(path.join(gameRoot, "data/gameplay-pack.json"), "utf8"));
const dashboardHtml = fs.readFileSync(path.join(gameRoot, "screens/dashboard.html"), "utf8");
const dashboardIds = new Set(
  [...dashboardHtml.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1])
);

class FakeClassList {
  constructor() {
    this.names = new Set();
  }
  add(...names) {
    names.forEach((name) => this.names.add(name));
  }
  remove(...names) {
    names.forEach((name) => this.names.delete(name));
  }
  contains(name) {
    return this.names.has(name);
  }
  toggle(name, force) {
    const enabled = force === undefined ? !this.names.has(name) : Boolean(force);
    if (enabled) this.names.add(name);
    else this.names.delete(name);
    return enabled;
  }
}

function fakeStyle() {
  const values = {};
  values.setProperty = (name, value) => { values[name] = String(value); };
  values.getPropertyValue = (name) => values[name] || "";
  values.removeProperty = (name) => { delete values[name]; };
  return values;
}

class FakeElement {
  constructor(ownerDocument, id) {
    this.ownerDocument = ownerDocument;
    this.id = id || "";
    this.nodeType = 1;
    this.parentNode = null;
    this.children = [];
    this.dataset = {};
    this.style = fakeStyle();
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.innerHTML = "";
    this.value = "";
    this.offsetWidth = 320;
  }
  addEventListener() {}
  removeEventListener() {}
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  insertAdjacentHTML() {}
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
  closest() {
    return null;
  }
  matches() {
    return false;
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 100, height: 40, right: 100, bottom: 40 };
  }
  get lastChild() {
    return this.children.length ? this.children[this.children.length - 1] : null;
  }
}

function createDocument() {
  const elements = new Map();
  const document = {
    activeElement: null,
    baseURI: "https://example.test/games/fucheng-life/screens/dashboard.html",
    currentScript: null,
    hidden: false,
    readyState: "complete",
    addEventListener() {},
    removeEventListener() {},
    createElement() {
      return new FakeElement(document);
    },
    createDocumentFragment() {
      return new FakeElement(document);
    },
    getElementById(id) {
      if (!dashboardIds.has(id)) return null;
      if (!elements.has(id)) elements.set(id, new FakeElement(document, id));
      return elements.get(id);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  document.body = new FakeElement(document, "body");
  document.documentElement = new FakeElement(document, "html");
  document._elements = elements;
  return document;
}

function createStorage() {
  const values = new Map();
  values.set("fucheng.save.v1", JSON.stringify({
    eraId: "E7",
    originId: "O01",
    run: { key: "E7/O01", months: 4 }
  }));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

function responseFor(url) {
  const pathname = new URL(url).pathname;
  const data = pathname.endsWith("/story.json") ? storyData
    : pathname.endsWith("/gameplay-pack.json") ? gameplayData
      : null;
  assert.ok(data, `unexpected boot fetch: ${url}`);
  return Promise.resolve({
    ok: true,
    status: 200,
    json() { return Promise.resolve(data); }
  });
}

async function main() {
  const document = createDocument();
  const localStorage = createStorage();
  const sandbox = {
    URL,
    clearInterval,
    clearTimeout,
    console,
    document,
    fetch: responseFor,
    getComputedStyle() {
      return { getPropertyValue() { return ""; } };
    },
    innerHeight: 900,
    innerWidth: 1280,
    localStorage,
    location: {
      href: document.baseURI,
      origin: "https://example.test",
      pathname: "/games/fucheng-life/screens/dashboard.html",
      protocol: "https:"
    },
    matchMedia() {
      return {
        matches: true,
        addEventListener() {},
        removeEventListener() {}
      };
    },
    navigator: { userAgent: "fucheng-page-boot-test" },
    performance: { now() { return 0; } },
    requestAnimationFrame(callback) {
      callback(16);
      return 1;
    },
    cancelAnimationFrame() {},
    sessionStorage: createStorage(),
    setInterval,
    setTimeout,
    addEventListener() {},
    removeEventListener() {},
    confirm() { return true; }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;

  const context = vm.createContext(sandbox);
  const scripts = [
    "js/story-loader.js",
    "js/fc-ui.js",
    "js/screens.js",
    "js/fc-sim.js",
    "js/fc-motion.js",
    "js/fc-events.js",
    "js/fc-ledger.js",
    "js/fc-contract.js",
    "js/fc-career.js",
    "js/fc-guide.js",
    "js/fc-ending.js",
    "js/dashboard-app.js"
  ];
  const unhandled = [];
  const onUnhandled = (reason) => { unhandled.push(reason); };
  process.on("unhandledRejection", onUnhandled);

  try {
    for (const relativePath of scripts) {
      document.currentScript = {
        src: new URL(relativePath, "https://example.test/games/fucheng-life/").href,
        getAttribute() { return null; }
      };
      const source = fs.readFileSync(path.join(gameRoot, relativePath), "utf8");
      vm.runInContext(source, context, { filename: relativePath });
    }
    document.currentScript = null;

    const readyStory = await context.FC.ready;
    await new Promise((resolve) => setImmediate(resolve));
    await context.FC.events.load();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(readyStory, context.FC.story, "FC.ready must resolve the published story");
    assert.equal(readyStory.eras.length, storyData.eras.length,
      "FC.ready must not resolve the gameplay pack in place of the story");
    assert.equal(context.FC.ERAS.length, 7, "screens.js must install all seven eras");
    assert.equal(context.FC.events.deck().length, storyData.events.length,
      "dashboard boot must load the complete O1 deck");
    assert.equal(context.FC.Sim.pack, context.FC.gameplay,
      "story-loader must install gameplay data into FC.Sim");
    assert.ok(!document.getElementById("identity").textContent.includes("读取失败"),
      "dashboard must not enter its story-load failure state");
    assert.deepEqual(unhandled, [], "dashboard boot must not leave rejected promises");

    console.log(`Page boot: ${scripts.length} browser scripts loaded; FC.ready resolved ` +
      `${readyStory.eras.length} eras and ${context.FC.events.deck().length} events without throwing.`);
  } finally {
    process.removeListener("unhandledRejection", onUnhandled);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
