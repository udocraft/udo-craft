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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, Trash2, ChevronDown } from "lucide-react";
import type { AdminHealthResponse, CheckStatus, HealthCheck } from "@/app/api/health/types";
import { toast } from "sonner";

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

function IndeterminateCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      ref={(el) => {
        if (!el) return;
        el.indeterminate = indeterminate;
      }}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-0.5"
    />
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
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);

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
          <p className="text-sm font-medium">Стан системи</p>
          {data?.checked_at && (
            <p className="text-xs text-muted-foreground">
              Оновлено: {new Date(data.checked_at).toLocaleString("uk-UA")}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetch_} disabled={loading} className="gap-1.5">
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

      <Collapsible open={isDangerZoneOpen} onOpenChange={setIsDangerZoneOpen}>
        <SectionCard title="Налаштування безпеки" className="p-0 overflow-hidden">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex w-full items-center justify-between rounded-none px-4 py-6 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4" />
                <span className="font-semibold">Небезпечна зона</span>
              </div>
              <ChevronDown className={`size-4 transition-transform duration-200 ${isDangerZoneOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t border-border p-4 space-y-4 bg-destructive/5">
              {isHardResetDisabled && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="size-4 shrink-0" />
                  <p>
                    <strong>Повне очищення даних вимкнено.</strong> Для активації встановіть <code>HARD_RESET_ENABLED=true</code> у змінних середовища.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-destructive">Повне очищення даних проекту</p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    Ця функція дозволяє швидко очистити базу даних від тестових або застарілих даних.
                    Видаляються замовлення, товари, записи складу (ERP), контент CMS та аналітика.
                    <span className="block mt-1 font-medium text-destructive/80">Важливо: Адмін-акаунти та налаштування доступу залишаються без змін.</span>
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => setResetOpen(true)} 
                  className="shrink-0 gap-2"
                  disabled={isHardResetDisabled}
                >
                  <Trash2 className="size-4" />
                  Очистити дані
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </SectionCard>
      </Collapsible>

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
        <AlertDialogContent className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <AlertDialogHeader className="p-4 pb-3 sm:p-6 sm:pb-4 border-b border-border">
            <AlertDialogTitle className="text-xl">Повне очищення вибраних категорій даних</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Ви збираєтеся назавжди видалити вибрані записи. Цю дію <strong>неможливо скасувати</strong>.
              Дані будуть стерті безпосередньо з Supabase.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[calc(100vh-18rem)] space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            <label className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm cursor-pointer transition-colors hover:bg-destructive/10">
              <input
                type="checkbox"
                checked={resetArmed}
                onChange={(event) => setResetArmed(event.target.checked)}
                className="mt-1 size-4 rounded border-destructive/30 text-destructive focus:ring-destructive"
                disabled={resetting}
              />
              <span className="font-medium text-destructive">Я повністю усвідомлюю ризики і підтверджую, що вибрані дані будуть видалені назавжди.</span>
            </label>

            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Вибір даних для стирання</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs hover:bg-background"
                  disabled={resetting}
                  onClick={() =>
                    setSelectedTables((prev) => (prev.size === ALL_TABLES.length ? new Set<string>() : new Set(ALL_TABLES)))
                  }
                >
                  {selectedTables.size === ALL_TABLES.length ? "Зняти всі" : "Вибрати всі"}
                </Button>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {TABLE_GROUPS.map((group) => {
                  const selectedCount = group.items.filter((i) => selectedTables.has(i.id)).length;
                  const allChecked = selectedCount === group.items.length;
                  const indeterminate = selectedCount > 0 && !allChecked;

                  return (
                    <div key={group.key} className="flex flex-col rounded-lg border border-border/60 bg-background/50 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 border-b border-border/40">
                        <IndeterminateCheckbox
                          checked={allChecked}
                          indeterminate={indeterminate}
                          disabled={resetting}
                          onChange={(checked) =>
                            setSelectedTables((prev) => {
                              const next = new Set(prev);
                              if (checked) group.items.forEach((i) => next.add(i.id));
                              else group.items.forEach((i) => next.delete(i.id));
                              return next;
                            })
                          }
                        />
                        <span className="flex-1 text-sm font-semibold">{group.label}</span>
                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {selectedCount}/{group.items.length}
                        </span>
                      </div>
                      <div className="p-2 space-y-1">
                        {group.items.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40 transition-colors cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTables.has(item.id)}
                              onChange={(event) =>
                                setSelectedTables((prev) => {
                                  const next = new Set(prev);
                                  if (event.target.checked) next.add(item.id);
                                  else next.delete(item.id);
                                  return next;
                                })
                              }
                              disabled={resetting}
                              className="size-3.5 rounded border-border text-primary"
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{item.label}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{item.id}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Фраза підтвердження</label>
                <div className="relative">
                  <Input
                    value={resetPhrase}
                    onChange={(event) => setResetPhrase(event.target.value)}
                    disabled={resetting}
                    placeholder="Введіть 'hard reset'"
                    autoComplete="off"
                    className="font-mono bg-background"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Напишіть <span className="font-bold text-foreground">hard reset</span> для розблокування кнопки.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Ваш пароль адміністратора</label>
                <Input
                  type="password"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  disabled={resetting}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="bg-background"
                />
                <p className="text-[10px] text-muted-foreground">Для підтвердження ваших прав доступу.</p>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="flex items-center justify-between border-t border-border bg-muted/20 p-4 sm:px-6">
            <AlertDialogCancel className="mt-0" disabled={resetting}>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={!canHardReset || resetting}
              onClick={hardReset}
              className="min-w-[160px]"
            >
              {resetting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {resetting ? "Очищення..." : "Видалити вибрані дані"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
