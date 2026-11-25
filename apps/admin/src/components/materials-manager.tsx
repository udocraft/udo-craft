"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Material } from "@udo-craft/shared";

const EMPTY_FORM = { name: "", hex_code: "#000000", is_active: true };

export function MaterialsManager() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/materials");
      if (res.ok) setMaterials(await res.json());
    } catch {
      toast.error("Помилка завантаження матеріалів");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.hex_code) { toast.error("Заповніть назву та код"); return; }
    setSaving(true);
    const method = editingId ? "PATCH" : "POST";
    const url = `/api/materials${editingId ? `/${editingId}` : ""}`;
    try {
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editingId ? "Матеріал оновлено" : "Матеріал створено");
      setEditingId(null); setForm(EMPTY_FORM);
      fetchMaterials();
    } catch {
      toast.error("Помилка при збереженні");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цей матеріал?")) return;
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Матеріал видалено");
      fetchMaterials();
    } catch {
      toast.error("Помилка при видаленні");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!editingId && (
          <Button onClick={() => setEditingId("new")} className="gap-2">
            <Plus className="w-4 h-4" /> Додати колір
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* List */}
        <div className="space-y-3">
          {materials.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-xl bg-muted/20">
              <p className="text-sm text-muted-foreground">Словник порожній</p>
            </div>
          ) : materials.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-card border rounded-xl hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border shadow-sm" style={{ backgroundColor: m.hex_code }} />
                <div>
                  <p className="font-semibold text-sm">{m.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{m.hex_code}</span>
                    {!m.is_active && <Badge variant="secondary" className="text-[10px] px-1.5 leading-none">Неактивний</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                <Button aria-label="Редагувати" variant="ghost" size="icon" className="h-8 w-8 text-blue-600 rounded-full" onClick={() => { setEditingId(m.id); setForm({ name: m.name, hex_code: m.hex_code, is_active: m.is_active }); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button aria-label="Видалити" variant="ghost" size="icon" className="h-8 w-8 text-red-600 rounded-full hover:bg-red-50" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        {editingId && (
          <div className="bg-card border rounded-xl p-5 sticky top-24 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{editingId === "new" ? "Новий колір" : "Редагувати колір"}</h3>
              <Button aria-label="Закрити" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Назва кольору (напр., Чорний)</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>HEX Код</Label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border shadow-sm shrink-0" style={{ backgroundColor: form.hex_code }} />
                  <Input type="text" value={form.hex_code} onChange={(e) => setForm({ ...form, hex_code: e.target.value })} placeholder="#000000" className="font-mono" required />
                  <Input type="color" value={form.hex_code} onChange={(e) => setForm({ ...form, hex_code: e.target.value })} className="w-10 h-10 p-1 shrink-0" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-muted/50 rounded-lg transition-colors border">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                <span className={form.is_active ? "text-foreground font-medium" : "text-muted-foreground"}>Активний статус</span>
              </label>
              <Button type="submit" className="w-full gap-2" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Зберегти
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
