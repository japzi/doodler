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
