"use client";

import { useState, useRef } from "react";

export interface Lead {
  id: string;
  customer_data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    keycrm_id?: number | string;
    keycrm_source_id?: number | string;
    keycrm_source_uuid?: string;
    keycrm_global_source_uuid?: string;
    keycrm_manager_name?: string;
    keycrm_manager_username?: string;
    keycrm_payment_status?: string;
    keycrm_recipient_name?: string;
    keycrm_recipient_phone?: string;
    keycrm_tracking_code?: string;
    keycrm_shipping_status?: string;
    delivery?: string;
    delivery_details?: string;
    source?: string;
    source_details?: string;
  };
  status: "draft" | "new" | "in_progress" | "production" | "completed" | "archived";
  tags?: string[];
  created_at: string;
  updated_at: string;
  notes?: string;
  total_amount_cents: number;
  order_items?: {
    id: string; product_id: string; quantity: number; size: string; color: string;
    unit_price_cents?: number;
    technical_metadata?: {
      unit_price_cents?: number;
      item_note?: string;
      keycrm_product_name?: string;
      keycrm_sku?: string | null;
    };
  }[];
}

export function useKanbanDrag(
  selectedLead: Lead | null,
  setSelectedLead: (lead: Lead | null) => void,
  onStatusChange: (lead: Lead, status: string) => void,
) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const didDragRef = useRef(false);
  const closedLeadIdRef = useRef<string | null>(null);
  const touchDragLeadRef = useRef<Lead | null>(null);
  const touchGhostRef = useRef<HTMLDivElement | null>(null);

  const onCardClick = (lead: Lead) => {
    if (didDragRef.current) { didDragRef.current = false; return; }
    if (selectedLead?.id === lead.id) {
      closedLeadIdRef.current = lead.id;
      setSelectedLead(null);
    } else {
      closedLeadIdRef.current = null;
      setSelectedLead(lead);
    }
  };

  const onCardDragStart = (e: React.DragEvent, lead: Lead) => {
    didDragRef.current = true;
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
  };
  const onCardDragEnd = () => {
    setDraggedLead(null); setDragOverCol(null);
    setTimeout(() => { didDragRef.current = false; }, 100);
  };
  const onColDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(status);
  };
  const onColDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null);
  };
  const onColDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault(); setDragOverCol(null);
    if (draggedLead && draggedLead.status !== status) onStatusChange(draggedLead, status);
    setDraggedLead(null);
  };

  const onCardTouchStart = (e: React.TouchEvent, lead: Lead) => {
    touchDragLeadRef.current = lead;
    didDragRef.current = false;
    const touch = e.touches[0];
    const ghost = document.createElement("div");
    ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;opacity:0.85;background:white;border:2px solid var(--color-primary);border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.2);transform:translate(-50%,-50%);left:${touch.clientX}px;top:${touch.clientY}px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    ghost.textContent = lead.customer_data?.name ?? "Замовлення";
    document.body.appendChild(ghost);
    touchGhostRef.current = ghost;
  };
  const onCardTouchMove = (e: React.TouchEvent) => {
    if (!touchDragLeadRef.current) return;
    didDragRef.current = true;
    e.preventDefault();
    const touch = e.touches[0];
    if (touchGhostRef.current) {
      touchGhostRef.current.style.left = `${touch.clientX}px`;
      touchGhostRef.current.style.top = `${touch.clientY}px`;
    }
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    setDragOverCol(el?.closest("[data-kanban-col]")?.getAttribute("data-kanban-col") ?? null);
  };
  const onCardTouchEnd = (e: React.TouchEvent, lead: Lead) => {
    if (touchGhostRef.current) { document.body.removeChild(touchGhostRef.current); touchGhostRef.current = null; }
    const wasDrag = didDragRef.current;
    didDragRef.current = false;
    if (!wasDrag) {
      if (selectedLead?.id === lead.id) { closedLeadIdRef.current = lead.id; setSelectedLead(null); }
      else { closedLeadIdRef.current = null; setSelectedLead(lead); }
    } else if (dragOverCol && dragOverCol !== lead.status) {
      onStatusChange(lead, dragOverCol);
    }
    touchDragLeadRef.current = null;
    setDragOverCol(null);
  };

  return {
    draggedLead, dragOverCol, closedLeadIdRef,
    onCardClick, onCardDragStart, onCardDragEnd,
    onColDragOver, onColDragLeave, onColDrop,
    onCardTouchStart, onCardTouchMove, onCardTouchEnd,
  };
}
