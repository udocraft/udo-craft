"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardPage } from "@/components/dashboard-page";
import { Users, Globe, MousePointerClick, CheckCircle2, Clock, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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

  const fmtDate = (iso: string) => {
    return new Date(iso).toLocaleString("uk-UA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardPage title="Відвідувачі веб-сайту">
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Всього відвідувачів</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Конвертовані</CardTitle>
            <CheckCircle2 className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitors.filter(v => v.is_converted).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Активні сесії</CardTitle>
            <Globe className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {visitors.filter(v => new Date(v.last_active).getTime() > Date.now() - 30 * 60 * 1000).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Коефіцієнт конверсії</CardTitle>
            <MousePointerClick className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {visitors.length > 0 ? Math.round((visitors.filter(v => v.is_converted).length / visitors.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Відвідувач</th>
              <th className="px-4 py-3 text-left font-medium">Статус</th>
              <th className="px-4 py-3 text-left font-medium">Активність</th>
              <th className="px-4 py-3 text-left font-medium">Остання дія</th>
              <th className="px-4 py-3 text-right font-medium">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Завантаження...
                </td>
              </tr>
            ) : visitors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Відвідувачів поки немає
                </td>
              </tr>
            ) : (
              visitors.map((v) => (
                <tr key={v.visitor_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-[10px] text-muted-foreground truncate w-32" title={v.visitor_id}>
                      {v.visitor_id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {v.is_converted ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                        Клієнт
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
                        Відвідувач
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="size-3" /> {v.pageviews}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {v.sessions_count} сесій
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      {fmtDate(v.last_active)}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {v.events[0]?.page || "/"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {v.leads.length > 0 && (
                      <Link
                        href={`/orders/${v.leads[0].id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Переглянути замовлення <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardPage>
  );
}
