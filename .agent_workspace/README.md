# WeChat Mini Games Research — Artifact Index

This workspace studies the 2025–2026 WeChat mini-game market, separates
top-grossing (IAP) from most-played (IAA) rankings, and tests replication
claims with small browser prototypes. “Replication” throughout means an
original implementation of a gameplay pattern, not reuse of another game's
name, art, code, levels, text, audio, or licensed IP.

## Start here

- [`round1/ROUND1_CONCLUSION_BRIEF.md`](./round1/ROUND1_CONCLUSION_BRIEF.md) — Consolidated Round 1 findings, prototype outcomes, shared conclusions, and remaining gaps.
- [`round1/rankings.json`](./round1/rankings.json) — Machine-readable July 2026 IAP/IAA rankings, historical snapshots, source provenance, and confidence labels.
- [`round2/gpt-docs-index-report.md`](./round2/gpt-docs-index-report.md) — Documentation merged in Round 2 and the research, platform, and implementation gaps still open.
- [`round2/gpt-test-harness-report.md`](./round2/gpt-test-harness-report.md) — Unified harness results and a per-prototype matrix of automated coverage and remaining test gaps.
- [`../prototypes/README.md`](../prototypes/README.md) — Runnable-prototype catalog with launch, input, test, and platform-scope guidance.

## Round 1 — Research and feasibility

### Reports

- [`round1/PARENT_BASELINE.md`](./round1/PARENT_BASELINE.md) — Initial dual-chart baseline, replication tiers, target shortlist, and IP warning used to dispatch the deeper probes.
- [`round1/gpt-ranking-probe-report.md`](./round1/gpt-ranking-probe-report.md) — Source-audited July 2026 IAP and IAA Top 10 lists with methodology, caveats, and reproduction commands.
- [`round1/gpt-feasibility-probe.md`](./round1/gpt-feasibility-probe.md) — Environment, runtime, API, engine, backend, and category-level feasibility assessment.
- [`round1/fable-global-planning.md`](./round1/fable-global-planning.md) — Market-level planning report covering candidate selection, architecture, platform constraints, and legal/regulatory risks.
- [`round1/fable-sota-audit.md`](./round1/fable-sota-audit.md) — Ecosystem and engine audit with WeChat API gaps, open-source alternatives, and full-product replicability scores.
- [`round1/opus-mechanics-analysis.md`](./round1/opus-mechanics-analysis.md) — Core-loop and algorithm decomposition, complexity ranking, MVP choice, and tested stacked-match prototype analysis.
- [`round1/opus-prototype-report.md`](./round1/opus-prototype-report.md) — Tile Trio implementation report covering solvable generation, measured verification, and the WeChat product-parity gap.
- [`round1/ROUND1_CONCLUSION_BRIEF.md`](./round1/ROUND1_CONCLUSION_BRIEF.md) — Parent synthesis of all Round 1 work and the agenda carried into Round 2.

### Structured data

- [`round1/rankings.json`](./round1/rankings.json) — Checked ranking records for two distinct chart series; these should not be collapsed into an unweighted “overall Top 10.”
- [`round1/feasibility-checklist.json`](./round1/feasibility-checklist.json) — Machine-readable platform probe, hard blockers, engine options, 14 category assessments, and acceptance checks.

## Round 2 — Alignment and targeted follow-up

- [`round2/ROUND2_CONTEXT.md`](./round2/ROUND2_CONTEXT.md) — Shared Round 2 mission, mandatory deliverables, existing-prototype inventory, branch, and output convention.
- [`round2/gpt-docs-index-report.md`](./round2/gpt-docs-index-report.md) — Documentation alignment record, resolved navigation issues, and still-missing evidence or deliverables.
- [`round2/gpt-test-harness-report.md`](./round2/gpt-test-harness-report.md) — Test-run evidence for the aggregate runner, including detailed coverage and exclusions for all three current prototypes.

Round 2 implementation and analysis artifacts should be added to this section
as they land; the gap report records which planned outputs were absent when
this index was prepared.

## Playable prototypes

- [`../prototypes/jump-jump/`](../prototypes/jump-jump/) — Single-file Canvas hold-to-charge jumping demo with randomized platforms, scoring, and combo feedback, covered by a Chrome/CDP smoke test.
- [`../prototypes/sheep-match3/`](../prototypes/sheep-match3/) — Modular stacked match-3 prototype with a guaranteed-solvable generator, live solver/hints, props, debug autoplay, and 14 Node tests.
- [`../prototypes/tile-trio/`](../prototypes/tile-trio/) — Single-file layered three-match game with three levels, three ad-shaped props, an inline platform shim, and a dependency-free verification script.

These are mechanic probes, not deployable WeChat Mini Game packages. They do
not provide production identity, ads, payments, friend data, sharing,
compliance, release configuration, or real-device WeChat validation.

## Supporting files

- [`PROGRESS.md`](./PROGRESS.md) — Parent orchestration status for the multi-round, multi-agent research effort.
- [`../scripts/collect_rankings.py`](../scripts/collect_rankings.py) — Zero-dependency generator/checker for the checked-in ranking snapshot, with an optional live-source probe.
- [`../scripts/run-all-prototype-tests.sh`](../scripts/run-all-prototype-tests.sh) — Aggregate test runner for every current prototype and discoverable future verifier.
- [`../scripts/verify-jump-jump.mjs`](../scripts/verify-jump-jump.mjs) — Dependency-free Node 22 CDP smoke test for the shipped Jump Jump browser file.
- [`../README.md`](../README.md) — Repository overview and quick-start commands.

## Aligned interpretation

1. Treat the IAP top-grossing and IAA most-played charts as separate datasets.
2. Score mechanic portability separately from full-product replicability.
3. Use the browser prototypes only as evidence about local gameplay mechanics.
4. Treat WeChat identity, social graph, distribution, ads, payment, compliance,
   package constraints, and release validation as distinct product/platform work.
