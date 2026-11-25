"use client";

import { useState } from "react";

export interface SizeChartData {
  name: string;
  rows: Record<string, string>[];
}

/** Inline size table with a cm/in switch when the chart is in centimetres (reference 8). */
export function SizeTable({ chart }: { chart: SizeChartData }) {
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const columns = chart.rows[0] ? Object.keys(chart.rows[0]) : [];
  if (!columns.length) return null;

  const convert = (v: string) => {
    if (unit === "cm") return v;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n > 0 && /^\s*[\d.,]+\s*$/.test(v) ? (n / 2.54).toFixed(1) : v;
  };

  return (
    <div>
      <div role="tablist" aria-label="Одиниці" className="mb-6 flex gap-6 border-b border-border">
        {(["cm", "in"] as const).map((u) => (
          <button
            key={u}
            type="button"
            role="tab"
            aria-selected={unit === u}
            onClick={() => setUnit(u)}
            className={`-mb-px min-h-11 border-b-2 px-1 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              unit === u ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {u === "cm" ? "Сантиметри" : "Дюйми"}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c} scope="col" className="py-4 pr-6 font-medium text-muted-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/70 even:bg-muted/40">
                {columns.map((c, ci) => (
                  ci === 0
                    ? <th key={c} scope="row" className="py-4 pr-6 font-medium">{row[c]}</th>
                    : <td key={c} className="py-4 pr-6 tabular-nums">{convert(row[c] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
