"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Clock, Monitor, MousePointerClick, RefreshCw, Smartphone, Tablet } from "lucide-react";
import { toast } from "sonner";
import { DashboardPage } from "@/components/dashboard-page";
import { AdminEmptyState, AdminSearch, AdminTablePanel, AdminToolbar } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VisitorEvent {
  page?: string;
  user_agent?: string;
  metadata?: { geo?: { city?: string; country?: string } };
}

interface Visitor {
  visitor_id: string;
  last_active: string;
  first_seen: string;
  pageviews: number;
  sessions_count: number;
  is_converted: boolean;
  is_new: boolean;
  started_cart: boolean;
  completed_cart: boolean;
  dropped_cart: boolean;
  conversion_time_ms: number | null;
  events: VisitorEvent[];
  leads: unknown[];
}

// ── Helpers (module-level: no re-creation per render) ─────────────────────────

const dateFormat = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtDuration(ms: number) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "< 1 хв";
  if (mins < 60) return `${mins} хв`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} год`;
  return `${Math.floor(hrs / 24)} дн`;
}

function DeviceIcon({ ua }: { ua?: string }) {
  if (!ua) return <span aria-label="Невідомо">—</span>;
  const lower = ua.toLowerCase();
  if (lower.includes("tablet") || lower.includes("ipad")) {
    return <Tablet className="mx-auto size-4 text-muted-foreground" aria-label="Планшет" />;
  }
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) {
    return <Smartphone className="mx-auto size-4 text-muted-foreground" aria-label="Телефон" />;
  }
  return <Monitor className="mx-auto size-4 text-muted-foreground" aria-label="Комп'ютер" />;
}

function BehaviorBadge({ v }: { v: Visitor }) {
  if (v.is_converted) return <Badge variant="success">Замовлення</Badge>;
  if (v.dropped_cart) return <Badge variant="destructive">Кинув кошик</Badge>;
  if (v.started_cart) return <Badge variant="info">В конструкторі</Badge>;
  return <Badge variant="secondary">Перегляд</Badge>;
}

// ── Row ───────────────────────────────────────────────────────────────────────

const VisitorRow = memo(function VisitorRow({ v }: { v: Visitor }) {
  const first = v.events[0];
  const geo = first?.metadata?.geo;

  return (
    <TableRow>
      <TableCell className="px-4 py-3">
        <div className="font-mono text-xs text-muted-foreground" title={v.visitor_id}>
          {v.visitor_id.slice(0, 8)}…
        </div>
        <Badge variant={v.is_new ? "info" : "outline"} className="mt-1">
          {v.is_new ? "Новий" : "Повернувся"}
        </Badge>
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="text-sm font-medium leading-none">{geo?.city || "Невідомо"}</div>
        <div className="mt-1 text-xs uppercase text-muted-foreground">{geo?.country || "—"}</div>
      </TableCell>
      <TableCell className="px-4 py-3 text-center" title={first?.user_agent}>
        <DeviceIcon ua={first?.user_agent} />
      </TableCell>
      <TableCell className="px-4 py-3">
        <BehaviorBadge v={v} />
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3 text-xs font-medium tabular-nums text-muted-foreground">
          <span className="flex items-center gap-1" title="Перегляди сторінок">
            <MousePointerClick className="size-3.5 text-primary/60" aria-hidden /> {v.pageviews}
          </span>
          <span className="flex items-center gap-1" title="Кількість сесій">
            <Clock className="size-3.5 text-primary/60" aria-hidden /> {v.sessions_count}
          </span>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        {v.conversion_time_ms ? (
          <>
            <div className="text-xs font-semibold text-success">{fmtDuration(v.conversion_time_ms)}</div>
            <div className="text-xs text-muted-foreground">до замовлення</div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="text-sm font-medium leading-tight">{dateFormat.format(new Date(v.last_active))}</div>
        <div className="mt-0.5 max-w-[150px] truncate text-xs text-muted-foreground">{first?.page || "/"}</div>
      </TableCell>
    </TableRow>
  );
});

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i} className="hover:bg-transparent">
      {Array.from({ length: 7 }).map((__, j) => (
        <TableCell key={j} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-24" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/visitors");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVisitors(data.visitors);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return visitors;
    return visitors.filter(
      (v) =>
        v.visitor_id.toLowerCase().includes(q) ||
        v.events.some((e) => String(e.page || "").toLowerCase().includes(q))
    );
  }, [visitors, deferredSearch]);

  return (
    <DashboardPage
      title={`Відвідувачі (${filtered.length})`}
      actions={
        <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Оновити">
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </Button>
      }
    >
      <AdminToolbar>
        <AdminSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Пошук за ID або сторінкою" />
      </AdminToolbar>

      <AdminTablePanel className="mx-4 mb-6 md:mx-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Відвідувач</TableHead>
              <TableHead>Географія</TableHead>
              <TableHead className="text-center">Пристрій</TableHead>
              <TableHead>Поведінка</TableHead>
              <TableHead>Перегляди / сесії</TableHead>
              <TableHead>Шлях до замовлення</TableHead>
              <TableHead>Остання дія</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7}>
                  <AdminEmptyState icon={MousePointerClick} title="Відвідувачів поки немає" />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => <VisitorRow key={v.visitor_id} v={v} />)
            )}
          </TableBody>
        </Table>
      </AdminTablePanel>
    </DashboardPage>
  );
}
