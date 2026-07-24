# UI/UX Standards & Consistency Guide

This document defines the mandatory UI/UX standards for both **Client** and **Admin** applications of U:DO Craft. All new features and refactors MUST adhere to these standards to ensure end-to-end consistency and a high-quality SaaS experience.

## 🏛 Core Mandates

### 1. Strict Shadcn UI Adoption
*   **Source of Truth:** All UI components MUST be based on Shadcn UI.
*   **No Manual CSS:** Avoid custom CSS or heavy Tailwind nesting for basic components. Use Shadcn primitives (Button, Input, Sheet, Dialog, etc.).
*   **Consistency:** If a component exists in `packages/ui`, use it. If not, create it there first if it's shared.

### 2. Sizing & Touch Targets (Apple HIG Standard)
*   **Minimum Target:** Every primary interactive element MUST have a minimum touch area of **44px** in width or height.
*   **Implementation:** 
    *   Default height for Buttons/Inputs/Selects: `h-11` (44px) or `min-h-[44px]`.
    *   Large variant: `h-12` (48px).
    *   Icon buttons: Minimum `size-11` (44px).
*   **Client vs Admin:** Both applications must now follow this 44px standard for primary actions.

### 3. Visual Style: "SaaS Best Practice"
*   **Rounding:** All primary interactive elements (Buttons, Inputs, Selects, Badges) MUST be fully rounded (`rounded-full`).
*   **Borders:** Use consistent `border-border` and `bg-background` for containers.
*   **Shadows:** Use standard Tailwind shadows (`shadow-sm`, `shadow-md`, `shadow-lg`) to denote hierarchy.

### 4. Responsive Layout Standards
*   **Outer Padding:** Use `px-4 md:px-6` for headers, toolbars, and main content wrappers.
*   **Content Padding:** Standardize on `p-6` (24px) for cards and inner sections.
*   **Containers:** Use consistent max-widths for client-facing pages (e.g., `max-w-7xl`).

## 🛠 Role-Specific Layouts

### Admin Application
*   **Wrapper:** Use `DashboardPage`.
*   **Header:** `DashboardHeader` with title and optional tabs in `titleAccessory`.
*   **Actions:** Primary CTAs in the top-right `actions` area.
*   **Toolbar:** Use `AdminToolbar` for filters and search (height `h-14`).
*   **Tables:** Always wrap in `AdminTablePanel`.

### Client Application
*   **Header:** Standard `SiteHeader` with consistent heights.
*   **Interactions:** Use Shadcn `Sheet` for the cart, `Dialog` for auth, and `Button` for all actions.
*   **Empty States:** Use `EmptyState` component with consistent icons and "Primary Action" patterns.

## 📋 Implementation Checklist
- [ ] Uses Shadcn UI primitives?
- [ ] Primary buttons/inputs are `h-11` and `rounded-full`?
- [ ] Padding follows `px-4 md:px-6`?
- [ ] No "magic" numbers or hardcoded sizes outside of standards?
- [ ] Fully responsive and touch-friendly (44px targets)?

## 🔄 Shared UI Strategy
To avoid duplication, Shadcn components should be centralized in `packages/ui/components/ui`. Both `apps/admin` and `apps/client` should ideally import from there or maintain exact parity if local overrides are necessary.
