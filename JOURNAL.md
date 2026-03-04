# Development Journal

## 2026-03-04 — Hatched Drop Shadow for Rectangles & Ellipses

### Files changed
- `src/types/scene.ts` — modified (lines 37, 54: added `shadow` property)
- `src/rendering/roughPath.ts` — modified (lines 65–84: new `generateRoughHatchLines` function)
- `src/store/useStore.ts` — modified (lines 66–78, 102–103, 153–154, 175–176, 490–498, 518–522: shadow state, setters, persistence, `updateObjectStyles`)
- `src/tools/useShapeTool.ts` — modified (lines 67, 87, 100: read shadow state and apply to new shapes)
- `src/components/Canvas/SceneRenderer.tsx` — modified (lines 4, 30–56, 75, 85, 103, 146, 152, 161: `HatchShadow` component, integration into `PathElement`/`ChildPathElement`)
- `src/export/svgExport.ts` — modified (lines 2, 34–38, 42–61, 80–81, 92, 95–96: `serializeShadow` helper, bounding box expansion)
- `src/components/Toolbar/Toolbar.tsx` — modified (lines 22–25, 49–51, 238–275: shadow toggle button, offset slider, selection sync)
- `TODO.md` — modified (added v0.9.1 section)

### Problem statement
Users wanted a hand-drawn shadow effect behind rectangles and ellipses — a duplicate of the shape rendered behind it, offset down-right, filled with diagonal hatching using the object's stroke color. The hatching needed to match the app's sketchy/rough aesthetic rather than using clean geometric lines.

### Solution implementation
**Type layer (`scene.ts:37, 54`):** Added `shadow?: { offset: number }` to `RectangleShape` and `EllipseShape` interfaces. Kept it optional so existing shapes are unaffected.

**Rough hatch generator (`roughPath.ts:65–84`):** New `generateRoughHatchLines` function generates diagonal (/) lines across a bounding box using roughjs with deterministic seeds per line to avoid jitter on re-render:
```ts
export function generateRoughHatchLines(x: number, y: number, w: number, h: number, spacing = 8): string[] {
  const step = spacing * Math.SQRT2
  const maxC = w + h
  const paths: string[] = []
  for (let c = step, i = 0; c < maxC; c += step, i++) {
    const x1 = c <= h ? x : x + (c - h)
    const y1 = c <= h ? y + c : y + h
    const x2 = c <= w ? x + c : x + w
    const y2 = c <= w ? y : y + (c - w)
    const drawable = generator.line(x1, y1, x2, y2, {
      ...defaultOptions, strokeWidth: 1.5, seed: 42 + i,
    })
    paths.push(drawableToPaths(drawable))
  }
  return paths
}
```
The perpendicular spacing is `spacing * sqrt(2)` to account for the 45° angle. Each line gets `seed: 42 + i` for stable output across renders.

**Renderer (`SceneRenderer.tsx:30–56`):** `HatchShadow` component wraps the hatch lines in a `<clipPath>` using the actual shape geometry (rect for rectangles, ellipse element for ellipses), so the rough lines are clipped to the shape boundary. The shadow is rendered as a translated `<g>` placed before the fill/stroke layers so it appears behind the main shape.

**SVG export (`svgExport.ts:42–61`):** `serializeShadow` produces the same structure — `<clipPath>` + rough hatch paths + outline stroke — as serialized SVG strings. Bounding box computation (line 34–38) accounts for shadow offset so the viewBox includes the full shadow extent.

**Store (`useStore.ts`):** `shadowEnabled` and `shadowOffset` global state with localStorage persistence. `updateObjectStyles` extended to accept `shadow?: { offset: number } | null` — `null` removes the shadow, an object sets it. Only applied to rectangle/ellipse types.

**Toolbar (`Toolbar.tsx:238–275`):** Shadow toggle button and offset slider (2–20px) shown for rectangle/ellipse tools or when selected shapes include fill-capable types. Selection sync (lines 49–51) reads shadow state from the first selected object.

### Testing/validation
- `npm run build` passes (tsc + vite build) with zero errors
- Build output: 299KB JS bundle (up from 298KB — minimal size increase from the hatch generator)

### Development learnings
The initial implementation used clean SVG `<pattern>` elements with straight geometric lines for the hatching. The user corrected this: "the hash should be rough lines as well, parallel." This led to replacing the pattern-based approach with `generateRoughHatchLines` using roughjs + `<clipPath>`, matching the app's hand-drawn aesthetic. Key takeaway: all visual elements in this app should go through roughjs — don't mix clean SVG primitives with the sketchy style.

## 2026-03-03 — Match Size Feature

### Files changed
- `src/store/useStore.ts` — modified (lines 5, 61, 166–184)
- `src/components/Canvas/SelectionActionBar.tsx` — created (55 lines)
- `src/components/Canvas/SelectionActionBar.css` — created (31 lines)
- `src/components/Canvas/Canvas.tsx` — modified (lines 9, 250)
- `TODO.md` — modified (lines 62–69)

### Problem statement
When multiple objects are selected on the canvas, there's no way to make them the same size. Users working with diagrams frequently need to align dimensions across shapes — e.g. making all boxes the same width for a flowchart. The feature needed a discoverable UI that appears contextually.

### Solution implementation
**Store action (`matchSize`):** Added to the Zustand store at `useStore.ts:166–184`. It takes a set of selected IDs and a mode (`'width'`, `'height'`, or `'both'`). The first object in the `objects` array whose ID is in the set becomes the size reference. For each other selected object, it computes world bounds via `getWorldBounds()`, derives scale factors relative to the reference dimensions, and calls the existing `applyResize()` with the object's center as the anchor so the object scales in place without drifting.

Key logic:
```ts
const sx = mode === 'height' ? 1 : refBounds.width / objBounds.width
const sy = mode === 'width' ? 1 : refBounds.height / objBounds.height
return applyResize(o, { x: cx, y: cy }, sx, sy)
```

Objects with zero width or height are skipped to avoid division by zero.

**Floating action bar (`SelectionActionBar.tsx`):** A `position: fixed` HTML div that renders outside the SVG (same pattern as `TextInputOverlay`). It subscribes to `selectedIds`, `objects`, and `viewport` from the store, only renders when 2+ objects are selected, computes the selection bounding box in world space (same loop pattern as `SelectionOverlay.tsx:17–30`), then converts the bottom-center to screen coordinates. Uses `transform: translateX(-50%)` for horizontal centering. `onPointerDown` calls `stopPropagation()` to prevent clicks from deselecting objects.

**Canvas integration (`Canvas.tsx:9, 250`):** Simply imported and rendered `<SelectionActionBar />` alongside `<TextInputOverlay />` in the fragment after the SVG element.

### Design decisions
- **Reference object = first in z-order:** Using `objects.find()` means the lowest object in the z-stack among the selection is the reference. This is deterministic and matches the convention used elsewhere (e.g. `duplicateObjects` iterates `objects` in array order).
- **Center anchor for resize:** Each object scales around its own center so its visual position stays stable. This felt more natural than scaling around a shared anchor which would cause objects to shift.
- **HTML overlay vs SVG:** The action bar is an HTML element rather than SVG so it doesn't scale/pan with the canvas and button interactions work normally.

### Testing/validation
- `npm run build` passes with zero errors (tsc + vite build)
- Verified the TypeScript interface, store action, and component all type-check correctly

### Development learnings
None — implementation went smoothly with no corrections needed. The existing `applyResize` and `getWorldBounds` utilities covered all object types out of the box, so no new resize logic was required.
