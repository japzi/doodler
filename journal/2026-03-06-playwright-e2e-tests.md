# 2026-03-06 — Playwright E2E Tests

## Files created
- `playwright.config.ts` (22 lines) — Playwright configuration
- `e2e/drawing.spec.ts` (109 lines) — Core drawing flow tests
- `e2e/selection.spec.ts` (73 lines) — Selection & manipulation tests
- `e2e/toolbar.spec.ts` (70 lines) — Toolbar interaction tests

## Files modified
- `package.json` (31 lines) — added `@playwright/test` devDependency, `"test:e2e"` script
- `vite.config.ts` (24 lines) — added `test.exclude` for `e2e/` directory
- `.github/workflows/ci.yml` (16 lines) — added Playwright install + run steps

## Problem statement
The project had 47 Vitest unit tests covering store logic and utilities, but no browser-level tests exercising the actual drawing app. There was no verification that tool selection, shape drawing, keyboard shortcuts, undo/redo, selection, and toolbar interactions actually work in a real browser with the SVG canvas.

## Solution implementation
Installed Playwright with Chromium-only to keep CI lean. The config auto-starts the Vite dev server via `webServer` and targets `localhost:5173`.

The app renders shapes as SVG elements with `data-object-id` attributes, so tests verify object counts via `svg.canvas [data-object-id]` after drawing. Drawing is done by dispatching `pointerdown`/`pointermove`/`pointerup` events on the canvas SVG element:

```ts
async function drawShape(page: Page, key: string, x = 400, y = 360, w = 120, h = 80) {
  await page.keyboard.press(key);
  const canvas = page.locator(CANVAS);
  await canvas.dispatchEvent('pointerdown', { clientX: x, clientY: y, button: 0, pointerId: 1 });
  await canvas.dispatchEvent('pointermove', { clientX: x + w, clientY: y + h, button: 0, pointerId: 1 });
  await canvas.dispatchEvent('pointerup', { clientX: x + w, clientY: y + h, button: 0, pointerId: 1 });
}
```

Selection-dependent tests (delete, duplicate, multi-select) use `Cmd+A` (select all) instead of click-to-select, since the pointer tool relies on `e.target.closest('[data-object-id]')` for hit testing and `dispatchEvent` sets `target` to the SVG root, not the child element at those coordinates.

22 tests across 3 spec files:
- **drawing.spec.ts** (14 tests): toolbar click, 7 keyboard shortcuts (R/E/L/A/P/V/T) with active button verification, rectangle/ellipse/line/pen drawing, undo/redo, delete
- **selection.spec.ts** (4 tests): resize handles on select, multi-select, Cmd+D duplicate, Cmd+A select all
- **toolbar.spec.ts** (4 tests): stroke width change, grid toggle via G key, zoom in/out button label updates

## Testing/validation
- `npm run test:e2e` — 22/22 e2e tests pass (3.8s)
- `npm test` — 47/47 unit tests pass
- `npm run build` — builds successfully

## Development learnings
- **`dispatchEvent` vs real pointer events**: Initial implementation used `dispatchEvent` for all interactions including click-to-select. This works for drawing (shape tools only need coordinates from the event) but fails for selection because the pointer tool checks `e.target.closest('[data-object-id]')` — `dispatchEvent` always sets `target` to the element you dispatch on (the SVG root), not the element visually at those coordinates. Fixed by using `Cmd+A` for selection-dependent tests.
- **Vitest picks up Playwright files**: Without an explicit `test.exclude` in vite.config.ts, Vitest tried to load `e2e/*.spec.ts` files and failed because Playwright's `test.beforeEach` isn't compatible with Vitest's test runner. Fixed by adding `exclude: ['e2e/**', 'node_modules/**']` to the Vite test config.
