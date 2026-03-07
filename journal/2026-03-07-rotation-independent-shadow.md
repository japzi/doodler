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
