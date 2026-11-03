"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Calendar, ExternalLink, Loader2, Mail, MessageCircle, Package, Phone, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { InfoRow, StatRow } from "@/components/detail-bits";
import { DetailPage } from "@/components/page-templates";
import { StatusBadge } from "@/components/status-badge";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { clientHref, deleteClient, useClients } from "../_lib/clients";

const TABS = [
  { key: "overview", label: "Профіль" },
  { key: "orders", label: "Замовлення" },
  { key: "activity", label: "Активність" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default function ClientPage({ params }: { params: Promise<{ key: string }> }) {
  const { key: rawKey } = use(params);
  const key = decodeURIComponent(rawKey);
  const router = useRouter();
  const { clients, loading } = useClients();
  const [tab, setTab] = useState<Tab>("overview");
  const [deleting, setDeleting] = useState(false);
  const client = clients.find((c) => c.key === key);

  if (loading || !client) {
    return (
      <DetailPage title={loading ? "Клієнт" : "Клієнта не знайдено"} backHref="/clients">
        {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : <p className="text-sm text-muted-foreground">Можливо, його записи вже видалено.</p>}
      </DetailPage>
    );
  }

  const remove = async () => {
    if (!confirm(`Видалити клієнта "${client.name}" та всі його записи? Це незворотно.`)) return;
    setDeleting(true);
    try {
      await deleteClient(client);
      toast.success("Клієнта видалено");
      router.push("/clients");
    } catch {
      toast.error("Помилка видалення");
      setDeleting(false);
    }
  };

  const copyContact = async () => {
    try {
      await navigator.clipboard.writeText([client.name, client.company, client.email, client.phone, client.social_channel].filter(Boolean).join("\n"));
      toast.success("Контакти скопійовано");
    } catch {
      toast.error("Не вдалося скопіювати");
    }
  };

  const firstLead = client.leads[0];

  return (
    <DetailPage
      title={client.name}
      subtitle={client.email || client.phone}
      status={<Badge variant={client.keycrmOrders > 0 ? "info" : "outline"} className="text-[10px] normal-case tracking-normal">{client.keycrmOrders > 0 ? "KeyCRM" : "Вручну"}</Badge>}
      backHref="/clients"
      breadcrumbs={[{ label: "Клієнти", href: "/clients" }, { label: client.name }]}
      tabs={TABS.map((t) => (t.key === "orders" && client.ordersCount > 0 ? { ...t, label: `${t.label} (${client.ordersCount})` } : t))}
      tab={tab}
      onTabChange={setTab}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={copyContact}>Копіювати контакт</Button>
          {firstLead && <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/messages?leadId=${firstLead.id}`} />}><MessageCircle className="size-3.5" />Чат</Button>}
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={remove} disabled={deleting}>Видалити</Button>
          <Button size="sm" nativeButton={false} render={<Link href={`${clientHref(client.key)}/edit`} />}>Редагувати</Button>
        </>
      }
    >
      {tab === "overview" && (
        <>
          <StatRow stats={[
            { label: "Замовлень", value: String(client.ordersCount) },
            { label: "Витрачено", value: fmtMoney(client.totalSpent) },
            { label: "Оплачено", value: fmtMoney(client.paidTotal) },
          ]} />
          <AdminSection title="Контакти">
            <AdminTablePanel className="space-y-3 p-4">
              {client.phone && <InfoRow icon={Phone} value={client.phone} href={`tel:${client.phone}`} />}
              {client.email && <InfoRow icon={Mail} value={client.email} href={`mailto:${client.email}`} />}
              {client.company && <InfoRow icon={Building2} value={client.company} />}
              {client.social_channel && <InfoRow icon={ExternalLink} value={client.social_channel} />}
              {client.lastManager && <InfoRow icon={Users} value={client.lastManager} label="Менеджер" />}
              <InfoRow icon={Calendar} value={fmtDate(client.lastOrderAt)} label="Останнє замовлення" />
            </AdminTablePanel>
          </AdminSection>
        </>
      )}

      {tab === "orders" && (
        <AdminSection title="Замовлення" actions={<Button variant="outline" size="sm" nativeButton={false} render={<Link href="/orders/new" />}>Нове замовлення</Button>}>
          {client.leads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Замовлень немає</p>
          ) : (
            <div className="space-y-3">
              {client.leads.map((lead) => (
                <AdminTablePanel key={lead.id}>
                  <Link href={`/orders/${lead.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">{fmtMoney(lead.total_amount_cents)}</span>
                        {lead.customer_data?.keycrm_id && <span className="font-mono text-[10px] text-muted-foreground">#{lead.customer_data.keycrm_id}</span>}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(lead.created_at)}</p>
                    </div>
                    <StatusBadge status={lead.status} />
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/40" />
                  </Link>
                  {lead.order_items && lead.order_items.length > 0 && (
                    <div className="space-y-2.5 border-t border-border/40 bg-muted/10 px-4 py-3">
                      {lead.order_items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3">
                          {item.mockup_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.mockup_url} alt="Макет" className="size-12 shrink-0 rounded-lg border border-border/60 object-cover" />
                          ) : (
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/40"><Package className="size-4 text-muted-foreground/40" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{item.color} / {item.size}</p>
                            <p className="text-[10px] text-muted-foreground">× {item.quantity}</p>
                            {item.custom_print_url && (
                              <a href={item.custom_print_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"><ExternalLink className="size-2.5" /> Принт</a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AdminTablePanel>
              ))}
            </div>
          )}
        </AdminSection>
      )}

      {tab === "activity" && (
        <AdminSection title="Активність">
          <div className="relative space-y-0 pl-4">
            <div className="absolute bottom-0 left-[7px] top-1 w-px bg-border/60" />
            {client.leads.slice(0, 12).map((lead) => (
              <div key={lead.id} className="relative pb-4 last:pb-0">
                <div className="absolute -left-[13px] top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
                <p className="text-xs font-semibold">{fmtMoney(lead.total_amount_cents)}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtDate(lead.created_at)}</p>
                <div className="mt-1"><StatusBadge status={lead.status} className="h-4 px-1.5 text-[9px]" /></div>
              </div>
            ))}
          </div>
        </AdminSection>
      )}
    </DetailPage>
  );
}
