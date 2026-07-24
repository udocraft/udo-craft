# U:DO Craft Project Instructions

## 🏗 Architecture & Conventions
- **Monorepo:** Use Turborepo. Apps: `admin`, `client`. Packages: `shared`, `ui`, `authz`.
- **RBAC:** Managed via `packages/authz` (TypeScript source of truth) and synchronized with Supabase SQL policies.
- **Validation:** Use Zod schemas in `packages/shared`. Always validate data at the API boundary.
- **Styling:** Tailwind CSS 4. Prefer shared UI components from `packages/ui`. Follow [UI/UX Standards & Consistency Guide](./UI_UX_STANDARDS.md) for all changes.
- **Commits:** Use semantic commits: `type(area): description`. Areas: `customizer`, `orders`, `erp`, `cms`, `analytics`, `shared`, `ui`, `infra`.

## 📂 Product Areas
- **Customizer:** Canvas logic, Fabric.js integration.
- **Orders:** CRM, Leads, Kanban board, KeyCRM sync.
- **ERP:** Warehouse, Inventory, Production Orders.
- **CMS:** Visual landing page and rich-text editors.
- **Analytics:** Visitor tracking, conversion funnel, financial metrics.

## 🛠 Workflows
- **Pruning:** Regularly remove obsolete debug files and legacy scripts.
- **Documentation:** Keep `README.md`, `ARCHITECTURE.md`, and `CONTRIBUTING.md` updated as the project evolves.
- **Testing:** Verify changes across both `admin` and `client` if shared packages are modified.

## 💾 Storage Policies
- Bucket `product-images`: Used for user-generated mockups and assets. Public read, restricted write.
