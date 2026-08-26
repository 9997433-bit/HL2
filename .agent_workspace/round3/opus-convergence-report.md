# Round 3 · Prototype Convergence & wx-shim Adoption

> opus-r3-prototype-convergence | 2026-08-26 | branch `agent/wechat-minigames-research`
> Closes G-SM1 and the cross-cutting "redundancy without convergence" finding;
> confirms G-PJ (parking-jam shim) and G-TT1 (tile-trio seeding) landed elsewhere.

## 1. What changed

| Task | State | Where |
|---|---|---|
| parking-jam adopts the shared shim | **already landed** (commit `fedfe12`, opus-r2-parking-prototype) — verified, not re-done | `prototypes/parking-jam/src/main.js` |
| sheep-match3 shuffle preserves solvability (G-SM1) | **done** | `prototypes/sheep-match3/src/core.js`, `test/core.test.mjs` |
| sheep-match3 props ad-gated through the shim (G-SM2) | **already landed** (commit `843c217`) — extended with the refusal path | `prototypes/sheep-match3/src/main.js` |
| tile-trio seedable RNG (G-TT1) | **already landed** (commit `628cde2`, gpt-sol-r3-ci-seeded) — verified, not re-done | `prototypes/tile-trio/index.html`, `verify.js` |
| Prototype roles documented | **done** | `prototypes/README.md` |

Two of the four assigned items were finished by sibling agents while this one
was reading the context. They were verified rather than rewritten; the notes are
in §4.

## 2. G-SM1: the shuffle prop could strand the player

`shuffleProp` permuted the multiset of types still on the board and returned
`true`. The multiset test in the suite passed, and the prop was wrong anyway:
the board it hands back need not have a winning line. Since the same prop is the
thing a player watches a rewarded video to get back, the failure mode is the
worst one available — the purchase ends the run.

tile-trio never had this bug because its shuffle re-runs generation: peel the
remaining board into a legal removal order, finish the groups the tray is
holding first, then paint the rest in triples. That pattern is ported here, with
the one thing tile-trio cannot do bolted on: sheep-match3 has a solver, so each
candidate deal is *proved* before it is shown.

```
shuffleProp(game):
  for attempt in 1..6:
     order  = random topological order of the remaining cover graph
     plan   = [tiles the tray is waiting on, most-nearly-complete type first]
              ++ [the rest, in consecutive triples, shuffled]
     apply plan along order
     if solve(types, coverGraph, picked=off-board tiles) != null: accept
  restore the original board; return false
```

Ordering the tray's partial groups by how nearly complete they are matters: a
type the tray already holds twice needs one tile and clears on the very next
pick, so the tray shrinks before anything is added to it. Dealing a
needs-two-more type first can push the tray over the slot limit on the way.

**The refusal branch is a real state, not a nicety.** A tray holding six tiles
in seven slots loses to the next pick unless that pick completes a triple; when
those six are six different types, no arrangement of the board wins. Two such
positions are pinned in the test suite (level 2, seeds 1013 and 20260826, nine
moves along the solver's own line): the blind permutation strands the player in
both, verified unsolvable at a 3,000,000-node budget, while the generated deal
plays out to a win. In that dead state the board is now left untouched and the
prop unspent, and the host shell says so — scrambling the tiles anyway would
only hide the dead end behind a paid animation.

**Cost.** The first candidate is accepted every time in sampling; the solver's
triple-first move ordering finds the line immediately because the deal was built
along one.

| Level | Tiles | Worst shuffle, 5 seeds, 9 moves in | Accepted |
|---|---|---|---|
| 1 · 教学 | 24 | 0.3 ms | 5/5 |
| 2 · 地狱 | 129 | 0.8 ms | 5/5 |
| 3 · 无尽 | 87 | 0.4 ms | 5/5 |

Tests went 14 → 17: post-shuffle solvability across 3 levels × 3 seeds × 2
positions, the blind-versus-safe comparison above, and the dead position keeping
both its board and its prop. Suite runtime 1.0 s → 2.1 s.

## 3. Prototype roles

The gap review's cross-cutting finding was that `sheep-match3` and `tile-trio`
implement one mechanic twice with complementary strengths and no stated reason
for both to exist. `prototypes/README.md` now names the roles:

- **`sheep-match3` — reference core.** Pure rules module, seeded PRNG, solver
  used as the oracle for generation, hints and now the shuffle. New game logic
  gets held to this suite.
- **`tile-trio` — demo-facing build.** Single file, opens by double-click, the
  product loop visible on screen, and a verifier that loads the shipped file.
- **`parking-jam` — content-pipeline probe.** The BFS solver supplies par,
  stars, budget and the generator's accept test.
- **`jump-jump` — skill-loop and open-data-domain probe.**
- **`shared/` — the one platform mock; `wechat-packaging-skeleton/` — the
  packaging probe.**

Crossed over this round: safe shuffle into sheep-match3, seedable RNG into
tile-trio, the shim into parking-jam and jump-jump. Left un-merged on purpose:
the two match-3 cores, because collapsing them costs either the pure testable
core or the single-file demo.

## 4. Verification of the two items that landed elsewhere

**parking-jam.** `src/main.js` installs the shim with `adBehavior: 'manual'` and
draws the fake player itself, which is the honest shape — the real SDK owns the
screen and reports back. The Round 2 report's warning was that a synchronous
`requestHint` cannot survive an ad gate, and the landed code took that path:
`platform.watchRewardedAd({onReward, onSkip, onUnavailable})` with the hint
applied from `onClose({isEnded})`, plus the correct "no ad fill is not the
player's fault, grant it anyway" branch. `verify.js` asserts all three outcomes.

**tile-trio.** `?seed=` accepts numbers or labels (FNV-1a hashed, so
`?seed=tray-overflow` works in a bug report), and `random` replaces `Math.random`
across `peelOrder` / `shuffleArr` / `dealSymbols` with the seeded stream injected
per call. `verify.js` now takes the query as `argv[2]`, refuses to run unseeded,
and adds a regression check that equal seeds reproduce identical deals while
distinct seeds do not collapse — the 300-deal suites are replayable.

## 5. Gate

```
$ ./scripts/run-all-prototype-tests.sh
PASS: jump-jump browser smoke test
PASS: sheep-match3 unit and solver tests            (17 tests)
PASS: tile-trio seeded real-file integration verifier
PASS: parking-jam core unit tests                   (23 tests)
PASS: parking-jam verifier
Prototype test summary: 5 passed, 0 failed
```

## 6. Left open

- **The solver is the fairness oracle only where a solver exists.** tile-trio's
  shuffle is still correct-by-construction and unverified per use; it has no
  solver to ask. Whether that matters depends on whether tile-trio stays the
  demo or becomes a second reference.
- **`solve()` succeeds when every tile has been picked, not when the tray is
  empty.** Those coincide only because every type's total is a multiple of
  three, which generation guarantees and no test asserts directly.
- **G-SM4 (the face-down bottom queue) is untouched** and remains the largest
  remaining mechanic gap in either match-3.
- Shared working tree: sibling agents stashed uncommitted work mid-round. Every
  change here is committed in small pieces for that reason.
