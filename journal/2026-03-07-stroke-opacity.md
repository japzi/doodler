## 2026-03-07 — Separate Fill Opacity and Stroke Opacity

### Files changed
- `src/types/scene.ts` — modified (+7 lines: added `strokeOpacity?: number` to `PenStroke`, `RectangleShape`, `EllipseShape`, `CloudShape`, `LineShape`, `ArrowShape`, `PolygonShape`)
- `src/store/useStore.ts` — modified (+45/-13: `strokeOpacity` state + `setStrokeOpacity` action + localStorage persistence; `updateObjectStyles` applies `strokeOpacity` to non-text/non-image types; all `persistStyles` calls updated)
- `src/components/Toolbar/Toolbar.tsx` — modified (+36/-5: stroke opacity slider; rearranged layout: stroke color → stroke width → stroke opacity → fill color → fill opacity; selection sync reads `strokeOpacity`)
- `src/components/Canvas/SceneRenderer.tsx` — modified (+14/-3: `PathElement` and `ChildPathElement` apply `strokeOpacity` on stroke/pen paths; `HatchShadow` applies `strokeOpacity` to shadow outline stroke, hatch fill retains `opacity³`)
- `src/export/svgExport.ts` — modified (+20/-5: `serializeObject` adds `opacity` attr on stroke paths when `strokeOpacity < 1`; pen paths get opacity attr; `serializeShadow` applies `strokeOpacity` to outline, `opacity³` to hatch clip group)
- `src/tools/useShapeTool.ts` — modified (+12/-5: reads `strokeOpacity` from store, passes to all created shape objects)
- `src/tools/usePenTool.ts` — modified (+3/-1: reads `strokeOpacity` from store, passes to created pen strokes)

### Problem statement
The app had a single `opacity` field per object that only applied to fills — strokes always rendered at full opacity. Users needed independent control over stroke opacity so they could, e.g., fade a rectangle's outline while keeping its fill solid, or make a pen stroke semi-transparent.

### Solution implementation
**Type layer (`scene.ts`):** Added `strokeOpacity?: number` to all 7 drawable object types (PenStroke, Rectangle, Ellipse, Cloud, Line, Arrow, Polygon). Text and Image don't need it — text has no stroke, images use whole-object opacity.

**Store (`useStore.ts`):** Added `strokeOpacity: number` (default 1) to state and `setStrokeOpacity` action. Extended `loadStyles`/`persistStyles` to include `strokeOpacity` in localStorage. In `updateObjectStyles`, `strokeOpacity` is applied to all non-text/non-image types:
```ts
if (styles.strokeOpacity !== undefined && o.type !== 'text' && o.type !== 'image') updated.strokeOpacity = styles.strokeOpacity
```

**Renderer (`SceneRenderer.tsx`):** In `PathElement` and `ChildPathElement`, the stroke `<path>` gets `opacity={strokeOpacity}` when `strokeOpacity !== 1`. For pen strokes (which use `fill` not `stroke`), the same opacity is applied to the pen fill path. `HatchShadow` was restructured — the hatch clip group gets `opacity={shadowOpacity}` (fill opacity³) while the shadow outline stroke gets `opacity={strokeOpacity}`:
```tsx
<g clipPath={`url(#${clipId})`} opacity={shadowOpacity !== 1 ? shadowOpacity : undefined}>
  {/* hatch lines */}
</g>
<path d={obj.pathData} ... opacity={strokeOpacity !== 1 ? strokeOpacity : undefined} />
```

**SVG export (`svgExport.ts`):** Same pattern — stroke paths get `opacity` attribute when `strokeOpacity < 1`. Shadow serialization applies `strokeOpacity` to the outline `<path>` and `opacity³` to the hatch `<g clip-path>`.

**Toolbar layout (`Toolbar.tsx`):** Per user request, rearranged controls: stroke color → stroke width dropdown → stroke opacity slider → fill color → fill opacity slider. Stroke opacity slider shows for pen tool, all shape tools, and pointer with stroke-capable selections. Selection sync reads `strokeOpacity` from the first selected object.

### Testing/validation
- `npm run build` — passes with zero errors
- `npm test` — 92/92 tests passing

### Development learnings
The initial implementation missed adding `strokeOpacity: state.strokeOpacity` to one of the 14 `persistStyles` call sites (`setArrowHeadSize`), because the bulk replace pattern `opacity: state.opacity, fontSize` didn't match the variant where `arrowHeadSize: size` broke the expected token sequence. The TypeScript compiler caught it (`TS2345: Property 'strokeOpacity' is missing`). Takeaway: when a store has many setter functions that each build an inline styles object, missing one during a bulk update is easy — the compiler is the safety net, always build after bulk edits.

The user also requested a toolbar layout change mid-implementation: "move drop down next to the stroke. and have an opacity control next to it. then fill color, fill opacity" — reordering from (stroke color, fill color, stroke width, fill opacity) to (stroke color, stroke width, stroke opacity, fill color, fill opacity). This was incorporated into the toolbar edit.
