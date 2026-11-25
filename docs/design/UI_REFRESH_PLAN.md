# UI refresh plan — "less generic, fewer boxes" (2026-11-24)

Built on main after the B2C home / `/biz` / two-level header release, using `@udo-craft/ui` tokens.

Goal: move the storefront from a boxed SaaS look to an editorial commerce look
(references 1–12 from the brief). Fewer containers, full-bleed media, a clear
three-step type scale, and a customizer that teaches itself.

## Design rules (apply everywhere)

| Rule | Detail |
|---|---|
| Containers | Only media gets a surface (`bg-muted`, radius). Text, prices, options sit on the page. No card-in-card. |
| Width | Content runs `max-w-[1440px]` with `px-4 sm:px-6 lg:px-10`. Full-bleed (`w-full`) for galleries, material and CTA sections. |
| Type | Display `clamp(2.5rem,6vw,5.5rem)` / Title `text-2xl–3xl` / Body `text-base`. Weight: medium/semibold for display, not black. |
| Dividers | Hairline `border-border` rows (Threads/X pattern) instead of boxed groups in flows. |
| Accent | One accent word per headline (reference 2: "Perfected"). Primary colour only for action and that word. |
| Motion | Reveal on scroll, ≤ 300 ms, respects `prefers-reduced-motion`. |
| A11y | No nested interactive elements, 44 px targets, visible focus, alt text, `aria-pressed` on toggles. |

## Work items

| # | Item | Files | Owner | Status |
|---|---|---|---|---|
| 1 | Editorial landing sections: statement paragraph with inline pill images + scroll-fill text (ref 1); split headline with accent word + two large product tiles (ref 2) | `_home/Statement.tsx`, `_home/StatementFill.tsx`, `_home/FeaturedPair.tsx` (new), `_home/HomeSections.tsx` | lead | wave 1 |
| 2 | Footer: newsletter with first-order % offer, link columns, socials, giant wordmark at the end | `_sections/FooterSection.tsx`, `/api/newsletter`, i18n `footer.newsletter.*` | lead | wave 1 |
| 3 | Product info: stock/lead-time line, big price next to CTA, perks list with icons, rating line, colour swatches with name | `products/[slug]/_components/ProductPurchase.tsx` | lead | wave 2 |
| 4 | Full-bleed image grid on product page (ref 5): thumbnails rail + large media left, sticky buy column right | `products/[slug]/_components/ProductPurchase.tsx`, `_gallery.tsx` | lead | wave 2 |
| 5 | Product cards: image in a surface, title/price/swatches below with no container; card is a link, actions are siblings (fixes nested-interactive a11y bug) | `components/ProductCardDetailed.tsx` | lead | wave 1 |
| 6 | Full-screen material section on product page (ref 7) + de-box flows (order, cabinet) toward hairline rows | `products/[slug]/_material.tsx`, cabinet/order later pass | lead (+ design-tuner pass) | wave 2 / wave 4 |
| 7 | Detail structure (refs 8–9): two-column "label left / content right" rows — Key features (icon grid), Care, Size guide table, Delivery, Files | `products/[slug]/_details.tsx` | lead | wave 2 |
| 8 | Customizer onboarding tour (ref 10): 5–6 steps anchored to Upload, AI, Text, Library/Prints, Sides, Price; auto first time, replay from a "?" button | `order/_components/CustomizerTour.tsx` (new), `Customizer.tsx`, `CustomizerLayout.tsx` | agent A | wave 3 |
| 9 | Remove "Try on a person" AI mirror; add Design / Preview switch; Preview = grid of 5–7 renders from the user's print (front, back, print close-up, collar/detail crop, flat lay, colourways, scene mockups when admin provides them) | `Customizer.tsx`, `PreviewGrid.tsx` (new) | agent A | wave 3 |
| 10 | Print areas, admin + client (ref 12): per-product, per-side named zones drawn on the mockup in admin; client shows the dashed zone and side pills (Front / Back / Neck label …) | migration, admin product page editor, `ProductCanvas.tsx`, `useCustomizerState.ts`, `/api/print-zones` | agent B | wave 3 |

## Data changes (item 10)

- `print_zones.side` is an enum `('front','back')`. New migration adds `label text`, `sort_order int`,
  `width_mm numeric`, `height_mm numeric`, and converts `side` to `text` so extra sides
  (`neck_inner`, `sleeve_left`, `sleeve_right`) are possible. The migration file is written, **not applied**.
- Scene mockups for the preview grid (lifestyle photos with a print rectangle) are phase 2; the grid
  works from the product's own images until admins upload scenes.

## Out of scope for this pass

- Reviews/ratings data (no table exists). The rating line renders only if `marketing_meta.rating` is set.
- Real newsletter provider and checkout promo codes. The form stores emails in `newsletter_subscribers` via `/api/newsletter`; the first-order discount is not yet applied at checkout.

## Verification

- `npm run type-check --workspace=client` and `--workspace=admin`.
- Browser check of `/`, `/products/<slug>`, `/order?customize=1` at 1440 px and 375 px.
- Accessibility review of the new card, footer form and tour (keyboard, focus, contrast).
