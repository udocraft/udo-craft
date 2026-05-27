# U:DO Craft - Information Architecture (IA) & User Flows

This document outlines the complete Information Architecture (IA) and possible user flows for both the **Client (Storefront)** and **Admin (Dashboard)** applications based on the current Next.js App Router structure.

---

## 1. Client Application (`apps/client`)
This is the customer-facing storefront and user portal.

### **Catalog & Shopping Flow**
*   **`/` (Home/Landing Page)**
    *   **Flow:** User lands on the site. Views marketing content, featured products, and value propositions. Can navigate to the catalog or directly to the customizer.
*   **`/products/[slug]` (Product Detail Page)**
    *   **Flow:** User views specific product details, gallery, and pricing. Selects variants (color, size). Can add directly to cart (basic purchase) or click to customize.
*   **`/customize/[productId]` (Customizer/Editor Page)**
    *   **Flow:** Core interactive experience. User accesses the 2D canvas, adds text, uploads images, or selects print layers for the product. Approves design and adds the custom product to the cart.

### **Checkout Flow**
*   **`/checkout` (Checkout)**
    *   **Flow:** User reviews cart contents. Enters shipping details (Nova Poshta integration), contact information, and selects a payment method. Submits the order.
*   **`/order` (Order Success & Status)**
    *   **Flow:** Post-purchase page. User views confirmation of the placed order, order ID, and tracking instructions.

### **Customer Portal (Cabinet)**
*   **`/cabinet/login` (Login)**
    *   **Flow:** Existing customer authenticates via email/password or OTP.
*   **`/cabinet/register` (Registration)**
    *   **Flow:** New user creates an account to save designs or track orders.
*   **`/cabinet` (User Dashboard)**
    *   **Flow:** Authenticated area. User views their order history, saved custom designs, and general profile overview.
*   **`/cabinet/settings` (Account Settings)**
    *   **Flow:** User updates personal details, shipping preferences, and password.

### **Legal & Marketing**
*   **`/popup` (Marketing Modals)**
    *   **Flow:** Serves dynamic popup content (e.g., newsletter signups, promos).
*   **`/privacy` & `/terms`**
    *   **Flow:** Static legal pages for Privacy Policy and Terms of Service.

---

## 2. Admin Application (`apps/admin`)
This is the internal dashboard for team members (Admins, Managers, Production staff).

### **Authentication**
*   **`/login`**
    *   **Flow:** Staff authentication.
*   **`/reset-password`**
    *   **Flow:** Password recovery for staff.

### **Analytics & Insights**
*   **`/analytics` (Analytics Dashboard)**
    *   **Flow:** Management views high-level metrics: traffic, unique visitors, conversion funnels (visitors -> leads -> clients), and financial reporting (LTV, revenue, average order value).
*   **`/visitors` (Live Visitor Tracking)**
    *   **Flow:** Marketing/Sales tracks live website visitors, pageviews, active sessions, and conversion status.

### **CRM & Order Management**
*   **`/orders` (Orders Board)**
    *   **Flow:** Core operational hub. Managers view orders in a Kanban board or List view. Filter by status, date, or tags. Sync data with KeyCRM.
*   **`/orders/new` (Manual Order Creation)**
    *   **Flow:** Managers manually create an order for a client (e.g., via phone/chat). Includes an internal version of the customizer to assemble the product for the client.
*   **`/orders/[id]` (Order Details)**
    *   **Flow:** Detailed view of a specific order. Managers update statuses, manage items, generate fiscal checks (Checkbox integration), and handle shipping logistics.
*   **`/clients` (Client Database)**
    *   **Flow:** View the customer list, sort by LTV or order count, edit profiles, and view order history for specific clients.
*   **`/messages` (Customer Chat)**
    *   **Flow:** Support team communicates directly with customers regarding specific leads or orders.

### **Catalog & Product Management**
*   **`/catalog` (Catalog Settings)**
    *   **Flow:** Manage high-level catalog categories and general product settings.
*   **`/products` (Products List)**
    *   **Flow:** View and search all base products available in the store.
*   **`/products/new` & `/products/[id]` (Product Editor)**
    *   **Flow:** Admins create or edit products. Configure color variants, define size charts, set pricing, and setup customizer areas (canvas bounds).
*   **`/prints` (Print Assets)**
    *   **Flow:** Manage the library of predefined print assets and graphic elements available to users in the customizer.

### **ERP & Warehouse**
*   **`/warehouse` (Inventory & Operations)**
    *   *Tabbed Flow:*
        *   **Stock:** View current materials, finished goods, and low-stock alerts.
        *   **Receipts:** Register new material deliveries from suppliers.
        *   **Production:** Create production orders based on client orders.
        *   **Acts:** Register processing acts (e.g., sewing completion) to turn materials into finished goods.
        *   **Transfers:** Move inventory between different physical or logical warehouses.
*   **`/erp`**
    *   **Flow:** Legacy/routing point for broader ERP modules.

### **CMS & System**
*   **`/cms` (Content Management)**
    *   **Flow:** Edit marketing landing pages, hero videos, and dynamic storefront content.
*   **`/cms/privacy` & `/cms/terms`**
    *   **Flow:** WYSIWYG editors for legal documents displayed on the client app.
*   **`/users` (Team Management)**
    *   **Flow:** Admins invite new staff, assign roles (Admin, Manager, Sewer, Viewer), and manage access levels.
*   **`/settings` (Settings)**
    *   **Flow:** Individual staff settings (profile, password, notification preferences) and global system configurations.