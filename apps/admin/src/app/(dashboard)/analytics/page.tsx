"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, ChevronLeft, ChevronRight, CalendarDays, BarChart2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MetricCard, calcTrend, fmtCurrency } from "@/components/metrics";
import { EmptyState } from "@/components/empty-state";
import { DashboardPage } from "@/components/dashboard-page";
import { AdminToolbar, AdminFilter } from "@/components/admin-layout";
import { cn } from "@/lib/utils";

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

const MONTHS_UK = ["Січень","Лютий","Березень","Квітень","Травень","Червень","Люпень","Серпень","Вересень","Жовтень","Листопад","Грудень"];
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
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Попередній місяць"
          tabIndex={showPrev ? 0 : -1}
          className={cn(
            "flex items-center justify-center size-8 rounded-md transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !showPrev && "invisible pointer-events-none"
          )}
        >
          <ChevronLeft className="size-4 text-muted-foreground" />
        </button>
        <span className="text-xs font-semibold" aria-live="polite">{monthLabel}</span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Наступний місяць"
          tabIndex={showNext ? 0 : -1}
          className={cn(
            "flex items-center justify-center size-8 rounded-md transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !showNext && "invisible pointer-events-none"
          )}
        >
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </div>

      <div role="row" className="grid grid-cols-7 mb-1">
        {DAYS_UK.map(d => (
          <div key={d} role="columnheader" aria-label={d} className="flex items-center justify-center h-7 text-[10px] text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>

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
              {inRange && (
                <span aria-hidden="true" className="absolute inset-x-0 top-[20%] bottom-[20%] bg-primary/15" />
              )}
              {isFrom && hasRange && (
                <span aria-hidden="true" className="absolute left-1/2 right-0 top-[20%] bottom-[20%] bg-primary/15" />
              )}
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
                className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 shrink-0 text-xs font-medium transition-colors rounded-full",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  isEndpoint
                    ? "bg-primary text-primary-foreground"
                    : inRange
                    ? "text-foreground hover:bg-primary/20"
                    : "text-foreground hover:bg-muted",
                  isToday && !isEndpoint && "font-bold underline decoration-dotted underline-offset-2"
                )}
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
    <Popover open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <PopoverTrigger
        type="button"
        aria-label={`Обрати діапазон дат, зараз: ${fmtPresetLabel(range)}`}
        className="outline-none focus:outline-none inline-flex h-7 items-center gap-1.5 rounded-md border border-dashed border-border bg-background px-2 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
      >
        <CalendarDays className="size-3 text-muted-foreground" />
        <span>{fmtPresetLabel(range)}</span>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-auto p-0 overflow-hidden">
        <div className="flex">
          <div className="flex flex-col border-r py-2 px-1.5 min-w-[136px] gap-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
              Швидкий вибір
            </p>
            {PRESETS.filter(p => p.key !== "custom").map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors",
                  range.preset === p.key && !tempFrom
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="p-3 flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
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

            <div className="flex items-center justify-between px-1 pt-1 border-t">
              <p className="text-[10px] text-muted-foreground">
                {tempFrom && !tempTo
                  ? <>Початок: <span className="font-medium text-foreground">{tempFrom.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span></>
                  : tempFrom && tempTo
                  ? <><span className="font-medium text-foreground">{tempFrom.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span> — <span className="font-medium text-foreground">{tempTo.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span></>
                  : "Оберіть діапазон"}
              </p>
              <button
                type="button"
                onClick={handleApply}
                disabled={!canApply}
                className="ml-3 px-3 py-1 rounded-md text-[11px] font-medium bg-primary text-primary-foreground disabled:opacity-40 disabled:pointer-events-none hover:bg-primary/90 transition-colors"
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

const QUICK_CHIPS: { key: PresetKey; label: string }[] = [
  { key: "7d",  label: "7д" },
  { key: "30d", label: "30д" },
  { key: "90d", label: "90д" },
  { key: "max", label: "Весь час" },
];

export default function AnalyticsPage() {
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
          <div key={i} className="bg-card border border-border/50 rounded-xl p-6 h-32 animate-pulse" />
        ))}
      </div>
      <div className="bg-card border border-border/50 rounded-xl h-[400px] animate-pulse" />
    </div>
  );

  const d = data;

  return (
    <DashboardPage
      title={`Аналітика (${fmtPresetLabel(range)})`}
      actions={
        <div className="flex items-center gap-2">
          <DateRangePicker range={range} onChange={r => setRange(r)} />
          <Button variant="outline" size="sm" className="h-11 w-11 p-0 rounded-full" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>
      }
    >

      <div className="p-4 md:p-6 space-y-10">
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
              <section className="space-y-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Трафік та Аудиторія</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="Унікальні відвідувачі" value={d.uniqueVisitors.toLocaleString()} trend={calcTrend(d.uniqueVisitors, d.uniqueVisitorsPrev)} sub="Порівняно з минулим періодом" sparkData={[d.uniqueVisitorsPrev, d.uniqueVisitors]} />
                  <MetricCard label="Сеанси" value={d.sessions.toLocaleString()} trend={calcTrend(d.sessions, d.sessionsPrev)} sub="Кількість візитів" sparkData={[d.sessionsPrev, d.sessions]} />
                  <MetricCard label="Перегляди сторінок" value={d.pageViews.toLocaleString()} trend={calcTrend(d.pageViews, d.pageViewsPrev)} sub="Активність на сайті" sparkData={[d.pageViewsPrev, d.pageViews]} />
                  <MetricCard label="Сторінок за сесію" value={d.pagesPerSession.toFixed(1)} sub="Глибина перегляду" sparkData={[d.pageViewsPrev, d.pageViews]} />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Життєвий цикл аудиторії</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="Анонімні відвідувачі" value={d.anonymousVisitors.toLocaleString()} trend={calcTrend(d.uniqueVisitors, d.uniqueVisitorsPrev)} sub="IP, місто, сесії, події" sparkData={[d.uniqueVisitorsPrev, d.uniqueVisitors]} />
                  <MetricCard label="Зареєстровані ліди" value={d.registeredProspects.toLocaleString()} sub="Без замовлення/чату" sparkData={[0, d.registeredProspects]} />
                  <MetricCard label="Клієнти" value={d.accountClients.toLocaleString()} trend={calcTrend(d.totalClients, d.totalClientsPrev)} sub="Є замовлення або чат" sparkData={[d.totalClientsPrev, d.totalClients]} />
                  <MetricCard label="Команда" value={d.staffTotal.toLocaleString()} sub={`Адміни ${d.staffByRole.admins} · Менеджери ${d.staffByRole.managers}`} sparkData={[0, d.staffTotal]} />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Ефективність воронки</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="Заявки (форми)" value={d.formSubmissions} trend={calcTrend(d.formSubmissions, d.formSubmissionsPrev)} sub="Ліди з сайту" sparkData={[d.formSubmissionsPrev, d.formSubmissions]} />
                  <MetricCard label="Конверсія" value={`${d.conversionRate.toFixed(1)}%`} trend={calcTrend(d.conversionRate, d.conversionRatePrev)} sub="Сесії у заявки" sparkData={[d.conversionRatePrev, d.conversionRate]} />
                  <MetricCard label="Конструктор: старти" value={d.customizationStarts} sub="Інтерес до конструктора" sparkData={[0, d.customizationStarts]} />
                  <MetricCard label="Конструктор: фініші" value={d.customizationCompletions} trend={d.customizationStarts > 0 ? Math.round((d.customizationCompletions / d.customizationStarts) * 100) : 0} sub="% завершення" sparkData={[0, d.customizationCompletions]} />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Фінансові показники</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="Усі замовлення" value={d.totalOrders} trend={calcTrend(d.totalOrders, d.totalOrdersPrev)} sub="Кількість замовлень" sparkData={[d.totalOrdersPrev, d.totalOrders]} />
                  <MetricCard label="Загальний дохід" value={fmtCurrency(d.totalRevenue)} trend={calcTrend(d.totalRevenue, d.totalRevenuePrev)} sub="Брутто дохід" sparkData={[d.totalRevenuePrev, d.totalRevenue]} />
                  <MetricCard label="Сплачено" value={fmtCurrency(d.paidRevenue)} trend={calcTrend(d.paidRevenue, d.paidRevenuePrev)} sub="Завершені оплати" sparkData={[d.paidRevenuePrev, d.paidRevenue]} />
                  <MetricCard label="Середній чек" value={fmtCurrency(d.avgOrderValue)} trend={calcTrend(d.avgOrderValue, d.avgOrderValuePrev)} sub="Дохід на замовлення" sparkData={[d.avgOrderValuePrev, d.avgOrderValue]} />
                </div>
              </section>

              <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Динаміка Трафіку та Доходу</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={d.dailyStats} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "11px" }} />
                        <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#94a3b8" strokeWidth={2} name="Сесії" dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="pageViews" stroke="#10b981" strokeWidth={2} name="Перегляди" dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} name="Дохід ₴" dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-lg font-bold">Не вдалося завантажити дані</h3>
            <Button onClick={fetchAnalytics} className="mt-4 gap-2">
              <RefreshCw className="size-4" /> Повторити спробу
            </Button>
          </div>
        )}
      </div>
    </DashboardPage>
  );
}
