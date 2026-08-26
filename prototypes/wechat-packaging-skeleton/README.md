# Tile Trio — WeChat Mini Game packaging skeleton

This directory is a native Canvas 2D package skeleton for the Tile Trio
prototype. It exists to exercise the WeChat project boundary that the browser
prototype cannot: `game.js` entry, `game.json` runtime configuration,
`project.config.json`, `wx.createCanvas`, touch input, lifecycle, and haptics.

It is intentionally small and has no copied assets or network dependencies.
The included 18-tile board is a packaging smoke target, not a port of every
feature in [`../tile-trio/`](../tile-trio/).

## Import

1. Install stable WeChat DevTools on Windows or macOS.
2. Import this directory as a Mini Game project.
3. Select a Mini Game test account or replace `touristappid` with an eligible
   AppID through DevTools. DevTools writes local choices to
   `project.private.config.json`, which this template ignores.
4. Compile, preview on a device, and confirm that touch, restart, background /
   foreground redraw, and haptics work.

`project.config.json` uses `compileType: "minigame"` and base library `3.10.3`.
The base-library floor matches the current payment capability probe in
[the canonical constants](../../.agent_workspace/platform-constants.json), but
this smoke package does not request payment.

## Structure

```text
wechat-packaging-skeleton/
├── game.js                 # Mini Game entry
├── game.json               # portrait runtime configuration
├── project.config.json     # shareable DevTools configuration
└── src/
    ├── platform.js         # wx canvas/touch/lifecycle/haptics adapter
    └── tile-trio.js        # compact native Canvas mechanic smoke target
```

## Verification boundary

- `linux-verified`: both JSON files parse, both JavaScript modules pass
  `node --check`, required project files exist, and package bytes can be
  measured.
- `pending-devtools`: import/compile, preview/upload, real `wx.*` behavior,
  package-size accounting after DevTools compilation, and physical-device
  behavior.

Do not add or commit `project.private.config.json`; it is machine- and
account-specific.
