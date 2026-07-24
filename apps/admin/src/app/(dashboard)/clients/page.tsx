"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Mail, ExternalLink, Loader2, MessageCircle, Phone, Calendar, UserPlus, Trash2, Users, Building2, RefreshCw, Copy, Edit3, MoreHorizontal, Save, ArrowRight, Hash, Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type LeadStatus } from "@/components/status-badge";
import { fmtMoney, fmtDate, cn } from "@/lib/utils";
import { DashboardPage } from "@/components/dashboard-page";
import { AdminToolbar, AdminFilter, AdminTablePanel } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface OrderItem {
  id: string;
  color: string;
  size: string;
  quantity: number;
  mockup_url?: string;
  custom_print_url?: string;
}

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
  order_items?: OrderItem[];
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

type SourceFilter = "all" | "keycrm" | "manual";
type SortFilter = "spent" | "recent" | "orders";
type ClientTab = "overview" | "orders" | "activity";

const EMPTY_FORM = { name: "", email: "", phone: "", company: "", social_channel: "" };



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
  // Kept for compatibility — Sheet handles sizing now
  const [drawerWidth] = useState(460);
  const [isDragging] = useState(false);
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
  }, [supabase]);

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

  // onDrawerDragStart replaced by Shadcn Sheet

  return (
    <DashboardPage
      title="Клієнти"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleKeycrmSync}
            disabled={syncingKeycrm}
          >
            {syncingKeycrm ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Sync KeyCRM
          </Button>
          <Button size="sm" className="h-9 gap-2" onClick={() => setAddOpen(true)}>
            <UserPlus className="size-3.5" /> Додати клієнта
          </Button>
        </>
      }
    >
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminToolbar>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 bg-muted/40 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Швидкий пошук..."
            />
          </div>

          <div className="flex items-center gap-1.5">
            <AdminFilter
              label="Джерело"
              active={sourceFilter !== "all"}
              value={sourceFilter === "all" ? undefined : sourceFilter}
              options={[
                { value: "all", label: "Всі джерела" },
                { value: "keycrm", label: "KeyCRM" },
                { value: "manual", label: "Вручну" },
              ]}
              onSelect={(v) => setSourceFilter(v as SourceFilter)}
              onClear={() => setSourceFilter("all")}
            />
            <AdminFilter
              label="Сортування"
              active={sortFilter !== "spent"}
              value={sortFilter === "spent" ? undefined : sortFilter}
              options={[
                { value: "spent", label: "За сумою" },
                { value: "recent", label: "Останні" },
                { value: "orders", label: "За кількістю" },
              ]}
              onSelect={(v) => setSortFilter(v as SortFilter)}
              onClear={() => setSortFilter("spent")}
            />
          </div>

          <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {filtered.length} клієнтів
          </span>
        </AdminToolbar>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full px-6">
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
            <AdminTablePanel>
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
                        <p className="text-[10px] text-muted-foreground">{client.email || client.phone || "Без контактів"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.keycrmOrders > 0 ? "info" : "outline"} className="text-[10px] h-5 normal-case tracking-normal">
                          {client.keycrmOrders > 0 ? "KeyCRM" : "Вручну"}
                        </Badge>
                      </TableCell>
                      <TableCell><span className="text-xs">{client.ordersCount}</span></TableCell>
                      <TableCell><span className="text-xs font-medium">{fmtMoney(client.totalSpent)}</span></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{fmtMoney(client.paidTotal)}</span></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{fmtDate(client.lastOrderAt)}</span></TableCell>
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
            </AdminTablePanel>
          )}
        </div>
      </div>

      {/* ── Client detail sheet ── */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setEditMode(false); } }}>
        <SheetContent
          side="right"
          className="w-[380px] max-w-full p-0 flex flex-col gap-0 overflow-hidden bg-white"
          showCloseButton={false}
        >
          <SheetHeader className="flex-row items-start justify-between px-5 pt-5 pb-4 gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{selected?.name[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-bold truncate">{selected?.name}</SheetTitle>
                <p className="text-xs text-muted-foreground truncate">{selected?.email || selected?.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {editMode ? (
                <>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditMode(false)} disabled={savingClient}>Скасувати</Button>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveClient} disabled={savingClient}>
                    {savingClient ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                    Зберегти
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={() => setEditMode(true)}>
                  <Edit3 className="size-3.5" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground"><MoreHorizontal className="size-3.5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => selected && copyClientContact(selected)}><Copy className="size-3.5 mr-2" /> Скопіювати контакт</DropdownMenuItem>
                  {selected?.leads[0] && (
                    <DropdownMenuItem onClick={() => router.push(`/messages?leadId=${selected.leads[0].id}`)}><MessageCircle className="size-3.5 mr-2" /> Відкрити чат</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => selected && handleDeleteClient(selected)}><Trash2 className="size-3.5 mr-2" /> Видалити</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => setSelected(null)}>
                ×
              </Button>
            </div>
          </SheetHeader>

          {selected && (
            <div className="flex-1 overflow-y-auto">
              <Tabs value={clientTab} onValueChange={(v) => setClientTab(v as ClientTab)} className="flex flex-col gap-0">
                <TabsList className="px-5 shrink-0 rounded-none border-b h-10 bg-transparent justify-start gap-5">
                  <TabsTrigger value="overview" className="text-xs h-10 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-0">Профіль</TabsTrigger>
                  <TabsTrigger value="orders" className="text-xs h-10 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-0">
                    Замовлення{selected.ordersCount > 0 ? ` (${selected.ordersCount})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs h-10 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-0">Активність</TabsTrigger>
                </TabsList>

                {/* ── Profile tab ── */}
                <TabsContent value="overview" className="m-0 p-0">
                  {editMode ? (
                    <div className="px-5 py-5 space-y-3">
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Ім&apos;я *</Label><Input className="h-9 text-sm" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Email *</Label><Input type="email" className="h-9 text-sm" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Телефон</Label><Input className="h-9 text-sm" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Компанія</Label><Input className="h-9 text-sm" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} /></div>
                      </div>
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Telegram / Instagram</Label><Input className="h-9 text-sm" value={editForm.social_channel} onChange={(e) => setEditForm({ ...editForm, social_channel: e.target.value })} /></div>
                    </div>
                  ) : (
                    <>
                      {/* Stats bar */}
                      <div className="grid grid-cols-3 divide-x border-b bg-muted/20">
                        <ClientStatTile label="Замовлень" value={String(selected.ordersCount)} />
                        <ClientStatTile label="Витрачено" value={fmtMoney(selected.totalSpent)} bold />
                        <ClientStatTile label="Оплачено" value={fmtMoney(selected.paidTotal)} />
                      </div>

                      {/* Contact rows */}
                      <div className="px-5 pt-5 pb-3">
                        <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase mb-3">КОНТАКТИ</p>
                        <div className="space-y-2.5">
                          {selected.phone && <ClientInfoRow icon={Phone} value={selected.phone} href={`tel:${selected.phone}`} />}
                          {selected.email && <ClientInfoRow icon={Mail} value={selected.email} href={`mailto:${selected.email}`} />}
                          {selected.company && <ClientInfoRow icon={Building2} value={selected.company} />}
                          {selected.social_channel && <ClientInfoRow icon={ExternalLink} value={selected.social_channel} />}
                          {selected.lastManager && <ClientInfoRow icon={Users} value={selected.lastManager} label="Менеджер" />}
                          <ClientInfoRow icon={Calendar} value={fmtDate(selected.lastOrderAt)} label="Останнє замовлення" />
                        </div>
                      </div>

                      {selected.leads[0] && (
                        <div className="px-5 pb-5">
                          <button
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60 bg-white hover:bg-muted/40 transition-colors text-sm font-medium text-foreground"
                            onClick={() => router.push(`/messages?leadId=${selected.leads[0].id}`)}
                          >
                            <MessageCircle className="size-4 text-muted-foreground/60 shrink-0" />
                            Відкрити чат
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* ── Orders tab ── */}
                <TabsContent value="orders" className="m-0 p-0">
                  <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase">ЗАМОВЛЕННЯ</p>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full" onClick={() => router.push("/orders/new")}>+ Нове</Button>
                  </div>
                  <div className="px-5 pb-5 space-y-3">
                    {selected.leads.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">Замовлень немає</p>
                    ) : (
                      selected.leads.map((lead) => (
                        <div key={lead.id} className="rounded-xl border border-border/60 bg-white overflow-hidden">
                          {/* Order header — clickable */}
                          <div
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => router.push(`/orders?leadId=${lead.id}`)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold">{fmtMoney(lead.total_amount_cents)}</span>
                                {lead.customer_data?.keycrm_id && (
                                  <span className="text-[10px] text-muted-foreground font-mono">#{lead.customer_data.keycrm_id}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(lead.created_at)}</p>
                            </div>
                            <StatusBadge status={lead.status} />
                            <ArrowRight className="size-3.5 text-muted-foreground/40 shrink-0" />
                          </div>
                          {/* Order items with print details */}
                          {lead.order_items && lead.order_items.length > 0 && (
                            <div className="border-t border-border/40 px-4 py-3 space-y-2.5 bg-muted/10">
                              {lead.order_items.map((item) => (
                                <div key={item.id} className="flex items-start gap-3">
                                  {item.mockup_url ? (
                                    <img src={item.mockup_url} alt="Макет" className="size-12 rounded-lg border border-border/60 object-cover shrink-0" />
                                  ) : (
                                    <div className="size-12 rounded-lg border border-border/40 bg-muted/40 flex items-center justify-center shrink-0">
                                      <Package className="size-4 text-muted-foreground/40" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{item.color} / {item.size}</p>
                                    <p className="text-[10px] text-muted-foreground">× {item.quantity}</p>
                                    {item.custom_print_url && (
                                      <a href={item.custom_print_url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1">
                                        <ExternalLink className="size-2.5" /> Принт
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* ── Activity tab ── */}
                <TabsContent value="activity" className="m-0 p-0">
                  <div className="px-5 pt-5 pb-5">
                    <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase mb-4">АКТИВНІСТЬ</p>
                    <div className="relative pl-4 space-y-0">
                      <div className="absolute left-[7px] top-1 bottom-0 w-px bg-border/60" />
                      {selected.leads.slice(0, 12).map((lead) => (
                        <div key={lead.id} className="relative pb-4 last:pb-0">
                          <div className="absolute -left-[13px] top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
                          <p className="text-xs font-semibold text-foreground">{fmtMoney(lead.total_amount_cents)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(lead.created_at)}</p>
                          <div className="mt-1">
                            <StatusBadge status={lead.status} className="text-[9px] h-4 px-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Новий клієнт</DialogTitle></DialogHeader>
          <form onSubmit={handleAddClient} className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Ім&apos;я та прізвище *</Label><Input className="h-10" placeholder="Іван Петренко" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required /></div>
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Email *</Label><Input type="email" className="h-10" placeholder="hr@company.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label className="text-xs">Телефон *</Label><Input type="tel" className="h-10" placeholder="+380..." value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label className="text-xs">Компанія</Label><Input className="h-10" placeholder="ТОВ Назва" value={addForm.company} onChange={(e) => setAddForm({ ...addForm, company: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Telegram / Instagram</Label><Input className="h-10" placeholder="@username" value={addForm.social_channel} onChange={(e) => setAddForm({ ...addForm, social_channel: e.target.value })} /></div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>Скасувати</Button>
              <Button type="submit" size="sm" disabled={addLoading}>{addLoading && <Loader2 className="size-3 animate-spin mr-1.5" />}Додати</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardPage>
  );
}

function ClientInfoRow({ icon: Icon, value, label, href }: { icon: React.ComponentType<{ className?: string }>; value: string; label?: string; href?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-3.5 text-muted-foreground/50 shrink-0" />
      <div className="flex items-center gap-1.5 min-w-0">
        {href ? (
          <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">{value}</a>
        ) : (
          <span className="text-sm text-foreground/90 truncate">{value}</span>
        )}
        {label && <span className="text-[10px] text-muted-foreground/50 shrink-0">· {label}</span>}
      </div>
    </div>
  );
}

function ClientStatTile({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-3 px-2 text-center gap-0.5">
      <p className={cn("text-sm tabular-nums truncate w-full text-center", bold ? "font-bold text-foreground" : "font-semibold text-foreground")}>
        {value}
      </p>
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">{label}</p>
    </div>
  );
}
