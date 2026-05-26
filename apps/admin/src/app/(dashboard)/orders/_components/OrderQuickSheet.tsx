"use client";

import Link from "next/link";
import { Mail, Phone, Building2, Package, ArrowRight, CreditCard, Truck, UserCheck, Hash, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, STATUS_CONFIG, type LeadStatus } from "@/components/status-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PREDEFINED_TAGS } from "@udo-craft/shared";

// ── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  size: string;
  color: string;
  unit_price_cents?: number;
  technical_metadata?: {
    unit_price_cents?: number;
    item_note?: string;
    keycrm_product_name?: string;
    keycrm_sku?: string | null;
    keycrm_price_sold_cents?: number;
    keycrm_purchased_price_cents?: number;
  };
}

interface Lead {
  id: string;
  status: LeadStatus;
  customer_data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    keycrm_id?: number | string;
    keycrm_client_id?: number | string;
    keycrm_manager_name?: string;
    keycrm_payment_status?: string;
    keycrm_payments_total_cents?: number;
    keycrm_products_total_cents?: number;
    keycrm_shipping_price_cents?: number;
    keycrm_recipient_name?: string;
    keycrm_recipient_phone?: string;
    keycrm_tracking_code?: string;
    keycrm_shipping_status?: string;
    keycrm_status_changed_at?: string;
    keycrm_status_expired_at?: string;
    delivery?: string;
    delivery_details?: string;
    source?: string;
    source_details?: string;
  };
  tags?: string[];
  notes?: string;
  total_amount_cents: number;
  order_items?: OrderItem[];
}

export interface OrderQuickSheetProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUSES = [
  "draft", "new", "in_progress", "production", "completed", "archived",
] as const;

function fmt(cents: number) {
  return `₴${(cents / 100).toLocaleString("uk-UA", { minimumFractionDigits: 0 })}`;
}

function paymentLabel(status?: string) {
  if (!status) return "Невідомо";
  if (status === "paid") return "Оплачено";
  if (status === "part_paid") return "Частково";
  if (status === "not_paid") return "Не сплачено";
  return status;
}

function fmtDateTime(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("uk-UA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export function OrderQuickSheet({ lead, open, onClose, onStatusChange }: OrderQuickSheetProps) {
  if (!lead) return null;

  const { customer_data: cd, order_items = [], tags = [], notes, total_amount_cents, status, id } = lead;

  const tagMap = Object.fromEntries(PREDEFINED_TAGS.map((t) => [t.id, t]));

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[480px] max-w-full overflow-y-auto p-0 flex flex-col gap-0"
        showCloseButton
      >
        {/* Header */}
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            Замовлення #{id.slice(0, 8)}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{cd.name}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto divide-y">
          {/* KeyCRM summary */}
          {(cd.keycrm_id || cd.keycrm_payment_status || cd.keycrm_manager_name) && (
            <section className="px-5 py-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                KeyCRM
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <InfoTile icon={Hash} label="Номер" value={cd.keycrm_id ? `#${cd.keycrm_id}` : "—"} />
                <InfoTile icon={CreditCard} label="Оплата" value={paymentLabel(cd.keycrm_payment_status)} />
                <InfoTile icon={UserCheck} label="Менеджер" value={cd.keycrm_manager_name || "—"} />
                <InfoTile icon={CalendarClock} label="Оновлено" value={fmtDateTime(cd.keycrm_status_changed_at) || "—"} />
              </div>
            </section>
          )}

          {/* Contacts — read-only */}
          <section className="px-5 py-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Контакти
            </h3>
            {cd.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{cd.email}</span>
              </div>
            )}
            {cd.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{cd.phone}</span>
              </div>
            )}
            {cd.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{cd.company}</span>
              </div>
            )}
            {(cd.source || cd.source_details) && (
              <div className="rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Джерело:</span>{" "}
                {[cd.source, cd.source_details].filter(Boolean).join(" · ")}
              </div>
            )}
            {!cd.email && !cd.phone && !cd.company && (
              <p className="text-sm text-muted-foreground">Контактні дані відсутні</p>
            )}
          </section>

          {/* Delivery */}
          {(cd.keycrm_recipient_name || cd.delivery_details || cd.keycrm_tracking_code || cd.keycrm_shipping_status) && (
            <section className="px-5 py-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Доставка
              </h3>
              {cd.keycrm_recipient_name && (
                <div className="flex items-start gap-2 text-sm">
                  <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{cd.keycrm_recipient_name}</span>
                </div>
              )}
              {cd.keycrm_recipient_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{cd.keycrm_recipient_phone}</span>
                </div>
              )}
              {cd.delivery_details && <p className="text-sm text-muted-foreground">{cd.delivery_details}</p>}
              {(cd.keycrm_tracking_code || cd.keycrm_shipping_status) && (
                <p className="text-xs text-muted-foreground">
                  {[cd.keycrm_tracking_code && `ТТН: ${cd.keycrm_tracking_code}`, cd.keycrm_shipping_status].filter(Boolean).join(" · ")}
                </p>
              )}
            </section>
          )}

          {/* Order items */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Товари
            </h3>
            {order_items.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>Товари відсутні</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {order_items.map((item) => {
                  const unitCents =
                    item.unit_price_cents ??
                    item.technical_metadata?.unit_price_cents ??
                    0;
                  const lineCents = unitCents * item.quantity;
                  return (
                    <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">
                          {item.technical_metadata?.keycrm_product_name || item.technical_metadata?.item_note || "Позиція"}
                        </p>
                        <span className="font-medium">× {item.quantity}</span>
                        {item.size && (
                          <span className="text-muted-foreground ml-1">
                            {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="text-muted-foreground ml-1">
                            · {item.color}
                          </span>
                        )}
                      </div>
                      {lineCents > 0 && (
                        <span className="text-muted-foreground shrink-0">
                          {fmt(lineCents)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {total_amount_cents > 0 && (
              <div className="mt-3 pt-3 border-t flex justify-between text-sm font-semibold">
                <span>Разом</span>
                <span>{fmt(total_amount_cents)}</span>
              </div>
            )}
          </section>

          {/* Status */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Статус
            </h3>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const isActive = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => { if (!isActive) onStatusChange(id, s); }}
                    className={[
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      isActive
                        ? "ring-2 ring-offset-1 ring-primary border-transparent " + cfg.className
                        : "border-border bg-background hover:bg-muted " + cfg.className,
                    ].join(" ")}
                    aria-pressed={isActive}
                    aria-label={`Встановити статус: ${cfg.label}`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tags */}
          {tags.length > 0 && (
            <section className="px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Теги
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tagId) => {
                  const tag = tagMap[tagId];
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ color: tag.color, backgroundColor: tag.bg }}
                    >
                      {tag.label}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* Notes preview */}
          {notes && (
            <section className="px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Нотатки
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                {notes}
              </p>
            </section>
          )}
        </div>

        {/* Footer — link to full order */}
        <div className="border-t px-5 py-4 shrink-0">
          <Button asChild variant="outline" className="w-full gap-2">
            <Link href={`/orders/${id}`}>
              Відкрити повне замовлення
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
