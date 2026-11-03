# Jobs To Be Done (JTBD)

Source of truth for **why** each screen exists. Every route in `apps/admin` and `apps/client` maps to at least one job below. When a screen changes, check its job first: a change that does not serve a listed job needs a reason.

Format per job: *When [situation], I want to [motivation], so I can [outcome].*

---

## Personas

| ID | Persona | Surface | Goal in one line |
|----|---------|---------|------------------|
| P1 | **Visitor** (anonymous shopper) | Client storefront | Find a custom-printed product and understand the price fast. |
| P2 | **Customer** (registered buyer) | Client storefront + cabinet | Design, order and track a personalized product. |
| P3 | **Sales / CRM manager** | Admin | Turn leads and orders into paid, fulfilled work. |
| P4 | **Production / warehouse operator** | Admin | Know what material to use, what to produce, and what is in stock. |
| P5 | **Content / marketing editor** | Admin | Keep landing pages, legal pages and messaging current without developers. |
| P6 | **Owner / analyst** | Admin | See where visitors drop off and which channels convert. |
| P7 | **Administrator** | Admin | Manage users, roles and catalog structure. |

---

## Client storefront

### P1 Visitor

| Job | Screen (route) | Success signal |
|-----|----------------|----------------|
| When I land on the site, I want to see what can be customized and what it costs, so I can decide whether it is worth my time. | Home `/[locale]` | Clicks into a product within the first screen. |
| When I am choosing a product, I want to compare variants and quantity prices, so I can pick the right option for my budget. | Product `/[locale]/products/[slug]` | Reaches "customize" without leaving the page. |
| When I want to personalize an item, I want a live preview as I edit text and images, so I can confirm the result before I buy. | Customizer `/[locale]/customize/[productId]` | Adds a design to the cart. |
| When I am not ready to buy, I want to leave my contact details for a callback or a price list, so I can continue later. | Popup `/[locale]/popup`, Lead-magnet and Contact sections on Home | Form submitted. |
| When I have a question about the business, I want legal and policy pages in my language, so I can trust the company. | Privacy `/[locale]/privacy`, Terms `/[locale]/terms` | Page read; cookie choices respected. |

### P2 Customer

| Job | Screen (route) | Success signal |
|-----|----------------|----------------|
| When I want to buy my design, I want a checkout that shows the final price and delivery, so I can pay without surprises. | Checkout `/[locale]/checkout` | Order placed. Server-side price matches what I saw. |
| When I have placed an order, I want a confirmation page with its status, so I know it was received. | Order `/[locale]/order` | Confirmation viewed. |
| When I come back later, I want to log in and see my orders and saved data, so I do not start over. | Cabinet login `/[locale]/cabinet/login`, Register `/[locale]/cabinet/register`, Cabinet `/[locale]/cabinet` | Login succeeds; orders listed. |
| When my details change, I want to update my profile and password myself, so I do not have to contact support. | Cabinet settings `/[locale]/cabinet/settings` | Change saved and confirmed. |

---

## Admin dashboard

Admin routes are behind login (`/login`, `/reset-password`).

### P3 Sales / CRM manager

| Job | Screen (route) | Success signal |
|-----|----------------|----------------|
| When a new order arrives, I want to see it on a board by stage, so I can move it forward without opening every record. | Orders `/orders` (Kanban) | Stage changed in one drag. |
| When I need the full picture of one order, I want its items, payments, files and history in one place, so I can answer the customer. | Order detail `/orders/[id]` | Customer question answered without another tool. |
| When a customer wants something custom, I want to create an order by hand, so phone and chat sales are recorded. | New order `/orders/new` | Order saved and appears on the board. |
| When I work with a client company or person, I want their history and contacts, so I can follow up. | Clients `/clients` | Record opened, contact made. |
| When a visitor leaves contact details, I want to see who they are and what they viewed, so I can follow up while interest is warm. | Visitors `/visitors`, Messages `/messages` | Lead assigned or answered. |
| When I need to reply to a customer, I want all messages in one inbox, so nothing is missed. | Messages `/messages` | Reply sent. |

### P4 Production / warehouse operator

| Job | Screen (route) | Success signal |
|-----|----------------|----------------|
| When an order is confirmed, I want to see what material and print work it needs, so I can plan production. | Prints `/prints` | Print job scheduled. |
| When I start work, I want to know whether stock covers the job, so I do not stop the line. | Warehouse `/warehouse` | Stock confirmed or reorder raised. |
| When goods arrive or move between locations, I want to record the receipt, transfer or sewing act, so stock stays accurate. | Warehouse `/warehouse`, ERP `/erp` | Document saved; balances update. |
| When I need to know what a product is made of, I want its specification, so I can produce it correctly. | Catalog `/catalog`, Product detail `/products/[id]` | Spec found. |

### P5 Content / marketing editor

| Job | Screen (route) | Success signal |
|-----|----------------|----------------|
| When a campaign changes, I want to edit landing-page sections without a developer, so the site stays current. | CMS `/cms` (visual editor) | Change published. |
| When legal wording changes, I want to edit the privacy and terms pages in blocks, so the legal text stays correct. | CMS privacy `/cms/privacy`, CMS terms `/cms/terms` | Page published in each locale. |
| When I add a product, I want to create it with images, variants and prices in one form, so it can be sold right away. | New product `/products/new`, Products `/products` | Product visible on the storefront. |
| When I need to group products, I want to manage categories, so customers can browse. | Catalog `/catalog` (CategoryDialog) | Category saved. |

### P6 Owner / analyst

| Job | Screen (route) | Success signal |
|-----|----------------|----------------|
| When I open the admin, I want to land on the work that needs attention now, so I know what to do first. | `/` redirects to Orders `/orders` | Orders board is the first screen after login. No separate KPI dashboard exists yet. |
| When sales are weak, I want to see where visitors leave the customizer, so I can fix the step that loses them. | Analytics `/analytics` (funnel) | Drop-off step identified. |
| When I plan spend, I want to know which channels bring paying customers, so I can move budget. | Analytics `/analytics` | Channel ranking seen. |

### P7 Administrator

| Job | Screen (route) | Success signal |
|-----|----------------|----------------|
| When a new team member joins, I want to create their account and give the right role, so they see only what they need. | Users `/users` | User active with correct role. |
| When someone forgets their password, I want a reset flow that works, so they are not locked out. | Login `/login`, Reset `/reset-password` | Password reset completed. |
| When I change company-level settings, I want one settings screen, so configuration is not scattered. | Settings `/settings` | Setting saved. |

---

## Cross-cutting jobs (apply to every screen)

| Job | Applies to | Rule |
|-----|-----------|------|
| When I use the site on a phone, I want every screen to work at 375 px wide, so I can order from my phone. | All client screens | No horizontal scroll; 16 px side gutter. |
| When I read in Ukrainian or English, I want the whole UI and legal text translated, so nothing is confusing. | All client screens | No hard-coded strings; all copy in `apps/client/messages/*.json`. |
| When I am on the admin dashboard, I want the same controls to behave the same everywhere, so I do not relearn them. | All admin screens | Use `packages/ui` components before local ones. |
| When I share personal data, I want it kept out of analytics, so my privacy is respected. | Contact, checkout, cabinet forms | Name and email never sent to analytics. |
| When something fails, I want a clear message and a way forward, so I am not stuck. | All forms | Error state designed for every form field. |

---

## How to use this document

1. **Adding a screen:** write its job here first, in the table of the persona who needs it. If no persona fits, the screen probably does not need to exist.
2. **Changing a screen:** find its row, confirm the success signal still holds, and note the change in the screen's Figma frame description (see [FIGMA_SYNC_GUIDE.md](./FIGMA_SYNC_GUIDE.md)).
3. **Reviewing a design:** each frame in the Figma file links back to its job ID here.
