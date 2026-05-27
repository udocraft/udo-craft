"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, STATUS_CONFIG } from "@/components/status-badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Loader2, Save, Package, MessageCircle, Send,
  Phone, Mail, Building2, Calendar, ChevronsUpDown, X, Plus,
  FileText, Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { fmtTime } from "@/lib/utils";
import { PREDEFINED_TAGS } from "@udo-craft/shared";

// ── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  size: string;
  color: string;
  custom_print_url?: string;
  mockup_url?: string;
  unit_price_cents?: number;
  technical_metadata?: {
    unit_price_cents?: number;
    item_note?: string;
    mockups_map?: Record<string, string>;
  };
}

interface CustomerData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  edrpou?: string;
  social_channel?: string;
  delivery?: string;
  delivery_details?: string;
  source?: string;
  source_details?: string;
  deadline?: string;
  comment?: string;
}

interface Lead {
  id: string;
  status: "draft" | "new" | "in_progress" | "production" | "completed" | "archived";
  customer_data: CustomerData;
  payment_status?: "unpaid" | "partial" | "paid" | "refunded";
  payment_amount_cents?: number;
  buyer_requisites?: Record<string, unknown>;
  nova_poshta_data?: Record<string, unknown>;
  fiscal_data?: Record<string, unknown>;
  tags?: string[];
  notes?: string;
  total_amount_cents: number;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

interface Message {
  id: string;
  lead_id: string;
  body: string;
  sender: "client" | "manager";
  sender_email?: string;
  created_at: string;
  read_at?: string | null;
  attachments?: string[];
}

const STATUSES = ["draft", "new", "in_progress", "production", "completed", "archived"] as const;
const STATUS_LABELS: Record<string, string> = {
  draft: "Чернетка", new: "Новий", in_progress: "В роботі",
  production: "Виробництво", completed: "Завершено", archived: "Архів",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Contact form state
  const [contactData, setContactData] = useState<CustomerData>({ name: "" });

  // Status / tags / notes
  const [status, setStatus] = useState<Lead["status"]>("new");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [savingTags, setSavingTags] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");
  const [erpSaving, setErpSaving] = useState(false);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  // ── Fetch lead ──────────────────────────────────────────────────────────────

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/leads/${id}`);
      if (!r.ok) throw new Error("Not found");
      const data: Lead = await r.json();
      setLead(data);
      setContactData(data.customer_data);
      setStatus(data.status);
      setTags(data.tags ?? []);
      setNotes(data.notes ?? "");
    } catch {
      toast.error("Замовлення не знайдено");
      router.push("/orders");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  // ── Fetch messages ──────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const r = await fetch(`/api/messages?lead_id=${id}`);
      if (r.ok) {
        const msgs: Message[] = await r.json();
        messageIdsRef.current = new Set(msgs.map((m) => m.id));
        setMessages(msgs);
      }
    } catch { /* non-critical */ }
    setLoadingMessages(false);
  }, [id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Save contact + notes ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!contactData.name.trim()) {
      toast.error("Ім'я обов'язкове");
      return;
    }
    if (!contactData.phone?.trim() || !contactData.email?.trim()) {
      toast.error("Телефон та email обов'язкові");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_data: contactData, notes }),
      });
      if (!r.ok) throw new Error();
      const updated: Lead = await r.json();
      setLead(updated);
      toast.success("Збережено");
    } catch {
      toast.error("Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const saveErpOrderData = async (patch?: Partial<Lead>) => {
    const current = patch ? { ...lead, ...patch } : lead;
    if (!current) return;
    setErpSaving(true);
    try {
      const r = await fetch(`/api/erp/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_status: current.payment_status ?? "unpaid",
          payment_amount_cents: current.payment_amount_cents ?? 0,
          buyer_requisites: current.buyer_requisites ?? {},
          nova_poshta_data: current.nova_poshta_data ?? {},
          fiscal_data: current.fiscal_data ?? {},
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Помилка збереження ERP даних");
      const updated: Lead = await r.json();
      setLead(updated);
      toast.success("ERP дані замовлення збережено");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка збереження ERP даних");
    } finally {
      setErpSaving(false);
    }
  };

  const runOrderAction = async (action: "nova-poshta-waybill" | "fiscal-check") => {
    setErpSaving(true);
    try {
      const r = await fetch(`/api/erp/orders/${id}/${action}`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).error || "Дія недоступна");
      await fetchLead();
      toast.success(action === "fiscal-check" ? "Дані фіскального чека підготовлено" : "Дані ТТН підготовлено");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Дія недоступна");
    } finally {
      setErpSaving(false);
    }
  };

  // ── Status change ───────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: Lead["status"]) => {
    const prev = status;
    setStatus(newStatus);
    try {
      const r = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error();
      setLead((l) => l ? { ...l, status: newStatus } : l);
      // Log status change as a message
      const prevLabel = STATUS_LABELS[prev] || prev;
      const label = STATUS_LABELS[newStatus] || newStatus;
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: id, body: `Статус змінено: ${prevLabel} → ${label}`, attachments: [] }),
      });
      fetchMessages();
    } catch {
      setStatus(prev);
      toast.error("Помилка зміни статусу");
    }
  };

  // ── Tags ────────────────────────────────────────────────────────────────────

  const handleToggleTag = async (tagId: string) => {
    if (savingTags) return;
    const next = tags.includes(tagId) ? tags.filter((t) => t !== tagId) : [...tags, tagId];
    setTags(next);
    setSavingTags(true);
    try {
      const r = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      if (!r.ok) throw new Error();
      setLead((l) => l ? { ...l, tags: next } : l);
    } catch {
      setTags(tags);
      toast.error("Помилка збереження тегу");
    } finally {
      setSavingTags(false);
    }
  };

  const handleAddCustomTag = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    await handleToggleTag(trimmed);
    setCustomTagInput("");
  };

  // ── Messages ────────────────────────────────────────────────────────────────

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (!r.ok) throw new Error("Upload failed");
    const { results } = await r.json();
    return results.map((x: { url: string }) => x.url);
  };

  const handleSend = async () => {
    if (!replyText.trim() && !pendingFiles.length) return;
    setSending(true);
    try {
      let attachments: string[] = [];
      if (pendingFiles.length) {
        setUploading(true);
        attachments = await uploadFiles(pendingFiles);
        setUploading(false);
      }
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: id, body: replyText.trim(), attachments }),
      });
      if (!r.ok) throw new Error();
      const newMsg: Message = await r.json();
      setMessages((prev) => [...prev, newMsg]);
      setReplyText("");
      setPendingFiles([]);
    } catch {
      toast.error("Помилка відправки");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) return null;

  const shortId = lead.id.slice(0, 8).toUpperCase();

  return (
    <DashboardPage
      title={`#${shortId}`}
      eyebrow="Замовлення"
      backHref="/orders"
      maxWidth="7xl"
      actions={
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
          Зберегти
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column: contact data + order items ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Contact data */}
            <Card className="shadow-none border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Контактні дані</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Ім&apos;я та прізвище *</Label>
                  <Input
                    id="name"
                    value={contactData.name}
                    onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                    placeholder="Іван Петренко"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Телефон *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={contactData.phone ?? ""}
                    onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                    placeholder="+380 67 123 4567"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactData.email ?? ""}
                    onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                    placeholder="ivan@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Компанія</Label>
                  <Input
                    id="company"
                    value={contactData.company ?? ""}
                    onChange={(e) => setContactData({ ...contactData, company: e.target.value })}
                    placeholder="ТОВ Приклад"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edrpou">ЄДРПОУ</Label>
                  <Input
                    id="edrpou"
                    value={contactData.edrpou ?? ""}
                    onChange={(e) => setContactData({ ...contactData, edrpou: e.target.value })}
                    placeholder="12345678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="social_channel">Соцмережа</Label>
                  <Input
                    id="social_channel"
                    value={contactData.social_channel ?? ""}
                    onChange={(e) => setContactData({ ...contactData, social_channel: e.target.value })}
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery">Доставка</Label>
                  <Select
                    value={contactData.delivery ?? "nova_poshta"}
                    onValueChange={(v) => setContactData({ ...contactData, delivery: v || undefined })}
                  >
                    <SelectTrigger id="delivery">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nova_poshta">Нова Пошта</SelectItem>
                      <SelectItem value="pickup">Самовивіз</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deadline">Дедлайн</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={contactData.deadline ?? ""}
                    onChange={(e) => setContactData({ ...contactData, deadline: e.target.value })}
                  />
                </div>
              </div>
	              <div className="space-y-1.5">
	                <Label htmlFor="delivery_details">Адреса доставки</Label>
                <Input
                  id="delivery_details"
                  value={contactData.delivery_details ?? ""}
                  onChange={(e) => setContactData({ ...contactData, delivery_details: e.target.value })}
                  placeholder="м. Київ, відділення №1"
                />
	              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="source">Як дізнались</Label>
                  <Input
                    id="source"
                    value={contactData.source ?? ""}
                    onChange={(e) => setContactData({ ...contactData, source: e.target.value })}
                    placeholder="Instagram, Google, рекомендація..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="source_details">Контекст</Label>
                  <Input
                    id="source_details"
                    value={contactData.source_details ?? ""}
                    onChange={(e) => setContactData({ ...contactData, source_details: e.target.value })}
                    placeholder="Додаткові деталі"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comment">Коментар клієнта</Label>
                <Textarea
                  id="comment"
                  value={contactData.comment ?? ""}
                  onChange={(e) => setContactData({ ...contactData, comment: e.target.value })}
                  placeholder="Побажання клієнта..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Order items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Товари</CardTitle>
            </CardHeader>
            <CardContent>
              {!lead.order_items?.length ? (
                <EmptyState icon={Package} title="Немає позицій" className="py-8" />
              ) : (
                <div className="space-y-3">
                  {lead.total_amount_cents > 0 && (
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Загальна сума</span>
                      <span className="font-semibold">{(lead.total_amount_cents / 100).toLocaleString("uk-UA")} ₴</span>
                    </div>
                  )}
                  {lead.order_items.map((item) => {
                    const unitPrice = item.unit_price_cents ?? item.technical_metadata?.unit_price_cents;
                    return (
                      <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{item.size}</span>
                            {item.color && (
                              <span className="text-xs text-muted-foreground">{item.color}</span>
                            )}
                            <span className="text-xs text-muted-foreground">× {item.quantity} шт.</span>
                          </div>
                          {item.technical_metadata?.item_note && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.technical_metadata.item_note}</p>
                          )}
                        </div>
                        {unitPrice && (
                          <span className="text-sm font-medium shrink-0">
                            {((unitPrice * item.quantity) / 100).toLocaleString("uk-UA")} ₴
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: status, tags, notes ── */}
        <div className="space-y-6">

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Статус</CardTitle>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                    <StatusBadge status={status} />
                    <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {STATUSES.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.className ?? ""}`} />
                      {STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>Створено: {new Date(lead.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                {lead.updated_at !== lead.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    <span>Оновлено: {new Date(lead.updated_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ERP order data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Оплата, доставка, документи</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Оплата покупця</Label>
                <Select
                  value={lead.payment_status ?? "unpaid"}
                  onValueChange={(v) => setLead((l) => l ? { ...l, payment_status: v as Lead["payment_status"] } : l)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Не оплачено</SelectItem>
                    <SelectItem value="partial">Частково</SelectItem>
                    <SelectItem value="paid">Оплачено</SelectItem>
                    <SelectItem value="refunded">Повернення</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Сума оплати, ₴</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(lead.payment_amount_cents ?? 0) / 100}
                  onChange={(e) => setLead((l) => l ? { ...l, payment_amount_cents: Math.round(Number(e.target.value) * 100) } : l)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Реквізити оптовика</Label>
                <Textarea
                  rows={3}
                  value={String((lead.buyer_requisites?.text as string | undefined) ?? "")}
                  onChange={(e) => setLead((l) => l ? { ...l, buyer_requisites: { ...(l.buyer_requisites ?? {}), text: e.target.value } } : l)}
                  placeholder="ТОВ, ЄДРПОУ, ІПН, адреса, договір..."
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" size="sm" onClick={() => saveErpOrderData()} disabled={erpSaving}>
                  {erpSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Зберегти оплату і реквізити
                </Button>
                <Button variant="outline" size="sm" onClick={() => runOrderAction("nova-poshta-waybill")} disabled={erpSaving}>
                  Створити ТТН Нової Пошти
                </Button>
                <Button variant="outline" size="sm" onClick={() => runOrderAction("fiscal-check")} disabled={erpSaving}>
                  Фіскалізувати Checkbox
                </Button>
              </div>
              {(Boolean(lead.nova_poshta_data?.waybill) || Boolean(lead.fiscal_data?.status)) && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  {lead.nova_poshta_data?.waybill ? <p>НП: {String((lead.nova_poshta_data.waybill as Record<string, unknown>).status ?? "підготовлено")}</p> : null}
                  {lead.fiscal_data?.status ? <p>Checkbox: {String(lead.fiscal_data.status)}</p> : null}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Теги</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_TAGS.map((tag) => {
                  const active = tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      disabled={savingTags}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
                      style={active
                        ? { color: tag.color, backgroundColor: tag.bg, borderColor: `${tag.color}50` }
                        : { color: "var(--color-muted-foreground)", backgroundColor: "transparent", borderColor: "var(--color-border)" }
                      }
                    >
                      <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.color, opacity: active ? 1 : 0.35 }} />
                      {tag.label}
                    </button>
                  );
                })}
                {tags.filter((t) => !PREDEFINED_TAGS.find((p) => p.id === t)).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium border border-border bg-muted/40 text-foreground">
                    {tag}
                    <button type="button" onClick={() => handleToggleTag(tag)} disabled={savingTags} className="opacity-40 hover:opacity-80 transition-opacity">
                      <X className="size-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); void handleAddCustomTag(customTagInput); }}
                className="flex items-center gap-2"
              >
                <Input
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  placeholder="Свій тег..."
                  className="h-7 text-xs"
                />
                {customTagInput.trim() && (
                  <Button type="submit" size="icon" className="h-7 w-7 shrink-0" disabled={savingTags}>
                    <Plus className="size-3" />
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Нотатки</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Внутрішні нотатки..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => router.push(`/messages?leadId=${id}`)}>
              <MessageCircle className="size-4" />
              Відкрити чат
            </Button>
          </div>
        </div>
      </div>

      {/* ── Messages thread ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="size-4" />
            Повідомлення
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Thread */}
          <div className="px-4 py-4 space-y-3 max-h-96 overflow-y-auto border-b border-border">
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState icon={MessageCircle} title="Повідомлень ще немає" className="py-8" />
            ) : (
              <>
                {messages.map((msg) => {
                  const isMgr = msg.sender === "manager";
                  const isSystem = isMgr && msg.body?.startsWith("Статус змінено:");

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {msg.body} · {fmtTime(msg.created_at)}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex flex-col gap-0.5 ${isMgr ? "items-end" : "items-start"}`}>
                      <div className={`flex items-end gap-1.5 ${isMgr ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${isMgr ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                          {msg.body && <p className="text-sm leading-relaxed">{msg.body}</p>}
                          {msg.attachments?.length ? (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {msg.attachments.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${isMgr ? "border-primary-foreground/20 text-primary-foreground/80 hover:bg-primary-foreground/10" : "border-border text-foreground hover:bg-background"} transition-colors`}>
                                  <FileText className="size-3.5 shrink-0" />
                                  <span className="truncate max-w-[120px]">{decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Файл")}</span>
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 pb-0.5">
                          {fmtTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Reply input */}
          <div className="px-4 py-3 space-y-2">
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="relative group">
                    {f.type.startsWith("image/") ? (
                      <img src={URL.createObjectURL(f)} alt={f.name} className="h-12 w-12 object-cover rounded-lg border border-border" />
                    ) : (
                      <div className="h-12 w-24 flex items-center gap-1.5 px-2 rounded-lg border border-border bg-muted">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-xs truncate">{f.name}</span>
                      </div>
                    )}
                    <button
                      onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive hover:text-white transition-colors"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <label className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.svg,.zip"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    setPendingFiles((p) => [...p, ...files]);
                    e.target.value = "";
                  }}
                />
                <Paperclip className="size-4" aria-label="Прикріпити файл" />
              </label>
              <Input
                placeholder="Написати повідомлення..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                disabled={sending}
                className="flex-1"
              />
              <Button
                onClick={() => void handleSend()}
                disabled={sending || uploading || (!replyText.trim() && !pendingFiles.length)}
                size="icon"
                aria-label="Надіслати"
              >
                {sending || uploading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardPage>
  );
}
