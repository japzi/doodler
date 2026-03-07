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
