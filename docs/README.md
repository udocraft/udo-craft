# U:DO Craft ✦ B2B Merch Platform

Custom print-on-demand B2B platform. Customers design and order branded merch; admins manage the full production pipeline, from lead to warehouse.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development (both Admin & Client)
npm run dev

# Build for production
npm run build
```

## 🏗 Project Structure

This is a **Turborepo** monorepo:

- `apps/admin` — Internal dashboard for managers and production staff.
- `apps/client` — Customer-facing storefront and customizer.
- `packages/shared` — Zod schemas, shared constants, and business logic.
- `packages/ui` — Shared UI components (Radix, Tailwind).
- `packages/authz` — RBAC permission system.
- `supabase/` — Database schema, migrations, and RLS policies.

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL)
- **Canvas:** Fabric.js 5
- **Icons:** Lucide React
- **Validation:** Zod
- **Build System:** Turborepo

## 📖 Documentation

- [Architecture Guide](./ARCHITECTURE.md) — Technical deep-dive and product areas.
- [Contributing Guide](./CONTRIBUTING.md) — Workflow, commits, and standards.
- [Deployment Guide](./DEPLOYMENT.md) — Vercel and Supabase setup.

## 📂 Product Areas

- **Customizer:** Interactive Canvas editor for product design.
- **Order Management:** Kanban-based CRM and order lifecycle.
- **Warehouse (ERP):** Inventory, production orders, and materials.
- **CMS:** Visual landing page and content editor.
- **Analytics:** Traffic tracking and financial reporting.

---
© 2026 U:DO Craft. Built with precision for B2B merch automation.
