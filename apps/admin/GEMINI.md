# Admin Project Guide & UI Standards

This document defines the foundational mandates for the U:DO Craft Admin application. All new features and refactors MUST adhere to these standards to ensure consistency and a high-quality user experience.

## Core Anatomy of an Admin Page

Every top-level admin page must follow this structural hierarchy:

1.  **Wrapper:** `DashboardPage` component.
2.  **Header:** `DashboardHeader` (managed by `DashboardPage`).
    *   **Title:** Concise, in Ukrainian (e.g., "Замовлення", "Каталог").
    *   **Tabs (Sub-navigation):** Use `AdminTabs` passed to the `titleAccessory` prop of `DashboardPage`.
    *   **Actions:** Primary CTAs (e.g., "Нове замовлення", "Додати товар") passed to the `actions` prop.
3.  **Toolbar (Optional):** `AdminToolbar` component immediately below the header.
    *   Contains `Search` inputs, `AdminFilter` chips, and secondary view toggles.
4.  **Content Area:** 
    *   For tables: Wrap in `AdminTablePanel`.
    *   For forms/dashboards: Use consistent padding (default `p-6` or `p-4 md:p-6`).

## UI Component Standards

### 1. Shadcn UI First
*   **Strict Adherence:** All UI components MUST be based on Shadcn UI. 
*   **No Custom CSS:** Avoid writing custom CSS in `globals.css` or using inline `style` props for layout/theming. Use Tailwind utility classes exclusively.
*   **Rounding:** All primary interactive elements (Buttons, Inputs, Selects) MUST be fully rounded (`rounded-full`).

### 2. Touch Targets & Accessibility
*   **Apple HIG Standard:** Every primary interactive element MUST have a minimum touch area of 44px in width or height.
*   **Implementation:** Use `h-11` (44px) or `min-h-[44px]` for buttons, inputs, and triggers. Use `h-12` (48px) for large variants.

### 3. Navigation & Tabs
*   **Top-level Tabs:** Use `AdminTabs` in the header (`titleAccessory`).
*   **Tab Height:** Must be exactly `h-16` to match the header height.
*   **Active State:** Use `text-primary` with a bottom border (`after:h-0.5 after:bg-primary`).
*   **Consistency:** Avoid mixing `AdminTabs` (in header) with Shadcn `Tabs` (in body) for primary navigation.

### 4. Actions & CTAs
*   **Placement:** Primary actions MUST be in the top-right `actions` area of the header.
*   **Styling:** Use `size="default"` (now 44px) for primary actions in the header.
*   **Variants:** Use `default` (primary) for the main "Create" action and `outline` for secondary/sync actions.

### 5. Filters & Search
*   **Toolbar:** Always use `AdminToolbar` for a consistent filter row. Container height is `h-14`.
*   **Filter Chips:** Use `AdminFilter`. Triggers must be `h-11` and `rounded-full`.
*   **Search Input:** Use the standardized search input with a 3.5 size icon and `h-11` height.

### 6. Tables
*   **Wrapper:** Use `AdminTablePanel`.
*   **Spacing:** Use `TableCell` with consistent vertical padding.
*   **Empty States:** Provide a clear, centered empty state with an icon and a "Reset filters" or "Create" action.

### 7. Margins & Padding
*   **Outer Padding:** `px-4 md:px-6` for headers and toolbars.
*   **Content Padding:** `p-6` for card-based layouts.
*   **Table Margins:** Tables should typically be full-width within their panel, with padding managed by the row/cell level or a wrapper.

## UX Principles

*   **No "Glitch" Transitions:** When switching tabs via URL params, ensure the layout doesn't jump. The header and toolbar should remain stable.
*   **Tight Vertical Space:** Minimize unnecessary whitespace. Use `h-16` for headers and `h-10` for toolbars.
*   **Atomic Consistency:** Repeated patterns (e.g., Status Badges, Money formatting) must use shared utility functions or components.

## Implementation Checklist

- [ ] Page uses `DashboardPage`?
- [ ] Tabs are in `titleAccessory` using `AdminTabs`?
- [ ] Primary CTA is in `actions`?
- [ ] Filters/Search use `AdminToolbar` and `AdminFilter`?
- [ ] Tables wrapped in `AdminTablePanel`?
- [ ] Margins and paddings align with `px-4 md:px-6`?
