"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@udo-craft/ui";
import { useRouter } from "@/i18n/navigation";

export interface PrintsLabels {
  heading: string;
  sizes: string;
  types: string;
  /** Already formatted, e.g. "від 120 ₴" (null when there are no prices). */
  from: string | null;
  add: string;
  all: string;
  prevPage: string;
  nextPage: string;
  /** Pager counter pattern with a literal "{n}" placeholder, e.g. "Сторінка {n}". */
  page: string;
}

export interface CatalogPrint {
  id: string;
  name: string;
  category: string;
  image: string;
}

const PER_PAGE = 8;

/** Client island: category chips, cards and pager (same pattern as the product catalogue). */
export function PrintsCatalogGrid({
  prints,
  types,
  sizes,
  labels,
}: {
  prints: CatalogPrint[];
  types: string[];
  sizes: string[];
  labels: PrintsLabels;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const categories = useMemo(() => [...new Set(prints.map((p) => p.category).filter(Boolean))], [prints]);
  const active = prints.filter((p) => category === null || p.category === category);
  const pages = Math.max(1, Math.ceil(active.length / PER_PAGE));
  const items = active.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const select = (c: string | null) => { setCategory(c); setPage(0); };

  const chip = (selected: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-control border px-4 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      selected
        ? "border-foreground bg-foreground text-background"
        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
    }`;

  return (
    <div>
      {categories.length > 1 && (
        <div className="-mx-gutter mb-8 flex gap-2 overflow-x-auto px-gutter pb-1 scrollbar-hide" role="group" aria-label={labels.heading}>
          <button type="button" className={chip(category === null)} aria-pressed={category === null} onClick={() => select(null)}>
            {labels.all}
          </button>
          {categories.map((c) => (
            <button key={c} type="button" className={chip(category === c)} aria-pressed={category === c} onClick={() => select(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 items-stretch gap-x-3 gap-y-10 sm:gap-x-5 sm:gap-y-14 lg:grid-cols-4">
        {items.map((p) => (
          <li key={p.id} className="flex h-full flex-col">
            <div className="relative aspect-square overflow-hidden rounded-media bg-muted">
              <Image src={p.image} alt={p.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-contain p-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{p.name}</h3>
            <dl className="mt-2 space-y-1 text-sm">
              {sizes.length > 0 && (
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">{labels.sizes}:</dt>
                  <dd className="min-w-0 truncate">{sizes.join(", ")}</dd>
                </div>
              )}
              {types.length > 0 && (
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">{labels.types}:</dt>
                  <dd className="min-w-0 truncate">{types.join(", ")}</dd>
                </div>
              )}
            </dl>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
              {labels.from && <p className="text-base font-semibold tabular-nums">{labels.from}</p>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/order?print=${encodeURIComponent(p.id)}`)}
                aria-label={`${labels.add}: ${p.name}`}
              >
                <Plus aria-hidden="true" /> {labels.add}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4" aria-label={labels.heading}>
          <Button variant="outline" size="icon" aria-label={labels.prevPage} disabled={page === 0} onClick={() => setPage((x) => Math.max(0, x - 1))}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {labels.page.replace("{n}", String(page + 1))} / {pages}
          </span>
          <Button variant="outline" size="icon" aria-label={labels.nextPage} disabled={page >= pages - 1} onClick={() => setPage((x) => Math.min(pages - 1, x + 1))}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
