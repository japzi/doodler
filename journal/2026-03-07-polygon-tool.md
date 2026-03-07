# 2026-03-07 — Polygon Tool

## Files changed
- `src/types/scene.ts` — modified (lines 122–135: new `PolygonShape` interface; line 143: added to `SceneObject` union; line 151: added `'polygon'` to `ToolType`)
- `src/rendering/roughPath.ts` — modified (lines 17–22: new `generateRoughPolygon()` function)
- `src/utils/boundingBox.ts` — modified (lines 15–25: new `boundingBoxFromPolygon()` function)
- `src/store/useStore.ts` — modified (lines 206–207: `activePolygonPoints` and `selectedPolygonVertex` state; lines 267–268: polygon actions in interface; lines 290–291: initial state values; line 621: `setActiveTool` clears polygon state; line 619: `setSelectedIds` clears `selectedPolygonVertex`; lines 700–701: `updateObjectStyles` extends fill/shadow to polygon; lines 879–888: `clearDrawing` clears polygon state; lines 890–907: `setActivePolygonPoints`, `setSelectedPolygonVertex`, `updatePolygonGeometry` actions)
- `src/utils/resize.ts` — modified (lines 137–153: new `case 'polygon'` in `applyResize`)
- `src/components/Canvas/SceneRenderer.tsx` — modified (line 4: `PolygonShape` import; lines 35–64: `HatchShadow` extended for polygon clip path; lines 63–83: `FillShape` extended with polygon `<polygon>` element; lines 90–92: `PathElement` fill/shadow checks include polygon; lines 101–102: polygon type assertions; lines 170–172: `ChildPathElement` fill/shadow checks include polygon)
- `src/components/Canvas/SelectionOverlay.tsx` — modified (line 3: `PolygonShape` import; line 10: `selectedPolygonVertex` subscription; lines 23–87: polygon vertex handles, midpoint handles, and delete button rendering)
- `src/tools/usePointerTool.ts` — modified (line 5: `PolygonShape` import; lines 19–23: `polygonHandleDrag` ref; lines 52–97: polygon handle detection in `onPointerDown` — vertex drag, midpoint insert, delete vertex; lines 183–194: polygon handle drag in `onPointerMove`; lines 303–306: polygon handle cleanup in `onPointerUp`)
- `src/components/Canvas/Canvas.tsx` — modified (line 8: `ActivePolygonRenderer` import; line 13: `usePolygonTool` import; line 39: `polygonTool` initialization; lines 56–57: route pointer events to polygon tool; line 79: polygon move routing; line 98: polygon pointer-up no-op; lines 105–111: double-click routes to polygon tool; lines 261–265: `'s'`/`'S'` keyboard shortcut; lines 267–274: Enter closes polygon; lines 275–282: Escape cancels polygon drawing; lines 283–299: Delete/Backspace handles polygon vertex deletion; line 303: keyboard effect depends on `polygonTool`; lines 308–311: cursor class includes polygon; line 336: `<ActivePolygonRenderer>` in SVG overlay)
- `src/components/Toolbar/Toolbar.tsx` — modified (line 55: `selectedHasFill` includes polygon; line 177: `isShapeTool` includes polygon; lines 277–287: polygon toolbar button with pentagon icon; lines 286–330: fill/shadow/opacity conditions include polygon; line 68: toolbar sync handles polygon shadow)
- `src/export/svgExport.ts` — modified (line 1: `PolygonShape` import; line 85: shadow offset detection includes polygon; lines 93–108: `serializeShadow` extended for polygon clip shape; lines 140–153: `serializeObject` handles polygon fill with `<polygon>` element)
- `src/store/__tests__/useStore.test.ts` — modified (line 28: `generateRoughPolygon` mock; line 48: `PolygonShape` import; lines 398–452: 4 new polygon tests)
- `src/utils/__tests__/resize.test.ts` — modified (line 4: `PolygonShape` import; lines 133–163: 2 new polygon resize tests)

## Files created
- `src/tools/usePolygonTool.ts` — multi-click drawing hook (57 lines)
- `src/components/Canvas/ActivePolygonRenderer.tsx` — live preview during drawing (68 lines)

## Problem statement
Users wanted to draw arbitrary polygons on the canvas. The existing tools (rectangle, ellipse, line, arrow) are all single-drag shapes — you press, drag, and release. A polygon requires a fundamentally different interaction: multi-click to place vertices, then double-click (or Enter) to close the shape. Post-creation, users need to edit vertices — drag them to reshape, click edge midpoints to add new vertices, and delete vertices. The tool must work on both desktop (keyboard + mouse) and mobile (touch only).

## Solution implementation
**Multi-click drawing model (`usePolygonTool.ts`):** Unlike `useShapeTool` which tracks drag start→end, the polygon tool accumulates clicks into `activePolygonPoints` (store state). Each `onPointerDown` appends to the array. `onPointerMove` updates a cursor ref (not state — avoids re-renders on every pixel). Double-click calls `closePolygon()` which deduplicates the last point, computes bounding box, normalizes vertices relative to bbox origin, generates roughjs path data, and calls `addObject`. Enter also closes; Escape clears without creating:
```ts
const closePolygon = useCallback(() => {
  let points = state.activePolygonPoints
  // Remove duplicate last point from double-click
  if (last.x === secondLast.x && last.y === secondLast.y) {
    points = points.slice(0, -1)
  }
  const bbox = boundingBoxFromPolygon(points)
  const normalizedPoints = points.map((p) => ({ x: p.x - bbox.x, y: p.y - bbox.y }))
  const pathData = generateRoughPolygon(normalizedPoints)
  state.addObject(polygon)
}, [])
```

**Live preview (`ActivePolygonRenderer.tsx`):** Renders during drawing with dashed lines connecting placed vertices, a dashed line from the last vertex to the cursor, and a faint close-preview line from cursor to first vertex. Uses `requestAnimationFrame` to poll the cursor ref — avoids coupling store state to mouse movement:
```tsx
useEffect(() => {
  let raf: number
  const tick = () => {
    setCursor(cursorPos.current ? { ...cursorPos.current } : null)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}, [points, cursorPos])
```

**Vertex editing (`SelectionOverlay.tsx` + `usePointerTool.ts`):** When a single polygon is selected, the overlay renders: (1) white circle handles at each vertex (`data-polygon-handle="vertex-N"`), (2) smaller blue circles at edge midpoints (`data-polygon-handle="mid-N"`), and (3) a red X delete button above the selected vertex (if > 3 vertices remain). The pointer tool detects these via `data-polygon-handle` attributes:
- Vertex click: sets `selectedPolygonVertex` and starts drag
- Vertex drag: converts vertices to world coords, applies delta to dragged vertex, calls `updatePolygonGeometry`
- Midpoint click: inserts a new vertex at the midpoint between vertex N and N+1
- Delete click/Backspace: removes vertex at `selectedPolygonVertex` (minimum 3 enforced)

**Geometry normalization (`updatePolygonGeometry` in store):** All geometry updates go through one function that takes world-coordinate points, computes bounding box, normalizes points relative to bbox origin, regenerates roughjs pathData, and updates the object. This ensures position/points/pathData/boundingBox stay consistent:
```ts
updatePolygonGeometry: (id, points) => set((state) => ({
  objects: state.objects.map((o) => {
    if (o.id !== id || o.type !== 'polygon') return o
    const bbox = boundingBoxFromPolygon(points)
    const normalizedPoints = points.map((p) => ({ x: p.x - bbox.x, y: p.y - bbox.y }))
    return { ...o, points: normalizedPoints, position: { x: bbox.x, y: bbox.y },
      pathData: generateRoughPolygon(normalizedPoints), boundingBox: { x: 0, y: 0, width: bbox.width, height: bbox.height } }
  }),
})),
```

**Rendering pipeline:** Polygon uses `pathData` from roughjs (sketchy outline) for the stroke, but `<polygon points="...">` for fills and clip paths — this gives a clean fill boundary with a hand-drawn stroke on top, matching the rectangle/ellipse pattern.

## Testing/validation
- `npm run build` — passes (zero errors after removing unused `PolygonShape` import from store)
- `npm test` — 80/80 unit tests passing (7 new: 4 store polygon tests + 2 resize polygon tests + 1 existing test count increase from mock addition)
- `npm run test:e2e` — 22/22 Playwright tests passing (no regressions)

## Development learnings
- **Unused import TypeScript error:** Initially imported `PolygonShape` in `useStore.ts` for type clarity, but the type is only used through the `SceneObject` discriminated union (e.g., `o.type === 'polygon'` narrows automatically). TypeScript's `noUnusedLocals` caught this: `error TS6196: 'PolygonShape' is declared but never used`. The import was only needed in files that explicitly type function parameters or refs as `PolygonShape` (like `SelectionOverlay.tsx` and `usePointerTool.ts`).
