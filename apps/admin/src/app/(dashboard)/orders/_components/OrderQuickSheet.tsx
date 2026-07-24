"use client";

import { useRouter } from "next/navigation";
import {
  Mail, Phone, Building2, Package, ArrowRight, CreditCard, Truck,
  UserCheck, Hash, CalendarClock, ExternalLink, Tag, MapPin,
  FileText, Printer, Receipt, ChevronDown, ImageIcon, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG, type LeadStatus } from "@/components/status-badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PREDEFINED_TAGS } from "@udo-craft/shared";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
  mockup_url?: string;
  custom_print_url?: string;
}

interface Lead {
  id: string;
  status: LeadStatus;
  created_at?: string;
  updated_at?: string;
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
    delivery?: string;
    delivery_details?: string;
    source?: string;
    source_details?: string;
    social_channel?: string;
    tg_username?: string;
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

const STATUSES: LeadStatus[] = [
  "draft", "new", "in_progress", "production", "completed", "archived",
];

function fmt(cents: number) {
  return `₴${(cents / 100).toLocaleString("uk-UA", { minimumFractionDigits: 0 })}`;
}

function fmtDateTime(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return `Сьогодні ${d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
}

// ── Component ────────────────────────────────────────────────────────────────

export function OrderQuickSheet({ lead, open, onClose, onStatusChange }: OrderQuickSheetProps) {
  const router = useRouter();

  if (!lead) return null;

  const { customer_data: cd, order_items = [], tags = [], notes, total_amount_cents, status, id } = lead;
  const tagMap = Object.fromEntries(PREDEFINED_TAGS.map((t) => [t.id, t]));
  const cfg = STATUS_CONFIG[status];

  const shippingCents = cd.keycrm_shipping_price_cents ?? 0;
  const orderNum = cd.keycrm_id ? `#${cd.keycrm_id}` : `#${id.slice(0, 8).toUpperCase()}`;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[380px] max-w-full p-0 flex flex-col gap-0 overflow-hidden bg-white"
        showCloseButton={false}
      >
        {/* ── Header ── */}
        <SheetHeader className="flex-row items-start justify-between px-5 pt-5 pb-4 gap-3 shrink-0">
          <div>
            <SheetTitle className="text-base font-bold text-foreground leading-tight">
              {orderNum}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{cd.name}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={`/orders/${id}`} target="_blank">
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              ×
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── Status dropdown ── */}
          <div className="px-5 pb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors",
                  cfg.bg, cfg.text
                )}>
                  <span>{cfg.label}</span>
                  <ChevronDown className="size-4 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[calc(380px-40px)]">
                {STATUSES.map((s) => {
                  const c = STATUS_CONFIG[s];
                  return (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => { if (s !== status) onStatusChange(id, s); }}
                      className={cn("gap-2.5", s === status && "font-semibold")}
                    >
                      <span className={cn("size-2 rounded-full shrink-0", c.dot)} />
                      {c.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Action buttons ── */}
          <div className="px-5 pb-5 space-y-2">
            <ActionRow icon={Truck} label="Створити ТТН" onClick={() => {}} />
            <ActionRow icon={Receipt} label="Фіскальний чек" onClick={() => {}} />
            <ActionRow icon={Printer} label="Print Order" onClick={() => window.print()} />
          </div>

          {/* ── Order info section ── */}
          <SectionBlock label="ЗАМОВЛЕННЯ">
            <InfoRow icon={Hash} value={orderNum} />
            {lead.created_at && (
              <InfoRow icon={CalendarClock} value={fmtDateTime(lead.created_at) || "—"} />
            )}
            {cd.keycrm_manager_name && (
              <InfoRow icon={UserCheck} value={cd.keycrm_manager_name} />
            )}
            {cd.keycrm_payment_status && (
              <InfoRow
                icon={CreditCard}
                value={
                  cd.keycrm_payment_status === "paid" ? "Оплачено" :
                  cd.keycrm_payment_status === "part_paid" ? "Частково оплачено" :
                  "Не оплачено"
                }
                valueClass={
                  cd.keycrm_payment_status === "paid" ? "text-emerald-600 font-medium" :
                  cd.keycrm_payment_status === "not_paid" ? "text-red-600 font-medium" :
                  "text-amber-600 font-medium"
                }
              />
            )}
            {(cd.source || cd.source_details) && (
              <InfoRow
                icon={Tag}
                value={[cd.source, cd.source_details].filter(Boolean).join(" · ")}
              />
            )}
          </SectionBlock>

          {/* ── Contacts section ── */}
          {(cd.name || cd.email || cd.phone || cd.company || cd.keycrm_recipient_name || cd.delivery_details || cd.keycrm_tracking_code || cd.social_channel || cd.tg_username) && (
            <SectionBlock label="КОНТАКТИ">
              {cd.name && <InfoRow icon={UserCheck} value={cd.name} />}
              {cd.company && <InfoRow icon={Building2} value={cd.company} />}
              {cd.keycrm_recipient_name && cd.keycrm_recipient_name !== cd.name && (
                <InfoRow icon={Truck} value={cd.keycrm_recipient_name} label="Отримувач" />
              )}
              {(cd.delivery || cd.delivery_details) && (
                <InfoRow icon={MapPin} value={[cd.delivery, cd.delivery_details].filter(Boolean).join(" — ")} />
              )}
              {cd.email && (
                <InfoRow icon={Mail} value={cd.email} href={`mailto:${cd.email}`} />
              )}
              {(cd.phone || cd.keycrm_recipient_phone) && (
                <InfoRow
                  icon={Phone}
                  value={cd.phone || cd.keycrm_recipient_phone || ""}
                  href={`tel:${cd.phone || cd.keycrm_recipient_phone}`}
                />
              )}
              {(cd.social_channel || cd.tg_username) && (
                <InfoRow
                  icon={ExternalLink}
                  value={cd.social_channel || `@${cd.tg_username}`}
                />
              )}
              {cd.keycrm_tracking_code && (
                <InfoRow
                  icon={Truck}
                  value={`ТТН: ${cd.keycrm_tracking_code}`}
                  valueClass="font-mono text-xs"
                />
              )}
            </SectionBlock>
          )}

          {/* ── Notes ── */}
          {notes && (
            <SectionBlock label="НОТАТКИ">
              <div className="flex gap-3">
                <FileText className="size-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{notes}</p>
              </div>
            </SectionBlock>
          )}

          {/* ── Tags ── */}
          {tags.length > 0 && (
            <SectionBlock label="ТЕГИ">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tagId) => {
                  const tag = tagMap[tagId];
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ color: tag.color, backgroundColor: tag.bg }}
                    >
                      {tag.label}
                    </span>
                  );
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── Products section ── */}
          <SectionBlock label="ТОВАРИ">
            {order_items.length === 0 ? (
              <div className="flex items-center gap-3 py-1">
                <Package className="size-4 text-muted-foreground/40 shrink-0" />
                <span className="text-sm text-muted-foreground">Товари відсутні</span>
              </div>
            ) : (
              <div className="space-y-4">
                {order_items.map((item) => {
                  const unitCents = item.unit_price_cents ?? item.technical_metadata?.unit_price_cents ?? 0;
                  const lineCents = unitCents * item.quantity;
                  const imgUrl = item.mockup_url || item.custom_print_url || null;
                  const name = item.technical_metadata?.keycrm_product_name
                    || item.technical_metadata?.item_note
                    || "Позиція";
                  const detailParts = [
                    item.size && `РОЗМІР: ${item.size}`,
                    item.color && `КОЛІР: ${item.color.toUpperCase()}`,
                  ].filter(Boolean).join(" • ");
                  const hasMockup = !!(item.mockup_url || item.custom_print_url);

                  return (
                    <div key={item.id}>
                      {/* Product image(s) */}
                      <div className="flex gap-2 mb-2">
                        <ProductThumb url={imgUrl} alt={name} />
                        {hasMockup && <ProductThumb url={imgUrl} alt={name} />}
                      </div>
                      {/* Name + price */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {name} × {item.quantity}
                          </p>
                          {detailParts && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide">
                              {detailParts}
                            </p>
                          )}
                          {(item.mockup_url || item.custom_print_url) && (
                            <a
                              href={item.mockup_url || item.custom_print_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                            >
                              <Pencil className="size-2.5" />
                              Макет {item.mockup_url ? "друку" : "принта"}
                            </a>
                          )}
                        </div>
                        {lineCents > 0 && (
                          <span className="text-sm font-semibold text-foreground shrink-0 tabular-nums">
                            ₴{(lineCents / 100).toLocaleString("uk-UA", { minimumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total row */}
            {total_amount_cents > 0 && (
              <div className="mt-5 pt-4 border-t border-border/60">
                {shippingCents > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Доставка</span>
                    <span className="tabular-nums">{fmt(shippingCents)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Разом</span>
                  <span className="text-base font-bold text-primary tabular-nums">
                    {fmt(total_amount_cents)}
                  </span>
                </div>
              </div>
            )}
          </SectionBlock>

          {/* ── Open full order ── */}
          <div className="px-5 py-5">
            <Button
              className="w-full gap-2 h-10"
              onClick={() => router.push(`/orders/${id}`)}
            >
              Відкрити повне замовлення
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 pb-5">
      <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase mb-3">
        {label}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  value,
  label,
  href,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label?: string;
  href?: string;
  valueClass?: string;
}) {
  const text = (
    <span className={cn("text-sm text-foreground/90 min-w-0", valueClass)}>
      {value}
    </span>
  );
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-3.5 text-muted-foreground/50 shrink-0" />
      <div className="flex items-center gap-1.5 min-w-0">
        {href ? (
          <a href={href} className="text-sm text-primary hover:underline truncate" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {value}
          </a>
        ) : text}
        {label && <span className="text-[10px] text-muted-foreground/50">· {label}</span>}
      </div>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60 bg-white hover:bg-muted/40 transition-colors text-sm font-medium text-foreground text-left"
    >
      <Icon className="size-4 text-muted-foreground/60 shrink-0" />
      {label}
    </button>
  );
}

function ProductThumb({ url, alt }: { url: string | null; alt: string }) {
  return (
    <div className="w-[calc(50%-4px)] aspect-[4/3] rounded-lg border border-border/60 bg-muted/30 overflow-hidden flex items-center justify-center">
      {url ? (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <ImageIcon className="size-6 text-muted-foreground/30" />
      )}
    </div>
  );
}
