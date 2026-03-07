# 2026-03-07 — Project Name + .lumi File Extension

## Files changed
- `src/store/useStore.ts` — modified (line 14: `loadDrawing` returns `projectName`; line 25: `persistDrawing` accepts `projectName`; lines 74–107: `exportProject` rewritten — always ZIP, accepts optional name, strips `.lumi` suffix, downloads as `{name}.lumi`; lines 109–145: `importProject` rewritten — `.lumi`-only, restores `projectName` with filename fallback; line 169: `projectName` added to `LumiDrawState`; line 255: `setProjectName` action; line 267: initial state from localStorage; line 687: `setProjectName` implementation; line 887: `clearDrawing` resets to `'Untitled'`; lines 891–895: auto-save subscription includes `projectName`)
- `src/components/Toolbar/Toolbar.tsx` — modified (lines 89–94: `handleSave` prompts for name via `window.prompt`, passes to `exportProject`; line 564: file input `accept=".lumi,application/zip,application/x-zip-compressed"`)
- `src/App.tsx` — modified (line 5: import `ProjectNameLabel`; line 29: render `<ProjectNameLabel />`)
- `src/store/__tests__/useStore.test.ts` — modified (line 66: `resetStore` includes `projectName`; lines 484–516: new `projectName` describe block with 4 tests; lines 413–481: round-trip tests rewritten for `.lumi`-only format)

## Files created
- `src/components/Canvas/ProjectNameLabel.tsx` — clickable label component at bottom-left
- `src/components/Canvas/ProjectNameLabel.css` — styles matching ZoomControls pattern

## Problem statement
Save always downloaded as `lumidraw-drawing.json` or `.zip` with no way to name the file. Users wanted to name their projects, see the name on-screen, and use a custom `.lumi` file extension instead of generic `.json`/`.zip`.

## Solution implementation
**Store (`useStore.ts`):** Added `projectName: string` to state (default `'Untitled'`). Persisted alongside `objects` and `viewport` in localStorage. Included in exported project JSON (`{ version: 1, projectName, objects, viewport }`). On import, `projectName` is restored from data with fallback to filename-without-extension. `clearDrawing` resets to `'Untitled'`.

**Export always as ZIP (`exportProject`):** Simplified from the previous two-path approach (JSON for no-images, ZIP for images). Now always creates a ZIP regardless of image presence — simplifies logic and ensures a single `.lumi` format. The name is stripped of any `.lumi` suffix the user might type:
```ts
const cleanName = name ? name.replace(/\.lumi$/i, '') : undefined
const projectName = cleanName ?? state.projectName
```

**Import `.lumi` only (`importProject`):** Removed backward-compatible `.json` and `.zip` handling. All files are treated as ZIP archives containing `project.json`. The `filenameWithoutExtension` helper provides the fallback project name when `projectName` is missing from the data.

**Save prompt (`Toolbar.tsx`):** `handleSave` calls `window.prompt()` pre-filled with the current project name. Cancel aborts the save. The confirmed name is passed to `exportProject(name)`.

**Project name label (`ProjectNameLabel.tsx`):** Fixed-position button at `bottom: 16px; left: 16px` (mirrors `ZoomControls` at bottom-right). Shows `projectName` as clickable text. On click, opens `window.prompt()` to rename — calls `setProjectName`. Styles match the existing UI: white background, `border-radius: 10px`, `box-shadow: 0 2px 12px rgba(0,0,0,0.12)`.

**File picker:** Set `accept=".lumi,application/zip,application/x-zip-compressed"` on the file input. The `.lumi` extension alone isn't recognized by browsers, but since `.lumi` files are ZIPs internally, adding the ZIP MIME types lets the browser match them.

## Testing/validation
- `npm run build` — passes
- `npm test` — 74/74 unit tests passing (4 new projectName tests, round-trip tests rewritten for `.lumi`)
- Tests cover: default name, `setProjectName`, `clearDrawing` reset, import with `projectName` in data, import fallback to filename

## Development learnings
- **No backward compatibility needed:** Initially implemented support for loading legacy `.json` and `.zip` files alongside `.lumi`. User corrected: "no need for backward compatibility in terms of *.zip extension or *.json extension". Removed the `.json` import path and the `isZip` conditional entirely.
- **Custom file extensions and browser `accept` attribute:** The `accept=".lumi"` attribute alone on file inputs doesn't work reliably — browsers don't recognize custom extensions without a registered MIME type, causing `.lumi` files to appear grayed out in the file picker. User reported: "file load window, doesn't let I click on a lumi file". Initial fix was removing `accept` entirely. User then suggested keeping `.lumi` alongside the ZIP MIME types: `accept=".lumi,application/zip,application/x-zip-compressed"`. Since `.lumi` files are ZIPs internally, the MIME types let the browser match them.
- **Extension in project name:** The project name label was showing the `.lumi` extension when users typed it in the save prompt. User corrected: "project name shows the extension, don't". Fix: strip `.lumi` suffix from user input via `name.replace(/\.lumi$/i, '')` before storing.
