"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardPage } from "@/components/dashboard-page";
import { AdminToolbar, AdminTablePanel } from "@/components/admin-layout";
import { Users, Globe, MousePointerClick, CheckCircle2, Clock, ExternalLink, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  events: any[];
  leads: any[];
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/visitors");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVisitors(data.visitors);
    } catch (e: any) {
      toast.error(e.message || "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = visitors.filter(v => 
    v.visitor_id.toLowerCase().includes(search.toLowerCase()) ||
    v.events.some(e => String(e.page || "").toLowerCase().includes(search.toLowerCase()))
  );

  const fmtDate = (iso: string) => {
    return new Date(iso).toLocaleString("uk-UA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fmtDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "< 1 хв";
    if (mins < 60) return `${mins} хв`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} год`;
    return `${Math.floor(hrs / 24)} дн`;
  };

  const getDeviceIcon = (ua?: string) => {
    if (!ua) return "—";
    const lower = ua.toLowerCase();
    if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) return "📱";
    if (lower.includes("tablet") || lower.includes("ipad")) return "平板";
    return "💻";
  };

  return (
    <DashboardPage 
      title={`Відвідувачі (${filtered.length})`}
      actions={
        <Button variant="outline" size="sm" className="h-11 w-11 p-0 rounded-full" onClick={load} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </Button>
      }
    >
      <AdminToolbar>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 bg-background border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Швидкий пошук..."
          />
        </div>
      </AdminToolbar>

      <AdminTablePanel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Відвідувач</TableHead>
              <TableHead>Географія</TableHead>
              <TableHead>Пристрій</TableHead>
              <TableHead>Поведінка</TableHead>
              <TableHead>
                Активність
                <span className="ml-1 text-[9px] font-normal text-muted-foreground lowercase">(перегляди / сесії)</span>
              </TableHead>
              <TableHead>Шлях до замовлення</TableHead>
              <TableHead>Остання дія</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Завантаження...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Відвідувачів поки немає
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => {
                const geo = v.events[0]?.metadata?.geo;
                const ua = v.events[0]?.user_agent;
                return (
                  <TableRow key={v.visitor_id} className="hover:bg-muted/30 transition-colors border-b last:border-0">
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="font-mono text-[10px] text-muted-foreground truncate w-20" title={v.visitor_id}>
                          {v.visitor_id.slice(0, 8)}...
                        </div>
                        <Badge variant="outline" className={cn(
                          "w-fit text-[8px] h-4 mt-1 px-1.5 uppercase font-bold",
                          v.is_new ? "border-blue-200 text-blue-600 bg-blue-50/50" : "border-gray-200 text-gray-500 bg-gray-50/50"
                        )}>
                          {v.is_new ? "Новий" : "Повернувся"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium leading-none">
                          {geo?.city || "Unknown City"}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase mt-0.5">
                          {geo?.country || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <div className="text-lg" title={ua}>
                        {getDeviceIcon(ua)}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {v.is_converted ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] h-5 w-fit">
                            Замовлення ✅
                          </Badge>
                        ) : v.dropped_cart ? (
                          <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-100 text-[10px] h-5 w-fit">
                            Кинув кошик ⚠️
                          </Badge>
                        ) : v.started_cart ? (
                          <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] h-5 w-fit">
                            В конструкторі 🎨
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-gray-200 text-[10px] h-5 w-fit">
                            Перегляд 👀
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium tabular-nums">
                        <span className="flex items-center gap-1" title="Перегляди сторінок">
                          <MousePointerClick className="size-3 text-primary/50" /> {v.pageviews}
                        </span>
                        <span className="flex items-center gap-1" title="Кількість сесій">
                          <Clock className="size-3 text-primary/50" /> {v.sessions_count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {v.conversion_time_ms ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-green-600">
                            {fmtDuration(v.conversion_time_ms)}
                          </span>
                          <span className="text-[9px] text-muted-foreground uppercase leading-tight">
                            до замовлення
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-[11px] font-medium leading-tight">
                        {fmtDate(v.last_active)}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[150px] mt-0.5">
                        {v.events[0]?.page || "/"}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </AdminTablePanel>
    </DashboardPage>
  );
}
