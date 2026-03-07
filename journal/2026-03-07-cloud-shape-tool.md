## 2026-03-07 — Cloud Shape Tool

### Files changed
- `src/types/scene.ts` — modified (lines 28–45: new `CloudShape` interface; line 180: added to `SceneObject` union; lines 188–190: added `'cloud'` to `ToolType` and `ShapeToolType`)
- `src/rendering/roughPath.ts` — modified (lines 72–90: new `generateCloudOutlinePath` function; lines 92–95: new `generateRoughCloud` wrapping outline through roughjs)
- `src/tools/useShapeTool.ts` — modified (line 5: import `generateRoughCloud`; line 40: added `'cloud'` to rect/ellipse branch; lines 105–115: new `case 'cloud'` in `onPointerUp`)
- `src/components/Canvas/Canvas.tsx` — modified (line 20: added `'cloud'` to `shapeTools` Set; lines 277–279: `C` keyboard shortcut)
- `src/components/Canvas/ActiveShapeRenderer.tsx` — modified (line 11: added `'cloud'` to `showFill` check; lines 37–50: new `case 'cloud'` with dashed-rect preview)
- `src/components/Canvas/SceneRenderer.tsx` — modified (line 2: imported `CloudShape`; line 4: imported `generateCloudOutlinePath`; line 56: `HatchShadow` type union; lines 84–86: cloud clip uses `<path>` from outline; lines 119–121: `FillShape` uses cloud outline path; added `'cloud'` to all `hasFill`/`hasShadow` checks and cast types)
- `src/components/Toolbar/Toolbar.tsx` — modified (line 57: `selectedHasFill`; line 70: shadow sync; line 182: `isShapeTool`; lines 293–303: cloud button with SVG icon; lines 310, 334, 353: fill/opacity/shadow conditionals)
- `src/utils/resize.ts` — modified (line 2: import `generateRoughCloud`; lines 72–88: new `case 'cloud'`)
- `src/export/svgExport.ts` — modified (line 1: imported `CloudShape`; line 2: imported `generateCloudOutlinePath`; lines 101, 138: added `'cloud'` to shadow bounds check; lines 160–162: cloud shadow clip uses outline `<path>`; lines 210–212: cloud fill uses outline `<path>`; lines 203, 207: added `'cloud'` to shadow/fill conditionals)
- `src/store/useStore.ts` — modified (lines 732–733: added `'cloud'` to `fillColor` and `shadow` update checks)

### Problem statement
The app had rectangle, ellipse, and polygon as filled shape tools but no cloud/thought-bubble shape — a common element in sketchy diagrams and storyboards. Adding cloud as a first-class shape tool with full feature parity (fill, stroke, opacity, shadow, resize, export) extends the shape vocabulary without requiring a new tool paradigm.

### Solution implementation
**Cloud path geometry (`roughPath.ts:72–94`):** Built from 7 cubic bezier curves — 3 bumps across the top, rounded bulges on each side, and a flat-ish bottom. All control points are expressed as proportions of width/height so the shape scales naturally:
```ts
const path = [
  `M ${x + w * 0.15} ${y + h * 0.85}`,
  // Bottom (flat-ish, slight upward curve)
  `C ${x + w * 0.25} ${y + h * 0.95}, ${x + w * 0.75} ${y + h * 0.95}, ${x + w * 0.85} ${y + h * 0.85}`,
  // Right side
  `C ${x + w * 1.05} ${y + h * 0.75}, ${x + w * 1.05} ${y + h * 0.45}, ${x + w * 0.85} ${y + h * 0.35}`,
  // Top bumps (right, center, left)
  `C ${x + w * 0.95} ${y + h * 0.1}, ${x + w * 0.75} ${y - h * 0.02}, ${x + w * 0.6} ${y + h * 0.12}`,
  `C ${x + w * 0.55} ${y - h * 0.05}, ${x + w * 0.35} ${y - h * 0.05}, ${x + w * 0.3} ${y + h * 0.15}`,
  `C ${x + w * 0.15} ${y + h * 0.0}, ${x - w * 0.05} ${y + h * 0.15}, ${x + w * 0.05} ${y + h * 0.35}`,
  // Left side
  `C ${x - w * 0.08} ${y + h * 0.5}, ${x - w * 0.05} ${y + h * 0.75}, ${x + w * 0.15} ${y + h * 0.85}`,
  'Z',
].join(' ')
const drawable = generator.path(path, defaultOptions)
```
Passed to roughjs `generator.path()` to get the sketchy hand-drawn rendering. Control points slightly exceed the bounding box (e.g. `w * 1.05`, `w * -0.08`) to create natural-looking bulges.

**Two-path architecture (`roughPath.ts:72–94`):** The cloud path was split into two functions — `generateCloudOutlinePath()` returns the clean bezier path string, and `generateRoughCloud()` passes it through roughjs. The clean path is used for fill and shadow clip shapes, while the roughjs output is used for the visible stroke. This separation was needed because roughjs `generator.path()` produces multiple disconnected sketchy sub-paths — filling the roughjs output fills individual arc segments rather than the whole cloud interior.

**Integration pattern:** Cloud follows the rectangle pattern across all 10 files — same `CloudShape` interface structure (x, y, width, height, fillColor, shadow), same click-drag interaction in `useShapeTool`, same dashed-rect preview in `ActiveShapeRenderer`. Fill and shadow clip use `generateCloudOutlinePath()` to render a `<path>` matching the cloud boundary (not a `<rect>` like rectangle).

**Toolbar (`Toolbar.tsx:293–303`):** Cloud button placed after polygon with a standard cloud SVG icon. Added `'cloud'` to all four conditional blocks that gate fill picker, opacity slider, and shadow controls.

### Testing/validation
- `npm run build` — passes with zero errors
- `npm test` — 92/92 tests passing
- Cloud tool accessible via toolbar button and `C` keyboard shortcut

### Development learnings
The initial implementation reused rectangle's `<rect>` element for fill and shadow clipping. The user reported: "the cloud filling is incorrect. Instead of filling the entire thing it fills only arcs." The root cause: roughjs `generator.path()` outputs multiple disconnected sketchy sub-paths, so using `obj.pathData` as a fill path fills each arc segment individually rather than the cloud interior. The fix was to split path generation into `generateCloudOutlinePath()` (clean bezier) and `generateRoughCloud()` (roughjs sketchy), using the clean path for fill/clip and the rough path for stroke. Takeaway: roughjs output paths are not suitable for SVG fill — always maintain a separate clean geometry path for shapes that need filling.
