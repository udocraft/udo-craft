# Admin & order flow audit — 2026-11-25

Branch `feat/admin-overhaul` from `origin/main` @ 4b9b5f0. Read-only audit by file reads and grep; no runtime, live-DB or browser checks. "Verified" = re-read by the lead; others are scout findings with file:line.

## 1. Order contract (client ↔ admin) — fix first

| # | Sev | Finding | Evidence | Proposed fix |
|---|---|---|---|---|
| O1 | High, verified | Stored total excludes print cost; cart shows (unit + print) × qty. COD waybill charges the stored total. | client `api/leads/route.ts:64-70`, `CartSummary.tsx:84-87`, `nova-poshta-waybill/route.ts` | Server computes print cost from layer price rules; write `order_items.print_cost_cents` |
| O2 | High, verified | Volume discount: server hardcodes 5/12/15 %; UI uses per-product `discount_grid` (admin default 5/10/15). Qty 50 → UI 10 %, server 12 %. | `client/src/lib/order-pricing.ts:2-7`, `useCustomizerState.ts:151-162`, `ProductForm.tsx:119` | One tier source read from the product, used by UI and API; delete unused `DISCOUNT_TIERS` |
| O3 | High, verified | Public POST accepts any `status` from the body, e.g. `completed`, which counts as paid revenue. | client `api/leads/route.ts:75`, `shared/index.ts:720`, `analytics/dashboard/route.ts:105-107` | Force `status: "new"` server-side |
| O4 | High | Admin create drops delivery/comment/deadline/edrpou/files/NP details and rejects social-only contacts. | admin `api/leads/route.ts:53-58`, `shared/index.ts:719-733` | Admin schema with those fields; email/phone required per chosen contact |
| O5 | High, unconfirmed | `leads.tags` written but not in schema or migrations. If missing in prod, KeyCRM sync fails. | `keycrm/sync/route.ts:176` | Check prod; add migration if absent |
| O6 | Med | No transition guard, no field allowlist on PATCH. | admin `api/leads/[id]/route.ts:51-55` | Shared transition map + allowlist |
| O7 | Med | Public create not atomic/idempotent; orphan lead on item failure, duplicates on retry. | client `api/leads/route.ts:82-112` | Delete-on-failure or RPC; idempotency key |
| O8 | Med | KeyCRM sync overwrites status/total and re-inserts items, breaking ERP production links. | `keycrm/sync/route.ts:172-192` | Sync only changed remote fields; upsert items |
| O9 | Med | Status change UI can diverge from DB; list page writes no audit message. | `orders/[id]/page.tsx:239-260`, `orders/page.tsx:193-206` | One shared `useLeadStatus` mutation |
| O10 | Med | Lead status and ERP production not linked. | `erp/production-orders/route.ts:55-75` | Decision needed (Q2) |
| O11 | Med | Hard delete on leads cascades items. | `api/leads/[id]/route.ts:83-86` | Archive instead of delete |
| O12 | Med | Fiscal draft sums undiscounted items vs discounted total. | `fiscal-check/route.ts:25-30` | Use the same line-total function |
| O13 | Med | Telegram mini-app stores client prices. | `telegram-mini-app/.../api/leads/route.ts:37,59` | Re-price server-side |
| O14 | Low | Status labels defined 5+ times; `draft` missing in cabinet, messages, mini-app. | `cabinet.tsx:61-71`, `messages/page.tsx:79` | One `LEAD_STATUS_LABELS` in shared |
| O15 | Low | Lead tables exist only in `schema.sql`, not migrations. | `schema.sql:53-87` | Baseline migration |
| O17 | Low | Fractional cents sent to INTEGER column on admin create. | `orders/new/page.tsx:135` | `Math.round` |

Canonical contract (proposal): statuses unchanged (`draft, new, in_progress, production, completed, archived`), owned by `packages/shared`: `LeadStatusEnum`, `LEAD_STATUS_LABELS`, `LEAD_STATUS_TRANSITIONS`, `AdminLeadUpdateSchema`. Public create = `new` only.

## 2. Pages, data loading, performance

- 42 pages, 59 API routes. One `loading.tsx`, no `error.tsx` under `(dashboard)`; most ERP list/detail pages lack empty/error states.
- Unbounded loads: `/api/leads` defaults to 5000 rows + items (`api/leads/route.ts:27-31`); `/clients` selects all leads from the browser (`clients.tsx:110`); messages loads all leads then all their messages (`messages/page.tsx:120-150`, `api/messages/route.ts:28-40`); `/api/users` loads all leads + messages for stats.
- N+1 writes: ERP receipts (`:63-72`), transfers (`:58`), variant-sku sync (`:55`), KeyCRM sync (`:182-226`).
- Duplicates: `/products` and `/catalog` render the same tabs; two empty-state components; ~14 components with no static importers (verify dynamic imports before deleting).
- Nav and command menu: no broken links.
- Files > 600 lines: product-canvas 996, orders/page 870, DrawingModal 826, orders/[id] 809, messages 767.

## 3. Design system, mobile, a11y

- Three status systems (`status-badge`, `ui/status-indicator`, `ui/badge`) plus local label/colour maps.
- 141 hex literals, 84 raw palette classes, 8 arbitrary z-index, 219 arbitrary `text-[9-11px]`; Toaster hardcodes colours (`layout.tsx:19`). No z-index tokens. `tailwind.config.ts` likely unused under Tailwind v4.
- `tabular-nums` missing on orders list totals and analytics (21 of 28 number-formatting files).
- Mobile: 14 tables, none with a card layout; 21 icon buttons overridden below 44 px; 4 `100vh`/`h-screen`.
- Motion: no `prefers-reduced-motion`; 97 `transition-all`; sidebar animates width/left; 5 durations > 300 ms.
- A11y: ~37 icon-only buttons without `aria-label` (line grep); sidebar has no `<nav>`; 20 emojis in admin UI.
- Sidebar role comes from `user_metadata` (`layout.tsx:14`) — display only; authorization ignores it (`lib/authz/resolve.ts:27`). Low.

## 4. Proposed waves (one PR each)

1. **Order integrity** — O1, O2, O3, O4, O6, O7, O9, O12, O14, O17; shared status contract. Server + shared + admin order pages.
2. **Data loading** — paginate `/api/leads`, clients, messages; fix N+1 writes; `/api/users` stats via aggregate query; KeyCRM sync (O8).
3. **Admin primitives** — single StatusBadge, EmptyState, numeric `tabular-nums` cell, tokens for z-index/toaster, reduced motion, `<nav>`, aria-labels, 44 px targets, emoji removal.
4. **Page states & mobile** — `error.tsx`/`loading.tsx` per section, empty states for ERP pages, table → card layouts on mobile.
5. **Cleanup** — confirmed-dead components, `/products` vs `/catalog`, stale `lib/api/validation.ts`/`types.ts`, baseline migration (O15).

Out of scope unless decided: shipping/returns/refunds state machine (not in this product), lead ↔ ERP automation (O10).
