"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, SearchX } from "lucide-react";
import { AdminTablePanel, AdminToolbar, AdminEmptyState } from "@/components/admin-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, Category } from "./useProductsData";
import { ProductTableRow } from "./ProductTableRow";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductsTabProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  onRefresh: () => void;
  variantCounts?: Record<string, number>;
  onToggleActive?: (product: Product) => void;
  onDelete?: (id: string, name: string) => void;
}

type StatusFilter = "all" | "active" | "inactive";

// ── TableSkeleton ─────────────────────────────────────────────────────────────

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── ProductsTab ───────────────────────────────────────────────────────────────

export function ProductsTab({ 
  products, 
  categories, 
  loading, 
  onRefresh, 
  variantCounts = {}, 
  onToggleActive, 
  onDelete 
}: ProductsTabProps) {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Drag-to-reorder state
  const dragItem = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => { dragItem.current = id; }, []);
  const handleDragOver = useCallback((id: string) => { setDragOverId(id); }, []);
  const handleDragEnd = useCallback(() => { setDragOverId(null); }, []);
  const handleDrop = useCallback((targetId: string) => {
    if (dragItem.current && dragItem.current !== targetId) {
      // Notify parent via onRefresh after reorder — parent owns the reorder logic
      // For now just clear state; full reorder is handled in page.tsx
    }
    dragItem.current = null;
    setDragOverId(null);
  }, []);

  // Debounce search ≤300ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 300);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const filtered = useMemo(
    () =>
      products
        .filter((p) => !categoryFilter || p.category_id === categoryFilter)
        .filter((p) =>
          statusFilter === "all"
            ? true
            : statusFilter === "active"
            ? p.is_active
            : !p.is_active
        )
        .filter(
          (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
        ),
    [products, categoryFilter, statusFilter, search]
  );

  const hasFilters = !!search || !!categoryFilter || statusFilter !== "all";

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("all");
  }, []);

  const productCountLabel = `${filtered.length} ${
    filtered.length === 1 ? "товар" : filtered.length < 5 ? "товари" : "товарів"
  }`;

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return <TableSkeleton rows={10} />;
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (products.length === 0) {
    return (
      <AdminEmptyState
        icon={Package}
        title="Немає товарів"
        description="Створіть перший товар, щоб почати управляти вашим каталогом"
        action={
          <Button onClick={() => router.push("/products/new")}>
            Додати товар
          </Button>
        }
      />
    );
  }

  // ── Main content ────────────────────────────────────────────────────────────

  return (
    <>
      <AdminToolbar>
        <Input
          placeholder="Пошук..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-48 text-sm"
        />

        <span className="text-xs text-muted-foreground">{productCountLabel}</span>

        <div className="ml-auto flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі</SelectItem>
              <SelectItem value="active">Активні</SelectItem>
              <SelectItem value="inactive">Неактивні</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminToolbar>

      {categories.length > 0 && (
        <AdminToolbar>
          <button
            onClick={() => setCategoryFilter("")}
            className={`text-xs px-3 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              !categoryFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            Всі
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(categoryFilter === c.id ? "" : c.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                categoryFilter === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {c.name}
            </button>
          ))}
        </AdminToolbar>
      )}

      <div className="px-4 md:px-6 pb-6">
        <AdminTablePanel>
          <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-6"><span className="sr-only">Перетягнути</span></TableHead>
              <TableHead className="w-10"><span className="sr-only">Активний</span></TableHead>
              <TableHead className="w-10"><span className="sr-only">Фото</span></TableHead>
              <TableHead>Назва</TableHead>
              <TableHead>Категорія</TableHead>
              <TableHead>Ціна</TableHead>
              <TableHead>Кольори</TableHead>
              <TableHead className="w-20"><span className="sr-only">Дії</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <AdminEmptyState
                    icon={SearchX}
                    title="Нічого не знайдено"
                    description="Спробуйте змінити запит або скинути фільтри"
                    action={
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Скинути фільтри
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <ProductTableRow
                  key={p.id}
                  product={p}
                  category={categories.find((c) => c.id === p.category_id)}
                  variantCount={variantCounts[p.id]}
                  dragOverId={dragOverId}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  onToggleActive={onToggleActive ?? (() => {})}
                  onDelete={onDelete ?? (() => {})}
                />
              ))
            )}
          </TableBody>
        </Table>
      </AdminTablePanel>
      </div>
    </>
  );
}
