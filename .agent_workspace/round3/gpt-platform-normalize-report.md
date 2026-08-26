Model slug: gpt-5.6-sol-xhigh-fast

# Round 3 — Platform Constants Normalization + WeChat Package Skeleton

## Outcome

Platform facts are now centralized in
[`platform-constants.json`](../platform-constants.json), with every fact marked
`linux-verified`, `source-cited`, or `pending-devtools`. Earlier reports keep
their historical text and carry a normalization footnote to the canonical file.

The live official Mini Game documentation checked on 2026-08-26 resolves the
two main contradictions as follows:

1. **Package size:** current live code-package and subpackage pages state a
   **4 MB main package** and **30 MB total**. The earlier 20 MB default / 30 MB
   after virtual-payment rule is retained only as superseded history; it is not
   the current canonical limit.
2. **Payment names:** Mini Games use `wx.requestMidasPayment` for game currency,
   `wx.requestMidasPaymentGameItem` for direct item purchase, and
   `wx.checkIsSupportMidasPayment` for capability detection.
   `wx.requestVirtualPayment` is documented under the ordinary Mini Program API
   tree and is not substituted as the canonical Mini Game name.
3. **iOS payment:** a blanket “iOS is blocked” statement is stale. Mini Game
   virtual payment is conditionally supported on iOS 15+, WeChat 8.0.68+, and
   base library 3.10.3+, with a runtime capability check and production
   environment; eligibility still requires DevTools/AppID/device validation.
4. **2026 iOS economics:** the official Mini Game incentive page states a 70%
   base developer share for eligible Apple MAPP revenue and an estimated 88%
   promotional share through 2026-12-31, subject to Apple settlement. This
   Mini Game-specific statement replaces mixed 12–17% shorthand copied across
   product scopes.

## Canonical dataset

The JSON dataset covers:

- current and superseded package limits;
- key/value storage (10 MB per user/game);
- cached plus user files (200 MB default; eligible upgrade to 1 GB);
- Mini Game payment API names and iOS capability gates;
- dated Mini Game payment economics;
- minimum project structure and why `project.private.config.json` stays local;
- official source URLs with a 2026-08-26 check date;
- explicit Linux-versus-DevTools validation boundaries.

The current package pages are intentionally preferred over cached or retired
official pages. This avoids resolving a documentation conflict by majority
vote.

## Reports footnoted

Normalization footnotes were added without rewriting the historical analyses:

- Round 1: `fable-global-planning.md`, `fable-sota-audit.md`,
  `gpt-feasibility-probe.md`, `opus-mechanics-analysis.md`, and
  `ROUND1_CONCLUSION_BRIEF.md`;
- Round 2: `fable-sota-gap-review.md`, `opus-wx-shim-report.md`,
  `gpt-docs-index-report.md`, and `ROUND2_CONCLUSION_BRIEF.md`;
- shared shim documentation: `prototypes/shared/README.md`.

The shim report and README now explicitly distinguish its legacy
“always fail iOS payment” mock behavior from current platform truth. The shim
implementation itself was not changed in this documentation/package task.

## WeChat package skeleton

[`prototypes/wechat-packaging-skeleton/`](../../prototypes/wechat-packaging-skeleton/)
is a native Canvas 2D Tile Trio smoke package:

```text
wechat-packaging-skeleton/
├── game.js
├── game.json
├── project.config.json
└── src/
    ├── platform.js
    └── tile-trio.js
```

`project.config.json` uses the documented `compileType: "minigame"`;
`game.js` is the entry; `game.json` supplies portrait runtime configuration.
The adapter creates the first on-screen `wx` canvas and maps touch, lifecycle,
and haptics. The compact 18-tile layered board is playable but deliberately not
a full port of the browser demo. A local `project.private.config.json` is
ignored so account-specific AppID choices are not committed.

## Verification

### linux-verified

- `platform-constants.json`, `game.json`, and `project.config.json` parse as
  JSON with `python3 -m json.tool`.
- All three skeleton JavaScript files pass `node --check`.
- A Node mock-platform smoke test starts the native game module with 18 board
  tiles, zero tray tiles, and a registered touch handler.
- Required package files exist.
- `du -sb prototypes/wechat-packaging-skeleton` measured **10,441 bytes** in
  this checkout, far below the source-cited 4 MB main-package ceiling. This is
  a filesystem measurement, not DevTools' compiled package accounting.
- `./scripts/run-all-prototype-tests.sh` passed: **5 suites, 0 failures**.
- Commit patch whitespace check passed.

### source-cited

All platform limits, API names, capability gates, economics, and project-file
roles in the canonical JSON link to currently reachable official WeChat pages.

### pending-devtools

No claim is made that Linux validated WeChat import, compilation, preview,
upload, payment eligibility, package accounting, ad fill, open-data behavior,
or physical-device performance. Import the skeleton into stable WeChat
DevTools on Windows/macOS with a Mini Game test or eligible production AppID,
then complete a physical-client pass.
