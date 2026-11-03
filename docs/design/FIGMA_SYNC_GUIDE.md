# Figma ↔ Code Sync Guide

Working agreement for keeping the Figma file and the codebase in step. Read [JOBS_TO_BE_DONE.md](./JOBS_TO_BE_DONE.md) first: it defines *why* each screen exists.

**Figma file:** https://www.figma.com/design/Ro0oXmJcs9i4Nt7TJtRIhS

---

## 1. File structure

| Page | Holds | Naming |
|------|-------|--------|
| **Admin & Client Flows** | One top-level frame per screen, grouped into sections per flow. | `<surface> / <flow> / <screen>` e.g. `Client / Checkout / Desktop` |
| **Design System** | Foundations (color, type, spacing, radius, elevation), then components, then patterns. | Components use `Category/Name`, e.g. `Button/Primary`, `Input/Text` |
| Page 1 | Empty default page. Safe to delete once confirmed. | — |

Frame names in **Admin & Client Flows** always use the route, so code and design can be matched by name:

| Surface | Route pattern | Figma frame name |
|---------|---------------|------------------|
| Client | `/[locale]` | `Client / Home` |
| Client | `/[locale]/products/[slug]` | `Client / Product` |
| Client | `/[locale]/customize/[productId]` | `Client / Customizer` |
| Client | `/[locale]/checkout` | `Client / Checkout` |
| Client | `/[locale]/order` | `Client / Order confirmation` |
| Client | `/[locale]/cabinet/login` | `Client / Cabinet login` |
| Client | `/[locale]/cabinet/register` | `Client / Cabinet register` |
| Client | `/[locale]/cabinet` | `Client / Cabinet` |
| Client | `/[locale]/cabinet/settings` | `Client / Cabinet settings` |
| Client | `/[locale]/popup` | `Client / Popup` |
| Client | `/[locale]/privacy` | `Client / Privacy` |
| Client | `/[locale]/terms` | `Client / Terms` |
| Admin | `/login` | `Admin / Login` |
| Admin | `/reset-password` | `Admin / Reset password` |
| Admin | `/` | `Admin / Dashboard` (redirect stub → `/orders`) |
| Admin | `/orders` | `Admin / Orders board` |
| Admin | `/orders/[id]` | `Admin / Order detail` |
| Admin | `/orders/new` | `Admin / New order` |
| Admin | `/clients` | `Admin / Clients` |
| Admin | `/messages` | `Admin / Messages` |
| Admin | `/visitors` | `Admin / Visitors` |
| Admin | `/products` | `Admin / Products` |
| Admin | `/products/new` | `Admin / New product` |
| Admin | `/products/[id]` | `Admin / Product detail` |
| Admin | `/catalog` | `Admin / Catalog` |
| Admin | `/prints` | `Admin / Prints` |
| Admin | `/warehouse` | `Admin / Warehouse` |
| Admin | `/erp` | `Admin / ERP` (redirect stub → `/warehouse`) |
| Admin | `/cms` | `Admin / CMS` |
| Admin | `/cms/privacy` | `Admin / CMS privacy` |
| Admin | `/cms/terms` | `Admin / CMS terms` |
| Admin | `/analytics` | `Admin / Analytics` |
| Admin | `/users` | `Admin / Users` |
| Admin | `/settings` | `Admin / Settings` |

Each frame's **description** lists: the JTBD IDs it serves, the source file path, and the last synced git commit.

---

## 2. Source of truth rules

| Question | Source of truth |
|----------|-----------------|
| What is a color, spacing or radius value? | `packages/styles/globals.css` (CSS variables) → Figma variables |
| What does a component look like and expose? | `packages/ui/components/ui/*.tsx` → Figma component set |
| What does a screen do and say? | `apps/*/src/app/**/page.tsx` + `apps/client/messages/*.json` |
| Why does a screen exist? | `docs/design/JOBS_TO_BE_DONE.md` |

If Figma and code disagree, **code wins for behavior, Figma wins for intended visual change** — decide which, then update the other side in the same change.

---

## 3. Design System page: how to keep it current

1. **Tokens first.** Map each CSS variable in `globals.css` to one Figma variable in a `Brand` / `Semantic` collection. Light mode is the default; add dark mode from the `prefers-color-scheme` block.
2. **Type ramp.** One text style per Tailwind type size used in `packages/ui`.
3. **Components.** One component set per file in `packages/ui/components/ui`. Variants mirror the CVA `variant` and `size` props exactly (names must match, e.g. `variant=default, size=sm`).
4. **Code Connect.** Once a component set exists, add a `.figma.tsx` mapping next to the source component so Figma instances show the real import.
5. **Versioning.** Note the `packages/ui` version or commit in the Design System page description when you publish.

---

## 4. Iteration loop

### Code → Figma (after a code change)

1. Identify the changed route(s) with `git diff --name-only -- apps/*/src/app`.
2. Look up each route in the table above and find its JTBD IDs.
3. Re-render the screen and update the Figma frame. Only change what the diff changed.
4. Update the frame description with the new commit SHA.

### Figma → Code (after a design change)

1. Open the frame and note the **frame name** (it gives the route) and the **JTBD IDs** in its description.
2. Check the change against the job's success signal. If it breaks the signal, raise it before coding.
3. Implement in `packages/ui` first if the change touches a shared component; otherwise in the app.
4. Use existing tokens. Do not hard-code a color or spacing value that a variable already covers.

---

## 5. Definition of done for a screen

- [ ] Route listed in the table above with its Figma frame
- [ ] JTBD IDs linked in the frame description
- [ ] Desktop and mobile (375 px) frames exist
- [ ] Every color, spacing and type value bound to a variable or text style
- [ ] Every repeated element is a component instance
- [ ] Empty, loading and error states present for any screen that loads data or submits a form
- [ ] Copy matches `apps/client/messages/*.json` (client) or the admin string source (admin)
- [ ] Frame description records the source commit SHA

---

## 6. Current status

| Area | Status |
|------|--------|
| Figma pages `Admin & Client Flows` and `Design System` | Created |
| JTBD document | Written (`JOBS_TO_BE_DONE.md`) |
| Screen frames (34 routes) | Built in Figma from code: structure, sidebar/nav, section labels, real components. Not pixel-exact; no mobile frames yet. |
| Design System tokens and components | Built: Tokens and Radius & Spacing variables, type ramp, Button (15 variants), Input, Card. |
| Sync guide in Figma | On Design System page: "Guide / Code ↔ Figma sync". |
| Code Connect mappings | Not started. |
| Mobile (375 px) frames, client | Built: 12 `Client / <Screen> / Mobile` frames on Admin & Client Flows. |
| Mobile (375 px) frames, admin | Not started. |
| Dark mode | No dark tokens exist in `globals.css`; nothing to map yet. |

Work remaining is tracked here. Update this table as each item lands.
