#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const gameRoot = path.resolve(__dirname, "..");

function collectJavaScript(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScript(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

const files = collectJavaScript(gameRoot);
let failures = 0;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    failures += 1;
    console.error(`Syntax check failed: ${path.relative(gameRoot, file)}`);
    process.stderr.write(result.stderr || result.stdout || "");
  }
}

if (failures > 0) {
  console.error(`${failures} JavaScript file(s) failed node --check.`);
  process.exitCode = 1;
} else {
  console.log(`JavaScript syntax: ${files.length} file(s) passed node --check.`);
}
