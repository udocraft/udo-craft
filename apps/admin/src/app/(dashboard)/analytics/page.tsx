"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MetricCard, calcTrend, fmtCurrency } from "@/components/metrics";
import { EmptyState } from "@/components/empty-state";
import { BarChart2 } from "lucide-react";

// ─── Date Range Types ─────────────────────────────────────────────────────────

type PresetKey = "today" | "yesterday" | "7d" | "30d" | "90d" | "thisYear" | "lastYear" | "max" | "custom";

interface DateRange {
  preset: PresetKey;
  from: Date;
  to: Date;
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today",     label: "Сьогодні" },
  { key: "yesterday", label: "Вчора" },
  { key: "7d",        label: "7 днів" },
  { key: "30d",       label: "30 днів" },
  { key: "90d",       label: "90 днів" },
  { key: "thisYear",  label: "Цей рік" },
  { key: "lastYear",  label: "Минулий рік" },
  { key: "max",       label: "Весь час" },
  { key: "custom",    label: "Довільний" },
];

function presetToDates(key: PresetKey, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case "today":     return { from: today, to: now };
    case "yesterday": { const y = new Date(today); y.setDate(y.getDate() - 1); return { from: y, to: today }; }
    case "7d":        { const f = new Date(today); f.setDate(f.getDate() - 7); return { from: f, to: now }; }
    case "30d":       { const f = new Date(today); f.setDate(f.getDate() - 30); return { from: f, to: now }; }
    case "90d":       { const f = new Date(today); f.setDate(f.getDate() - 90); return { from: f, to: now }; }
    case "thisYear":  return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "lastYear":  return { from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear() - 1, 11, 31) };
    case "max":       return { from: new Date("2020-01-01"), to: now };
    case "custom":    return { from: customFrom ?? today, to: customTo ?? now };
  }
}

function fmtPresetLabel(range: DateRange): string {
  if (range.preset !== "custom") return PRESETS.find(p => p.key === range.preset)!.label;
  const fmt = (d: Date) => d.toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "2-digit" });
  return `${fmt(range.from)} — ${fmt(range.to)}`;
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

const MONTHS_UK = ["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];
const DAYS_UK = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

interface MiniCalProps {
  year: number; month: number;
  from: Date | null; to: Date | null; hover: Date | null;
  onDay: (d: Date) => void; onHover: (d: Date | null) => void;
  onPrev: () => void; onNext: () => void;
  showPrev?: boolean; showNext?: boolean;
}

function MiniCal({ year, month, from, to, hover, onDay, onHover, onPrev, onNext, showPrev = true, showNext = true }: MiniCalProps) {
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7; // Mon-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const rangeEnd = hover && from && !to ? hover : to;
  const monthLabel = `${MONTHS_UK[month]} ${year}`;

  return (
    <div role="grid" aria-label={monthLabel} className="select-none w-[224px]">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Попередній місяць"
          tabIndex={showPrev ? 0 : -1}
          className={[
            "flex items-center justify-center size-8 rounded-md transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !showPrev ? "invisible pointer-events-none" : "",
          ].join(" ")}
        >
          <ChevronLeft className="size-4 text-muted-foreground" />
        </button>
        <span className="text-xs font-semibold" aria-live="polite">{monthLabel}</span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Наступний місяць"
          tabIndex={showNext ? 0 : -1}
          className={[
            "flex items-center justify-center size-8 rounded-md transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !showNext ? "invisible pointer-events-none" : "",
          ].join(" ")}
        >
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div role="row" className="grid grid-cols-7 mb-1">
        {DAYS_UK.map(d => (
          <div key={d} role="columnheader" aria-label={d} className="flex items-center justify-center h-7 text-[10px] text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={i} role="gridcell" aria-hidden="true" className="w-8 h-8" />;

          const isFrom = !!(from && isSameDay(day, from));
          const isTo = !!(rangeEnd && isSameDay(day, rangeEnd));
          const isEndpoint = isFrom || isTo;
          const inRange = !!(from && rangeEnd && day > startOfDay(from) && day < startOfDay(rangeEnd));
          const isToday = isSameDay(day, new Date());
          const isSelected = isEndpoint || inRange;
          const hasRange = !!(from && rangeEnd && !isSameDay(from, rangeEnd));

          return (
            <div key={i} role="gridcell" className="relative flex items-center justify-center w-8 h-8">
              {/* Continuous range fill — vertically centered band */}
              {inRange && (
                <span aria-hidden="true" className="absolute inset-x-0 top-[20%] bottom-[20%] bg-primary/15" />
              )}
              {/* Right half-fill for "from" endpoint */}
              {isFrom && hasRange && (
                <span aria-hidden="true" className="absolute left-1/2 right-0 top-[20%] bottom-[20%] bg-primary/15" />
              )}
              {/* Left half-fill for "to" endpoint */}
              {isTo && hasRange && (
                <span aria-hidden="true" className="absolute right-1/2 left-0 top-[20%] bottom-[20%] bg-primary/15" />
              )}
              <button
                type="button"
                onClick={() => onDay(day)}
                onMouseEnter={() => onHover(day)}
                onMouseLeave={() => onHover(null)}
                aria-label={day.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
                aria-selected={isSelected}
                aria-current={isToday ? "date" : undefined}
                className={[
                  "relative z-10 flex items-center justify-center w-8 h-8 shrink-0 text-xs font-medium transition-colors rounded-full",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  isEndpoint
                    ? "bg-primary text-primary-foreground"
                    : inRange
                    ? "text-foreground hover:bg-primary/20"
                    : "text-foreground hover:bg-muted",
                  isToday && !isEndpoint ? "font-bold underline decoration-dotted underline-offset-2" : "",
                ].join(" ")}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

function DateRangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const [picking, setPicking] = useState<"from" | "to">("from");
  const [tempFrom, setTempFrom] = useState<Date | null>(null);
  const [tempTo, setTempTo] = useState<Date | null>(null);
  const [hover, setHover] = useState<Date | null>(null);

  const rightYear = calMonth === 11 ? calYear + 1 : calYear;
  const rightMonth = calMonth === 11 ? 0 : calMonth + 1;

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const handleDay = (day: Date) => {
    if (picking === "from" || (tempFrom && day < tempFrom)) {
      setTempFrom(day);
      setTempTo(null);
      setPicking("to");
    } else {
      setTempTo(day);
      setPicking("from");
    }
  };

  const handleApply = () => {
    if (tempFrom && tempTo) {
      onChange({
        preset: "custom",
        from: startOfDay(tempFrom),
        to: new Date(tempTo.getFullYear(), tempTo.getMonth(), tempTo.getDate(), 23, 59, 59),
      });
    }
    setTempFrom(null);
    setTempTo(null);
    setPicking("from");
    setOpen(false);
  };

  const applyPreset = (key: PresetKey) => {
    const { from, to } = presetToDates(key);
    onChange({ preset: key, from, to });
    setTempFrom(null);
    setTempTo(null);
    setPicking("from");
    setOpen(false);
  };

  const handleClose = () => {
    setTempFrom(null);
    setTempTo(null);
    setPicking("from");
    setOpen(false);
  };

  const displayFrom = tempFrom ?? range.from;
  const displayTo = tempTo ?? (tempFrom ? null : range.to);
  const canApply = !!(tempFrom && tempTo);

  return (
    <Popover open={open} onOpenChange={o => { if (!o) handleClose(); else setOpen(true); }}>
      <PopoverTrigger
        aria-label={`Обрати діапазон дат, зараз: ${fmtPresetLabel(range)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="outline-none focus:outline-none inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted transition-colors"
      >
        <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span>{fmtPresetLabel(range)}</span>
        <ChevronRight className="size-3 text-muted-foreground rotate-90" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-auto p-0 overflow-hidden" role="dialog" aria-label="Вибір діапазону дат">
        <div className="flex">
          {/* Presets */}
          <div className="flex flex-col border-r py-2 px-1.5 min-w-[136px] gap-0.5" role="listbox" aria-label="Швидкий вибір">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1" aria-hidden="true">
              Швидкий вибір
            </p>
            {PRESETS.filter(p => p.key !== "custom").map(p => (
              <button
                key={p.key}
                type="button"
                role="option"
                aria-selected={range.preset === p.key && !tempFrom}
                onClick={() => applyPreset(p.key)}
                className={[
                  "w-full text-left px-2 py-2 rounded-md text-xs transition-colors min-h-[32px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  range.preset === p.key && !tempFrom
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendars */}
          <div className="p-3 flex flex-col gap-2">
            <p aria-live="polite" aria-atomic="true" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {picking === "from" ? "Оберіть початок" : "Оберіть кінець"}
            </p>

            <div className="flex gap-4">
              <MiniCal
                year={calYear} month={calMonth}
                from={displayFrom} to={displayTo} hover={hover}
                onDay={handleDay} onHover={setHover}
                onPrev={prevMonth} onNext={nextMonth}
                showNext={false}
              />
              <MiniCal
                year={rightYear} month={rightMonth}
                from={displayFrom} to={displayTo} hover={hover}
                onDay={handleDay} onHover={setHover}
                onPrev={prevMonth} onNext={nextMonth}
                showPrev={false}
              />
            </div>

            {/* Status + Apply */}
            <div className="flex items-center justify-between px-1 pt-1 border-t">
              <p aria-live="polite" className="text-[10px] text-muted-foreground">
                {tempFrom && !tempTo
                  ? <>Початок: <span className="font-medium text-foreground">{tempFrom.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span> — оберіть кінець</>
                  : tempFrom && tempTo
                  ? <><span className="font-medium text-foreground">{tempFrom.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span> — <span className="font-medium text-foreground">{tempTo.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span></>
                  : "Оберіть діапазон"}
              </p>
              <button
                type="button"
                onClick={handleApply}
                disabled={!canApply}
                className="ml-3 px-3 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground disabled:opacity-40 disabled:pointer-events-none hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Застосувати
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Data Types ───────────────────────────────────────────────────────────────

interface AnalyticsData {
  sessions: number; sessionsPrev: number;
  uniqueVisitors: number; uniqueVisitorsPrev: number;
  pageViews: number; pageViewsPrev: number;
  pagesPerSession: number;
  formSubmissions: number; formSubmissionsPrev: number;
  customizationStarts: number; customizationCompletions: number;
  conversionRate: number; conversionRatePrev: number;
  totalOrders: number; totalOrdersPrev: number;
  totalRevenue: number; totalRevenuePrev: number;
  paidRevenue: number; paidRevenuePrev: number;
  avgOrderValue: number; avgOrderValuePrev: number;
  itemsSold: number;
  totalClients: number; totalClientsPrev: number;
  anonymousVisitors: number;
  registeredAccounts: number;
  registeredProspects: number;
  accountClients: number;
  visitorToAccountRate: number;
  accountToClientRate: number;
  staffTotal: number;
  staffByRole: { admins: number; managers: number; production: number };
  completedOrders: number; completedOrdersPrev: number;
  warehouseItems: number;
  warehouseStockValue: number;
  warehouseReservedValue: number;
  warehouseLowStock: number;
  dailyStats: Array<{ date: string; sessions: number; pageViews: number; forms: number; revenue: number }>;
}

// ─── Quick Chips ──────────────────────────────────────────────────────────────

const QUICK_CHIPS: { key: PresetKey; label: string }[] = [
  { key: "7d",  label: "7д" },
  { key: "30d", label: "30д" },
  { key: "90d", label: "90д" },
  { key: "max", label: "Весь час" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

import { DashboardHeader } from "@/components/dashboard-header";



export default function AnalyticsPage() {
  const supabase = createClient();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>(() => {
    const { from, to } = presetToDates("30d");
    return { preset: "30d", from, to };
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/range?from=${range.from.toISOString()}&to=${range.to.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const applyQuickChip = (key: PresetKey) => {
    const { from, to } = presetToDates(key);
    setRange({ preset: key, from, to });
  };

  const skeletonRows = (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-2xl p-6 h-32 animate-pulse shadow-sm" />
        ))}
      </div>
      <div className="bg-card border border-border/50 rounded-2xl h-[400px] animate-pulse shadow-sm" />
    </div>
  );

  const d = data;

  return (
    <div className="flex flex-1 h-0 flex-col overflow-hidden">
      <DashboardHeader
        title="Аналітика"
        subtitle={
          <div className="flex items-center gap-2">
            <BarChart2 className="size-4 text-primary" />
            <span>Звіт за обраний період</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 mr-2">
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => applyQuickChip(chip.key)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    range.preset === chip.key
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <DateRangePicker range={range} onChange={r => setRange(r)} />
            <Button variant="outline" size="icon" className="size-8 rounded-lg border-border/50 shadow-sm" onClick={fetchAnalytics} disabled={loading}>
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto selection:bg-primary/10">
        <div className="max-w-7xl mx-auto p-6 space-y-10">
          {loading && !d ? skeletonRows : d ? (
            d.sessions === 0 && d.totalOrders === 0 && d.totalRevenue === 0 ? (
              <EmptyState
                icon={BarChart2}
                title="Даних ще немає"
                description="Аналітика з'явиться після перших відвідувань та замовлень за обраний період"
                action={
                  <Button variant="outline" size="sm" onClick={() => applyQuickChip("max")}>
                    Показати весь час
                  </Button>
                }
              />
            ) : (
              <>
                {/* ── Traffic ── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Трафік та Аудиторія</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard label="Унікальні відвідувачі" value={d.uniqueVisitors.toLocaleString()} trend={calcTrend(d.uniqueVisitors, d.uniqueVisitorsPrev)} sub="Порівняно з минулим періодом" sparkData={[d.uniqueVisitorsPrev, d.uniqueVisitors]} />
                    <MetricCard label="Сеанси" value={d.sessions.toLocaleString()} trend={calcTrend(d.sessions, d.sessionsPrev)} sub="Кількість візитів" sparkData={[d.sessionsPrev, d.sessions]} />
                    <MetricCard label="Перегляди сторінок" value={d.pageViews.toLocaleString()} trend={calcTrend(d.pageViews, d.pageViewsPrev)} sub="Активність на сайті" sparkData={[d.pageViewsPrev, d.pageViews]} />
                    <MetricCard label="Сторінок за сесію" value={d.pagesPerSession.toFixed(1)} sub="Глибина перегляду" sparkData={[d.pageViewsPrev, d.pageViews]} />
                  </div>
                </section>

                {/* ── Funnel ── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Життєвий цикл аудиторії</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard label="Анонімні відвідувачі" value={d.anonymousVisitors.toLocaleString()} trend={calcTrend(d.uniqueVisitors, d.uniqueVisitorsPrev)} sub="Visitor role: IP, місто, сесії, події" sparkData={[d.uniqueVisitorsPrev, d.uniqueVisitors]} />
                    <MetricCard label="Зареєстровані ліди" value={d.registeredProspects.toLocaleString()} sub="Є акаунт, ще без замовлення/чату" sparkData={[0, d.registeredProspects]} />
                    <MetricCard label="Клієнти" value={d.accountClients.toLocaleString()} trend={calcTrend(d.totalClients, d.totalClientsPrev)} sub="Є замовлення або чат з менеджером" sparkData={[d.totalClientsPrev, d.totalClients]} />
                    <MetricCard label="Команда" value={d.staffTotal.toLocaleString()} sub={`Адміни ${d.staffByRole.admins} · Менеджери ${d.staffByRole.managers} · Виробництво ${d.staffByRole.production}`} sparkData={[0, d.staffTotal]} />
                  </div>
                </section>

                {/* ── Funnel ── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Ефективність воронки</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard label="Заявки (форми)" value={d.formSubmissions} trend={calcTrend(d.formSubmissions, d.formSubmissionsPrev)} sub="Ліди з сайту" sparkData={[d.formSubmissionsPrev, d.formSubmissions]} />
                    <MetricCard label="Конверсія" value={`${d.conversionRate.toFixed(1)}%`} trend={calcTrend(d.conversionRate, d.conversionRatePrev)} sub="Сесії у заявки" sparkData={[d.conversionRatePrev, d.conversionRate]} />
                    <MetricCard label="Відвідувачі → акаунти" value={`${d.visitorToAccountRate.toFixed(1)}%`} sub="Частка реєстрацій від visitor pool" sparkData={[0, d.visitorToAccountRate]} />
                    <MetricCard label="Акаунти → клієнти" value={`${d.accountToClientRate.toFixed(1)}%`} sub="Замовлення або чат після реєстрації" sparkData={[0, d.accountToClientRate]} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard label="Старти кастомізації" value={d.customizationStarts} sub="Інтерес до конструктора" sparkData={[0, d.customizationStarts]} />
                    <MetricCard label="Фініші кастомізації" value={d.customizationCompletions} trend={d.customizationStarts > 0 ? Math.round((d.customizationCompletions / d.customizationStarts) * 100) : 0} sub="% завершення" sparkData={[0, d.customizationCompletions]} />
                  </div>
                </section>

                {/* ── Sales ── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Фінансові показники</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard label="Усі замовлення" value={d.totalOrders} trend={calcTrend(d.totalOrders, d.totalOrdersPrev)} sub="Кількість замовлень" sparkData={[d.totalOrdersPrev, d.totalOrders]} />
                    <MetricCard label="Загальний дохід" value={fmtCurrency(d.totalRevenue)} trend={calcTrend(d.totalRevenue, d.totalRevenuePrev)} sub="Брутто дохід" sparkData={[d.totalRevenuePrev, d.totalRevenue]} />
                    <MetricCard label="Сплачено" value={fmtCurrency(d.paidRevenue)} trend={calcTrend(d.paidRevenue, d.paidRevenuePrev)} sub="Завершені оплати" sparkData={[d.paidRevenuePrev, d.paidRevenue]} />
                    <MetricCard label="Середній чек" value={fmtCurrency(d.avgOrderValue)} trend={calcTrend(d.avgOrderValue, d.avgOrderValuePrev)} sub="Дохід на замовлення" sparkData={[d.avgOrderValuePrev, d.avgOrderValue]} />
                  </div>
                </section>

                {/* ── Warehouse ── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Склад</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard label="Номенклатура" value={d.warehouseItems ?? 0} sub="Позицій складу" sparkData={[0, d.warehouseItems ?? 0]} />
                    <MetricCard label="Вартість складу" value={fmtCurrency(Math.round(d.warehouseStockValue ?? 0))} sub="Оцінка за собівартістю" sparkData={[0, d.warehouseStockValue ?? 0]} />
                    <MetricCard label="Резерв під замовлення" value={fmtCurrency(Math.round(d.warehouseReservedValue ?? 0))} sub="Зарезервовані матеріали" sparkData={[0, d.warehouseReservedValue ?? 0]} />
                    <MetricCard label="Потрібно докупити" value={d.warehouseLowStock ?? 0} sub="Позицій нижче мінімуму" sparkData={[0, d.warehouseLowStock ?? 0]} />
                  </div>
                </section>

                {/* ── Chart ── */}
                <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden bg-background/50 backdrop-blur-sm">
                  <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Динаміка Трафіку та Доходу</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={d.dailyStats} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fontWeight: 600 }} 
                            axisLine={false} 
                            tickLine={false} 
                            dy={10}
                          />
                          <YAxis 
                            yAxisId="left" 
                            tick={{ fontSize: 10, fontWeight: 600 }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            tick={{ fontSize: 10, fontWeight: 600 }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "rgba(255, 255, 255, 0.8)", 
                              backdropFilter: "blur(12px)",
                              border: "1px solid rgba(0,0,0,0.1)", 
                              borderRadius: "16px", 
                              fontSize: "12px",
                              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
                            }} 
                            itemStyle={{ fontWeight: "bold" }}
                          />
                          <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="hsl(var(--muted-foreground))" strokeWidth={3} name="Сесії" dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                          <Line yAxisId="left" type="monotone" dataKey="pageViews" stroke="#10b981" strokeWidth={3} name="Перегляди" dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                          <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={4} name="Дохід ₴" dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <RefreshCw className="size-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold">Не вдалося завантажити дані</h3>
              <p className="text-muted-foreground mb-6">Перевірте з'єднання або спробуйте пізніше</p>
              <Button onClick={fetchAnalytics} className="gap-2">
                <RefreshCw className="size-4" /> Повторити спробу
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
