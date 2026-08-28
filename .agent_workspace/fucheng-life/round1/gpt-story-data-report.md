# Round 1 Story Data Report

## Output

Created `games/fucheng-life/data/story.json` as the UI-facing narrative data source for 《浮城人生》.

The dataset contains:

- 7 eras (`E1`–`E7`)
- 10 character origins
- 5 city layers (`L1`–`L5`)
- 10 sample urban events
- 6 interface taglines
- 10 loading tips

## Source and tone

The content expands `.agent_workspace/fucheng-life/STORY_EXTRACT.md`. It preserves the source vocabulary—霓虹、潮汐、账单、人情、地铁、城中村、玻璃幕墙—and follows its requested voice: calm, poetic, realistic, and concise. The event copy avoids power-fantasy framing; the city continues operating whether or not the player succeeds.

The era years are narrative anchors for selection-screen context, not claims that each social period has an exact historical boundary.

## Data contract

All collections use stable string IDs:

- Eras: `E1`–`E7`
- City layers: `L1`–`L5`
- Events: `EV01`–`EV10`
- Origins: readable kebab-case IDs

Each era provides `name`, `yearAnchor`, `tagline`, and one hex `color`.

Each origin provides `name`, `description`, and a complete `statModifiers` object. The five modifier dimensions are:

| Stat | Meaning |
| --- | --- |
| `money` | Starting economic resources |
| `education` | Educational access and preparation |
| `connections` | Starting social network |
| `stability` | Strength of the character's safety net |
| `resilience` | Capacity to absorb setbacks |

Modifier values run from `-3` (severe disadvantage) through `0` (neutral) to `3` (strong advantage). Every origin includes every dimension, which lets UI code render comparison bars without filling missing values.

Each city layer provides `description`, `unlockLevel`, and one hex `color`. Unlock levels increase monotonically (`1`, `3`, `6`, `10`, `15`) so the map can communicate progression while keeping all five districts visible.

Each sample event provides a title, layer reference, category, and short narrative text. `layerId` values reference existing city-layer IDs.

Interface copy is grouped under `uiCopy.taglines` and `uiCopy.loadingTips`.

## Implementation notes

- JSON is UTF-8 and keeps Chinese copy unescaped for editing.
- Colors are single accessible data tokens rather than CSS gradients; the UI can derive glow, alpha, and gradients from them.
- No event outcomes were added in Round 1, so gameplay balancing remains separate from presentation copy.
- The file has no runtime or package dependency and can be loaded directly with `fetch("./data/story.json")`.

## Validation

The JSON was syntax-checked after creation. Collection counts, unique IDs, layer references, color format, origin modifier completeness, and increasing unlock levels were also verified.
