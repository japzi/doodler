# 2026-03-07 — Pen Tool Stroke Width Support

## Files modified
- `src/rendering/sketchyPath.ts` — modified (line 4: removed hardcoded `size: 6` from `STROKE_OPTIONS`; line 10: `generateStrokePathData` signature changed from `(points: Point[])` to `(points: Point[], size = 6)`; line 14: spread `{ ...STROKE_OPTIONS, size }` into `getStroke()` call)
- `src/tools/usePenTool.ts` — modified (line 35: `generateStrokePathData(activeStrokePoints)` → `generateStrokePathData(activeStrokePoints, strokeWidth * 3)`)
- `src/components/Canvas/ActiveStrokeRenderer.tsx` — modified (line 7: added `const strokeWidth = useStore((s) => s.strokeWidth)`; line 11: `generateStrokePathData(activeStrokePoints)` → `generateStrokePathData(activeStrokePoints, strokeWidth * 3)`)
- `src/utils/resize.ts` — modified (line 230: `generateStrokePathData(localPoints)` → `generateStrokePathData(localPoints, (obj.strokeWidth ?? 2) * 3)`)
- `src/store/useStore.ts` — modified (line 8: added `import { generateStrokePathData } from '../rendering/sketchyPath'`; lines 725–728: in `updateObjectStyles`, after setting `strokeWidth` on pen objects, regenerates `pathData` via `generateStrokePathData(o.points, styles.strokeWidth * 3)`)

## Problem statement
The pen tool generates variable-width strokes via the `perfect-freehand` library, but the stroke width dropdown in the toolbar had no visual effect on pen strokes. The `size: 6` was hardcoded in `STROKE_OPTIONS`. The `strokeWidth` property was stored on pen objects but never used during rendering — pen strokes are rendered as filled SVG paths (not stroked), so the SVG `strokeWidth` attribute is irrelevant. Changing the dropdown only updated the stored property without regenerating the path geometry.

## Solution implementation
**Mapping formula:** `perfect-freehand size = strokeWidth × 3`. This means the default `strokeWidth=2` produces `size=6`, exactly matching the previous hardcoded value — zero visual regression for existing drawings.

**Core change (`sketchyPath.ts`):** Moved `size` out of the static `STROKE_OPTIONS` object and into a function parameter with a default of `6`:
```ts
export function generateStrokePathData(points: Point[], size = 6): string {
  const strokePoints = getStroke(
    points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
    { ...STROKE_OPTIONS, size }
  )
```

**Five call sites updated:**
1. **New stroke creation (`usePenTool.ts`)** — passes `strokeWidth * 3` when finalizing a pen stroke on pointer up
2. **Live preview (`ActiveStrokeRenderer.tsx`)** — reads `strokeWidth` from store and passes `strokeWidth * 3` so the preview matches the final stroke
3. **Resize (`resize.ts`)** — passes `(obj.strokeWidth ?? 2) * 3` to preserve stroke thickness when resizing pen objects
4. **Style update (`useStore.ts`)** — when `updateObjectStyles` sets a new `strokeWidth` on a pen object, it regenerates `pathData` so existing strokes update immediately when the user changes the dropdown

## Testing/validation
- `npm run build` — passes (zero TypeScript errors)
- `npm test` — 92/92 unit tests passing (no regressions)

## Development learnings
None — implementation followed the plan without corrections.
