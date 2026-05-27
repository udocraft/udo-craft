"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SizeChartModal } from "@/components/size-chart-modal";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SizeChart { id: string; name: string; rows: Record<string, string>[]; image_url?: string | null; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function SizesTab({
  onCreateActionReady,
  showSectionAction = true,
}: {
  onCreateActionReady?: (handler: () => void) => void;
  showSectionAction?: boolean;
}) {
  // Size charts
  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChartName, setNewChartName] = useState("");
  const [editChartId, setEditChartId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SizeChart | null>(null);

  const fetchCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const r = await fetch("/api/size-charts");
      if (r.ok) setCharts(await r.json());
    } finally { setChartsLoading(false); }
  }, []);

  useEffect(() => { fetchCharts(); }, [fetchCharts]);

  // ── Size chart handlers ───────────────────────────────────────────────────

  const handleCreateChart = async () => {
    if (!newChartName.trim()) return;
    const r = await fetch("/api/size-charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChartName.trim(), rows: [] }),
    });
    if (!r.ok) { toast.error("Помилка створення"); return; }
    toast.success("Таблицю створено");
    setCreateDialogOpen(false);
    setNewChartName("");
    fetchCharts();
  };

  const openCreate = () => setCreateDialogOpen(true);

  useEffect(() => {
    onCreateActionReady?.(openCreate);
  }, [onCreateActionReady]);

  const handleDeleteChart = async () => {
    if (!deleteTarget) return;
    const r = await fetch(`/api/size-charts/${deleteTarget.id}`, { method: "DELETE" });
    if (!r.ok) { toast.error("Помилка видалення"); return; }
    toast.success("Видалено");
    setDeleteTarget(null);
    fetchCharts();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Size charts ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Таблиці розмірів</CardTitle>
          {showSectionAction && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Нова таблиця
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {chartsLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : charts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Ruler className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Таблиць розмірів ще немає
            </div>
          ) : (
            <div className="space-y-2">
              {charts.map(chart => (
                <div key={chart.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Ruler className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{chart.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {chart.rows?.length ?? 0} рядків{chart.image_url ? " · є візуалізація" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon"
                      onClick={() => { setEditChartId(chart.id); setEditModalOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(chart)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Нова таблиця розмірів</DialogTitle></DialogHeader>
          <div className="py-2">
            <Input value={newChartName} onChange={e => setNewChartName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateChart()}
              placeholder="Назва таблиці (напр. Футболки)" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Скасувати</Button>
            <Button onClick={handleCreateChart} disabled={!newChartName.trim()}>Створити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <SizeChartModal
        chartId={editChartId}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        editable
        onSaved={() => { fetchCharts(); toast.success("Збережено"); }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити таблицю?</AlertDialogTitle>
            <AlertDialogDescription>«{deleteTarget?.name}» буде видалено назавжди.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
