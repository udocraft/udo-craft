"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, Loader2, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CabinetPage } from "../_components/CabinetPage";
import { useCabinet, useStatusConfig } from "../_lib/cabinet";

/** Conversations are per order, so this lists orders and opens each one's chat. */
export default function MessagesPage() {
  const t = useTranslations("cabinet");
  const statusConfig = useStatusConfig();
  const { leads, loading, unreadByLead } = useCabinet();
  const sorted = [...leads].sort((a, b) => (unreadByLead[b.id] || 0) - (unreadByLead[a.id] || 0));

  return (
    <CabinetPage title={t("messages.title")} subtitle={t("messages.subtitle")}>
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageCircle className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {sorted.map((lead) => {
              const unread = unreadByLead[lead.id] || 0;
              return (
                <li key={lead.id}>
                  <Link href={`/cabinet/orders/${lead.id}?tab=chat`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {(lead.customer_data.company || lead.customer_data.name)?.[0]?.toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.customer_data.company || lead.customer_data.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {statusConfig(lead.status).label} · {new Date(lead.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {unread > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>}
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
