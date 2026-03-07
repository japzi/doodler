# Development Journal

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

## 2026-03-07 — Rotation-Independent Shadow with Configurable Angle

### Files changed
- `src/types/scene.ts` — modified (lines 38, 56, 137: `shadow` type changed from `{ offset: number }` to `{ offset: number; angle?: number }` on `RectangleShape`, `EllipseShape`, `PolygonShape`)
- `src/components/Canvas/SceneRenderer.tsx` — modified (lines 48–54: new `computeShadowOffset` helper; lines 56–100: `HatchShadow` rewritten with counter-rotated shadow offset and hatch lines)
- `src/export/svgExport.ts` — modified (lines 130–136: new `computeShadowOffset` helper; lines 138–178: `serializeShadow` rewritten with counter-rotated offset and hatch direction)
- `src/store/useStore.ts` — modified (lines 148–160: `shadowAngle` added to `loadStyles`/`persistStyles`; line 197: `shadowAngle` in `LumiDrawState`; line 259: `setShadowAngle` action; line 262: `updateObjectStyles` shadow type updated; line 291: initial state; lines 691–696: `setShadowAngle` implementation; all `persistStyles` calls updated to include `shadowAngle`)
- `src/components/Toolbar/Toolbar.tsx` — modified (lines 38–39: `shadowAngle`/`setShadowAngle` from store; lines 71–74: sync angle from selected object; line 348: shadow toggle includes angle; lines 368–389: angle slider UI)
- `TODO.md` — modified (added v0.9.8 section)

### Problem statement
Two issues with the hatched drop shadow:

1. **Shadow rotates with object:** When an object with a shadow is rotated (e.g., 90°), the shadow rotates too — a bottom-right shadow becomes bottom-left. Shadows should maintain a consistent world-space direction regardless of object rotation.

2. **Fixed shadow angle:** The shadow direction was hardcoded to 45° via `translate(offset, offset)`, with no way to configure it.

A third issue surfaced during implementation: the hatch fill lines inside the shadow also rotated with the object, breaking the visual consistency.

### Solution implementation
**Shadow data model (`scene.ts`):** Extended `shadow` from `{ offset: number }` to `{ offset: number; angle?: number }`. The `angle` is in degrees (0° = right, 90° = down, default 135° = bottom-right). Optional for backward compatibility.

**`computeShadowOffset` helper (used in both `SceneRenderer.tsx` and `svgExport.ts`):** Converts the world-space shadow angle to a local-space angle by subtracting the object's rotation, then computes directional dx/dy:
```ts
function computeShadowOffset(offset: number, shadowAngle: number, objectRotation: number) {
  const localAngle = (shadowAngle - objectRotation) * Math.PI / 180
  return {
    dx: offset * Math.cos(localAngle),
    dy: offset * Math.sin(localAngle),
  }
}
```
This counter-rotation ensures the shadow stays at the configured world-space angle even as the object rotates.

**Hatch direction fix (`SceneRenderer.tsx`, `svgExport.ts`):** The hatch lines are generated in local object space, which means they rotate with the parent `<g>` transform. To keep them at a consistent world-space angle, the hatch lines group gets a counter-rotation of `-objectRotation` around the bounding box center. To ensure coverage after rotation, hatch lines are generated for an expanded square area sized to the bounding box diagonal:
```ts
const diag = Math.sqrt(bb.width * bb.width + bb.height * bb.height)
const hatchBb = rotation !== 0
  ? { x: cx - diag / 2, y: cy - diag / 2, w: diag, h: diag }
  : { x: bb.x, y: bb.y, w: bb.width, h: bb.height }
```
The clip path trims the expanded hatch to the actual shape boundary.

**Store (`useStore.ts`):** Added `shadowAngle: number` (default 135) to state, `setShadowAngle` action, and localStorage persistence. All `persistStyles` calls updated to include the new field.

**Toolbar (`Toolbar.tsx`):** Added a 0°–360° angle slider below the offset slider when shadow is enabled. Selection sync reads `shadow.angle ?? 135` from the first selected object. The shadow toggle and offset slider pass `angle` through to `updateObjectStyles`.

### Testing/validation
- `npm run build` — passes with zero errors
- `npm test` — 80/80 tests passing
- `npm run test:e2e` — 22/22 tests passing

### Development learnings
The initial implementation only addressed the shadow offset direction (counter-rotating the `translate` transform). The user pointed out that the hatch fill lines inside the shadow also needed to maintain their world-space angle: "also fill direction should still in the same angle even after rotation" and "hatch direction". This required a second fix — wrapping the hatch lines in a counter-rotation group and expanding the hatch generation area to cover the shape after rotation. Takeaway: when counter-rotating a shadow's position, also counter-rotate the contents (hatch pattern) for full visual consistency.

## 2026-03-05 — Vitest Unit Tests and GitHub Actions CI

### Files changed
- `package.json` — modified (line 10: added `"test": "vitest run"` script; line 26: added `vitest` devDependency)
- `src/utils/__tests__/boundingBox.test.ts` — created (151 lines, 17 tests)
- `src/utils/__tests__/resize.test.ts` — created (114 lines, 6 tests)
- `src/store/__tests__/useStore.test.ts` — created (382 lines, 24 tests)
- `.github/workflows/ci.yml` — created (14 lines)

### Problem statement
The project had no automated tests or CI. Code changes relied entirely on manual verification (`npm run build` passing), making regressions easy to miss. Adding a test suite and CI pipeline ensures correctness on every push/PR.

### Solution implementation
**Vitest setup:** Installed `vitest` as a devDependency. No config file needed — Vitest reads `vite.config.ts` automatically. Added a `"test": "vitest run"` script to `package.json`.

**Bounding box tests (`boundingBox.test.ts`):** 17 tests covering all six pure functions. Key cases: `boundingBoxFromLine` normalizes lines in any direction (bottom-right to top-left); `computeBoundingBox` handles empty arrays and single points; `boxesIntersect` distinguishes overlapping, touching-edge (non-intersecting per strict `<`/`>` comparison), and contained boxes; `getWorldBounds` offsets by object position and works with groups.

**Resize tests (`resize.test.ts`):** 6 tests for `applyResize`. Rectangles verify scaling dimensions and repositioning around non-origin anchors. Lines verify endpoint scaling for horizontal and diagonal cases. Groups verify recursive child resizing with correct bounding box recomputation.

**Store tests (`useStore.test.ts`):** 24 tests exercising Zustand actions directly via `useStore.getState().action()`. Required mocking several dependencies:
```ts
vi.mock('nanoid', () => ({ nanoid: () => `id-${++idCounter}` }))
vi.mock('../../rendering/roughPath', () => ({
  generateRoughRect: () => 'mock-path',
  // ... all rough generators return static strings
}))
```
`localStorage` is mocked with an in-memory object. `nanoid` returns deterministic sequential IDs. Rough path generators and `measureTextBounds` return static values since they depend on canvas/DOM APIs unavailable in the test environment. Store state is reset in `beforeEach` to isolate tests.

Key test groups: undo/redo verifies history push/pop and selection clearing; delete verifies removal + history; duplicate verifies +10px offset, new IDs, and group child ID regeneration; copy/cut/paste verifies copy is non-destructive (no history push), cut pushes history + removes originals, paste offsets +20px with incrementing `_pasteCount`; z-order verifies `bringForward`/`sendBackward` swap adjacent and `bringToFront`/`sendToBack` move to ends; group/ungroup verifies child position adjustment and world position restoration.

**CI workflow (`.github/workflows/ci.yml`):** Runs on every push and pull request. Single job: checkout → setup Node 20 with npm cache → `npm ci` → `npm run build` (tsc + vite) → `npm test`.

### Testing/validation
- `npm test` — 47/47 tests passing (230ms total)
- `npm run build` — passes with zero TypeScript errors

### Development learnings
Initial test files had unused TypeScript imports (`SceneObject` type and `makeLine` helper) that passed `vitest run` but failed `tsc -b` during `npm run build`. The TypeScript config treats unused imports as errors (`TS6196`, `TS6133`). Removed the unused declarations to fix the build. Takeaway: always run `npm run build` after writing tests — Vitest's transpilation is more lenient than the project's `tsc` strict mode.

## 2026-03-05 — Copy, Cut, and Paste for Scene Objects

### Files changed
- `src/store/useStore.ts` — modified (lines 97–98: `_clipboard`/`_pasteCount` state; lines 141–143: action signatures; lines 207–208: defaults; lines 298–349: `copyObjects`, `cutObjects`, `pasteObjects` implementations)
- `src/components/Canvas/Canvas.tsx` — modified (lines 182–210: Ctrl/Cmd+C/X/V keyboard handlers)
- `TODO.md` — modified (line 54: added copy/cut/paste entry to v0.5)

### Problem statement
The app had Ctrl+D to duplicate objects (clone + 10px offset in one step), but no standard copy/cut/paste workflow. Users expect Ctrl+C to copy, Ctrl+X to cut, and Ctrl+V to paste — decoupling the copy step from the paste step so they can paste multiple times at increasing offsets.

### Solution implementation
**Store state (`useStore.ts:97–98, 207–208`):** Added `_clipboard: SceneObject[]` and `_pasteCount: number` to the Zustand store. The clipboard holds deep-cloned objects with their original IDs/positions. `_pasteCount` tracks successive pastes to increment the offset.

**`copyObjects` (`useStore.ts:298–307`):** Deep-clones selected objects into `_clipboard`, resets `_pasteCount` to 0. No history snapshot — copying is non-destructive and shouldn't be undoable.

**`cutObjects` (`useStore.ts:309–325`):** Copies to clipboard (same deep-clone) then deletes originals from `objects`. Pushes a history snapshot so Ctrl+Z restores the cut objects.

**`pasteObjects` (`useStore.ts:327–349`):** Clones from clipboard with new IDs and incremental offset:
```ts
const offset = (state._pasteCount + 1) * 20
const clones: SceneObject[] = state._clipboard.map((obj) => {
  const clone = structuredClone(obj)
  clone.id = generateId()
  clone.position = { x: clone.position.x + offset, y: clone.position.y + offset }
  if (clone.type === 'group') {
    clone.children = clone.children.map((child: SceneObject) => ({
      ...child,
      id: generateId(),
    }))
  }
  return clone
})
```
First paste offsets +20px, second +40px, etc. Group children get new IDs to preserve structure without ID collisions. Pushes a history snapshot and selects the pasted objects.

**Keyboard handlers (`Canvas.tsx:182–210`):** Added `case 'c'`/`'x'`/`'v'` inside the existing `hasModifier` switch block, following the same pattern as the Ctrl+D handler — `e.preventDefault()`, read state, call action if applicable. The Ctrl+V handler checks `_clipboard.length > 0` before calling `pasteObjects()`.

### Design decisions
- **Clipboard stores original positions:** The offset is computed at paste time from `_pasteCount`, not baked into the clipboard. This keeps successive pastes relative to the original position rather than cascading.
- **`_pasteCount` resets on copy/cut:** Each new copy or cut starts a fresh offset sequence so the first paste is always +20px from the source.
- **Reuses `duplicateObjects` patterns:** Group child ID regeneration, `structuredClone`, `generateId`, history snapshot — all follow the existing duplicate implementation for consistency.

### Testing/validation
- `npm run build` passes (tsc + vite build) with zero errors

### Development learnings
None — implementation followed the plan directly with no corrections needed.

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
