"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Calendar, Check, Clock, Download, ExternalLink, FileText, FolderOpen, Loader2, Mail, Package, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FileViewer, isImage } from "@/components/file-viewer";
import { generateInvoicePDF } from "@/lib/generate-invoice";
import { aggregateOrderFiles } from "@/lib/aggregateOrderFiles";
import { CabinetPage } from "../../_components/CabinetPage";
import { OrderChat } from "../../_components/OrderChat";
import { PROGRESS_STEPS, useCabinet, useStatusConfig, type Message } from "../../_lib/cabinet";

type Tab = "details" | "chat" | "files";
const TABS: Tab[] = ["details", "chat", "files"];

function Row({ icon: Icon, value, label }: { icon: React.ElementType; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="break-words text-sm">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("cabinet");
  const statusConfig = useStatusConfig();
  const searchParams = useSearchParams();
  const { leads, loading, user, unreadByLead } = useCabinet();
  const lead = leads.find((l) => l.id === id);

  const initial = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(TABS.includes(initial as Tab) ? (initial as Tab) : "details");
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [fileMessages, setFileMessages] = useState<Message[]>([]);

  // Files from chat attachments are only needed on the Files tab.
  useEffect(() => {
    if (tab !== "files" || !lead) return;
    fetch(`/api/cabinet/messages?lead_id=${lead.id}`).then(async (res) => res.ok && setFileMessages((await res.json()) || []));
  }, [tab, lead]);

  const orderFiles = useMemo<string[]>(
    () => (lead ? aggregateOrderFiles(lead as unknown as Parameters<typeof aggregateOrderFiles>[0], fileMessages as unknown as Parameters<typeof aggregateOrderFiles>[1]) : []),
    [lead, fileMessages],
  );

  if (loading || !lead) {
    return (
      <CabinetPage title={loading ? t("orders.title") : t("order.notFound")} backHref="/cabinet" backLabel={t("order.back")}>
        <div className="flex justify-center py-16">
          {loading ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <Link href="/cabinet" className="text-sm text-primary hover:underline">{t("order.back")}</Link>}
        </div>
      </CabinetPage>
    );
  }

  const cfg = statusConfig(lead.status);
  const StatusIcon = cfg.icon;
  const cd = lead.customer_data;
  const title = cd.company || cd.name;
  const stepIndex = lead.status === "archived" ? PROGRESS_STEPS.length - 1 : Math.max(0, PROGRESS_STEPS.indexOf(lead.status));
  const deliveryLabel = cd.delivery ? (["nova_poshta", "ukrposhta", "pickup"].includes(cd.delivery) ? t(`delivery.${cd.delivery}`) : cd.delivery) : null;

  const downloadInvoice = async () => {
    setGeneratingPdf(true);
    try {
      const totalQty = lead.order_items?.reduce((s, i) => s + i.quantity, 0) || 1;
      await generateInvoicePDF({
        items: (lead.order_items || []).map((item) => ({
          productName: `Товар (${item.color})`,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          // Stored unit price when present; legacy items fall back to an even split.
          unitPriceCents: item.unit_price_cents != null ? item.unit_price_cents : Math.round(lead.total_amount_cents / Math.max(1, totalQty)),
          printUrl: item.custom_print_url,
        })),
        contact: { name: cd.name, email: cd.email, phone: cd.phone || "", company: cd.company },
        createdAt: new Date(lead.created_at),
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <>
      {viewerUrl && <FileViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />}
      <CabinetPage
        title={title}
        subtitle={cd.email}
        backHref="/cabinet"
        backLabel={t("order.back")}
        status={<span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.color}`}><StatusIcon className="size-3" />{cfg.label}</span>}
        tabs={TABS.map((key) => ({ key, label: t(`tabs.${key}`), badge: key === "chat" && tab !== "chat" ? unreadByLead[lead.id] || 0 : 0 }))}
        tab={tab}
        onTabChange={setTab}
        fill={tab === "chat"}
      >
        {tab === "details" && (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6">
            <section aria-label={t("tracking.title")} className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("tracking.title")}</h2>
              <ol className="grid grid-cols-4 gap-2">
                {PROGRESS_STEPS.map((step, i) => {
                  const finished = lead.status === "completed" || lead.status === "archived";
                  const done = finished || i < stepIndex;
                  const current = !finished && i === stepIndex;
                  return (
                    <li key={step} className="flex flex-col items-center gap-1.5 text-center" aria-current={current ? "step" : undefined}>
                      <span className={`flex size-7 items-center justify-center rounded-full border text-xs font-semibold ${done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                        {done ? <Check className="size-3.5" /> : i + 1}
                      </span>
                      <span className={`text-xs leading-tight ${current || done ? "font-medium text-foreground" : "text-muted-foreground"}`}>{t(`status.${step}`)}</span>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="space-y-3 rounded-xl border border-border bg-card p-4">
              {cd.phone && <Row icon={Phone} value={cd.phone} label={t("details.phone")} />}
              <Row icon={Mail} value={cd.email} label={t("details.email")} />
              {cd.company && <Row icon={Building2} value={cd.company} label={t("details.company")} />}
              <Row icon={Calendar} value={new Date(lead.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} label={t("details.orderDate")} />
              {lead.total_amount_cents > 0 && <Row icon={FileText} value={<span className="font-medium">₴{(lead.total_amount_cents / 100).toFixed(0)}</span>} label={t("details.orderAmount")} />}
              {deliveryLabel && <Row icon={Package} value={deliveryLabel} label={t("details.delivery")} />}
              {cd.deadline && <Row icon={Clock} value={new Date(cd.deadline).toLocaleDateString()} label={t("details.deadline")} />}
            </section>

            {lead.order_items && lead.order_items.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("details.positions", { n: lead.order_items.length })}</h2>
                <div className="space-y-3">
                  {lead.order_items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      {item.mockup_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.mockup_url} alt="" className="size-12 shrink-0 rounded-md border border-border object-cover" />
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted"><Package className="size-5 text-muted-foreground" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{item.color} / {item.size}</p>
                        <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                        {item.custom_print_url && (
                          <button onClick={() => setViewerUrl(item.custom_print_url!)} className="mt-0.5 flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="size-3" /> {t("details.print")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {cd.attachments?.length ? (
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("details.attachments", { n: cd.attachments.length })}</h2>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {cd.attachments.map((url, i) =>
                    isImage(url) ? (
                      <button key={i} onClick={() => setViewerUrl(url)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="aspect-square w-full rounded-md border border-border object-cover transition-opacity hover:opacity-80" />
                      </button>
                    ) : (
                      <button key={i} onClick={() => setViewerUrl(url)} className="flex items-center gap-2 truncate rounded-md border border-border p-2 text-xs text-primary transition-colors hover:bg-muted">
                        <FileText className="size-4 shrink-0" /><span className="truncate">File {i + 1}</span>
                      </button>
                    ),
                  )}
                </div>
              </section>
            ) : null}

            <Button variant="outline" className="w-full sm:w-auto" onClick={downloadInvoice} disabled={generatingPdf}>
              {generatingPdf ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              {t("details.invoice")}
            </Button>
          </div>
        )}

        {tab === "chat" && user && <OrderChat lead={lead} onOpenFile={setViewerUrl} />}

        {tab === "files" && (
          <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
            {orderFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("files.empty")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {orderFiles.map((url, i) =>
                  isImage(url) ? (
                    <button key={i} onClick={() => setViewerUrl(url)} aria-label={t("files.openFile")} className="block aspect-square overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="size-full object-cover" />
                    </button>
                  ) : (
                    <button key={i} onClick={() => setViewerUrl(url)} aria-label={t("files.openFile")} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-muted p-2 transition-colors hover:bg-muted/70">
                      <FileText className="size-6 shrink-0 text-muted-foreground" />
                      <span className="w-full truncate text-center text-xs leading-tight text-muted-foreground">{decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Файл")}</span>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </CabinetPage>
    </>
  );
}
