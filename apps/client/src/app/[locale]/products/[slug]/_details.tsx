"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

export interface SizeChartData {
  name: string;
  rows: Record<string, string>[];
}

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description?: string;
}

/** Label-left / content-right row with a hairline on top (references 8–9). */
export function DetailRow({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="scroll-mt-40 border-t border-border py-14 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
        <h2 id={id ? `${id}-title` : undefined} className="text-2xl font-medium tracking-[-0.02em] sm:text-3xl">{title}</h2>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-•]\s+/.test(l));
  const paragraphs = lines.filter((l) => !/^[-•]\s+/.test(l));
  return (
    <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-foreground/85">
      {paragraphs.map((l) => <p key={l}>{l}</p>)}
      {bullets.length > 0 && (
        <ul className="space-y-3">
          {bullets.map((l) => (
            <li key={l} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-foreground/40" />
              <span>{l.replace(/^[-•]\s+/, "")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Icon grid: line icon, bold title, muted description (reference 9). */
export function FeatureGrid({ items }: { items: FeatureItem[] }) {
  return (
    <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
      {items.map(({ icon: Icon, title, description }) => (
        <li key={title} className="flex flex-col gap-3">
          <Icon className="size-10 text-foreground" strokeWidth={1.2} aria-hidden="true" />
          <p className="pt-2 text-base font-semibold">{title}</p>
          {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </li>
      ))}
    </ul>
  );
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

export function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-8 inline-flex min-h-11 items-center gap-2 text-base font-medium underline underline-offset-4 hover:no-underline">
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
