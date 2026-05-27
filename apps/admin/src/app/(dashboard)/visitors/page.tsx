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
  pageviews: number;
  sessions_count: number;
  is_converted: boolean;
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

  return (
    <DashboardPage 
      title="Відвідувачі"
      actions={
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={load} disabled={loading}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      }
    >
      <AdminToolbar>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 w-48 pl-8 text-[11px] bg-background border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук по ID або сторінці..."
          />
        </div>

        <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {filtered.length} відвідувачів
        </span>
      </AdminToolbar>

      <AdminTablePanel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Відвідувач</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Активність</TableHead>
              <TableHead>Остання дія</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Завантаження...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Відвідувачів поки немає
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.visitor_id} className="hover:bg-muted/30 transition-colors border-b last:border-0">
                  <TableCell className="px-4 py-3">
                    <div className="font-mono text-[10px] text-muted-foreground truncate w-32" title={v.visitor_id}>
                      {v.visitor_id.slice(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {v.is_converted ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] h-5">
                        Клієнт
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] h-5">
                        Відвідувач
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="size-3" /> {v.pageviews}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {v.sessions_count} сесій
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="text-[11px] font-medium">
                      {fmtDate(v.last_active)}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {v.events[0]?.page || "/"}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {v.leads.length > 0 && (
                      <Link
                        href={`/orders?leadId=${v.leads[0].id}`}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                      >
                        Замовлення <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTablePanel>
    </DashboardPage>
  );
}
