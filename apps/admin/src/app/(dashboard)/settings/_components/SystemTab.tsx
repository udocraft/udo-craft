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
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, Trash2 } from "lucide-react";
import type { AdminHealthResponse, CheckStatus, HealthCheck } from "@/app/api/health/types";
import { toast } from "sonner";

// ── Table Groups for Hard Reset ───────────────────────────────────────────────

const TABLE_GROUPS = [
  { key: "orders",    label: "Замовлення та ліди",  tables: ["messages", "order_items", "leads", "customizer_share_comments", "customizer_shares"] },
  { key: "catalog",   label: "Каталог",              tables: ["product_color_variants", "print_zones", "print_type_pricing", "print_areas", "size_charts", "products", "categories", "materials", "print_presets"] },
  { key: "erp",       label: "ERP / Склад",           tables: ["erp_stock_movements", "erp_stock_transfer_lines", "erp_stock_transfers", "erp_finished_goods", "erp_processing_acts", "erp_production_order_lines", "erp_production_orders", "product_variant_recipe_lines", "product_variant_skus", "product_recipe_lines", "erp_goods_receipt_lines", "erp_goods_receipts", "erp_materials", "erp_material_types", "erp_suppliers", "erp_warehouses"] },
  { key: "cms",       label: "CMS контент",           tables: ["cms_content"] },
  { key: "analytics", label: "Аналітика",             tables: ["site_events"] },
  { key: "ai",        label: "AI квоти",              tables: ["user_ai_quota"] },
] as const;

const ALL_TABLES = Array.from(new Set(TABLE_GROUPS.flatMap((g) => g.tables)));

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === "ok") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <CheckCircle2 className="size-3.5" /> OK
    </span>
  );
  if (status === "degraded") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
      <AlertTriangle className="size-3.5" /> Degraded
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
      <XCircle className="size-3.5" /> Error
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
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
        <p className="text-xs text-muted-foreground">Environment</p>
        <p className="font-medium capitalize">{deployment.env}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Commit</p>
        <p className="font-mono font-medium">{deployment.sha ?? "—"}</p>
      </div>
      {deployment.message && (
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Message</p>
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

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health data");
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
  const canHardReset = resetArmed && resetPhrase === "hard reset" && resetPassword.length > 0 && selectedTables.size > 0;

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
      if (!res.ok) throw new Error(body?.error ?? "Не вдалося виконати hard reset");
      const deleted = Array.isArray(body.results)
        ? body.results.reduce((sum: number, row: { deleted?: number | null }) => sum + (row.deleted ?? 0), 0)
        : 0;
      toast.success(`Hard reset завершено. Видалено рядків: ${deleted}`);
      setResetOpen(false);
      setResetArmed(false);
      setResetPhrase("");
      setResetPassword("");
      setSelectedTables(new Set(ALL_TABLES));
      fetch_();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не вдалося виконати hard reset");
    } finally {
      setResetting(false);
    }
  };

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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin App</p>

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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client App</p>

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

      <SectionCard title="Danger zone">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-destructive">Hard reset all data</p>
            <p className="text-xs text-muted-foreground">
              Deletes orders, catalog, print settings, CMS, analytics, shares and ERP records. Admin users are not deleted.
            </p>
          </div>
          <Button type="button" variant="destructive" onClick={() => setResetOpen(true)} className="shrink-0">
            <Trash2 className="size-4" />
            Hard reset
          </Button>
        </div>
      </SectionCard>

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
        <AlertDialogContent className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <AlertDialogHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Hard reset all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes selected data from Supabase. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[calc(100vh-15rem)] space-y-3 overflow-y-auto px-4 pb-4 sm:px-5">
            <label className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
              <input
                type="checkbox"
                checked={resetArmed}
                onChange={(event) => setResetArmed(event.target.checked)}
                className="mt-0.5"
                disabled={resetting}
              />
              <span>I understand this will delete selected data except admin users.</span>
            </label>
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Дані для видалення</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0.5 px-1.5 text-xs text-muted-foreground"
                  disabled={resetting}
                  onClick={() =>
                    setSelectedTables((prev) => (prev.size === ALL_TABLES.length ? new Set<string>() : new Set(ALL_TABLES)))
                  }
                >
                  {selectedTables.size === ALL_TABLES.length ? "Зняти всі" : "Вибрати всі"}
                </Button>
              </div>
              <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1">
                {TABLE_GROUPS.map((group) => {
                  const selectedCount = group.tables.filter((t) => selectedTables.has(t)).length;
                  const allChecked = selectedCount === group.tables.length;
                  const indeterminate = selectedCount > 0 && !allChecked;

                  return (
                    <div key={group.key} className="rounded-md border border-border bg-background/50">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <IndeterminateCheckbox
                          checked={allChecked}
                          indeterminate={indeterminate}
                          disabled={resetting}
                          onChange={(checked) =>
                            setSelectedTables((prev) => {
                              const next = new Set(prev);
                              if (checked) group.tables.forEach((t) => next.add(t));
                              else group.tables.forEach((t) => next.delete(t));
                              return next;
                            })
                          }
                        />
                        <span className="flex-1 text-sm font-medium">{group.label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {selectedCount}/{group.tables.length}
                        </span>
                      </div>
                      <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto px-3 pb-3 sm:grid-cols-2">
                        {group.tables.map((table) => (
                          <label key={table} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-background/60 transition-colors cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTables.has(table)}
                              onChange={(event) =>
                                setSelectedTables((prev) => {
                                  const next = new Set(prev);
                                  if (event.target.checked) next.add(table);
                                  else next.delete(table);
                                  return next;
                                })
                              }
                              disabled={resetting}
                              className="mt-0.5"
                            />
                            <span className="font-mono text-muted-foreground">{table}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                Type <span className="font-mono text-foreground">hard reset</span> to confirm.
              </p>
              <Input
                value={resetPhrase}
                onChange={(event) => setResetPhrase(event.target.value)}
                disabled={resetting}
                autoComplete="off"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                Enter your admin password.
              </p>
              <Input
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                disabled={resetting}
                autoComplete="current-password"
              />
            </div>
          </div>
          <AlertDialogFooter className="m-0 rounded-none">
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={!canHardReset || resetting}
              onClick={hardReset}
            >
              {resetting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Видалити вибране
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
