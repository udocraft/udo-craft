"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { PREDEFINED_TAGS } from "@udo-craft/shared";
import { createClient } from "@/lib/supabase/client";
import { playNotificationTone } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  Columns3,
  CreditCard,
  Filter,
  Hash,
  List,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardPage } from "@/components/dashboard-page";
import { AdminToolbar, AdminFilter, AdminEmptyState } from "@/components/admin-layout";
import { KanbanColumn } from "./_components/KanbanColumn";
import { OrderQuickSheet } from "./_components/OrderQuickSheet";
import { useKanbanDrag, type Lead } from "./_components/useKanbanDrag";
import type { Lead as SharedLead } from "@udo-craft/shared";

// Typed Supabase Realtime payload for leads table
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RealtimeLeadPayload = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: SharedLead; old: Partial<SharedLead> };

const STATUSES = ["draft", "new", "in_progress", "production", "completed", "archived"] as const;
const STATUS_LABELS: Record<string, string> = {
  draft: "Чернетка", new: "Новий", in_progress: "В роботі",
  production: "Виробництво", completed: "Завершено", archived: "Архів",
};
const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: "Весь час",
  today: "Сьогодні",
  week: "7 днів",
  month: "30 днів",
};
const UNASSIGNED_TAG_VALUE = "__untagged__";
const CUSTOM_TAG_VALUE = "__custom__";

type StatusFilter = "all" | (typeof STATUSES)[number];
type TagFilter = "all" | typeof UNASSIGNED_TAG_VALUE | typeof CUSTOM_TAG_VALUE | (typeof PREDEFINED_TAGS)[number]["id"];
type DateFilter = "all" | "today" | "week" | "month";
type AmountFilter = "all" | "with_amount" | "without_amount";
type SortFilter = "newest" | "oldest" | "amount_desc" | "amount_asc" | "updated";
type ViewMode = "kanban" | "list";

function getTagFilterLabel(filter: TagFilter) {
  if (filter === "all") return "Всі теги";
  if (filter === UNASSIGNED_TAG_VALUE) return "Без тегів";
  if (filter === CUSTOM_TAG_VALUE) return "Інші теги";
  return PREDEFINED_TAGS.find((tag) => tag.id === filter)?.label ?? filter;
}

function getDateStart(filter: DateFilter) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (filter === "week") start.setDate(start.getDate() - 6);
  if (filter === "month") start.setDate(start.getDate() - 29);

  return start;
}

function matchesSearch(lead: Lead, query: string) {
  if (!query) return true;
  const customer = lead.customer_data ?? {};
  const haystack = [
    lead.id,
    lead.notes,
    customer.name,
    customer.email,
    customer.phone,
    customer.company,
    customer.source,
    customer.source_details,
    ...(lead.order_items ?? []).flatMap((item) => [
      item.size,
      item.color,
      item.technical_metadata?.item_note,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase().trim());
}

function formatOrderDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getItemCount(lead: Lead) {
  return lead.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

function formatOrderTime(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return `${isToday ? "Сьогодні" : formatOrderDate(dateStr)} ${date.toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getOrderNumber(lead: Lead) {
  return lead.customer_data?.keycrm_id ? String(lead.customer_data.keycrm_id) : lead.id.slice(0, 8);
}

function getSourceLabel(lead: Lead) {
  const data = lead.customer_data;
  if (data.keycrm_global_source_uuid || data.keycrm_source_uuid || data.keycrm_source_id) return "KeyCRM";
  if (data.company) return data.company;
  return "U:Do Craft";
}

function getPaymentLabel(status?: string) {
  if (!status) return "—";
  if (status === "paid") return "Оплачено";
  if (status === "part_paid") return "Частково";
  if (status === "not_paid") return "Не сплачено";
  return status;
}

function getPrimaryItemLabel(lead: Lead) {
  const items = lead.order_items ?? [];
  if (items.length === 0) return "Товари відсутні";
  const first = items[0];
  const name = first.technical_metadata?.keycrm_product_name || first.technical_metadata?.item_note || "Позиція";
  const details = [first.size, first.color].filter(Boolean).join(", ");
  const suffix = details ? `, ${details}` : "";
  const more = items.length > 1 ? ` +${items.length - 1}` : "";
  return `${name}${suffix} (${first.quantity} шт.)${more}`;
}

function OrdersBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [amountFilter, setAmountFilter] = useState<AmountFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [syncingKeycrm, setSyncingKeycrm] = useState(false);
  const [keycrmEnabled, setKeycrmEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/settings?key=keycrm")
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setKeycrmEnabled(data.value.enabled);
          if (data.value.auto_sync) {
            handleKeycrmSync();
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleStatusChange = useCallback(async (lead: Lead, newStatus: string) => {
    const updated = { ...lead, status: newStatus as Lead["status"] };
    setLeads((p) => p.map((l) => (l.id === lead.id ? updated : l)));
    setSelectedLead((c) => c?.id === lead.id ? updated : c);
    try {
      const r = await fetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
    } catch (err) {
      setLeads((p) => p.map((l) => (l.id === lead.id ? lead : l)));
      setSelectedLead((c) => c?.id === lead.id ? lead : c);
      toast.error(`Помилка: ${err instanceof Error ? err.message : "невідома"}`);
    }
  }, []);

  const drag = useKanbanDrag(selectedLead, setSelectedLead, handleStatusChange);

  const fetchLeads = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const r = await fetch("/api/leads");
      if (!r.ok) throw new Error();
      setLeads((await r.json()) || []);
    } catch { toast.error("Помилка при завантаженні замовлень"); setLeads([]); }
    finally { if (showLoading) setLoading(false); }
  }, []);

  const debouncedRealtimeFetch = useDebouncedCallback(() => {
    playNotificationTone();
    fetchLeads(false);
  }, 3000);

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
      await fetchLeads(false);
    } catch (error) {
      toast.error(`KeyCRM sync failed: ${error instanceof Error ? error.message : "невідома помилка"}`);
    } finally {
      setSyncingKeycrm(false);
    }
  }, [fetchLeads]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => {
    const leadId = searchParams.get("leadId");
    if (!leadId || !leads.length) return;
    const found = leads.find((l) => l.id === leadId);
    if (found) setSelectedLead(found);
  }, [leads, searchParams]);
  useEffect(() => {
    if (selectedLead) {
      const fresh = leads.find((l) => l.id === selectedLead.id);
      if (fresh) setSelectedLead(fresh);
    }
  }, [leads]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ch = supabase.channel("admin-orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => {
        debouncedRealtimeFetch();
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: { new: { sender?: string } }) => {
        if (payload?.new?.sender === "client") {
          playNotificationTone(); toast.info("Нове повідомлення від клієнта");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [debouncedRealtimeFetch, supabase]);

  const filteredLeads = useMemo(() => {
    const dateStart = dateFilter === "all" ? null : getDateStart(dateFilter);

    return leads
      .filter((lead) => matchesSearch(lead, search))
      .filter((lead) => statusFilter === "all" || lead.status === statusFilter)
      .filter((lead) => {
        const tags = lead.tags ?? [];
        if (tagFilter === "all") return true;
        if (tagFilter === UNASSIGNED_TAG_VALUE) return tags.length === 0;
        if (tagFilter === CUSTOM_TAG_VALUE) {
          return tags.some((tag) => !PREDEFINED_TAGS.some((predefined) => predefined.id === tag));
        }
        return tags.includes(tagFilter);
      })
      .filter((lead) => {
        if (!dateStart) return true;
        return new Date(lead.created_at) >= dateStart;
      })
      .filter((lead) => {
        if (amountFilter === "all") return true;
        if (amountFilter === "with_amount") return lead.total_amount_cents > 0;
        return lead.total_amount_cents <= 0;
      })
      .sort((a, b) => {
        if (sortFilter === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortFilter === "amount_desc") return b.total_amount_cents - a.total_amount_cents;
        if (sortFilter === "amount_asc") return a.total_amount_cents - b.total_amount_cents;
        if (sortFilter === "updated") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [amountFilter, dateFilter, leads, search, sortFilter, statusFilter, tagFilter]);

  const visibleStatuses = useMemo(() => {
    if (statusFilter !== "all") return STATUSES.filter((status) => status === statusFilter);
    return STATUSES;
  }, [statusFilter]);

  const hasFilters =
    search.trim() ||
    statusFilter !== "all" ||
    tagFilter !== "all" ||
    dateFilter !== "all" ||
    amountFilter !== "all" ||
    sortFilter !== "newest";

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setTagFilter("all");
    setDateFilter("all");
    setAmountFilter("all");
    setSortFilter("newest");
  }, []);

  return (
    <DashboardPage 
      title="Замовлення" 
      padding="px-0 py-0"
      contentClassName="[&>header]:hidden"
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <AdminToolbar>
        {/* Title + view-mode toggle */}
        <div className="flex h-full items-center gap-4">
          <h1 className="text-base font-semibold text-foreground leading-none">Замовлення</h1>
          <div className="flex items-center gap-0.5 border-l border-border/60 pl-4">
            <ViewModeButton
              active={viewMode === "kanban"}
              icon={Columns3}
              label="Канбан"
              onClick={() => setViewMode("kanban")}
            />
            <ViewModeButton
              active={viewMode === "list"}
              icon={List}
              label="Список"
              onClick={() => setViewMode("list")}
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 bg-background border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Швидкий пошук..."
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5">
          <AdminFilter
            label="Статус"
            active={statusFilter !== "all"}
            value={statusFilter === "all" ? undefined : statusFilter}
            options={[
              { value: "all", label: "Всі статуси" },
              { value: "draft", label: "Чернетка", color: "#94a3b8" },
              { value: "new", label: "Новий", color: "#3b82f6" },
              { value: "in_progress", label: "В роботі", color: "#f59e0b" },
              { value: "production", label: "Виробництво", color: "#8b5cf6" },
              { value: "completed", label: "Завершено", color: "#10b981" },
              { value: "archived", label: "Архів", color: "#94a3b8" },
            ]}
            onSelect={(v) => setStatusFilter(v as StatusFilter)}
            onClear={() => setStatusFilter("all")}
            icon={RefreshCw}
          />
          <AdminFilter
            label="Тег"
            active={tagFilter !== "all"}
            value={tagFilter === "all" ? undefined : tagFilter}
            options={[
              { value: "all", label: "Всі теги" },
              { value: UNASSIGNED_TAG_VALUE, label: "Без тегів" },
              ...PREDEFINED_TAGS.map((t) => ({ value: t.id, label: t.label, color: t.color })),
              { value: CUSTOM_TAG_VALUE, label: "Інші теги" },
            ]}
            onSelect={(v) => setTagFilter(v as TagFilter)}
            onClear={() => setTagFilter("all")}
            icon={Tag}
          />
          <AdminFilter
            label="Період"
            active={dateFilter !== "all"}
            value={dateFilter === "all" ? undefined : dateFilter}
            options={[
              { value: "all", label: "Весь час" },
              { value: "today", label: "Сьогодні" },
              { value: "week", label: "7 днів" },
              { value: "month", label: "30 днів" },
            ]}
            onSelect={(v) => setDateFilter(v as DateFilter)}
            onClear={() => setDateFilter("all")}
            icon={CalendarClock}
          />
        </div>

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {loading ? "—" : `${filteredLeads.length} замовлень`}
          </span>
          {keycrmEnabled && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleKeycrmSync}
              disabled={syncingKeycrm}
            >
              {syncingKeycrm ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              <span className="hidden sm:inline">Sync KeyCRM</span>
            </Button>
          )}
          <Button
            size="sm"
            className="gap-2 px-4"
            onClick={() => router.push("/orders/new")}
          >
            <Plus className="size-4" />
            <span>Нове замовлення</span>
          </Button>
        </div>
      </AdminToolbar>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className={cn("flex-1 flex flex-col", viewMode === "kanban" ? "overflow-x-auto overflow-y-hidden" : "overflow-auto")}>
        {loading ? (
          viewMode === "kanban" ? (
            <KanbanSkeleton />
          ) : (
            <TableSkeleton />
          )
        ) : filteredLeads.length === 0 ? (
          leads.length === 0 ? (
            /* True empty — no orders exist at all */
            <div className="flex h-full items-center justify-center">
              <AdminEmptyState
                icon={Package}
                title="Немає замовлень"
                description="Створіть перше замовлення або синхронізуйте дані з KeyCRM."
                action={
                  <Button
                    size="sm"
                    className="gap-2 px-4"
                    onClick={() => router.push("/orders/new")}
                  >
                    <Plus className="size-4" />
                    Нове замовлення
                  </Button>
                }
              />
            </div>
          ) : (
            /* Filtered empty — orders exist but filters hide them */
            <div className="flex h-full items-center justify-center px-6">
              <AdminEmptyState
                icon={Filter}
                title="Нічого не знайдено"
                description="Змініть фільтри або скиньте їх, щоб повернути всі замовлення."
                action={
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Скинути фільтри
                  </Button>
                }
              />
            </div>
          )
        ) : viewMode === "list" ? (
          <OrdersListView
            orders={filteredLeads}
            selectedOrderId={selectedLead?.id ?? null}
            onOrderClick={drag.onCardClick}
          />
        ) : (
          <div className="flex h-full gap-4 px-6 py-6 animate-in" style={{ width: "max-content", minWidth: "100%" }}>
            {visibleStatuses.map((status) => {
              const colLeads = filteredLeads.filter((l) => l.status === status);
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  label={STATUS_LABELS[status]}
                  orders={colLeads}
                  totalAmount={colLeads.reduce((s, l) => s + l.total_amount_cents, 0)}
                  selectedOrderId={selectedLead?.id ?? null}
                  draggedOrderId={drag.draggedLead?.id ?? null}
                  dragOverCol={drag.dragOverCol}
                  onCardClick={drag.onCardClick}
                  onCardDragStart={drag.onCardDragStart}
                  onCardDragEnd={drag.onCardDragEnd}
                  onCardTouchStart={drag.onCardTouchStart}
                  onCardTouchMove={drag.onCardTouchMove}
                  onCardTouchEnd={drag.onCardTouchEnd}
                  onColDragOver={drag.onColDragOver}
                  onColDragLeave={drag.onColDragLeave}
                  onColDrop={drag.onColDrop}
                />
              );
            })}
          </div>
        )}
      </div>

      <OrderQuickSheet
        lead={selectedLead}
        open={selectedLead !== null}
        onClose={() => { drag.closedLeadIdRef.current = selectedLead?.id ?? null; setSelectedLead(null); }}
        onStatusChange={(id, status) => {
          const lead = leads.find((l) => l.id === id);
          if (lead) handleStatusChange(lead, status);
        }}
      />
    </DashboardPage>
  );
}

function ViewModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-3 text-xs font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon className="size-3.5 mr-1.5" />
      {label}
    </button>
  );
}

// ── KanbanSkeleton ────────────────────────────────────────────────────────────
function KanbanSkeleton() {
  const COLS = 6; // mirrors STATUSES.length
  const CARDS_PER_COL = [3, 4, 2, 3, 1, 2];

  return (
    <div className="flex h-full gap-4 px-6 py-6" style={{ width: "max-content", minWidth: "100%" }}>
      {Array.from({ length: COLS }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="flex w-[280px] shrink-0 flex-col rounded-xl border border-border bg-muted/20 p-3"
        >
          {/* Column header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="h-5 w-7 rounded-full" />
          </div>
          {/* Cards */}
          <div className="flex flex-col gap-2">
            {Array.from({ length: CARDS_PER_COL[colIdx] ?? 2 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="rounded-lg border border-border bg-background p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TableSkeleton ─────────────────────────────────────────────────────────────
function TableSkeleton() {
  // Column widths mirror OrdersListView headers (px values compressed to tailwind)
  const COL_WIDTHS = ["w-[46px]", "w-[124px]", "w-[116px]", "w-[136px]", "w-[132px]", "w-[148px]", "w-[190px]", "w-[188px]", "w-[250px]", "w-[118px]", "w-[110px]"];

  return (
    <div className="px-6 py-5">
      <div className="overflow-hidden rounded-md border border-border bg-background shadow-sm">
        <Table className="min-w-[1280px] table-fixed">
          <TableHeader>
            <TableRow className="h-11 bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[46px] px-3">
                <Skeleton className="size-4 rounded" />
              </TableHead>
              {[
                { w: "w-[124px]", label: "№ замовлення" },
                { w: "w-[116px]", label: "Джерело" },
                { w: "w-[136px]", label: "Час створення" },
                { w: "w-[132px]", label: "Статус" },
                { w: "w-[148px]", label: "Менеджер" },
                { w: "w-[190px]", label: "Покупець" },
                { w: "w-[188px]", label: "Доставка" },
                { w: "w-[250px]", label: "Товари" },
                { w: "w-[118px]", label: "Оплата" },
                { w: "w-[110px]", label: "Сума" },
              ].map(({ w, label }) => (
                <TableHead key={label} className={w}>
                  <Skeleton className="h-3 w-2/3" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, rowIdx) => (
              <TableRow key={rowIdx} className="h-[74px] align-top">
                <TableCell className="px-3">
                  <Skeleton className="size-4 rounded" />
                </TableCell>
                <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-3.5 w-14" /></TableCell>
                <TableCell><Skeleton className="h-3 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-3.5 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OrdersListView({
  orders,
  selectedOrderId,
  onOrderClick,
}: {
  orders: Lead[];
  selectedOrderId: string | null;
  onOrderClick: (lead: Lead) => void;
}) {
  return (
    <div className="px-6 py-5 animate-in">
      <div className="overflow-hidden rounded-md border border-border bg-background shadow-sm">
        <Table className="min-w-[1280px] table-fixed">
          <TableHeader>
            <TableRow className="h-11 bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[46px] px-3">
                <Checkbox aria-label="Вибрати всі замовлення" />
              </TableHead>
              <TableHead className="w-[124px]">
                <span className="inline-flex items-center gap-1.5 leading-tight">
                  <Hash className="size-3.5 text-muted-foreground" />
                  <span className="flex flex-col">
                    <span>№</span>
                    <span>замовлення</span>
                  </span>
                </span>
              </TableHead>
              <TableHead className="w-[116px]">Джерело</TableHead>
              <TableHead className="w-[136px]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5 text-muted-foreground" />
                  Час створення
                </span>
              </TableHead>
              <TableHead className="w-[132px]">Статус</TableHead>
              <TableHead className="w-[148px]">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="size-3.5 text-muted-foreground" />
                  Менеджер
                </span>
              </TableHead>
              <TableHead className="w-[190px]">Покупець</TableHead>
              <TableHead className="w-[188px]">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="size-3.5 text-muted-foreground" />
                  Доставка
                </span>
              </TableHead>
              <TableHead className="w-[250px]">
                <span className="inline-flex items-center gap-1.5">
                  <Package className="size-3.5 text-muted-foreground" />
                  Товари
                </span>
              </TableHead>
              <TableHead className="w-[118px]">
                <span className="inline-flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-muted-foreground" />
                  Оплата
                </span>
              </TableHead>
              <TableHead className="w-[110px] text-right">Сума</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((lead) => {
              const customer = lead.customer_data ?? {};
              const tags = lead.tags ?? [];
              const manager = customer.keycrm_manager_name || customer.keycrm_manager_username || "—";
              const deliveryLine = [
                customer.delivery || customer.keycrm_shipping_status,
                customer.keycrm_tracking_code && `ТТН ${customer.keycrm_tracking_code}`,
              ].filter(Boolean).join(" · ");

              return (
                <TableRow
                  key={lead.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Відкрити замовлення ${lead.customer_data?.name ?? lead.id}`}
                  data-state={selectedOrderId === lead.id ? "selected" : undefined}
                  onClick={() => onOrderClick(lead)}
                  onKeyDown={(event) => event.key === "Enter" && onOrderClick(lead)}
                  className="h-[74px] cursor-pointer align-top outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <TableCell className="px-3" onClick={(event) => event.stopPropagation()}>
                    <Checkbox aria-label={`Вибрати замовлення ${getOrderNumber(lead)}`} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-foreground">{getOrderNumber(lead)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-primary">{getSourceLabel(lead)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{formatOrderTime(lead.created_at)}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserRound className="size-4" />
                      </div>
                      <span className="truncate text-sm text-foreground">{manager}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {customer.name || "Без імені"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {customer.phone || customer.email || customer.company || "Контактів немає"}
                      </p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 2).map((tagId) => {
                            const tag = PREDEFINED_TAGS.find((item) => item.id === tagId);
                            return (
                              <Badge
                                key={tagId}
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] normal-case tracking-normal"
                                style={tag ? {
                                  color: tag.color,
                                  backgroundColor: `${tag.bg}40`,
                                  borderColor: `${tag.color}20`,
                                } : undefined}
                              >
                                {tag?.label ?? tagId}
                              </Badge>
                            );
                          })}
                          {tags.length > 2 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] normal-case tracking-normal">
                              +{tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {customer.keycrm_recipient_name || customer.delivery_details || "—"}
                      </p>
                      {deliveryLine && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{deliveryLine}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{getPrimaryItemLabel(lead)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{getItemCount(lead)} шт.</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex min-h-7 items-center rounded-md px-2 text-xs font-semibold",
                      customer.keycrm_payment_status === "paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : customer.keycrm_payment_status === "not_paid"
                          ? "bg-red-50 text-red-700"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {getPaymentLabel(customer.keycrm_payment_status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-primary">
                    {lead.total_amount_cents > 0
                      ? `${(lead.total_amount_cents / 100).toLocaleString("uk-UA")} ₴`
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}>
      <OrdersBoard />
    </Suspense>
  );
}
