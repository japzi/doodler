# Doodler — Feature Tracker

## v0.1 — MVP (Basic Drawing) `done`

- [x] Canvas with pan (middle-click) and zoom (scroll wheel)
- [x] Freehand pen tool with sketchy rendering (perfect-freehand)
- [x] Object selection (click to select)
- [x] Object move (drag to reposition)
- [x] Object delete (Delete/Backspace)
- [x] Stroke color picker
- [x] Copy SVG to clipboard
- [x] Keyboard shortcuts (V → pointer, P → pen)
- [x] Toast notification on copy
- [ ] Pinch-to-zoom gesture support
- [ ] Zoom +/- controls in UI

## v0.2 — Shapes `done`

- [x] Rectangle tool with sketchy rendering (roughjs)
- [x] Ellipse/circle tool
- [x] Straight line tool
- [x] Arrow tool (line with arrowhead)
- [x] Consistent sketchy aesthetic across all shape tools
- [x] Live drag preview during shape drawing
- [x] Keyboard shortcuts (R → rectangle, E → ellipse, L → line, A → arrow)
- [x] SVG export handles shapes (stroke) alongside pen strokes (fill)

## v0.3 — Text `current`

- [x] Text tool — click to place text on canvas
- [x] xkcd-style handwriting font (Humor Sans)
- [x] Inline text editing (double-click to edit)
- [ ] Font size control
- [x] Text color (uses stroke color)
- [x] Font embedding on SVG export
- [x] Keyboard shortcut (T → text)

## v0.4 — Icon Library

- [ ] Built-in searchable icon library panel
- [ ] Category browsing (arrows, people, tech, etc.)
- [ ] Click/drag to place icon on canvas
- [ ] Icons as editable objects (move, resize, recolor)
- [ ] Data-driven catalog (JSON + SVG)

## v0.5 — Object Manipulation

- [ ] Resize handles on selected objects
- [ ] Aspect-ratio-locked resize (shift override)
- [ ] Multi-select (shift+click and marquee drag)
- [ ] Duplicate objects (Ctrl/Cmd+D)
- [ ] Z-order controls (bring forward, send backward)

## v0.6 — Styling

- [ ] Fill color (including transparent/none)
- [ ] Stroke width control
- [ ] Object opacity
- [ ] Color picker with preset palette + hex/RGB input
- [ ] Remember last-used style for new objects

## v0.7 — Persistence

- [ ] Auto-save to localStorage
- [ ] Restore drawing on page reload
- [ ] Save/load as JSON project file
- [ ] "New Drawing" action with confirmation

## v0.8 — Polish

- [ ] Undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z)
- [ ] Dark mode / light mode toggle
- [ ] PNG export with configurable resolution
- [ ] Transparent background in PNG export
- [ ] Download SVG file
- [ ] Export selected objects only
- [ ] Canvas grid/dot pattern (toggleable)
- [ ] Zoom level indicator
- [ ] Eraser tool
- [ ] Keyboard shortcut hints in tooltips

## v1.0 — Launch

- [ ] Performance tuning (500+ objects smooth)
- [ ] WCAG 2.1 AA accessibility
- [ ] PWA / service worker for offline use
- [ ] Documentation and contribution guidelines
- [ ] Public release
