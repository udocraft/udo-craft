"use client";

import { cn } from "@/lib/utils";
import { OrderCard } from "./OrderCard";
import type { LeadStatus } from "@/components/status-badge";
import type { Lead } from "./useKanbanDrag";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted-foreground/20",
  new: "bg-blue-500",
  in_progress: "bg-amber-500",
  production: "bg-primary",
  completed: "bg-emerald-500",
  archived: "bg-slate-400",
};

interface KanbanColumnProps {
  status: LeadStatus;
  label: string;
  orders: Lead[];
  totalAmount: number;
  selectedOrderId: string | null;
  draggedOrderId: string | null;
  dragOverCol: string | null;
  onCardClick: (lead: Lead) => void;
  onCardDragStart: (e: React.DragEvent, lead: Lead) => void;
  onCardDragEnd: () => void;
  onCardTouchStart: (e: React.TouchEvent, lead: Lead) => void;
  onCardTouchMove: (e: React.TouchEvent) => void;
  onCardTouchEnd: (e: React.TouchEvent, lead: Lead) => void;
  onColDragOver: (e: React.DragEvent, status: string) => void;
  onColDragLeave: (e: React.DragEvent) => void;
  onColDrop: (e: React.DragEvent, status: string) => void;
}

export function KanbanColumn({
  status,
  label,
  orders,
  totalAmount,
  selectedOrderId,
  draggedOrderId,
  dragOverCol,
  onCardClick,
  onCardDragStart,
  onCardDragEnd,
  onCardTouchStart,
  onCardTouchMove,
  onCardTouchEnd,
  onColDragOver,
  onColDragLeave,
  onColDrop,
}: KanbanColumnProps) {
  const isOver = dragOverCol === status;
  const dot = STATUS_COLORS[status] ?? "bg-muted-foreground";

  return (
    <div
      data-kanban-col={status}
      onDragOver={(e) => onColDragOver(e, status)}
      onDragLeave={onColDragLeave}
      onDrop={(e) => onColDrop(e, status)}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-lg border transition-colors",
        isOver
          ? "border-primary/30 bg-primary/[0.02]"
          : "border-border/60 bg-muted/20"
      )}
    >
      {/* Column header */}
      <div className="flex h-11 shrink-0 items-center justify-between px-3.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full shrink-0", dot)} />
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <span className="flex h-4.5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
            {orders.length}
          </span>
        </div>
        {totalAmount > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground/60">
            ₴{(totalAmount / 100).toLocaleString("uk-UA")}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2.5 scrollbar-hide">
        {orders.map((lead) => (
          <OrderCard
            key={lead.id}
            order={lead}
            isSelected={selectedOrderId === lead.id}
            isDragging={draggedOrderId === lead.id}
            onClick={onCardClick}
            onDragStart={onCardDragStart}
            onDragEnd={onCardDragEnd}
            onTouchStart={onCardTouchStart}
            onTouchMove={onCardTouchMove}
            onTouchEnd={onCardTouchEnd}
          />
        ))}

        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className={cn("size-2 rounded-full mb-3 opacity-30", dot)} />
            <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
              Порожньо
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
