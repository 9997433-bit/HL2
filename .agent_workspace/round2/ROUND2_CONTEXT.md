# Round 2 Context — Injected to All Subagents

Read `.agent_workspace/round1/ROUND1_CONCLUSION_BRIEF.md` for full Round 1 output.

## Round 2 Mission
Targeted refactor & deep optimization based on Round 1 findings.

## Mandatory Deliverables (distributed across 6 agents)
1. **Dual-axis scoring** — separate Mechanic Score (1-10) vs Product Score (1-10) for top games
2. **New prototype** — 挪了下车 parking puzzle OR 抓大鹅 3D physics benchmark
3. **WX shim** — `prototypes/shared/wx-shim.js` mock for wx.createRewardedVideoAd, wx.shareAppMessage, wx.setUserCloudStorage, etc.
4. **Test harness** — unified headless runner for jump-jump, sheep-match3, tile-trio (+ new prototype)
5. **Docs index** — `.agent_workspace/README.md` indexing all round1/round2 reports

## Existing Prototypes
- `prototypes/jump-jump/` — hold-to-charge hop
- `prototypes/sheep-match3/` — stacked match-3 + tests
- `prototypes/tile-trio/` — layered 3-match + verify.js

## Branch
`agent/wechat-minigames-research` — commit and push all work.

## Output Convention
First line MUST declare: `Model slug: <actual-slug-used>`
