"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, Loader2, MessageCircle, Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CabinetPage } from "./_components/CabinetPage";
import { useCabinet, useStatusConfig } from "./_lib/cabinet";

export default function OrdersPage() {
  const t = useTranslations("cabinet");
  const statusConfig = useStatusConfig();
  const { leads, loading, unreadByLead } = useCabinet();

  return (
    <CabinetPage title={t("orders.title")} subtitle={t("orders.subtitle")}>
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/" />}>{t("toCatalog")}</Button>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {leads.map((lead) => {
              const cfg = statusConfig(lead.status);
              const unread = unreadByLead[lead.id] || 0;
              return (
                <li key={lead.id}>
                  <Link href={`/cabinet/orders/${lead.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.customer_data.company || lead.customer_data.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        {lead.order_items?.length ? ` · ${t("details.positions", { n: lead.order_items.length })}` : ""}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        <MessageCircle className="size-3" />+{unread}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
                    {lead.total_amount_cents > 0 && <span className="w-16 text-right text-sm font-semibold tabular-nums">{(lead.total_amount_cents / 100).toFixed(0)} ₴</span>}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CabinetPage>
  );
}
