import type { NextRequest } from "next/server";
import type { AdminPermission } from "@udo-craft/authz";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function permissionForAdminApi(request: NextRequest): AdminPermission | null {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();
  const isMutation = MUTATING_METHODS.has(method);

  if (pathname.startsWith("/api/auth/")) return null;
  if (pathname === "/api/email/inbound") return null;
  if (pathname === "/api/telegram/webhook") return null;
  if (pathname === "/api/users/set-role") return null;

  if (pathname.startsWith("/api/users")) return "users.manage";
  if (pathname === "/api/admin/hard-reset") return "system.hard_reset";
  if (pathname.startsWith("/api/health")) return "system.health";
  if (pathname.startsWith("/api/analytics")) return "analytics.read";
  if (pathname.startsWith("/api/dashboard")) return "analytics.read";
  if (pathname.startsWith("/api/search")) return "admin.access";
  if (pathname.startsWith("/api/messages")) return isMutation ? "messages.manage" : "messages.read";
  if (pathname.startsWith("/api/upload")) return "uploads.manage";
  if (pathname.startsWith("/api/proxy-image")) return "uploads.manage";
  if (pathname.startsWith("/api/cms")) return isMutation ? "cms.manage" : "cms.read";
  if (pathname.startsWith("/api/ai/")) return "ai.generate";
  if (pathname.startsWith("/api/erp")) return isMutation ? "erp.manage" : "erp.read";
  if (pathname.startsWith("/api/keycrm")) return "erp.manage";
  if (pathname.startsWith("/api/production")) return "erp.read";

  if (
    pathname.startsWith("/api/categories") ||
    pathname.startsWith("/api/materials") ||
    pathname.startsWith("/api/order-items") ||
    pathname.startsWith("/api/print-") ||
    pathname.startsWith("/api/product-") ||
    pathname.startsWith("/api/products") ||
    pathname.startsWith("/api/size-charts")
  ) {
    return isMutation ? "catalog.write" : "catalog.read";
  }

  return "admin.access";
}
