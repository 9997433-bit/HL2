# Round 3 · jump-jump Defect Fixes (G-JJ1 – G-JJ5)

> opus-r3-jump-jump-fix | 2026-08-26 | branch `agent/wechat-minigames-research`
> Closes acceptance gates B1 and B2 of `round2/fable-sota-gap-review.md` §4:
> the five game-logic defects in §1.4, and the verifier that could not catch them.

## 1. Why this was a rewrite and not a patch

The Round 2 audit scored `jump-jump` 3.4/10 — the only prototype in the repo
whose problems were in the game logic rather than the polish. The four mechanic
defects were not independent: the jump auto-aimed at the next platform (G-JJ3),
which is only possible because a finite platform list existed to aim at (G-JJ1),
and the per-frame horizontal step (G-JJ2) was invisible precisely because the
aim compensated for it. Fixing any one in isolation would have produced a game
that plays worse than the broken one. The loop was rebuilt around a single
model instead: charge → launch velocity → parabola → landing test.

`index.html` stays a single file (628 lines of script) and keeps the wx-shim
integration that landed in Round 2 (`166d5e7`).

## 2. The five defects

| ID | Round 2 finding | Fix | Asserted by |
|---|---|---|---|
| **G-JJ1** | `initPlatforms()` built exactly 20 blocks; nothing ever appended more, so the score had an invisible cap | Blocks carry a monotonic index and are generated on demand (`CFG.ahead = 8` in front) and pruned behind (`CFG.behind = 3`). The camera now scrolls horizontally, so the generated world is actually on screen — previously everything past x = 400 was drawn off-canvas | 60 perfect jumps reach index 60 with ≥69 blocks generated, while the live list stays ≤13 entries |
| **G-JJ2** | `player.x += player.jumpVx` per frame against dt-scaled gravity: a 120 Hz display jumped twice as far as a 60 Hz one | One fixed 1/120 s step fed by an accumulator, integrating exact constant-acceleration kinematics (`y += v·h + ½g·h²`), so step size cannot bias the trajectory at all | The same jump driven at 30/60/120/240 Hz produces byte-identical landing state |
| **G-JJ3** | `jump()` read the next platform and set `jumpVx = dx / (power / 400)` — the aim was automatic and distance was *inversely* proportional to charge | Charge (capped at 1.2 s) maps to `vx = 110 + 230p`, `vy = −(260 + 300p)`; the jump path never reads the platform list. Flat-ground range runs 35.8 px (bare tap) to 238 px (full hold) | Distance is strictly increasing in charge; the identical charge flies the identical distance in a different seeded world; range matches the closed-form model to <1e-6 px |
| **G-JJ4** | `combo` counted centre landings, displayed them, and never touched the score | A landing within 12 px of the block centre extends the combo and pays `2^combo` capped at 32; anything else pays 1 and resets it | The exact sequence 2/4/8/16/32/32 (cumulative 2, 6, 14, 30, 62, 94), then an off-centre landing paying 1 and zeroing the combo |
| **G-JJ5** | Bare `Math.random()`, no seed; no platform mocking | Seeded `mulberry32` world with `?seed=` for replay; the shim path additionally stores the best score (`wx.setStorageSync`), vibrates on a centre landing, and revives onto the block the jumper actually fell from | Same seed replays the world exactly, different seeds diverge; the death → cloud-write → friend-board → rewarded-video-revive → share sequence is driven end to end |

## 3. Generation is fair by construction

The original's blocks are hand-placed; a generated version has to prove that
every gap it produces is clearable, or the difficulty is just a random death
sentence. Two constraints do that:

- **Gap floor** `prevW/2 + w/2 + 24` — two blocks never touch, so there is
  always bare air to fall into. This is what makes an under-charged hop a real
  failure; without it a wide-block pair can be crossed by accident.
- **Gap ceiling 195 px, height step ±34 px** — chosen so the worst case (widest
  gap, uphill, onto the narrowest block) needs 169 px of reach against the
  215 px a full charge delivers.

Measured over 200 seeded worlds × 25 perfect jumps: zero unreachable blocks,
and perfect play held 0.489–1.111 s of the 1.2 s cap, so no gap requires a
pinned maximum charge. Timing windows on flat ground, from the same model:

| Gap | Block width | Hold window that lands | Hold window that combos |
|---|---|---|---|
| 112 px | 52 px | 0.32 s | 0.15 s |
| 140 px | 70 px | 0.38 s | 0.13 s |
| 195 px | 52 px | 0.24 s | 0.11 s |
| 195 px | 88 px | 0.40 s | 0.11 s |

Landing is forgiving, the combo is not — which is why the score is driven by
streaks rather than by distance, as in the original. These are tuned
reconstruction constants; Tencent never published 跳一跳's, and the README says
so rather than implying parity.

## 4. B2: the verifier now proves the logic

The Round 2 CDP harness was well built but, by its own coverage matrix, proved
only "loads, renders, jumps, doesn't throw" — none of G-JJ1–JJ4 is visible to a
smoke test. `scripts/verify-jump-jump.mjs` keeps the same dependency-free CDP
plumbing (real Chrome, no Puppeteer) and adds a deterministic mode: the page
exposes `window.__jj`, the verifier calls `setDriven(true)` to take physics away
from `requestAnimationFrame`, and steps the *shipped* code itself. There is no
second implementation of the model anywhere in the test.

14 checks, ~3.5 s:

```
ok    page boots, renders a frame and exposes the test surface
ok    seeded generation replays exactly and differs across seeds (G-JJ5)
ok    platforms are generated endlessly and pruned behind the jumper (G-JJ1)
ok    200 seeded worlds x 25 jumps are all clearable
      perfect play held 0.489s–1.111s of the 1.2s cap
ok    centre landings multiply the score 2/4/8/16/32 and a miss resets it (G-JJ4)
ok    hold time governs distance, and nothing auto-aims (G-JJ3)
ok    30/60/120/240 Hz produce an identical landing (G-JJ2)
ok    landing in the gap kills the run and opens the WeChat game-over surface (G-JJ5)
ok    sharing the score goes through wx.shareAppMessage
ok    a rewarded video revives the run on the block it fell from
ok    play resumes normally after the revive
ok    space charges and releases a jump through the live rAF loop
ok    reset returns the game to a playable start
ok    no exceptions or console errors during the whole run
```

The last live-input check still dispatches real key events against the running
rAF loop, so the deterministic mode cannot mask a broken input path.

## 5. Verification record

```
代码树  commit b4d48bc(rebased) · 分支 agent/wechat-minigames-research
命令    ./scripts/run-all-prototype-tests.sh
结果    5 套件通过，0 失败 (jump-jump 14 checks · sheep-match3 17 · tile-trio seeded ·
        parking-jam 23 单测 + 验证器)
环境    Node v22.14.0 · Linux · headless Chrome (Chrome/CDP)
```

Verification label: **browser (headless Chrome on Linux)**. Nothing here is
validated on a WeChat client — the friend board, the rewarded video and the
share card are the shared shim's mock, and on a real device the friend-data read
must move into the 开放数据域 sub-context, which no shim can reproduce.

## 6. What is still not replicated

The isometric 3D presentation, sound, skins, and the original's bonus targets
(music box, manhole cover) that awarded extra points. All are art/content rather
than mechanic, and all remain out of scope by §4E of the gap review. The
prototype's own difficulty is a tuned reconstruction, not a measurement of the
original — the README labels it that way.
