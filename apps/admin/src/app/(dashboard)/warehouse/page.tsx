import { redirect } from "next/navigation";

const TAB_ROUTES: Record<string, string> = {
  stock: "/erp/stock",
  receipts: "/erp/receipts",
  production: "/erp/production",
  acts: "/erp/acts",
  transfers: "/erp/transfers",
};

/** Old tabbed URL kept so existing links and bookmarks still resolve. */
export default async function WarehouseRedirect({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(TAB_ROUTES[tab ?? ""] ?? "/erp/stock");
}
