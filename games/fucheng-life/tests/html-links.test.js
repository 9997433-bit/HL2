#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const gameRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(gameRoot, "../..");
const tagPattern = /<(?:a|area|audio|base|embed|form|iframe|img|input|link|object|script|source|track|video)\b[^>]*>/gi;
const attributePattern = /\b(?:href|src|action|poster|data)\s*=\s*(["'])(.*?)\1/gi;
const ignoredProtocol = /^(?:data|https?|mailto|tel|javascript|blob):/i;

function collectHtml(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectHtml(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(fullPath);
  }
  return files.sort();
}

function idsIn(html) {
  const ids = new Set();
  const pattern = /\b(?:id|name)\s*=\s*(["'])(.*?)\1/gi;
  let match;
  while ((match = pattern.exec(html))) ids.add(match[2]);
  return ids;
}

function locationOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const failures = [];
let checked = 0;

for (const htmlPath of collectHtml(gameRoot)) {
  const html = fs.readFileSync(htmlPath, "utf8");
  let tagMatch;

  while ((tagMatch = tagPattern.exec(html))) {
    attributePattern.lastIndex = 0;
    let attributeMatch;

    while ((attributeMatch = attributePattern.exec(tagMatch[0]))) {
      const reference = attributeMatch[2].trim();
      if (!reference || reference === "#" || reference.startsWith("//") || ignoredProtocol.test(reference)) {
        continue;
      }

      checked += 1;
      const hashIndex = reference.indexOf("#");
      const queryIndex = reference.indexOf("?");
      const cutAt = [hashIndex, queryIndex].filter((index) => index >= 0)
        .reduce((lowest, index) => Math.min(lowest, index), reference.length);
      const rawPath = reference.slice(0, cutAt);
      const rawFragment = hashIndex >= 0 ? reference.slice(hashIndex + 1).split("?")[0] : "";
      let decodedPath;
      let fragment;

      try {
        decodedPath = decodeURIComponent(rawPath);
        fragment = decodeURIComponent(rawFragment);
      } catch (error) {
        failures.push(`${path.relative(repositoryRoot, htmlPath)}:${locationOf(html, tagMatch.index)} ` +
          `contains invalid URL encoding in "${reference}"`);
        continue;
      }

      let target = decodedPath
        ? (decodedPath.startsWith("/")
          ? path.resolve(repositoryRoot, `.${decodedPath}`)
          : path.resolve(path.dirname(htmlPath), decodedPath))
        : htmlPath;

      if (target !== repositoryRoot && !target.startsWith(repositoryRoot + path.sep)) {
        failures.push(`${path.relative(repositoryRoot, htmlPath)}:${locationOf(html, tagMatch.index)} ` +
          `escapes the repository: "${reference}"`);
        continue;
      }

      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, "index.html");
      }

      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        failures.push(`${path.relative(repositoryRoot, htmlPath)}:${locationOf(html, tagMatch.index)} ` +
          `references missing file "${reference}"`);
        continue;
      }

      if (fragment && path.extname(target).toLowerCase() === ".html") {
        const targetHtml = target === htmlPath ? html : fs.readFileSync(target, "utf8");
        if (!idsIn(targetHtml).has(fragment)) {
          failures.push(`${path.relative(repositoryRoot, htmlPath)}:${locationOf(html, tagMatch.index)} ` +
            `references missing fragment "#${fragment}" in ${path.relative(repositoryRoot, target)}`);
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`HTML link integrity failed with ${failures.length} error(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`HTML link integrity: ${checked} local link(s) resolved.`);
}
