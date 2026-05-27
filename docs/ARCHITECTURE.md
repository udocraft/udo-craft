# Technical Architecture

This document describes the high-level architecture of U:DO Craft and how different modules interact.

## 🏗 Overview

U:DO Craft is a specialized ERP and E-commerce platform for the print-on-demand industry. It uses a **Monorepo** structure to share logic between the customer-facing storefront and the internal management dashboard.

## 🗺 Product Areas

The codebase is organized into logical "Product Areas". When making changes, identify which area is affected:

### 1. Customizer (`apps/client/src/components/customizer`)
The "heart" of the storefront.
- **Fabric.js Integration:** High-performance canvas rendering.
- **Layer System:** Managing text, images, and shapes.
- **Pricing Engine:** Real-time calculation based on print types and quantity tiers.

### 2. CRM & Orders (`apps/admin/src/app/(dashboard)/orders`)
Managing the business lifecycle.
- **Kanban Board:** Drag-and-drop state management for orders.
- **KeyCRM Sync:** Bi-directional synchronization with external CRM.
- **Lead Tracking:** Capturing customer data and conversion paths.

### 3. ERP & Warehouse (`apps/admin/src/app/(dashboard)/warehouse`)
Material and production management.
- **Inventory:** Tracking stock levels for fabrics, threads, and supplies.
- **Production Orders:** Linking customer orders to physical manufacturing steps.
- **Goods Flow:** Documenting receipts, transfers, and sewing acts.

### 4. CMS & Content (`apps/admin/src/app/(dashboard)/cms`)
Dynamic content management.
- **Visual Editor:** Section-based landing page management.
- **Rich Pages:** Privacy policies and terms via a block-based editor.

### 5. Analytics (`apps/admin/src/app/(dashboard)/analytics`)
Data-driven decision making.
- **Visitor Tracking:** Mapping anonymous sessions to leads.
- **Funnel Analysis:** Identifying drop-off points in the customizer.

## 💾 Data Flow

1. **Database:** Supabase (PostgreSQL) is the source of truth.
2. **Schemas:** `packages/shared` defines Zod schemas that are used by both the frontend (validation) and backend (API protection).
3. **Auth:** Supabase Auth + custom RBAC in `packages/authz`.
4. **Real-time:** Supabase Realtime is used for the Orders Kanban board.

## 🎨 Shared UI

`packages/ui` contains atomic components based on **Shadcn UI**. 
- Always prefer shared components over local ones if they are used in both apps.
- Styled with **Tailwind CSS 4**.

## 🔌 External Integrations

- **KeyCRM:** Primary CRM for order fulfillment and customer communication.
- **Telegram:** Webhooks for real-time manager notifications and customer chat.
- **Vercel:** Deployment and edge functions.
