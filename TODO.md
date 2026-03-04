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

## v1.0 — Launch

- [ ] Performance tuning (500+ objects smooth)
- [ ] WCAG 2.1 AA accessibility
- [ ] PWA / service worker for offline use
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