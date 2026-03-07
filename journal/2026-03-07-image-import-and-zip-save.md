# 2026-03-07 — Import Images onto Canvas + ZIP Save/Load

## Files changed
- `src/types/scene.ts` — modified (lines 110–121: new `ImageObject` interface; line 130: added to `SceneObject` union)
- `src/utils/resize.ts` — modified (lines 157–171: new `case 'image'` in `applyResize`)
- `src/components/Canvas/SceneRenderer.tsx` — modified (lines 127–138: `ImageElement` component; lines 195–205: `ChildImageElement` component; line 210: image case in `renderGroupChild`; lines 235–237: image case in main render loop)
- `src/export/svgExport.ts` — modified (lines 1: added `ImageObject` import; lines 116–122: `serializeImageObject` function; line 124: image case in `serializeObject`; removed image filtering — images now included in bounds and serialization with embedded base64; line 238: added `xmlns:xlink` namespace)
- `src/store/useStore.ts` — modified (lines 2–3: added `JSZip` and `ImageObject` imports; lines 30–64: helper functions `collectImages`, `dataUrlToBlob`, `replaceImageSrcs`, `restoreImageSrcs`; lines 66–100: `exportProject` rewritten as async — exports ZIP when images present, JSON otherwise; lines 102–146: `importProject` rewritten — handles both `.zip` and legacy `.json`)
- `src/components/Toolbar/Toolbar.tsx` — modified (lines 9–10: added `ImageObject` and `generateId` imports; line 48: `imageInputRef`; lines 133–159: `handleImportImage` callback; lines 420–432: image import button + hidden file input; line 504: load file input now accepts `.json,.zip`)
- `package.json` — modified (added `jszip` dependency)
- `src/utils/__tests__/resize.test.ts` — modified (4 new image resize tests)
- `src/store/__tests__/useStore.test.ts` — modified (7 new image object store tests)

## Files created
- `src/export/__tests__/svgExport.test.ts` — 8 tests for SVG export with images

## Problem statement
Users needed to place raster images (PNG, JPG, etc.) on the canvas alongside drawn objects. The app only supported vector objects (pen, shapes, text). Images needed to be selectable, movable, and resizable like other objects. The save format needed to handle large base64 data without bloating a single JSON file. SVG and PNG export needed to embed images as base64.

## Solution implementation
**ImageObject type (`scene.ts`):** New interface with `src` (base64 data URL), `width`, `height`, and the standard `position`/`boundingBox`/`color`/`opacity` fields. `color` is set to `'#000'` but unused — required for type consistency so existing operations (move, duplicate, z-order) work without special-casing.

**Resize (`resize.ts`):** Same corner-scaling pattern as rectangles — scale world-space corners around anchor, compute new width/height/position/boundingBox. No pathData to regenerate:
```ts
case 'image': {
  const p1 = scalePoint({ x: wx, y: wy }, anchor, scaleX, scaleY)
  const p2 = scalePoint({ x: wx2, y: wy2 }, anchor, scaleX, scaleY)
  return { ...obj, width: nw, height: nh, position: { x: nx, y: ny }, boundingBox: { x: 0, y: 0, width: nw, height: nh } }
}
```

**Canvas rendering (`SceneRenderer.tsx`):** `ImageElement` uses SVG `<image>` with `href={obj.src}`. Separate `ChildImageElement` (without `data-object-id`) for group children. The `PathElement` type was updated to `Exclude<SceneObject, TextObject | ImageObject | GroupObject>` to avoid TypeScript errors about `pathData` not existing on `ImageObject`.

**SVG export (`svgExport.ts`):** Initially images were filtered out of SVG export. Revised to embed them as `<image href="data:image/...;base64,...">` elements. `serializeImageObject` outputs the `<image>` tag with position transform and optional opacity. Images now contribute to viewBox bounds. Added `xmlns:xlink` to SVG root for broader compatibility.

**ZIP save/load (`useStore.ts`):** `exportProject` checks for images in the scene. If none, exports plain `.json` (backward compatible). If images exist, creates a ZIP via jszip with `project.json` + `images/{id}.{ext}` files. Image `src` fields are replaced with relative paths in JSON, and actual image binary data goes into separate files. `importProject` detects `.zip` vs `.json` by filename and restores base64 data URLs from ZIP image files. localStorage persistence keeps base64 inline (simple, works for reasonable image counts).

**Toolbar (`Toolbar.tsx`):** Hidden `<input type="file" accept="image/*">` triggered by an image icon button. On file select: reads as base64 via FileReader, creates an `Image()` to get natural dimensions, scales down to max 400px, computes viewport center for placement, calls `addObject`.

## Testing/validation
- `npm run build` — passes (tsc + vite build, zero errors)
- `npm test` — 66/66 unit tests passing (19 new: 4 resize, 7 store, 8 SVG export)
- `npm run test:e2e` — 22/22 Playwright tests passing

## Development learnings
- **TypeScript union exhaustiveness:** Adding `ImageObject` to the `SceneObject` union caused build failures in `PathElement` and `ChildPathElement` components because their type `Exclude<SceneObject, TextObject | GroupObject>` now included `ImageObject`, which lacks `pathData`. Fix: also exclude `ImageObject` from the type. Lesson: when adding a new variant to a discriminated union, check all `Exclude<>` types that implicitly include it.
- **SVG export iteration:** The initial plan was to skip images in SVG/PNG export entirely. The user then asked to embed images in SVG export, which cascaded to PNG export for free (since PNG goes through `serializeToSvg`). This required reversing the earlier filtering logic. Lesson: when an export pipeline is layered (PNG → SVG → serialize), changes to the base layer propagate automatically.
- **Test expectation math:** A viewBox bounds test expected height=160 for an image at y=500 with height=100 and padding=20, but the correct value is 140 (100 + 2×20). Caught immediately by the test runner.
