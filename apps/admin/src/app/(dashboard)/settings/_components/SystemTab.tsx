"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, Trash2 } from "lucide-react";
import type { AdminHealthResponse, CheckStatus, HealthCheck } from "@/app/api/health/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Table Groups for Hard Reset ───────────────────────────────────────────────

const TABLE_GROUPS = [
  {
    key: "orders",
    label: "Замовлення та ліди",
    items: [
      { id: "messages", label: "Повідомлення (чат та форми)" },
      { id: "order_items", label: "Товари у замовленнях" },
      { id: "leads", label: "Ліди (запити на зворотний дзвінок)" },
      { id: "customizer_share_comments", label: "Коментарі до макетів" },
      { id: "customizer_shares", label: "Спільні макети конструктора" },
    ]
  },
  {
    key: "catalog",
    label: "Каталог товарів",
    items: [
      { id: "products", label: "Товари" },
      { id: "categories", label: "Категорії" },
      { id: "materials", label: "Матеріали" },
      { id: "product_color_variants", label: "Колірні варіації" },
      { id: "print_zones", label: "Зони друку" },
      { id: "print_type_pricing", label: "Ціноутворення друку" },
      { id: "print_areas", label: "Області друку" },
      { id: "size_charts", label: "Розмірні сітки" },
      { id: "print_presets", label: "Пресет налаштувань друку" },
    ]
  },
  {
    key: "erp",
    label: "ERP / Склад та Виробництво",
    items: [
      { id: "erp_stock_movements", label: "Рух товарів на складі" },
      { id: "erp_stock_transfers", label: "Переміщення між складами" },
      { id: "erp_finished_goods", label: "Готова продукція" },
      { id: "erp_processing_acts", label: "Акти переробки" },
      { id: "erp_production_orders", label: "Замовлення на виробництво" },
      { id: "product_variant_recipe_lines", label: "Рецептури варіантів" },
      { id: "product_variant_skus", label: "SKU варіацій" },
      { id: "product_recipe_lines", label: "Складові рецептур" },
      { id: "erp_goods_receipts", label: "Надходження товарів" },
      { id: "erp_materials", label: "Сировина та матеріали" },
      { id: "erp_material_types", label: "Типи матеріалів" },
      { id: "erp_suppliers", label: "Постачальники" },
      { id: "erp_warehouses", label: "Склади" },
    ]
  },
  { key: "cms", label: "CMS контент", items: [{ id: "cms_content", label: "Сторінки та блоки контенту" }] },
  { key: "analytics", label: "Аналітика", items: [{ id: "site_events", label: "Події на сайті (метрики)" }] },
  { key: "ai", label: "AI квоти", items: [{ id: "user_ai_quota", label: "Ліміти використання AI" }] },
] as const;

const ALL_TABLES = Array.from(new Set(TABLE_GROUPS.flatMap((g) => g.items.map(i => i.id))));

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === "ok") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <CheckCircle2 className="size-3.5" /> OK
    </span>
  );
  if (status === "degraded") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
      <AlertTriangle className="size-3.5" /> Потребує уваги
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
      <XCircle className="size-3.5" /> Помилка
    </span>
  );
}

// ── Check Row ─────────────────────────────────────────────────────────────────

function CheckRow({ check }: { check: HealthCheck }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{check.service}</p>
        {check.detail && <p className="text-xs text-muted-foreground truncate max-w-xs">{check.detail}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {check.latency_ms !== null && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />{check.latency_ms}ms
          </span>
        )}
        <StatusBadge status={check.status} />
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 space-y-1 ${className}`}>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  );
}

// ── Env Grid ──────────────────────────────────────────────────────────────────

function EnvGrid({ env }: { env: Record<string, boolean> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {Object.entries(env).map(([key, set]) => (
        <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/40 border border-border/40">
          <span className="text-xs font-mono text-muted-foreground truncate">{key}</span>
          <StatusBadge status={set ? "ok" : "error"} />
        </div>
      ))}
    </div>
  );
}

// ── Deployment Card ───────────────────────────────────────────────────────────

function DeploymentCard({ deployment }: { deployment: AdminHealthResponse["admin"]["deployment"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <p className="text-xs text-muted-foreground">Середовище</p>
        <p className="font-medium capitalize">{deployment.env}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Коміт</p>
        <p className="font-mono font-medium">{deployment.sha ?? "—"}</p>
      </div>
      {deployment.message && (
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Повідомлення</p>
          <p className="font-medium truncate">{deployment.message}</p>
        </div>
      )}
      {deployment.url && (
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">URL</p>
          <a href={`https://${deployment.url}`} target="_blank" rel="noopener noreferrer"
            className="text-primary text-xs hover:underline truncate block">{deployment.url}</a>
        </div>
      )}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          {[1, 2, 3].map((j) => (
            <div key={j} className="flex items-center justify-between py-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SystemTab() {
  const [data, setData] = useState<AdminHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(() => new Set(ALL_TABLES));

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`API повернув статус ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити стан системи");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const adminChecks = data?.admin.checks ?? [];
  const supabaseChecks = adminChecks.filter((c) => c.service.startsWith("Supabase"));
  const externalAdminChecks = adminChecks.filter((c) => !c.service.startsWith("Supabase"));

  const clientIsError = data?.client && "status" in data.client && data.client.status === "error";
  const clientChecks = data?.client && !clientIsError ? (data.client as { checks: HealthCheck[] }).checks : [];
  const clientEnv = data?.client && !clientIsError ? (data.client as { env: Record<string, boolean> }).env : null;
  const clientDeployment = data?.client && !clientIsError ? (data.client as { deployment: AdminHealthResponse["admin"]["deployment"] }).deployment : null;
  const tablesToReset = Array.from(selectedTables);
  const canHardReset = resetArmed && resetPhrase.trim() === "hard reset" && resetPassword.length > 0 && selectedTables.size > 0;

  const hardReset = async () => {
    if (!canHardReset) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/hard-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: resetPhrase, password: resetPassword, tables: tablesToReset }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Не вдалося виконати повне очищення");
      const deleted = Array.isArray(body.results)
        ? body.results.reduce((sum: number, row: { deleted?: number | null }) => sum + (row.deleted ?? 0), 0)
        : 0;
      toast.success(`Повне очищення завершено. Видалено рядків: ${deleted}`);
      setResetOpen(false);
      setResetArmed(false);
      setResetPhrase("");
      setResetPassword("");
      setSelectedTables(new Set(ALL_TABLES));
      fetch_();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не вдалося виконати повне очищення");
    } finally {
      setResetting(false);
    }
  };

  const isHardResetDisabled = data?.admin.env.HARD_RESET_ENABLED === false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground/80">Стан системи</p>
          {data?.checked_at && (
            <p className="text-[11px] text-muted-foreground">
              Оновлено: {new Date(data.checked_at).toLocaleString("uk-UA")}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetch_} disabled={loading} className="gap-2">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Оновити
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !data && <LoadingSkeleton />}

      {/* Data */}
      {data && (
        <div className="space-y-6">
          {/* Admin section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Адмін-панель</p>

            <SectionCard title="Supabase">
              {supabaseChecks.map((c) => <CheckRow key={c.service} check={c} />)}
            </SectionCard>

            <SectionCard title="Зовнішні сервіси">
              {externalAdminChecks.map((c) => <CheckRow key={c.service} check={c} />)}
            </SectionCard>

            <SectionCard title="Змінні середовища">
              <EnvGrid env={data.admin.env} />
            </SectionCard>

            <SectionCard title="Деплой">
              <DeploymentCard deployment={data.admin.deployment} />
            </SectionCard>
          </div>

          {/* Client section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Клієнтський сайт</p>

            {clientIsError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {(data.client as { detail: string }).detail}
              </div>
            ) : (
              <>
                <SectionCard title="Зовнішні сервіси">
                  {clientChecks.map((c) => <CheckRow key={c.service} check={c} />)}
                </SectionCard>

                {clientEnv && (
                  <SectionCard title="Змінні середовища">
                    <EnvGrid env={clientEnv} />
                  </SectionCard>
                )}

                {clientDeployment && (
                  <SectionCard title="Деплой">
                    <DeploymentCard deployment={clientDeployment} />
                  </SectionCard>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="danger-zone" className="border rounded-2xl bg-card overflow-hidden border-destructive/20">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-destructive/5 group">
            <div className="flex items-center gap-3 text-destructive">
              <div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <AlertTriangle className="size-4" />
              </div>
              <span className="font-semibold">Небезпечна зона</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-0">
            <div className="space-y-6">
              {isHardResetDisabled && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800">
                  <AlertTriangle className="size-5 shrink-0" />
                  <p className="leading-relaxed">
                    <strong>Повне очищення даних вимкнено.</strong> Для активації встановіть <code>HARD_RESET_ENABLED=true</code> у змінних середовища.
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5 flex-1">
                  <p className="text-sm font-bold text-foreground">Повне очищення даних проекту</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed max-w-2xl">
                    Ця функція дозволяє швидко очистити базу даних від тестових або застарілих даних.
                    Видаляються замовлення, товари, записи складу, CMS та аналітика.
                    <span className="block mt-2 font-medium text-destructive/90 bg-destructive/5 rounded-lg px-2 py-1 -ml-2 w-fit">Адмін-акаунти та налаштування доступу залишаються без змін.</span>
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => setResetOpen(true)} 
                  className="shrink-0 gap-2 shadow-lg shadow-destructive/10"
                  disabled={isHardResetDisabled}
                >
                  <Trash2 className="size-4" />
                  Очистити дані
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={resetOpen} onOpenChange={(open) => {
        if (resetting) return;
        setResetOpen(open);
        if (!open) {
          setResetArmed(false);
          setResetPhrase("");
          setResetPassword("");
          setSelectedTables(new Set(ALL_TABLES));
        }
      }}>
        <AlertDialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <AlertDialogHeader className="px-8 pt-8 pb-6 bg-background">
            <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                <Trash2 className="size-6" />
              </div>
              <div className="space-y-1 text-left">
                <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">Повне очищення даних</AlertDialogTitle>
                <AlertDialogDescription className="text-[15px] text-muted-foreground font-medium">
                  Цю дію <strong className="text-destructive">неможливо скасувати</strong>. Всі вибрані дані будуть видалені назавжди.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
            <div 
              className={cn(
                "group flex items-start gap-4 rounded-[24px] border-2 p-5 cursor-pointer transition-all",
                resetArmed ? "border-destructive bg-destructive/5" : "border-border hover:border-destructive/40 bg-muted/30"
              )}
              onClick={() => setResetArmed(!resetArmed)}
            >
              <Checkbox 
                id="reset-armed" 
                checked={resetArmed} 
                onCheckedChange={(v) => setResetArmed(!!v)}
                className="mt-1 size-5 rounded-full border-2 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
              />
              <div className="space-y-1 select-none">
                <label htmlFor="reset-armed" className="text-sm font-bold text-foreground leading-none cursor-pointer">
                  Я усвідомлюю ризики
                </label>
                <p className="text-[13px] text-muted-foreground leading-snug">
                  Підтверджую, що вибрані категорії даних будуть видалені безпосередньо з Supabase без можливості відновлення.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Категорії для стирання</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs font-bold"
                  onClick={() => setSelectedTables(prev => prev.size === ALL_TABLES.length ? new Set() : new Set(ALL_TABLES))}
                >
                  {selectedTables.size === ALL_TABLES.length ? "Зняти всі" : "Вибрати всі"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TABLE_GROUPS.map((group) => {
                  const selectedCount = group.items.filter((i) => selectedTables.has(i.id)).length;
                  const allChecked = selectedCount === group.items.length;
                  
                  return (
                    <div key={group.key} className="flex flex-col rounded-[20px] border border-border bg-muted/20 overflow-hidden transition-colors hover:border-border">
                      <div 
                        className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/50 cursor-pointer"
                        onClick={() => {
                          const next = new Set(selectedTables);
                          if (allChecked) group.items.forEach(i => next.delete(i.id));
                          else group.items.forEach(i => next.add(i.id));
                          setSelectedTables(next);
                        }}
                      >
                        <Checkbox 
                          checked={allChecked ? true : selectedCount > 0 ? "indeterminate" : false}
                          className="size-4 rounded-md border-2"
                        />
                        <span className="flex-1 text-sm font-bold text-foreground">{group.label}</span>
                        <span className="text-[10px] font-black bg-muted px-2 py-0.5 rounded-full text-muted-foreground uppercase">
                          {selectedCount}/{group.items.length}
                        </span>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {group.items.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
                            onClick={() => {
                              const next = new Set(selectedTables);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              setSelectedTables(next);
                            }}
                          >
                            <Checkbox checked={selectedTables.has(item.id)} className="size-4 rounded border-2" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-foreground truncate">{item.label}</span>
                              <span className="text-[9px] text-muted-foreground font-mono uppercase opacity-60 truncate">{item.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Фраза підтвердження</label>
                <Input
                  value={resetPhrase}
                  onChange={(e) => setResetPhrase(e.target.value)}
                  placeholder="Введіть 'hard reset'"
                  className="font-mono text-sm bg-muted/20 border-2 focus-visible:border-primary/50"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Пароль адміністратора</label>
                <Input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="••••••••"
                  className="text-sm bg-muted/20 border-2 focus-visible:border-primary/50"
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>

          <AlertDialogFooter className="px-8 py-6 bg-muted/30 border-t border-border gap-3 sm:gap-0">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="h-11 rounded-full px-6 font-bold border-2 hover:bg-background transition-all">Скасувати</Button>
            </AlertDialogCancel>
            <AlertDialogAction
              asChild
            >
              <Button
                variant="destructive"
                disabled={!canHardReset || resetting}
                onClick={hardReset}
                className="h-11 rounded-full px-8 font-black shadow-xl shadow-destructive/20 min-w-[200px]"
              >
                {resetting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
                {resetting ? "Очищення..." : "Видалити дані"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
