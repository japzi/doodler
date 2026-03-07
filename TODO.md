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
- [x] Zoom +/- controls in UI

## v0.2 — Shapes `done`

- [x] Rectangle tool with sketchy rendering (roughjs)
- [x] Ellipse/circle tool
- [x] Straight line tool
- [x] Arrow tool (line with arrowhead)
- [x] Consistent sketchy aesthetic across all shape tools
- [x] Live drag preview during shape drawing
- [x] Keyboard shortcuts (R → rectangle, E → ellipse, L → line, A → arrow)
- [x] SVG export handles shapes (stroke) alongside pen strokes (fill)

## v0.3 — Text `done`

- [x] Text tool — click to place text on canvas
- [x] xkcd-style handwriting font (Humor Sans)
- [x] Inline text editing (double-click to edit)
- [x] Font size control
- [x] Text color (uses stroke color)
- [x] Font embedding on SVG export
- [x] Keyboard shortcut (T → text)

## v0.4 — Icon Library

- [ ] Built-in searchable icon library panel
- [ ] Category browsing (arrows, people, tech, etc.)
- [ ] Click/drag to place icon on canvas
- [ ] Icons as editable objects (move, resize, recolor)
- [ ] Data-driven catalog (JSON + SVG)

## v0.5 — Object Manipulation `done`

- [x] Resize handles on selected objects
- [x] Aspect-ratio-locked resize (shift override)
- [x] Multi-select (shift+click and marquee drag)
- [x] Duplicate objects (Ctrl/Cmd+D)
- [x] Copy/cut/paste objects (Ctrl/Cmd+C/X/V) with incremental offset on successive pastes
- [x] Z-order controls (bring forward, bring to front, send backward, send to back)

## v0.6 — Styling `done`

- [x] Fill color (including transparent/none)
- [x] Stroke width control
- [x] Object opacity
- [x] Color picker with preset palette + hex/RGB input
- [x] Remember last-used style for new objects

## v0.6.1 — Match Size `done`

- [x] Floating action bar appears when 2+ objects selected
- [x] "Same Width" — match all selected objects to first object's width
- [x] "Same Height" — match all selected objects to first object's height
- [x] "Same Size" — match both dimensions
- [x] Bar disappears when fewer than 2 objects selected
- [x] Works for all object types (shapes, pen, text, lines, arrows)

## v0.6.2 — Alignment and Equispacement `done`

- [x] Horizontal Center alignment
- [x] Horizontal Left alignment
- [x] Horizontal Right alignment
- [x] Vertical Top alignment
- [x] Vertical Bottom alignment
- [x] Vertical Mid alignment
- [x] Make them equal spaced vertically
- [x] Make them equal spaced horizontally

## v0.7 — Persistence `done`

- [x] Auto-save to localStorage
- [x] Restore drawing on page reload
- [x] Save/load as JSON project file
- [x] "New Drawing" action with confirmation

## v0.8 — Polish

- [x] Select an object and change stroke/fill color and transparency
- [x] Allow arrows to be curved. When arrow is selected, only show corner points. At mouse over, show a center control point, upon clicking break the arrow in the middle. Also let two handles in that position to change the gradient at that point allowing arrow to take the shape of a curve.
- [x] Allow lines to be curved. When line is selected, only show corner points. At mouse over, show a center control point, upon clicking break the line in the middle. Also let two handles in that position to change the gradient at that point allowing line to take the shape of a curve.
- [x] Draggable arrowhead size control (yellow handle near arrowhead tip)
- [x] Undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z)
- [x] Select all (Cmd/Ctrl+A)
- [x] Opacity applies only to fill (not stroke/text)

## v0.9 - Polisher `done`
- [x] PNG export with configurable resolution
- [x] Transparent background in PNG export
- [x] Download SVG file
- [x] Canvas grid/dot pattern (toggleable)
- [x] Zoom level indicator
- [x] Keyboard shortcut hints in tooltips

## v0.9.1 — Hatched Drop Shadow `done`

- [x] Hatched drop shadow for rectangles and ellipses
- [x] Shadow toggle button in toolbar (shown for rectangle/ellipse tool or selected shapes)
- [x] Adjustable shadow offset slider (2–20px range)
- [x] Rough hand-drawn hatch lines (via roughjs) clipped to shape boundary
- [x] Shadow state synced from selected object on selection change
- [x] Shadow included in SVG and PNG export
- [x] Shadow persisted with last-used styles (localStorage)
- [x] Undo/redo support for shadow toggle and offset changes

## v0.9.2 — Testing & CI `done`

- [x] Vitest unit test suite (66 tests)
- [x] Bounding box utility tests (rect, line, curved arrow, compute, intersect, world bounds)
- [x] Resize logic tests (rectangle, line, group recursive)
- [x] Zustand store action tests (undo/redo, delete, duplicate, copy/cut/paste, z-order, group/ungroup)
- [x] GitHub Actions CI workflow (type-check + build + test on push/PR)
- [x] Playwright E2E tests (22 tests) — tool selection, shape drawing, undo/redo, delete, selection, duplicate, toolbar, zoom
- [x] CI runs E2E tests (Chromium-only)
- [x] Cloudflare Pages hosting with auto-deploy from GitHub Actions on push to master

## v0.9.3 — Mobile-Accessible Action Buttons `done`

- [x] Undo button in toolbar (wired to existing undo, disabled when no history)
- [x] Redo button in toolbar (wired to existing redo, disabled when no future)
- [x] Select All button in toolbar utility section (switches to pointer, selects all objects)
- [x] Delete button in SelectionActionBar (trash icon, removes selected objects)

## v0.9.4 — Image Import + ZIP Save/Load `done`

- [x] Import raster images (PNG, JPG, etc.) onto canvas via toolbar button
- [x] Images are selectable, movable, and resizable like other objects
- [x] Images work inside groups (group/ungroup)
- [x] SVG export embeds images as base64 `<image>` elements
- [x] PNG export includes images (via SVG pipeline)
- [x] Save as ZIP when images present (images/ folder + project.json)
- [x] Load ZIP files (restores base64 data URLs from image files)
- [x] localStorage auto-save works with images (base64 inline)
- [x] Unit tests for image resize, store operations, and SVG export (19 new tests, 66 total)

## v0.9.5 — Project Name + .lumi Extension `done`

- [x] Project name state (`projectName`) with `'Untitled'` default
- [x] Prompt for project name on save (pre-filled, cancel aborts)
- [x] Custom `.lumi` file extension (ZIP internally, file picker uses ZIP MIME types for browser compatibility)
- [x] Project name displayed at bottom-left of canvas (clickable to rename)
- [x] Project name persisted in localStorage and in exported `.lumi` files
- [x] Import restores project name (falls back to filename without extension)
- [x] "New Drawing" resets project name to `'Untitled'`
- [x] Unit tests for project name (4 new tests, 74 total)

## v0.9.6 — Polygon Tool `done`

- [x] Polygon drawing tool — multi-click to place vertices, double-click or Enter to close
- [x] Sketchy polygon rendering (roughjs `generator.polygon()`)
- [x] Live preview during drawing (dashed lines, vertex dots, close preview)
- [x] Escape cancels in-progress polygon drawing
- [x] Post-creation vertex editing — drag vertices to reshape
- [x] Add vertices by clicking edge midpoints
- [x] Delete vertices via X button or Delete/Backspace key (minimum 3 enforced)
- [x] Fill color, opacity, and hatched drop shadow support
- [x] Resize scales all vertices proportionally
- [x] SVG/PNG export includes polygon (fill, stroke, shadow)
- [x] Keyboard shortcut (S → polygon)
- [x] Toolbar button (pentagon icon) with fill/shadow/opacity controls
- [x] Unit tests (80 total, 7 new polygon tests)

## v0.9.7 — Object Rotation `done`

- [x] `rotation?: number` (degrees) on all 9 object types
- [x] Rotation handle with curved-arrow icon on selected objects (above bounding box)
- [x] Drag rotation handle to rotate — smooth rotation with 45° angle snapping (5° threshold)
- [x] Rotation works on all object types: shapes, pen strokes, text, images, groups, polygons, lines, arrows
- [x] Rotated overlay — selection handles visually match object rotation for single selection
- [x] Resize works correctly on rotated objects (cursor un-rotated before scale computation)
- [x] SVG/PNG export includes rotation transforms and correct viewBox bounds
- [x] Copy/paste/duplicate preserves rotation (via `structuredClone`)
- [x] Ungroup composes parent group rotation onto children
- [x] Marquee selection uses rotated bounds for accurate hit detection
- [x] Rotated text editing — textarea CSS rotation matches canvas angle
- [x] Selection action bar positions correctly below rotated objects

## v1.0 — Launch

- [ ] Performance tuning (500+ objects smooth)
- [ ] Documentation and contribution guidelines
- [ ] Public release


Most Cost-Effective Stack

  1. Hosting — $0/month

  ┌──────────────────┬─────────────────────┬───────────────┬───────────────────────────────────────────────────────┐
  │      Option      │      Free Tier      │ Custom Domain │                         Notes                         │
  ├──────────────────┼─────────────────────┼───────────────┼───────────────────────────────────────────────────────┤
  │ Cloudflare Pages │ Unlimited bandwidth │ Yes (free)    │ Best free tier, also gives free CDN + DDoS protection │
  ├──────────────────┼─────────────────────┼───────────────┼───────────────────────────────────────────────────────┤
  │ Vercel           │ 100GB bandwidth     │ Yes (free)    │ Great Vite/React integration                          │
  ├──────────────────┼─────────────────────┼───────────────┼───────────────────────────────────────────────────────┤
  │ Netlify          │ 100GB bandwidth     │ Yes (free)    │ Similar to Vercel                                     │
  └──────────────────┴─────────────────────┴───────────────┴───────────────────────────────────────────────────────┘

  Recommendation: Cloudflare Pages. Unlimited bandwidth on free tier, and if you buy the domain through Cloudflare Registrar, they sell domains at wholesale cost (~$9-10/year for
  .com).

  2. Auth + Database — $0/month (at your scale)

  Supabase is the best bang-for-buck here. Free tier gives you:
  - 50,000 monthly active users (auth)
  - 500MB Postgres database (for saving drawings, user profiles)
  - 1GB file storage (if you want image exports)
  - Built-in Row Level Security so users can only access their own data
  - Email/password, Google, GitHub OAuth — all built-in

  This handles user registration and storing user drawings server-side (replacing or complementing your planned localStorage persistence in v0.7).

  3. Subscriptions — $0/month fixed, pay-per-transaction

  Stripe is the standard:
  - No monthly fee
  - 2.9% + $0.30 per transaction
  - Stripe Checkout gives you a hosted payment page (no custom UI needed)
  - Subscription management, invoicing, customer portal all included
  - Supabase has a well-documented pattern for syncing Stripe subscription status via webhooks

  You'd gate premium features client-side based on a subscription_tier column in your Supabase users table.

  4. Domain — ~$10-15/year

  Only real fixed cost. Cloudflare Registrar or Namecheap for cheapest .com pricing.

  ---
  Total Fixed Cost

  ┌───────────────────────────────────┬───────────────────────────────┐
  │               Item                │             Cost              │
  ├───────────────────────────────────┼───────────────────────────────┤
  │ Domain                            │ ~$10-15/year                  │
  ├───────────────────────────────────┼───────────────────────────────┤
  │ Hosting (Cloudflare Pages)        │ $0                            │
  ├───────────────────────────────────┼───────────────────────────────┤
  │ Auth + DB (Supabase free tier)    │ $0                            │
  ├───────────────────────────────────┼───────────────────────────────┤
  │ Payments (Stripe)                 │ $0 fixed, 2.9%+$0.30 per sale │
  ├───────────────────────────────────┼───────────────────────────────┤
  │ Total until you have paying users │ ~$1/month                     │
  └───────────────────────────────────┴───────────────────────────────┘

  ---
  What Premium Features Could Look Like

  Free tier (no login required):
  - Full drawing tools as they exist today
  - Export SVG/PNG
  - Local save/load

  Free tier (logged in):
  - Cloud save (up to N drawings)
  - Access from any device

  Paid tier:
  - Unlimited cloud drawings
  - Icon library (your planned v0.4)
  - Custom fonts / advanced styling
  - Collaboration (future)
  - Remove watermark on exports

  ---
  Backend Needs

  For Stripe webhooks, you'd need a small server-side function. Both Cloudflare Pages (Workers) and Vercel (Edge Functions) give you this for free — no separate backend needed. One
   small function to handle checkout.session.completed and update the user's subscription status in Supabase.

  ---
  Want me to plan out the implementation for any of these (e.g., setting up Supabase auth integration, or the Stripe subscription flow)?