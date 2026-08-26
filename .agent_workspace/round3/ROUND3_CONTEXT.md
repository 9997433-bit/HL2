# Round 3 Context — Final SOTA Polish & Acceptance

Read `.agent_workspace/round2/ROUND2_CONCLUSION_BRIEF.md` and `.agent_workspace/round2/fable-sota-gap-review.md` for full acceptance criteria.

## Round 3 Mission
Final sprint: close all SOTA gaps, verify full test chain, produce global final report, prepare PR for merge.

## Mandatory Acceptance Items
1. **jump-jump fixes** — endless platforms, dt-scaled physics, charge→distance skill loop, combo scoring (G-JJ1–JJ5)
2. **parking-jam wx-shim** — integrate shared shim (hint via rewarded video)
3. **sheep-match3** — shuffle solvability guarantee + ad-gated props via wx-shim
4. **tile-trio** — seedable RNG for reproducible verify.js runs
5. **Platform constants** — normalize package limits, payment API naming across all reports
6. **CI** — `.github/workflows/prototype-tests.yml` running `scripts/run-all-prototype-tests.sh`
7. **GLOBAL_FINAL_REPORT.md** — executive summary answering: Can WeChat top-10 mini games be replicated?

## Branch
`agent/wechat-minigames-research` — commit and push all work.

## Output Convention
First line MUST declare: `Model slug: <actual-slug-used>`

## Test Gate
All changes MUST pass `./scripts/run-all-prototype-tests.sh` before commit.
