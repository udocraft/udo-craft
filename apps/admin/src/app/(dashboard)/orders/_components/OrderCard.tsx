"use client";

import { GripVertical } from "lucide-react";
import { PREDEFINED_TAGS } from "@udo-craft/shared";
import { cn } from "@/lib/utils";
import type { Lead } from "./useKanbanDrag";

interface OrderCardProps {
  order: Lead;
  isSelected: boolean;
  isDragging: boolean;
  onClick: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDragEnd: () => void;
  onTouchStart: (e: React.TouchEvent, lead: Lead) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent, lead: Lead) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
  });
}

export function OrderCard({
  order,
  isSelected,
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: OrderCardProps) {
  const subtitle = order.customer_data?.company || order.customer_data?.email;
  const itemCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const tags = order.tags ?? [];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, order)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(order)}
      onTouchStart={(e) => onTouchStart(e, order)}
      onTouchMove={onTouchMove}
      onTouchEnd={(e) => onTouchEnd(e, order)}
      onKeyDown={(e) => e.key === "Enter" && onClick(order)}
      tabIndex={0}
      role="button"
      aria-label={`Замовлення від ${order.customer_data?.name}`}
      aria-pressed={isSelected}
      className={cn(
        "group relative cursor-pointer select-none rounded-lg border bg-background p-3.5 transition-all",
        "hover:border-border hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring outline-none touch-none",
        isDragging && "opacity-40 shadow-lg scale-[0.98]",
        isSelected
          ? "border-primary/40 bg-primary/[0.02] ring-1 ring-primary/20 shadow-sm"
          : "border-border/60"
      )}
    >
      {/* Drag handle */}
      <div className="absolute right-2.5 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="size-3.5 text-muted-foreground/40 cursor-grab active:cursor-grabbing" />
      </div>

      {/* Client name */}
      <p className={cn(
        "text-sm font-semibold tracking-tight truncate pr-5 transition-colors",
        isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
      )}>
        {order.customer_data?.name}
      </p>

      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {tags.slice(0, 3).map((tagId) => {
            const tag = PREDEFINED_TAGS.find((t) => t.id === tagId);
            return tag ? (
              <span
                key={tagId}
                className="inline-flex h-4.5 items-center gap-1 px-1.5 text-[10px] font-medium rounded-full"
                style={{ color: tag.color, backgroundColor: `${tag.bg}50` }}
              >
                <span className="size-1 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.label}
              </span>
            ) : (
              <span
                key={tagId}
                className="inline-flex h-4.5 items-center px-1.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground"
              >
                {tagId}
              </span>
            );
          })}
          {tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer: date + qty + amount */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{formatDate(order.created_at)}</span>
          {itemCount > 0 && (
            <>
              <span className="opacity-30">·</span>
              <span>{itemCount} шт.</span>
            </>
          )}
        </div>
        {order.total_amount_cents > 0 && (
          <span className="text-xs font-bold text-foreground">
            {(order.total_amount_cents / 100).toLocaleString("uk-UA")} ₴
          </span>
        )}
      </div>
    </div>
  );
}
