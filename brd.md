# Doodler — Business Requirements Document

## 1. Executive Summary

Doodler is a free, open-source web-based vector drawing editor that lets users create hand-drawn-style doodles and export them as SVG for use in websites, presentations, and other digital content. It provides a freehand pen tool and basic shape primitives, all rendered with a sketchy/hand-drawn aesthetic. Every element on the canvas is an independent, selectable object that can be moved, resized, and edited. The target audience is individual users — designers, developers, content creators, and presenters — who want to quickly sketch custom vector doodles without a heavyweight design application.

## 2. Problem Statement

Creating custom hand-drawn-style vector graphics today requires either:

- Using full-featured vector editors (Illustrator, Figma, Inkscape) that are overpowered and slow for quick doodles.
- Relying on pre-made icon/illustration libraries that lack originality and can't be customized to the exact need.
- Drawing on paper and scanning/tracing, which is time-consuming and produces inconsistent results.

There is a need for a lightweight, purpose-built drawing editor that produces clean SVG output with a consistent doodle aesthetic — optimized for the workflow of "sketch it, copy it, paste it into your project."

## 3. Project Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Provide an intuitive canvas-based drawing editor | Users can create a simple doodle within 60 seconds of first visit |
| G2 | Render all strokes and shapes with a hand-drawn/sketchy aesthetic | Visual output is consistently doodle-like regardless of drawing precision |
| G3 | Enable one-click SVG export to clipboard | < 2 actions from finished drawing to clipboard |
| G4 | Treat every drawn element as an editable object | Users can select, move, resize, delete, and recolor any element after drawing |
| G5 | Deliver a fast, accessible web experience | Lighthouse score >= 90 on all categories |
| G6 | Build an open-source community around the project | Public repo with contribution guidelines |

## 4. Target Audience

**Primary:** Individual users

- **Designers** — need quick doodle accents and illustrations for mockups, wireframes, and UI designs.
- **Developers** — want to sketch custom SVGs for landing pages, documentation, and README files.
- **Content creators** — bloggers, social media managers creating original hand-drawn visuals.
- **Presenters** — need custom sketched visuals to make slides more engaging and personal.

**Secondary:** Educators and small teams who want a simple shared drawing tool with no sign-up friction.

## 5. Scope

### 5.1 In Scope

| Area | Description |
|------|-------------|
| Drawing canvas | Infinite or large canvas with pan and zoom |
| Pen/pencil tool | Freehand drawing that produces sketchy vector paths |
| Shape tools | Rectangle, ellipse, line, arrow, polygon, cloud — all rendered with a hand-drawn aesthetic |
| Object model | Each stroke/shape is an independent, selectable, movable, rotatable, editable object |
| Text tool | Place editable text on the canvas rendered in an xkcd-style handwriting font |
| Image import | Import raster images (PNG, JPG) onto the canvas as selectable, movable, resizable objects |
| Icon library | Searchable collection of pre-built doodle-style icons/graphics that can be placed on the canvas |
| Styling controls | Stroke color, fill color, stroke width, fill opacity, stroke opacity, hatched drop shadow with configurable angle |
| Selection and manipulation | Click to select, drag to move, handles to resize, rotation handle, multi-select, copy/cut/paste, match size, alignment |
| Undo/redo | Full undo/redo history for the session |
| Export | Copy SVG to clipboard, download SVG file, export as PNG, save/load as `.lumi` (ZIP) project file with embedded images |
| Responsive web app | SPA optimized for desktop and tablet with pointer/touch input |
| Open-source distribution | MIT-licensed codebase on GitHub |

### 5.2 Out of Scope (v1)

- AI-based generation or assistance
- User accounts, authentication, or cloud save
- Real-time collaboration or multiplayer editing
- Mobile-native applications
- Monetization or premium tiers
- Backend server (app runs entirely client-side)
- Named layers with visibility/locking (objects exist on a single implicit layer with z-order)

## 6. Functional Requirements

### 6.1 Canvas

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | The system shall provide a 2D drawing canvas that fills the main viewport | Must |
| FR-2 | The system shall support panning the canvas via middle-click drag, trackpad scroll, or a hand/grab tool | Must |
| FR-3 | The system shall support zooming via scroll wheel, pinch gesture, and +/- controls | Must |
| FR-4 | The system shall display a subtle grid or dot pattern on the canvas background (toggleable) | Should |
| FR-5 | The system shall show the current zoom level | Should |

### 6.2 Drawing Tools

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6 | The system shall provide a freehand pen/pencil tool that captures pointer input and produces a vector path | Must |
| FR-7 | All freehand strokes shall be rendered with a hand-drawn/sketchy aesthetic (slight wobble, roughness) | Must |
| FR-8 | The system shall provide a rectangle shape tool | Must |
| FR-9 | The system shall provide an ellipse/circle shape tool | Must |
| FR-10 | The system shall provide a straight line tool | Must |
| FR-11 | The system shall provide an arrow tool (line with arrowhead, adjustable arrowhead size) | Must |
| FR-11a | Lines and arrows shall support bezier curve editing via a draggable midpoint handle | Must |
| FR-12 | All shape tools shall render with the same sketchy/hand-drawn aesthetic as freehand strokes | Must |
| FR-12a | The system shall provide a polygon tool — multi-click to place vertices, double-click to close, with post-creation vertex editing | Must |
| FR-12b | The system shall provide a cloud shape tool with 3 top bumps (center tallest) and 3 bottom scallops | Must |
| FR-13 | The system shall provide an eraser tool that removes entire objects on click/drag contact | Should |
| FR-14 | The active tool shall be selectable via a toolbar and keyboard shortcuts | Must |

### 6.3 Text Tool

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-15 | The system shall provide a text tool that places editable text objects on the canvas | Must |
| FR-16 | Text objects shall render using an xkcd-style handwriting font (e.g., xkcd Script, Humor Sans) to match the doodle aesthetic | Must |
| FR-17 | Users shall be able to double-click a text object to edit its content inline on the canvas | Must |
| FR-18 | Users shall be able to set font size for text objects | Must |
| FR-19 | Text objects shall support stroke color and fill color like other objects | Must |
| FR-20 | The handwriting font shall be bundled with the application (no external font service dependency) | Must |
| FR-21 | Exported SVG shall embed the font or convert text to paths to ensure the handwriting style is preserved in any context | Must |
| FR-22 | Users shall be able to select, move, resize, and delete text objects like any other canvas object | Must |

### 6.4 Icon Library

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-23 | The system shall provide a built-in library panel containing a collection of pre-built doodle-style icons and graphics | Must |
| FR-24 | The icon library shall be searchable by keyword (name and tags) with real-time filtering | Must |
| FR-25 | Icons shall be organized into categories (e.g., arrows, people, animals, objects, weather, tech, food, transport, symbols) | Must |
| FR-26 | Users shall be able to place an icon onto the canvas by clicking or dragging from the library panel | Must |
| FR-27 | Placed icons shall become regular canvas objects — selectable, movable, resizable, and deletable | Must |
| FR-28 | Placed icons shall support stroke color and fill color customization like other objects | Must |
| FR-29 | All icons in the library shall share the same hand-drawn/sketchy aesthetic as the drawing tools | Must |
| FR-30 | The icon library shall be data-driven (JSON catalog + SVG files) to allow easy addition of new icons without code changes | Should |
| FR-31 | The library panel shall display a visual preview grid of matching icons | Must |
| FR-32 | The library panel shall show the total count of matching results when searching | Should |

### 6.5 Object Model and Manipulation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-33 | Each drawn stroke, shape, text element, or placed icon shall be stored as an independent object | Must |
| FR-34 | The system shall provide a selection/pointer tool to click and select individual objects | Must |
| FR-35 | Selected objects shall display resize handles and a bounding box | Must |
| FR-36 | Users shall be able to move selected objects by dragging | Must |
| FR-37 | Users shall be able to resize selected objects via handles while maintaining aspect ratio (with shift override) | Must |
| FR-38 | Users shall be able to delete selected objects via keyboard (Delete/Backspace) | Must |
| FR-39 | The system shall support multi-select via click+drag marquee or shift+click | Should |
| FR-40 | The system shall support duplicating selected objects (Ctrl/Cmd+D) | Should |
| FR-40a | The system shall support copy/cut/paste (Ctrl/Cmd+C/X/V) with incremental offset on successive pastes | Must |
| FR-41 | The system shall support changing the z-order of objects (bring forward, send backward) | Should |
| FR-41a | The system shall support rotating objects via a rotation handle (with 45° angle snapping) | Must |
| FR-41b | The system shall support importing raster images (PNG, JPG) as canvas objects | Must |
| FR-41c | When 2+ objects are selected, the system shall offer match width/height/size and alignment/equispacing actions | Should |

### 6.6 Styling

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-42 | The system shall allow setting stroke color for the active tool or selected object | Must |
| FR-43 | The system shall allow setting fill color (including transparent/none) for shapes, text, and icons | Must |
| FR-44 | The system shall allow adjusting stroke width | Must |
| FR-45 | The system shall provide a color picker with preset palette and custom hex/RGB input | Must |
| FR-46 | The system shall allow adjusting fill opacity (independent from stroke opacity) | Should |
| FR-46a | The system shall allow adjusting stroke opacity independently from fill opacity | Should |
| FR-46b | The system shall support hatched drop shadows on filled shapes (rectangle, ellipse, polygon, cloud) with configurable offset and angle | Should |
| FR-46c | Shadow opacity shall track fill opacity using a cubic curve (fades faster than fill) | Should |
| FR-46d | Shadow direction shall remain fixed in world space regardless of object rotation | Should |
| FR-47 | Style changes on a selected object shall update the canvas in real time | Must |
| FR-48 | The system shall remember the last-used style settings for new objects | Should |

### 6.7 Undo/Redo

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-49 | The system shall support undo (Ctrl/Cmd+Z) for all canvas operations | Must |
| FR-50 | The system shall support redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y) | Must |
| FR-51 | The undo history shall persist for the duration of the session | Must |

### 6.8 Export and Copy

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-52 | The system shall copy the entire canvas as SVG code to the clipboard with one click | Must |
| FR-53 | The system shall provide a "Download SVG" action to save the drawing as an `.svg` file | Must |
| FR-54 | The system shall allow copying/exporting only selected objects (not the entire canvas) | Should |
| FR-55 | The system shall support exporting as PNG with configurable resolution | Must |
| FR-56 | The system shall support transparent background in PNG exports (no default white fill) | Must |
| FR-57 | The exported SVG shall be clean, optimized, and well-structured (no unnecessary wrappers or inline styles where attributes suffice) | Must |
| FR-58 | Exported SVG containing text objects shall embed the handwriting font or convert text to paths | Must |
| FR-59 | The system shall display a confirmation toast after a successful copy/export | Must |

### 6.9 Persistence

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-60 | The system shall auto-save the current drawing to browser local storage (including images as base64) | Should |
| FR-61 | The system shall restore the last drawing on page reload | Should |
| FR-62 | The system shall allow saving/loading drawings as `.lumi` project files (ZIP format with embedded images) | Should |
| FR-62a | The system shall prompt for a project name on save and display it on the canvas | Should |
| FR-63 | The system shall provide a "New Drawing" action that clears the canvas (with confirmation if unsaved) | Must |

### 6.10 User Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-64 | The application shall have a toolbar for tool selection (top or left side) | Must |
| FR-65 | The application shall have a properties/style panel for the selected object or active tool | Must |
| FR-66 | The application shall have an icon library panel (sidebar or modal) accessible from the toolbar | Must |
| FR-67 | The application shall support dark mode and light mode | Should |
| FR-68 | The application shall be keyboard-navigable and screen-reader accessible (WCAG 2.1 AA) | Must |
| FR-69 | The application shall display keyboard shortcut hints in tooltips | Should |

## 7. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | **Performance** — Initial page load | < 2 seconds on broadband |
| NFR-2 | **Performance** — Drawing latency (pen input to render) | < 16ms (60 fps) |
| NFR-3 | **Performance** — Canvas with 500+ objects | Smooth pan/zoom without frame drops |
| NFR-4 | **Accessibility** — WCAG compliance level | 2.1 AA |
| NFR-5 | **Browser support** — Modern evergreen browsers | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR-6 | **Input** — Pointer support | Mouse, trackpad, and touch; stylus pressure sensitivity is a stretch goal |
| NFR-7 | **Hosting** — Static deployment | Deployable to GitHub Pages, Vercel, Netlify, or similar |
| NFR-8 | **Bundle size** — Initial JS payload | < 300 KB gzipped |
| NFR-9 | **Offline** — Service worker caching | App works offline after first visit |

## 8. Sketchy Rendering Requirements

| Property | Specification |
|----------|--------------|
| Engine | Use a library such as Rough.js or a custom algorithm to apply hand-drawn roughness to all paths and shapes |
| Consistency | All objects on the canvas shall share the same sketchy aesthetic regardless of tool used |
| Configurability | The roughness/sketchiness level should be adjustable globally (e.g., clean → moderate → very rough) |
| Determinism | Re-rendering the same object shall produce the same visual result (seeded randomness) |
| SVG fidelity | The exported SVG shall retain the sketchy appearance without requiring JavaScript at render time |

## 9. Technical Constraints

- **No backend required** — The application must run entirely in the browser as a static site.
- **No user data collection** — No cookies, analytics, or tracking unless explicitly opt-in.
- **Open-source compatible** — All dependencies must have permissive licenses (MIT, Apache 2.0, BSD).
- **SVG-native** — The canvas rendering should use SVG (not HTML Canvas/WebGL) so the DOM elements map directly to the export output.
- **Responsive** — The editor layout must adapt to viewport sizes from 1024px wide and up; tablets in landscape are supported, phones are not required.

## 10. User Flows

### 10.1 Create and Copy a Doodle

```
Open app → Select pen tool → Draw on canvas →
Switch to rectangle tool → Add a shape →
Select an object → Change stroke color →
Click "Copy SVG" → SVG copied to clipboard →
Paste into website/presentation
```

### 10.2 Edit an Existing Object

```
Select pointer tool → Click an object on canvas →
Object shows bounding box and handles →
Drag to reposition / drag handle to resize →
Change fill color in properties panel →
Continue editing or export
```

### 10.3 Save and Resume

```
Draw on canvas → Auto-saved to local storage →
Close browser → Reopen app → Drawing restored →
Continue editing
```

### 10.4 Add Text to a Doodle

```
Select text tool → Click on canvas → Type text →
Text renders in xkcd handwriting font →
Select text object → Adjust font size and color →
Export as SVG → Font embedded/converted to paths → Paste anywhere
```

### 10.5 Add an Icon from the Library

```
Click icon library button in toolbar → Library panel opens →
Type "rocket" in search bar → Matching icons filter in real time →
Click or drag icon onto canvas → Icon placed as editable object →
Resize and change color → Continue composing doodle
```

### 10.6 Export Selection Only

```
Multi-select several objects → Click "Copy Selected as SVG" →
Only selected objects exported → Paste into target
```

## 11. Release Plan

| Phase | Milestone | Scope | Status |
|-------|-----------|-------|--------|
| **v0.1 — MVP** | Basic drawing | Canvas with pen tool, sketchy rendering, single-color strokes, SVG copy to clipboard | Done |
| **v0.2 — Shapes** | Shape tools | Rectangle, ellipse, line, arrow tools with sketchy rendering | Done |
| **v0.3 — Text** | Text tool | Text placement with xkcd-style handwriting font, inline editing, font embedding on export | Done |
| **v0.4 — Icons** | Icon library | Searchable collection of doodle-style icons, category browsing, drag-to-canvas placement | Planned |
| **v0.5 — Objects** | Object manipulation | Selection, move, resize, delete, multi-select, copy/cut/paste, z-order | Done |
| **v0.6 — Styling** | Full styling | Color picker, fill, stroke width, opacity, preset palettes, match size, alignment/equispacing | Done |
| **v0.7 — Persistence** | Save/load | Local storage auto-save, JSON project file import/export | Done |
| **v0.8 — Polish** | UX refinements | Undo/redo, select all, curved lines/arrows, draggable arrowhead size, fill opacity (not stroke) | Done |
| **v0.9 — Export** | Export & deploy | PNG export, download SVG, canvas grid, zoom indicator, shortcut hints | Done |
| **v0.9.1** | Hatched drop shadow | Hatched drop shadows for shapes with adjustable offset | Done |
| **v0.9.2** | Testing & CI | Vitest unit tests, Playwright E2E, GitHub Actions CI, Cloudflare Pages deploy | Done |
| **v0.9.3** | Mobile actions | Undo/redo/select-all/delete buttons in toolbar | Done |
| **v0.9.4** | Image import | Import raster images, ZIP save/load when images present | Done |
| **v0.9.5** | Project name | `.lumi` file extension, project name display and persistence | Done |
| **v0.9.6** | Polygon tool | Multi-click polygon with vertex editing, fill, shadow support | Done |
| **v0.9.7** | Object rotation | Rotation handle on all object types, SVG export, rotated resize | Done |
| **v0.9.8** | Shadow angle | Configurable shadow angle, rotation-independent shadow direction and hatch | Done |
| **v0.9.9** | Shadow opacity | Shadow opacity tracks fill opacity via cubic curve | Done |
| **v0.9.10** | Pen stroke width | Stroke width scales pen thickness via perfect-freehand size parameter | Done |
| **v0.9.11** | Cloud shape | Cloud tool with 3 top bumps, 3 bottom scallops, fill/shadow support | Done |
| **v0.9.12** | Stroke opacity | Independent stroke opacity control, separate from fill opacity | Done |
| **v1.0 — Launch** | Public release | Performance tuning, documentation, community launch | Planned |

## 12. Success Criteria

- Users can create a recognizable doodle and copy it as SVG within 60 seconds of first visit.
- SVG output renders correctly when pasted into a blank HTML page and into Google Slides / PowerPoint.
- Drawing at 60 fps with no perceptible lag on a mid-range laptop.
- Canvas remains responsive with 500+ objects.
- Lighthouse scores >= 90 across Performance, Accessibility, Best Practices, and SEO.
- Positive feedback from at least 5 beta testers validating the core draw-and-copy workflow.

## 13. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Sketchy rendering performance degrades with many objects | Laggy canvas, poor UX | Medium | Virtualize off-screen objects; batch SVG updates; profile early |
| Freehand path data produces large SVGs | Slow copy, large file size | Medium | Simplify/optimize paths on export (point reduction algorithms) |
| Cross-browser SVG clipboard inconsistency | Copy fails on some browsers | Medium | Test all target browsers early; provide "select all" fallback |
| Touch/stylus input handling differences | Drawing feels inconsistent across devices | Medium | Abstract input handling; test on multiple devices; use Pointer Events API |
| Font licensing or availability issues | Handwriting font can't be bundled | Low | Use Humor Sans (open) or convert text to paths; verify license before bundling |
| Icon library too small at launch | Users can't find relevant icons | Medium | Prioritize high-demand categories (arrows, people, tech); accept community contributions via PR |
| Scope creep toward full vector editor | Delayed launch, loss of focus | High | Enforce the out-of-scope list strictly; ship MVP first |

## 14. Glossary

| Term | Definition |
|------|------------|
| **Doodle** | A hand-drawn-style vector graphic with an informal, sketchy aesthetic |
| **SVG** | Scalable Vector Graphics — an XML-based vector image format supported by all modern browsers |
| **Object** | A single drawn element (stroke or shape) on the canvas that can be independently selected and manipulated |
| **Sketchy rendering** | An algorithm that adds controlled roughness and wobble to vector paths to simulate hand-drawing |
| **Canvas** | The main drawing area of the application where users create and edit objects |
| **Icon library** | A built-in, searchable panel containing pre-made doodle-style vector icons that users can place on the canvas |
| **Z-order** | The front-to-back stacking order of objects on the canvas |
| **xkcd-style font** | A handwriting font that mimics the informal lettering style of xkcd comics (e.g., Humor Sans, xkcd Script) |
| **Text-to-path** | Converting editable text into vector path outlines so the font is no longer required to render the text |
