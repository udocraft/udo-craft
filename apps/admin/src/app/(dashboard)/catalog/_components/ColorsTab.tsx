"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Material { id: string; name: string; hex_code: string; is_active: boolean; }

export default function ColorsTab({
  onCreateActionReady,
  showSectionAction = true,
}: {
  onCreateActionReady?: (handler: () => void) => void;
  showSectionAction?: boolean;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [form, setForm] = useState({ name: "", hex_code: "#000000", is_active: true });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const dragItem = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/materials");
      if (r.ok) setMaterials(await r.json());
    } catch { toast.error("Помилка завантаження"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const openCreate = () => {
    setEditingMaterial(null);
    setForm({ name: "", hex_code: "#000000", is_active: true });
    setModalOpen(true);
  };

  useEffect(() => {
    onCreateActionReady?.(openCreate);
  }, [onCreateActionReady]);

  const openEdit = (m: Material) => {
    setEditingMaterial(m);
    setForm({ name: m.name, hex_code: m.hex_code, is_active: m.is_active });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Назва обов'язкова"); return; }
    setSaving(true);
    try {
      const url = editingMaterial ? `/api/materials/${editingMaterial.id}` : "/api/materials";
      const r = await fetch(url, {
        method: editingMaterial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error();
      toast.success(editingMaterial ? "Матеріал оновлено" : "Матеріал створено");
      setModalOpen(false);
      fetchMaterials();
    } catch { toast.error("Помилка збереження"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`/api/materials/${deleteTarget.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Видалено");
      setDeleteTarget(null);
      fetchMaterials();
    } catch { toast.error("Помилка видалення"); }
  };

  const handleToggle = async (m: Material) => {
    try {
      await fetch(`/api/materials/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !m.is_active }),
      });
      setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !x.is_active } : x));
    } catch { toast.error("Помилка"); }
  };

  const reorder = <T extends { id: string }>(items: T[], fromId: string, toId: string): T[] => {
    const from = items.findIndex(i => i.id === fromId);
    const to = items.findIndex(i => i.id === toId);
    if (from === -1 || to === -1 || from === to) return items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const persistOrder = (ids: string[]) =>
    Promise.all(ids.map((id, i) =>
      fetch(`/api/materials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: i }),
      })
    ));

  return (
    <div className="space-y-4 p-4 md:p-6">
      <AdminSection
        title="Кольори матеріалів"
        description="Словник кольорів для варіантів товарів"
        actions={showSectionAction ? <Button size="sm" onClick={openCreate}>Додати колір</Button> : undefined}
      >

      <AdminTablePanel>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-6"><span className="sr-only">Перетягнути</span></TableHead>
            <TableHead className="w-10"><span className="sr-only">Активний</span></TableHead>
            <TableHead className="w-10"><span className="sr-only">Колір</span></TableHead>
            <TableHead>Назва</TableHead>
            <TableHead>HEX</TableHead>
            <TableHead className="w-20"><span className="sr-only">Дії</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {[6, 10, 10, 32, 16, 8].map((w, j) => (
                  <TableCell key={j}><div className={`h-4 w-${w} bg-muted rounded animate-pulse`} /></TableCell>
                ))}
              </TableRow>
            ))
          ) : materials.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                Кольорів ще немає
              </TableCell>
            </TableRow>
          ) : materials.map(m => (
            <TableRow
              key={m.id}
              draggable
              onDragStart={() => { dragItem.current = m.id; }}
              onDragOver={e => { e.preventDefault(); setDragOverId(m.id); }}
              onDragLeave={() => { if (dragOverId === m.id) setDragOverId(null); }}
              onDragEnd={() => { setDragOverId(null); }}
              onDrop={e => {
                e.preventDefault();
                const fromId = dragItem.current;
                dragItem.current = null;
                setDragOverId(null);
                if (fromId && fromId !== m.id) {
                  const next = reorder(materials, fromId, m.id);
                  setMaterials(next);
                  persistOrder(next.map(x => x.id));
                }
              }}
              className={`group hover:bg-muted/40 cursor-move ${dragOverId === m.id ? "bg-primary/5 border-t-2 border-t-primary" : ""}`}
            >
              <TableCell className="text-muted-foreground cursor-grab active:cursor-grabbing pr-0">
                <GripVertical className="w-4 h-4" />
              </TableCell>
              <TableCell>
                <Switch checked={m.is_active} onCheckedChange={() => handleToggle(m)} />
              </TableCell>
              <TableCell>
                <div className="w-6 h-6 rounded-full border border-border" style={{ background: m.hex_code }} />
              </TableCell>
              <TableCell className="cursor-pointer font-medium text-sm" onClick={() => openEdit(m)}>
                {m.name}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">{m.hex_code}</TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(m)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </AdminTablePanel>
      </AdminSection>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Редагувати матеріал" : "Новий матеріал"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Назва *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Чорний" />
            </div>
            <div className="space-y-1.5">
              <Label>Колір</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.hex_code} onChange={e => setForm(f => ({ ...f, hex_code: e.target.value }))}
                  className="h-10 w-10 rounded border border-border cursor-pointer p-0.5" />
                <Input value={form.hex_code} onChange={e => setForm(f => ({ ...f, hex_code: e.target.value }))} className="font-mono" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Активний</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Скасувати</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Збереження..." : "Зберегти"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити матеріал?</AlertDialogTitle>
            <AlertDialogDescription>«{deleteTarget?.name}» буде видалено назавжди.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
