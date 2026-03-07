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
