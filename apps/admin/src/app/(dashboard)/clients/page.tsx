"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Mail, ExternalLink, Loader2, X, MessageCircle, Phone, Calendar, UserPlus, Trash2, Users, CreditCard, Database, Building2, RefreshCw, Copy, Edit3, MoreHorizontal, Save } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type LeadStatus } from "@/components/status-badge";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Lead {
  id: string;
  status: LeadStatus;
  customer_data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    social_channel?: string;
    keycrm_id?: number | string;
    keycrm_client_id?: number | string;
    keycrm_payment_status?: string;
    keycrm_payments_total_cents?: number;
    keycrm_manager_name?: string;
    keycrm_recipient_name?: string;
  };
  total_amount_cents: number;
  created_at: string;
}

interface ClientRecord {
  key: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  social_channel?: string;
  leads: Lead[];
  totalSpent: number;
  paidTotal: number;
  ordersCount: number;
  keycrmOrders: number;
  lastOrderAt: string;
  lastManager?: string;
}

const DRAWER_MIN = 280;
const DRAWER_MAX = 600;
type SourceFilter = "all" | "keycrm" | "manual";
type SortFilter = "spent" | "recent" | "orders";
type ClientTab = "overview" | "orders" | "activity";

const EMPTY_FORM = { name: "", email: "", phone: "", company: "", social_channel: "" };

function ClientStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <div className="mb-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="truncate text-center text-sm font-bold">{value}</p>
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("spent");
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [syncingKeycrm, setSyncingKeycrm] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(360);
  const [isDragging, setIsDragging] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [clientTab, setClientTab] = useState<ClientTab>("overview");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingClient, setSavingClient] = useState(false);
  const supabase = createClient();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { toast.error("Помилка завантаження клієнтів"); setLoading(false); return; }

    const map = new Map<string, ClientRecord>();
    for (const lead of (data || []) as Lead[]) {
      // Use lead id as fallback key so orders without email aren't merged
      const email = lead.customer_data?.email?.trim() || "";
      const keycrmClientId = lead.customer_data?.keycrm_client_id;
      const key = keycrmClientId ? `keycrm:${keycrmClientId}` : email || `__noemail__${lead.id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          email,
          name: lead.customer_data?.name || email || "Невідомий",
          phone: lead.customer_data?.phone,
          company: lead.customer_data?.company,
          social_channel: lead.customer_data?.social_channel,
          leads: [],
          totalSpent: 0,
          paidTotal: 0,
          ordersCount: 0,
          keycrmOrders: 0,
          lastOrderAt: lead.created_at,
          lastManager: lead.customer_data?.keycrm_manager_name,
        });
      }
      const rec = map.get(key)!;
      rec.leads.push(lead);
      rec.totalSpent += lead.total_amount_cents;
      rec.paidTotal += lead.customer_data?.keycrm_payments_total_cents ?? 0;
      rec.ordersCount += 1;
      if (lead.customer_data?.keycrm_id) rec.keycrmOrders += 1;
      if (lead.customer_data?.keycrm_manager_name) rec.lastManager = lead.customer_data.keycrm_manager_name;
      if (lead.created_at > rec.lastOrderAt) rec.lastOrderAt = lead.created_at;
    }
    setClients(Array.from(map.values()));
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleKeycrmSync = useCallback(async () => {
    setSyncingKeycrm(true);
    try {
      const response = await fetch("/api/keycrm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: 2 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      toast.success(`KeyCRM: ${data.created ?? 0} нових, ${data.updated ?? 0} оновлено`);
      await fetchClients();
    } catch (error) {
      toast.error(`KeyCRM sync failed: ${error instanceof Error ? error.message : "невідома помилка"}`);
    } finally {
      setSyncingKeycrm(false);
    }
  }, [fetchClients]);

  useEffect(() => {
    const initialSearch = searchParams.get("search");
    if (initialSearch) setSearch(initialSearch);
  }, [searchParams]);

  useEffect(() => {
    if (!selected) return;
    setClientTab("overview");
    setEditMode(false);
    setEditForm({
      name: selected.name,
      email: selected.email,
      phone: selected.phone ?? "",
      company: selected.company ?? "",
      social_channel: selected.social_channel ?? "",
    });
  }, [selected?.key]);

  const filtered = clients
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .filter((c) => {
      if (sourceFilter === "all") return true;
      if (sourceFilter === "keycrm") return c.keycrmOrders > 0;
      return c.keycrmOrders === 0;
    })
    .sort((a, b) => {
      if (sortFilter === "recent") return b.lastOrderAt.localeCompare(a.lastOrderAt);
      if (sortFilter === "orders") return b.ordersCount - a.ordersCount;
      return b.totalSpent - a.totalSpent;
    });

  const handleDeleteClient = async (client: ClientRecord) => {
    if (!confirm(`Видалити клієнта "${client.name}" та всі його записи? Це незворотно.`)) return;
    try {
      await Promise.all(client.leads.map((l) =>
        fetch(`/api/leads/${l.id}`, { method: "DELETE" })
      ));
      setClients((cs) => cs.filter((c) => c.key !== client.key));
      if (selected?.key === client.key) setSelected(null);
      toast.success("Клієнта видалено");
    } catch {
      toast.error("Помилка видалення");
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email || !addForm.phone) { toast.error("Ім'я, email та телефон обов'язкові"); return; }
    setAddLoading(true);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "new",
          customer_data: {
            name: addForm.name,
            email: addForm.email,
            phone: addForm.phone || undefined,
            company: addForm.company || undefined,
            social_channel: addForm.social_channel || undefined,
          },
          total_amount_cents: 0,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Помилка");
      toast.success("Клієнта додано");
      setAddOpen(false);
      setAddForm(EMPTY_FORM);
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setAddLoading(false);
    }
  };

  const copyClientContact = async (client: ClientRecord) => {
    const lines = [
      client.name,
      client.company,
      client.email,
      client.phone,
      client.social_channel,
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      toast.success("Контакти скопійовано");
    } catch {
      toast.error("Не вдалося скопіювати");
    }
  };

  const handleSaveClient = async () => {
    if (!selected) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error("Ім'я та email обов'язкові");
      return;
    }
    setSavingClient(true);
    try {
      await Promise.all(selected.leads.map((lead) => fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_data: {
            ...lead.customer_data,
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone.trim() || undefined,
            company: editForm.company.trim() || undefined,
            social_channel: editForm.social_channel.trim() || undefined,
          },
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Помилка збереження");
      })));
      toast.success("Клієнта оновлено");
      setEditMode(false);
      await fetchClients();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка збереження");
    } finally {
      setSavingClient(false);
    }
  };

  const onDrawerDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startW = drawerWidth;
    const el = (e.currentTarget as HTMLElement).closest("[data-drawer]") as HTMLElement | null;
    const onMove = (ev: MouseEvent) => {
      const w = Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, startW + startX - ev.clientX));
      if (el) el.style.width = `${w}px`;
    };
    const onUp = (ev: MouseEvent) => {
      const w = Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, startW + startX - ev.clientX));
      setDrawerWidth(w);
      setIsDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <>
    <div className={`flex flex-1 h-0 overflow-hidden${isDragging ? " select-none" : ""}`}>

      {/* ── Table area ── */}
      <div className="flex-1 flex flex-col overflow-hidden transition-[margin] duration-200" style={{ marginRight: selected ? drawerWidth : 0 }}>

        <PageHeader
          title={`Клієнти${clients.length > 0 ? ` (${filtered.length})` : ""}`}
          actions={
            <>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Пошук..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as SourceFilter)}>
                <SelectTrigger className="h-8 w-[130px] rounded-md text-xs">
                  <SelectValue>
                    {sourceFilter === "all" ? "Всі джерела" : sourceFilter === "keycrm" ? "KeyCRM" : "Вручну"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі джерела</SelectItem>
                  <SelectItem value="keycrm">KeyCRM</SelectItem>
                  <SelectItem value="manual">Вручну</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortFilter} onValueChange={(value) => setSortFilter(value as SortFilter)}>
                <SelectTrigger className="h-8 w-[142px] rounded-md text-xs">
                  <SelectValue>
                    {sortFilter === "spent" ? "За сумою" : sortFilter === "recent" ? "Останні" : "За кількістю"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spent">За сумою</SelectItem>
                  <SelectItem value="recent">Останні</SelectItem>
                  <SelectItem value="orders">За кількістю</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={handleKeycrmSync}
                disabled={syncingKeycrm}
              >
                {syncingKeycrm ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Sync KeyCRM
              </Button>
              <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setAddOpen(true)}>
                <UserPlus className="size-3.5" /> Додати клієнта
              </Button>
            </>
          }
        />

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              {search ? (
                <EmptyState
                  icon={Search}
                  title="Нічого не знайдено"
                  description="Спробуйте змінити запит пошуку"
                  action={<Button variant="outline" size="sm" onClick={() => setSearch("")}>Скинути пошук</Button>}
                />
              ) : (
                <EmptyState
                  icon={Users}
                  title="Клієнтів ще немає"
                  description="Додайте першого клієнта вручну або він з'явиться після першого замовлення"
                  action={<Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}><UserPlus className="size-3.5" /> Додати клієнта</Button>}
                />
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Клієнт</TableHead>
                  <TableHead>Джерело</TableHead>
                  <TableHead>Замовлень</TableHead>
                  <TableHead>Загальна сума</TableHead>
                  <TableHead>Оплачено</TableHead>
                  <TableHead>Останнє замовлення</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Дії</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow
                    key={client.key}
                    className={`cursor-pointer transition-colors group ${selected?.key === client.key ? "bg-muted/60" : "hover:bg-muted/40"}`}
                    onClick={() => setSelected((p) => p?.key === client.key ? null : client)}
                  >
                    <TableCell>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.email || client.phone || "Без контактів"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.keycrmOrders > 0 ? "info" : "outline"} className="normal-case tracking-normal">
                        {client.keycrmOrders > 0 ? "KeyCRM" : "Вручну"}
                      </Badge>
                    </TableCell>
                    <TableCell><span className="text-sm">{client.ordersCount}</span></TableCell>
                    <TableCell><span className="text-sm font-medium">{fmtMoney(client.totalSpent)}</span></TableCell>
                    <TableCell><span className="text-sm text-muted-foreground">{fmtMoney(client.paidTotal)}</span></TableCell>
                    <TableCell><span className="text-sm text-muted-foreground">{fmtDate(client.lastOrderAt)}</span></TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClient(client); }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded hover:text-destructive transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div
          data-drawer
          className="fixed top-0 right-0 h-full border-l border-border bg-card flex flex-col overflow-hidden z-20"
          style={{ width: drawerWidth }}
        >
          {/* Drag handle */}
          <div onMouseDown={onDrawerDragStart} className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40 transition-colors z-10" />

          {/* Header */}
          <div className="border-b border-border px-4 py-3 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Клієнт</p>
                <h2 className="truncate text-base font-semibold">{selected.name}</h2>
              </div>
              <div className="flex items-center gap-1">
                {editMode ? (
                  <>
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setEditMode(false)} disabled={savingClient}>
                      Скасувати
                    </Button>
                    <Button size="sm" className="h-8 gap-1.5" onClick={handleSaveClient} disabled={savingClient}>
                      {savingClient ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                      Зберегти
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="h-8 gap-1.5" onClick={() => setEditMode(true)}>
                    <Edit3 className="size-3.5" />
                    Редагувати
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => copyClientContact(selected)}>
                      <Copy className="size-4" /> Скопіювати контакт
                    </DropdownMenuItem>
                    {selected.leads[0] && (
                      <DropdownMenuItem onClick={() => router.push(`/messages?leadId=${selected.leads[0].id}`)}>
                        <MessageCircle className="size-4" /> Відкрити чат
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => handleDeleteClient(selected)}>
                      <Trash2 className="size-4" /> Видалити
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={clientTab} onValueChange={(value) => setClientTab(value as ClientTab)} className="gap-0">
              <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-2">
                <TabsList className="h-9 w-full justify-start rounded-none border-b-0 bg-transparent p-0">
                  <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                    Профіль
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                    Замовлення
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                    Активність
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="m-0">
                <div className="flex flex-col items-center px-4 py-5 border-b border-border">
                  <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-2.5">
                    <span className="text-xl font-bold text-primary">{selected.name[0]?.toUpperCase()}</span>
                  </div>
                  {editMode ? (
                    <div className="w-full space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-client-name">Ім&apos;я *</Label>
                        <Input id="edit-client-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-client-email">Email *</Label>
                        <Input id="edit-client-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-client-phone">Телефон</Label>
                          <Input id="edit-client-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-client-company">Компанія</Label>
                          <Input id="edit-client-company" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-client-social">Telegram / Instagram</Label>
                        <Input id="edit-client-social" value={editForm.social_channel} onChange={(e) => setEditForm({ ...editForm, social_channel: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-base text-center">{selected.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{selected.email || selected.phone || "Без контактів"}</p>
                      {selected.company && <p className="text-xs text-muted-foreground">{selected.company}</p>}
                    </>
                  )}
                  <div className="flex gap-3 mt-3 w-full">
                    <div className="flex-1 rounded-lg bg-muted/60 px-3 py-2 text-center">
                      <p className="text-lg font-bold">{selected.ordersCount}</p>
                      <p className="text-[10px] text-muted-foreground">замовлень</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-muted/60 px-3 py-2 text-center">
                      <p className="text-base font-bold">{fmtMoney(selected.totalSpent)}</p>
                      <p className="text-[10px] text-muted-foreground">витрачено</p>
                    </div>
                  </div>
                  <div className="mt-2 grid w-full grid-cols-2 gap-2">
                    <ClientStat icon={Database} label="KeyCRM" value={`${selected.keycrmOrders}/${selected.ordersCount}`} />
                    <ClientStat icon={CreditCard} label="Оплачено" value={fmtMoney(selected.paidTotal)} />
                  </div>
                </div>

                {selected.leads[0] && (
                  <div className="px-4 pt-4">
                    <Button variant="outline" className="w-full gap-2" onClick={() => router.push(`/messages?leadId=${selected.leads[0].id}`)}>
                      <MessageCircle className="w-4 h-4" /> Чат
                    </Button>
                  </div>
                )}

                <div className="px-4 py-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Контакти</p>
                  {selected.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div><p className="text-sm">{selected.phone}</p><p className="text-xs text-muted-foreground">Телефон</p></div>
                    </div>
                  )}
                  {selected.company && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div><p className="text-sm">{selected.company}</p><p className="text-xs text-muted-foreground">Компанія</p></div>
                    </div>
                  )}
                  {selected.lastManager && (
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div><p className="text-sm">{selected.lastManager}</p><p className="text-xs text-muted-foreground">Менеджер KeyCRM</p></div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      {selected.email ? <a href={`mailto:${selected.email}`} className="text-sm hover:underline break-all">{selected.email}</a> : <p className="text-sm text-muted-foreground">Не вказано</p>}
                      <p className="text-xs text-muted-foreground">Email</p>
                    </div>
                  </div>
                  {selected.social_channel && (
                    <div className="flex items-start gap-3">
                      <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div><a href={selected.social_channel} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline truncate block">{selected.social_channel}</a><p className="text-xs text-muted-foreground">Соцмережа</p></div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div><p className="text-sm">{fmtDate(selected.lastOrderAt)}</p><p className="text-xs text-muted-foreground">Останнє замовлення</p></div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="orders" className="m-0 px-4 py-4 space-y-2">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Історія замовлень</p>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => router.push("/orders/new")}>
                    Нове замовлення
                  </Button>
                </div>
                {selected.leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/orders?leadId=${lead.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{fmtMoney(lead.total_amount_cents)}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(lead.created_at)}
                        {lead.customer_data?.keycrm_id ? ` · KeyCRM #${lead.customer_data.keycrm_id}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="activity" className="m-0 px-4 py-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Останні події</p>
                {selected.leads.slice(0, 8).map((lead) => (
                  <div key={lead.id} className="flex gap-3 border-b border-border/60 pb-3 last:border-b-0">
                    <div className="mt-1 size-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium">Замовлення {fmtMoney(lead.total_amount_cents)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(lead.created_at)} · {lead.status}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

          </div>
        </div>
      )}
    </div>

      {/* ── Add Client Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новий клієнт</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddClient} className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="c-name">Ім&apos;я та прізвище *</Label>
                <Input id="c-name" placeholder="Іван Петренко" value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="c-email">Email *</Label>
                <Input id="c-email" type="email" placeholder="hr@company.com" value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Телефон *</Label>
                <Input id="c-phone" type="tel" placeholder="+380 XX XXX XX XX" value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-company">Компанія</Label>
                <Input id="c-company" placeholder="ТОВ «Назва»" value={addForm.company}
                  onChange={(e) => setAddForm({ ...addForm, company: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="c-social">Telegram / Instagram</Label>
                <Input id="c-social" placeholder="@username" value={addForm.social_channel}
                  onChange={(e) => setAddForm({ ...addForm, social_channel: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Скасувати</Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                Додати
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
