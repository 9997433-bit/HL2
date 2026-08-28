# Round 2 Context — 集成与华丽化

**Read first**: [`round1/ROUND1_CONCLUSION_BRIEF.md`](../round1/ROUND1_CONCLUSION_BRIEF.md)

## Mission

Integrate Round 1 deliverables into one polished demo loop. Close P0 gaps from the SOTA audit. Do **not** rewrite from scratch — extend `games/fucheng-life/`.

## Branch & path

- Branch: `agent/fucheng-life-ui`
- Code: `games/fucheng-life/`
- Docs: `.agent_workspace/fucheng-life/round2/`
- Commit + push when done

## Output convention

First line of your final message: `Model slug: <actual-slug>`

## Round 2 agent assignments

### fable-r2-gap-matrix
Produce `.agent_workspace/fucheng-life/round2/fable-gap-matrix.md`: table mapping each P0/P1 item → current status (done/partial/missing) → target file → suggested owner agent. Include token duplication audit between `main.css`, `screens.css`, `effects.css`.

### fable-r2-overlay-spec
Produce `.agent_workspace/fucheng-life/round2/fable-overlay-spec.md`: implementable spec for O1 Event Modal and O2 Ledger Sheet — DOM structure, CSS classes (align with `fc-*` from architecture doc), JS API (`FC.events.show(payload)`), accessibility, reduced-motion. Include ASCII wireframes.

### opus-r2-visual-polish
Implement in `games/fucheng-life/`:
- Count-up helper for money/stats (rAF, 400–800ms)
- Card/list stagger on era-select, origin-select, event log entries
- Page transition overlay (wipe or clip-path) between era→origin→dashboard navigation
- Global scanline+noise layer (opacity ≤0.04, pointer-events:none)
- Press/hover micro-feedback consistency
Commit working code; verify at 390px width.

### opus-r2-event-overlay
Implement O1 event modal on dashboard (and reusable in `js/` module):
- Load events from `data/story.json` sampleEvents
- Card UI with layer-tinted border, 2–3 choice buttons, consequence preview dots on hover/focus
- Hook into dashboard `tick()` — weighted random event every N months
- Calm copy tone per STORY_EXTRACT
Commit + brief note in `round2/opus-event-overlay-report.md`

### gpt-sol-r2-story-wire
Refactor data layer:
- Add `js/story-loader.js` (or extend `screens.js`) to fetch `./data/story.json`
- Map JSON schema → existing screen render functions
- Remove duplicated ERAS/ORIGINS arrays from `screens.js` (keep save-state/sim logic)
- Ensure `file://` fallback: inline seed or sync load path documented
Report: `round2/gpt-story-wire-report.md`

### gpt-sol-r2-effects-merge
Merge effects library into main game:
- Extract shared tokens to `css/fc-tokens.css` OR consolidate into `screens.css` + `main.css`
- Port count-up/neon/glass utilities needed by screens (don't duplicate entire demo.html)
- Optional: lightweight particle canvas behind dashboard (≤120 particles, pause on hidden tab)
Report: `round2/gpt-effects-merge-report.md`

## Non-goals (Round 2)

- Full SPA/hash router rewrite
- Backend / build toolchain
- New story content beyond story.json

## Acceptance (all agents)

- No regressions on main menu city canvas
- Chrome desktop + 390px: no horizontal scroll, no JS errors on happy path
- Respect `prefers-reduced-motion`
