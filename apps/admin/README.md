# U:DO Craft — Admin Dashboard

Internal dashboard for managing the U:DO Craft print-on-demand business.

**URL:** [admin.u-do-craft.store](https://admin.u-do-craft.store)
**Port (local):** 3001

---

## What it does

The admin app is the operational hub. Everything that happens after a customer submits an order flows through here.

### Routes

| Route | Purpose |
|---|---|
| `/` | Dashboard — KPI badges (revenue, orders, conversion) |
| `/orders` | Kanban board — full order lifecycle management |
| `/orders/new` | Create a new order manually (admin-initiated) |
| `/products` | Product catalog — color variants, print zones, pricing |
| `/categories` | Category management |
| `/materials` | Color/material swatches |
| `/clients` | Customer list |
| `/messages` | Chat with customers (Telegram integration) |
| `/analytics` | Revenue, order, and conversion metrics with charts |
| `/settings` | Notification preferences |

All routes require Supabase auth. Unauthenticated users are redirected to `/login` by middleware.

---

## Key Features

### Orders Kanban (`/orders`)

Drag-and-drop board with columns: `draft → new → in_progress → production → completed → archived`

- Mouse and touch drag-and-drop
- Real-time updates via Supabase Realtime subscription
- Resizable detail drawer — click any order to see full details
- Order tags: Paid 100%, Paid 50%, Urgent, VIP, New Client
- Touch ghost with brand color border during drag

### Order Creator (`/orders/new`)

Full customizer flow for admin-initiated orders:

1. Select product, color variant, size
2. Open canvas editor (Fabric.js) — upload design, position, resize, rotate
3. Add text layers with font/color/curve controls
4. Select print type per layer (DTF, embroidery, screen, sublimation, patch)
5. Quantity stepper with live discount grid and price breakdown
6. Add to cart → repeat for multiple items
7. Fill customer data, delivery info, tags, notes
8. Submit → creates lead + order_items in Supabase

### Canvas Editor

Built on Fabric.js 5. Features:
- Image layer upload with background removal (`@imgly/background-removal`)
- Text layers with 15 Cyrillic-compatible Google Fonts
- Text curve (arc up/down)
- Per-layer print type and size selection
- Drag-and-drop layer reordering (LayersPanel)
- Mockup capture for cart preview

### Analytics (`/analytics`)

Charts built with Recharts:
- Revenue over time
- Orders by status
- Conversion funnel
- Top products

### Messages (`/messages`)

Bidirectional chat with customers via Telegram bot integration. Messages stored in `messages` table, synced via webhook.

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + Shadcn/ui |
| Canvas | Fabric.js 5 |
| Charts | Recharts 2 |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Validation | Zod via `@udo-craft/shared` |
| Notifications | Sonner |
| Monitoring | Sentry 10 |
| Analytics | Microsoft Clarity |

---

## Admin UI Memory

We think in atomic consistency: every repeated admin surface should share the same parent-page anatomy unless a workflow has a strong reason to diverge.

- Parent admin pages with sections or tabs use the catalog pattern: title first, tabs immediately after the title in the header row, and page-level actions on the right.
- Tabbed parent pages expose one context-aware primary CTA in the header, such as `Додати товар`, `Нова категорія`, `Додати колір`, or `Нова таблиця`. Avoid repeating the same create action inside the active tab unless it is an empty-state recovery action.
- Keep vertical space tight. Do not add a separate full-width tab row under the title for parent admin pages.
- Use the shared Shadcn/Base UI primitives for selects, dropdown menus, inputs, buttons, tabs, and dialogs. Avoid native selects or one-off dropdown implementations for admin controls.
- Default admin control height is 40px. Buttons, inputs, and select triggers should align at 40-48px; use icon-only buttons at the same floor unless the control is inside a dense table row and has a specific reason to be smaller.

### Key dependencies

```json
"fabric": "^5.5.2"              — canvas editor
"recharts": "^2.12.0"           — analytics charts
"@imgly/background-removal"     — AI background removal
"@supabase/ssr"                 — Supabase SSR client
"@udo-craft/shared"             — shared schemas, constants, useCustomizer hook
"@udo-craft/ui"                 — MockupViewer, BrandLogo, ClarityInit
"emoji-picker-react"            — emoji support in messages
"next-themes"                   — dark/light mode
```

---

## Local Development

```bash
# From repo root
npm install
npm run dev:admin
# → http://localhost:3001
```

Requires `apps/admin/.env` with:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3001
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
```

---

## API Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/leads` | List all leads with order items |
| POST | `/api/leads` | Create lead (validated by `CreateLeadSchema`) |
| GET/PATCH/DELETE | `/api/leads/[id]` | Single lead operations |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| GET/PATCH/DELETE | `/api/products/[id]` | Single product |
| GET/POST | `/api/materials` | Materials CRUD |
| GET/POST | `/api/categories` | Categories CRUD |
| GET/POST | `/api/print-zones` | Print zones |
| GET/POST | `/api/print-type-pricing` | Pricing tiers |
| POST | `/api/upload` | Upload file to Supabase Storage |
| GET | `/api/analytics/dashboard` | Analytics data |
| GET | `/api/dashboard/badges` | KPI badge counts |
| GET | `/api/messages` | Chat messages |
| POST | `/api/telegram/webhook` | Telegram webhook receiver |
| GET | `/api/telegram/setup` | Register Telegram webhook (run once after deploy) |

---

## Deployment

Part of the monorepo — deploys automatically when you push to `main`.

```bash
git push origin main   # deploys to admin.u-do-craft.store
```

See the root [README.md](../../README.md) and [DEPLOYMENT.md](../../DEPLOYMENT.md) for full details.
