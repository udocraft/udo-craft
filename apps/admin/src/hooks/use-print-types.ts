"use client";

import * as React from "react";
import { PRINT_TYPES, type PrintTypeDef } from "@udo-craft/shared";

export interface PrintTypeRow {
  id: string;
  label: string;
  description: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  price_count: number;
}

/** Loads all print types from /api/print-types (admin). */
export function usePrintTypes() {
  const [types, setTypes] = React.useState<PrintTypeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/print-types", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не вдалося завантажити типи друку");
      setTypes(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити типи друку");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void reload(); }, [reload]);
  return { types, setTypes, loading, error, reload };
}

// ── Active types for the order editor (cached per page load) ────────────────


const FALLBACK: PrintTypeDef[] = PRINT_TYPES.map((t) => ({ ...t }));
let activeCache: PrintTypeDef[] | null = null;

/** Active print types (built-in list until loaded or if the request fails). */
export function useActivePrintTypes(): PrintTypeDef[] {
  const [types, setTypes] = React.useState<PrintTypeDef[]>(activeCache ?? FALLBACK);
  React.useEffect(() => {
    if (activeCache) return;
    let alive = true;
    fetch("/api/print-types")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: PrintTypeRow[]) => {
        const active = rows.filter((t) => t.is_active).map((t) => ({ id: t.id, label: t.label, color: t.color, desc: t.description }));
        activeCache = active.length ? active : FALLBACK;
        if (alive) setTypes(activeCache);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return types;
}
