Model slug: gpt-5.6-sol-xhigh-fast

# Round 2 — Documentation Index & Alignment Report

## Result

The repository now has one navigable documentation path from the root README
to every checked-in Round 1 report, both JSON datasets, all three prototypes,
the Round 2 context, and supporting reproduction tools.

## What was merged and aligned

- Added [`.agent_workspace/README.md`](../README.md) as the master artifact
  index, with one-line summaries for 8 Round 1 Markdown reports, 2 structured
  datasets, 3 prototype directories, the Round 2 documents, and supporting
  status/reproduction files.
- Replaced the root placeholder with a project overview, repository map,
  static-server instructions, evidence-check commands, and an explicit
  research-versus-production scope boundary.
- Expanded [`prototypes/README.md`](../../prototypes/README.md) from a short
  table into an accurate runbook covering all three prototypes, controls,
  debug URLs, automated coverage, and WeChat integration status.
- Corrected the live progress summary from an ambiguous “9 reports” to the
  checked-in inventory: 8 Markdown reports plus 2 JSON datasets.
- Resolved the Round 1 brief's stale note that Tile Trio was absent from the
  prototype index; all three prototype directories are now linked.
- Kept IAP top-grossing and IAA most-played rankings separate. The primary
  July 2026 source-audited snapshot remains
  [`rankings.json`](../round1/rankings.json); reports based on other dates or
  methodologies remain available as context rather than being averaged into a
  synthetic ranking.
- Aligned the prototype wording with the source tree: Jump Jump is
  browser-only and manually checked; Sheep Match-3 has 14 Node tests and
  limited `wx` entry seams; Tile Trio has a headless verifier and an inline
  mock/explanatory shim, not live WeChat service integration.
- Made the central interpretation explicit across the index: mechanic
  portability and full-product replicability are separate questions.

## Inventory included in the index

```text
.agent_workspace/
├── README.md
├── PROGRESS.md
├── round1/
│   ├── PARENT_BASELINE.md
│   ├── gpt-ranking-probe-report.md
│   ├── rankings.json
│   ├── gpt-feasibility-probe.md
│   ├── feasibility-checklist.json
│   ├── fable-global-planning.md
│   ├── fable-sota-audit.md
│   ├── opus-mechanics-analysis.md
│   ├── opus-prototype-report.md
│   └── ROUND1_CONCLUSION_BRIEF.md
└── round2/
    ├── ROUND2_CONTEXT.md
    └── gpt-docs-index-report.md

prototypes/
├── README.md
├── jump-jump/
├── sheep-match3/
└── tile-trio/
```

## Still missing

At the time this index was prepared, the other planned Round 2 outputs were
not yet present in the working tree:

1. A dual-axis dataset/report that separately scores mechanic replication and
   product replication.
2. A parking-puzzle prototype or 3D physics benchmark.
3. A shared `prototypes/shared/wx-shim.js` used consistently by the prototypes.
4. A unified headless runner that includes Jump Jump and all other prototypes.
5. The planned Round 2 SOTA review/final synthesis.

They should be added to the Round 2 section of the master index when merged.

Evidence gaps also remain:

- No official WeChat DevTools compile, preview, upload, release, eligible-AppID
  API, or physical-device validation has been performed in this Linux
  environment.
- Package-limit and payment API descriptions vary across the reports because
  they use different source dates and platform paths; final publication should
  re-check current official documentation instead of selecting a number or API
  name by majority.
- Broad licensing statements such as “IAA requires no 版号” are planning
  assumptions in some reports, not legal advice or a universal release rule;
  a specific title, entity, monetization path, and jurisdiction need review.
- Engine-market-share figures in the SOTA audit rely partly on community
  packet-capture analysis rather than an official Tencent census.
- The browser prototypes do not validate platform-controlled acquisition,
  friend-graph, ad-fill, payment-conversion, compliance, or retention claims.

## Documentation rule for later rounds

Add each new report or dataset to the round section of
[`.agent_workspace/README.md`](../README.md), add each runnable prototype to
[`prototypes/README.md`](../../prototypes/README.md), and state whether its
claims were verified in Node, a browser, WeChat DevTools, or a physical
WeChat client.
