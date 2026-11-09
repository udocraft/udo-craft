# System Redesign & Execution Master Plan

Scope: the public storefront `apps/client` (Next.js 14.2 App Router, Tailwind 4, next-intl, Supabase). The admin app and the Telegram mini app are out of scope, except where they share primitives (`packages/ui`).
Audit date: 2026-11-09, branch `fix/security-hardening` (35 files uncommitted at the time of audit).
Method: static reading of the code and grep counts. Nothing was run in a browser and no Lighthouse numbers were taken. Anything marked **(verify)** is a guess that needs a check before work starts.

---

## 0. Premise correction (read first)

The brief asked to position the site as an "elite Marketing Team & Product Engineering Organization". **That is not this product.** U:DO CRAFT is a B2B corporate-merch / print-on-demand store (`docs/ARCHITECTURE.md`, root `metadata`: "B2B merch platform"), with a product customizer, cart, checkout, a customer cabinet and 11 locales. Repositioning it as an agency would throw away the catalog, the customizer and the checkout funnel, which are the business.

This plan keeps the real positioning and applies the brief's standards to it: a high-converting **B2B merch storefront** with a product-led hook (the live customizer as the micro-demo).

The requested skills `/front-end` and `/design` do not exist in this environment. `ponytail` (smallest complete change) was applied, and the repo's own `docs/UI_UX_STANDARDS.md` was used as the design baseline.

---

## 1. Executive Summary & Audit Findings

### 1.1 Current state

| Area | What is there (verified) |
|---|---|
| Stack | Turborepo + npm workspaces. `apps/client`: Next 14.2.35, React 18, Tailwind 4 (`@theme inline`), next-intl 3 (`localePrefix: "as-needed"`, 11 locales), Supabase SSR, framer-motion 12, fabric 5, Sentry, Vercel Analytics, Clarity (consent-gated). |
| Routes | `/`, `/products/[slug]`, `/customize/[productId]`, `/order`, `/checkout`, `/cabinet` (+ `login`, `register`, `messages`, `orders/[id]`, `settings`), `/popup`, `/privacy`, `/terms`, 11 POST API routes. |
| Home | `HomeClient` (`"use client"`) renders up to 16 sections in a CMS-controlled order (`cms_published.home_layout`). |
| Primitives | Two copies of shadcn primitives: `apps/client/src/components/ui` (21 files, imported by 22 files) and `packages/ui/components/ui` (27 files, imported by 6). `button`, `dialog`, `command`, `dropdown-menu` differ between the two. |
| Tokens | Client tokens live in `apps/client/src/app/globals.css` (`@theme inline`, oklch, light only). |
| Good already | Global `:focus-visible` ring, `prefers-reduced-motion` in CSS **and** `MotionConfig reducedMotion="user"`, 44 px `.hit-44` utility, hreflang via `lib/seo.ts#pageAlternates`, Organization/WebSite/FAQ JSON-LD on home, Product JSON-LD on PDP, security headers (HSTS, nosniff, XFO, Referrer-Policy, Permissions-Policy), `/api` rate limit, lazy `jspdf`/`confetti`/`snd-lib`, Clarity behind consent. |

### 1.2 Flaws found (with evidence)

**Design system**
1. **The brand font is never loaded.** `body` uses `font-sans` → `var(--font-sans)`, but `--font-sans` is not defined anywhere and `src/app/fonts/GeistVF.woff` / `GeistMonoVF.woff` are not imported. Every page renders in the OS system font.
2. **Three token sources disagree.** `apps/client/src/app/globals.css` (primary hue 270), `packages/styles/globals.css` (Tailwind 3 syntax, hue 264, neutral greys) and `packages/config/tailwind.ts` (Tailwind 3 config). The client imports neither package file.
3. **Off-token colour is common.** 140 hex literals in `.tsx`, 53 arbitrary colour classes (`bg-[#0d1020]`, `bg-[#5c57ff]`…), 93 raw palette classes (`text-zinc-500`…), 355 `bg/text-white|black`. The hero CTA `#5c57ff` is not the `--color-primary` used everywhere else, so the brand has two blues. Top offenders: `DrawingModal` (32), `CustomizerPreviewSection` (11), `ProductCanvas` (9), `ProductCardDetailed` (8), `HeroSection` (7).
4. **No type scale.** 107 arbitrary sizes (`text-[9px]` ×16, `[10px]` ×49, `[11px]` ×41, `[8px]` ×1). 9–10 px text fails legibility. The hero H1 size is an inline `style={{ fontSize: clamp(...) }}`. Headings use `text-3xl`…`text-8xl` with no rule.
5. **Seven radii** in use (`full` 228, `xl` 80, `lg` 73, bare `rounded` 62, `2xl` 49, `md` 25, `3xl` 8).
6. **Containers disagree with the standard.** `max-w-6xl` is used 31 times, `max-w-7xl` 3 times, while `UI_UX_STANDARDS.md` mandates `max-w-7xl`.
7. **Dead code:** `SiteFooter`, `AnimatedButton`, `AboutSection`, `HowItWorksSection`, `LeadMagnetSection`, `PopupSection`, `ServicesSection` have no importers.

**UX / marketing**
8. **The home page is too long:** up to 16 sections (Hero, SocialProof, Problem/Solution, Stats, Collections, Process, Box, PopupStand, Subscription, Designer, CustomizerPreview, Trust, Comparison, FAQ, Final CTA, Contact). Several make the same claim (Problem/Solution vs Comparison, Stats vs Trust).
9. The hero skip link points to `#catalog`, not to `<main>`; other pages have no skip link.

**Security**
10. **Stored XSS path on the PDP:** `products/[slug]/page.tsx:91` writes `JSON.stringify(jsonLd)` into a `<script>` without escaping `<`. A product name containing `</script>` breaks out. The home page already escapes it; the PDP does not.
11. **Unsanitised CMS HTML:** `ContentPageShell` renders `cms_published.body.html` (privacy/terms) via `dangerouslySetInnerHTML` with no sanitiser. Risk is a compromised admin account → script on the public site.
12. **Remote code at runtime:** `lib/remove-bg-client.ts` loads `https://esm.sh/@imgly/background-removal@1.7.0` through `new Function("url","return import(url)")`. That is an unpinned-integrity third-party script, and it forces `'unsafe-eval'` + `esm.sh` into the CSP. The same package is already in `package.json`.
13. **CSP is report-only with no report endpoint** (no `report-uri`/`report-to`), so violations go nowhere; it also allows `'unsafe-inline' 'unsafe-eval'`.
14. **No schema validation on 10 of 11 POST routes** (no zod/`parse` found in `leads`, `upload`, `cabinet/upload`, `cabinet/messages`, `auth/*`, `ai/generate`, `customizer-shares`). They may validate by hand **(verify)**; `packages/shared` already has zod schemas.

**Performance**
15. **The whole landing page hydrates.** `HomeClient` is a client component, so all 16 sections ship as JS even though most are static text. `dynamic(..., { ssr: true })` splits chunks but still hydrates them. 122 files are `"use client"`; 35 import framer-motion.
16. Hero video (`public/hero-video.mp4`, 1.7 MB) autoplays at 14 % opacity on every device, no poster, no `Save-Data`/mobile skip.
17. 16 raw `<img>` tags; only 5 files use `next/image`; `images.formats` (AVIF/WebP) is not set.

**Accessibility & SEO**
18. **SSR HTML has no `lang`.** Root layout renders `<html suppressHydrationWarning>` without `lang`; `HtmlLang` sets it on the client after hydration. Screen readers and crawlers see no language on first load.
19. 11 lines with `outline-none` and no ring on the same line **(verify each; the ring may be on another line)**.
20. `sitemap.ts` lists 4 hard-coded English URLs, includes the auth-gated `/cabinet`, and omits products and the 10 other locales. `robots.ts` allows `/api` and `/cabinet`. No page sets `noindex`.
21. OG image is `/logo.png` with `twitter: summary`; no 1200×630 social cards. Root layout metadata duplicates the locale layout's.

### 1.3 Target vision

A fast, single-system B2B merch storefront: one token file, one primitive library, a home page that moves a buyer from *"what is this"* to *"design my merch"* or *"get a quote"* in ~9 sections, the customizer as the interactive proof, server-rendered marketing content, and an enforced CSP.

---

## 2. Design System Architecture (Tokens & Guidelines)

One source of truth: `apps/client/src/app/globals.css` `@theme`. Promote it to `packages/styles` only when admin adopts it (Phase 2, optional). Delete `packages/config/tailwind.ts` and the old `packages/styles/globals.css` once admin is confirmed not to use them **(verify)**.

### 2.1 Typography

- **Family:** Geist Sans + Geist Mono, already in the repo. Load with `next/font/local` in the locale layout, expose as `--font-sans` / `--font-mono`, `display: "swap"`, `adjustFontFallback`. No new font purchase needed. (Trade-off: Geist is common; a bespoke display face can come later for headings only.)
- **Scale** (add to `@theme`, fluid via `clamp`, line-height and tracking baked in):

| Token | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `text-display` | clamp(2.75rem, 6.2vw, 6.5rem) | 0.95 | -0.05em | Hero H1 only |
| `text-h1` | clamp(2.25rem, 4vw, 3.5rem) | 1.05 | -0.035em | Page titles |
| `text-h2` | clamp(1.75rem, 3vw, 2.5rem) | 1.1 | -0.03em | Section titles |
| `text-h3` | 1.25rem | 1.3 | -0.015em | Card titles |
| `text-h4` | 1.0625rem | 1.4 | -0.01em | Sub-heads |
| `text-lede` | 1.125rem | 1.6 | 0 | Section intro |
| `text-base` | 1rem | 1.6 | 0 | Body |
| `text-sm` | 0.875rem | 1.5 | 0 | UI, secondary |
| `text-xs` | 0.75rem | 1.4 | 0 | Captions, meta (**floor**) |
| `text-eyebrow` | 0.75rem | 1 | 0.16em, uppercase, 600 | Section labels |
| `font-mono` | 0.875rem | 1.5 | 0 | SKUs, order IDs, prices in tables |

- **Rule:** nothing below 12 px. Replace all `text-[8–11px]` with `text-xs` or `text-eyebrow`. Lint for `text-\[` in CI (grep in `lint-staged`).
- H5/H6 are not needed on a storefront; use `h4` styles if a deeper level appears.

### 2.2 Colour (semantic, oklch)

Keep the existing names (they are shadcn-compatible and used 1,675 times). Add only what is missing:

| Token | Value (start) | Note |
|---|---|---|
| `--color-primary` | oklch(0.48 0.22 270) | Keep. **Retire `#5c57ff`**: pick one brand blue (decision D3). |
| `--color-primary-hover` | primary −0.04 L | Replaces ad-hoc `hover:bg-[#716dff]` |
| `--color-ink` | oklch(0.14 0.03 270) ≈ `#0d1020` | Dark marketing surfaces; replaces `--dark-blue`, `--color-surface-dark`, `bg-[#0d1020]` |
| `--color-ink-2` | oklch(0.18 0.03 270) | Raised dark surface |
| `--color-surface-muted` | = current `--color-muted` | Alias for section bands |
| `--color-success` / `-warning` / `-info` (+ `-foreground`) | oklch greens/ambers/blues at AA | Order status, toasts, forms |

- **Dark sections, not dark mode.** Add an `.inverse` (or `data-surface="dark"`) scope that remaps `background/foreground/muted-foreground/border` to ink values, so a dark hero uses `bg-background text-foreground` inside the scope instead of `text-white/70`. A site-wide dark theme is not requested by the business and doubles QA; skip it.
- **Canvas colours are data, not tokens.** `DrawingModal` and `ProductCanvas` palettes (garment/ink swatches) stay as hex in one constants file.
- Contrast: every text/background pair ≥ 4.5:1 (≥ 3:1 for ≥ 24 px). Check `text-white/50–70` on ink and `muted-foreground` on `muted`.

### 2.3 Spacing, containers, grid

- **4 pt base** = Tailwind's default spacing scale; no change. Ban arbitrary spacing (11 uses now).
- Rhythm tokens: `--spacing-section: clamp(4rem, 8vw, 7.5rem)` (section padding-block), `--spacing-gutter: 1rem → 1.5rem` (`px-4 md:px-6`, as the standard says).
- **Containers:** `Container` primitive with two widths: `default = max-w-6xl` (already the dominant value, 31 uses) and `prose = max-w-3xl`. Update `UI_UX_STANDARDS.md` from `7xl` to `6xl` rather than re-laying out 31 sections.
- Grid: 12-col CSS grid only where a section needs asymmetry; otherwise `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with `gap-4 md:gap-6`.

### 2.4 Radius & elevation

Three radii, named by role: `--radius-control: 9999px` (buttons, inputs, badges, per the standard), `--radius-card: 1rem` (cards, sheets), `--radius-media: 1.5rem` (images, video, large panels). Shadows: `shadow-sm` (cards), `shadow-lg` (popovers, sheets), one brand glow token for the primary CTA instead of the inline `shadow-[0_12px_40px_rgba(...)]`.

### 2.5 Primitive inventory

| Primitive | Action |
|---|---|
| Button, Input, Textarea, Select, Badge, Card, Dialog, Sheet, Tabs, Tooltip, Popover, Dropdown, Skeleton, Sonner | **One copy in `packages/ui`.** Merge the client's diverging `button`, `dialog`, `command`, `dropdown-menu` into it, then re-export from `apps/client/src/components/ui/index.ts` so the 22 importers don't change. Fix Button `asChild` (it is swallowed today; link buttons need base-ui `render` + `nativeButton={false}`). |
| Button variants | `primary`, `secondary`, `ghost`, `outline`, `inverse` (for dark sections), `link`; sizes `sm` 36, `md` 44 (default), `lg` 52. |
| `Container`, `Section` (`tone="default|muted|inverse"`, `id`), `SectionHeader` (eyebrow + title + lede + optional action) | **New, small.** Every home section re-implements these today. |
| `SiteHeader`, `FooterSection` | Keep as the only header/footer. Delete `SiteFooter`. |
| Dead files (7) | Delete after a final grep. |

---

## 3. Route & Component Restructuring Blueprint

### 3.1 Global layout

- Move `<html lang={locale}>` and `<body>` into `app/[locale]/layout.tsx` (root layout returns `children` only). This puts `lang` in SSR HTML; delete `HtmlLang`.
- Add `<a href="#main" class="skip-link">` in the locale layout and `<main id="main">` on every page shell. The hero's `#catalog` link becomes a normal in-page anchor.
- Header: sticky, transparent over the hero, solid after scroll; one primary CTA ("Design your merch") and a secondary ("Get a quote"); cart and account icons at 44 px; language switcher in a menu on mobile.
- Footer: one `FooterSection`, link columns from i18n, legal, socials, locale switcher.

### 3.2 Home page (B2B funnel, 16 → 9 sections)

| # | Section | Built from | Job |
|---|---|---|---|
| 1 | Hero | `HeroSection` | Value prop in one line, two CTAs, proof chip ("X teams branded"), product visual. Server-rendered text; video is decoration. |
| 2 | Logo / proof bar | `SocialProofBar` | Client logos. |
| 3 | Collections | `CollectionsSection` | Shop by category → PDP. |
| 4 | Live customizer demo | `CustomizerPreviewSection` | The product-led hook: drop a logo on a tee in-page, CTA to `/order`. |
| 5 | How it works | `ProcessSection` | 4 steps, lead time, MOQ. |
| 6 | Services | `BoxOfTouchSection` + `PopupStandSection` + `SubscriptionSection` → 3 cards | Upsell lines, one section instead of three. |
| 7 | Why us | `ProblemSolutionSection` + `ComparisonSection` + `StatsSection` + `TrustSection` | One proof block: comparison table, numbers, testimonials. |
| 8 | FAQ | `FaqSection` | Objections; keeps FAQ JSON-LD. |
| 9 | Final CTA + contact | `FinalCtaSection` + `ContactSection` | Quote form + direct channels. |

`DesignerSection` folds into #4 or #6 (decision D2). The CMS `home_layout` keeps working: map retired ids to their merged section so old layouts don't render blanks.

### 3.3 Other pages

| Route | Plan |
|---|---|
| `/products/[slug]` (697-line client file) | Server-render title, description, price, specs; keep gallery, variant picker and add-to-cart as client islands. Sticky mobile CTA bar. Escape JSON-LD (P0). |
| `/order`, `/customize/[productId]` | Keep logic; restyle toolbars with tokens; move `DrawingModal`/`ProductCanvas` colours to constants. Lazy-load fabric only on this route (already route-scoped; **verify** it is not in the shared chunk). |
| `/checkout` | Single column on mobile, order summary collapsible, inline validation with the shared zod schemas, clear error and success states. |
| `/cabinet/*` | Already rebuilt on 2026-11-03 (sidebar shell). Only apply tokens; `noindex`. |
| `/privacy`, `/terms` | `ContentPageShell` + sanitised HTML + `cms-prose` on the type scale. |
| `/popup` | Audit purpose with the owner **(verify)**; `PopupSection` is unused. |
| Optional | `/products` index page for SEO (catalog is only a home anchor today). Only if organic search is a goal. |

### 3.4 Motion system

- Tokens: `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`; durations `fast 150ms` (hover, press), `base 200ms` (already the most used, 70×), `slow 320ms` (sheets, dialogs), `reveal 500ms` (scroll-in).
- Patterns: one `FadeUp` (exists) for scroll reveal, 8–12 px travel, stagger 60 ms, once only. Press = `scale(0.98)`. Sheets slide 100 % with `slow`. No parallax, no motion on scroll position.
- Use CSS transitions for hover/press; keep framer-motion for presence (dialogs, cinema overlay, cart). Goal: fewer than 35 files importing framer.
- Reduced motion is already handled in both CSS and framer; keep it and test it.

---

## 4. Technical Gaps & Risk Mitigation

### 4.1 Security hardening (in priority order)

| P | Fix | Where | Size |
|---|---|---|---|
| P0 | Escape `<` in PDP JSON-LD (same `.replace(/</g, "\\u003c")` as home); better: one `jsonLdScript()` helper used by both | `products/[slug]/page.tsx:91` | XS |
| P0 | Sanitise CMS HTML with an allowlist (headings, p, lists, a[href=http(s)/mailto], strong, em) on render **and** on admin save | `ContentPageShell`, admin CMS save | S |
| P0 | Replace the esm.sh runtime import with `await import("@imgly/background-removal")` (already a dependency); remove `esm.sh` from CSP | `lib/remove-bg-client.ts`, `next.config.mjs` | S |
| P1 | Add a CSP report endpoint (`report-to` + `/api/csp-report` or Sentry's CSP endpoint), collect 1–2 weeks, then enforce with a per-request nonce from middleware; drop `'unsafe-eval'` (test fabric and imgly), then `'unsafe-inline'` for scripts | `next.config.mjs`, `middleware.ts` | M |
| P1 | zod-validate every POST body with `packages/shared` schemas; reject on fail with 400 | 10 routes in `src/app/api` | M |
| P1 | Upload routes: check MIME by magic bytes, size limit, random object names, private bucket + signed URLs **(verify current behaviour)** | `api/upload`, `api/cabinet/upload` | S |
| P2 | `robots`: disallow `/api`, `/cabinet`, `/checkout`; `noindex` metadata on cabinet/checkout/auth | `robots.ts`, layouts | XS |
| P2 | Review where `createServiceClient` (bypasses RLS) is used in pages; select only needed columns (home does `select("*")` on 4 tables and passes everything to the client) | `[locale]/page.tsx` | S |

Secrets: only `NEXT_PUBLIC_*` vars reach the client; service-role use is server-only (verified by file list). Keep it that way; add a grep check that `SUPABASE_SERVICE_ROLE` never appears in a `"use client"` file.

### 4.2 Performance (Core Web Vitals)

Measure first: install `@vercel/speed-insights` (field data), run Lighthouse mobile on `/`, `/products/[slug]`, `/order` for a baseline. Targets: **LCP < 2.0 s, INP < 150 ms, CLS < 0.05** at p75 mobile.

| Fix | Metric | Size |
|---|---|---|
| Make `HomeClient` a server component; keep only interactive pieces client (`CollectionsSection` filters, customizer demo, FAQ accordion, contact form, cart) | INP, TBT, JS size | L |
| Load Geist via `next/font/local` (self-hosted, preloaded, `swap`, metric fallback) | LCP, CLS | XS |
| Hero video: `poster`, skip on `prefers-reduced-data`/`Save-Data` and < 768 px, re-encode to AV1/WebM ≤ 600 KB | LCP, bytes | S |
| `images.formats: ["image/avif","image/webp"]`; replace 16 `<img>` with `next/image` (explicit sizes, `priority` on the LCP image only) | LCP, CLS | S |
| Narrow home queries to needed columns; cache with `revalidate` (ISR) instead of per-request service queries | TTFB | S |
| Check bundle with `@next/bundle-analyzer`; confirm fabric, imgly, emoji-picker are route-local | JS size | S |
| Upgrade path: Next 15 / React 19 (better streaming, React Compiler) as a separate project, not in this plan | — | L |

### 4.3 Accessibility (WCAG 2.2 AA) & SEO checklist

**A11y**
- [ ] `lang` in SSR HTML (§3.1)
- [ ] Skip link to `#main` on every page; one `<h1>` per page; headings in order
- [ ] No text < 12 px; contrast ≥ 4.5:1 on all token pairs, incl. inverse surfaces
- [ ] Every `outline-none` has a visible `focus-visible` replacement (11 suspect lines)
- [ ] Targets ≥ 24×24 (2.5.8, AA) and the house 44 px rule for primary actions
- [ ] Dialogs/sheets (Auth, Cart, Size chart, cinema video): focus trap, `Esc`, focus return, labelled
- [ ] Focus not obscured by the sticky header (2.4.11): `scroll-padding-top` = header height
- [ ] Forms: labels, `aria-describedby` errors, `autocomplete` on checkout fields; no CAPTCHA-only auth (3.3.8)
- [ ] Customizer: keyboard path for add text/upload/remove layer, or an accessible alternative ("send us your logo")
- [ ] Automated: `axe` via Playwright on key routes in CI

**SEO**
- [ ] `sitemap.ts`: all locales × public routes + every active product, with `alternates.languages`; remove `/cabinet`
- [ ] `canonical` + hreflang (`pageAlternates`) on every public page, incl. PDP, privacy, terms **(verify which have it)**
- [ ] `opengraph-image.tsx` per locale (1200×630, via `next/og`), `twitter: summary_large_image`
- [ ] Remove duplicate English metadata from the root layout
- [ ] JSON-LD: Organization, WebSite, FAQPage (home), Product + Offer + BreadcrumbList (PDP)
- [ ] `x-default` hreflang → `en`

---

## 5. Phase-by-Phase Implementation Roadmap

Rule for every phase: one PR, `tsc` + `vitest` + `lint` green, screenshots at 375 / 768 / 1280, no unrelated refactors. Start only after the current WIP on `fix/security-hardening` is committed or merged.

### Phase 0 — Security quick wins (½ day)
PDP JSON-LD escape, CMS HTML sanitiser, local imgly import, CSP report endpoint, robots/noindex.
**Done when:** a product named `</script><script>alert(1)</script>` renders inert; `esm.sh` is gone from code and CSP; CSP reports arrive somewhere visible.

### Phase 1 — Tokens & primitives foundation (2–3 days)
Geist via `next/font`; type scale, colour additions, inverse scope, radius, motion tokens in `@theme`; `Container`/`Section`/`SectionHeader`; merge client UI copies into `packages/ui` behind the existing `index.ts`; delete 7 dead files.
**Done when:** `--font-sans` resolves to Geist in computed styles; zero `text-[8–11px]`; one Button implementation; lint rule blocks new `text-[`/`bg-[#`.

### Phase 2 — Global layout & core components (2 days)
`lang` on SSR HTML, skip link, `<main id>`, header/footer pass, button variants on all CTAs (kills `#5c57ff`), forms on shared zod schemas, POST route validation.
**Done when:** view-source shows `<html lang="uk">` on `/uk`; every POST rejects a malformed body with 400 (one test per route).

### Phase 3 — Page-by-page redesign (5–7 days)
Home 16 → 9 sections as server components with client islands; CMS id mapping; PDP server/client split; checkout pass; legal pages; colour clean-up file by file (start with the top 5 offenders).
**Done when:** hex literals in `.tsx` only in the canvas constants file; home JS shrinks measurably vs baseline; old CMS layouts still render.

### Phase 4 — Polish, motion & performance (2–3 days)
Motion tokens applied, framer reduced to presence cases, video poster/skip/re-encode, `next/image` everywhere, AVIF, ISR on home, bundle analysis, CSP enforce with nonce.
**Done when:** Lighthouse mobile ≥ 90 Performance / 100 Accessibility / 100 SEO on `/` and a PDP; CSP enforced with no `'unsafe-eval'`.

### Phase 5 — QA & verification matrix (1–2 days)

| Check | Tool | Pass |
|---|---|---|
| Types, unit tests, lint | `npm run type-check`, `vitest`, `next lint` | Green |
| Visual | Playwright screenshots, 375/768/1280, 3 locales (en, uk, de — longest strings) | No overflow, no clipped text |
| A11y | axe (Playwright), keyboard-only walk of home → PDP → order → checkout | 0 serious/critical; full flow by keyboard |
| Contrast | token pairs script | All ≥ 4.5:1 |
| Reduced motion | emulate `prefers-reduced-motion` | No movement; content visible |
| CWV | Lighthouse CI + Speed Insights p75 after 7 days | LCP < 2.0 s, INP < 150 ms, CLS < 0.05 |
| Security | CSP enforced, no violations in 48 h; XSS payloads in product name and CMS HTML; malformed POST bodies | Inert / 400 |
| SEO | sitemap validates, hreflang check, Rich Results test on home + PDP, OG preview | Valid |
| Funnel | Add-to-cart, customizer save, checkout submit, cabinet login on staging | All succeed |

---

## 6. Decisions (defaults in bold, all accepted 2026-11-09)

- **D1 Positioning:** keep **B2B corporate-merch storefront** (not an agency site).
- **D2 Home length:** cut to **9 sections** as in §3.2; CMS owners agree to merged sections.
- **D3 Brand blue:** keep **`--color-primary` oklch(0.48 0.22 270)** and drop `#5c57ff`, or adopt `#5c57ff` as the primary everywhere.
- **D4 Dark:** **inverse sections only**, no site-wide dark mode.
- **D5 Font:** **Geist** (already in repo) for now.

Not covered by this audit: admin app, Telegram mini app, runtime behaviour (no browser run, no Lighthouse), the content of the uncommitted WIP on this branch.
