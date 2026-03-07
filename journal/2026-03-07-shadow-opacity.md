# 2026-03-07 — Shadow Opacity Linked to Fill Opacity

## Files modified
- `src/components/Canvas/SceneRenderer.tsx` — modified (line 91: added `const shadowOpacity = opacity * opacity * opacity`; line 94: shadow `<g>` uses `shadowOpacity` instead of raw `opacity`)
- `src/export/svgExport.ts` — modified (line 176: added `const shadowOpacity = opacity * opacity * opacity`; line 177: `opacityAttr` uses `shadowOpacity`)

## Problem statement
Hatched drop shadows had no opacity — they stayed fully opaque even when the object's fill opacity was reduced. The user wanted the shadow to fade along with the fill, and to fade faster than the fill itself so it disappears before the shape becomes fully transparent.

## Solution implementation
Applied `opacity³` (cubic curve) to the shadow group. The object's fill opacity is cubed and set as the SVG `opacity` attribute on the shadow's wrapping `<g>` element:

```ts
const shadowOpacity = opacity * opacity * opacity
```

Effect at various fill opacities:
| Fill opacity | Shadow opacity |
|---|---|
| 1.0 | 1.0 |
| 0.7 | 0.34 |
| 0.5 | 0.125 |
| 0.3 | 0.027 |

The cubic curve was chosen after iterating — the user first requested the shadow track fill opacity (linear), then asked for it to go faster (squared), then asked for cubic.

Applied in both the canvas renderer (`HatchShadow` component) and SVG export (`serializeShadow` function) so exported files match the on-screen appearance.

## Testing/validation
- `npm run build` — passes
- `npm test` — 92/92 unit tests passing

## Development learnings
- **Iterate on curves with the user.** The first implementation used linear opacity (shadow = fill opacity). The user asked to "make shadow opacity go faster", so it was changed to `opacity²`. The user then said "make it cube", so it became `opacity³`. When mapping one visual property to another, start simple and let the user tune the curve interactively rather than guessing the right exponent upfront.
