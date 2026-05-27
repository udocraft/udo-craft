"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPage } from "@/components/dashboard-page";
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
                    onChange={(e) => setContactData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="ПІБ"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactData.email || ""}
                    onChange={(e) => setContactData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="example@mail.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Телефон *</Label>
                  <Input
                    id="phone"
                    value={contactData.phone || ""}
                    onChange={(e) => setContactData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+380..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Компанія / Назва</Label>
                  <Input
                    id="company"
                    value={contactData.company || ""}
                    onChange={(e) => setContactData((prev) => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Джерело</Label>
                  <Select
                    value={contactData.source || "other"}
                    onValueChange={(v) => setContactData((prev) => ({ ...prev, source: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть джерело" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site">Сайт</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="viber">Viber</SelectItem>
                      <SelectItem value="phone">Телефон</SelectItem>
                      <SelectItem value="recommendation">Рекомендація</SelectItem>
                      <SelectItem value="other">Інше</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Деталі джерела (нік, номер і т.д.)</Label>
                  <Input
                    value={contactData.source_details || ""}
                    onChange={(e) => setContactData((prev) => ({ ...prev, source_details: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Доставка (метод, місто, відділення)</Label>
                <Textarea
                  value={contactData.delivery_details || ""}
                  onChange={(e) => setContactData((prev) => ({ ...prev, delivery_details: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Дедлайн</Label>
                  <Input
                    type="date"
                    value={contactData.deadline || ""}
                    onChange={(e) => setContactData((prev) => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Коментар менеджера (внутрішній)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            </Card>

            {/* Order items */}
            <Card className="shadow-none border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Товари</CardTitle>
              <div className="text-sm font-medium">
                Всього: {(lead.total_amount_cents / 100).toLocaleString()} грн
              </div>
            </CardHeader>
            <CardContent>
              {(!lead.order_items || lead.order_items.length === 0) ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  У цьому замовленні ще немає товарів
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {lead.order_items.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                      <div className="size-16 rounded-md bg-muted border border-border/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {item.mockup_url ? (
                          <img src={item.mockup_url} alt="" className="size-full object-contain" />
                        ) : (
                          <Package className="size-6 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-medium leading-none mb-1">
                              ID товару: {item.product_id}
                            </h4>
                            <p className="text-xs text-muted-foreground uppercase">
                              Розмір: {item.size} • Колір: {item.color}
                            </p>
                          </div>
                          <div className="text-sm font-medium text-right">
                            {item.quantity} шт × {(item.unit_price_cents || 0) / 100} грн
                          </div>
                        </div>
                        {item.custom_print_url && (
                          <div className="mt-2">
                            <a
                              href={item.custom_print_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-xs text-primary hover:underline gap-1"
                            >
                              <Paperclip className="size-3" />
                              Макет друку
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            </Card>
          </div>

          {/* ── Right column: status, tags, ERP ── */}
          <div className="space-y-6">

            {/* Status & Actions */}
            <Card className="shadow-none border-border/60 overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Статус та дії
                  <StatusBadge status={status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Змінити статус</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        variant={status === s ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs justify-start px-3"
                        onClick={() => handleStatusChange(s)}
                      >
                        {STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">ERP Дії</Label>
                  <div className="space-y-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start h-9"
                      disabled={erpSaving}
                      onClick={() => runOrderAction("nova-poshta-waybill")}
                    >
                      <Package className="size-4 mr-2" />
                      Створити ТТН
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start h-9"
                      disabled={erpSaving}
                      onClick={() => runOrderAction("fiscal-check")}
                    >
                      <FileText className="size-4 mr-2" />
                      Фіскальний чек
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="shadow-none border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Теги</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <div
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                    >
                      {tag}
                      <button onClick={() => handleToggleTag(tag)} className="hover:text-primary/70">
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {tags.length === 0 && <span className="text-xs text-muted-foreground">Немає тегів</span>}
                </div>

                <div className="pt-2 space-y-3">
                   <div className="flex flex-wrap gap-1">
                    {PREDEFINED_TAGS.map((pt) => (
                      <button
                        key={pt.id}
                        onClick={() => handleToggleTag(pt.id)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          tags.includes(pt.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Свій тег..."
                      className="h-8 text-xs"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCustomTag(customTagInput)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleAddCustomTag(customTagInput)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ERP Order Data (Finance) */}
            <Card className="shadow-none border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  Фінанси та ERP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Статус оплати</Label>
                    <Select
                      value={lead.payment_status || "unpaid"}
                      onValueChange={(v) => saveErpOrderData({ payment_status: v as any })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Неоплачено</SelectItem>
                        <SelectItem value="partial">Частково</SelectItem>
                        <SelectItem value="paid">Оплачено</SelectItem>
                        <SelectItem value="refunded">Повернено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Сума оплати (грн)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      defaultValue={(lead.payment_amount_cents || 0) / 100}
                      onBlur={(e) => {
                        const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                        if (cents !== lead.payment_amount_cents) saveErpOrderData({ payment_amount_cents: cents });
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                   <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted-foreground">Створено:</span>
                    <span>{new Date(lead.created_at).toLocaleDateString("uk-UA")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted-foreground">Оновлено:</span>
                    <span>{new Date(lead.updated_at).toLocaleDateString("uk-UA")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Messages thread ── */}
        <Card className="shadow-none border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="size-4" />
            Історія листування
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[500px] overflow-y-auto mb-6 pr-2">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Повідомлень ще немає
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "manager" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.sender === "manager"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.attachments.map((a, i) => (
                        <a
                          key={i}
                          href={a}
                          target="_blank"
                          rel="noreferrer"
                          className="size-12 rounded bg-background/20 flex items-center justify-center hover:bg-background/30 transition-colors"
                        >
                          <Paperclip className="size-4" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div
                    className={`text-[10px] mt-1 opacity-70 ${
                      m.sender === "manager" ? "text-right" : "text-left"
                    }`}
                  >
                    {fmtTime(m.created_at)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-3">
            <Textarea
              placeholder="Введіть повідомлення клієнту..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="msg-files"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setPendingFiles((prev) => [...prev, ...files]);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("msg-files")?.click()}
                  disabled={sending || uploading}
                >
                  <Paperclip className="size-4 mr-2" />
                  Прикріпити
                </Button>
                {pendingFiles.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Обрано: {pendingFiles.length}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || uploading || (!replyText.trim() && !pendingFiles.length)}
                className="px-6"
              >
                {sending || uploading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardPage>
  );
}
