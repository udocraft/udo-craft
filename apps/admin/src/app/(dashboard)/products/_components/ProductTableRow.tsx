"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Product, Category } from "./useProductsData";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductTableRowProps {
  product: Product;
  category?: Category;
  variantCount?: number;
  dragOverId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string) => void;
  onToggleActive: (product: Product) => void;
  onDelete: (id: string, name: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductTableRow({
  product,
  category,
  variantCount,
  dragOverId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onToggleActive,
  onDelete,
}: ProductTableRowProps) {
  const router = useRouter();

  // Thumbnail: first product_image or fallback from legacy images map
  const thumbUrl =
    product.product_images?.[0]?.url ??
    Object.values(product.images || {})[0] ??
    null;

  return (
    <TableRow
      draggable
      onDragStart={() => onDragStart(product.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(product.id); }}
      onDragEnd={onDragEnd}
      onDrop={() => onDrop(product.id)}
      className={`group hover:bg-muted/40 cursor-pointer ${
        dragOverId === product.id ? "border-t-2 border-t-primary" : ""
      }`}
      onClick={() => router.push(`/products/${product.id}`)}
    >
      {/* Drag handle — stop propagation so click doesn't navigate */}
      <TableCell
        className="text-muted-foreground cursor-grab pr-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </TableCell>

      {/* Active toggle — stop propagation */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={product.is_active}
          onCheckedChange={() => onToggleActive(product)}
          aria-label={product.is_active ? "Деактивувати" : "Активувати"}
        />
      </TableCell>

      {/* Thumbnail 32×32 */}
      <TableCell>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={product.name}
            className="w-8 h-8 rounded border object-contain bg-white"
          />
        ) : (
          <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}
      </TableCell>

      {/* Name + badges */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{product.name}</span>
          {product.is_customizable && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              Кастом
            </Badge>
          )}
          {!product.is_active && (
            <span className="text-xs text-muted-foreground">· Неактивний</span>
          )}
        </div>
      </TableCell>

      {/* Category */}
      <TableCell className="text-sm text-muted-foreground">
        {category?.name ?? "—"}
      </TableCell>

      {/* Price */}
      <TableCell className="text-sm">
        ₴{(product.base_price_cents / 100).toFixed(0)}
      </TableCell>

      {/* Color variant count */}
      <TableCell className="text-sm text-muted-foreground">
        {variantCount !== undefined ? variantCount : "—"}
      </TableCell>

      {/* Hover action buttons — stop propagation */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label="Редагувати"
            onClick={() => router.push(`/products/${product.id}`)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-destructive hover:text-destructive"
                aria-label="Видалити"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Видалити товар?</AlertDialogTitle>
                <AlertDialogDescription>
                  Товар &ldquo;{product.name}&rdquo; буде видалено назавжди. Цю дію не можна скасувати.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Скасувати</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(product.id, product.name)}
                >
                  Видалити
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
