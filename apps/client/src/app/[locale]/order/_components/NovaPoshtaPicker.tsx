"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { NpOption } from "@/lib/nova-poshta";

interface LookupProps {
  /** Query string without `q`, e.g. "type=cities". */
  params: string;
  minChars: number;
  placeholder: string;
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  onPick: (option: NpOption) => void;
  onUnavailable: () => void;
}

/** Search-as-you-type combobox over /api/nova-poshta (WAI-ARIA combobox with a listbox popup). */
function Lookup({ params, minChars, placeholder, invalid, describedBy, autoFocus, onPick, onUnavailable }: LookupProps) {
  const t = useTranslations("checkout.np");
  const listId = useId();
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<NpOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const unavailable = useRef(onUnavailable);
  unavailable.current = onUnavailable;

  useEffect(() => {
    if (q.trim().length < minChars) {
      setOptions(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    // Debounce typing; the previous request is aborted by the cleanup.
    const timer = setTimeout(() => {
      fetch(`/api/nova-poshta?${params}&q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((json: { options: NpOption[] }) => {
          setOptions(json.options);
          setActive(0);
          setLoading(false);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setLoading(false);
          unavailable.current();
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, params, minChars]);

  const showList = open && options !== null;

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && options[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder}
        className="pl-10 pr-10"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Delay so a click on an option lands before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          if (e.key === "Enter" && options[active]) { e.preventDefault(); onPick(options[active]); }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {loading && <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />}
      <ul
        id={listId}
        role="listbox"
        hidden={!showList}
        className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto overscroll-contain rounded-card border border-border bg-popover p-1.5 shadow-lg"
      >
        {showList && options.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">{t("noResults")}</li>}
        {showList &&
          options.map((o, i) => (
            <li
              key={o.ref}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: fires before the input's blur.
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2 text-sm ${i === active ? "bg-muted text-foreground" : "text-foreground/80"}`}
            >
              {o.label}
            </li>
          ))}
      </ul>
    </div>
  );
}

interface Props {
  /** "City, branch" as stored in the order. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * City, then branch. The result is one human-readable string (what the manager
 * needs for the waybill). If the lookup is unreachable it degrades to a plain input.
 */
export function NovaPoshtaPicker({ value, onChange, invalid, describedBy }: Props) {
  const t = useTranslations("checkout");
  const [city, setCity] = useState<NpOption | null>(null);
  const [manual, setManual] = useState(false);

  if (manual) {
    return (
      <Input
        value={value}
        aria-label={t("np.branch")}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder={t("np.manualPlaceholder")}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-border bg-background p-3">
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium">{value}</p>
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-control px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            setCity(null);
            onChange("");
          }}
        >
          {t("edit")}
        </button>
      </div>
    );
  }

  if (!city) {
    return (
      <Lookup
        key="city"
        params="type=cities"
        minChars={2}
        placeholder={t("np.cityPlaceholder")}
        invalid={invalid}
        describedBy={describedBy}
        onPick={setCity}
        onUnavailable={() => setManual(true)}
      />
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setCity(null)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MapPin className="size-4 text-primary" aria-hidden="true" />
        {city.label}
        <span className="text-primary">· {t("edit")}</span>
      </button>
      <Lookup
        key={city.ref}
        params={`type=warehouses&city=${city.ref}`}
        minChars={0}
        autoFocus
        placeholder={t("np.branchPlaceholder")}
        invalid={invalid}
        describedBy={describedBy}
        onPick={(branch) => onChange(`${city.label}, ${branch.label}`)}
        onUnavailable={() => setManual(true)}
      />
    </div>
  );
}
