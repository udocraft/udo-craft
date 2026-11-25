"use client";

import { useEffect, useState } from "react";
import { PRINT_TYPES, type PrintTypeDef } from "@udo-craft/shared";

const FALLBACK: PrintTypeDef[] = PRINT_TYPES.map((t) => ({ ...t }));
let cache: PrintTypeDef[] | null = null;
let inflight: Promise<PrintTypeDef[]> | null = null;

function load(): Promise<PrintTypeDef[]> {
  if (cache) return Promise.resolve(cache);
  inflight ??= fetch("/api/print-types")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((rows: PrintTypeDef[]) => {
      cache = Array.isArray(rows) && rows.length ? rows : FALLBACK;
      return cache;
    })
    .catch(() => FALLBACK) // keep the customizer usable if the request fails
    .finally(() => { inflight = null; });
  return inflight;
}

/** Active print types from the admin (print_types table); built-in list until loaded or on error. */
export function usePrintTypes(): PrintTypeDef[] {
  const [types, setTypes] = useState<PrintTypeDef[]>(cache ?? FALLBACK);
  useEffect(() => {
    let alive = true;
    void load().then((t) => { if (alive) setTypes(t); });
    return () => { alive = false; };
  }, []);
  return types;
}
