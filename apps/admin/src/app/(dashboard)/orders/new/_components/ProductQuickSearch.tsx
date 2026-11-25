"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Shirt, X } from "lucide-react";
import { Product } from "@udo-craft/shared";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface ProductQuickSearchProps {
  products: Product[];
  onSelect: (product: Product) => void;
}

export function ProductQuickSearch({ products, onSelect }: ProductQuickSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim() === "" 
    ? [] 
    : products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.description?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md animate-in">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Швидкий пошук товару..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-11 h-12 rounded-lg border-border/40 bg-muted/20 focus:bg-background/80 focus:backdrop-blur-md transition-all shadow-sm focus:shadow-md focus:ring-primary/20"
        />
        {query && (
          <button 
            onClick={() => { setQuery(""); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-full transition-colors active:scale-90"
          >
            <X className="size-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <Card variant="glass" className="absolute top-full left-0 right-0 mt-3 z-50 p-2 shadow-depth animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  onSelect(product);
                  setQuery("");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-4 p-2.5 rounded-xl hover:bg-primary/[0.04] transition-all text-left group active:scale-[0.98]"
              >
                <div className="size-12 rounded-xl bg-background/50 border border-border/40 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all shadow-sm">
                  <Shirt className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black tracking-tight text-foreground/90 group-hover:text-primary transition-colors">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mt-0.5">
                    від ₴{(product.base_price_cents / 100).toFixed(0)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
