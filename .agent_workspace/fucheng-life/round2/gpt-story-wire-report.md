# Story data wiring report

## Result

`games/fucheng-life/data/story.json` is now the single source for era, origin, city-layer, sample-event, and shared UI-copy data. `js/story-loader.js` publishes the normalized runtime shape as:

```js
FC.story = {
  eras: [],
  origins: [],
  layers: [],
  events: [],
  uiCopy: {}
};
```

`FC.ready` resolves after loading and schema validation. The four core screens show a loading state and initialize only after that promise resolves.

## Schema mapping

`story-loader.js` normalizes top-level source names without changing records:

| JSON field | `FC.story` field |
|---|---|
| `eras` | `eras` |
| `origins` | `origins` |
| `cityLayers` | `layers` |
| `sampleEvents` | `events` |
| `uiCopy` | `uiCopy` |

`screens.js` contains presentation adapters, not content collections:

- Era: `color → tint`, `description → desc`, `tagline → line`, `yearLabel → years`, and numeric `start.money` → formatted currency.
- Origin: `description → desc`, `tagline → line`, `englishName → en`, `uiStats.education → mods.edu`, and numeric `startMoney` → formatted currency.
- Layer: derives the CSS key (`L1 → l1`) when `key` is absent.
- `FC.EVENTS` and `FC.uiCopy` are compatibility aliases over `FC.story.events` and `FC.story.uiCopy`.

The JSON was extended with the presentation and simulation fields previously embedded in `screens.js`. This preserves the existing dashboard balance while removing the duplicate `ERAS` and `ORIGINS` arrays.

### Save compatibility

`SAVE_KEY` remains exactly `fucheng.save.v1`. Existing origin saves use `O01`–`O10`, while the story schema uses stable descriptive IDs such as `ordinary-worker`. Each origin now has `legacyId`; the adapter keeps that value as the screen/save ID and exposes the JSON ID as `storyId`. Existing run keys and saved simulations therefore remain valid.

## Screen integration

- `era-select.html` and `origin-select.html` render their cards after `FC.ready`.
- `city-map.html` gets layer names, descriptions, keys, and legend entries from loaded layer records; zone mechanics remain local screen configuration.
- `dashboard.html` gets era/origin starting data and layer descriptions from loaded records. Tick, billing, and persistence logic are unchanged.
- The main game entry also loads the story module before `screens.js`, so continue-save labels still resolve to human-readable names.

## `file://` strategy

For HTTP(S), the loader uses asynchronous `fetch` with `cache: "no-store"`. For `file://`, it attempts a synchronous `XMLHttpRequest` for `data/story.json`, accepting status `0`, before screen initialization. The URL is resolved from `story-loader.js` itself, so both the game root and nested `screens/` pages target the same `games/fucheng-life/data/story.json`.

Some Chromium security configurations block all `file://` XHR between local files. That browser policy cannot be bypassed without duplicating the JSON in JavaScript, which would violate the single-source requirement. In that case the screen displays an explicit load error; serving the repository with `python3 -m http.server` is the portable path.
