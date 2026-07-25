"use client";

import React, { useCallback, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import { ELEMENT_PRESETS, SHAPE_CATEGORIES } from "@udo-craft/shared";

export interface ShapesPanelProps {
  onAddLayer: (file: File) => void;
}

export default function ShapesPanel({ onAddLayer }: ShapesPanelProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const filtered = ELEMENT_PRESETS.filter((s) => {
    const matchesCat = !activeCategory || s.category === activeCategory;
    const matchesSearch = !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleAdd = useCallback(async (svgPath: string, name: string, id: string) => {
    if (addingId) return;
    setAddingId(id);
    try {
      const res = await fetch(svgPath);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      onAddLayer(new File([blob], `${name}.svg`, { type: "image/svg+xml" }));
    } catch { /* silently ignore */ } finally { setAddingId(null); }
  }, [addingId, onAddLayer]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <section className="px-3 pt-3 pb-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Фігури
        </h3>

        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder="Пошук фігур…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
          {search && (
            <button type="button" onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Скинути пошук">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          <button type="button" onClick={() => setActiveCategory(null)}
            className={["px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
              activeCategory === null ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/40"].join(" ")}>
            Всі
          </button>
          {SHAPE_CATEGORIES.map((cat) => (
            <button key={cat} type="button" onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={["px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/40"].join(" ")}>
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground">Фігур не знайдено.</p>
            {(search || activeCategory) && (
              <button type="button" onClick={() => { setSearch(""); setActiveCategory(null); }}
                className="mt-1 text-xs text-primary hover:underline">
                Скинути фільтри
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filtered.map((shape) => (
              <button key={shape.id} type="button" disabled={addingId === shape.id}
                onClick={() => handleAdd(shape.svgPath, shape.name, shape.id)}
                className="group relative flex items-center justify-center rounded-lg border border-border bg-muted aspect-square hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all disabled:opacity-60 p-2"
                title={shape.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shape.svgPath} alt={shape.name} className="w-full h-full object-contain" />
                {addingId === shape.id && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <RefreshCw className="size-3 text-foreground animate-spin" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
