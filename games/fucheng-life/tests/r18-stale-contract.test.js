#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const gameRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(gameRoot, "../..");
const dashSrc = fs.readFileSync(path.join(gameRoot, "js/dashboard-app.js"), "utf8");
const dashboardHtml = fs.readFileSync(path.join(gameRoot, "screens/dashboard.html"), "utf8");
const guideSrc = fs.readFileSync(path.join(gameRoot, "js/fc-guide.js"), "utf8");
const sopSrc = fs.readFileSync(path.join(repoRoot, "ORCHESTRATION-MODEL-SOP.md"), "utf8");

function functionSection(src, name) {
  const start = src.indexOf("function " + name + "(");
  const end = src.indexOf("\n  function ", start + 1);
  assert.ok(start >= 0, name + " must be declared");
  return src.slice(start, end > start ? end : src.length);
}

/* 挂账的合约事件补弹前必须重验当前合约；过期卡销账并留下系统说明。 */
const replaySrc = functionSection(dashSrc, "replayPendingModal");
const staleHelperMatch = replaySrc.match(/\b([A-Za-z_$][\w$]*Contract[A-Za-z_$\w]*)\s*\(\s*ev\s*\)/);
const validationSrc = staleHelperMatch
  ? replaySrc + "\n" + functionSection(dashSrc, staleHelperMatch[1])
  : replaySrc;

assert.match(
  replaySrc,
  /(?:meetsContract|[A-Za-z_$][\w$]*Contract[A-Za-z_$\w]*\s*\(\s*ev\s*\))/,
  "replayPendingModal must branch through a current-contract validation"
);
assert.match(validationSrc, /\bmeetsContract\b/,
  "pending contract replay must reuse the event contract gate");
assert.match(validationSrc, /\bcontractCtx\b/,
  "pending contract replay must rebuild contract context from the current run");

const staleBranchAt = replaySrc.search(
  /if\s*\([\s\S]{0,160}(?:meetsContract|[A-Za-z_$][\w$]*Contract[A-Za-z_$\w]*\s*\(\s*ev\s*\))/
);
assert.ok(staleBranchAt >= 0, "replayPendingModal must branch on stale contract state");
const staleBranchSrc = replaySrc.slice(staleBranchAt);
assert.match(staleBranchSrc, /\bclearPendingModal\s*\(/,
  "stale pending contracts must be cleared instead of replayed");
assert.match(staleBranchSrc, /\bsysLog\s*\(/,
  "stale pending contracts must leave an explanatory system log");

/* 自动选轨被补弹顺延后，职场区仍要提供可见且可点击的手动入口。 */
assert.match(dashboardHtml, /\bid=["']careerPickBtn["']/,
  "dashboard must include the manual career picker button");

const careerRenderSrc = functionSection(dashSrc, "renderCareerPickBtn");
assert.match(careerRenderSrc, /\bcareerPickBtn\b/,
  "career picker rendering must address the dashboard button");
assert.match(careerRenderSrc, /\bneedsPick\s*\(\s*run\s*\)/,
  "career picker visibility must follow FC.career.needsPick(run)");
assert.match(careerRenderSrc, /\bhidden\b/,
  "career picker rendering must update button visibility");
assert.match(functionSection(dashSrc, "render"), /\brenderCareerPickBtn\s*\(/,
  "normal dashboard renders must refresh career picker visibility");

const initSrc = functionSection(dashSrc, "init");
assert.match(
  initSrc,
  /careerPickBtn[\s\S]{0,240}addEventListener\s*\(\s*["']click["'][\s\S]{0,240}maybeOfferCareerTrack\s*\(/,
  "careerPickBtn click must open the existing career track picker path"
);

/* .fc-btn 自带 display，会盖掉浏览器默认 [hidden]；工具区必须显式收起。 */
const gameplayCss = fs.readFileSync(path.join(gameRoot, "css/fc-gameplay.css"), "utf8");
assert.match(
  gameplayCss,
  /\.fc-dash-tools\s+\.fc-btn\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/,
  "dash-tools ghost buttons must honor the HTML hidden attribute"
);

/* R18 只修文案，不升级教学 KEY；合约步骤必须讲清过期门禁不会绝对补弹。 */
assert.match(guideSrc, /\bKEY\s*=\s*["']fucheng\.guide\.v7["']/,
  "fc-guide must keep the v7 teaching key");
assert.doesNotMatch(guideSrc, /fucheng\.guide\.v8/,
  "R18 copy changes must not introduce a v8 teaching key");

const contractStepStart = guideSrc.indexOf('title: "④ 人生合约"');
const contractStepEnd = guideSrc.indexOf('title: "⑤', contractStepStart + 1);
assert.ok(contractStepStart >= 0 && contractStepEnd > contractStepStart,
  "fc-guide must retain a bounded contract teaching step");
const contractStepSrc = guideSrc.slice(contractStepStart, contractStepEnd);
assert.doesNotMatch(contractStepSrc, /丢不了|刷不掉/,
  "contract teaching must not promise unconditional replay");
assert.match(contractStepSrc, /作废|过期|失效|不再补弹/,
  "contract teaching must explain stale or expired replay semantics");

/* 编排 SSOT 固化同一政策，后续增量文案不能再逐轮抬 KEY。 */
assert.match(sopSrc, /教学\s*KEY/,
  "orchestration SOP must contain a teaching KEY policy");
assert.match(sopSrc, /默认不\s*bump/i,
  "teaching KEY policy must say incremental copy does not bump by default");
assert.match(sopSrc, /结构性[\s\S]{0,100}\bbump\b|\bbump\b[\s\S]{0,100}结构性/i,
  "teaching KEY policy must reserve bumps for structural changes");

console.log("R18 stale contract replay, career picker, and guide KEY policy guards passed.");
