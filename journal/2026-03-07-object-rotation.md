# 2026-03-07 — Object Rotation

## Files changed
- `src/types/scene.ts` — modified (added `rotation?: number` to all 9 interfaces: `PenStroke` line 23, `RectangleShape` line 39, `EllipseShape` line 56, `LineShape` line 73, `ArrowShape` line 90, `TextObject` line 107, `ImageObject` line 121, `PolygonShape` line 134, `GroupObject` line 141)
- `src/components/Canvas/SceneRenderer.tsx` — modified (lines 9–19: new `buildTransform()` helper; all `translate(...)` transform strings replaced with `buildTransform(obj)` in `TextElement`, `PathElement`, `ImageElement`, `ChildTextElement`, `ChildPathElement`, `ChildImageElement`, `renderGroupChild`, `GroupElement`)
- `src/components/Canvas/SelectionOverlay.tsx` — modified (line 3: `getRotatedBounds` import; lines 5–40: new `RotateHandle` component with curved-arrow icon; lines 54–56: rotation stem + handle added to polygon branch; lines 136–146: polygon overlay wraps in `<g rotate()>` when rotated; lines 161–190: rotation handle added to line/arrow branch; lines 287–297: line/arrow overlay wraps in `<g rotate()>` when rotated; lines 382–413: rotation handle in bounding-box branch; lines 438–447: bounding-box overlay wraps in `<g rotate()>` when rotated; multi-selection uses `getRotatedBounds()` for combined bounds)
- `src/tools/usePointerTool.ts` — modified (line 7: rotation utility imports; lines 51–55: rotation refs `isRotating`, `rotateStartAngle`, `rotateCenter`, `rotateSnapshots`, `rotateTargetIds`; lines 63–97: `data-rotate-handle` detection in `onPointerDown` — computes center, initial angle, stores snapshots; lines 244–256: rotation drag in `onPointerMove` — delta angle, `snapAngle()`, `rotateObjects()`; lines 328–342: un-rotate cursor for resize of single rotated objects; lines 382–386: rotation cleanup in `onPointerUp`; line 419: marquee uses `getRotatedBounds()` for rotated objects)
- `src/store/useStore.ts` — modified (line 268: `rotateObjects` in interface; lines 856–863: `rotateObjects` implementation — maps `angleMap` onto objects; lines 879–880: `ungroupObjects` composes group rotation onto children via `(child.rotation ?? 0) + groupRotation`)
- `src/export/svgExport.ts` — modified (line 4: `rotatePoint` import; lines 77–88: new `buildExportTransform()` helper with rotation; lines 102–117: `computeWorldBoundsRecursive` rotates 4 corners for rotated objects; lines 137–139: `serializeImageObject` uses `buildExportTransform`; line 145: `serializeObject` uses `buildExportTransform`; line 188: `serializeGroupObject` uses `buildExportTransform`; line 197: `serializeTextObject` uses `buildExportTransform`)
- `src/components/Canvas/SelectionActionBar.tsx` — modified (line 3: `getRotatedBounds` import; lines 19–24: bounds loop uses `getRotatedBounds()` for correct action bar positioning)
- `src/components/Canvas/TextInputOverlay.tsx` — modified (line 36: reads `rotation` from editing object; line 151: applies CSS `transform: rotate(Xdeg)` + `transformOrigin: 'top left'` to textarea)

## Files created
- `src/utils/rotation.ts` — rotation utilities (71 lines): `rotatePoint()`, `snapAngle()`, `getRotatedBounds()`, `getLocalCenter()`

## Problem statement
Users had no way to rotate objects on the canvas. All objects only had position and bounding box — no rotation angle. This meant diagrams requiring angled elements (tilted text, rotated shapes, diagonal arrows) required workarounds or couldn't be created at all.

## Solution implementation
**Data model:** Added `rotation?: number` (degrees, optional defaulting to 0) to all 9 object interfaces. Optional means zero storage/serialization overhead for unrotated objects, and `structuredClone` in copy/paste/undo automatically preserves it.

**Rotation utilities (`rotation.ts`):** Four pure functions:
```ts
// Core rotation math used by rendering, interaction, and export
export function rotatePoint(px, py, cx, cy, angleDeg): { x, y }

// Snaps to 0/45/90/135/180/225/270/315° when within 5° threshold
export function snapAngle(angleDeg, threshold = 5): number

// AABB of rotated bounding box — for marquee, action bar, multi-select
export function getRotatedBounds(obj: SceneObject): BoundingBox
```

**Rendering (`SceneRenderer.tsx`):** A single `buildTransform(obj)` helper generates the SVG `transform` attribute. For unrotated objects it returns `translate(tx, ty)`. For rotated objects: `translate(tx, ty) rotate(angle, cx, cy)` where cx/cy is the local center of the bounding box. This was applied to all 8 render functions by replacing hardcoded `translate(...)` strings.

**Interaction (`usePointerTool.ts`):** Rotation drag uses angle-from-center math:
```ts
// onPointerDown: compute initial angle from bbox center to cursor
rotateStartAngle.current = Math.atan2(scenePoint.y - cy, scenePoint.x - cx) * 180 / Math.PI

// onPointerMove: delta angle → snap → apply
const currentAngle = Math.atan2(scenePoint.y - cy, scenePoint.x - cx) * 180 / Math.PI
const delta = currentAngle - rotateStartAngle.current
angleMap.set(id, snapAngle(origRotation + delta))
useStore.getState().rotateObjects(angleMap)
```

For resize of rotated objects, the cursor position is un-rotated around the object center before computing scale factors, so resize handles work correctly in rotated space.

**Selection overlay (`SelectionOverlay.tsx`):** The `RotateHandle` component renders a white circle with a curved-arrow icon (180° arc + arrowhead tip). It's placed at the top of a 20px stem above the bounding box. For single rotated objects, the entire overlay wraps in `<g transform="rotate(...)">` so handles visually match the object's rotation. Rotation handles were added to all three selection branches: polygon, line/arrow, and the general bounding-box case.

**SVG export:** `buildExportTransform()` mirrors the renderer's `buildTransform()` for serialized SVG. `computeWorldBoundsRecursive` rotates the 4 corners of rotated objects to compute correct viewBox bounds.

**Ungroup rotation composition:** When ungrouping, children inherit the group's rotation: `child.rotation = (child.rotation ?? 0) + groupRotation`.

## Testing/validation
- `npm run build` — passes (zero TypeScript errors)
- `npm test` — 80/80 unit tests passing (no regressions)
- `npm run test:e2e` — 22/22 Playwright tests passing (no regressions)

## Development learnings
- **Rotation handles must exist in every selection branch, not just the bounding-box branch.** The initial implementation only added rotation handles to the general `else` branch (rectangles, ellipses, text, images, groups). Polygons and lines/arrows have their own specialized selection branches with vertex/endpoint handles, and these were missed. The user reported: "polygon cannot be rotated". The fix was adding `RotateHandle` + rotation `<g>` wrapping to the `isSinglePolygon` and `isSingleArrow || isSingleLine` branches as well. When adding a feature that should be universal across object types, each selection branch in the overlay must be audited individually.
- **The user then asked "can we have a small rotation indication in the rotation handle?"** — the plain white circle was not visually distinguishable from resize handles. The fix was extracting a `RotateHandle` component that draws a 180° arc with an arrowhead inside the circle, making the rotation affordance immediately recognizable.
