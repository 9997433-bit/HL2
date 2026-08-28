# Round 3 Context — SOTA 验收、测试链与 PR

**Read first**:
- [`.agent_workspace/fucheng-life/round2/ROUND2_CONCLUSION_BRIEF.md`](../round2/ROUND2_CONCLUSION_BRIEF.md)
- [`.agent_workspace/fucheng-life/round1/fable-sota-ui-audit.md`](../round1/fable-sota-ui-audit.md) §7
- [`.agent_workspace/fucheng-life/round2/fable-gap-matrix.md`](../round2/fable-gap-matrix.md)
- [`.agent_workspace/fucheng-life/round2/fable-overlay-spec.md`](../round2/fable-overlay-spec.md) § O2

## Mission

Final sprint: close remaining P1 gaps, run 15-gate acceptance, automated test chain, global final report, prepare PR to `main`.

## Branch & path

- Branch: `agent/fucheng-life-ui`
- Code: `games/fucheng-life/`
- Docs: `.agent_workspace/fucheng-life/round3/`
- Commit + push all work

## Output convention

First line: `Model slug: <actual-slug>`

---

## Round 3 agent assignments

### fable-r3-sota-acceptance ☁️

Produce `.agent_workspace/fucheng-life/round3/fable-sota-acceptance.md`:
- Score each of 15 acceptance gates (pass/fail/partial + evidence)
- Re-score D1–D6 rubric from SOTA audit per screen (Splash/menu, era, origin, dashboard, map, event modal)
- List blockers vs nice-to-haves for merge
- **No code** — audit only; use browser or static analysis

### fable-r3-final-report ☁️

Produce `.agent_workspace/fucheng-life/GLOBAL_FINAL_REPORT.md` (Chinese):
- Executive summary: did we deliver a gorgeous urban life-sim UI MVP?
- What shipped (screens, effects, data, events)
- SOTA positioning vs BitLife/人生重开/ZZZ
- Known limitations & future work
- Link to demo path on GitHub Pages

### opus-r3-p1-polish ☁️

Implement remaining P1 polish in `games/fucheng-life/`:
1. Money float `+¥/-¥` flying to HUD on dashboard tick (reuse FCMotion if possible)
2. City-map locked zones: blur + lock bracket + threshold caption per overlay-spec / gap-matrix P1-6
3. HUD money warning when cash < next bill (subtle red pulse, glow budget ≤1)
4. Fix dashboard log incremental render — only new entries animate, not all 24 on every tick

Verify 390px, no regressions. Report: `round3/opus-p1-polish-report.md`

### opus-r3-o2-ledger

Implement O2 Ledger Sheet per `fable-overlay-spec.md`:
- Bottom drawer after monthly tick with bill line items, staggered row animation
- `FC.ledger.show(payload)` API, reuse `FC.overlay` stack from fc-events.js
- Hook into dashboard tick() after month closes
- Report: `round3/opus-o2-ledger-report.md`

### gpt-sol-r3-test-harness

Build automated test chain:
- `scripts/run-fucheng-life-tests.sh` — orchestrator
- `games/fucheng-life/tests/` — node `--check` all JS, JSON schema validation for story.json, static HTML link checker, deterministic assertions (era count=7, origins=10, layers=5, fc-events exports)
- `.github/workflows/fucheng-life-tests.yml` — CI on push/PR touching `games/fucheng-life/**`
- Report: `round3/gpt-test-harness-report.md`
- **Must pass locally before commit**

### gpt-sol-r3-pages-readme

Polish release artifacts:
- Update `games/fucheng-life/README.md` with Round 3 state, test command, full demo flow
- Ensure repo root `index.html` card for 浮城人生 is accurate
- Add `games/fucheng-life/ACCEPTANCE.md` quick manual QA checklist (15 gates)
- Report: `round3/gpt-pages-readme-report.md`

---

## Test gate (all agents)

Before commit: run `./scripts/run-fucheng-life-tests.sh` if it exists (gpt agent creates it; others run after pull).

Manual minimum: Chrome 390px happy path, no console errors.

## Non-goals

- SPA refactor
- New story content beyond fixing story.json choices schema if needed
- WebAudio default on

## PR note (parent orchestrator)

Parent will open PR `agent/fucheng-life-ui` → `main` after Round 3 green.
