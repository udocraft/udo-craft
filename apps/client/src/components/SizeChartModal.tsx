"use client";

import { useState, useEffect } from "react";
import { X, Ruler } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SizeChartRow { [col: string]: string; }
interface SizeChart { id: string; name: string; rows: SizeChartRow[]; image_url?: string | null; }

interface Props {
  chartId: string;
  trigger?: React.ReactNode;
}

export function SizeChartModal({ chartId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [chart, setChart] = useState<SizeChart | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !chartId || chart) return;
    setLoading(true);
    const supabase = createClient();
    supabase.from("size_charts").select("id, name, rows, image_url").eq("id", chartId).single()
      .then(({ data }: { data: SizeChart | null }) => { if (data) setChart(data as SizeChart); })
      .finally(() => setLoading(false));
  }, [open, chartId, chart]);

  const columns = chart?.rows?.[0] ? Object.keys(chart.rows[0]) : [];

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
      >
        {trigger ?? (
          <>
            <Ruler className="w-3.5 h-3.5" />
            Таблиця розмірів
          </>
        )}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-base">{chart?.name ?? "Таблиця розмірів"}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !chart || (chart.rows.length === 0 && !chart.image_url) ? (
                <p className="text-center text-sm text-muted-foreground py-8">Таблиця порожня</p>
              ) : (
                <div className="space-y-5">
                  {chart.image_url && (
                    <div className="overflow-hidden rounded-xl border border-border bg-white">
                      <img src={chart.image_url} alt={`${chart.name} схема розмірів`} className="max-h-[360px] w-full object-contain" />
                    </div>
                  )}
                  {chart.rows.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-border">
                            {columns.map(col => (
                              <th key={col} className="px-4 py-2.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {chart.rows.map((row, i) => (
                            <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
                              {columns.map((col, j) => (
                                <td key={col} className={`px-4 py-2.5 ${j === 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                                  {row[col] ?? "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground">Всі виміри вказані в сантиметрах. Якщо ваш розмір між двома значеннями — обирайте більший.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
