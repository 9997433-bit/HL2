# Round 2 — SOTA Gap Review & Round 3 Acceptance Criteria

> Author: fable subagent (`claude-fable-5-thinking-xhigh`) · Date: 2026-08-26
> Role: audit & acceptance criteria — review all Round 1 outputs against SOTA standards, define Round 3 "done".
> Tree state at review: branch `agent/wechat-minigames-research`, commit `cc25042` (includes Round 2 harness `3852c61` and docs index `143841d`).
> Verification performed during this review: `./scripts/run-all-prototype-tests.sh` → **3 suites passed, 0 failed** (jump-jump CDP smoke, sheep-match3 14/14 Node tests, tile-trio real-file checks 300 generations/level + greedy autoplay + conservation + reachability).

> **Platform-constants footnote (2026-08-26):** D1 and the package/payment
> examples below describe the inconsistency found at audit time, not the final
> resolution. Current live official pages, canonical values, API scope, and
> verification labels are recorded in
> [`platform-constants.json`](../platform-constants.json).

---

## 0. Executive Summary

Round 1 produced a research base that is genuinely strong — dual-chart rankings with source provenance, a machine-readable feasibility matrix, a legal register anchored to on-point precedent (羊了个羊 v. 麻了个麻), and three runnable prototypes, two of which carry real headless verification. Round 2 has so far landed 2 of its 5 mandatory deliverables (unified test harness; docs index).

The audit verdict: **the repo is at "mechanic parity, research-grade" and that is the right target** — but it is not yet at final-acceptance standard even by that measure. The blocking issues are: (a) three of five Round 2 mandatory deliverables not yet merged (dual-axis scoring, 4th prototype, shared wx-shim); (b) jump-jump is materially below the quality bar the other two prototypes set — its game logic has real defects, not just missing polish; (c) verification is statistical-on-unseeded-RNG in tile-trio and local-only everywhere (no CI); (d) the reports contradict each other on platform constants (package limits, payment API era) and rankings snapshots span three different dates; (e) the WeChat-parity story is told three different ways in three prototypes instead of once through a shared shim.

None of these requires new research. All are closable in Round 3 with targeted engineering and one normalization pass over the documents.

---

## 1. Audit of the Three Existing Prototypes

### 1.1 Scoring rubric

Each prototype is scored on five axes (1–10): **Mechanic completeness** (vs the original's core loop), **Code quality** (architecture, determinism, portability), **Test coverage** (what the automated checks actually prove), **WeChat parity visibility** (is the platform gap explicit and mocked?), **Difficulty/feel parity** (does it play like the original, not just rule-match it?).

| Prototype | Mechanic | Code quality | Tests | WX parity visibility | Difficulty/feel | Overall |
|---|---:|---:|---:|---:|---:|---:|
| `tile-trio/` | 9 | 7 | 8 | **8** (inline WX shim, explicit) | 6 | **7.6** |
| `sheep-match3/` | 8 | **9** (pure core, seeded PRNG, wx seams) | **9** | 4 (dead `wx` branches, no shim) | 6 | **7.2** |
| `jump-jump/` | 5 | 4 | 3 (smoke only) | 1 (nothing mocked) | 4 | **3.4** |

### 1.2 `tile-trio/` — layered 3-match (羊了个羊 family)

**Completeness.** The strongest demonstration in the repo. Full loop: layer occlusion, 7-slot tray with symbol grouping, guaranteed-solvable generation (peel-order + proximity-split blocks of six), three ad-gated props, win/lose, three levels including an 11-deep blind stack, deep links. The inline `WX` shim is the only place in the repo where the platform dependency set (rewarded ads, share-to-revive, cloud storage, haptics) is made explicit *in executable code*.

**Test coverage.** `verify.js` is the best verification pattern in the repo because it loads the *shipped* script into a stubbed DOM rather than testing a copy. It proves: intended-line winnability 300/300 per level, peak tray 4/7, greedy-solver clear rates per level, tile conservation across all three props, and full reachability.

**Gaps found in this audit:**
- **G-TT1 (verification reproducibility).** All generation uses bare `Math.random()`. The 300-run checks are statistical, not reproducible — a regression that fails 1-in-1000 deals would pass review. Contrast sheep-match3's `mulberry32` seeding. Needs a seedable RNG injection point, even if the default stays random.
- **G-TT2 (difficulty parity, honest labeling).** The greedy solver clears 深渊 at 50–60%. The real 羊了个羊 level 2 had a **sub-1% human pass rate** — the difficulty cliff *is* the viral engine of the genre, and this prototype does not reproduce it (nor measures itself against it). Fine for a mechanic study, but the README's "mirrors the original" claim overstates; the parity gap should be quantified, not implied away.
- **G-TT3 (shim not shared).** The WX shim is inline and prototype-local; ROUND2 mandates `prototypes/shared/wx-shim.js`. When that lands, tile-trio should consume it rather than keep a divergent copy.
- **G-TT4 (animation timing untested).** `verify.js` stubs `setTimeout` to run immediately, so the 130 ms deferred-clear path is never exercised at real timing; a race between clear-timeout and a rapid second tap is untested.

### 1.3 `sheep-match3/` — stacked match-3 with solver

**Completeness.** The best *architecture* in the repo: 446-line pure core with zero platform imports, renderer and host glue separated, deterministic `mulberry32` PRNG, a bitset-memoized DFS solver shared by generation/hint/autoplay, and the correct off-by-one tray bound (`maxTray = slots - 1`) that Round 1 documented as a found bug. `main.js` already branches on `wx.createCanvas` / `wx.onTouchStart` / `wx.getSystemInfoSync` — the honest porting seam.

**Test coverage.** 14/14 Node tests spanning determinism, geometry, cover-graph correctness, constructed-solvability (peak tray ≤ 3 on the constructed line), generated-level solvability across seeds, solver replay to a win, illegal-pick rejection, loss condition, all three props, and hint legality. This is the reference standard the other prototypes should be held to.

**Gaps found in this audit:**
- **G-SM1 (shuffle can break solvability).** `shuffleProp` permutes the board's type multiset blindly. Unlike tile-trio's shuffle — which re-runs the generator and completes tray groups first so "shuffling cannot strand you" — sheep-match3's shuffle can leave an unwinnable board, and the test suite only asserts multiset preservation. The two prototypes implement the *same product rule* with different fairness guarantees. The stronger (tile-trio) behavior should be ported over, or the weaker behavior documented as a known deviation.
- **G-SM2 (no monetization loop).** Props are free; nothing is routed through an ad/share shim. The genre's entire IAA revenue line is invisible here, while tile-trio makes it explicit. After the shared shim lands, sheep-match3's props should be gated through it.
- **G-SM3 (wx branches are dead code).** The `wx.*` paths in `main.js` have never executed anywhere (no WeChat build, no `game.js`/`game.json`/`project.config.json` skeleton in the repo). They will rot silently. Either exercise them against the shared shim in a test, or mark them explicitly as untested seams.
- **G-SM4 (missing signature mechanic).** The face-down bottom queue — the shipped game's second mechanic and a major difficulty lever — is acknowledged as out of scope in the README but is the largest remaining *mechanic* (not product) gap in either match-3 prototype.

### 1.4 `jump-jump/` — hold-to-charge hop (跳一跳)

**Completeness.** Playable single file: charge → jump → land, camera follow, score, combo display, touch/mouse/keyboard input, reset. But this is the weakest artifact in the repo, and unlike the other two its problems are in the game logic itself:

- **G-JJ1 (finite world).** `initPlatforms()` creates exactly 20 platforms and nothing ever appends more. The original is endless; this prototype simply runs out of game. This is a defect, not a simplification — the score cap is invisible to the player.
- **G-JJ2 (frame-rate-dependent physics).** In `update(dt)`, vertical motion is dt-scaled but horizontal motion is `player.x += player.jumpVx` per frame — jump distance differs between 60 Hz and 120 Hz displays. On mobile (the target form factor of the genre) this is disqualifying.
- **G-JJ3 (charge doesn't govern distance).** `jump()` auto-aims at the next platform (`jumpVx = dx / (power / 400)`), making horizontal travel *inversely* related to charge time and the aim automatic. The original's entire skill loop — you charge, you commit, you land short or long — is not actually implemented; the prototype pattern-matches the input, not the mechanic.
- **G-JJ4 (combo doesn't score).** `combo` increments on center landings and is displayed, but never multiplies the score. The original's 2/4/8/16… center-landing bonus is the score system.
- **G-JJ5 (no determinism, no WX surface).** Bare `Math.random()`, no seed parameter, no shim usage at all — despite Round 1's own audit concluding that for 跳一跳 "friend/group leaderboards ARE the product" (the canonical open-data-domain showcase). The one prototype whose WeChat coupling is highest is the one with zero platform mocking.
- **Test coverage.** The Round 2 CDP smoke test (`scripts/verify-jump-jump.mjs`) is well built (no Puppeteer dependency, real Chrome, real key events) but by its own coverage matrix proves only "loads, renders, jumps, doesn't throw". No deterministic landing/scoring/combo assertions — and the logic defects above are exactly the kind of thing a smoke test cannot catch.

### 1.5 Cross-cutting findings

- **Redundancy without convergence.** `sheep-match3` and `tile-trio` implement the same mechanic with complementary strengths (pure-core + determinism + solver vs. ad-gating + grouped tray + safe shuffle + real-file verification) and neither has absorbed the other's. Round 3 should either converge the best properties or explicitly designate roles (reference core vs. demo-facing) in `prototypes/README.md`.
- **Three WeChat-parity strategies.** jump-jump: none; sheep-match3: dead `wx` branches; tile-trio: inline shim. The shared `wx-shim.js` (in flight from another agent) is the fix, but adoption across all prototypes — not just existence of the file — must be the acceptance criterion.
- **No CI.** The harness is one command and green, but nothing runs it on push. A `.github/workflows` job (Node 22 + Chromium) is cheap and closes the "regressions land silently" hole. The harness's Chrome discovery (`PATH`/`CHROME_PATH`/`CHROME_BIN`) is already CI-friendly.
- **No WeChat package skeleton.** No prototype has `game.js`/`game.json`/`project.config.json`, so opus-mechanics-analysis §7.3's recommendation ("port to a real WeChat build to measure package size / startup") remains the one feasibility claim never exercised. On Linux we cannot run DevTools, but producing a *structurally valid* mini-game package directory (adapter + entry + config) is possible here and would move that claim from "asserted" to "prepared, pending DevTools validation".

---

## 2. Round 2 Mandatory Deliverable Scorecard

| # | ROUND2_CONTEXT deliverable | Status at this review | Notes |
|---|---|---|---|
| 1 | Dual-axis scoring (Mechanic vs Product, 1–10) | ❌ not landed | Assigned to fable-r2-dual-axis (in flight). Round 1 already established the conceptual split (opus-prototype-report §5; sota-audit §6 rubric decomposes into TechPortability/SocialCoupling/BackendBurden) — the dataset must be consistent with `rankings.json` names and July 2026 snapshot |
| 2 | New prototype: 挪了下车 parking OR 抓大鹅 3D physics | ❌ not landed | Assigned to opus-r2-parking-prototype (in flight). Acceptance must require the BFS solver as level pipeline (opus-mechanics §2.4) and a `verify.js`/`verify.mjs` the harness auto-discovers |
| 3 | `prototypes/shared/wx-shim.js` | ❌ not landed | Assigned to opus-r2-wx-shim (in flight). Must cover at minimum: `createRewardedVideoAd`, `shareAppMessage`, `setUserCloudStorage`/`getFriendCloudStorage`, `login`, `vibrateShort/Long`, `onShow/onHide`; acceptance = adopted by all prototypes, not merely present |
| 4 | Unified headless test harness | ✅ landed (`3852c61`) | Re-verified green in this review; auto-discovers future `prototypes/*/verify.{js,mjs}` |
| 5 | Docs index `.agent_workspace/README.md` | ✅ landed (`143841d`) | Good quality; includes an honest "still missing" register this review corroborates |

---

## 3. Our Prototypes vs the Real WeChat Mini Game Quality Bar

The bar below is what a *charting* IAA casual title demonstrably ships (sources: Round 1 audits §2.2–2.4, mechanics analysis §6, feasibility probe). Column "ours" is the best state across all three prototypes.

| Dimension | Real top-10 quality bar | Ours (best case) | Verdict |
|---|---|---|---|
| Core loop correctness | Deterministic, fair, deadlock-free (打个螺丝 shipped an anti-deadlock floor after telemetry) | Match-3s: solver-proven fair generation — **at or above bar** for the loop itself. jump-jump: defective (G-JJ1..4) | ✅ / ❌ |
| Level content & pipeline | Hundreds–thousands of hand-tuned levels; authoring + difficulty-rating tooling; server-issued daily levels | 3 static levels per prototype; generator-as-pipeline exists conceptually in match-3s; no rating tooling, no level service | ❌ far below (by design — but the *pipeline*, per Round 1's own recommendation, was the thing to build) |
| Difficulty tuning | Hand-tuned cliffs (羊 level 2 sub-1% pass) driving the share/revive loop; telemetry-adjusted | Static generated difficulty; greedy-solver 50–60% on hardest level; no human pass-rate model | ❌ mechanic present, curve not at parity (G-TT2) |
| Startup & package | ≤4 MB main package, <3 s TTI, subpackage/CDN discipline, engine plugin | Trivially small (no assets), but never packaged as a mini game; 4 MB claim asserted not measured | ⚠️ almost certainly fine, unproven |
| Performance | 60 fps on 红米-class devices; pooling; atlases; memory-warning handling | Desktop-browser rAF loops; no pooling; no `onMemoryWarning`; DPR handled in 2 of 3 | ⚠️ adequate for prototype scale |
| Monetization | Rewarded-video placements (revive, props), placement economics, hybrid IAA/IAP rails | tile-trio: ad-gated props via shim (visible, granted-for-free); others: none | ⚠️ shape shown once, not uniform |
| Social/virality | Share cards with payload into chats/groups, `shareTicket` group ranks, friend leaderboards in open-data domain — 30–50% of installs | Shim stubs narrate what *would* happen; no open-data-domain mock, no share payload simulation | ❌ the known unreplicable core — but even the *mockable* part isn't uniformly mocked |
| Retention/liveops | Daily rotation, subscription messages, sidebar re-entry, seasons, game club | None | ❌ out of scope, correctly documented |
| Backend & anti-cheat | Server-validated scores/levels; remote config; A/B | None (all-local by design) | ❌ out of scope, correctly documented |
| Telemetry | Funnel, level pass rates, ad ARPDAU, retention cohorts | None | ❌ out of scope |
| Compliance | Real-name, anti-addiction, privacy consent, ICP, review | Documented thoroughly in reports; nothing implemented (correct for research) | ✅ as research; must stay labeled non-legal-advice |
| Testing/CI | (Internal studio practice varies) | Unified headless harness, 14 unit tests, real-file verification, CDP smoke — **above typical prototype bar**, but local-only, partly unseeded | ⚠️ strong foundation, two holes (CI, seeding) |
| Art/audio/juice | Themed asset sets, particles, sound, haptics | Emoji/flat-color placeholders, minimal tweens, haptics via shim in one prototype | ❌ deliberate; keep original (IP-safe) |

**Overall placement:** the prototypes prove exactly what Round 1 claimed — the *game* of a top IAA title is a few hundred lines — and they prove it with better verification than typical for research code. Measured against a real title they are ~10–20% of product surface, which is the intended finding, not a failure. The acceptance bar for Round 3 must therefore be **research-grade completeness** (every claim demonstrated or labeled), not product parity.

---

## 4. Round 3 Acceptance Checklist — what "done" looks like

### A. Deliverable completeness (blocking)

- [ ] **A1.** Dual-axis scoring dataset landed: separate Mechanic (1–10) and Product (1–10) scores for all 20 games in `rankings.json` (both charts), with the rubric stated and scores reconcilable with Round 1's single-axis scores.
- [ ] **A2.** Fourth prototype landed (parking puzzle or 3D physics benchmark) with: solvability/verification harness entry point (`verify.js`/`verify.mjs`) auto-discovered by `run-all-prototype-tests.sh`; for parking — BFS solver used as the difficulty pipeline with optimal-solution-length reported per level; for 3D — measured physics-settle and picking benchmarks.
- [ ] **A3.** `prototypes/shared/wx-shim.js` landed AND adopted by all prototypes (jump-jump included); shim covers rewarded video, share, cloud storage/friend data, login, haptics, lifecycle; at least one headless test exercises game code *through* the shim.
- [ ] **A4.** Round 2 conclusion brief + PROGRESS.md updated; all Round 2/3 artifacts indexed in `.agent_workspace/README.md` per the docs-index rule.

### B. Prototype quality gates (blocking)

- [ ] **B1.** jump-jump defects fixed: endless platform generation (G-JJ1), dt-scaled horizontal motion (G-JJ2), charge-governs-distance with real miss-short/overshoot outcomes (G-JJ3), combo multiplier applied to score (G-JJ4), seedable RNG (G-JJ5).
- [ ] **B2.** jump-jump verifier upgraded from smoke to deterministic assertions (fixed seed → known landing/score/combo outcomes), or the coverage matrix updated to state the logic is *not* verified.
- [ ] **B3.** sheep-match3 shuffle preserves solvability (port tile-trio's redeal-and-complete-tray approach) with a test asserting post-shuffle solvability (G-SM1).
- [ ] **B4.** tile-trio generation seedable; `verify.js` runs its 300-deal suites on a fixed seed set in addition to (or instead of) unseeded runs (G-TT1).
- [ ] **B5.** All prototypes' README claims match measured behavior — specifically the difficulty-parity language (G-TT2) quantified against the original's known pass rates.

### C. Verification & reproducibility gates (blocking)

- [ ] **C1.** `./scripts/run-all-prototype-tests.sh` exits 0 at the final commit, run *after* the last merge from all agents.
- [ ] **C2.** CI workflow runs the harness on push to the branch (Node 22 + Chromium); or, if CI is out of environment scope, the final report records the exact commit + command + output of the last green local run.
- [ ] **C3.** Every factual claim in the final report carries a verification label from the docs-index rule: `Node` / `browser` / `DevTools` / `physical WeChat client` / `unverified (source-cited)`. Nothing verified only on Linux may claim WeChat validation.

### D. Documentation consistency gates (blocking)

- [ ] **D1.** One normalized "platform constants" table (main package 4 MB; total 20 vs 30 MB by payment status; storage quotas; payment API name and iOS status with effective take rates and dates) cited to current official docs — and every report either agrees with it or is amended by an erratum note. Today the reports disagree (sota-audit: ≤20 MB / ≤30 MB with virtual payment; feasibility probe: 30 MB total; Midas vs `requestVirtualPayment` naming across eras).
- [ ] **D2.** Rankings freshness handled: final report either re-pulls the latest monthly chart or explicitly time-boxes all conclusions to the July 2026 snapshot (31% monthly turnover documented in Round 1 makes silent staleness a real error class).
- [ ] **D3.** Legal/compliance language normalized: 版号/IAA statements framed as planning assumptions with jurisdiction/entity caveats, per the docs-index warning; no report language that reads as legal advice.
- [ ] **D4.** The sheep-match3 ↔ tile-trio redundancy resolved by designation (reference core vs demo) or convergence, recorded in `prototypes/README.md`.

### E. Non-goals (explicitly waived for acceptance)

Real-device/DevTools validation (no Linux path — the release-gate procedure is documented instead); art/audio production; level-content volume; backend/liveops/telemetry/anti-cheat; CN compliance implementation. These stay in the parity-gap tables as documented deltas, not TODOs.

---

## 5. Risk Register for the Final PR Merge

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Merge conflicts between the 6 concurrent agents** on shared files (`prototypes/README.md`, `.agent_workspace/README.md`, `PROGRESS.md`) — all agents push to one branch | High | Medium | Final integrator rebases/pulls before every push; docs-index owner does one last alignment pass; re-run harness after the final merge (C1) |
| R2 | **Internal contradictions ship in the final report** (package limits, payment API era, three ranking snapshot dates: Dec 2025 in global-planning, Jul 2026 in sota-audit/ranking-probe) | High (already present) | High — credibility of the whole study | Gate D1/D2: single constants table + snapshot time-box; erratum notes over silent edits |
| R3 | **Unverifiable claims read as verified** — no DevTools/device/AppID on Linux, yet reports assert package size, startup, API behavior | Medium | High | Gate C3 verification labels; keep feasibility-checklist's `cannot_validate_here` list authoritative |
| R4 | **jump-jump merges as-is** and becomes the counterexample to the repo's own quality claims | Medium | Medium | Gate B1/B2 blocking; if unfixable in Round 3, demote it in the index to "historical demo, below acceptance bar" explicitly |
| R5 | **Statistical test flakiness** — tile-trio's greedy clear-rates vary run-to-run (observed 34/60 then 30/60 on 深渊); harness depends on system Chrome for jump-jump | Medium | Low–Medium | Thresholds already conservative (`wins > 0`); B4 seeding removes variance; harness Chrome discovery documented, CI pins a browser |
| R6 | **IP/legal exposure in the PR itself** | Low | High | Already well-managed: original names/symbols/emoji, no copied assets, precedent-based framing; keep D3 language discipline; never import original-game assets for "comparison screenshots" |
| R7 | **Scope creep in Round 3** — attempting product-parity features (real backend leaderboard, real ad SDK) that cannot be validated here | Medium | Medium | Section 4E non-goals are part of acceptance; parent enforces |
| R8 | **In-flight deliverables land at inconsistent scope** (e.g., wx-shim exists but only tile-trio adopts it; dual-axis scores conflict with rankings.json names) | Medium | Medium | Acceptance defined as *adoption* (A3) and *reconcilability* (A1), not existence |
| R9 | **Dead `wx.*` code paths rot** post-merge (sheep-match3 main.js seams, shim internals) | Medium | Low | A3's shim-level test; label untested seams |
| R10 | **PR review overload** — a doc-heavy multi-thousand-line diff merged to `main` without a navigable entry point | Medium | Medium | The docs index is the entry point; final PR description must lead with the acceptance checklist state (§4) and the harness output |

---

## 6. Top 5 Gaps Blocking SOTA Acceptance

1. **Three of five Round 2 mandatory deliverables are not yet merged** — dual-axis scoring, the fourth prototype (挪了下车/抓大鹅), and `prototypes/shared/wx-shim.js`. Round 3 cannot start acceptance until they land and reconcile (A1–A3).
2. **jump-jump's game logic is defective, not just minimal**: a finite 20-platform world, frame-rate-dependent horizontal motion, auto-aimed jumps that invert the charge mechanic, and a combo that displays but never scores — under a smoke test that cannot catch any of it (B1/B2).
3. **WeChat-parity mocking is inconsistent across prototypes** (none / dead branches / inline shim); until every prototype routes its platform surface through the shared shim, the repo's central finding — mechanic ≠ product, and here is exactly where the platform boundary sits — is demonstrated only once instead of systematically (A3).
4. **Verification is not reproducible or continuous**: tile-trio's checks run on unseeded RNG (statistical pass ≠ regression-proof), and the green harness runs only on a developer's machine with no CI gate (B4, C2).
5. **Cross-report factual inconsistencies would ship in the final PR**: package-limit totals (20 vs 30 MB), payment-API naming/era (Midas vs `requestVirtualPayment`), and ranking snapshots from three different dates — with no normalized constants table and no verification labels separating Linux-verified claims from source-cited ones (D1–D3, C3).

---

*End of Round 2 SOTA gap review — fable subagent.*
