Model slug: gpt-5.6-sol

# Round 2 effects merge report

## Delivered

- Added `css/fc-tokens.css` as the shared token source for the shell, core
  screens, and effects gallery. It exposes the architecture `--fc-*` tokens
  plus compatibility aliases for Round 1 selectors.
- Canonicalized the brand cyan to `--fc-neon-cyan` / `--neon-cyan:
  #4FE3FF`, including CSS glow RGB values, the shell canvas palette, favicons,
  and gallery examples.
- Added `css/fc-ui.css` with compact reusable `.fc-neon-title` /
  `.neon-title` styling and three `.fc-glass-panel--1..3` /
  `.glass-panel--1..3` elevation tiers.
- Added `js/fc-ui.js` with an opt-in particle canvas. The dashboard requests
  84 particles (hard-clamped to 120), renders at 30 fps, caps DPR at 1.5,
  pauses while the tab is hidden, and becomes static under
  `prefers-reduced-motion`.
- Reused the concurrently delivered `FCMotion.countUp` helper on dashboard
  money and stat values instead of shipping a second count-up implementation.
- Linked the token and visual utility styles from the main entry, all five
  screen pages, and `effects/demo.html`. The particle runtime loads only on
  the dashboard; the main menu keeps its existing `app.js` lifecycle.

## Gallery compatibility

`effects/demo.html` still owns its gallery layout and behavior through
`effects.css` / `effects.js`; it now consumes the shared palette before those
files. Layer transition colors and canvas cyan were updated to the canonical
architecture values.

## Verification

- `git diff --check`
- JavaScript syntax checks for `app.js`, `fc-ui.js`, and effects scripts
- HTTP smoke checks for the entry, five screens, shared assets, and effects
  gallery
- Browser smoke at desktop and 390px, including reduced-motion and dashboard
  visibility-pause checks
